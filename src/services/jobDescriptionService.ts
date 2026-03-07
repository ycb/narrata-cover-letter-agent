import { createOpenAI } from '@ai-sdk/openai';
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

const SUPPORTED_PRIORITIES = ['critical', 'high', 'medium', 'low', 'optional'] as const;
type PriorityValue = (typeof SUPPORTED_PRIORITIES)[number];
const DEFAULT_PRIORITY: PriorityValue = 'high';

const SUPPORTED_CATEGORIES: RequirementCategory[] = ['standard', 'differentiator', 'preferred'];

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [750, 1500];

const inferWorkTypeFromText = (content: string): string | null => {
  const text = content.toLowerCase();
  if (/hybrid/.test(text)) return 'Hybrid';
  if (/(location type|work location|work type)[^a-z0-9]{0,8}remote/.test(text) || /\bremote\b/.test(text)) {
    return 'Remote';
  }
  if (/(on[\s-]?site|in[\s-]?office|office-based)/.test(text)) return 'In-person';
  return null;
};

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
    (import.meta.env?.VITE_OPENAI_API_KEY as string | undefined) ||
    (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

  // API key is optional - job parsing now uses Edge Functions
  if (!key) {
    console.warn('[JobDescriptionService] No API key - operations will use Edge Functions');
    // Return null to signal that Edge Functions should be used
    return null;
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

const normalizeWhitespace = (value: string): string => value.trim().replace(/\s+/g, ' ');

const toTitleCase = (value: string): string =>
  value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const normalizeTitleIfLowercase = (value: string): string => {
  const normalized = normalizeWhitespace(value);
  if (!normalized) return normalized;
  if (/[A-Z]/.test(normalized) || /\d/.test(normalized)) return normalized;
  return toTitleCase(normalized);
};

const splitDelimitedTokens = (value: string): string[] =>
  value
    .split(/[,/|]/)
    .map(token => normalizeWhitespace(token))
    .filter(Boolean);

const normalizeCompanyMaturity = (value: string | null): string | null => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes('growth')) return 'growth-stage';
  if (lower.includes('late')) return 'late-stage';
  if (lower.includes('enterprise') || lower.includes('public')) return 'enterprise';
  if (lower.includes('startup') || lower.includes('early')) return 'startup';
  return normalizeWhitespace(value);
};

const normalizeBusinessModelToken = (raw: string): string | null => {
  const lower = raw.toLowerCase();
  const hasB2B2C = /b2b2c/.test(lower);
  const hasB2B = /b2b|business[-\s]?to[-\s]?business/.test(lower);
  const hasB2C = /b2c|business[-\s]?to[-\s]?consumer/.test(lower);
  const hasD2C = /d2c|direct[-\s]?to[-\s]?consumer/.test(lower);
  const hasSaaS = /saas|software as a service/.test(lower);
  const hasMarketplace = /marketplace/.test(lower);
  const hasPlatform = /platform/.test(lower);
  const hasEnterprise = /enterprise/.test(lower);
  const hasSMB = /\bsmb\b|small[-\s]?business/.test(lower);
  const hasConsumer = /consumer/.test(lower);
  const hasDeveloperTools = /developer\s+tools|dev\s+tools/.test(lower);

  if (hasB2B2C) return 'B2B2C';
  if (hasB2B && hasSaaS) return 'B2B SaaS';
  if (hasB2C && hasSaaS) return 'B2C SaaS';
  if (hasD2C && hasSaaS) return 'D2C SaaS';
  if (hasB2B && hasMarketplace) return 'B2B Marketplace';
  if (hasB2C && hasMarketplace) return 'B2C Marketplace';
  if (hasB2B && hasPlatform) return 'B2B Platform';
  if (hasB2C && hasPlatform) return 'B2C Platform';
  if (hasD2C) return 'D2C';
  if (hasB2B) return 'B2B';
  if (hasB2C) return 'B2C';
  if (hasSaaS) return 'SaaS';
  if (hasMarketplace) return 'Marketplace';
  if (hasPlatform) return 'Platform';
  if (hasEnterprise) return 'Enterprise';
  if (hasSMB) return 'SMB';
  if (hasConsumer) return 'Consumer';
  if (hasDeveloperTools) return 'Developer Tools';
  return normalizeTitleIfLowercase(raw);
};

