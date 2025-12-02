import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  callReadinessJudge,
  loadDraftReadinessContext,
  ReadinessContextError,
  DRAFT_READINESS_MIN_WORDS,
  convertToLegacyFormat,
  type DraftReadinessResult,
  type LegacyReadinessResult,
  type DraftReadinessContext,
  type ReadinessCompanyContext,
  type ReadinessRoleContext,
  type UnifiedLabel,
} from '../_shared/readiness.ts';
import { ZodError } from 'https://esm.sh/zod@3.23.8';
import { elog } from '../_shared/log.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_TTL_MINUTES = 10;

// Legacy types for DB storage and API response
type LegacyRating = LegacyReadinessResult['rating'];
type LegacyStrength = LegacyReadinessResult['scoreBreakdown'][keyof LegacyReadinessResult['scoreBreakdown']];

interface DraftQualityEvaluationRow {
  draft_id: string;
  rating: LegacyRating;
  score_breakdown: LegacyReadinessResult['scoreBreakdown'];
  feedback_summary: string | null;
  improvements: string[] | null;
  evaluated_at: string;
  ttl_expires_at: string;
  metadata?: Record<string, unknown> | null;
}

interface ReadinessResponse {
  rating: LegacyRating;
  scoreBreakdown: LegacyReadinessResult['scoreBreakdown'];
  feedback: LegacyReadinessResult['feedback'];
  evaluatedAt: string;
  ttlExpiresAt: string;
  fromCache: boolean;
}

interface EvaluateDraftReadinessDeps {
  getEnv: (key: string) => string | undefined;
  now: () => Date;
  loadContext: (args: { supabase: SupabaseClient; draftId: string }) => Promise<DraftReadinessContext>;
  fetchEvaluation: (args: { supabase: SupabaseClient; draftId: string }) => Promise<DraftQualityEvaluationRow | null>;
  upsertEvaluation: (args: {
    supabase: SupabaseClient;
    draftId: string;
    payload: LegacyReadinessResult;
    evaluatedAt: string;
    ttlExpiresAt: string;
    metadata: Record<string, unknown>;
  }) => Promise<void>;
  callJudge: (args: {
    apiKey: string;
    draftText: string;
    wordCount: number;
    companyContext: ReadinessCompanyContext;
    roleContext: ReadinessRoleContext;
  }) => Promise<DraftReadinessResult>;
}

const defaultDeps: EvaluateDraftReadinessDeps = {
  getEnv: (key) => Deno.env.get(key),
  now: () => new Date(),
  loadContext: ({ supabase, draftId }) => loadDraftReadinessContext(supabase, draftId),
  fetchEvaluation: ({ supabase, draftId }) => fetchEvaluationRow(supabase, draftId),
  upsertEvaluation: (args) => upsertEvaluationRow(args),
  callJudge: (args) => callReadinessJudge(args),
};

export function createEvaluateDraftReadinessHandler(
  overrides: Partial<EvaluateDraftReadinessDeps> = {},
) {
  const deps = { ...defaultDeps, ...overrides };

  return async (req: Request): Promise<Response> => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (deps.getEnv('ENABLE_DRAFT_READINESS') !== 'true') {
        // Feature disabled — emit telemetry and exit
        try {
          elog.info('readiness_eval_disabled', {});
        } catch {
          /* no-op */
        }
        return json({ error: 'FEATURE_DISABLED' }, 403);
      }

      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return json({ error: 'Missing authorization header' }, 401);
      }
      const supabaseUrl = deps.getEnv('SUPABASE_URL');
      const serviceKey = deps.getEnv('SUPABASE_SERVICE_ROLE_KEY');
      const openAiApiKey = deps.getEnv('OPENAI_API_KEY');

      if (!supabaseUrl || !serviceKey) {
        return json({ error: 'Supabase environment not configured' }, 500);
      }
      if (!openAiApiKey) {
        return json({ error: 'OPENAI_API_KEY not configured' }, 500);
      }

      const supabaseAuth = createClient(supabaseUrl, serviceKey);
      const token = authHeader.replace('Bearer ', '');
      const {
        data: { user },
        error: authError,
      } = await supabaseAuth.auth.getUser(token);

      if (authError || !user) {
        return json({ error: 'Invalid auth token' }, 401);
      }

      const body = await req.json().catch(() => null);
      const draftId = body?.draftId;
      if (!draftId || typeof draftId !== 'string') {
        return json({ error: 'draftId is required' }, 400);
      }

      const supabase = createClient(supabaseUrl, serviceKey);
      const result = await evaluateDraftReadinessCore(
        {
          draftId,
          userId: user.id,
          supabase,
          openAiApiKey,
          ttlMinutes: DEFAULT_TTL_MINUTES,
        },
        deps,
      );

      return json(result, 200);
    } catch (error) {
      if (error instanceof ReadinessContextError) {
        return json({ error: error.message }, error.status);
      }
      if (error instanceof ZodError) {
        try {
          elog.error('readiness_eval_failed', {
            code: 'SCHEMA_VALIDATION_FAILED',
            message: error.message,
          });
        } catch {
          /* no-op */
        }
        elog.error('[evaluate-draft-readiness] Schema validation failed:', error.flatten());
        return json({ error: 'SCHEMA_VALIDATION_FAILED' }, 500);
      }
      try {
        const message =
          (error && typeof error === 'object' && 'message' in error && (error as any).message) ||
          String(error);
        elog.error('readiness_eval_failed', {
          code: 'INTERNAL',
          message,
        });
      } catch {
        /* no-op */
      }
      elog.error('[evaluate-draft-readiness] Unexpected error:', error);
      return json({ error: 'Internal server error' }, 500);
    }
  };
}

