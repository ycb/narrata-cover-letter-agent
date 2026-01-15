/**
 * Shared utilities for streaming pipeline execution
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { streamObject } from 'https://esm.sh/ai@5.0.92';
import { createOpenAI } from 'https://esm.sh/@ai-sdk/openai@2.0.65';
import { z } from 'https://esm.sh/zod@3.23.8';
import { getPMLevelsProfile } from './pm-levels.ts';
import { PipelineTelemetry } from './telemetry.ts';

// Re-export PM Levels utilities for convenience
export { getPMLevelsProfile } from './pm-levels.ts';
export type { PMLevelsProfile } from './pm-levels.ts';

// ============================================================================
// Types
// ============================================================================

export type SSESender = (event: string, data: any) => void | Promise<void>;

export interface PipelineContext {
  job: any;
  supabase: SupabaseClient;
  send: SSESender;
  openaiApiKey: string;
  telemetry?: PipelineTelemetry;
}

export interface PipelineStage {
  name: string;
  execute: (ctx: PipelineContext) => Promise<any>;
  timeout?: number;
}

export type RoleScope = 'feature' | 'product' | 'product_line' | 'multiple_teams' | 'org';
export type RoleLevel = 'APM' | 'PM' | 'Senior PM' | 'Staff' | 'Group';

export interface TitleMatchResult {
  exactTitleMatch: boolean;
  adjacentTitleMatch: boolean;
}

export interface ScopeMatchResult {
  scopeRelation: 'belowExperience' | 'goodFit' | 'stretch' | 'bigStretch';
}

export interface GoalAlignmentResult {
  alignsWithTargetTitles: boolean;
  alignsWithTargetLevelBand: boolean;
}

export interface RoleInsightsPayload {
  inferredRoleLevel?: RoleLevel;
  inferredRoleScope?: RoleScope;
  titleMatch?: TitleMatchResult;
  scopeMatch?: ScopeMatchResult;
  goalAlignment?: GoalAlignmentResult;
  summary?: string;
  highlights?: string[];
  confidence?: number;
}

export interface JdRequirementSummary {
  coreTotal: number;
  preferredTotal: number;
}

export interface StreamingPmProfile {
  targetLevelBand: string | null;
  targetTitles: string[];
  specializations: string[];
  inferredLevel: string | null;
}

export type StrengthLevel = 'strong' | 'moderate' | 'light';

export interface MwsDetail {
  label: string;
  strengthLevel: StrengthLevel;
  explanation: string;
}

export interface MwsSummary {
  summaryScore: 0 | 1 | 2 | 3;
  details: MwsDetail[];
}

export type CompanyContextSource = 'jd' | 'web' | 'mixed';

export interface CompanyContext {
  industry?: string;
  maturity?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'public' | 'mixed' | string;
  businessModels?: string[];
  source?: CompanyContextSource;
  confidence?: number;
}

export interface JobDescriptionSignals {
  companyName: string | null;
  keywords: string[];
  competencyHints: string[];
  domainKeywords: string[];
  summary: string;
}

// ============================================================================
// OpenAI Utilities
// ============================================================================

export async function callOpenAI(params: {
  apiKey: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  maxCompletionTokens?: number;
  responseFormat?: { type: string }; // Deprecated - kept for compatibility but ignored
}): Promise<any> {
  const {
    apiKey,
    model = 'gpt-4o-mini', // Updated to a model that's widely available
    messages,
    temperature = 0.7,
    maxTokens = 4000,
    maxCompletionTokens,
    // responseFormat is ignored - we parse JSON manually instead
  } = params;

  const requestStartedAt = Date.now();
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(typeof maxCompletionTokens === 'number'
        ? { max_completion_tokens: maxCompletionTokens }
        : { max_tokens: maxTokens }),
      // Removed response_format - parse JSON manually from response
    }),
  });

  const http_status = response.status;
  const request_id = response.headers.get('x-request-id') ?? response.headers.get('cf-ray') ?? null;
  const responseText = await response.text();

  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    const parseError = new Error(`OpenAI response was not valid JSON (http ${http_status})`);
    (parseError as any).name = 'OpenAIResponseParseError';
    (parseError as any).http_status = http_status;
    (parseError as any).request_id = request_id;
    (parseError as any).response_snippet = responseText.slice(0, 280);
    (parseError as any).max_output_tokens = maxTokens;
    throw parseError;
  }

  if (!response.ok) {
    const apiMessage = parsed?.error?.message || response.statusText;
    const apiError = new Error(`OpenAI API error (http ${http_status}): ${apiMessage}`);
    (apiError as any).name = 'OpenAIHTTPError';
    (apiError as any).http_status = http_status;
    (apiError as any).request_id = request_id;
    (apiError as any).error_code = parsed?.error?.code ?? null;
    (apiError as any).max_output_tokens = maxTokens;
    throw apiError;
  }

  const data = parsed;
  (data as any).__meta = {
    http_status,
    request_id,
    max_output_tokens: maxTokens,
    duration_ms: Date.now() - requestStartedAt,
  };
  return data;
}

export function parseJSONResponse(content: string): any {
  try {
    // Try direct parse first
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    throw new Error('Failed to parse JSON from response');
  }
}

// ============================================================================
// Pipeline Executor
// ============================================================================

export async function executePipeline(
  stages: PipelineStage[],
  context: PipelineContext
): Promise<any> {
  const results: Record<string, any> = {};
  const telemetry = context.telemetry;

  for (const stage of stages) {
    try {
      // Stage start
      try { // logging should never throw
        const { elog } = await import('../_shared/log.ts');
        elog.info(`[Pipeline] Executing stage: ${stage.name}`);
      } catch (_) {}
      
      // Start telemetry for this stage
      if (telemetry) {
        telemetry.startStage(stage.name);
      }

      // Execute stage with timeout
      const stagePromise = stage.execute(context);
      const timeoutPromise = stage.timeout
        ? new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`Stage ${stage.name} timed out after ${stage.timeout}ms`)),
              stage.timeout
            )
          )
        : null;

      const result = timeoutPromise
        ? await Promise.race([stagePromise, timeoutPromise])
        : await stagePromise;

      // End telemetry for this stage
      if (telemetry) {
        telemetry.endStage(true);
      }

      // Store result
      results[stage.name] = result;

      // Send progress event (await in case it's async, e.g. database update)
      await context.send('progress', {
        jobId: context.job.id,
        stage: stage.name,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      try {
        const { elog } = await import('../_shared/log.ts');
        const err = error instanceof Error ? error : new Error(String(error));
        elog.error(`[Pipeline] Stage ${stage.name} failed:`, err);
      } catch (_) {}
      
      // End telemetry with error
      if (telemetry) {
        const err = error instanceof Error ? error : new Error(String(error));
        telemetry.endStage(false, err.message);
      }
      
      throw new PipelineError(
        `Stage ${stage.name} failed: ${(error instanceof Error ? error.message : String(error))}`,
        stage.name,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  return results;
}

// ============================================================================
// Database Utilities
// ============================================================================

export async function fetchJobDescription(supabase: SupabaseClient, jobDescriptionId: string) {
  const { data, error } = await supabase
    .from('job_descriptions')
    .select('*')
    .eq('id', jobDescriptionId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch job description: ${error.message}`);
  }

  return data;
}

export async function fetchUserProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data;
}

export async function fetchWorkHistory(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from('work_items')
    .select('*, companies(*)')
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    console.warn(`Failed to fetch work items: ${error.message}`);
    return []; // Return empty array if table doesn't exist or user has no data
  }

  return data || [];
}

export async function fetchStories(supabase: SupabaseClient, userId: string) {
  // Query the 'stories' table (not deprecated 'approved_content')
  // Include both 'approved' and 'draft' stories for PM Level assessment
  const { data, error } = await supabase
    .from('stories')
    .select('id, title, content, tags, work_item_id, source_id, metrics, created_at, updated_at')
    .eq('user_id', userId)
    .in('status', ['approved', 'draft'])
    .order('created_at', { ascending: false });

  if (error) {
    console.warn(`Failed to fetch stories: ${error.message}`);
    return []; // Return empty array if table doesn't exist or user has no data
  }

  return data || [];
}

// ============================================================================
// Streaming Helpers
// ============================================================================

type StreamJsonFromLLMOptions<TSchema extends z.ZodTypeAny> = {
  apiKey: string;
  prompt: string;
  schema: TSchema;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  onPartial?: (partial: Partial<z.infer<TSchema>>) => void | Promise<void>;
};

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface StreamJsonResult<T> {
  data: T;
  usage: LLMUsage;
}

export async function streamJsonFromLLM<TSchema extends z.ZodTypeAny>(
  options: StreamJsonFromLLMOptions<TSchema>
): Promise<StreamJsonResult<z.infer<TSchema>>> {
  const {
    apiKey,
    prompt,
    schema,
    model = 'gpt-4o-mini',
    temperature = 0.2,
    maxTokens = 800,
    systemPrompt,
    onPartial,
  } = options;

  const composedPrompt = systemPrompt ? `${systemPrompt.trim()}\n\n${prompt}` : prompt;
  const raw = await callOpenAI({
    apiKey,
    model,
    messages: [{ role: 'user', content: composedPrompt }],
    temperature,
    maxTokens,
  });
  const content = raw?.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? parseJSONResponse(content) : content;
  
  // Extract usage data from OpenAI response
  const usage: LLMUsage = {
    prompt_tokens: raw?.usage?.prompt_tokens ?? 0,
    completion_tokens: raw?.usage?.completion_tokens ?? 0,
    total_tokens: raw?.usage?.total_tokens ?? 0,
  };
  
  // Validate against provided schema and return both data and usage
  const data = schema.parse(parsed) as z.infer<TSchema>;
  return { data, usage };
}

export function extractJdRequirementSummary(jd: Record<string, any> | null): JdRequirementSummary {
  const extractArray = (value: any): any[] => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof value === 'object') {
      return Array.isArray((value as any).items) ? (value as any).items : Object.values(value);
    }
    return [];
  };

  const core = extractArray(jd?.standard_requirements || jd?.core_requirements || []);
  const preferred = extractArray(jd?.preferred_requirements || []);

  return {
    coreTotal: core.length,
    preferredTotal: preferred.length,
  };
}

// ============================================================================
// Goals & Strengths Helpers
// ============================================================================

const COMPETENCY_KEYWORD_MAP: Record<string, string[]> = {
  growth: ['growth', 'activation', 'acquisition', 'retention', 'conversion', 'monetization', 'funnel'],
  platform: ['platform', 'infrastructure', 'api', 'sdk', 'integration', 'developer'],
  ai_ml: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'genai', 'llm', 'nlp', 'vision'],
  founding: ['founding', 'founder', '0->1', 'zero to one', 'seed', 'early stage', 'pre-seed'],
  technical: ['technical', 'architecture', 'systems', 'scalability', 'backend', 'cloud'],
  general: [],
};

const REQUIREMENT_KEYS = [
  'standard_requirements',
  'preferred_requirements',
  'differentiator_requirements',
];

const COMPANY_CONTEXT_FIELDS: Array<keyof CompanyContext> = ['industry', 'maturity', 'businessModels'];

const SUMMARY_MAX_CHARS = 900;

const normalizeToken = (value: string | undefined | null): string | undefined => {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const coerceStringArray = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeToken(typeof item === 'string' ? item : item?.label))
      .filter((token): token is string => !!token);
  }
  return [];
};

const dedupeStrings = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const lower = value.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(value);
    }
  }
  return result;
};

const extractRequirementKeywords = (requirements: any): string[] => {
  if (!Array.isArray(requirements)) return [];
  return requirements
    .map((req) => normalizeToken(req?.label || req?.text || req))
    .filter((token): token is string => !!token);
};

const truncateForSummary = (text: string, maxChars = SUMMARY_MAX_CHARS): string => {
  if (!text) return '';
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}...`;
};

const mapKeywordToCompetencies = (keyword: string): string[] => {
  const normalized = keyword.toLowerCase();
  const matches: string[] = [];
  for (const [tag, synonyms] of Object.entries(COMPETENCY_KEYWORD_MAP)) {
    if (synonyms.some((syn) => normalized.includes(syn))) {
      matches.push(tag);
    }
  }
  return matches;
};

export function extractJobDescriptionSignals(jd: Record<string, any> | null): JobDescriptionSignals {
  if (!jd) {
    return {
      companyName: null,
      keywords: [],
      competencyHints: [],
      domainKeywords: [],
      summary: '',
    };
  }

  const keywordFields = [
    ...coerceStringArray(jd.keywords),
    ...coerceStringArray(jd.analysis?.keywords),
    ...coerceStringArray(jd.structured_data?.keywords),
    ...coerceStringArray(jd.structured_data?.tags),
  ];

  const requirementKeywords = REQUIREMENT_KEYS.flatMap((key) => extractRequirementKeywords(jd[key]));

  const combinedKeywords = dedupeStrings([...keywordFields, ...requirementKeywords]);
  const competencyHints = dedupeStrings(
    combinedKeywords.flatMap((keyword) => mapKeywordToCompetencies(keyword))
  );

  const competencyLower = new Set(competencyHints.map((hint) => hint.toLowerCase()));
  const domainKeywords = combinedKeywords.filter(
    (keyword) => !competencyLower.has(keyword.toLowerCase())
  );

  const summaryText =
    normalizeToken(jd.summary) ||
    normalizeToken(jd.content) ||
    normalizeToken(jd.raw_text) ||
    '';

  return {
    companyName: normalizeToken(jd.company) ?? null,
    keywords: combinedKeywords,
    competencyHints,
    domainKeywords,
    summary: truncateForSummary(summaryText || ''),
  };
}

interface CompanyTagsClientOptions {
  apiUrl?: string | null;
  apiKey?: string | null;
  timeoutMs?: number;
}

export class CompanyTagsClient {
  private readonly apiUrl?: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: CompanyTagsClientOptions = {}) {
    this.apiUrl = options.apiUrl ?? Deno.env.get('COMPANY_TAGS_API_URL') ?? undefined;
    this.apiKey = options.apiKey ?? Deno.env.get('COMPANY_TAGS_API_KEY') ?? undefined;
    this.timeoutMs = options.timeoutMs ?? 4500;
  }

  isEnabled(): boolean {
    return Boolean(this.apiUrl && this.apiKey);
  }

  async fetchCompanyContext(params: { companyName: string }): Promise<CompanyContext | null> {
    if (!this.isEnabled() || !params.companyName) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.apiUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey!,
        },
        body: JSON.stringify({ companyName: params.companyName }),
        signal: controller.signal,
      });

      if (!response.ok) {
        console.warn(`[CompanyTagsClient] API responded with status ${response.status}`);
        return null;
      }

      const data = await response.json();
      return {
        industry: normalizeToken(data.industry ?? data.primaryIndustry),
        maturity: normalizeToken(data.maturity ?? data.stage),
        businessModels: dedupeStrings(coerceStringArray(data.businessModels || data.models)),
        source: 'web',
        confidence: typeof data.confidence === 'number' ? Number(data.confidence.toFixed(2)) : undefined,
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.warn('[CompanyTagsClient] Request timed out');
      } else {
        console.warn('[CompanyTagsClient] Request failed', error);
      }
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function needsCompanyContextFallback(context: CompanyContext | null | undefined): boolean {
  if (!context) return true;
  return COMPANY_CONTEXT_FIELDS.every((field) => {
    if (field === 'businessModels') {
      return !context.businessModels || context.businessModels.length === 0;
    }
    return !context[field];
  });
}

export function computeCompanyContextConfidence(
  context: Partial<CompanyContext>,
  source: CompanyContextSource = 'jd'
): number {
  const base =
    source === 'mixed' ? 0.85 : source === 'web' ? 0.75 : 0.65;

  const filled = COMPANY_CONTEXT_FIELDS.reduce((count, field) => {
    if (field === 'businessModels') {
      return count + ((context.businessModels && context.businessModels.length > 0) ? 1 : 0);
    }
    return count + (context[field] ? 1 : 0);
  }, 0);

  const confidence = Math.min(0.95, base + filled * 0.05);
  return Number(confidence.toFixed(2));
}

export function mergeCompanyContexts(
  jdContext: CompanyContext | null | undefined,
  webContext: CompanyContext | null | undefined
): CompanyContext | null {
  if (!jdContext && !webContext) {
    return null;
  }

  if (jdContext && !webContext) {
    return {
      ...jdContext,
      source: 'jd',
      confidence: computeCompanyContextConfidence(jdContext, 'jd'),
    };
  }

  if (webContext && !jdContext) {
    return {
      ...webContext,
      source: 'web',
      confidence: computeCompanyContextConfidence(webContext, 'web'),
    };
  }

  const merged: CompanyContext = {
    industry: webContext?.industry || jdContext?.industry,
    maturity: webContext?.maturity || jdContext?.maturity,
    businessModels: dedupeStrings([
      ...(jdContext?.businessModels || []),
      ...(webContext?.businessModels || []),
    ]),
    source: 'mixed',
  };

  merged.confidence = computeCompanyContextConfidence(merged, 'mixed');
  return merged;
}

export async function getPmProfileForStreaming(
  supabase: SupabaseClient,
  userId: string
): Promise<StreamingPmProfile> {
  const pmProfile = await getPMLevelsProfile(supabase, userId);

  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('goals')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    try {
      const { elog } = await import('./log.ts');
      const err = error instanceof Error ? error : new Error(String(error));
      elog.info(`[Streaming] Failed to load goals for user ${userId}: ${err.message}`);
    } catch (_) {}
  }

  let targetTitles: string[] = [];
  let targetLevelBand = pmProfile.targetLevelBand;

  const goalsPayload = (() => {
    const rawGoals = data?.goals;
    if (!rawGoals) return null;
    if (typeof rawGoals === 'string') {
      try {
        return JSON.parse(rawGoals);
      } catch {
        return null;
      }
    }
    return rawGoals;
  })();

  if (Array.isArray(goalsPayload)) {
    targetTitles = goalsPayload.filter((item: any) => typeof item === 'string');
  } else if (goalsPayload && typeof goalsPayload === 'object') {
    if (Array.isArray(goalsPayload.targetTitles)) {
      targetTitles = goalsPayload.targetTitles.filter((item: any) => typeof item === 'string');
    }
    if (typeof goalsPayload.targetLevelBand === 'string') {
      targetLevelBand = goalsPayload.targetLevelBand;
    }
  }

  return {
    targetLevelBand,
    targetTitles,
    specializations: pmProfile.specializations || [],
    inferredLevel: pmProfile.inferredLevel,
  };
}

const TITLE_LEVEL_ORDER: Array<{ rank: number; keywords: string[] }> = [
  { rank: 4, keywords: ['group', 'director', 'head'] },
  { rank: 3, keywords: ['principal', 'staff', 'lead'] },
  { rank: 2, keywords: ['senior', 'sr'] },
  { rank: 1, keywords: ['product manager', 'pm'] },
  { rank: 0, keywords: ['associate', 'junior', 'apm'] },
];

const ROLE_LEVEL_TO_SCOPE: Record<string, RoleScope> = {
  L3: 'feature',
  L4: 'product',
  L5: 'product_line',
  L6: 'multiple_teams',
  M1: 'multiple_teams',
  M2: 'org',
};

const SCOPE_ORDER: RoleScope[] = ['feature', 'product', 'product_line', 'multiple_teams', 'org'];

const ROLE_LEVEL_CODE_MAP: Record<RoleLevel, string> = {
  APM: 'L3',
  PM: 'L4',
  'Senior PM': 'L5',
  Staff: 'L6',
  Group: 'M1',
};

const normalizeTitle = (title?: string | null): string =>
  (title || '').trim().toLowerCase();

function getTitleRank(title?: string | null): number | null {
  const normalized = normalizeTitle(title);
  if (!normalized) return null;
  for (const entry of TITLE_LEVEL_ORDER) {
    if (entry.keywords.some(keyword => normalized.includes(keyword))) {
      return entry.rank;
    }
  }
  return 1; // default Product Manager rank
}

function bandsToLevelCodes(targetBand: string | null): string[] {
  if (!targetBand) return [];
  return targetBand
    .split(/[-/,]/)
    .map(part => part.trim().toUpperCase())
    .filter(Boolean);
}

export function compareTitles(params: {
  jdTitle?: string | null;
  userTitles?: string[];
  targetTitles?: string[];
}): TitleMatchResult {
  const { jdTitle, userTitles = [], targetTitles = [] } = params;

  const normalizedJD = normalizeTitle(jdTitle);
  if (!normalizedJD) {
    return { exactTitleMatch: false, adjacentTitleMatch: false };
  }

  const comparisonPool = [...userTitles, ...targetTitles].map(normalizeTitle).filter(Boolean);
  const exactTitleMatch = comparisonPool.some(title => title === normalizedJD);

  const jdRank = getTitleRank(jdTitle);
  const ranks = [...userTitles, ...targetTitles]
    .map(getTitleRank)
    .filter((rank): rank is number => typeof rank === 'number');

  const adjacentTitleMatch =
    typeof jdRank === 'number' &&
    ranks.some(rank => Math.abs(rank - jdRank) <= 1);

  return { exactTitleMatch, adjacentTitleMatch };
}

function mapLevelToScope(level?: string | null): RoleScope | null {
  if (!level) return null;
  return ROLE_LEVEL_TO_SCOPE[level as keyof typeof ROLE_LEVEL_TO_SCOPE] || null;
}

export function compareScope(
  inferredScope?: RoleScope,
  userLevel?: string | null
): ScopeMatchResult | null {
  const userScope = mapLevelToScope(userLevel);
  if (!inferredScope || !userScope) {
    return null;
  }

  const jobScopeIndex = SCOPE_ORDER.indexOf(inferredScope);
  const userScopeIndex = SCOPE_ORDER.indexOf(userScope);

  if (jobScopeIndex === -1 || userScopeIndex === -1) {
    return null;
  }

  const diff = jobScopeIndex - userScopeIndex;

  if (diff <= -1) {
    return { scopeRelation: 'belowExperience' };
  }
  if (diff === 0) {
    return { scopeRelation: 'goodFit' };
  }
  if (diff === 1) {
    return { scopeRelation: 'stretch' };
  }
  return { scopeRelation: 'bigStretch' };
}

export function computeGoalAlignment(params: {
  inferredRoleLevel?: RoleLevel;
  jdTitle?: string | null;
  targetLevelBand?: string | null;
  targetTitles?: string[];
}): GoalAlignmentResult {
  const { inferredRoleLevel, jdTitle, targetLevelBand, targetTitles = [] } = params;
  const normalizedJD = normalizeTitle(jdTitle);

  const alignsWithTargetTitles =
    !!normalizedJD &&
    targetTitles
      .map(normalizeTitle)
      .filter(Boolean)
      .some(title => title === normalizedJD);

  const bandCodes = bandsToLevelCodes(targetLevelBand ?? null);
  const inferredCode = inferredRoleLevel ? ROLE_LEVEL_CODE_MAP[inferredRoleLevel] : null;
  const alignsWithTargetLevelBand =
    !!inferredCode && bandCodes.includes(inferredCode.toUpperCase());

  return {
    alignsWithTargetTitles,
    alignsWithTargetLevelBand,
  };
}

// ============================================================================
// Error Handling
// ============================================================================

export class PipelineError extends Error {
  constructor(
    message: string,
    public stage: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'PipelineError';
  }
}

export function wrapStageError(stage: string, error: Error): PipelineError {
  return new PipelineError(
    `Stage ${stage} failed: ${error.message}`,
    stage,
    error
  );
}
