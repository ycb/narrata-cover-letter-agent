/**
 * Cover Letter Streaming Pipeline - ANALYSIS ONLY (Phase 1)
 * 
 * This pipeline provides progressive analysis for the UI skeleton.
 * It does NOT generate or save draft content - that's done by generateDraft().
 * 
 * Stages:
 * 1. jdAnalysis (10-20s) - Role alignment + JD requirements summary (streaming)
 * 2. requirementAnalysis (10-25s) - Detailed requirement matching
 * 3. goalsAndStrengths (additive streaming insights) - MWS + company context
 * 4. sectionGaps (25-45s) - Section-level gap analysis
 * 
 * REMOVED (Phase 1):
 * 4. draftGeneration - Now handled by generateDraft() service method
 */

import { z } from 'https://esm.sh/zod@3.23.8';
import type {
  PipelineContext,
  PipelineStage,
  RoleInsightsPayload,
  RoleLevel,
  RoleScope,
  JdRequirementSummary,
  StreamingPmProfile,
  CompanyContext,
  JobDescriptionSignals,
  MwsSummary,
  MwsDetail,
  StrengthLevel,
} from '../pipeline-utils.ts';
import {
  callOpenAI,
  parseJSONResponse,
  fetchJobDescription,
  fetchWorkHistory,
  fetchStories,
  streamJsonFromLLM,
  extractJdRequirementSummary,
  getPmProfileForStreaming,
  compareTitles,
  compareScope,
  computeGoalAlignment,
  extractJobDescriptionSignals,
  CompanyTagsClient,
  needsCompanyContextFallback,
  mergeCompanyContexts,
  computeCompanyContextConfidence,
} from '../pipeline-utils.ts';
import { PipelineTelemetry } from '../telemetry.ts';
import { voidLogEval } from '../evals/log.ts';
import {
  validateCoverLetterResult,
  calculateQualityScore,
} from '../evals/validators.ts';

const companyTagsClient = new CompanyTagsClient();

// ============================================================================
// Stage 1: Basic Metrics - REMOVED
// ============================================================================
// PERFORMANCE OPTIMIZATION: basicMetrics was redundant with requirementAnalysis
// Both fetched JD and evaluated fit. Removing saves 5-10s per generation.
// The metrics it provided (atsScore, goalsMatch, experienceMatch) are now
// derived from requirementAnalysis results instead.
// ============================================================================

// ============================================================================
// Stage 1: JD Analysis (Streaming insights - 10-20s)
// ============================================================================

const ROLE_LEVEL_VALUES: RoleLevel[] = ['APM', 'PM', 'Senior PM', 'Staff', 'Group'];
const ROLE_SCOPE_VALUES: RoleScope[] = ['feature', 'product', 'product_line', 'multiple_teams', 'org'];