export async function evaluateDraftReadinessCore(
  params: {
    draftId: string;
    userId: string;
    supabase: SupabaseClient;
    openAiApiKey: string;
    ttlMinutes?: number;
  },
  deps: EvaluateDraftReadinessDeps,
): Promise<ReadinessResponse> {
  const ttlMinutes = params.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const context = await deps.loadContext({ supabase: params.supabase, draftId: params.draftId });

  if (context.userId !== params.userId) {
    throw new ReadinessContextError('Forbidden', 403);
  }

  const now = deps.now();
  const cached = await deps.fetchEvaluation({ supabase: params.supabase, draftId: params.draftId });
  try {
    elog.info('readiness_eval_started', {
      draftId: params.draftId,
      userId: params.userId,
      hasCache: Boolean(cached),
    });
  } catch {
    /* no-op */
  }
  if (cached && cached.ttl_expires_at && new Date(cached.ttl_expires_at) > now) {
    try {
      elog.info('readiness_eval_cached', {
        draftId: params.draftId,
        userId: params.userId,
        evaluatedAt: cached.evaluated_at,
        ttlExpiresAt: cached.ttl_expires_at,
      });
    } catch {
      /* no-op */
    }
    return buildResponseFromRow(cached, true);
  }

  if (context.wordCount < DRAFT_READINESS_MIN_WORDS) {
    const evaluatedAt = deps.now().toISOString();
    const ttlExpiresAt = addMinutes(new Date(evaluatedAt), ttlMinutes).toISOString();
    const legacyPayload = createShortDraftPayload(context.wordCount);
    await deps.upsertEvaluation({
      supabase: params.supabase,
      draftId: params.draftId,
      payload: legacyPayload,
      evaluatedAt,
      ttlExpiresAt,
      metadata: {
        model: 'guardrail',
        reason: 'MIN_WORD_COUNT',
        wordCount: context.wordCount,
        verdict: 'Needs Work',
      },
    });

    try {
      elog.info('readiness_eval_short_draft', {
        draftId: params.draftId,
        userId: params.userId,
        wordCount: context.wordCount,
        verdict: 'Needs Work',
      });
    } catch {
      /* no-op */
    }
    return buildResponseFromPayload(legacyPayload, evaluatedAt, ttlExpiresAt, false);
  }

  elog.info('[evaluate-draft-readiness] Evaluating draft via LLM', { draftId: params.draftId });
  const llmStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
  
  // Call judge - LLM determines verdict holistically (no weighted median)
  const result = await deps.callJudge({
    apiKey: params.openAiApiKey,
    draftText: context.promptDraft,
    wordCount: context.wordCount,
    companyContext: context.companyContext,
    roleContext: context.roleContext,
  });
  const llmEnd = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const latencyMs = Math.max(0, Math.round(llmEnd - llmStart));

  // Convert to legacy format for DB storage and API response
  const legacyPayload = convertToLegacyFormat(result);

  const evaluatedAt = deps.now().toISOString();
  const ttlExpiresAt = addMinutes(new Date(evaluatedAt), ttlMinutes).toISOString();

  await deps.upsertEvaluation({
    supabase: params.supabase,
    draftId: params.draftId,
    payload: legacyPayload,
    evaluatedAt,
    ttlExpiresAt,
    metadata: {
      model: 'gpt-4o-mini',
      latencyMs,
      wordCount: context.wordCount,
      verdict: result.verdict,
      dimensions: result.dimensions,
    },
  });

  try {
    elog.info('readiness_eval_completed', {
      draftId: params.draftId,
      userId: params.userId,
      verdict: result.verdict,
      rating: legacyPayload.rating,
      latencyMs,
      evaluatedAt,
      ttlExpiresAt,
    });
    // Distribution/diagnostics
    const counts = dimensionHistogram(result.dimensions);
    elog.info('readiness_eval_scored', {
      verdict: result.verdict,
      rating: legacyPayload.rating,
      dimensions: counts,
    });
  } catch {
    /* no-op */
  }
  return buildResponseFromPayload(legacyPayload, evaluatedAt, ttlExpiresAt, false);
}

