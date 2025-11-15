import { createOpenAI } from '@ai-sdk/openai';
import { streamText, type TextStreamPart } from 'ai';
import { OPENAI_CONFIG } from '@/lib/config/fileUpload';
import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';
import {
  type CreateJobDescriptionPayload,
  type DraftWorkpadPayload,
  type JobDescriptionRecord,
  type ParsedJobDescription,
  type RequirementCategory,
  type RequirementInsight,
} from '@/types/coverLetters';
import { EvaluationEventLogger } from './evaluationEventLogger';
import { StreamingTokenTracker } from '@/utils/streamingTokenTracker';

type SupabaseClient = typeof supabase;

export interface ParseJobDescriptionOptions {
  signal?: AbortSignal;
  onToken?: (token: string, aggregate: string) => void;
  onProgress?: (message: string) => void;
}

export interface JobDescriptionServiceOptions {
  supabaseClient?: SupabaseClient;
  openAIKey?: string;
  now?: () => Date;
}

interface JobDescriptionRow extends Database['public']['Tables']['job_descriptions']['Row'] {}

const JOB_DESCRIPTION_PROMPT = `
You are an expert product hiring strategist.
Analyse the job description and return JSON with this schema:
{
  "company": string,
  "role": string,
  "summary": string,
  "standardRequirements": Requirement[],
  "differentiatorRequirements": Requirement[],
  "preferredRequirements": Requirement[],
  "boilerplateSignals": string[],
  "differentiatorSignals": string[],
  "keywords": string[],
  "differentiatorNotes": string,
  "structuredData": {
    "responsibilities": string[],
    "qualifications": string[],
    "tools": string[],
    "teams": string[],
    "location": string | null,
    "employmentType": string | null,
    "compensation": string | null
  },
  "rawSections": Array<{ "title": string, "content": string }>
}

Requirement shape:
{
  "id": string,
  "label": string,
  "detail": string,
  "category": "standard" | "differentiator" | "preferred",
  "priority": "critical" | "high" | "medium" | "low" | "optional",
  "keywords": string[],
  "signals": string[],
  "reasoning": string
}

Rules:
- Classify requirements as:
  * standardRequirements: boilerplate expectations for Product Managers.
  * differentiatorRequirements: unique priorities hinting at this company's context.
  * preferredRequirements: nice-to-haves explicitly called out.
- Highlight differentiatorNotes summarising why the differentiator items matter.
- Include 5-8 keywords spanning responsibilities, tools, and outcomes.
- rawSections should capture major headings detected in the JD with cleaned content.
- Respond with STRICT JSON (no commentary, no markdown fences).
`;

const SUPPORTED_PRIORITIES = ['critical', 'high', 'medium', 'low', 'optional'] as const;
type PriorityValue = (typeof SUPPORTED_PRIORITIES)[number];
const DEFAULT_PRIORITY: PriorityValue = 'high';

const SUPPORTED_CATEGORIES: RequirementCategory[] = ['standard', 'differentiator', 'preferred'];

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [750, 1500];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Simple hash function for JD text checksum (not cryptographically secure, just for deduplication).
 */
const computeTextChecksum = (text: string): string => {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
};