const COVER_LETTER_PIPELINE_VERSION = 'gng_step_v1';

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Exported for preanalyze-jd edge function
export const roleInsightsSchema = z
  .object({
    inferredRoleLevel: z.enum(ROLE_LEVEL_VALUES).optional(),
    inferredRoleScope: z.enum(ROLE_SCOPE_VALUES).optional(),
    summary: z.string().optional(),
    highlights: z.array(z.string()).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .partial();

export type RawRoleInsights = z.infer<typeof roleInsightsSchema>;

interface JdAnalysisStageData {
  roleInsights?: RoleInsightsPayload;
  jdRequirementSummary?: JdRequirementSummary;
}

const jdAnalysisStage: PipelineStage = {
  name: 'jdAnalysis',
  timeout: 20000,
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey, send } = ctx;
    const { jobDescriptionId } = job.input;

    const stageData: JdAnalysisStageData = {};
    let stageStatus: 'processing' | 'complete' | 'failed' = 'processing';
    const stageStartMs = Date.now();
    let firstPartialMs: number | null = null;
    let llmUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
    let usedCache = false;

    const emitPartial = async (partial: Partial<JdAnalysisStageData>) => {
      try {
        firstPartialMs = firstPartialMs ?? Date.now();
        await send('progress', {
          jobId: job.id,
          stage: 'jdAnalysis',
          isPartial: true,
          data: partial,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[jdAnalysisStage] Failed to emit partial progress event', error);
      }
    };

    try {
      const jd = await fetchJobDescription(supabase, jobDescriptionId);
      
      // PERF: Check for pre-computed analysis from preanalyze-jd edge function
      const cachedAnalysis = jd.analysis as Record<string, unknown> | null;
      const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
      
      if (cachedAnalysis?.roleInsights && cachedAnalysis?.analyzedAt) {
        const analyzedAt = new Date(cachedAnalysis.analyzedAt as string);
        const ageMs = Date.now() - analyzedAt.getTime();
        
        if (ageMs < CACHE_TTL_MS) {
          try { const { elog } = await import('../log.ts'); elog.info('[jdAnalysisStage] Using cached pre-analysis', { jobDescriptionId, cacheAgeMs: ageMs }); } catch (_) {}
          
          // Use cached results directly
          stageData.roleInsights = cachedAnalysis.roleInsights as RoleInsightsPayload;
          stageData.jdRequirementSummary = cachedAnalysis.jdRequirementSummary as JdRequirementSummary;
          usedCache = true;
          
          // Emit the cached data
          await emitPartial({ jdRequirementSummary: stageData.jdRequirementSummary });
          await emitPartial({ roleInsights: stageData.roleInsights });
          
          // Return early with cached data
          return {
            status: 'complete',
            isPartial: false,
            data: stageData,
            usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            ttfu_ms: firstPartialMs ? firstPartialMs - stageStartMs : null,
            meta: { usedCache: true },
          };
        }
      }
      
      const jdText = (jd.raw_text || jd.content || '').trim();
      const jdTitle = jd.role || jd.title || jd.position || '';
      const pmProfile = await getPmProfileForStreaming(supabase, job.user_id);
      const workHistory = await fetchWorkHistory(supabase, job.user_id);
      const historyTitles = workHistory
        .map((wh: any) => wh.title)
        .filter((title: any): title is string => typeof title === 'string' && title.trim().length > 0);

      const jdRequirementSummary = extractJdRequirementSummary(jd);
      stageData.jdRequirementSummary = jdRequirementSummary;
      await emitPartial({ jdRequirementSummary });

      let accumulatedRoleInsights: RoleInsightsPayload | null = null;
      try {
        const rolePrompt = buildJdRolePrompt(jdTitle, jd.company, jdText);
        const { data: roleResult, usage: roleUsage } = await streamJsonFromLLM<RawRoleInsights>({
          apiKey: openaiApiKey,
          prompt: rolePrompt,
          schema: roleInsightsSchema,
          onPartial: async (partial) => {
            const sanitized = sanitizeRoleInsights(partial);
            if (sanitized) {
              accumulatedRoleInsights = mergeRoleInsights(accumulatedRoleInsights, sanitized);
              // Spec: roleInsights are emitted only in the final jdAnalysis event
            }
          },
        });

        llmUsage = roleUsage; // Store for return data
        const sanitizedFinal = sanitizeRoleInsights(roleResult);
        accumulatedRoleInsights = mergeRoleInsights(accumulatedRoleInsights, sanitizedFinal);
      } catch (error) {
        try {
          const { elog } = await import('../log.ts');
          elog.warn('[STREAM] jdAnalysis role inference failed', { error: error instanceof Error ? error.message : String(error) });
        } catch (_) {
          console.warn('[STREAM] jdAnalysis role inference failed', error);
        }
      }

      const enrichedRoleInsights = enrichRoleInsights({
        base: accumulatedRoleInsights,
        jdTitle,
        pmProfile,
        workHistoryTitles: historyTitles,
      });

      if (enrichedRoleInsights) {
        stageData.roleInsights = enrichedRoleInsights;
      }

      stageStatus = 'complete';
      try {
        const { elog } = await import('../log.ts');
        elog.info('[STREAM] jdAnalysis complete', {
          hasRoleInsights: Boolean(stageData.roleInsights),
          hasRequirementSummary: Boolean(stageData.jdRequirementSummary),
        });
      } catch (_) {}
    } catch (error) {
      stageStatus = 'failed';
      try {
        const { elog } = await import('../log.ts');
        elog.error('[STREAM] jdAnalysis failed', { error: error instanceof Error ? error.message : String(error) });
      } catch (_) {
        console.error('[STREAM] jdAnalysis failed', error);
      }
    }

    const finalData = stageStatus === 'failed' ? {} : stageData;

    try {
      await send('progress', {
        jobId: job.id,
        stage: 'jdAnalysis',
        isPartial: false,
        data: finalData,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[jdAnalysisStage] Failed to emit final progress event', err);
    }

    if (stageStatus === 'complete' && (stageData.roleInsights || stageData.jdRequirementSummary)) {
      try {
        const existingAnalysis = (jd.analysis as Record<string, unknown> | null) ?? {};
        const analysisPayload = {
          ...existingAnalysis,
          roleInsights: stageData.roleInsights ?? existingAnalysis.roleInsights,
          jdRequirementSummary: stageData.jdRequirementSummary ?? existingAnalysis.jdRequirementSummary,
          analyzedAt: new Date().toISOString(),
          latencyMs: Date.now() - stageStartMs,
        };

        const { error: updateError } = await supabase
          .from('job_descriptions')
          .update({ analysis: analysisPayload })
          .eq('id', jobDescriptionId);

        if (updateError) {
          console.warn('[jdAnalysisStage] Failed to persist analysis cache', updateError);
        }
      } catch (cacheError) {
        console.warn('[jdAnalysisStage] Exception while persisting analysis cache', cacheError);
      }
    }

    return {
      status: stageStatus,
      isPartial: false,
      data: finalData,
      usage: llmUsage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }, // Include token usage for logging
      ttfu_ms: firstPartialMs ? firstPartialMs - stageStartMs : null,
      meta: { usedCache },
    };
  },
};

// Exported for preanalyze-jd edge function
export function buildJdRolePrompt(role: string | null, company: string | null, jdText: string): string {
  const trimmedJD = jdText.length > 8000 ? `${jdText.slice(0, 8000)}\n...` : jdText;
  return `You are a PM leveling expert. Analyze the following job description and infer the hiring level and scope.

Return ONLY a JSON object with this exact shape:
{
  "inferredRoleLevel": "APM" | "PM" | "Senior PM" | "Staff" | "Group",
  "inferredRoleScope": "feature" | "product" | "product_line" | "multiple_teams" | "org",
  "summary": string,
  "highlights": string[],
  "confidence": number (0-1)
}

Company: ${company || 'Unknown'}
Role Title: ${role || 'Unknown'}

Job Description:
${trimmedJD}`;
}

// Exported for preanalyze-jd edge function
export function sanitizeRoleInsights(raw?: RawRoleInsights | null): RoleInsightsPayload | null {
  if (!raw) return null;
  const payload: RoleInsightsPayload = {};

  if (raw.inferredRoleLevel && ROLE_LEVEL_VALUES.includes(raw.inferredRoleLevel as RoleLevel)) {
    payload.inferredRoleLevel = raw.inferredRoleLevel as RoleLevel;
  }
  if (raw.inferredRoleScope && ROLE_SCOPE_VALUES.includes(raw.inferredRoleScope as RoleScope)) {
    payload.inferredRoleScope = raw.inferredRoleScope as RoleScope;
  }
  if (typeof raw.summary === 'string') {
    payload.summary = raw.summary;
  }
  if (Array.isArray(raw.highlights)) {
    payload.highlights = raw.highlights.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)) {
    const bounded = Math.min(Math.max(raw.confidence, 0), 1);
    payload.confidence = bounded;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function mergeRoleInsights(
  base: RoleInsightsPayload | null,
  incoming: RoleInsightsPayload | null
): RoleInsightsPayload | null {
  if (!incoming) return base;
  if (!base) return { ...incoming };
  return { ...base, ...incoming };
}

function enrichRoleInsights(params: {
  base: RoleInsightsPayload | null;
  jdTitle?: string | null;
  pmProfile: StreamingPmProfile;
  workHistoryTitles: string[];
}): RoleInsightsPayload | null {
  const { base, jdTitle, pmProfile, workHistoryTitles } = params;
  const roleInsights: RoleInsightsPayload = { ...(base || {}) };

  const titleMatch = compareTitles({
    jdTitle,
    userTitles: workHistoryTitles,
    targetTitles: pmProfile.targetTitles,
  });
  roleInsights.titleMatch = titleMatch;

  if (roleInsights.inferredRoleScope) {
    const scopeMatch = compareScope(roleInsights.inferredRoleScope, pmProfile.inferredLevel);
    if (scopeMatch) {
      roleInsights.scopeMatch = scopeMatch;
    }
  }

  roleInsights.goalAlignment = computeGoalAlignment({
    inferredRoleLevel: roleInsights.inferredRoleLevel,
    jdTitle,
    targetLevelBand: pmProfile.targetLevelBand,
    targetTitles: pmProfile.targetTitles,
  });

  return Object.keys(roleInsights).length > 0 ? roleInsights : null;
}

// ============================================================================
// Stage 3: Requirement Analysis (Medium - 10-25s)
// ============================================================================

const requirementAnalysisStage: PipelineStage = {
  name: 'requirementAnalysis',
  timeout: 30000, // 30s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey, send } = ctx;
    const { jobDescriptionId } = job.input;
    const stageStartMs = Date.now();
    let firstPartialMs: number | null = null;
    let llmUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
    let callMeta: {
      attempt: number;
      retry_count: number;
      http_status?: number;
      finish_reason?: string | null;
      max_output_tokens?: number;
      error_code?: string | null;
      request_id?: string | null;
    } | null = null;

    // Fetch data
    const jd = await fetchJobDescription(supabase, jobDescriptionId);
    const workHistory = await fetchWorkHistory(supabase, job.user_id);
    const stories = await fetchStories(supabase, job.user_id);

    // Early progress: surface counts so UI can tick forward immediately
    try {
      firstPartialMs = firstPartialMs ?? Date.now();
      await send('progress', {
        jobId: job.id,
        stage: 'requirementAnalysis',
        isPartial: true,
        data: {
          status: 'context_loaded',
          workHistoryCount: workHistory.length,
          storyCount: stories.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[requirementAnalysisStage] Failed to emit context_loaded progress', err);
    }

    // Build context
    const workHistoryText = workHistory
      .map((wh: any) => `${wh.title} at ${wh.company}: ${wh.description || ''}`)
      .join('\n');

    const storiesText = stories
      .map((s: any) => `${s.title}: ${s.content}`)
      .join('\n');

    const prompt = `Analyze requirements for this job and match against the candidate's background.

JOB DESCRIPTION:
${jd.raw_text || jd.content}

CANDIDATE WORK HISTORY:
${workHistoryText}

CANDIDATE STORIES:
${storiesText}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "coreRequirements": [
    {
      "id": "core-1",
      "text": "requirement text",
      "met": boolean,
      "evidence": "specific evidence from background (if met)"
    }
  ],
  "preferredRequirements": [
    {
      "id": "pref-1", 
      "text": "requirement text",
      "met": boolean,
      "evidence": "specific evidence (if met)"
    }
  ],
  "requirementsMet": number (count of met requirements),
  "totalRequirements": number (total count)
}

Extract 5-10 core and 3-5 preferred requirements. Be specific with evidence.`;

    const isRetryable = (error: unknown) => {
      const name = (error as any)?.name;
      const httpStatus = (error as any)?.http_status;
      const errorCode = (error as any)?.error_code;
      if (name === 'OpenAIResponseParseError') return true; // e.g., HTML body
      if (name === 'OpenAIHTTPError') {
        if (errorCode === 'rate_limit_exceeded') return true;
        if (typeof httpStatus === 'number' && httpStatus >= 500) return true;
      }
      return false;
    };

    const maxAttempts = 2;
    let attempt = 0;
    let response: any | null = null;
    let lastError: unknown = null;
    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        response = await callOpenAI({
          apiKey: openaiApiKey,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          maxTokens: 2500,
        });
        break;
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts && isRetryable(error)) {
          // Small backoff; keep it short to avoid compounding worst-case latency.
          const backoffMs = 400 * attempt;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
        throw error;
      }
    }
    if (!response) {
      throw lastError instanceof Error ? lastError : new Error('OpenAI call failed');
    }

    const responseMeta = (response as any)?.__meta as
      | { http_status?: number; request_id?: string | null; max_output_tokens?: number }
      | undefined;
    const finish_reason = response?.choices?.[0]?.finish_reason ?? null;
    callMeta = {
      attempt,
      retry_count: Math.max(0, attempt - 1),
      http_status: responseMeta?.http_status,
      request_id: responseMeta?.request_id ?? null,
      max_output_tokens: responseMeta?.max_output_tokens,
      finish_reason,
      error_code: null,
    };

    llmUsage = {
      prompt_tokens: response?.usage?.prompt_tokens ?? 0,
      completion_tokens: response?.usage?.completion_tokens ?? 0,
      total_tokens: response?.usage?.total_tokens ?? 0,
    };

    let result: any;
    try {
      result = parseJSONResponse(response.choices[0].message.content);
    } catch (error) {
      const parseError = new Error('Failed to parse requirementAnalysis JSON from model output');
      (parseError as any).name = 'RequirementAnalysisParseError';
      (parseError as any).response_snippet = String(response?.choices?.[0]?.message?.content ?? '').slice(0, 280);
      throw parseError;
    }

    const finalPayload = {
      coreRequirements: result.coreRequirements || [],
      preferredRequirements: result.preferredRequirements || [],
      requirementsMet: result.requirementsMet || 0,
      totalRequirements: result.totalRequirements || 0,
    };
    if (
      (!Array.isArray(finalPayload.coreRequirements) || finalPayload.coreRequirements.length === 0) &&
      (!Array.isArray(finalPayload.preferredRequirements) || finalPayload.preferredRequirements.length === 0)
    ) {
      throw new Error('Requirement analysis returned no requirements');
    }

    // Late progress: counts to drive UI micro-steps
    try {
      firstPartialMs = firstPartialMs ?? Date.now();
      await send('progress', {
        jobId: job.id,
        stage: 'requirementAnalysis',
        isPartial: true,
        data: {
          status: 'requirements_extracted',
          coreCount: Array.isArray(finalPayload.coreRequirements) ? finalPayload.coreRequirements.length : 0,
          preferredCount: Array.isArray(finalPayload.preferredRequirements) ? finalPayload.preferredRequirements.length : 0,
          requirementsMet: finalPayload.requirementsMet,
          totalRequirements: finalPayload.totalRequirements,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[requirementAnalysisStage] Failed to emit requirements_extracted progress', err);
    }

    // Final progress: mark stage complete so client stageFlags can advance
    try {
      await send('progress', {
        jobId: job.id,
        stage: 'requirementAnalysis',
        isPartial: false,
        data: finalPayload,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[requirementAnalysisStage] Failed to emit final progress event', err);
    }

    return {
      ...finalPayload,
      status: 'complete',
      usage: llmUsage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
      ttfu_ms: firstPartialMs ? firstPartialMs - stageStartMs : null,
      meta: callMeta ?? { attempt: 1, retry_count: 0 },
    };
  },
};

// ============================================================================
// Stage 4: Goals & Strengths (Streaming A-phase insights)
// ============================================================================

const MWS_DETAIL_SCHEMA = z.object({
  label: z.string().min(3).max(120),
  strengthLevel: z.enum(['strong', 'moderate', 'light']),
  explanation: z.string().min(5).max(280),
});

const MWS_SCHEMA = z.object({
  summaryScore: z.number().min(0).max(3),
  details: z.array(MWS_DETAIL_SCHEMA).max(3).optional(),
});

const COMPANY_CONTEXT_SCHEMA = z.object({
  industry: z.string().optional(),
  maturity: z.string().optional(),
  businessModels: z.array(z.string()).max(5).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

type RawMwsSummary = z.infer<typeof MWS_SCHEMA>;
type RawCompanyContext = z.infer<typeof COMPANY_CONTEXT_SCHEMA>;

interface GoalsAndStrengthsStageData {
  mws?: MwsSummary | null;
  companyContext?: CompanyContext | null;
}

const goalsAndStrengthsStage: PipelineStage = {
  name: 'goalsAndStrengths',
  timeout: 35000,
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey, send } = ctx;
    const { jobDescriptionId } = job.input;

	    const stageData: GoalsAndStrengthsStageData = {};
	    let stageStatus: 'processing' | 'complete' | 'failed' = 'processing';
	    const stageStartMs = Date.now();
	    let firstPartialMs: number | null = null;
	    // IMPORTANT: These must live in the execute() scope (not inside the inner try blocks),
	    // otherwise referencing them in the return object throws ReferenceError in Deno.
	    let mwsUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
	    let jdContextUsage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null = null;
	    const timings: {
	      mws_ms?: number;
	      company_context_ms?: number;
	      company_tags_ms?: number;
	      used_company_tags?: boolean;
	    } = {};

    const emitPartial = async () => {
      try {
        firstPartialMs = firstPartialMs ?? Date.now();
        await send('progress', {
          jobId: job.id,
          stage: 'goalsAndStrengths',
          isPartial: true,
          data: {
            ...(stageData.mws ? { mws: stageData.mws } : {}),
            ...(stageData.companyContext ? { companyContext: stageData.companyContext } : {}),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[goalsAndStrengthsStage] Failed to emit partial progress', error);
      }
    };

    const completeMwsStage = async () => {
      try {
        await send('progress', {
          jobId: job.id,
          stage: 'goalsAndStrengths',
          isPartial: false,
          data: stageStatus === 'failed' ? {} : { ...(stageData.mws ? { mws: stageData.mws } : {}) },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[goalsAndStrengthsStage] Failed to emit final progress (MWS-only)', error);
      }
    };

    // Company context is intentionally separated so it cannot block "Phase A complete" UX.
    // This stage is additive and can finish later (web fallback can be slow).
    const emitCompanyContext = async (isPartial: boolean, payload: Record<string, unknown>) => {
      try {
        await send('progress', {
          jobId: job.id,
          stage: 'companyContext',
          isPartial,
          data: payload,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.warn('[companyContextStage] Failed to emit progress', error);
      }
    };

    await logStreamInfo('[STREAM] goalsAndStrengths started', { jobId: job.id });

    try {
      const jd = await fetchJobDescription(supabase, jobDescriptionId);
      const pmProfile = await getPmProfileForStreaming(supabase, job.user_id);
      const jdText = (jd.raw_text || jd.content || '').trim();
      const truncatedJd = truncateForGoalsStage(jdText);
      const jdSignals = extractJobDescriptionSignals(jd);
      const companyName =
        job.input?.companyName ||
        job.input?.company ||
        jdSignals.companyName ||
        jd.company ||
        null;

	      // --- MWS STREAMING ---------------------------------------------------
	      try {
        const mwsStart = Date.now();
        const mwsPrompt = buildMwsPrompt(pmProfile, jdSignals, truncatedJd);
        const { data: mwsResult, usage: mwsTokenUsage } = await streamJsonFromLLM<RawMwsSummary>({
          apiKey: openaiApiKey,
          prompt: mwsPrompt,
          schema: MWS_SCHEMA,
          temperature: 0.25,
          maxTokens: 650,
          onPartial: async (partial) => {
            const sanitized = sanitizeMwsSummary(partial);
            if (sanitized) {
              const hasChanged =
                !stageData.mws ||
                stageData.mws.summaryScore !== sanitized.summaryScore ||
                (sanitized.details?.length || 0) !== (stageData.mws.details?.length || 0);
              stageData.mws = sanitized;
              if (hasChanged) {
                await emitPartial();
                await logStreamInfo('[STREAM] goalsAndStrengths MWS partial ready', {
                  jobId: job.id,
                  summaryScore: sanitized.summaryScore,
                  detailCount: sanitized.details.length,
                });
              }
            }
          },
        });

        timings.mws_ms = Date.now() - mwsStart;
        mwsUsage = mwsTokenUsage; // Store for return data
        const finalMws = sanitizeMwsSummary(mwsResult);
        if (finalMws) {
          stageData.mws = finalMws;
          await emitPartial();
          await logStreamInfo('[STREAM] goalsAndStrengths MWS ready', {
            jobId: job.id,
            summaryScore: finalMws.summaryScore,
            detailCount: finalMws.details.length,
          });
          
          // PERSIST MWS TO JOB DESCRIPTION (source-of-truth for eval logging)
          // This ensures MwS is available when draft is created, avoiding race conditions
          if (jobDescriptionId) {
            try {
              // Read current analysis, merge with MwS
              const { data: jdRow } = await supabase
                .from('job_descriptions')
                .select('analysis')
                .eq('id', jobDescriptionId)
                .single();
              
              const currentAnalysis = (jdRow?.analysis as Record<string, unknown>) || {};
              await supabase
                .from('job_descriptions')
                .update({
                  analysis: {
                    ...currentAnalysis,
                    mws: finalMws,
                    mwsCalculatedAt: new Date().toISOString(),
                  },
                })
                .eq('id', jobDescriptionId);
              
              await logStreamInfo('[STREAM] MWS persisted to job_description', {
                jobId: job.id,
                jobDescriptionId,
              });
            } catch (persistError) {
              // Non-blocking - frontend fallback will handle
              await logStreamInfo('[STREAM] MWS persistence failed (non-blocking)', {
                jobId: job.id,
                error: persistError instanceof Error ? persistError.message : String(persistError),
              });
            }
          }
        }
      } catch (error) {
        await logStreamInfo('[STREAM] goalsAndStrengths.mws failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // Mark the Go/No-go-relevant A-phase stage as complete as soon as MwS is ready.
      // Company context continues independently and should not block the Fit check buffer step.
      stageStatus = 'complete';
      await completeMwsStage();

	      // --- COMPANY CONTEXT (JD FIRST) --------------------------------------
	      let jdContext: CompanyContext | null = null;
	      try {
        const companyContextStart = Date.now();
        await emitCompanyContext(true, { status: 'starting' });
        const contextPrompt = buildCompanyContextPrompt(companyName, jdSignals, truncatedJd);
        const { data: jdContextRaw, usage: contextTokenUsage } = await streamJsonFromLLM<RawCompanyContext>({
          apiKey: openaiApiKey,
          prompt: contextPrompt,
          schema: COMPANY_CONTEXT_SCHEMA,
          temperature: 0.2,
          maxTokens: 500,
        });
        timings.company_context_ms = Date.now() - companyContextStart;
        jdContextUsage = contextTokenUsage; // Store for return data
        const sanitizedContext = sanitizeCompanyContext(jdContextRaw, 'jd');
        if (sanitizedContext) {
          sanitizedContext.confidence =
            sanitizedContext.confidence ??
            computeCompanyContextConfidence(sanitizedContext, sanitizedContext.source ?? 'jd');
          jdContext = sanitizedContext;
          stageData.companyContext = sanitizedContext;
          await emitCompanyContext(true, { companyContext: sanitizedContext });
          await logStreamInfo('[STREAM] goalsAndStrengths companyContext ready', {
            jobId: job.id,
            source: sanitizedContext.source,
            confidence: sanitizedContext.confidence,
          });
        }
      } catch (error) {
        await logStreamInfo('[STREAM] goalsAndStrengths.companyContext jd failed', {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      // --- COMPANY CONTEXT (WEB FALLBACK) ----------------------------------
      if (
        companyTagsClient.isEnabled() &&
        companyName &&
        needsCompanyContextFallback(stageData.companyContext)
      ) {
        const companyTagsStart = Date.now();
        try {
          const webContext = await companyTagsClient.fetchCompanyContext({ companyName });
          const companyTagsDuration = Date.now() - companyTagsStart;
          timings.company_tags_ms = companyTagsDuration;
          timings.used_company_tags = true;
          
          // Log company tags LLM call (Phase 0: Cost Tracking)
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'company_tags_extraction',
            user_id: job.user_id,
            started_at: new Date(companyTagsStart),
            completed_at: new Date(),
            duration_ms: companyTagsDuration,
            success: !!webContext,
            prompt_name: 'companyTagsAPI', // External API call
            model: 'external_api', // Not an LLM, but tracked for cost analysis
            result_subset: webContext ? {
              industry: webContext.industry,
              maturity: webContext.maturity,
              source: webContext.source,
              confidence: webContext.confidence,
            } : undefined,
          });
          
          if (webContext) {
            const merged = mergeCompanyContexts(stageData.companyContext, webContext);
            if (merged) {
              stageData.companyContext = merged;
              await emitCompanyContext(true, { companyContext: merged });
              await logStreamInfo('[STREAM] goalsAndStrengths companyContext merged', {
                jobId: job.id,
                source: merged.source,
                confidence: merged.confidence,
              });
            }
          }
        } catch (error) {
          // Log failed company tags call
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'companyTags',
            user_id: job.user_id,
            started_at: new Date(companyTagsStart),
            completed_at: new Date(),
            duration_ms: Date.now() - companyTagsStart,
            success: false,
            error_type: 'CompanyTagsAPIError',
            error_message: error instanceof Error ? error.message : String(error),
            prompt_name: 'companyTagsAPI',
            model: 'external_api',
          });
          
          await logStreamInfo('[STREAM] goalsAndStrengths.companyContext fallback failed', {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      await emitCompanyContext(false, {
        ...(stageData.companyContext ? { companyContext: stageData.companyContext } : {}),
      });
      await logStreamInfo('[STREAM] goalsAndStrengths complete', {
        jobId: job.id,
        hasMws: Boolean(stageData.mws),
        hasCompanyContext: Boolean(stageData.companyContext),
      });
    } catch (error) {
      stageStatus = 'failed';
      await logStreamError('[STREAM] goalsAndStrengths failed', {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      status: stageStatus,
      isPartial: false,
      data: stageStatus === 'failed' ? {} : stageData,
      usage: { // Include token usage for logging (multiple LLM calls)
        mws: mwsUsage,
        companyContext: jdContextUsage,
      },
      timings,
      ttfu_ms: firstPartialMs ? firstPartialMs - stageStartMs : null,
    };
  },
};

function buildMwsPrompt(
  profile: StreamingPmProfile,
  signals: JobDescriptionSignals,
  jdText: string
): string {
  const specializations =
    profile.specializations.length > 0 ? profile.specializations.join(', ') : 'Not specified';
  const targetTitles =
    profile.targetTitles.length > 0 ? profile.targetTitles.join(', ') : 'Not specified';
  const keywordsSnippet =
    signals.keywords.length > 0 ? signals.keywords.slice(0, 12).join(', ') : 'None provided';
  const competencyHints =
    signals.competencyHints.length > 0 ? signals.competencyHints.join(', ') : 'Not detected';

  return `You are aligning a PM's strengths with a job description.

Candidate PM profile:
- Current level: ${profile.inferredLevel || 'unknown'}
- Target level band: ${profile.targetLevelBand || 'not specified'}
- Target titles: ${targetTitles}
- Specializations: ${specializations}

Job signals:
- Company: ${signals.companyName || 'Unknown'}
- Competency hints: ${competencyHints}
- Domain keywords: ${keywordsSnippet}

Job description summary:
${signals.summary || 'No summary provided.'}

Job description excerpt:
${jdText}

Return ONLY a JSON object:
{
  "summaryScore": integer 0-3,
  "details": [
    {
      "label": string,
      "strengthLevel": "strong" | "moderate" | "light",
      "explanation": string
    }
  ]
}

Rules:
- summaryScore must be 0,1,2,or 3 (0 = weak alignment, 3 = exceptional alignment)
- Provide 1-3 detail entries, each tying a PM strength to a JD need.
- Keep explanations specific and under 280 characters.`;
}

function buildCompanyContextPrompt(
  companyName: string | null,
  signals: JobDescriptionSignals,
  jdText: string
): string {
  const businessHints =
    signals.domainKeywords.length > 0 ? signals.domainKeywords.slice(0, 12).join(', ') : 'None';

  return `Infer the company's industry, maturity, and business models from this job description.

Company: ${companyName || 'Unknown'}
Job keywords: ${businessHints}
Job summary: ${signals.summary || 'No summary provided.'}

Return ONLY JSON:
{
  "industry": string,
  "maturity": "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "growth" | "public",
  "businessModels": string[],
  "confidence": number (0-1)
}

If unsure, leave fields blank rather than guessing.

Job description excerpt:
${jdText}`;
}

function sanitizeMwsSummary(raw?: Partial<RawMwsSummary> | null): MwsSummary | null {
  if (!raw) return null;
  const score =
    typeof raw.summaryScore === 'number' && Number.isFinite(raw.summaryScore)
      ? clampSummaryScore(raw.summaryScore)
      : null;
  if (score === null) {
    return null;
  }

  const details = Array.isArray(raw.details)
    ? raw.details
        .map((detail) => ({
          label: typeof detail.label === 'string' ? detail.label.trim() : null,
          strengthLevel: detail.strengthLevel as StrengthLevel,
          explanation: typeof detail.explanation === 'string' ? detail.explanation.trim() : null,
        }))
        .filter(
          (detail): detail is MwsDetail =>
            !!detail.label &&
            !!detail.explanation &&
            ['strong', 'moderate', 'light'].includes(detail.strengthLevel)
        )
        .slice(0, 3)
    : [];

  return {
    summaryScore: score,
    details,
  };
}

function sanitizeCompanyContext(
  raw?: Partial<RawCompanyContext> | null,
  source: CompanyContext['source'] = 'jd'
): CompanyContext | null {
  if (!raw) return null;
  const industry = normalizeSimpleString(raw.industry);
  const maturity = normalizeMaturity(raw.maturity);
  const businessModels = normalizeStringList(raw.businessModels);

  if (!industry && !maturity && businessModels.length === 0) {
    return null;
  }

  const context: CompanyContext = {
    industry: industry || undefined,
    maturity: maturity || undefined,
    businessModels: businessModels.length ? businessModels : undefined,
    source,
    confidence:
      typeof raw.confidence === 'number' && Number.isFinite(raw.confidence)
        ? Number(raw.confidence.toFixed(2))
        : undefined,
  };

  return context;
}

function normalizeSimpleString(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMaturity(value?: string | null): string | undefined {
  const normalized = normalizeSimpleString(value);
  if (!normalized) return undefined;
  const lower = normalized.toLowerCase();
  const map: Record<string, string> = {
    'pre seed': 'pre-seed',
    'pre-seed': 'pre-seed',
    seed: 'seed',
    'series a': 'series-a',
    'series b': 'series-b',
    'series c': 'series-c',
    growth: 'growth',
    public: 'public',
    ipo: 'public',
  };
  return map[lower] || lower;
}

function normalizeStringList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  const deduped = new Set<string>();
  for (const value of values) {
    const normalized = normalizeSimpleString(typeof value === 'string' ? value : null);
    if (normalized) {
      deduped.add(normalized);
    }
  }
  return Array.from(deduped).slice(0, 5);
}

function clampSummaryScore(value: number): 0 | 1 | 2 | 3 {
  if (value <= 0) return 0;
  if (value < 1.5) return 1;
  if (value < 2.5) return 2;
  return 3;
}

function truncateForGoalsStage(text: string, maxChars = 3200): string {
  if (!text) return '';
  return text.length <= maxChars ? text : `${text.slice(0, maxChars)}\n...`;
}

async function logStreamInfo(message: string, payload?: Record<string, unknown>) {
  try {
    const { elog } = await import('../log.ts');
    elog.info(message, payload);
  } catch (_) {
    if (payload) {
      console.log(message, payload);
    } else {
      console.log(message);
    }
  }
}

async function logStreamError(message: string, payload?: Record<string, unknown>) {
  try {
    const { elog } = await import('../log.ts');
    elog.error(message, payload);
  } catch (_) {
    if (payload) {
      console.error(message, payload);
    } else {
      console.error(message);
    }
  }
}

// ============================================================================
// Stage 3: Section Gaps (Slow - 25-45s)
// ============================================================================

const sectionGapsStage: PipelineStage = {
  name: 'sectionGaps',
  timeout: 50000, // 50s timeout
  execute: async (ctx: PipelineContext) => {
    const { job, supabase, openaiApiKey, send } = ctx;
    const { jobDescriptionId, templateId } = job.input;
    const stageStartMs = Date.now();
    let firstPartialMs: number | null = null;

    // Fetch data
    const jd = await fetchJobDescription(supabase, jobDescriptionId);
    
    // Fetch template if provided
    let template = null;
    if (templateId) {
      const { data } = await supabase
        .from('cover_letter_templates')
        .select('*')
        .eq('id', templateId)
        .single();
      template = data;
    }

    // CANONICAL SECTION IDS: Only send section IDs to LLM (no slug to avoid confusion)
    // Frontend will match gaps by section.id ONLY.
    const templateSectionIds = template?.sections?.map((s: any) => s.id) || [];

    // Early progress: let UI know gap analysis started and how many sections we will analyze
	    try {
	      await send('progress', {
	        jobId: job.id,
	        stage: 'sectionGaps',
	        isPartial: true,
	        data: {
	          status: 'starting',
	          sectionCount: templateSectionIds.length,
	        },
	        timestamp: new Date().toISOString(),
	      });
        firstPartialMs = firstPartialMs ?? Date.now();
	    } catch (err) {
	      console.warn('[sectionGapsStage] Failed to emit starting progress', err);
	    }

    const prompt = `Analyze gaps for cover letter sections for this job.

JOB DESCRIPTION:
${jd.raw_text || jd.content}

TEMPLATE SECTION IDs (YOU MUST USE THESE EXACT VALUES):
${JSON.stringify(templateSectionIds, null, 2)}

For each section ID in the template, identify gaps between what the job requires and what's typically included.

**CRITICAL**: You MUST use the EXACT section IDs from the list above. Do not invent new IDs.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "sections": [
    {
      "sectionId": "<exact id from the list above>",
      "requirementGaps": [
        {
          "id": "unique-gap-id",
          "type": "missing_hook" | "weak_connection" | "missing_differentiator" | "missing_metrics" | "missing_specificity",
          "requirement": "what's required or expected",
          "suggestion": "how to address this gap",
          "severity": "critical" | "important" | "nice-to-have"
        }
      ]
    }
  ],
  "totalGaps": number
}

Analyze ALL section IDs in the template. Focus on 1-3 gaps per section where applicable.`;

	    const llmStart = Date.now();
	    const response = await callOpenAI({
	      apiKey: openaiApiKey,
	      messages: [{ role: 'user', content: prompt }],
	      temperature: 0.5,
	      maxTokens: 3500,
	    });
	    const llmDuration = Date.now() - llmStart;
      const preLlmMs = llmStart - stageStartMs;

    const result = parseJSONResponse(response.choices[0].message.content);
    
    // Extract usage metrics from response
    const usage = response.usage || {};
    const model = 'gpt-4o-mini'; // Known from callOpenAI default
    const finish_reason = response?.choices?.[0]?.finish_reason ?? null;
	    const responseMeta = (response as any)?.__meta as
	      | { http_status?: number; request_id?: string | null; max_output_tokens?: number; duration_ms?: number }
	      | undefined;

    // Late progress: total gaps + section count for UI ticks
    try {
      await send('progress', {
        jobId: job.id,
        stage: 'sectionGaps',
        isPartial: true,
        data: {
          status: 'gaps_extracted',
          sectionCount: Array.isArray(result.sections) ? result.sections.length : 0,
          totalGaps: result.totalGaps || 0,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[sectionGapsStage] Failed to emit gaps_extracted progress', err);
    }
    
    // CANONICAL ID VALIDATION: Ensure all returned sectionIds match template
    const validTemplateSectionIds = new Set(templateSectionIds);
    const validatedSections = (result.sections || []).filter((section: any) => {
      if (!section.sectionId) {
        console.warn('[sectionGapsStage] Section missing sectionId, skipping');
        return false;
      }
      if (!validTemplateSectionIds.has(section.sectionId)) {
        console.warn(`[sectionGapsStage] Unknown sectionId "${section.sectionId}", skipping`);
        return false;
      }
      return true;
    });

    const totalGaps = validatedSections.reduce((sum: number, s: any) => sum + (s.requirementGaps?.length || 0), 0);

    // Final progress: mark stage complete so DB stage status flips from running -> complete.
    try {
      await send('progress', {
        jobId: job.id,
        stage: 'sectionGaps',
        isPartial: false,
        data: {
          status: 'complete',
          sections: validatedSections,
          totalGaps,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[sectionGapsStage] Failed to emit final progress event', err);
    }

	    return {
	      status: 'complete',
	      sections: validatedSections,
	      totalGaps,
	      usage,
        ttfu_ms: firstPartialMs ? firstPartialMs - stageStartMs : null,
	      llmDuration,
        pre_llm_ms: preLlmMs,
        openai_duration_ms: responseMeta?.duration_ms,
	      model,
	      meta: {
	        attempt: 1,
	        retry_count: 0,
	        http_status: responseMeta?.http_status,
        request_id: responseMeta?.request_id ?? null,
        max_output_tokens: responseMeta?.max_output_tokens,
        finish_reason,
        error_code: null,
      },
    };
  },
};

// ============================================================================
// PHASE 1: Draft Generation Stage REMOVED
// ============================================================================
//
// This stage has been removed per STREAMING_FINALIZATION Phase 1.
// Draft generation now happens ONLY via generateDraft() in coverLetterDraftService.
// This pipeline provides ONLY analysis: metrics, requirements, and gaps.
//
// Reason: The draftGenerationStage was creating malformed drafts with:
// - Single section containing entire letter (wrong structure)
// - No proper section types (intro/body/closing)
// - No enhancedMatchData or gap analysis
// - No template structure preservation
//
// The frontend will call both:
// 1. createJob() -> streams analysis (this pipeline)
// 2. generateDraft() -> produces proper draft with sections
//
// ============================================================================

// ============================================================================
// Main Pipeline Executor (OPTIMIZED: Parallel execution)
// ============================================================================
// 
// PERFORMANCE OPTIMIZATION: Parallelized stage execution
// 
// OLD (Sequential): jdAnalysis → requirementAnalysis → goalsAndStrengths → sectionGaps
// Estimated: 70-90s
//
// NEW (Parallel Layers):
// - Layer 1: jdAnalysis (streaming insights to UI)
// - Layer 2 (parallel): requirementAnalysis + goalsAndStrengths (both depend only on JD)  
// - Layer 3: sectionGaps (needs requirements)
// Estimated: 35-50s (40-50% reduction)
//
// REMOVED: basicMetrics stage (redundant with requirementAnalysis)
// ============================================================================

type CoverLetterPipelineOptions = {
  onlyStage?: string;
  finalizeJob?: boolean;
};

export async function executeCoverLetterPipeline(
  job: any,
  supabase: any,
  send: (event: string, data: any) => void,
  options?: CoverLetterPipelineOptions
) {
  // Initialize telemetry
  const telemetry = new PipelineTelemetry(job.id, job.type);
  const jobDescriptionId = job.input?.jobDescriptionId as string | undefined;
  const templateId = job.input?.templateId as string | undefined;
  let jdFingerprint: { char_len?: number; hash12?: string } = {};
  const onlyStage = options?.onlyStage;
  const finalizeJob = options?.finalizeJob ?? true;

  try {
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Create pipeline context
    const context: PipelineContext = {
      job,
      supabase,
      send,
      openaiApiKey,
      telemetry,
    };

    try { 
      const { elog } = await import('../log.ts'); 
      elog.info('[executeCoverLetterPipeline] Starting PARALLEL pipeline execution'); 
    } catch (_) {}

    const results: Record<string, any> = {};
    try {
      if (jobDescriptionId) {
        const jd = await fetchJobDescription(supabase, jobDescriptionId);
        const jdText = ((jd as any)?.raw_text || (jd as any)?.content || '').trim();
        jdFingerprint.char_len = jdText.length;
        if (jdText) {
          const hex = await sha256Hex(jdText);
          jdFingerprint.hash12 = hex.slice(0, 12);
        }
      }
    } catch {
      // Non-blocking: fingerprint is optional
    }

    // =========================================================================
    // STAGE-ONLY EXECUTION (authenticated retries, e.g. sectionGaps)
    // =========================================================================
    if (onlyStage) {
      if (onlyStage !== 'sectionGaps') {
        throw new Error(`Unsupported retry stage: ${onlyStage}`);
      }

      const stageStart = Date.now();
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'coverLetter',
        stage: onlyStage,
        user_id: job.user_id,
        started_at: new Date(stageStart),
        success: true, // Placeholder
      });

      try {
        telemetry?.startStage(onlyStage);
        const result = await sectionGapsStage.execute(context);
        telemetry?.endStage(true);

        voidLogEval(supabase, {
          job_id: job.id,
          job_type: 'coverLetter',
          stage: onlyStage,
          user_id: job.user_id,
          started_at: new Date(stageStart),
          completed_at: new Date(),
          duration_ms: Date.now() - stageStart,
          success: true,
          prompt_name: 'sectionGaps',
          model: result?.model || 'gpt-4o-mini',
          prompt_tokens: result?.usage?.prompt_tokens ?? 0,
          completion_tokens: result?.usage?.completion_tokens ?? 0,
          total_tokens: result?.usage?.total_tokens ?? 0,
          result_subset: {
            pipeline_version: COVER_LETTER_PIPELINE_VERSION,
            jobDescriptionId,
            templateId,
            jd_char_len: jdFingerprint.char_len,
            jd_hash12: jdFingerprint.hash12,
            attempt: result?.meta?.attempt ?? 1,
            retry_count: result?.meta?.retry_count ?? 0,
            http_status: result?.meta?.http_status,
            finish_reason: result?.meta?.finish_reason ?? null,
            max_output_tokens: result?.meta?.max_output_tokens,
            error_code: result?.meta?.error_code ?? null,
          },
        });

        return result;
      } catch (error) {
        telemetry?.endStage(false);

        try {
          await send('progress', {
            jobId: job.id,
            stage: onlyStage,
            isPartial: false,
            stageStatus: 'failed',
            data: {
              status: 'failed',
              error: error instanceof Error ? error.message : String(error),
            },
            timestamp: new Date().toISOString(),
          });
        } catch (_) {
          // ignore
        }

        voidLogEval(supabase, {
          job_id: job.id,
          job_type: 'coverLetter',
          stage: onlyStage,
          user_id: job.user_id,
          started_at: new Date(stageStart),
          completed_at: new Date(),
          duration_ms: Date.now() - stageStart,
          success: false,
          error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
          error_message: error instanceof Error ? error.message : String(error),
          result_subset: {
            pipeline_version: COVER_LETTER_PIPELINE_VERSION,
            jobDescriptionId,
            templateId,
            http_status: (error as any)?.http_status,
            error_code: (error as any)?.error_code ?? null,
            max_output_tokens: (error as any)?.max_output_tokens,
            request_id: (error as any)?.request_id ?? null,
            response_snippet: (error as any)?.response_snippet ?? null,
          },
        });

        throw error;
      }
    }

    // =========================================================================
    // LAYER 1: JD Analysis (streaming - must complete first for SSE updates)
    // =========================================================================
    const jdAnalysisStart = Date.now();
    
    // Log stage start
    voidLogEval(supabase, {
      job_id: job.id,
      job_type: 'coverLetter',
      stage: 'jdAnalysis',
      user_id: job.user_id,
      started_at: new Date(jdAnalysisStart),
      success: true, // Placeholder (stage hasn't failed yet)
    });
    
    try {
      telemetry?.startStage('jdAnalysis');
      results.jdAnalysis = await jdAnalysisStage.execute(context);
      telemetry?.endStage(true);
      
      // Log stage completion
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'coverLetter',
        stage: 'jdAnalysis',
        user_id: job.user_id,
        started_at: new Date(jdAnalysisStart),
        completed_at: new Date(),
        duration_ms: Date.now() - jdAnalysisStart,
        success: true,
        prompt_name: results.jdAnalysis?.meta?.usedCache ? 'jdAnalysis_cached' : 'buildJdRolePrompt',
        model: 'gpt-4o-mini',
        prompt_tokens: results.jdAnalysis?.usage?.prompt_tokens ?? 0,
        completion_tokens: results.jdAnalysis?.usage?.completion_tokens ?? 0,
        total_tokens: results.jdAnalysis?.usage?.total_tokens ?? 0,
        ttfu_ms: results.jdAnalysis?.ttfu_ms ?? undefined,
        result_subset: {
          pipeline_version: COVER_LETTER_PIPELINE_VERSION,
          jobDescriptionId,
          templateId,
          jd_char_len: jdFingerprint.char_len,
          jd_hash12: jdFingerprint.hash12,
          hasRoleInsights: Boolean(results.jdAnalysis?.data?.roleInsights),
          hasRequirementSummary: Boolean(results.jdAnalysis?.data?.jdRequirementSummary),
        },
      });
      
      try { const { elog } = await import('../log.ts'); elog.info('[Pipeline] Layer 1 complete: jdAnalysis'); } catch (_) {}
    } catch (error) {
      telemetry?.endStage(false);
      
      // Log eval failure
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'coverLetter',
        stage: 'jdAnalysis',
        user_id: job.user_id,
        started_at: new Date(jdAnalysisStart),
        completed_at: new Date(),
        duration_ms: Date.now() - jdAnalysisStart,
        success: false,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : String(error),
      });
      
      console.error('[Pipeline] jdAnalysis failed:', error);
      results.jdAnalysis = { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
    if (results.jdAnalysis?.status === 'failed') {
      throw new Error(`jdAnalysis failed: ${results.jdAnalysis?.error || 'unknown error'}`);
    }

    // =========================================================================
    // LAYER 2: Parallel execution (both only need JD data, not each other)
    // - requirementAnalysis: matches requirements to user background
    // - goalsAndStrengths: MWS + company context
    // =========================================================================
    const layer2Start = Date.now();
    const layer2Heartbeat = setInterval(() => {
      try {
        send('progress', {
          jobId: job.id,
          stage: 'layer2-heartbeat',
          isPartial: true,
          data: { message: 'Analyzing requirements and goals…', ts: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
    }, 5000);
    
    const [requirementResult, goalsResult] = await Promise.allSettled([
      (async () => {
        const stageStart = Date.now();
        
        // Log stage start
        voidLogEval(supabase, {
          job_id: job.id,
          job_type: 'coverLetter',
          stage: 'requirementAnalysis',
          user_id: job.user_id,
          started_at: new Date(stageStart),
          success: true, // Placeholder
        });
        
        try {
          telemetry?.startStage('requirementAnalysis');
          const result = await requirementAnalysisStage.execute(context);
          telemetry?.endStage(true);
          
          // Log stage completion
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'requirementAnalysis',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: Date.now() - stageStart,
            success: true,
            prompt_name: 'requirementAnalysis_prompt',
            model: 'gpt-4o-mini',
            prompt_tokens: result?.usage?.prompt_tokens ?? 0,
            completion_tokens: result?.usage?.completion_tokens ?? 0,
            total_tokens: result?.usage?.total_tokens ?? 0,
            ttfu_ms: result?.ttfu_ms ?? undefined,
            result_subset: {
              pipeline_version: COVER_LETTER_PIPELINE_VERSION,
              jobDescriptionId,
              templateId,
              jd_char_len: jdFingerprint.char_len,
              jd_hash12: jdFingerprint.hash12,
              coreRequirementsCount: result?.coreRequirements?.length || 0,
              requirementsMet: result?.requirementsMet || 0,
              totalRequirements: result?.totalRequirements || 0,
              attempt: result?.meta?.attempt ?? 1,
              retry_count: result?.meta?.retry_count ?? 0,
              http_status: result?.meta?.http_status,
              finish_reason: result?.meta?.finish_reason ?? null,
              max_output_tokens: result?.meta?.max_output_tokens,
              error_code: result?.meta?.error_code ?? null,
            },
          });
          
          return result;
        } catch (error) {
          telemetry?.endStage(false);
          
          // Log eval failure
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'requirementAnalysis',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: Date.now() - stageStart,
            success: false,
            error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
            error_message: error instanceof Error ? error.message : String(error),
            result_subset: {
              pipeline_version: COVER_LETTER_PIPELINE_VERSION,
              jobDescriptionId,
              templateId,
              jd_char_len: jdFingerprint.char_len,
              jd_hash12: jdFingerprint.hash12,
              http_status: (error as any)?.http_status,
              error_code: (error as any)?.error_code ?? null,
              max_output_tokens: (error as any)?.max_output_tokens,
              request_id: (error as any)?.request_id ?? null,
              response_snippet: (error as any)?.response_snippet ?? null,
            },
          });

          // Best-effort: mark stage as failed in the job stages payload
          try {
            await send('progress', {
              jobId: job.id,
              stage: 'requirementAnalysis',
              isPartial: false,
              stageStatus: 'failed',
              data: {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
              },
              timestamp: new Date().toISOString(),
            });
          } catch (_) {
            // ignore
          }
          
          throw error;
        }
      })(),
      (async () => {
        const stageStart = Date.now();
        
        // Log stage start
        voidLogEval(supabase, {
          job_id: job.id,
          job_type: 'coverLetter',
          stage: 'goalsAndStrengths',
          user_id: job.user_id,
          started_at: new Date(stageStart),
          success: true, // Placeholder
        });
        
        try {
          telemetry?.startStage('goalsAndStrengths');
          const result = await goalsAndStrengthsStage.execute(context);
          telemetry?.endStage(true);
          
          // Log eval metrics for MWS call (Phase 1b: Token Tracking - Sub-stage)
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'goalsAndStrengths.mws',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: result?.timings?.mws_ms ?? (Date.now() - stageStart),
            success: Boolean(result?.data?.mws),
            prompt_name: 'buildMwsPrompt',
            model: 'gpt-4o-mini',
            prompt_tokens: result?.usage?.mws?.prompt_tokens ?? 0,
            completion_tokens: result?.usage?.mws?.completion_tokens ?? 0,
            total_tokens: result?.usage?.mws?.total_tokens ?? 0,
            result_subset: {
              pipeline_version: COVER_LETTER_PIPELINE_VERSION,
              jobDescriptionId,
              templateId,
              jd_char_len: jdFingerprint.char_len,
              jd_hash12: jdFingerprint.hash12,
              mwsScore: result?.data?.mws?.summaryScore,
            },
          });
          
          // Log eval metrics for Company Context call (Sub-stage)
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'goalsAndStrengths.companyContext',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: result?.timings?.company_context_ms ?? (Date.now() - stageStart),
            success: Boolean(result?.data?.companyContext),
            prompt_name: 'buildCompanyContextPrompt',
            model: 'gpt-4o-mini',
            prompt_tokens: result?.usage?.companyContext?.prompt_tokens ?? 0,
            completion_tokens: result?.usage?.companyContext?.completion_tokens ?? 0,
            total_tokens: result?.usage?.companyContext?.total_tokens ?? 0,
            result_subset: {
              pipeline_version: COVER_LETTER_PIPELINE_VERSION,
              jobDescriptionId,
              templateId,
              jd_char_len: jdFingerprint.char_len,
              jd_hash12: jdFingerprint.hash12,
              source: result?.data?.companyContext?.source,
              confidence: result?.data?.companyContext?.confidence,
              used_company_tags: result?.timings?.used_company_tags ?? false,
            },
          });
          
          // Log overall stage metrics (backward compatible)
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'goalsAndStrengths',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: Date.now() - stageStart,
            success: true,
            ttfu_ms: result?.ttfu_ms ?? undefined,
            result_subset: {
              pipeline_version: COVER_LETTER_PIPELINE_VERSION,
              jobDescriptionId,
              templateId,
              jd_char_len: jdFingerprint.char_len,
              jd_hash12: jdFingerprint.hash12,
              hasMws: Boolean(result?.data?.mws),
              mwsScore: result?.data?.mws?.summaryScore,
              hasCompanyContext: Boolean(result?.data?.companyContext),
            },
          });
          
          return result;
        } catch (error) {
          telemetry?.endStage(false);
          
          // Log eval failure
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'goalsAndStrengths',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: Date.now() - stageStart,
            success: false,
            error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
            error_message: error instanceof Error ? error.message : String(error),
            result_subset: {
              pipeline_version: COVER_LETTER_PIPELINE_VERSION,
              jobDescriptionId,
              templateId,
              jd_char_len: jdFingerprint.char_len,
              jd_hash12: jdFingerprint.hash12,
              http_status: (error as any)?.http_status,
              error_code: (error as any)?.error_code ?? null,
              max_output_tokens: (error as any)?.max_output_tokens,
              request_id: (error as any)?.request_id ?? null,
              response_snippet: (error as any)?.response_snippet ?? null,
            },
          });

          // Best-effort: mark stage as failed in the job stages payload
          try {
            await send('progress', {
              jobId: job.id,
              stage: 'goalsAndStrengths',
              isPartial: false,
              stageStatus: 'failed',
              data: {
                status: 'failed',
                error: error instanceof Error ? error.message : String(error),
              },
              timestamp: new Date().toISOString(),
            });
          } catch (_) {
            // ignore
          }
          
          throw error;
        }
      })(),
    ]);
    clearInterval(layer2Heartbeat);

    // Extract results, handling failures gracefully
    results.requirementAnalysis = requirementResult.status === 'fulfilled' 
      ? requirementResult.value 
      : { status: 'failed', error: requirementResult.reason?.message };
    results.goalsAndStrengths = goalsResult.status === 'fulfilled'
      ? goalsResult.value
      : { status: 'failed', error: goalsResult.reason?.message };

    if (results.requirementAnalysis?.status === 'failed') {
      throw new Error(`requirementAnalysis failed: ${results.requirementAnalysis?.error || 'unknown error'}`);
    }
    if (results.goalsAndStrengths?.status === 'failed') {
      throw new Error(`goalsAndStrengths failed: ${results.goalsAndStrengths?.error || 'unknown error'}`);
    }

    try { 
      const { elog } = await import('../log.ts'); 
      elog.info('[Pipeline] Layer 2 complete (parallel)', { 
        durationMs: Date.now() - layer2Start,
        requirementStatus: requirementResult.status,
        goalsStatus: goalsResult.status,
      }); 
    } catch (_) {}

    // =========================================================================
    // LAYER 3: Section Gaps (needs requirements data)
    // =========================================================================
    const sectionGapsStart = Date.now();
    
    // Log stage start
    voidLogEval(supabase, {
      job_id: job.id,
      job_type: 'coverLetter',
      stage: 'sectionGaps',
      user_id: job.user_id,
      started_at: new Date(sectionGapsStart),
      success: true, // Placeholder
    });
    
    const layer3Heartbeat = setInterval(() => {
      try {
        send('progress', {
          jobId: job.id,
          stage: 'layer3-heartbeat',
          isPartial: true,
          data: { message: 'Analyzing section gaps…', ts: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore
      }
    }, 5000);
    try {
      telemetry?.startStage('sectionGaps');
      results.sectionGaps = await sectionGapsStage.execute(context);
      telemetry?.endStage(true);
      
      // Log eval metrics
	      voidLogEval(supabase, {
	        job_id: job.id,
	        job_type: 'coverLetter',
	        stage: 'sectionGaps',
	        user_id: job.user_id,
	        started_at: new Date(sectionGapsStart),
	        completed_at: new Date(),
	        duration_ms: Date.now() - sectionGapsStart,
	        success: true,
	        prompt_name: 'sectionGaps',
	        model: results.sectionGaps?.model || 'gpt-4o-mini',
	        prompt_tokens: results.sectionGaps?.usage?.prompt_tokens ?? 0,
	        completion_tokens: results.sectionGaps?.usage?.completion_tokens ?? 0,
	        total_tokens: results.sectionGaps?.usage?.total_tokens ?? 0,
	        ttfu_ms: results.sectionGaps?.ttfu_ms ?? undefined,
	        result_subset: {
	          pipeline_version: COVER_LETTER_PIPELINE_VERSION,
	          jobDescriptionId,
	          templateId,
	          jd_char_len: jdFingerprint.char_len,
	          jd_hash12: jdFingerprint.hash12,
	          totalGaps: results.sectionGaps?.totalGaps || 0,
	          sectionCount: results.sectionGaps?.sections?.length || 0,
	          llmDuration: results.sectionGaps?.llmDuration,
	          pre_llm_ms: results.sectionGaps?.pre_llm_ms,
	          openai_duration_ms: results.sectionGaps?.openai_duration_ms,
	          attempt: results.sectionGaps?.meta?.attempt ?? 1,
	          retry_count: results.sectionGaps?.meta?.retry_count ?? 0,
	          http_status: results.sectionGaps?.meta?.http_status,
	          finish_reason: results.sectionGaps?.meta?.finish_reason ?? null,
	          max_output_tokens: results.sectionGaps?.meta?.max_output_tokens,
	          error_code: results.sectionGaps?.meta?.error_code ?? null,
	        },
	      });
      
      try { const { elog } = await import('../log.ts'); elog.info('[Pipeline] Layer 3 complete: sectionGaps'); } catch (_) {}
    } catch (error) {
      telemetry?.endStage(false);
      
      // Log eval failure
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'coverLetter',
        stage: 'sectionGaps',
        user_id: job.user_id,
        started_at: new Date(sectionGapsStart),
        completed_at: new Date(),
        duration_ms: Date.now() - sectionGapsStart,
        success: false,
        error_type: error instanceof Error ? error.constructor.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : String(error),
        result_subset: {
          pipeline_version: COVER_LETTER_PIPELINE_VERSION,
          jobDescriptionId,
          templateId,
          jd_char_len: jdFingerprint.char_len,
          jd_hash12: jdFingerprint.hash12,
          http_status: (error as any)?.http_status,
          error_code: (error as any)?.error_code ?? null,
          max_output_tokens: (error as any)?.max_output_tokens,
          request_id: (error as any)?.request_id ?? null,
          response_snippet: (error as any)?.response_snippet ?? null,
        },
      });

      // Best-effort: mark stage as failed in the job stages payload
      try {
        await send('progress', {
          jobId: job.id,
          stage: 'sectionGaps',
          isPartial: false,
          stageStatus: 'failed',
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : String(error),
          },
          timestamp: new Date().toISOString(),
        });
      } catch (_) {
        // ignore
      }
      
      console.error('[Pipeline] sectionGaps failed:', error);
      results.sectionGaps = { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    } finally {
      clearInterval(layer3Heartbeat);
    }
    if (results.sectionGaps?.status === 'failed') {
      throw new Error(`sectionGaps failed: ${results.sectionGaps?.error || 'unknown error'}`);
    }

    try { 
      const { elog } = await import('../log.ts'); 
      elog.info('[executeCoverLetterPipeline] Pipeline complete', { stages: Object.keys(results) }); 
    } catch (_) {}

    // Compile final result (REMOVED: basicMetrics - redundant with requirementAnalysis)
    const finalResult = {
      metrics: [
        {
          key: 'requirementsMet',
          label: 'Requirements Met',
          type: 'count',
          value: results.requirementAnalysis?.requirementsMet || 0,
          summary: `${results.requirementAnalysis?.requirementsMet || 0} of ${results.requirementAnalysis?.totalRequirements || 0} requirements met`,
          tooltip: 'Number of job requirements you meet',
        },
      ],
      gapCount: results.sectionGaps?.totalGaps || 0,
      // Include raw stage results for frontend to use
      requirements: results.requirementAnalysis || null,
      sectionGaps: results.sectionGaps || null,
      roleInsights: results.jdAnalysis?.data?.roleInsights || null,
      jdRequirementSummary: results.jdAnalysis?.data?.jdRequirementSummary || null,
      goalsAndStrengths: results.goalsAndStrengths || null,
      mws: results.goalsAndStrengths?.data?.mws || null,
      companyContext: results.goalsAndStrengths?.data?.companyContext || null,
    };

    // =========================================================================
    // STRUCTURAL VALIDATION: Run deterministic quality checks
    // =========================================================================
    const structuralValidation = validateCoverLetterResult(finalResult);
    const qualityScore = calculateQualityScore(structuralValidation);
    
    // Log structural validation results
    voidLogEval(supabase, {
      job_id: job.id,
      job_type: 'coverLetter',
      stage: 'structuralChecks',
      user_id: job.user_id,
      started_at: new Date(),
      completed_at: new Date(),
      duration_ms: 0, // Structural checks are near-instant
      success: structuralValidation.passed,
      quality_checks: structuralValidation,
      quality_score: qualityScore,
    });
    
    // =========================================================================
    // PHASE A AGGREGATE: Log total Phase A (analysis) duration
    // =========================================================================
    const phaseAStages = ['jdAnalysis', 'requirementAnalysis', 'goalsAndStrengths', 'sectionGaps'];
    const phaseADuration = phaseAStages.reduce((sum, stageName) => {
      const stageResult = results[stageName];
      if (stageResult?.duration_ms) {
        return sum + stageResult.duration_ms;
      }
      // Fallback: calculate from usage if available
      if (stageResult?.usage?.total_tokens) {
        // Rough estimate: 1 token ≈ 10ms processing time
        return sum + (stageResult.usage.total_tokens * 10);
      }
      return sum;
    }, 0);
    
    const phaseASuccess = phaseAStages.every(stageName => {
      const stageResult = results[stageName];
      return stageResult && stageResult.status !== 'failed';
    });
    
    voidLogEval(supabase, {
      job_id: job.id,
      job_type: 'coverLetter',
      stage: 'coverLetter.phaseA',
      user_id: job.user_id,
      started_at: new Date(Date.now() - phaseADuration), // Backdate to pipeline start
      completed_at: new Date(),
      duration_ms: phaseADuration,
      success: phaseASuccess,
      result_subset: {
        stagesCompleted: phaseAStages.filter(s => results[s] && results[s].status !== 'failed'),
        stageCount: phaseAStages.length,
        requirementsMet: results.requirementAnalysis?.requirementsMet || 0,
        totalRequirements: results.requirementAnalysis?.totalRequirements || 0,
        totalGaps: results.sectionGaps?.totalGaps || 0,
        qualityScore,
      },
    });
    
    try { 
      const { elog } = await import('../log.ts'); 
      elog.info('[Pipeline] Structural validation complete', { 
        passed: structuralValidation.passed,
        score: qualityScore,
        failedChecks: structuralValidation.checks.filter(c => !c.passed).map(c => c.name),
      }); 
    } catch (_) {}

    if (finalizeJob) {
      // Save final result to job
      await supabase
        .from('jobs')
        .update({
          status: 'complete',
          result: finalResult,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    }

    // Persist enhanced analysis to the cover_letters row
    // Prefer explicit draftId; fallback to latest draft by user + jobDescriptionId
    const persistEnhancedData = async () => {
      try {
        if (!finalizeJob) return;

        let draftId = job.input?.draftId as string | undefined;
        if (!draftId && job.input?.jobDescriptionId && job.user_id) {
          const { data: draftRow } = await supabase
            .from('cover_letters')
            .select('id')
            .eq('user_id', job.user_id)
            .eq('job_description_id', job.input.jobDescriptionId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          draftId = draftRow?.id;
        }

        if (!draftId) return;

        const { data: draftRow } = await supabase
          .from('cover_letters')
          .select('llm_feedback')
          .eq('id', draftId)
          .single();

        const llmFeedback = (draftRow?.llm_feedback as Record<string, unknown>) || {};
        const existingEnhanced = (llmFeedback.enhancedMatchData as Record<string, unknown> | null) ?? {};
        // IMPORTANT: Do not write sectionGapInsights here. Those are draft-dependent and should
        // come from draft-side gap detection. This pipeline only persists A-phase requirement details.
        const enhancedMatchData = {
          ...existingEnhanced,
          coreRequirementDetails: results.requirementAnalysis?.coreRequirements || [],
          preferredRequirementDetails: results.requirementAnalysis?.preferredRequirements || [],
        };

        await supabase
          .from('cover_letters')
          .update({
            llm_feedback: {
              ...llmFeedback,
              enhancedMatchData,
            } as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draftId);
      } catch (persistError) {
        try { const { elog } = await import('../log.ts'); elog.error('[executeCoverLetterPipeline] Failed to persist enhancedMatchData to draft', { error: persistError }); } catch (_) {}
      }
    };
    if (finalizeJob) {
      await persistEnhancedData();
    }

    // Mark telemetry as complete
    telemetry.complete(true);

    return finalResult;
  } catch (error) {
    // Mark telemetry as failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    telemetry.complete(false, errorMessage);
    throw error;
  }
}