const normalizeSegmentToken = (raw: string): string | null => {
  const lower = raw.toLowerCase();
  if (/\bsmb\b|small[-\s]?business/.test(lower)) return 'SMB';
  if (/mid[-\s]?market/.test(lower)) return 'Mid-market';
  if (/enterprise/.test(lower)) return 'Enterprise';
  if (/consumer/.test(lower)) return 'Consumer';
  return normalizeTitleIfLowercase(raw);
};

const normalizeDelimitedValue = (
  value: string | null,
  tokenNormalizer: (raw: string) => string | null,
): string | null => {
  if (!value) return null;
  const tokens = splitDelimitedTokens(value)
    .map(tokenNormalizer)
    .filter((token): token is string => Boolean(token));
  const deduped = Array.from(new Set(tokens));
  return deduped.length ? deduped.join(' / ') : null;
};

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
      companyIndustry: null,
      companyVertical: null,
      companyBusinessModel: null,
      buyerSegment: null,
      userSegment: null,
      companyMaturity: null,
      companyMission: null,
      companyValues: [],
      workType: null,
      salary: null,
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
    companyIndustry: getString('companyIndustry'),
    companyVertical: getString('companyVertical'),
    companyBusinessModel: getString('companyBusinessModel'),
    buyerSegment: getString('buyerSegment'),
    userSegment: getString('userSegment'),
    companyMaturity: getString('companyMaturity'),
    companyMission: getString('companyMission'),
    companyValues: ensureStringArray(value.companyValues),
    workType: getString('workType'),
    salary: getString('salary'),
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
  private readonly openAIClient: ReturnType<typeof createOpenAI> | null;
  private readonly now: () => Date;

  constructor(options: JobDescriptionServiceOptions = {}) {
    this.supabaseClient = options.supabaseClient ?? supabase;
    this.openAIClient = createOpenAIClient(options.openAIKey);
    this.now = options.now ?? (() => new Date());
  }

  async parseJobDescription(
    content: string,
    options: ParseJobDescriptionOptions = {},
  ): Promise<{ parsed: ParsedJobDescription; raw: Record<string, unknown> }> {
    if (!content || content.trim().length < 50) {
      throw new Error('Job description content must be at least 50 characters.');
    }

    // Call secure Edge Function instead of client-side OpenAI
    options.onProgress?.('Analyzing job description via secure server...');

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
          options.onProgress?.(`Retrying JD parse (attempt ${attempt + 1}/${MAX_RETRIES + 1})…`);
          await sleep(delay);
        }

        const { data: { session } } = await this.supabaseClient.auth.getSession();
        if (!session?.access_token) {
          throw new Error('Authentication required for job description parsing');
        }

        const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-job-description`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: content.trim() }),
          signal: options.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `Edge Function error: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success || !result.parsed) {
          throw new Error('Job description analysis returned empty response.');
        }

        options.onProgress?.('Job description analyzed successfully');

        const parsed = await this.transformParsedResponse(result.parsed);
        if (!parsed.workType) {
          parsed.workType = inferWorkTypeFromText(content);
        }
        
        return { parsed, raw: result.raw };
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
      // TODO: Fix file_type enum constraint - 'jd_parse' is not a valid value
      // Temporarily disabled to unblock cover letter generation
      // const logResult = await EvaluationEventLogger.logJDParse({
      //   userId,
      //   jobDescriptionId: record.id,
      //   rawTextChecksum: checksum,
      //   company: parsed.company,
      //   role: parsed.role,
      //   requirements: [
      //     ...parsed.standardRequirements.map(r => r.label),
      //     ...parsed.differentiatorRequirements.map(r => r.label),
      //     ...parsed.preferredRequirements.map(r => r.label),
      //   ],
      //   differentiatorSummary: parsed.differentiatorNotes,
      //   inputTokens,
      //   outputTokens,
      //   latency: totalLatencyMs,
      //   status: 'success',
      //   sourceUrl: options.url ?? undefined,
      //   model: OPENAI_CONFIG.MODEL,
      //   syntheticProfileId: options.syntheticProfileId,
      // });

      options.onProgress?.('Job description analysis complete.');

      return {
        ...record,
        evaluationRunId: undefined, // logResult.runId - disabled due to telemetry issue
        sessionId: `jd-parse-${Date.now()}-${checksum.slice(0, 8)}`,
      };
    } catch (error) {
      const finishTimestamp = this.now().getTime();
      const totalLatencyMs = finishTimestamp - startTimestamp;

      // Log failure event
      // TODO: Fix file_type enum constraint - 'jd_parse' is not a valid value
      // Temporarily disabled to unblock cover letter generation
      // await EvaluationEventLogger.logJDParse({
      //   userId,
      //   jobDescriptionId: 'pending',
      //   rawTextChecksum: checksum,
      //   inputTokens,
      //   outputTokens,
      //   latency: totalLatencyMs,
      //   status: 'failed',
      //   error: error instanceof Error ? error.message : 'Unknown error',
      //   sourceUrl: options.url ?? undefined,
      //   model: OPENAI_CONFIG.MODEL,
      //   syntheticProfileId: options.syntheticProfileId,
      // });

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

  /**
   * Find existing job description by content, or create a new one.
   * This prevents duplicate parsing of identical JDs.
   * 
   * @param userId - User ID
   * @param content - JD content to look up or parse
   * @param options - Parse options (only used if JD not found)
   * @returns Existing or newly created JD record
   */
  async findOrCreateJobDescription(
    userId: string,
    content: string,
    options: ParseJobDescriptionOptions & { url?: string | null; syntheticProfileId?: string } = {},
  ): Promise<JobDescriptionRecord & { evaluationRunId?: string; sessionId?: string; cached?: boolean }> {
    const trimmedContent = content.trim();

    // Look up existing JD by exact content match
    const { data: existing, error: lookupError } = await this.supabaseClient
      .from('job_descriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('content', trimmedContent)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.warn('[JobDescriptionService] Failed to lookup existing JD (non-blocking):', lookupError);
    }

    if (existing) {
      console.log('[JobDescriptionService] Found existing JD, skipping parse:', existing.id);
      options.onProgress?.('Job description analysis complete (cached).');
      return { 
        ...mapRowToRecord(existing),
        cached: true,
      };
    }

    // Not found - parse and create new
    console.log('[JobDescriptionService] No cached JD found, parsing...');
    const result = await this.parseAndCreate(userId, trimmedContent, options);
    return { 
      ...result,
      cached: false,
    };
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

  private async transformParsedResponse(payload: Record<string, unknown>): Promise<ParsedJobDescription> {
    // Extract basic fields
    const company =
      typeof payload.company === 'string' && payload.company.trim().length > 0
        ? payload.company.trim()
        : 'Unknown Company';
    const role =
      typeof payload.role === 'string' && payload.role.trim().length > 0
        ? payload.role.trim()
        : 'Product Manager';
    
    // New format: differentiatorSummary replaces summary
    const summary =
      typeof payload.differentiatorSummary === 'string' && payload.differentiatorSummary.trim().length > 0
        ? payload.differentiatorSummary.trim()
        : 'No summary provided.';
    const differentiatorNotes = summary; // Use same value for backward compat

    // New format: simple string arrays for requirements
    const coreRequirementsStrings = ensureStringArray(payload.coreRequirements);
    const preferredRequirementsStrings = ensureStringArray(payload.preferredRequirements);

    // Convert string arrays to RequirementInsight objects for backward compatibility
    // NOTE: Do NOT truncate label - it causes display bugs. Use full requirement text.
    const standardRequirements: RequirementInsight[] = coreRequirementsStrings.map((req, index) => ({
      id: `core-${index + 1}`,
      label: req, // Full text, no truncation
      requirement: req,
      detail: req,
      category: 'standard' as RequirementCategory,
      priority: 'high' as PriorityValue,
      keywords: [],
      signals: [],
      reasoning: '',
    }));

    const preferredRequirements: RequirementInsight[] = preferredRequirementsStrings.map((req, index) => ({
      id: `pref-${index + 1}`,
      label: req, // Full text, no truncation
      requirement: req,
      detail: req,
      category: 'preferred' as RequirementCategory,
      priority: 'medium' as PriorityValue,
      keywords: [],
      signals: [],
      reasoning: '',
    }));

    // Apply intelligent ranking to requirements
    let updatedCore = standardRequirements;
    let updatedPreferred = preferredRequirements;
    let differentiatorRequirements: RequirementInsight[] = [];
    
    try {
      const { rankRequirements, updatePriorityFromRanking, identifyDifferentiators } = await import('./requirementRankingService');
      
      // Rank and update priorities for core requirements
      const rankedCore = rankRequirements(standardRequirements, role);
      updatedCore = rankedCore.map(req => ({
        ...req,
        priority: updatePriorityFromRanking(req),
      }));
      
      // Rank and update priorities for preferred requirements
      const rankedPreferred = rankRequirements(preferredRequirements, role);
      updatedPreferred = rankedPreferred.map(req => ({
        ...req,
        priority: updatePriorityFromRanking(req),
      }));
      
      // Identify differentiator requirements (most unique/high-priority from both lists)
      const allRanked = [...rankedCore, ...rankedPreferred];
      const differentiators = identifyDifferentiators(allRanked, 3);
      differentiatorRequirements = differentiators.map(diff => ({
        id: diff.id,
        label: diff.label,
        detail: diff.detail,
        category: 'differentiator' as RequirementCategory,
        priority: diff.priority,
        keywords: diff.keywords,
        signals: diff.signals,
        reasoning: diff.reasoning,
      }));
    } catch (error) {
      // If ranking fails, use original requirements with default priorities
      console.warn('[JobDescriptionService] Requirement ranking failed, using defaults:', error);
    }

    // Extract new structured fields
    const salary = typeof payload.salary === 'string' ? normalizeWhitespace(payload.salary) : null;
    const companyIndustry = typeof payload.companyIndustry === 'string'
      ? normalizeTitleIfLowercase(payload.companyIndustry)
      : null;
    const companyVertical = typeof payload.companyVertical === 'string'
      ? normalizeTitleIfLowercase(payload.companyVertical)
      : null;
    const companyBusinessModel = typeof payload.companyBusinessModel === 'string'
      ? normalizeDelimitedValue(payload.companyBusinessModel, normalizeBusinessModelToken)
      : null;
    const buyerSegment = typeof payload.buyerSegment === 'string'
      ? normalizeDelimitedValue(payload.buyerSegment, normalizeSegmentToken)
      : null;
    const userSegment = typeof payload.userSegment === 'string'
      ? normalizeDelimitedValue(payload.userSegment, normalizeSegmentToken)
      : null;
    const companyMaturity = normalizeCompanyMaturity(
      typeof payload.companyMaturity === 'string' ? payload.companyMaturity : null,
    );
    const companyMission = typeof payload.companyMission === 'string'
      ? normalizeWhitespace(payload.companyMission)
      : null;
    const companyValues = ensureStringArray(payload.companyValues).map(normalizeWhitespace);
    const workType = typeof payload.workType === 'string'
      ? normalizeWhitespace(payload.workType)
      : null;
    const location = typeof payload.location === 'string'
      ? normalizeWhitespace(payload.location)
      : null;

    // Build enhanced structuredData with new fields
    const structuredData = {
      responsibilities: [],
      qualifications: [...coreRequirementsStrings, ...preferredRequirementsStrings],
      tools: [],
      teams: [],
      location,
      employmentType: workType,
      compensation: salary,
      // New fields
      companyIndustry,
      companyVertical,
      companyBusinessModel,
      buyerSegment,
      userSegment,
      companyMaturity,
      companyMission,
      companyValues,
      workType,
      salary,
      standardRequirements: updatedCore.map(({ ranking, rank, ...req }) => req),
      preferredRequirements: updatedPreferred.map(({ ranking, rank, ...req }) => req),
    };

    // Generate keywords from company industry, business model, and requirements
    const keywords: string[] = [];
    if (companyIndustry) keywords.push(companyIndustry);
    if (companyVertical) keywords.push(companyVertical);
    if (companyBusinessModel) keywords.push(companyBusinessModel);
    if (buyerSegment) keywords.push(buyerSegment);
    if (userSegment) keywords.push(userSegment);
    keywords.push(...coreRequirementsStrings.slice(0, 3).map(req => req.split(' ')[0])); // First word of each req
    
    const boilerplateSignals: string[] = [];
    const differentiatorSignals: string[] = [];
    if (companyIndustry) differentiatorSignals.push(`Industry: ${companyIndustry}`);
    if (companyVertical) differentiatorSignals.push(`Vertical: ${companyVertical}`);
    if (companyMission) differentiatorSignals.push('Mission-driven');

    const analysis: Record<string, Json> = {
      boilerplateSignals,
      differentiatorSignals,
      structuredInsights: structuredData,
      keywords,
      rawSections: [],
    };

    return {
      company,
      role,
      summary,
      standardRequirements: updatedCore.map(({ ranking, rank, ...req }) => req), // Remove ranking metadata
      preferredRequirements: updatedPreferred.map(({ ranking, rank, ...req }) => req), // Remove ranking metadata
      differentiatorRequirements,
      boilerplateSignals,
      differentiatorSignals,
      keywords,
      structuredInsights: structuredData,
      structuredData,
      analysis,
      differentiatorNotes,
      rawSections: [],
    };
  }
}

export const jobDescriptionService = new JobDescriptionService();