function createShortDraftPayload(wordCount: number): LegacyReadinessResult {
  return {
    rating: 'weak',
    scoreBreakdown: constantBreakdown('insufficient'),
    feedback: {
      summary: 'Draft too short for full evaluation (150 words required).',
      improvements: [`Add more content so we can provide a fair evaluation (minimum 150 words, current: ${wordCount}).`],
    },
  };
}

async function fetchEvaluationRow(
  supabase: SupabaseClient,
  draftId: string,
): Promise<DraftQualityEvaluationRow | null> {
  const { data, error } = await supabase
    .from('draft_quality_evaluations')
    .select('*')
    .eq('draft_id', draftId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to load readiness evaluation: ${error.message}`);
  }

  return data ?? null;
}

async function upsertEvaluationRow(args: {
  supabase: SupabaseClient;
  draftId: string;
  payload: LegacyReadinessResult;
  evaluatedAt: string;
  ttlExpiresAt: string;
  metadata: Record<string, unknown>;
}) {
  const { supabase, draftId, payload, evaluatedAt, ttlExpiresAt, metadata } = args;
  const { error } = await supabase
    .from('draft_quality_evaluations')
    .upsert({
      draft_id: draftId,
      rating: payload.rating,
      score_breakdown: payload.scoreBreakdown,
      feedback_summary: payload.feedback.summary,
      improvements: payload.feedback.improvements,
      evaluated_at: evaluatedAt,
      ttl_expires_at: ttlExpiresAt,
      metadata,
    })
    .eq('draft_id', draftId);

  if (error) {
    throw new Error(`Failed to upsert readiness evaluation: ${error.message}`);
  }
}

function buildResponseFromRow(row: DraftQualityEvaluationRow, fromCache: boolean): ReadinessResponse {
  return {
    rating: row.rating,
    scoreBreakdown: row.score_breakdown,
    feedback: {
      summary: row.feedback_summary ?? 'Readiness evaluation unavailable.',
      improvements: Array.isArray(row.improvements)
        ? row.improvements.filter((item): item is string => typeof item === 'string')
        : [],
    },
    evaluatedAt: row.evaluated_at,
    ttlExpiresAt: row.ttl_expires_at,
    fromCache,
  };
}

function buildResponseFromPayload(
  payload: LegacyReadinessResult,
  evaluatedAt: string,
  ttlExpiresAt: string,
  fromCache: boolean,
): ReadinessResponse {
  return {
    rating: payload.rating,
    scoreBreakdown: payload.scoreBreakdown,
    feedback: payload.feedback,
    evaluatedAt,
    ttlExpiresAt,
    fromCache,
  };
}

function constantBreakdown(value: LegacyStrength): LegacyReadinessResult['scoreBreakdown'] {
  return {
    clarityStructure: value,
    opening: value,
    companyAlignment: value,
    roleAlignment: value,
    specificExamples: value,
    quantifiedImpact: value,
    personalization: value,
    writingQuality: value,
    lengthEfficiency: value,
    executiveMaturity: value,
  };
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Dimension histogram for telemetry (8 dimensions)
function dimensionHistogram(
  dimensions: DraftReadinessResult['dimensions'],
): Record<UnifiedLabel, number> {
  const counts: Record<UnifiedLabel, number> = {
    'Exceptional': 0,
    'Strong': 0,
    'Adequate': 0,
    'Needs Work': 0,
  };
  Object.values(dimensions).forEach((v) => {
    counts[v as UnifiedLabel] = (counts[v as UnifiedLabel] ?? 0) + 1;
  });
  return counts;
}

const handler = createEvaluateDraftReadinessHandler();
if (import.meta.main) {
  serve(handler);
}