const createOpenAIClient = (apiKey?: string) => {
  const key =
    apiKey ||
    (import.meta.env?.VITE_OPENAI_KEY as string | undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

  if (!key) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_KEY or OPENAI_API_KEY.');
  }

  return createOpenAI({ apiKey: key });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const randomId = (): string => {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
  if (cryptoObj?.randomUUID) {
    return cryptoObj.randomUUID();
  }
  return `req_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
};

const normalisePriority = (value: unknown): PriorityValue => {
  if (typeof value === 'string') {
    const lower = value.toLowerCase() as PriorityValue;
    if (SUPPORTED_PRIORITIES.includes(lower)) {
      return lower;
    }
  }
  return DEFAULT_PRIORITY;
};

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(item => (typeof item === 'string' ? item.trim() : null))
        .filter((item): item is string => Boolean(item))
    : [];

const normaliseRequirement = (
  input: unknown,
  fallbackCategory: RequirementCategory,
): RequirementInsight | null => {
  if (!isRecord(input)) return null;

  const labelRaw =
    typeof input.label === 'string'
      ? input.label
      : typeof input.title === 'string'
      ? input.title
      : typeof input.description === 'string'
      ? input.description
      : typeof input.summary === 'string'
      ? input.summary
      : undefined;
  const label = labelRaw?.trim();
  if (!label) return null;

  const id =
    typeof input.id === 'string' && input.id.trim().length > 0
      ? input.id.trim()
      : randomId();

  const category =
    typeof input.category === 'string' && (SUPPORTED_CATEGORIES as string[]).includes(input.category)
      ? (input.category as RequirementCategory)
      : fallbackCategory;

  const detail =
    typeof input.detail === 'string'
      ? input.detail.trim()
      : typeof input.description === 'string'
      ? input.description.trim()
      : undefined;

  const reasoning =
    typeof input.reasoning === 'string'
      ? input.reasoning.trim()
      : typeof input.notes === 'string'
      ? input.notes.trim()
      : undefined;

  const keywords = ensureStringArray(input.keywords);
  const signals = ensureStringArray(input.signals);
  const priority = normalisePriority(input.priority);

  return {
    id,
    label,
    detail,
    category,
    priority,
    keywords,
    reasoning,
    signals,
  };
};

const normaliseRequirementArray = (
  list: unknown,
  fallbackCategory: RequirementCategory,
): RequirementInsight[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map(item => normaliseRequirement(item, fallbackCategory))
    .filter((item): item is RequirementInsight => Boolean(item));
};

const normaliseStructuredData = (value: unknown): Record<string, Json> => {
  if (!isRecord(value)) {
    return {
      responsibilities: [],
      qualifications: [],
      tools: [],
      teams: [],
      location: null,
      employmentType: null,
      compensation: null,
    };
  }

  const getString = (key: string): string | null => {
    const raw = value[key];
    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
    return null;
  };

  return {
    responsibilities: ensureStringArray(value.responsibilities),
    qualifications: ensureStringArray(value.qualifications),
    tools: ensureStringArray(value.tools),
    teams: ensureStringArray(value.teams),
    location: getString('location'),
    employmentType: getString('employmentType'),
    compensation: getString('compensation'),
  };
};

const cleanJsonResponse = (raw: string): string =>
  raw
    .trim()
    .replace(/^```json/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

const defaultAnalysisEnvelope = (
  summary: string,
  differentiatorNotes: string | undefined,
  rawSections: string[],
  keywords: string[],
  signals: { boilerplate?: string[]; differentiator?: string[] },
  structuredInsights: Record<string, Json>,
  rawPayload: Record<string, unknown>,
): Record<string, Json> => ({
  summary,
  differentiatorNotes,
  rawSections,
  keywords,
  boilerplateSignals: signals.boilerplate ?? [],
  differentiatorSignals: signals.differentiator ?? [],
  structuredInsights,
  llm: rawPayload,
});

const mapRowToRecord = (row: JobDescriptionRow): JobDescriptionRecord => {
  const analysis = (row.analysis as Record<string, unknown>) ?? {};
  const structuredInsights =
    (analysis.structuredInsights as Record<string, Json> | undefined) ?? {};

  const summary =
    typeof analysis.summary === 'string' && analysis.summary.trim().length > 0
      ? analysis.summary
      : `${row.role} @ ${row.company}`;

  return {
    id: row.id,
    userId: row.user_id,
    url: row.url ?? null,
    content: row.content,
    company: row.company,
    role: row.role,
    summary,
    standardRequirements: normaliseRequirementArray(row.standard_requirements, 'standard'),
    differentiatorRequirements: normaliseRequirementArray(row.differentiator_requirements, 'differentiator'),
    preferredRequirements: normaliseRequirementArray(row.preferred_requirements, 'preferred'),
    boilerplateSignals: ensureStringArray((analysis as any).boilerplateSignals),
    differentiatorSignals: ensureStringArray((analysis as any).differentiatorSignals),
    keywords: Array.isArray(row.keywords)
      ? row.keywords.filter((kw): kw is string => typeof kw === 'string')
      : [],
    structuredInsights,
    structuredData: normaliseStructuredData(row.structured_data),
    analysis: analysis as Record<string, Json>,
    differentiatorNotes: row.differentiator_notes ?? undefined,
    rawSections: ensureStringArray((analysis as any).rawSections),
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
};

export class JobDescriptionService {
  private readonly supabaseClient: SupabaseClient;
  private readonly openAIClient: ReturnType<typeof createOpenAI>;
  private readonly now: () => Date;

  constructor(options: JobDescriptionServiceOptions = {}) {
    this.supabaseClient = options.supabaseClient ?? supabase;
    this.openAIClient = createOpenAIClient(options.openAIKey);
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Calculate optimal token limit based on content analysis
   * Uses same smart calculation from LLMAnalysisService
   */
  private calculateOptimalTokens(content: string, type: 'jobDescription' | 'metrics'): number {
    // Improved token estimate (more accurate char-to-token ratio)
    const contentTokens = Math.ceil(content.length / 3.5); // ~3.5 chars per token
    
    // Structured output overhead (JSON structure for JD parsing)
    const structureOverhead = type === 'jobDescription' ? 600 : 1000; // JD is simpler than metrics
    
    // Complexity analysis
    const lines = content.split('\n').length;
    const bulletPoints = (content.match(/[•\-\*]\s/g) || []).length;
    const sections = (content.match(/\n\s*\n/g) || []).length;
    
    // Calculate complexity multiplier
    let complexityMultiplier = 1.0;
    if (lines > 100 || bulletPoints > 20) complexityMultiplier = 1.3;
    else if (lines > 50 || bulletPoints > 10) complexityMultiplier = 1.2;
    else if (lines > 20 || bulletPoints > 5) complexityMultiplier = 1.1;
    if (sections > 10) complexityMultiplier += 0.2;
    
    // Type-specific multiplier
    const typeMultiplier = type === 'jobDescription' ? 0.4 : 0.8; // JD parsing is simpler
    
    // Calculate base output tokens needed
    const baseOutputTokens = Math.ceil(contentTokens * complexityMultiplier * typeMultiplier);
    
    // Add structure overhead and safety buffer
    const safetyBuffer = 1.5; // 50% safety buffer
    const finalTokens = Math.ceil((baseOutputTokens + structureOverhead) * safetyBuffer);
    
    // Apply bounds: minimum 800, maximum 3000 for JD / 4000 for metrics
    const maxTokens = type === 'jobDescription' ? 3000 : 4000;
    const result = Math.max(800, Math.min(finalTokens, maxTokens));
    
    console.warn(`📊 Token calculation (${type}): ${content.length} chars → ${contentTokens} content tokens → ${result} max tokens (complexity: ${complexityMultiplier.toFixed(2)}x)`);
    
    return Math.floor(result);
  }

  async parseJobDescription(
    content: string,
    options: ParseJobDescriptionOptions = {},
  ): Promise<{ parsed: ParsedJobDescription; raw: Record<string, unknown> }> {
    if (!content || content.trim().length < 50) {
      throw new Error('Job description content must be at least 50 characters.');
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
          options.onProgress?.(`Retrying JD parse (attempt ${attempt + 1}/${MAX_RETRIES + 1})…`);
          await sleep(delay);
        }

        // Use smart token calculation based on content length and complexity
        const optimalTokens = this.calculateOptimalTokens(content.trim(), 'jobDescription');
        options.onProgress?.(`Analyzing job description (${optimalTokens} tokens)…`);

        const result: any = await streamText({
          model: this.openAIClient.chat(OPENAI_CONFIG.MODEL),
          system: JOB_DESCRIPTION_PROMPT,
          messages: [
            {
              role: 'user',
              content: content.trim(),
            },
          ],
          temperature: 0.2,
          maxTokens: optimalTokens,
          signal: options.signal,
        } as any);

        let aggregated = '';
        let tokenSequence = 0;

        const handleToken = (token: string) => {
          aggregated += token;
          tokenSequence++;
          options.onToken?.(token, aggregated);
        };

        if (result?.textStream) {
          for await (const chunk of result.textStream as AsyncIterable<TextStreamPart<string>>) {
            const token =
              typeof chunk === 'string'
                ? chunk
                : chunk && typeof chunk === 'object' && 'text' in chunk && typeof chunk.text === 'string'
                ? chunk.text
                : '';
            if (!token) continue;
            handleToken(token);
          }
        }

        if (!aggregated && typeof result?.text === 'string') {
          aggregated = result.text;
          options.onToken?.(aggregated, aggregated);
        }

        if (!aggregated.trim()) {
          throw new Error('Job description analysis returned empty response.');
        }

        const cleaned = cleanJsonResponse(aggregated);
        let parsedJson: Record<string, unknown>;
        try {
          parsedJson = JSON.parse(cleaned);
        } catch (error) {
          console.error('[JobDescriptionService] Failed to parse JD JSON', error, { cleaned });
          throw new Error('Failed to parse job description analysis. Please try again.');
        }

        const parsed = this.transformParsedResponse(parsedJson);
        return { parsed, raw: parsedJson };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error during JD parse');
        if (attempt === MAX_RETRIES) {
          throw lastError;
        }
        console.warn(`[JobDescriptionService] Parse attempt ${attempt + 1} failed, retrying…`, lastError);
      }
    }

    throw lastError ?? new Error('JD parse failed after retries');
  }

  async createJobDescription(
    userId: string,
    payload: CreateJobDescriptionPayload,
  ): Promise<JobDescriptionRecord> {
    const insertPayload = {
      user_id: userId,
      url: payload.url ?? null,
      content: payload.content.trim(),
      company: payload.company.trim(),
      role: payload.role.trim(),
      structured_data: payload.structuredData,
      standard_requirements: payload.standardRequirements,
      differentiator_requirements: payload.differentiatorRequirements,
      preferred_requirements: payload.preferredRequirements,
      keywords: payload.keywords,
      differentiator_notes: payload.differentiatorNotes ?? null,
      analysis:
        payload.analysis ??
        defaultAnalysisEnvelope(
          payload.summary,
          payload.differentiatorNotes,
          payload.rawSections ?? [],
          payload.keywords,
          {
            boilerplate: [],
            differentiator: [],
          },
          payload.structuredData,
          {},
        ),
    };

    const { data, error } = await this.supabaseClient
      .from('job_descriptions')
      .insert(insertPayload)
      .select()
      .single();

    if (error || !data) {
      console.error('[JobDescriptionService] Failed to insert job description', error);
      throw new Error(error?.message ?? 'Failed to save job description.');
    }

    return mapRowToRecord(data);
  }

  async parseAndCreate(
    userId: string,
    content: string,
    options: ParseJobDescriptionOptions & { url?: string | null; syntheticProfileId?: string } = {},
  ): Promise<JobDescriptionRecord & { evaluationRunId?: string; sessionId?: string }> {
    const trimmedContent = content.trim();
    const checksum = computeTextChecksum(trimmedContent);
    const startTimestamp = this.now().getTime();

    options.onProgress?.('Starting job description analysis…');

    // Track tokens during streaming
    const tokenTracker = new StreamingTokenTracker();
    let tokenSequence = 0;
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const parseOptions: ParseJobDescriptionOptions = {
        ...options,
        onProgress: (message) => {
          options.onProgress?.(message);
        },
        onToken: (token, aggregate) => {
          options.onToken?.(token, aggregate);
          tokenTracker.sampleToken(token, tokenSequence);
          tokenSequence++;
          outputTokens++; // Approximate - actual count from LLM response would be better
        },
      };

      const { parsed, raw } = await this.parseJobDescription(trimmedContent, parseOptions);

      // Add final token sample
      tokenTracker.addFinalToken('', tokenSequence);

      const finishTimestamp = this.now().getTime();
      const totalLatencyMs = finishTimestamp - startTimestamp;

      const analysis = defaultAnalysisEnvelope(
        parsed.summary,
        parsed.differentiatorNotes,
        parsed.rawSections ?? [],
        parsed.keywords,
        {
          boilerplate: parsed.boilerplateSignals,
          differentiator: parsed.differentiatorSignals,
        },
        parsed.structuredInsights,
        raw,
      );

      let record;
      try {
        record = await this.createJobDescription(userId, {
          content: trimmedContent,
          url: options.url ?? null,
          company: parsed.company,
          role: parsed.role,
          summary: parsed.summary,
          structuredData: parsed.structuredInsights,
          standardRequirements: parsed.standardRequirements,
          differentiatorRequirements: parsed.differentiatorRequirements,
          preferredRequirements: parsed.preferredRequirements,
          keywords: parsed.keywords,
          differentiatorNotes: parsed.differentiatorNotes,
          rawSections: parsed.rawSections,
          analysis,
        });
      } catch (createError) {
        console.error('[JobDescriptionService] Failed to create JD record:', createError);
        throw new Error(
          `Unable to process job description: ${createError instanceof Error ? createError.message : 'Unknown error'}`,
        );
      }

      // Log success event using EvaluationEventLogger
      const logResult = await EvaluationEventLogger.logJDParse({
        userId,
        jobDescriptionId: record.id,
        rawTextChecksum: checksum,
        company: parsed.company,
        role: parsed.role,
        requirements: [
          ...parsed.standardRequirements.map(r => r.label),
          ...parsed.differentiatorRequirements.map(r => r.label),
          ...parsed.preferredRequirements.map(r => r.label),
        ],
        differentiatorSummary: parsed.differentiatorNotes,
        inputTokens,
        outputTokens,
        latency: totalLatencyMs,
        status: 'success',
        sourceUrl: options.url ?? undefined,
        model: OPENAI_CONFIG.MODEL,
        syntheticProfileId: options.syntheticProfileId,
      });

      options.onProgress?.('Job description analysis complete.');

      return {
        ...record,
        evaluationRunId: logResult.runId,
        sessionId: `jd-parse-${Date.now()}-${checksum.slice(0, 8)}`,
      };
    } catch (error) {
      const finishTimestamp = this.now().getTime();
      const totalLatencyMs = finishTimestamp - startTimestamp;

      // Log failure event
      await EvaluationEventLogger.logJDParse({
        userId,
        jobDescriptionId: 'pending',
        rawTextChecksum: checksum,
        inputTokens,
        outputTokens,
        latency: totalLatencyMs,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        sourceUrl: options.url ?? undefined,
        model: OPENAI_CONFIG.MODEL,
        syntheticProfileId: options.syntheticProfileId,
      });

      throw error;
    }
  }

  async updateAnalysis(jobDescriptionId: string, analysis: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabaseClient
      .from('job_descriptions')
      .update({ analysis })
      .eq('id', jobDescriptionId);

    if (error) {
      console.error('[JobDescriptionService] Failed to update analysis', error);
      throw new Error(error.message);
    }
  }

  async getUserJobDescriptions(userId: string): Promise<JobDescriptionRecord[]> {
    const { data, error } = await this.supabaseClient
      .from('job_descriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[JobDescriptionService] Failed to fetch job descriptions', error);
      return [];
    }

    return data.map(mapRowToRecord);
  }

  async getJobDescription(userId: string, jobDescriptionId: string): Promise<JobDescriptionRecord | null> {
    const { data, error } = await this.supabaseClient
      .from('job_descriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('id', jobDescriptionId)
      .maybeSingle();

    if (error) {
      console.error('[JobDescriptionService] Failed to fetch job description', error);
      throw new Error(error.message);
    }

    return data ? mapRowToRecord(data) : null;
  }

  createWorkpadPayload(
    parsed: ParsedJobDescription,
    draftId: string,
    jobDescriptionId: string,
  ): DraftWorkpadPayload {
    return {
      draftId,
      jobDescriptionId,
      phase: 'jd_parse',
      sections: [],
      sectionMatches: {},
      standardRequirements: parsed.standardRequirements,
      differentiatorRequirements: parsed.differentiatorRequirements,
      preferredRequirements: parsed.preferredRequirements,
      keywords: parsed.keywords,
    };
  }

  private transformParsedResponse(payload: Record<string, unknown>): ParsedJobDescription {
    const company =
      typeof payload.company === 'string' && payload.company.trim().length > 0
        ? payload.company.trim()
        : 'Unknown Company';
    const role =
      typeof payload.role === 'string' && payload.role.trim().length > 0
        ? payload.role.trim()
        : 'Product Manager';
    const summary =
      typeof payload.summary === 'string' && payload.summary.trim().length > 0
        ? payload.summary.trim()
        : 'No summary provided.';
    const differentiatorNotes =
      typeof payload.differentiatorNotes === 'string' && payload.differentiatorNotes.trim().length > 0
        ? payload.differentiatorNotes.trim()
        : undefined;

    const standardRequirements = normaliseRequirementArray(payload.standardRequirements, 'standard');
    const differentiatorRequirements = normaliseRequirementArray(
      payload.differentiatorRequirements,
      'differentiator',
    );
    const preferredRequirements = normaliseRequirementArray(payload.preferredRequirements, 'preferred');

    const keywords = ensureStringArray(payload.keywords);
    const boilerplateSignals = ensureStringArray(payload.boilerplateSignals);
    const differentiatorSignals = ensureStringArray(payload.differentiatorSignals);

    const structuredData = normaliseStructuredData(
      payload.structuredData ?? payload.structuredInsights ?? {},
    );

    const rawSections = Array.isArray(payload.rawSections)
      ? payload.rawSections
          .map(section => {
            if (typeof section === 'string') return section.trim();
            if (isRecord(section) && typeof section.content === 'string') {
              return section.content.trim();
            }
            return null;
          })
          .filter((item): item is string => Boolean(item))
      : [];

    const analysis: Record<string, Json> = {
      boilerplateSignals,
      differentiatorSignals,
      structuredInsights: structuredData,
      keywords,
      rawSections,
    };

    return {
      company,
      role,
      summary,
      standardRequirements,
      differentiatorRequirements,
      preferredRequirements,
      boilerplateSignals,
      differentiatorSignals,
      keywords,
      structuredInsights: structuredData,
      structuredData,
      analysis,
      differentiatorNotes,
      rawSections,
    };
  }
}

export const jobDescriptionService = new JobDescriptionService();


