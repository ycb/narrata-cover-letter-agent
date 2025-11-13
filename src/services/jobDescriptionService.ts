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

type SupabaseClient = typeof supabase;

export interface ParseJobDescriptionOptions {
  signal?: AbortSignal;
  onToken?: (token: string, aggregate: string) => void;
}

export interface JobDescriptionServiceOptions {
  supabaseClient?: SupabaseClient;
  openAIKey?: string;
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

  constructor(options: JobDescriptionServiceOptions = {}) {
    this.supabaseClient = options.supabaseClient ?? supabase;
    this.openAIClient = createOpenAIClient(options.openAIKey);
  }

  async parseJobDescription(
    content: string,
    options: ParseJobDescriptionOptions = {},
  ): Promise<{ parsed: ParsedJobDescription; raw: Record<string, unknown> }> {
    if (!content || content.trim().length < 50) {
      throw new Error('Job description content must be at least 50 characters.');
    }

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
      maxTokens: 1500,
      signal: options.signal,
    } as any);

    let aggregated = '';

    const handleToken = (token: string) => {
      aggregated += token;
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
    options: ParseJobDescriptionOptions & { url?: string | null } = {},
  ): Promise<JobDescriptionRecord> {
    const { parsed, raw } = await this.parseJobDescription(content, options);

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

    return this.createJobDescription(userId, {
      content,
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


