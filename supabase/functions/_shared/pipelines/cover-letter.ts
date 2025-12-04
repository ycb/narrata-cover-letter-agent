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

    const emitPartial = async (partial: Partial<JdAnalysisStageData>) => {
      try {
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
          
          // Emit the cached data
          await emitPartial({ jdRequirementSummary: stageData.jdRequirementSummary });
          await emitPartial({ roleInsights: stageData.roleInsights });
          
          // Return early with cached data
          return { status: 'complete', data: stageData };
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
        const roleResult = await streamJsonFromLLM<RawRoleInsights>({
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

    return {
      status: stageStatus,
      isPartial: false,
      data: finalData,
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
    const { job, supabase, openaiApiKey } = ctx;
    const { jobDescriptionId } = job.input;

    // Fetch data
    const jd = await fetchJobDescription(supabase, jobDescriptionId);
    const workHistory = await fetchWorkHistory(supabase, job.user_id);
    const stories = await fetchStories(supabase, job.user_id);

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

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      maxTokens: 2500,
    });

    const result = parseJSONResponse(response.choices[0].message.content);

    return {
      coreRequirements: result.coreRequirements || [],
      preferredRequirements: result.preferredRequirements || [],
      requirementsMet: result.requirementsMet || 0,
      totalRequirements: result.totalRequirements || 0,
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

    const emitPartial = async () => {
      try {
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
        const mwsPrompt = buildMwsPrompt(pmProfile, jdSignals, truncatedJd);
        const mwsResult = await streamJsonFromLLM<RawMwsSummary>({
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

      // --- COMPANY CONTEXT (JD FIRST) --------------------------------------
      let jdContext: CompanyContext | null = null;
      try {
        const contextPrompt = buildCompanyContextPrompt(companyName, jdSignals, truncatedJd);
        const jdContextRaw = await streamJsonFromLLM<RawCompanyContext>({
          apiKey: openaiApiKey,
          prompt: contextPrompt,
          schema: COMPANY_CONTEXT_SCHEMA,
          temperature: 0.2,
          maxTokens: 500,
        });
        const sanitizedContext = sanitizeCompanyContext(jdContextRaw, 'jd');
        if (sanitizedContext) {
          sanitizedContext.confidence =
            sanitizedContext.confidence ??
            computeCompanyContextConfidence(sanitizedContext, sanitizedContext.source ?? 'jd');
          jdContext = sanitizedContext;
          stageData.companyContext = sanitizedContext;
          await emitPartial();
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
        try {
          const webContext = await companyTagsClient.fetchCompanyContext({ companyName });
          if (webContext) {
            const merged = mergeCompanyContexts(stageData.companyContext, webContext);
            if (merged) {
              stageData.companyContext = merged;
              await emitPartial();
              await logStreamInfo('[STREAM] goalsAndStrengths companyContext merged', {
                jobId: job.id,
                source: merged.source,
                confidence: merged.confidence,
              });
            }
          }
        } catch (error) {
          await logStreamInfo('[STREAM] goalsAndStrengths.companyContext fallback failed', {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      stageStatus = 'complete';
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

    try {
      await send('progress', {
        jobId: job.id,
        stage: 'goalsAndStrengths',
        isPartial: false,
        data:
          stageStatus === 'failed'
            ? {}
            : {
                ...(stageData.mws ? { mws: stageData.mws } : {}),
                ...(stageData.companyContext ? { companyContext: stageData.companyContext } : {}),
              },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('[goalsAndStrengthsStage] Failed to emit final progress', error);
    }

    return {
      status: stageStatus,
      isPartial: false,
      data: stageStatus === 'failed' ? {} : stageData,
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
    const { job, supabase, openaiApiKey } = ctx;
    const { jobDescriptionId, templateId } = job.input;

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

    const response = await callOpenAI({
      apiKey: openaiApiKey,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      maxTokens: 3500,
    });

    const result = parseJSONResponse(response.choices[0].message.content);
    
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

    return {
      sections: validatedSections,
      totalGaps: validatedSections.reduce((sum: number, s: any) => 
        sum + (s.requirementGaps?.length || 0), 0
      ),
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

export async function executeCoverLetterPipeline(
  job: any,
  supabase: any,
  send: (event: string, data: any) => void
) {
  // Initialize telemetry
  const telemetry = new PipelineTelemetry(job.id, job.type);

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

    // =========================================================================
    // LAYER 1: JD Analysis (streaming - must complete first for SSE updates)
    // =========================================================================
    const jdAnalysisStart = Date.now();
    try {
      telemetry?.startStage('jdAnalysis');
      results.jdAnalysis = await jdAnalysisStage.execute(context);
      telemetry?.endStage(true);
      
      // Log eval metrics
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'coverLetter',
        stage: 'jdAnalysis',
        user_id: job.user_id,
        started_at: new Date(jdAnalysisStart),
        completed_at: new Date(),
        duration_ms: Date.now() - jdAnalysisStart,
        success: true,
        result_subset: {
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

    // =========================================================================
    // LAYER 2: Parallel execution (both only need JD data, not each other)
    // - requirementAnalysis: matches requirements to user background
    // - goalsAndStrengths: MWS + company context
    // =========================================================================
    const layer2Start = Date.now();
    
    const [requirementResult, goalsResult] = await Promise.allSettled([
      (async () => {
        const stageStart = Date.now();
        try {
          telemetry?.startStage('requirementAnalysis');
          const result = await requirementAnalysisStage.execute(context);
          telemetry?.endStage(true);
          
          // Log eval metrics
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'requirementAnalysis',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: Date.now() - stageStart,
            success: true,
            result_subset: {
              coreRequirementsCount: result?.coreRequirements?.length || 0,
              requirementsMet: result?.requirementsMet || 0,
              totalRequirements: result?.totalRequirements || 0,
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
          });
          
          throw error;
        }
      })(),
      (async () => {
        const stageStart = Date.now();
        try {
          telemetry?.startStage('goalsAndStrengths');
          const result = await goalsAndStrengthsStage.execute(context);
          telemetry?.endStage(true);
          
          // Log eval metrics
          voidLogEval(supabase, {
            job_id: job.id,
            job_type: 'coverLetter',
            stage: 'goalsAndStrengths',
            user_id: job.user_id,
            started_at: new Date(stageStart),
            completed_at: new Date(),
            duration_ms: Date.now() - stageStart,
            success: true,
            result_subset: {
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
          });
          
          throw error;
        }
      })(),
    ]);

    // Extract results, handling failures gracefully
    results.requirementAnalysis = requirementResult.status === 'fulfilled' 
      ? requirementResult.value 
      : { status: 'failed', error: requirementResult.reason?.message };
    results.goalsAndStrengths = goalsResult.status === 'fulfilled'
      ? goalsResult.value
      : { status: 'failed', error: goalsResult.reason?.message };

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
        result_subset: {
          totalGaps: results.sectionGaps?.totalGaps || 0,
          sectionCount: results.sectionGaps?.sections?.length || 0,
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
      });
      
      console.error('[Pipeline] sectionGaps failed:', error);
      results.sectionGaps = { status: 'failed', error: error instanceof Error ? error.message : String(error) };
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
      stage: 'structural_checks',
      user_id: job.user_id,
      started_at: new Date(),
      completed_at: new Date(),
      duration_ms: 0, // Structural checks are near-instant
      success: structuralValidation.passed,
      quality_checks: structuralValidation,
      quality_score: qualityScore,
    });
    
    try { 
      const { elog } = await import('../log.ts'); 
      elog.info('[Pipeline] Structural validation complete', { 
        passed: structuralValidation.passed,
        score: qualityScore,
        failedChecks: structuralValidation.checks.filter(c => !c.passed).map(c => c.name),
      }); 
    } catch (_) {}

    // Save final result to job
    await supabase
      .from('jobs')
      .update({
        status: 'complete',
        result: finalResult,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

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

