import { createOpenAI } from '@ai-sdk/openai';
import { streamText, type TextStreamPart } from 'ai';
import type { Database } from '@/types/supabase';
import {
  type CreateJobDescriptionPayload,
  type DraftWorkpadPayload,
  type JobDescriptionRecord,
  type JobRequirement,
  type ParsedJobDescription,
  type RequirementPriority,
  type RequirementCategory,
} from '@/types/coverLetters';
import { supabase } from '@/lib/supabase';
import { OPENAI_CONFIG } from '@/lib/config/fileUpload';

type SupabaseClient = typeof supabase;

export interface ParseJobDescriptionOptions {
  signal?: AbortSignal;
  onToken?: (token: string, aggregated: string) => void;
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
  "id": string (stable hash if supplied, else generate),
  "description": string,
  "priority": "critical" | "high" | "medium" | "optional",
  "keywords": string[],
  "signals": string[]
}

Rules:
- Classify requirements as:
  * standardRequirements: boilerplate expectations for most Product Manager roles.
  * differentiatorRequirements: unique priorities or outliers that signal this company's context or challenges.
  * preferredRequirements: nice-to-haves explicitly called out.
- Provide differentiatorNotes summarising why the differentiator items matter.
- Include at least 5 keywords spanning responsibilities, tools, and outcomes.
- rawSections should capture major headings detected in the JD.
- Respond with STRICT JSON (no commentary, no markdown fences).
`;

const DEFAULT_PRIORITY: RequirementPriority = 'high';

const SUPPORTED_PRIORITIES: RequirementPriority[] = ['critical', 'high', 'medium', 'optional'];

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

const normaliseRequirementPriority = (value: unknown): RequirementPriority => {
  if (typeof value === 'string') {
    const lowered = value.toLowerCase() as RequirementPriority;
    if (SUPPORTED_PRIORITIES.includes(lowered)) {
      return lowered;
    }
  }
  return DEFAULT_PRIORITY;
};

const normaliseRequirement = (
  requirement: unknown,
  fallbackCategory: RequirementCategory,
): JobRequirement | null => {
  if (!isRecord(requirement)) return null;

  const descriptionRaw =
    typeof requirement.description === 'string'
      ? requirement.description
      : typeof requirement.detail === 'string'
      ? requirement.detail
      : typeof requirement.summary === 'string'
      ? requirement.summary
      : undefined;

  const description = descriptionRaw?.trim();
  if (!description) return null;

  const id =
    typeof requirement.id === 'string' && requirement.id.trim().length > 0
      ? requirement.id.trim()
      : `req_${cryptoRandomString()}`;

  const category =
    typeof requirement.category === 'string' && (SUPPORTED_CATEGORIES as string[]).includes(requirement.category)
      ? (requirement.category as RequirementCategory)
      : fallbackCategory;

  const priority = normaliseRequirementPriority(requirement.priority);

  const keywords = Array.isArray(requirement.keywords)
    ? requirement.keywords.filter(
        (keyword): keyword is string => typeof keyword === 'string' && keyword.trim().length > 0,
      )
    : [];

  const signals = Array.isArray(requirement.signals)
    ? requirement.signals.filter((signal): signal is string => typeof signal === 'string' && signal.trim().length > 0)
    : [];

  return {
    id,
    description,
    category,
    priority,
    keywords,
    signals,
  };
};

const cryptoRandomString = (): string => {
  const globalCrypto: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;

  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }

  return Math.random().toString(36).slice(2) + Date.now().toString(36);
};

const normaliseRequirementArray = (
  list: unknown,
  fallbackCategory: RequirementCategory,
): JobRequirement[] => {
  if (!Array.isArray(list)) return [];
  return list
    .map(item => normaliseRequirement(item, fallbackCategory))
    .filter((item): item is JobRequirement => Boolean(item));
};

const ensureStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap(item => (typeof item === 'string' ? item.trim() : [])).filter(Boolean)
    : [];

const normaliseStructuredData = (value: unknown): ParsedJobDescription['structuredData'] => {
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

const mapRowToRecord = (row: JobDescriptionRow): JobDescriptionRecord => ({
  id: row.id,
  userId: row.user_id,
  url: row.url,
  content: row.content,
  company: row.company,
  role: row.role,
  summary: (row.analysis as Record<string, unknown> | null)?.summary as string | undefined ?? '',
  structuredData: (row.structured_data as Record<string, unknown>) ?? {},
  standardRequirements: normaliseRequirementArray(row.standard_requirements, 'standard'),
  differentiatorRequirements: normaliseRequirementArray(row.differentiator_requirements, 'differentiator'),
  preferredRequirements: normaliseRequirementArray(row.preferred_requirements, 'preferred'),
  keywords: Array.isArray(row.keywords)
    ? row.keywords.filter((keyword): keyword is string => typeof keyword === 'string')
    : [],
  differentiatorNotes: row.differentiator_notes ?? undefined,
  analysis: (row.analysis as Record<string, unknown>) ?? {},
  rawSections: Array.isArray((row.analysis as any)?.rawSections)
    ? ((row.analysis as any).rawSections as string[])
    : [],
  createdAt: row.created_at ?? new Date().toISOString(),
  updatedAt: row.updated_at ?? new Date().toISOString(),
});

const defaultAnalysisEnvelope = (
  data: { summary: string; differentiatorNotes?: string; rawSections?: string[] },
  raw: Record<string, unknown>,
): Record<string, unknown> => ({
  summary: data.summary,
  differentiatorNotes: data.differentiatorNotes,
  rawSections: data.rawSections ?? [],
  llm: raw,
});

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
      maxTokens: 1400,
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
      analysis: payload.analysis ?? defaultAnalysisEnvelope(payload, {}),
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

  async updateAnalysis(
    jobDescriptionId: string,
    analysis: Record<string, unknown>,
  ): Promise<void> {
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

    return {
      company,
      role,
      summary,
      standardRequirements,
      differentiatorRequirements,
      preferredRequirements,
      keywords,
      differentiatorNotes,
      structuredData: normaliseStructuredData(payload.structuredData),
      rawSections,
    };
  }
}

