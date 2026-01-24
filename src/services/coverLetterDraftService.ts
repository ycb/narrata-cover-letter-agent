import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { OPENAI_CONFIG } from '@/lib/config/fileUpload';
import { supabase } from '@/lib/supabase';
import { EvalsLogger } from './evalsLogger';
import type { Database, Json } from '@/types/supabase';
import type {
  CoverLetterAnalytics,
  CoverLetterDraft,
  CoverLetterDraftSection,
  CoverLetterMatchMetric,
  DifferentiatorInsight,
  DraftGenerationOptions,
  DraftGenerationPhase,
  DraftGenerationProgressUpdate,
  DraftGenerationResult,
  DraftWorkpad,
  EnhancedMatchData,
  MatchStrength,
  ParsedJobDescription,
  RequirementCategory,
  RequirementInsight,
  StorySelectionDiagnostics,
} from '@/types/coverLetters';
import type { CoverLetterSection } from '@/types/workHistory';
import { UserPreferencesService } from './userPreferencesService';
import { JobDescriptionService } from './jobDescriptionService';
import { HeuristicGapService } from './heuristicGapService';
import { CoverLetterTemplateService } from './coverLetterTemplateService';
import { ENHANCED_METRICS_SYSTEM_PROMPT, SECTION_GUIDANCE, buildEnhancedMetricsUserPrompt } from '@/prompts/enhancedMetricsAnalysis';
import { BASIC_METRICS_SYSTEM_PROMPT, buildBasicMetricsUserPrompt } from '@/prompts/basicMetrics';
import { REQUIREMENT_ANALYSIS_SYSTEM_PROMPT, buildRequirementAnalysisUserPrompt } from '@/prompts/requirementAnalysis';
import { SECTION_GAPS_SYSTEM_PROMPT, buildSectionGapsUserPrompt } from '@/prompts/sectionGaps';
import { ContentStandardsEvaluationService } from './contentStandardsEvaluationService';
import { aggregateContentStandards, extractSectionsMeta, mapDraftSectionType } from './contentStandardsService';
import type { ContentStandardsAnalysis, SectionStandardResult, LetterStandardResult } from '@/types/coverLetters';
import type { DraftReadinessEvaluation } from '@/types/coverLetters';
import { isDraftReadinessEnabled } from '@/lib/flags';
import { parseLlmSlotTokens, replaceAllLiteral, replaceSlotTokenWithPunctuation } from '@/lib/coverLetterSlots';
import type {
  DraftCoverLetterEvalEvent,
  PhaseACompleteness,
  PhaseBCompleteness,
  ToolbarValidation,
  EvalStatus,
} from '@/types/evaluationEvents';

export class DraftReadinessFeatureDisabledError extends Error {
  readonly statusCode = 503;

  constructor(message = 'Draft readiness disabled') {
    super(message);
    this.name = 'DraftReadinessFeatureDisabledError';
  }
}

const isFeatureDisabledFunctionsError = (error: unknown): boolean => {
  if (!error) return false;

  if (typeof error === 'string') {
    return error.includes('FEATURE_DISABLED');
  }

  if (typeof error === 'object') {
    const err = error as Record<string, any>;
    const message =
      typeof err.message === 'string'
        ? err.message
        : typeof err.error === 'string'
        ? err.error
        : '';
    const details = typeof err.details === 'string' ? err.details : '';
    const contextError =
      typeof err.context === 'object' && err.context !== null
        ? err.context.response?.error ?? err.context.body?.error ?? ''
        : '';
    const status =
      (typeof err.context === 'object' && err.context !== null ? err.context.status : undefined) ??
      (typeof err.status === 'number' ? err.status : undefined);

    return (
      message.includes('FEATURE_DISABLED') ||
      details.includes('FEATURE_DISABLED') ||
      contextError === 'FEATURE_DISABLED' ||
      (status === 403 && (message.includes('FEATURE_DISABLED') || contextError === 'FEATURE_DISABLED'))
    );
  }

  return false;
};

type SupabaseClient = typeof supabase;

type MetricsStreamer = (input: {
  draft: CoverLetterDraftSection[];
  jobDescription: ParsedJobDescription;
  userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>> | null;
  workHistory?: Array<{
    id: string;
    company: string;
    title: string;
    description: string;
    achievements: string[];
  }>;
  approvedContent?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}) => Promise<{
  metrics: CoverLetterMatchMetric[];
  atsScore: number;
  enhancedMatchData?: EnhancedMatchData; // Agent C: detailed analysis
  raw: Record<string, unknown>;
}>;

export interface CoverLetterDraftServiceOptions {
  supabaseClient?: SupabaseClient;
  jobDescriptionService?: JobDescriptionService;
  metricsStreamer?: MetricsStreamer;
  now?: () => Date;
}

interface TemplateRow
  extends Database['public']['Tables']['cover_letter_templates']['Row'] {}
interface CoverLetterRow extends Database['public']['Tables']['cover_letters']['Row'] {}
interface SavedSectionRow extends Database['public']['Tables']['saved_sections']['Row'] {}
interface StoryRow extends Database['public']['Tables']['stories']['Row'] {}
interface WorkpadRow
  extends Database['public']['Tables']['cover_letter_workpads']['Row'] {}

const MATCH_PHASES: DraftGenerationPhase[] = [
  'jd_parse',
  'content_match',
  'metrics',
  'gap_detection',
];

const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [750, 1500];

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const createDefaultMetricsStreamer = (): MetricsStreamer => {
  const apiKey =
    (import.meta.env?.VITE_OPENAI_API_KEY) ||
    (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_API_KEY or OPENAI_API_KEY.');
  }

  const client = createOpenAI({ apiKey });

  return async ({ draft, jobDescription, userGoals, workHistory, approvedContent, signal, onToken }) => {
    const letterText = draft
      .sort((a, b) => a.order - b.order)
      .map(section => section.content.trim())
      .filter(Boolean)
      .join('\n\n');

    const payload = {
      draft: letterText,
      sections: draft.map(section => ({
        id: section.id, // Unique section ID for multi-section types
        slug: section.slug,
        title: section.title,
        content: section.content,
        requirementsMatched: section.metadata?.requirementsMatched ?? [],
        sectionType: section.slug,
      })),
      jobDescription: {
        company: jobDescription.company,
        role: jobDescription.role,
        summary: jobDescription.summary,
        standardRequirements: jobDescription.standardRequirements,
        preferredRequirements: jobDescription.preferredRequirements,
        differentiatorRequirements: jobDescription.differentiatorRequirements,
        differentiatorSignals: jobDescription.differentiatorSignals,
      },
      userGoals,
      workHistory,
      approvedContent,
      sectionGuidance: SECTION_GUIDANCE,
    };

    // Calculate optimal tokens based on draft content and complexity
    const contentForAnalysis = JSON.stringify(payload);
    const contentTokens = Math.ceil(contentForAnalysis.length / 3.5);
    const structureOverhead = 1200; // Large JSON output with nested arrays
    const complexityMultiplier = 1.2; // Metrics analysis is moderately complex
    const baseOutputTokens = Math.ceil(contentTokens * complexityMultiplier * 0.5); // 50% of input
    const optimalTokens = Math.max(1500, Math.min(Math.ceil((baseOutputTokens + structureOverhead) * 1.5), 4000));
    
    console.warn(`📊 Metrics token calculation: ${contentForAnalysis.length} chars → ${contentTokens} input tokens → ${optimalTokens} max output tokens`);

    const result: any = await streamText({
      model: client.chat(OPENAI_CONFIG.MODEL),
      system: ENHANCED_METRICS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildEnhancedMetricsUserPrompt(payload),
        },
      ],
      temperature: 0.1,
      maxTokens: optimalTokens,
      signal,
    } as any);

    let rawOutput = '';
    if (result?.textStream) {
      for await (const chunk of result.textStream as AsyncIterable<unknown>) {
        const token =
          typeof chunk === 'string'
            ? chunk
            : typeof chunk === 'object' && chunk !== null && 'text' in chunk
            ? // @ts-expect-error runtime inspection
              chunk.text
            : typeof chunk === 'object' && chunk !== null && 'value' in chunk
            ? // @ts-expect-error runtime inspection
              chunk.value
            : '';
        if (!token) continue;
        rawOutput += token;
        onToken?.(token);
      }
    }

    if (!rawOutput && typeof result?.text === 'string') {
      rawOutput = result.text;
    }

    if (!rawOutput || !rawOutput.trim()) {
      throw new Error('Metrics analysis returned empty response.');
    }

    const cleaned = rawOutput
      .trim()
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      metrics: Record<string, any>;
      enhancedMatchData?: EnhancedMatchData;
    };

    const metrics = transformMetricPayload(parsed.metrics);
    const atsMetric = metrics.find(metric => metric.key === 'ats') as
      | Extract<CoverLetterMatchMetric, { key: 'ats' }>
      | undefined;

    return {
      metrics,
      atsScore:
        atsMetric && atsMetric.type === 'score'
          ? Math.round(atsMetric.value)
          : atsMetric && atsMetric.type === 'strength'
          ? strengthToScore(atsMetric.strength)
          : 0,
      enhancedMatchData: parsed.enhancedMatchData, // Agent C: pass through enhanced data
      raw: parsed.metrics,
    };
  };
};

const strengthToScore = (strength: MatchStrength): number => {
  switch (strength) {
    case 'strong':
      return 90;
    case 'average':
      return 70;
    case 'weak':
      return 45;
    default:
      return 0;
  }
};

const deriveAtsScore = (metrics: CoverLetterMatchMetric[]): number => {
  const atsMetric = metrics.find(metric => metric.key === 'ats');
  if (!atsMetric) return 0;
  if (atsMetric.type === 'score') return Math.round(atsMetric.value);
  if (atsMetric.type === 'strength') {
    return strengthToScore(atsMetric.strength);
  }
  return 0;
};

const transformMetricPayload = (metrics: Record<string, any>): CoverLetterMatchMetric[] => {
  const lookup: Array<{ key: CoverLetterMatchMetric['key']; label: string }> = [
    { key: 'goals', label: 'Match with Goals' },
    { key: 'experience', label: 'Match with Experience' },
    { key: 'rating', label: 'Cover Letter Rating' },
    { key: 'ats', label: 'ATS Score' },
    { key: 'coreRequirements', label: 'Core Requirements' },
    { key: 'preferredRequirements', label: 'Preferred Requirements' },
  ];

  return lookup
    .map(({ key, label }) => {
      const payload = metrics?.[key];
      if (!payload || typeof payload !== 'object') return null;

      const base = {
        key,
        label,
        tooltip: typeof payload.tooltip === 'string' ? payload.tooltip : '',
        differentiatorHighlights: Array.isArray(payload.differentiatorHighlights)
          ? payload.differentiatorHighlights.filter(
              (item: unknown): item is string => typeof item === 'string' && item.trim().length > 0,
            )
          : [],
      };

      if (key === 'rating' || key === 'ats') {
        const score =
          typeof payload.score === 'number'
            ? Math.max(0, Math.min(100, payload.score))
            : typeof payload.percentage === 'number'
            ? Math.max(0, Math.min(100, payload.percentage))
            : 0;

        return {
          ...base,
          type: 'score',
          value: score,
          summary: typeof payload.summary === 'string' ? payload.summary : '',
        } satisfies CoverLetterMatchMetric;
      }

      if (key === 'coreRequirements' || key === 'preferredRequirements') {
        const met = typeof payload.met === 'number' ? payload.met : 0;
        const total = typeof payload.total === 'number' ? payload.total : 0;
        return {
          ...base,
          type: 'requirement',
          met,
          total,
          summary: typeof payload.summary === 'string' ? payload.summary : '',
        } satisfies CoverLetterMatchMetric;
      }

      const strength: MatchStrength =
        payload.strength === 'strong' || payload.strength === 'average' || payload.strength === 'weak'
          ? payload.strength
          : 'average';

      return {
        ...base,
        type: 'strength',
        strength,
        summary: typeof payload.summary === 'string' ? payload.summary : '',
      } satisfies CoverLetterMatchMetric;
    })
    .filter((metric): metric is CoverLetterMatchMetric => Boolean(metric));
};

const normaliseArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const slugify = (value: string, fallback: string): string => {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return base || fallback;
};

const createRequirementId = (): string => {
  const globalCrypto: Crypto | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;

  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }

  return `req_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

const coerceRequirementArrayFromRow = (
  value: unknown,
  category: RequirementCategory,
): RequirementInsight[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map(item => {
      const label =
        typeof item?.label === 'string'
          ? item.label.trim()
          : typeof item?.title === 'string'
          ? item.title.trim()
          : typeof item?.name === 'string'
          ? item.name.trim()
          : '';

      if (!label) return null;

      const detail =
        typeof item?.detail === 'string'
          ? item.detail.trim()
          : typeof item?.description === 'string'
          ? item.description.trim()
          : undefined;

      const priorityRaw =
        typeof item?.priority === 'string'
          ? item.priority
          : category === 'preferred'
          ? 'medium'
          : 'high';

      const priority =
        priorityRaw === 'high' || priorityRaw === 'medium' || priorityRaw === 'low'
          ? priorityRaw
          : category === 'preferred'
          ? 'medium'
          : 'high';

      const keywords = Array.isArray(item?.keywords)
        ? item.keywords.filter((kw: unknown): kw is string => typeof kw === 'string' && kw.trim().length > 0)
        : [];

      const reasoning =
        typeof item?.reasoning === 'string'
          ? item.reasoning.trim()
          : typeof item?.rationale === 'string'
          ? item.rationale.trim()
          : undefined;

      return {
        id:
          typeof item?.id === 'string' && item.id.trim().length > 0
            ? item.id
            : createRequirementId(),
        label,
        detail,
        category,
        priority,
        keywords,
        reasoning,
      } satisfies RequirementInsight;
    })
    .filter((req): req is RequirementInsight => Boolean(req));
};

// ============================================================================
// PERFORMANCE: Session-level cache for user context data
// Reduces redundant DB fetches during cover letter generation
// TTL: 5 minutes (balances freshness vs performance)
// ============================================================================
const USER_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CachedUserContext<T> {
  data: T;
  fetchedAt: number;
  userId: string;
}

const userContextCache = {
  stories: null as CachedUserContext<StoryRow[]> | null,
  storyVariations: null as CachedUserContext<any[]> | null,
  savedSections: null as CachedUserContext<SavedSectionRow[]> | null,
  workHistory: null as CachedUserContext<any[]> | null,
  approvedContent: null as CachedUserContext<any[]> | null,
};

function isCacheValid<T>(cache: CachedUserContext<T> | null, userId: string): cache is CachedUserContext<T> {
  if (!cache) return false;
  if (cache.userId !== userId) return false;
  return Date.now() - cache.fetchedAt < USER_CONTEXT_CACHE_TTL_MS;
}

export class CoverLetterDraftService {
  private readonly supabaseClient: SupabaseClient;
  private readonly jobDescriptionService: JobDescriptionService;
  private readonly heuristicGapService: HeuristicGapService;
  private readonly metricsStreamer: MetricsStreamer;
  private readonly now: () => Date;

  constructor(options: CoverLetterDraftServiceOptions = {}) {
    this.supabaseClient = options.supabaseClient ?? supabase;
    this.jobDescriptionService = options.jobDescriptionService ?? new JobDescriptionService();
    this.heuristicGapService = new HeuristicGapService();
    this.metricsStreamer = options.metricsStreamer ?? createDefaultMetricsStreamer();
    this.now = options.now ?? (() => new Date());
  }

  private async assertUserNotFlagged(userId: string): Promise<void> {
    const { data, error } = await this.supabaseClient
      .from('profiles')
      .select('is_flagged')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[CoverLetterDraftService] Failed to check flag status:', error);
      return;
    }

    if (data?.is_flagged) {
      throw new Error('Account is under review. Please contact support to continue.');
    }
  }

  /**
   * PERF: Invalidate user context cache (call after user edits stories/sections)
   */
  static invalidateUserContextCache(userId?: string) {
    if (userId) {
      // Only clear if matching user
      if (userContextCache.stories?.userId === userId) userContextCache.stories = null;
      if (userContextCache.storyVariations?.userId === userId) userContextCache.storyVariations = null;
      if (userContextCache.savedSections?.userId === userId) userContextCache.savedSections = null;
      if (userContextCache.workHistory?.userId === userId) userContextCache.workHistory = null;
      if (userContextCache.approvedContent?.userId === userId) userContextCache.approvedContent = null;
    } else {
      // Clear all
      userContextCache.stories = null;
      userContextCache.storyVariations = null;
      userContextCache.savedSections = null;
      userContextCache.workHistory = null;
      userContextCache.approvedContent = null;
    }
  }

  /**
   * W10: Draft Readiness Evaluation
   * - Reads cached evaluation from draft_quality_evaluations
   * - Triggers Edge Function if missing/stale (TTL default 10 minutes)
   * - Returns normalized JSON per spec
   */
  async getReadinessEvaluation(draftId: string): Promise<DraftReadinessEvaluation | null> {
    if (!isDraftReadinessEnabled()) {
      throw new DraftReadinessFeatureDisabledError();
    }

    // Read cached evaluation
    const { data: row } = await this.supabaseClient
      .from('draft_quality_evaluations')
      .select('*')
      .eq('draft_id', draftId)
      .maybeSingle();

    const nowIso = this.now().toISOString();
    const isFresh =
      row?.ttl_expires_at && typeof row.ttl_expires_at === 'string' && row.ttl_expires_at > nowIso;
    if (row && isFresh) {
      return this.mapReadinessRow(row, true);
    }

    // Stale or missing → trigger recompute
    try {
      const fnClient = this.supabaseClient?.functions ?? supabase.functions;
      const { data, error: fnError } = await fnClient.invoke('evaluate-draft-readiness', {
        body: { draftId },
      });
      if (fnError) {
        if (isFeatureDisabledFunctionsError(fnError)) {
          throw new DraftReadinessFeatureDisabledError();
        }
        console.warn('[CoverLetterDraftService] Readiness edge function error:', fnError);
      }
      // Prefer canonical DB row after invocation
      const { data: refreshed } = await this.supabaseClient
        .from('draft_quality_evaluations')
        .select('*')
        .eq('draft_id', draftId)
        .maybeSingle();
      if (refreshed) {
        return this.mapReadinessRow(refreshed, false);
      }
      // Fallback to function response if it returned the payload inline
      if (data && typeof data === 'object') {
        return this.sanitizeReadinessPayload(data);
      }
    } catch (invokeErr) {
      if (isFeatureDisabledFunctionsError(invokeErr)) {
        throw new DraftReadinessFeatureDisabledError();
      }
      console.warn('[CoverLetterDraftService] Failed to invoke readiness function:', invokeErr);
    }

    return null;
  }

  private mapReadinessRow(row: any, fromCache: boolean): DraftReadinessEvaluation {
    const rating =
      row?.rating === 'weak' ||
      row?.rating === 'adequate' ||
      row?.rating === 'strong' ||
      row?.rating === 'exceptional'
        ? row.rating
        : 'weak';

    const scoreBreakdown = (row?.score_breakdown ?? {}) as Record<string, string>;
    const getScore = (...keys: string[]): string | undefined => {
      for (const key of keys) {
        const value = scoreBreakdown[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          return value;
        }
      }
      return undefined;
    };
    const normalizedScoreBreakdown = {
      narrativeCoherence: getScore('narrativeCoherence', 'narrative_coherence', 'clarityStructure', 'clarity_structure'),
      persuasivenessEvidence: getScore('persuasivenessEvidence', 'persuasiveness_evidence', 'specificExamples', 'specific_examples', 'quantifiedImpact', 'quantified_impact'),
      roleRelevance: getScore('roleRelevance', 'role_relevance', 'roleAlignment', 'role_alignment', 'companyAlignment', 'company_alignment', 'personalization'),
      professionalPolish: getScore('professionalPolish', 'professional_polish', 'writingQuality', 'writing_quality', 'lengthEfficiency', 'length_efficiency', 'executiveMaturity', 'executive_maturity', 'opening'),
    };
    const feedbackSummary =
      typeof row?.feedback_summary === 'string' ? row.feedback_summary : 'Evaluation unavailable';
    const improvements = Array.isArray(row?.improvements)
      ? row.improvements.filter((i: any) => typeof i === 'string').slice(0, 3)
      : [];

    return {
      rating,
      scoreBreakdown: {
        narrativeCoherence: this.asStrength(normalizedScoreBreakdown.narrativeCoherence),
        persuasivenessEvidence: this.asStrength(normalizedScoreBreakdown.persuasivenessEvidence),
        roleRelevance: this.asStrength(normalizedScoreBreakdown.roleRelevance),
        professionalPolish: this.asStrength(normalizedScoreBreakdown.professionalPolish),
      },
      feedback: {
        summary: feedbackSummary,
        improvements,
      },
      evaluatedAt: row?.evaluated_at ?? undefined,
      ttlExpiresAt: row?.ttl_expires_at ?? undefined,
      metadata: typeof row?.metadata === 'object' ? row.metadata : undefined,
      fromCache,
    };
  }

  private sanitizeReadinessPayload(payload: any): DraftReadinessEvaluation {
    const score = payload?.scoreBreakdown ?? {};
    const getScore = (...keys: string[]): string | undefined => {
      for (const key of keys) {
        const value = score[key];
        if (typeof value === 'string' && value.trim().length > 0) {
          return value;
        }
      }
      return undefined;
    };
    const normalizedScoreBreakdown = {
      narrativeCoherence: getScore('narrativeCoherence', 'narrative_coherence', 'clarityStructure', 'clarity_structure'),
      persuasivenessEvidence: getScore('persuasivenessEvidence', 'persuasiveness_evidence', 'specificExamples', 'specific_examples', 'quantifiedImpact', 'quantified_impact'),
      roleRelevance: getScore('roleRelevance', 'role_relevance', 'roleAlignment', 'role_alignment', 'companyAlignment', 'company_alignment', 'personalization'),
      professionalPolish: getScore('professionalPolish', 'professional_polish', 'writingQuality', 'writing_quality', 'lengthEfficiency', 'length_efficiency', 'executiveMaturity', 'executive_maturity', 'opening'),
    };
    return {
      rating:
        payload?.rating === 'weak' ||
        payload?.rating === 'adequate' ||
        payload?.rating === 'strong' ||
        payload?.rating === 'exceptional'
          ? payload.rating
          : 'weak',
      scoreBreakdown: {
        narrativeCoherence: this.asStrength(normalizedScoreBreakdown.narrativeCoherence),
        persuasivenessEvidence: this.asStrength(normalizedScoreBreakdown.persuasivenessEvidence),
        roleRelevance: this.asStrength(normalizedScoreBreakdown.roleRelevance),
        professionalPolish: this.asStrength(normalizedScoreBreakdown.professionalPolish),
      },
      feedback: {
        summary:
          typeof payload?.feedback?.summary === 'string'
            ? payload.feedback.summary
            : 'Evaluation unavailable',
        improvements: Array.isArray(payload?.feedback?.improvements)
          ? payload.feedback.improvements.filter((i: any) => typeof i === 'string').slice(0, 3)
          : [],
      },
      evaluatedAt: payload?.evaluatedAt ?? undefined,
      ttlExpiresAt: payload?.ttlExpiresAt ?? undefined,
      metadata: typeof payload?.metadata === 'object' ? payload.metadata : undefined,
      fromCache: false,
    };
  }

  private asStrength(value: any): 'strong' | 'sufficient' | 'insufficient' {
    return value === 'strong' || value === 'sufficient' || value === 'insufficient'
      ? value
      : 'insufficient';
  }

  /**
   * AGENT D: Fast draft generation without metrics (Phase 1)
   * Generates a draft in ~15s by skipping expensive LLM metrics calculation.
   * Metrics can be calculated in background using calculateMetricsForDraft.
   */
  async generateDraftFast(options: DraftGenerationOptions): Promise<{
    draft: CoverLetterDraft;
    workpad: DraftWorkpad;
    jobDescription: ParsedJobDescription;
    heuristicInsights?: Record<string, any>; // AGENT D: instant gap feedback
  }> {
    const { userId, templateId, jobDescriptionId, onProgress, onSectionBuilt, signal } = options;
    await this.assertUserNotFlagged(userId);

    const evalsLogger = new EvalsLogger({
      userId,
      stage: 'coverLetter.phase0.generateDraftFast',
    });
    evalsLogger.start();

    const startedAtMs = Date.now();
    const timings: Record<string, number> = {};
    const mark = (key: string, ms: number) => {
      timings[key] = Math.max(0, Math.round(ms));
    };

    try {
      this.emitProgress(onProgress, 'jd_parse', 'Loading job description…');
      const jdStart = Date.now();
      const jobDescription = await this.fetchJobDescription(userId, jobDescriptionId);
      mark('fetchJobDescription_ms', Date.now() - jdStart);

      this.emitProgress(onProgress, 'content_match', 'Loading content libraries…');
      const libsStart = Date.now();
      const [templateRow, stories, savedSections, userGoals] = await Promise.all([
        this.fetchTemplate(userId, templateId),
        this.fetchStories(userId),
        this.fetchSavedSections(userId),
        UserPreferencesService.loadGoals(userId),
      ]);
      mark('loadLibraries_ms', Date.now() - libsStart);

      const normalizeStart = Date.now();
      const templateSections = this.normaliseTemplateSections(templateRow.sections);
      mark('normalizeTemplate_ms', Date.now() - normalizeStart);

      // PERF: Stream sections to UI as they're built
      const buildStart = Date.now();
      const { sections, matchState } = this.buildSections({
        templateSections,
        stories,
        savedSections,
        jobDescription,
        userGoals,
        onSectionBuilt, // Now passed through for progressive rendering
      });
      mark('buildSections_ms', Date.now() - buildStart);

      const differentiatorStart = Date.now();
      const differentiatorSummary = this.buildDifferentiatorSummary(jobDescription, sections);
      mark('buildDifferentiatorSummary_ms', Date.now() - differentiatorStart);

      // AGENT D: Generate heuristic gaps for instant feedback
      this.emitProgress(onProgress, 'gap_detection', 'Analyzing gaps...');
      const heuristicStart = Date.now();
      const heuristicInsights = this.heuristicGapService.generateGapsForDraft(sections, jobDescription);
      mark('heuristicGaps_ms', Date.now() - heuristicStart);

      console.log('[AGENT D] Generated heuristic insights:', {
        sectionCount: sections.length,
        insightKeys: Object.keys(heuristicInsights),
        insights: heuristicInsights
      });

      // Create placeholder metrics for fast path
      const placeholderMetrics = this.createFallbackMetrics();

      // Read MwS from job description analysis (persisted by streaming edge function)
      // This ensures MwS is available immediately in the draft, avoiding race conditions
      const mwsFromJd = (jobDescription.analysis as Record<string, unknown>)?.mws as {
        summaryScore: 0 | 1 | 2 | 3;
        details: Array<{ label: string; strengthLevel: string; explanation: string }>;
      } | undefined;

      if (mwsFromJd) {
        console.log('[generateDraftFast] MwS loaded from JD analysis:', {
          summaryScore: mwsFromJd.summaryScore,
          detailCount: mwsFromJd.details?.length,
        });
      }

      const insertStart = Date.now();
      const insertPayload: Database['public']['Tables']['cover_letters']['Insert'] = {
        user_id: userId,
        template_id: templateId,
        job_description_id: jobDescriptionId,
        status: 'draft',
        sections: sections as unknown as Record<string, unknown>,
        llm_feedback: {
          generatedAt: this.now().toISOString(),
          metrics: placeholderMetrics.raw,
          enhancedMatchData: undefined, // Will be calculated in background
          ...(mwsFromJd ? { mws: mwsFromJd } : {}), // Include MwS if available from JD
        },
        metrics: [] as unknown as Record<string, unknown>, // Empty until metrics calculated
        heuristic_insights: heuristicInsights as unknown as Record<string, unknown>, // AGENT D: instant gaps
        differentiator_summary: differentiatorSummary as unknown as Record<string, unknown>,
        analytics: {
          atsScore: 0, // Will be calculated in background
          generatedAt: this.now().toISOString(),
        } as unknown as Record<string, unknown>,
      };

      const { data: draftRow, error } = await this.supabaseClient
        .from('cover_letters')
        .insert(insertPayload)
        .select()
        .single();
      mark('insertDraft_ms', Date.now() - insertStart);

      if (error || !draftRow) {
        console.error('[CoverLetterDraftService] Failed to store draft:', error);
        throw new Error('Unable to create cover letter draft. Please try again.');
      }

      const workpadStart = Date.now();
      const workpadRow = await this.upsertWorkpad({
        draftId: draftRow.id,
        userId,
        jobDescriptionId,
        matchState,
        sections,
        phase: 'content_match', // Metrics not yet calculated
      });
      mark('upsertWorkpad_ms', Date.now() - workpadStart);

      const mapStart = Date.now();
      const draft = this.mapCoverLetterRow(draftRow, [], 0);
      mark('mapDraftRow_ms', Date.now() - mapStart);

      this.emitProgress(onProgress, 'content_match', 'Draft ready! Calculating metrics...');

      this.incrementSavedSectionUsageForDraft(sections).catch(error => {
        console.warn('[CoverLetterDraftService] Failed to increment saved section usage (non-blocking):', error);
      });

      // Phase B (metrics + gaps) is triggered by the caller (`useCoverLetterDraft`) so we can
      // reliably manage retries and avoid duplicate concurrent runs.

      // PHASE 2 (parallel): Fill any [LLM:...] / [SLOT:...] placeholders in the draft.
      // Pass already-fetched stories to avoid redundant DB query
      this.fillTemplateSlotsForDraft(draftRow.id, userId, jobDescriptionId, onProgress, {
        stories,
        jobDescription,
      }).catch(error => {
        console.error('[generateDraftFast] Background template slot fill failed:', error);
      });

      mark('total_ms', Date.now() - startedAtMs);
      await evalsLogger.success({
        result_subset: {
          templateId,
          jobDescriptionId,
          draftId: draftRow.id,
          sectionCount: sections.length,
          storiesCount: stories.length,
          savedSectionsCount: savedSections.length,
          timings,
        },
      });

      return {
        draft: {
          ...draft,
          differentiatorSummary,
        },
        workpad: workpadRow,
        jobDescription,
        heuristicInsights, // AGENT D: Pass heuristic gaps to hook
      };
    } catch (err) {
      mark('total_ms', Date.now() - startedAtMs);
      await evalsLogger.failure(err, {
        result_subset: {
          templateId,
          jobDescriptionId,
          timings,
        },
      });
      throw err;
    }
  }

  /**
   * AGENT D: Calculate metrics in background (Phase 2)
   * Called from generateDraftFast to calculate expensive LLM metrics.
   * Non-blocking - user can edit draft while this runs.
   *
   * PHASE 2: Uses 3 parallel LLM calls for 1.6x speedup (45s vs 72s)
   */
  async calculateMetricsForDraft(
    draftId: string,
    userId: string,
    jobDescriptionId: string,
    onProgress?: DraftGenerationOptions['onProgress'],
    options?: {
      jobId?: string;
    }
  ): Promise<EnhancedMatchData | undefined> {
    const metricsStartTime = Date.now();
    const jobId = options?.jobId ?? null;
    let jobStagesCache: Record<string, any> = {};
    let jobStageWrite = Promise.resolve();
    const queueJobUpdate = async (patch: Record<string, unknown>) => {
      if (!jobId) return;
      jobStageWrite = jobStageWrite
        .then(async () => {
          await this.supabaseClient
            .from('jobs')
            .update(patch)
            .eq('id', jobId);
        })
        .catch((error) => {
          console.warn('[CoverLetterDraftService] Failed to update refresh job (non-blocking):', error);
        });
      return jobStageWrite;
    };
    const updateJobStage = async (
      stage: string,
      status: 'running' | 'complete' | 'failed',
      data?: Record<string, unknown>,
    ) => {
      if (!jobId) return;
      const nowIso = this.now().toISOString();
      const existingStage = jobStagesCache[stage] ?? {};
      const mergedData = {
        ...(existingStage.data || {}),
        ...(data || {}),
      };
      jobStagesCache = {
        ...jobStagesCache,
        [stage]: {
          ...existingStage,
          status,
          data: mergedData,
          completedAt: status === 'running' ? existingStage.completedAt : nowIso,
        },
      };
      await queueJobUpdate({ stages: jobStagesCache });
    };
    try {
      this.emitProgress(onProgress, 'metrics', 'Loading data for metrics calculation...');

      if (jobId) {
        try {
          const { data: jobRow } = await this.supabaseClient
            .from('jobs')
            .select('stages')
            .eq('id', jobId)
            .single();
          jobStagesCache = (jobRow?.stages as Record<string, any>) ?? {};
        } catch (error) {
          console.warn('[CoverLetterDraftService] Failed to load refresh job stages (non-blocking):', error);
        }
        await queueJobUpdate({
          status: 'running',
          started_at: this.now().toISOString(),
          error_message: null,
        });
        await updateJobStage('phaseB.basicMetrics', 'running');
        await updateJobStage('phaseB.requirementAnalysis', 'running');
        await updateJobStage('phaseB.sectionGaps', 'running');
        await updateJobStage('phaseB.contentStandards', 'running');
      }

      const [draftRow, jobDescription, userGoals, workHistory, approvedContent] = await Promise.all([
        this.supabaseClient
          .from('cover_letters')
          .select('*')
          .eq('id', draftId)
          .single()
          .then(({ data, error }) => {
            if (error || !data) throw new Error('Draft not found');
            return data;
          }),
        this.fetchJobDescription(userId, jobDescriptionId),
        UserPreferencesService.loadGoals(userId),
        this.fetchWorkHistory(userId),
        this.fetchStoriesForMatching(userId),
      ]);

      const sections = this.normaliseDraftSections(draftRow.sections);

      // Extract MwS from draft (primary) or job description (fallback) for eval logging
      const llmFeedback = draftRow.llm_feedback as Record<string, unknown> | null;
      const mwsFromDraft = llmFeedback?.mws as {
        summaryScore: 0 | 1 | 2 | 3;
        details: Array<{ label: string; strengthLevel: string; explanation: string }>;
      } | undefined;
      const mwsFromJd = (jobDescription.analysis as Record<string, unknown>)?.mws as typeof mwsFromDraft | undefined;
      const mwsData = mwsFromDraft || mwsFromJd || null;

    // PHASE 2: Run 4 parallel LLM calls for optimized performance
    // IMPORTANT: persist sectionGapInsights as soon as they are ready so the UI doesn't "stall at gaps"
    // while waiting for slower Phase B subcalls (e.g., requirement analysis, content standards).
    this.emitProgress(onProgress, 'metrics', 'Analyzing match quality with AI (this takes ~45 seconds)...');

    // Storage for results
    let basicResult: Awaited<ReturnType<typeof this.calculateBasicMetrics>> | undefined;
    let reqResult: { enhancedMatchData: Partial<EnhancedMatchData> } | undefined;
    let gapResult: { enhancedMatchData: Partial<EnhancedMatchData>; ratingCriteria?: any[] } | undefined;
    let contentStandardsResult: ContentStandardsAnalysis | null = null;

    const persistEnhancedPartial = async (partial: Partial<EnhancedMatchData>, patch: Record<string, unknown>) => {
      try {
        const { data: latestRow } = await this.supabaseClient
          .from('cover_letters')
          .select('llm_feedback')
          .eq('id', draftId)
          .single();

        const existingFeedback =
          latestRow?.llm_feedback && typeof latestRow.llm_feedback === 'object'
            ? (latestRow.llm_feedback as Record<string, unknown>)
            : {};
        const existingEnhanced =
          (existingFeedback.enhancedMatchData as Partial<EnhancedMatchData> | undefined) ?? {};

        const mergedEnhanced: EnhancedMatchData = {
          ...(existingEnhanced as EnhancedMatchData),
          ...(partial as EnhancedMatchData),
        };

        // Keep the no-stall invariant: sectionGapInsights should never remain undefined once any
        // Phase B persist happens (even if empty).
        if ((mergedEnhanced as any).sectionGapInsights === undefined) {
          (mergedEnhanced as any).sectionGapInsights = Array.isArray((existingEnhanced as any).sectionGapInsights)
            ? (existingEnhanced as any).sectionGapInsights
            : [];
        }

        const patchRecord = patch ?? {};
        const patchPhaseB = (patchRecord as any).phaseB as Record<string, unknown> | undefined;
        const { phaseB: _ignored, ...restPatch } = patchRecord as any;

        const nextFeedback: Record<string, unknown> = {
          ...existingFeedback,
          ...restPatch,
          enhancedMatchData: mergedEnhanced,
          ...(patchPhaseB
            ? {
                phaseB: {
                  ...(((existingFeedback as any).phaseB as Record<string, unknown>) ?? {}),
                  ...patchPhaseB,
                },
              }
            : null),
        };

        await this.supabaseClient
          .from('cover_letters')
          .update({
            llm_feedback: nextFeedback as unknown as Record<string, unknown>,
            updated_at: this.now().toISOString(),
          })
          .eq('id', draftId);
      } catch (persistError) {
        console.warn('[CoverLetterDraftService] Failed to persist Phase B partial (non-blocking):', persistError);
      }
    };

    const persistMetricsPartial = async (
      metricPayload: Awaited<ReturnType<typeof this.calculateBasicMetrics>>,
      patch: Record<string, unknown>,
    ) => {
      try {
        const { data: latestRow } = await this.supabaseClient
          .from('cover_letters')
          .select('llm_feedback, analytics')
          .eq('id', draftId)
          .single();

        const existingFeedback =
          latestRow?.llm_feedback && typeof latestRow.llm_feedback === 'object'
            ? (latestRow.llm_feedback as Record<string, unknown>)
            : {};
        const existingAnalytics =
          latestRow?.analytics && typeof latestRow.analytics === 'object'
            ? (latestRow.analytics as Record<string, unknown>)
            : {};

        const patchRecord = patch ?? {};
        const patchPhaseB = (patchRecord as any).phaseB as Record<string, unknown> | undefined;
        const { phaseB: _ignored, ...restPatch } = patchRecord as any;

        const nextFeedback: Record<string, unknown> = {
          ...existingFeedback,
          ...restPatch,
          metrics: metricPayload.raw,
          ...(patchPhaseB
            ? {
                phaseB: {
                  ...(((existingFeedback as any).phaseB as Record<string, unknown>) ?? {}),
                  ...patchPhaseB,
                },
              }
            : null),
        };

        await this.supabaseClient
          .from('cover_letters')
          .update({
            llm_feedback: nextFeedback as unknown as Record<string, unknown>,
            metrics: metricPayload.metrics as unknown as Record<string, unknown>,
            analytics: {
              ...existingAnalytics,
              atsScore: metricPayload.atsScore,
              generatedAt: this.now().toISOString(),
            } as unknown as Record<string, unknown>,
            updated_at: this.now().toISOString(),
          })
          .eq('id', draftId);
      } catch (persistError) {
        console.warn('[CoverLetterDraftService] Failed to persist Phase B metrics partial (non-blocking):', persistError);
      }
    };

    // Fire all 4 calls in parallel - each has independent retry logic
    const call1Promise = (async () => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
            await sleep(delay);
          }
          const startMs = Date.now();
          const res = await this.calculateBasicMetrics({
            sections,
            jobDescription,
            userGoals,
          });
          const completedAt = this.now().toISOString();
          await persistMetricsPartial(res, {
            phaseB: {
              basicMetrics: {
                status: 'success',
                attempt: attempt + 1,
                latencyMs: Date.now() - startMs,
                completedAt,
              },
            },
          });
          await updateJobStage('phaseB.basicMetrics', 'complete', {
            latencyMs: Date.now() - startMs,
          });
          return res;
        } catch (error) {
          if (attempt === MAX_RETRIES) {
            console.warn('[CoverLetterDraftService] Basic metrics failed, using fallback');
            const fallback = this.createFallbackMetrics();
            const completedAt = this.now().toISOString();
            await persistMetricsPartial(fallback, {
              phaseB: {
                basicMetrics: {
                  status: 'success',
                  attempt: attempt + 1,
                  latencyMs: Date.now() - metricsStartTime,
                  completedAt,
                  fallback: true,
                },
              },
            });
            await updateJobStage('phaseB.basicMetrics', 'complete', {
              latencyMs: Date.now() - metricsStartTime,
              fallback: true,
            });
            return fallback;
          }
        }
      }
      return this.createFallbackMetrics();
    })();

    const call2Promise = (async () => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
            await sleep(delay);
          }
          const startMs = Date.now();
          const res = await this.calculateRequirementAnalysis({
            sections,
            jobDescription,
            userGoals,
            workHistory,
            approvedContent,
          });
          await persistEnhancedPartial(res.enhancedMatchData, {
            phaseB: {
              requirementAnalysis: {
                status: 'success',
                attempt: attempt + 1,
                latencyMs: Date.now() - startMs,
                completedAt: this.now().toISOString(),
              },
            },
          });
          await updateJobStage('phaseB.requirementAnalysis', 'complete', {
            latencyMs: Date.now() - startMs,
          });
          return res;
        } catch (error) {
          if (attempt === MAX_RETRIES) {
            console.warn('[CoverLetterDraftService] Requirement analysis failed');
            await updateJobStage('phaseB.requirementAnalysis', 'failed', {
              message: error instanceof Error ? error.message : String(error),
            });
            return { enhancedMatchData: {} };
          }
        }
      }
      return { enhancedMatchData: {} };
    })();

    const call3Promise = (async () => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
            await sleep(delay);
          }
          const res = await this.calculateSectionGaps({
            sections,
            jobDescription,
          });
          // Persist gaps as soon as they are ready to unblock UI ("no gap stall").
          await persistEnhancedPartial(res.enhancedMatchData, {
            phaseB: {
              sectionGaps: {
                status: 'success',
                attempt: attempt + 1,
                latencyMs: Date.now() - metricsStartTime,
                completedAt: this.now().toISOString(),
              },
            },
          });
          await updateJobStage('phaseB.sectionGaps', 'complete', {
            latencyMs: Date.now() - metricsStartTime,
          });
          return res;
        } catch (error) {
          if (attempt === MAX_RETRIES) {
            console.warn('[CoverLetterDraftService] Section gaps failed');
            await updateJobStage('phaseB.sectionGaps', 'failed', {
              message: error instanceof Error ? error.message : String(error),
            });
            return { enhancedMatchData: {}, ratingCriteria: [] };
          }
        }
      }
      return { enhancedMatchData: {}, ratingCriteria: [] };
    })();

    const call4Promise = (async () => {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          if (attempt > 0) {
            const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
            await sleep(delay);
          }
          const startMs = Date.now();
          const res = await this.calculateContentStandards({
            sections,
            jobDescription,
          });
          if (res) {
            await persistEnhancedPartial({}, {
              contentStandards: res,
              phaseB: {
                contentStandards: {
                  status: 'success',
                  attempt: attempt + 1,
                  latencyMs: Date.now() - startMs,
                  completedAt: this.now().toISOString(),
                },
              },
            });
            await updateJobStage('phaseB.contentStandards', 'complete', {
              latencyMs: Date.now() - startMs,
            });
          } else {
            await updateJobStage('phaseB.contentStandards', 'complete', {
              skipped: true,
            });
          }
          return res;
        } catch (error) {
          if (attempt === MAX_RETRIES) {
            console.warn('[CoverLetterDraftService] Content standards failed');
            await updateJobStage('phaseB.contentStandards', 'failed', {
              message: error instanceof Error ? error.message : String(error),
            });
            return null;
          }
        }
      }
      return null;
    })();

    // Wait for all 4 to complete in parallel
    [basicResult, reqResult, gapResult, contentStandardsResult] = await Promise.all([
      call1Promise,
      call2Promise,
      call3Promise,
      call4Promise,
    ]);

    // Merge results from all 3 calls
    const metricResult = {
      metrics: basicResult.metrics,
      atsScore: basicResult.atsScore,
      enhancedMatchData: {
        ...reqResult.enhancedMatchData,
        ...gapResult.enhancedMatchData,
      } as EnhancedMatchData,
      raw: basicResult.raw,
    };

    // Extract rating criteria from section gaps result if available
    const ratingMetric = basicResult.metrics.find(m => m.key === 'rating');
    const ratingData = gapResult.ratingCriteria && Array.isArray(gapResult.ratingCriteria)
      ? {
          criteria: gapResult.ratingCriteria.map((c: any) => ({
            id: c.id || '',
            label: c.label || '',
            met: c.met === true,
            evidence: c.evidence || '',
            suggestion: c.suggestion || '',
          })),
          score: ratingMetric && ratingMetric.type === 'score' ? ratingMetric.value : 0,
          summary: ratingMetric?.summary || '',
          tooltip: ratingMetric?.tooltip || '',
        }
      : undefined;

    // Fetch MwS from streaming job result (persisted at source, not via frontend useEffect)
    let mwsFromJob: { summaryScore: 0 | 1 | 2 | 3; details: Array<{ label: string; strengthLevel: string; explanation: string }> } | undefined;
    try {
      const { data: jobRows } = await this.supabaseClient
        .from('jobs')
        .select('result')
        .eq('user_id', userId)
        .eq('type', 'coverLetter')
        .order('created_at', { ascending: false })
        .limit(5); // Get recent jobs to find one with matching JD

      // Find job with MwS data (result.mws exists)
      const jobWithMws = (jobRows ?? []).find((j: any) => j.result?.mws?.summaryScore !== undefined);
      if (jobWithMws?.result?.mws) {
        mwsFromJob = jobWithMws.result.mws;
        console.log('[CoverLetterDraftService] Found MwS from job result:', {
          summaryScore: mwsFromJob?.summaryScore,
          detailCount: mwsFromJob?.details?.length,
        });
      }
    } catch (mwsError) {
      console.warn('[CoverLetterDraftService] Failed to fetch MwS from jobs:', mwsError);
    }

    // Re-read llm_feedback just before persisting metrics so we don't clobber
    // enhancedMatchData written by the streaming edge pipeline (race-safe).
    let latestFeedback: Record<string, unknown> = (draftRow.llm_feedback as Record<string, unknown> | null) ?? {};
    try {
      const { data: latestRow } = await this.supabaseClient
        .from('cover_letters')
        .select('llm_feedback')
        .eq('id', draftId)
        .single();
      if (latestRow?.llm_feedback && typeof latestRow.llm_feedback === 'object') {
        latestFeedback = latestRow.llm_feedback as Record<string, unknown>;
      }
    } catch (e) {
      // Non-blocking: proceed with the draftRow snapshot if re-read fails.
      console.warn('[CoverLetterDraftService] Failed to re-read llm_feedback before persist (non-blocking):', e);
    }

    const existingFeedback = latestFeedback;
    const existingEnhanced = (existingFeedback.enhancedMatchData as Partial<EnhancedMatchData> | undefined) ?? {};
    const mergedEnhanced: EnhancedMatchData = {
      ...(existingEnhanced as EnhancedMatchData),
      ...(metricResult.enhancedMatchData as EnhancedMatchData),
    };
    // Ensure sectionGapInsights is always present so UI doesn't get stuck in skeleton mode.
    // Prefer computed (draft-based) gaps when available; edge-persisted gaps are template-based.
    const existingSectionGaps = Array.isArray((existingEnhanced as any).sectionGapInsights)
      ? (existingEnhanced as any).sectionGapInsights
      : undefined;
    const computedSectionGaps = Array.isArray((metricResult.enhancedMatchData as any)?.sectionGapInsights)
      ? (metricResult.enhancedMatchData as any).sectionGapInsights
      : undefined;
    const pickNonEmpty = (value: unknown) =>
      Array.isArray(value) && value.length > 0 ? value : undefined;
    (mergedEnhanced as any).sectionGapInsights =
      pickNonEmpty(computedSectionGaps) ??
      pickNonEmpty(existingSectionGaps) ??
      computedSectionGaps ??
      existingSectionGaps ??
      [];
    if (!('coreRequirementDetails' in mergedEnhanced)) {
      (mergedEnhanced as any).coreRequirementDetails = Array.isArray((existingEnhanced as any).coreRequirementDetails)
        ? (existingEnhanced as any).coreRequirementDetails
        : [];
    }
    if (!('preferredRequirementDetails' in mergedEnhanced)) {
      (mergedEnhanced as any).preferredRequirementDetails = Array.isArray((existingEnhanced as any).preferredRequirementDetails)
        ? (existingEnhanced as any).preferredRequirementDetails
        : [];
    }

      const existingPhaseB = ((existingFeedback as any)?.phaseB as Record<string, unknown>) ?? {};
      const phaseBAttempt = (((existingPhaseB as any)?.attempt ?? 0) + 1);
      const nextPhaseB = {
        ...existingPhaseB,
        status: 'success',
        attempt: phaseBAttempt,
        latencyMs: Date.now() - metricsStartTime,
        completedAt: this.now().toISOString(),
      };
      // Update draft with calculated metrics + MwS from streaming job
      await this.supabaseClient
        .from('cover_letters')
        .update({
          llm_feedback: {
            ...existingFeedback,
            generatedAt: this.now().toISOString(),
            metrics: metricResult.raw,
            enhancedMatchData: mergedEnhanced,
            phaseB: nextPhaseB,
            ...(ratingData ? { rating: ratingData } : {}),
            ...(contentStandardsResult ? { contentStandards: contentStandardsResult } : {}),
            ...(mwsFromJob ? { mws: mwsFromJob } : {}), // Persist MwS from streaming job
          } as unknown as Record<string, unknown>,
          metrics: metricResult.metrics as unknown as Record<string, unknown>,
          analytics: {
            atsScore: metricResult.atsScore,
            ...(contentStandardsResult ? { overallScore: contentStandardsResult.aggregated.overallScore } : {}),
            generatedAt: this.now().toISOString(),
          } as unknown as Record<string, unknown>,
          updated_at: this.now().toISOString(),
        })
        .eq('id', draftId);

      await queueJobUpdate({
        status: 'complete',
        completed_at: this.now().toISOString(),
        error_message: null,
      });

    this.emitProgress(onProgress, 'metrics', 'Match metrics calculated successfully!');

    // Log evaluation result for QA tracking (best effort - don't block on errors)
    const metricsEndTime = Date.now();
    try {
      await this.logDraftCoverLetterResult({
        userId,
        draftId,
        jobDescriptionId,
        sections,
        enhancedMatchData: metricResult.enhancedMatchData,
        metrics: metricResult.metrics,
        contentStandards: contentStandardsResult,
        overallScore: contentStandardsResult?.aggregated?.overallScore,
        mws: mwsFromJob || mwsData, // Include MwS in eval logging (prefer job result, fallback to draft/JD)
        phaseBLatencyMs: metricsEndTime - metricsStartTime,
        status: 'success',
      });
    } catch (error) {
      // Don't block draft generation if evaluation logging fails
      console.warn('[CoverLetterDraftService] Failed to log evaluation result (non-blocking):', error);
    }

      return metricResult.enhancedMatchData;
    } catch (error) {
      // Prevent "gap stall": ensure the draft always gets a defined `sectionGapInsights` on failure.
      // This unblocks the UI (users can keep editing) and allows automatic retries to kick in.
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CoverLetterDraftService] Phase B metrics calculation failed:', error);
      try {
        const { data: latestRow } = await this.supabaseClient
          .from('cover_letters')
          .select('llm_feedback')
          .eq('id', draftId)
          .single();
        const existingFeedback =
          latestRow?.llm_feedback && typeof latestRow.llm_feedback === 'object'
            ? (latestRow.llm_feedback as Record<string, unknown>)
            : {};
        const existingEnhanced = (existingFeedback.enhancedMatchData as Record<string, unknown> | undefined) ?? {};
        const existingPhaseB = ((existingFeedback as any)?.phaseB as Record<string, unknown>) ?? {};
        const phaseBAttempt = (((existingPhaseB as any)?.attempt ?? 0) + 1);
        const nextPhaseB = {
          ...existingPhaseB,
          status: 'error',
          attempt: phaseBAttempt,
          latencyMs: Date.now() - metricsStartTime,
          failedAt: this.now().toISOString(),
          message,
        };
        const mergedEnhanced = {
          ...existingEnhanced,
          sectionGapInsights:
            (existingEnhanced as any).sectionGapInsights !== undefined ? (existingEnhanced as any).sectionGapInsights : [],
        };

        await this.supabaseClient
          .from('cover_letters')
          .update({
            llm_feedback: {
              ...existingFeedback,
              phaseB: nextPhaseB,
              enhancedMatchData: mergedEnhanced,
            } as unknown as Record<string, unknown>,
            updated_at: this.now().toISOString(),
          })
          .eq('id', draftId);
      } catch (persistError) {
        console.warn('[CoverLetterDraftService] Failed to persist Phase B error status (non-blocking):', persistError);
      }

      await queueJobUpdate({
        status: 'error',
        completed_at: this.now().toISOString(),
        error_message: message,
      });

      // Still throw so callers (manual refresh) can surface an error if desired.
      throw error;
    }
  }

  /**
   * Recompute ONLY sectionGapInsights (fast retry path).
   * Used by the "Retry gaps" CTA so users don't wait for full Phase B.
   */
  async calculateSectionGapsForDraft(
    draftId: string,
    userId: string,
    jobDescriptionId: string,
    onProgress?: DraftGenerationOptions['onProgress'],
  ): Promise<Partial<EnhancedMatchData> | undefined> {
    const startedAt = Date.now();
    this.emitProgress(onProgress, 'gap_detection', 'Refreshing gaps for this draft...');

    const [draftRow, jobDescription] = await Promise.all([
      this.supabaseClient
        .from('cover_letters')
        .select('id, llm_feedback, sections')
        .eq('id', draftId)
        .single()
        .then(({ data, error }) => {
          if (error || !data) throw new Error('Draft not found');
          return data as Pick<CoverLetterRow, 'id' | 'llm_feedback' | 'sections'>;
        }),
      this.fetchJobDescription(userId, jobDescriptionId),
    ]);

    const sections = this.normaliseDraftSections((draftRow as any).sections);
    const res = await this.calculateSectionGaps({ sections, jobDescription });

    // Merge and persist (race-safe) without touching metrics/analytics.
    const existingFeedback =
      (draftRow as any).llm_feedback && typeof (draftRow as any).llm_feedback === 'object'
        ? ((draftRow as any).llm_feedback as Record<string, unknown>)
        : {};
    const existingEnhanced =
      (existingFeedback.enhancedMatchData as Partial<EnhancedMatchData> | undefined) ?? {};
    const mergedEnhanced: EnhancedMatchData = {
      ...(existingEnhanced as EnhancedMatchData),
      ...(res.enhancedMatchData as EnhancedMatchData),
    };
    if ((mergedEnhanced as any).sectionGapInsights === undefined) {
      (mergedEnhanced as any).sectionGapInsights = [];
    }

    const attempt = (((existingFeedback as any)?.phaseB as any)?.sectionGaps?.attempt ?? 0) + 1;
    await this.supabaseClient
      .from('cover_letters')
      .update({
        llm_feedback: {
          ...existingFeedback,
          enhancedMatchData: mergedEnhanced,
          phaseB: {
            ...(((existingFeedback as any)?.phaseB as Record<string, unknown>) ?? {}),
            sectionGaps: {
              status: 'success',
              attempt,
              latencyMs: Date.now() - startedAt,
              completedAt: this.now().toISOString(),
            },
          },
        } as unknown as Record<string, unknown>,
        updated_at: this.now().toISOString(),
      })
      .eq('id', draftId);

    this.emitProgress(onProgress, 'gap_detection', 'Gaps refreshed.');
    return res.enhancedMatchData;
  }

  private async fillTemplateSlotsForDraft(
    draftId: string,
    userId: string,
    jobDescriptionId: string,
    onProgress?: DraftGenerationOptions['onProgress'],
    preloadedData?: {
      stories?: StoryRow[];
      jobDescription?: ParsedJobDescription;
    },
  ): Promise<void> {
    const draftRow = await this.supabaseClient
      .from('cover_letters')
      .select('*')
      .eq('id', draftId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) throw new Error('Draft not found');
        return data;
      });

    const sections = this.normaliseDraftSections(draftRow.sections);
    const slotTokens = sections.flatMap(section => {
      const content = section.content || '';
      const tokens = parseLlmSlotTokens(content);
      return tokens.map(token => {
        const start = typeof token.index === 'number' ? token.index : content.indexOf(token.rawToken);
        const safeStart = start < 0 ? 0 : start;
        const before = content.slice(Math.max(0, safeStart - 80), safeStart);
        const afterStart = start < 0 ? 0 : safeStart + token.rawToken.length;
        const after = content.slice(afterStart, afterStart + 80);
        return {
          ...token,
          context: { before, after },
        };
      });
    });
    if (slotTokens.length === 0) return;

    // Use preloaded data if available to avoid redundant DB queries
    const [jobDescriptionRecord, workHistory, approvedContent] = await Promise.all([
      preloadedData?.jobDescription
        ? Promise.resolve(preloadedData.jobDescription)
        : this.jobDescriptionService.getJobDescription(userId, jobDescriptionId),
      this.fetchWorkHistory(userId),
      preloadedData?.stories
        ? Promise.resolve(preloadedData.stories.map(s => ({ id: s.id, title: s.title, content: s.content })))
        : this.fetchStoriesForMatching(userId),
    ]);

    if (!jobDescriptionRecord) return;

    const apiKey =
      (import.meta.env?.VITE_OPENAI_API_KEY as string | undefined) ||
      (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) ||
      (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

    if (!apiKey) {
      console.warn('[fillTemplateSlotsForDraft] OpenAI key not configured; leaving slot tokens untouched');
      return;
    }

    this.emitProgress(onProgress, 'content_match', 'Filling template placeholders with AI...');

    const requestPayload = {
      company: jobDescriptionRecord.company,
      role: jobDescriptionRecord.role,
      jobDescriptionText: jobDescriptionRecord.content,
      workHistory: workHistory.slice(0, 12).map(item => ({
        company: item.company,
        title: item.title,
        description: (item.description || '').slice(0, 800),
        achievements: (item.achievements || []).slice(0, 8),
      })),
      approvedStories: approvedContent.slice(0, 12).map(item => ({
        title: item.title,
        content: (item.content || '').slice(0, 900),
      })),
      slots: slotTokens.slice(0, 20).map(token => ({
        id: token.id,
        label: token.label,
        instruction: token.instruction,
        rawToken: token.rawToken,
        context: (token as any).context || undefined,
      })),
    };

    const client = createOpenAI({ apiKey });
    const system = [
      'You fill template placeholders in a cover letter draft.',
      'Each placeholder token is either [LLM:...] or [SLOT:...] and contains an instruction.',
      'For each slot, produce a short fill that can be inserted directly into the cover letter.',
      'If context.before/context.after are provided, ensure the fill fits grammatically between them.',
      'Do not include trailing punctuation if the surrounding text continues the sentence.',
      'Use job description ONLY to choose relevant capability themes; do not restate JD entities as candidate experience.',
      'Every fill must be grounded in work history or approved stories; do not invent facts.',
      'Never claim experience with specific companies, customers, or industries unless explicitly present in work history or stories.',
      'Prefer transferable capability phrasing over domain-specific claims.',
      'If you cannot confidently fill from the provided evidence, return status NOT_FOUND and an empty fill.',
      'Return ONLY valid JSON: {"slots":[{"id":"...","status":"FILLED"|"NOT_FOUND","fill":"...","evidence":{"jobDescription":[],"workHistory":[]}}]}.',
    ].join('\n');

    const result: any = await streamText({
      model: client.chat(OPENAI_CONFIG.MODEL),
      system,
      messages: [{ role: 'user', content: JSON.stringify(requestPayload) }],
      temperature: 0.2,
      maxTokens: 1200,
    } as any);

    let rawOutput = '';
    if (result?.textStream) {
      for await (const chunk of result.textStream as AsyncIterable<unknown>) {
        const token =
          typeof chunk === 'string'
            ? chunk
            : typeof chunk === 'object' && chunk !== null && 'text' in chunk
            ? // @ts-expect-error runtime inspection
              chunk.text
            : typeof chunk === 'object' && chunk !== null && 'value' in chunk
            ? // @ts-expect-error runtime inspection
              chunk.value
            : '';
        if (!token) continue;
        rawOutput += token;
      }
    }
    if (!rawOutput && typeof result?.text === 'string') rawOutput = result.text;

    const cleaned = rawOutput
      .trim()
      .replace(/^```json/i, '')
      .replace(/^```/, '')
      .replace(/```$/, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn('[fillTemplateSlotsForDraft] Unable to parse slot fill JSON; leaving tokens untouched');
      return;
    }

    const fills: Array<{
      id: string;
      status: 'FILLED' | 'NOT_FOUND';
      fill: string;
      evidence?: { jobDescription?: string[]; workHistory?: string[] };
    }> = Array.isArray(parsed?.slots) ? parsed.slots : [];

    if (fills.length === 0) return;

    const fillById = new Map(fills.map(item => [item.id, item]));
    const updatedSections = sections.map(section => {
      if (section.status?.isModified) return section;

      const tokens = parseLlmSlotTokens(section.content || '');
      if (tokens.length === 0) return section;

      let updatedContent = section.content || '';
      for (const token of tokens) {
        const fill = fillById.get(token.id);
        if (!fill) continue;
        const replacement =
          fill.status === 'FILLED' && typeof fill.fill === 'string' && fill.fill.trim().length > 0
            ? fill.fill.trim()
            : 'NOT_FOUND';
        updatedContent = replaceSlotTokenWithPunctuation(updatedContent, token.rawToken, replacement);
      }

      if (updatedContent === section.content) return section;
      return {
        ...section,
        content: updatedContent,
        status: {
          ...section.status,
          lastUpdatedAt: this.now().toISOString(),
        },
      };
    });

    const llmFeedback =
      draftRow.llm_feedback && typeof draftRow.llm_feedback === 'object'
        ? (draftRow.llm_feedback as Record<string, unknown>)
        : {};

    await this.supabaseClient
      .from('cover_letters')
      .update({
        sections: updatedSections as unknown as Record<string, unknown>,
        llm_feedback: {
          ...llmFeedback,
          templateSlots: {
            filledAt: this.now().toISOString(),
            slots: fills,
          },
        } as unknown as Record<string, unknown>,
        updated_at: this.now().toISOString(),
      })
      .eq('id', draftId);

    this.emitProgress(onProgress, 'content_match', 'Template placeholders updated.');
  }

  /**
   * PHASE 2: Calculate Basic Metrics (Parallel Call 1 of 3)
   * Fast 10-15s call for immediate UI feedback
   */
  private async calculateBasicMetrics(input: {
    sections: CoverLetterDraftSection[];
    jobDescription: ParsedJobDescription;
    userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>> | null;
  }): Promise<{
    metrics: CoverLetterMatchMetric[];
    atsScore: number;
    raw: Record<string, unknown>;
  }> {
    const apiKey =
      (import.meta.env?.VITE_OPENAI_API_KEY) ||
      (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) ||
      (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const client = createOpenAI({ apiKey });

    const payload = {
      draft: input.sections
        .sort((a, b) => a.order - b.order)
        .map(section => section.content.trim())
        .filter(Boolean)
        .join('\n\n'),
      sections: input.sections.map(section => ({
        slug: section.slug,
        title: section.title,
        content: section.content,
        requirementsMatched: section.metadata?.requirementsMatched ?? [],
      })),
      jobDescription: {
        company: input.jobDescription.company,
        role: input.jobDescription.role,
        summary: input.jobDescription.summary,
        standardRequirements: input.jobDescription.standardRequirements,
        preferredRequirements: input.jobDescription.preferredRequirements,
        differentiatorRequirements: input.jobDescription.differentiatorRequirements,
      },
      userGoals: input.userGoals,
    };

    const result: any = await streamText({
      model: client.chat(OPENAI_CONFIG.MODEL),
      system: BASIC_METRICS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildBasicMetricsUserPrompt(payload),
        },
      ],
      temperature: 0.1,
      maxTokens: 1500, // Smaller output for fast response
    } as any);

    let rawOutput = '';
    if (result?.textStream) {
      for await (const chunk of result.textStream as AsyncIterable<unknown>) {
        const token =
          typeof chunk === 'string'
            ? chunk
            : typeof chunk === 'object' && chunk !== null && 'text' in chunk
            ? (chunk as any).text
            : typeof chunk === 'object' && chunk !== null && 'value' in chunk
            ? (chunk as any).value
            : '';
        if (!token) continue;
        rawOutput += token;
      }
    }

    if (!rawOutput && typeof result?.text === 'string') {
      rawOutput = result.text;
    }

    if (!rawOutput || !rawOutput.trim()) {
      throw new Error('Basic metrics returned empty response');
    }

    const cleaned = rawOutput
      .trim()
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      metrics: Record<string, any>;
    };

    const metrics = transformMetricPayload(parsed.metrics);
    const atsMetric = metrics.find(metric => metric.key === 'ats') as
      | Extract<CoverLetterMatchMetric, { key: 'ats' }>
      | undefined;

    return {
      metrics,
      atsScore:
        atsMetric && atsMetric.type === 'score'
          ? Math.round(atsMetric.value)
          : atsMetric && atsMetric.type === 'strength'
          ? strengthToScore(atsMetric.strength)
          : 0,
      raw: parsed.metrics,
    };
  }

  /**
   * PHASE 2: Calculate Requirement Analysis (Parallel Call 2 of 3)
   * Medium 15-20s call for detailed requirement matching
   */
  private async calculateRequirementAnalysis(input: {
    sections: CoverLetterDraftSection[];
    jobDescription: ParsedJobDescription;
    userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>> | null;
    workHistory?: Array<{
      id: string;
      company: string;
      title: string;
      description: string;
      achievements: string[];
    }>;
    approvedContent?: Array<{
      id: string;
      title: string;
      content: string;
    }>;
  }): Promise<{
    enhancedMatchData: Partial<EnhancedMatchData>;
  }> {
    const apiKey =
      (import.meta.env?.VITE_OPENAI_API_KEY) ||
      (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) ||
      (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const client = createOpenAI({ apiKey });

    const payload = {
      draft: input.sections
        .sort((a, b) => a.order - b.order)
        .map(section => section.content.trim())
        .filter(Boolean)
        .join('\n\n'),
      sections: input.sections.map(section => ({
        id: section.id,
        slug: section.slug,
        title: section.title,
        content: section.content,
        requirementsMatched: section.metadata?.requirementsMatched ?? [],
      })),
      jobDescription: {
        company: input.jobDescription.company,
        role: input.jobDescription.role,
        summary: input.jobDescription.summary,
        standardRequirements: input.jobDescription.standardRequirements,
        preferredRequirements: input.jobDescription.preferredRequirements,
        differentiatorRequirements: input.jobDescription.differentiatorRequirements,
        differentiatorSignals: input.jobDescription.differentiatorSignals ?? [],
      },
      userGoals: input.userGoals,
      workHistory: input.workHistory,
      approvedContent: input.approvedContent,
    };

    const result: any = await streamText({
      model: client.chat(OPENAI_CONFIG.MODEL),
      system: REQUIREMENT_ANALYSIS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildRequirementAnalysisUserPrompt(payload),
        },
      ],
      temperature: 0.1,
      maxTokens: 2000,
    } as any);

    let rawOutput = '';
    if (result?.textStream) {
      for await (const chunk of result.textStream as AsyncIterable<unknown>) {
        const token =
          typeof chunk === 'string'
            ? chunk
            : typeof chunk === 'object' && chunk !== null && 'text' in chunk
            ? (chunk as any).text
            : typeof chunk === 'object' && chunk !== null && 'value' in chunk
            ? (chunk as any).value
            : '';
        if (!token) continue;
        rawOutput += token;
      }
    }

    if (!rawOutput && typeof result?.text === 'string') {
      rawOutput = result.text;
    }

    if (!rawOutput || !rawOutput.trim()) {
      throw new Error('Requirement analysis returned empty response');
    }

    const cleaned = rawOutput
      .trim()
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      enhancedMatchData: Partial<EnhancedMatchData>;
    };

    return {
      enhancedMatchData: parsed.enhancedMatchData,
    };
  }

  /**
   * PHASE 2: Calculate Section Gaps (Parallel Call 3 of 3)
   * Slow 20-30s call for granular per-section feedback
   */
  private async calculateSectionGaps(input: {
    sections: CoverLetterDraftSection[];
    jobDescription: ParsedJobDescription;
  }): Promise<{
    enhancedMatchData: Partial<EnhancedMatchData>;
    ratingCriteria?: any[];
  }> {
    const apiKey =
      (import.meta.env?.VITE_OPENAI_API_KEY) ||
      (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) ||
      (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const client = createOpenAI({ apiKey });

    const payload = {
      draft: input.sections
        .sort((a, b) => a.order - b.order)
        .map(section => section.content.trim())
        .filter(Boolean)
        .join('\n\n'),
      sections: input.sections.map(section => ({
        id: section.id,
        slug: section.slug,
        title: section.title,
        content: section.content,
        requirementsMatched: section.metadata?.requirementsMatched ?? [],
        sectionType: section.slug,
      })),
      jobDescription: {
        company: input.jobDescription.company,
        role: input.jobDescription.role,
        summary: input.jobDescription.summary,
        standardRequirements: input.jobDescription.standardRequirements,
        preferredRequirements: input.jobDescription.preferredRequirements,
        differentiatorRequirements: input.jobDescription.differentiatorRequirements,
        differentiatorSignals: input.jobDescription.differentiatorSignals ?? [],
      },
    };

    const result: any = await streamText({
      model: client.chat(OPENAI_CONFIG.MODEL),
      system: SECTION_GAPS_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildSectionGapsUserPrompt(payload),
        },
      ],
      temperature: 0.1,
      maxTokens: 2500, // Keep output bounded to reduce latency + avoid long stalls
    } as any);

    let rawOutput = '';
    if (result?.textStream) {
      for await (const chunk of result.textStream as AsyncIterable<unknown>) {
        const token =
          typeof chunk === 'string'
            ? chunk
            : typeof chunk === 'object' && chunk !== null && 'text' in chunk
            ? (chunk as any).text
            : typeof chunk === 'object' && chunk !== null && 'value' in chunk
            ? (chunk as any).value
            : '';
        if (!token) continue;
        rawOutput += token;
      }
    }

    if (!rawOutput && typeof result?.text === 'string') {
      rawOutput = result.text;
    }

    if (!rawOutput || !rawOutput.trim()) {
      throw new Error('Section gaps returned empty response');
    }

    const cleaned = rawOutput
      .trim()
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed = JSON.parse(cleaned) as {
      enhancedMatchData: Partial<EnhancedMatchData>;
      ratingCriteria?: any[];
    };

    return {
      enhancedMatchData: parsed.enhancedMatchData,
      ratingCriteria: parsed.ratingCriteria,
    };
  }

  /**
   * PHASE 2: Calculate Content Standards (Parallel Call 4 of 4)
   * Evaluates sections and letter against content quality standards
   */
  private async calculateContentStandards(input: {
    sections: CoverLetterDraftSection[];
    jobDescription: ParsedJobDescription;
  }): Promise<ContentStandardsAnalysis | null> {
    const evaluationService = new ContentStandardsEvaluationService();

    if (!evaluationService.isAvailable()) {
      console.warn('[CoverLetterDraftService] Content standards evaluation unavailable (no API key)');
      return null;
    }

    try {
      // Prepare section metadata
      const sectionsMeta = extractSectionsMeta(input.sections);

      // Full letter text for letter-level evaluation
      const fullLetterText = input.sections
        .sort((a, b) => a.order - b.order)
        .map(section => section.content.trim())
        .filter(Boolean)
        .join('\n\n');

      // Calculate word count and paragraph count
      const wordCount = countWords(fullLetterText);
      const paragraphCount = input.sections.length;

      // Job description text for context
      const jobDescriptionText = `${input.jobDescription.company} - ${input.jobDescription.role}\n\n${input.jobDescription.summary}`;

      // Evaluate each section in parallel
      const perSectionPromises = input.sections.map(section => {
        const sectionType = mapDraftSectionType(section.type);
        return evaluationService.evaluateSection(
          section.id,
          section.content,
          sectionType,
          jobDescriptionText
        );
      });

      // Evaluate letter-level standards
      const perLetterPromise = evaluationService.evaluateLetter(
        fullLetterText,
        wordCount,
        paragraphCount
      );

      // Wait for all evaluations
      const [perSectionResults, perLetterResults] = await Promise.all([
        Promise.all(perSectionPromises),
        perLetterPromise,
      ]);

      // Filter out null section results (failed evaluations)
      const validPerSection: SectionStandardResult[] = perSectionResults.filter(
        (r): r is SectionStandardResult => r !== null
      );

      // Aggregate results
      const analysis = aggregateContentStandards(
        sectionsMeta,
        validPerSection,
        perLetterResults
      );

      console.log('[CoverLetterDraftService] Content standards calculated:', {
        overallScore: analysis.aggregated.overallScore,
        standardsEvaluated: analysis.aggregated.standards.length,
        sectionsEvaluated: validPerSection.length,
      });

      return analysis;
    } catch (error) {
      console.error('[CoverLetterDraftService] Content standards calculation failed:', error);
      return null;
    }
  }

  /**
   * Fetch a draft by ID (used to get updated metrics after background calculation)
   */
  async getDraft(draftId: string): Promise<CoverLetterDraft | null> {
    const { data, error } = await this.supabaseClient
      .from('cover_letters')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error || !data) {
      console.error('[CoverLetterDraftService] Failed to fetch draft:', error);
      return null;
    }

    const metrics = this.normaliseMatchMetrics(data.metrics);
    const atsScore = deriveAtsScore(metrics);
    
    return this.mapCoverLetterRow(data, metrics, atsScore);
  }

  /**
   * Update a draft record (used by the editor to persist section edits/reordering).
   * NOTE: This is intentionally lightweight: it persists the draft row, but does not
   * recompute Phase B metrics/gaps. Use `calculateMetricsForDraft` when needed.
   */
  async updateDraft(
    draftId: string,
    updates: {
      sections?: CoverLetterDraftSection[];
      status?: string;
      templateId?: string;
      jobDescriptionId?: string;
      llmFeedback?: Record<string, unknown>;
      analytics?: Record<string, unknown>;
    },
  ): Promise<CoverLetterDraft | null> {
    const payload: Record<string, unknown> = {
      updated_at: this.now().toISOString(),
    };
    if (updates.sections) payload.sections = updates.sections as unknown as Record<string, unknown>;
    if (updates.status) payload.status = updates.status;
    if (updates.templateId) payload.template_id = updates.templateId;
    if (updates.jobDescriptionId) payload.job_description_id = updates.jobDescriptionId;
    if (updates.llmFeedback) payload.llm_feedback = updates.llmFeedback;
    if (updates.analytics) payload.analytics = updates.analytics;

    const { error } = await this.supabaseClient.from('cover_letters').update(payload).eq('id', draftId);
    if (error) {
      throw new Error(error.message || 'Unable to update draft.');
    }

    return this.getDraft(draftId);
  }

  async generateDraft(options: DraftGenerationOptions): Promise<DraftGenerationResult> {
    const { userId, templateId, jobDescriptionId, onProgress, onSectionBuilt, signal } = options;
    await this.assertUserNotFlagged(userId);

    this.emitProgress(onProgress, 'jd_parse', 'Loading job description…');
    const jobDescription = await this.fetchJobDescription(userId, jobDescriptionId);

    this.emitProgress(onProgress, 'content_match', 'Loading content libraries…');
    const [templateRow, stories, savedSections, userGoals, workHistory] = await Promise.all([
      this.fetchTemplate(userId, templateId),
      this.fetchStories(userId),
      this.fetchSavedSections(userId),
      UserPreferencesService.loadGoals(userId),
      this.fetchWorkHistory(userId),
    ]);
    // Reuse stories data instead of fetching again
    const approvedContent = stories.map(s => ({ id: s.id, title: s.title, content: s.content }));

    const templateSections = this.normaliseTemplateSections(templateRow.sections);

    const { sections, matchState } = this.buildSections({
      templateSections,
      stories,
      savedSections,
      jobDescription,
      userGoals,
      onSectionBuilt, // Pass through streaming callback
    });

    this.emitProgress(onProgress, 'metrics', 'Calculating match metrics…');

    /**
     * METRICS CALCULATION WITH RETRY + GRACEFUL FALLBACK
     * 
     * We attempt to calculate metrics via LLM with exponential backoff retry.
     * If all retries fail, we provide sensible default metrics so the user
     * still gets a draft (resilience over perfection).
     * 
     * Retry strategy:
     * - Attempt 1: Immediate
     * - Attempt 2: Wait 1s
     * - Attempt 3: Wait 2s
     * - Attempt 4: Wait 4s
     * - If all fail: Use fallback defaults
     */
    
    // Initialize evals logger for Phase B (draft generation)
    const evalsLogger = new EvalsLogger({
      userId,
      stage: 'coverLetter.phaseB.metrics',
    });
    evalsLogger.start();
    
    let metricResult;
    let lastError: Error | null = null;
    let attemptCount = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      attemptCount++;
      try {
        if (attempt > 0) {
          const delay = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
          this.emitProgress(
            onProgress, 
            'metrics', 
            `AI analysis temporarily unavailable. Retrying (${attempt + 1}/${MAX_RETRIES + 1})…`
          );
          await sleep(delay);
        }

        metricResult = await this.metricsStreamer({
          draft: sections,
          jobDescription,
          userGoals,
          workHistory,
          approvedContent,
          signal,
          // Don't emit on every token - causes infinite progress list
          onToken: undefined,
        });
        
        // Log success
        await evalsLogger.success({
          model: 'gpt-4',
          result_subset: {
            attemptCount,
            usedFallback: false,
            metricsCalculated: metricResult.metrics.length,
            atsScore: metricResult.atsScore,
          },
        });
        
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error during metrics calculation');
        
        // Log detailed error for debugging
        console.warn(
          `[CoverLetterDraftService] Metrics attempt ${attempt + 1}/${MAX_RETRIES + 1} failed:`,
          {
            errorMessage: lastError.message,
            errorName: lastError.name,
            attemptNumber: attempt + 1,
          }
        );
        
        // If this was the last attempt, use fallback metrics instead of throwing
        if (attempt === MAX_RETRIES) {
          console.warn(
            '[CoverLetterDraftService] All metric calculation attempts failed. Using fallback metrics.',
            lastError
          );
          this.emitProgress(
            onProgress, 
            'metrics', 
            'Using estimated metrics (AI analysis unavailable)'
          );
          
          // GRACEFUL FALLBACK: Provide default metrics
          metricResult = this.createFallbackMetrics();
          
          // Log failure with fallback used
          await evalsLogger.success({
            model: 'gpt-4',
            result_subset: {
              attemptCount,
              usedFallback: true,
              fallbackReason: lastError.message,
            },
          });
          
          break;
        }
      }
    }

    if (!metricResult) {
      // This should never happen due to fallback, but TypeScript needs it
      metricResult = this.createFallbackMetrics();
      
      // Log unexpected fallback
      await evalsLogger.success({
        model: 'gpt-4',
        result_subset: {
          attemptCount,
          usedFallback: true,
          fallbackReason: 'Unexpected null result',
        },
      });
    }

    const differentiatorSummary = this.buildDifferentiatorSummary(jobDescription, sections);

    const insertPayload: Database['public']['Tables']['cover_letters']['Insert'] = {
      user_id: userId,
      template_id: templateId,
      job_description_id: jobDescriptionId,
      status: 'draft',
      sections: sections as unknown as Record<string, unknown>,
      llm_feedback: {
        generatedAt: this.now().toISOString(),
        metrics: metricResult.raw,
        enhancedMatchData: metricResult.enhancedMatchData, // Agent C: store enhanced analysis
      },
      metrics: metricResult.metrics as unknown as Record<string, unknown>,
      differentiator_summary: differentiatorSummary as unknown as Record<string, unknown>,
      analytics: {
        atsScore: metricResult.atsScore,
        generatedAt: this.now().toISOString(),
      } as unknown as Record<string, unknown>,
    };

    const { data: draftRow, error } = await this.supabaseClient
      .from('cover_letters')
      .insert(insertPayload)
      .select()
      .single();

    if (error || !draftRow) {
      console.error('[CoverLetterDraftService] Failed to store draft:', error);
      throw new Error('Unable to create cover letter draft. Please try again.');
    }

    const workpadRow = await this.upsertWorkpad({
      draftId: draftRow.id,
      userId,
      jobDescriptionId,
      matchState,
      sections,
      phase: 'metrics',
    });

    const draft = this.mapCoverLetterRow(draftRow, metricResult.metrics, metricResult.atsScore);

    // TODO: Add draft generation logging when HILDraftEvent is implemented
    // For now, draft generation logging is deferred per merged evaluation logging work

    // Non-blocking: fill any [LLM:...] / [SLOT:...] placeholders post-save.
    // Pass already-fetched data to avoid redundant DB queries
    this.fillTemplateSlotsForDraft(draftRow.id, userId, jobDescriptionId, onProgress, {
      stories,
      jobDescription,
    }).catch(error => {
      console.error('[generateDraft] Background template slot fill failed:', error);
    });

    this.emitProgress(onProgress, 'gap_detection', 'Draft ready for refinement.');

    return {
      draft: {
        ...draft,
        differentiatorSummary,
      },
      workpad: workpadRow,
    };
  }

  async calculateMatchMetrics(
    draft: CoverLetterDraft,
    jobDescription: ParsedJobDescription,
    userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>>,
    options: { signal?: AbortSignal; onToken?: (token: string) => void } = {},
  ): Promise<CoverLetterMatchMetric[]> {
    const result = await this.metricsStreamer({
      draft: draft.sections,
      jobDescription,
      userGoals,
      signal: options.signal,
      onToken: options.onToken,
    });

    await this.supabaseClient
      .from('cover_letters')
      .update({
        llm_feedback: {
          generatedAt: this.now().toISOString(),
          metrics: result.raw,
        },
        metrics: result.metrics as unknown as Record<string, unknown>,
        differentiator_summary: draft.differentiatorSummary as unknown as Record<string, unknown>,
        analytics: {
          atsScore: result.atsScore,
          generatedAt: this.now().toISOString(),
        } as unknown as Record<string, unknown>,
        updated_at: this.now().toISOString(),
      })
      .eq('id', draft.id);

    return result.metrics;
  }

  /**
   * Refresh gap detection by comparing draft sections against JD requirements.
   * Updates hasGaps and gapIds for each section based on unmatched requirements.
   */
  private refreshGapDetection(
    sections: CoverLetterDraftSection[],
    jobDescription: ParsedJobDescription,
  ): CoverLetterDraftSection[] {
    const allRequirements = [
      ...jobDescription.standardRequirements,
      ...jobDescription.differentiatorRequirements,
      ...jobDescription.preferredRequirements,
    ];

    // Build a map of requirement IDs to their details for gap tracking
    const requirementMap = new Map(
      allRequirements.map(req => [req.id, req]),
    );

    // Track which requirements are matched across all sections
    const matchedRequirementIds = new Set(
      sections.flatMap(section => section.metadata.requirementsMatched),
    );

    // Identify unmatched core and differentiator requirements (these are gaps)
    const coreRequirementIds = new Set(
      jobDescription.standardRequirements.map(req => req.id),
    );
    const differentiatorRequirementIds = new Set(
      jobDescription.differentiatorRequirements.map(req => req.id),
    );

    const unmatchedCoreRequirements = jobDescription.standardRequirements
      .filter(req => !matchedRequirementIds.has(req.id))
      .map(req => req.id);

    const unmatchedDifferentiatorRequirements = jobDescription.differentiatorRequirements
      .filter(req => !matchedRequirementIds.has(req.id))
      .map(req => req.id);

    // Update each section with gap information
    return sections.map(section => {
      const sectionMatchedIds = new Set(section.metadata.requirementsMatched);

      // Find requirements that should be covered by this section but aren't
      // Priority: differentiator > core > preferred
      const sectionGapIds: string[] = [];

      // Check if section should address differentiators (if it's a dynamic section)
      if (section.type === 'dynamic-story' || section.type === 'dynamic-saved') {
        // Add unmatched differentiators as potential gaps
        sectionGapIds.push(...unmatchedDifferentiatorRequirements.slice(0, 2)); // Limit to 2 per section
      }

      // Add unmatched core requirements if section is meant for core content
      if (sectionGapIds.length < 3 && unmatchedCoreRequirements.length > 0) {
        const remaining = unmatchedCoreRequirements
          .filter(id => !sectionGapIds.includes(id))
          .slice(0, 3 - sectionGapIds.length);
        sectionGapIds.push(...remaining);
      }

      const hasGaps = sectionGapIds.length > 0;

      return {
        ...section,
        status: {
          ...section.status,
          hasGaps,
          gapIds: sectionGapIds,
        },
      };
    });
  }

  /**
   * Save Match with Strengths (MwS) data to the draft
   * Called after A-phase streaming completes to persist the data
   */
  async saveMwsData(
    draftId: string,
    mwsData: {
      summaryScore: 0 | 1 | 2 | 3;
      details: Array<{
        label: string;
        strengthLevel: 'strong' | 'moderate' | 'light';
        explanation: string;
      }>;
    },
  ): Promise<void> {
    // Fetch current llm_feedback to merge
    const { data: draftRow, error: fetchError } = await this.supabaseClient
      .from('cover_letters')
      .select('llm_feedback')
      .eq('id', draftId)
      .single();

    if (fetchError) {
      console.error('[CoverLetterDraftService] Failed to fetch draft for MwS update:', fetchError);
      return; // Don't throw - this is non-critical
    }

    const currentFeedback = (draftRow?.llm_feedback as Record<string, unknown>) ?? {};

    // Merge MwS data into llm_feedback
    const { error: updateError } = await this.supabaseClient
      .from('cover_letters')
      .update({
        llm_feedback: {
          ...currentFeedback,
          mws: mwsData,
        } as unknown as Record<string, unknown>,
        updated_at: this.now().toISOString(),
      })
      .eq('id', draftId);

    if (updateError) {
      console.error('[CoverLetterDraftService] Failed to save MwS data:', updateError);
    } else {
      console.log('[CoverLetterDraftService] MwS data saved successfully for draft:', draftId);
    }
  }

  async updateDraftSection(
    draftId: string,
    sectionId: string,
    newContent: string,
  ): Promise<CoverLetterDraft> {
    const { data: draftRow, error } = await this.supabaseClient
      .from('cover_letters')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error || !draftRow) {
      throw new Error('Cover letter draft not found.');
    }

    const sections = this.normaliseDraftSections(draftRow.sections);
    const index = sections.findIndex(section => section.id === sectionId);
    if (index === -1) {
      throw new Error('Cover letter section not found.');
    }

    const jobDescription = await this.fetchJobDescription(
      draftRow.user_id,
      draftRow.job_description_id,
    );

    // Recompute requirements matched for the updated section
    const updatedRequirementsMatched = this.matchRequirements(newContent, jobDescription);

    const updatedSection: CoverLetterDraftSection = {
      ...sections[index],
      content: newContent,
      metadata: {
        ...sections[index].metadata,
        requirementsMatched: updatedRequirementsMatched,
        wordCount: countWords(newContent),
      },
      status: {
        ...sections[index].status,
        isModified: true,
        lastUpdatedAt: this.now().toISOString(),
      },
    };

    const nextSections = [...sections];
    nextSections[index] = updatedSection;

    // Refresh gap detection after content update
    const sectionsWithGaps = this.refreshGapDetection(nextSections, jobDescription);
    const differentiatorSummary = this.buildDifferentiatorSummary(jobDescription, sectionsWithGaps);

    // Compute requirement coverage for analytics
    const allMatchedIds = new Set(
      sectionsWithGaps.flatMap(s => s.metadata.requirementsMatched),
    );
    const coreMet = jobDescription.standardRequirements.filter(req =>
      allMatchedIds.has(req.id),
    ).length;
    const differentiatorAddressed = jobDescription.differentiatorRequirements.filter(req =>
      allMatchedIds.has(req.id),
    ).length;

    const { data: updatedRow, error: updateError } = await this.supabaseClient
      .from('cover_letters')
      .update({
        sections: sectionsWithGaps as unknown as Record<string, unknown>,
        differentiator_summary: differentiatorSummary as unknown as Record<string, unknown>,
        analytics: {
          ...((draftRow.analytics as Record<string, unknown>) ?? {}),
          requirementCoverage: {
            core: {
              met: coreMet,
              total: jobDescription.standardRequirements.length,
            },
            differentiators: {
              addressed: differentiatorAddressed,
              total: jobDescription.differentiatorRequirements.length,
            },
          },
        } as unknown as Record<string, unknown>,
        updated_at: this.now().toISOString(),
      })
      .eq('id', draftId)
      .select()
      .single();

    if (updateError || !updatedRow) {
      throw new Error('Unable to update cover letter section.');
    }

    await this.upsertWorkpad({
      draftId,
      userId: updatedRow.user_id,
      jobDescriptionId: updatedRow.job_description_id,
      matchState: this.buildMatchState(sectionsWithGaps),
      sections: sectionsWithGaps,
      phase: 'content_match',
    });

    const metrics = this.normaliseMatchMetrics(updatedRow.metrics);
    const atsMetric = metrics.find(metric => metric.key === 'ats');
    const atsScore =
      atsMetric && atsMetric.type === 'score'
        ? atsMetric.value
        : atsMetric && atsMetric.type === 'strength'
        ? strengthToScore(atsMetric.strength)
        : 0;

    return {
      ...this.mapCoverLetterRow(updatedRow, metrics, atsScore),
      sections: sectionsWithGaps,
      differentiatorSummary,
    };
  }

  async finalizeDraft(options: {
    draftId: string;
    sections: CoverLetterDraftSection[];
  }): Promise<{ draft: CoverLetterDraft; workpad: DraftWorkpad }> {
    const { draftId, sections } = options;

    const { data: draftRow, error } = await this.supabaseClient
      .from('cover_letters')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error || !draftRow) {
      throw new Error('Cover letter draft not found.');
    }

    const jobDescription = await this.fetchJobDescription(
      draftRow.user_id,
      draftRow.job_description_id,
    );

    const normalizedSections = this.normaliseFinalSections(sections, jobDescription);
    const sectionsWithGaps = this.refreshGapDetection(normalizedSections, jobDescription);
    const differentiatorSummary = this.buildDifferentiatorSummary(jobDescription, sectionsWithGaps);

    const differentiatorWeights = new Map(
      jobDescription.differentiatorRequirements.map(req => [req.id, req]),
    );

    const matchState = this.buildMatchState(sectionsWithGaps, differentiatorWeights);

    const metrics = this.normaliseMatchMetrics(draftRow.metrics);
    const atsMetric = metrics.find(metric => metric.key === 'ats');
    const ratingMetric = metrics.find(metric => metric.key === 'rating');

    const atsScore =
      atsMetric && atsMetric.type === 'score'
        ? Math.round(atsMetric.value)
        : atsMetric && atsMetric.type === 'strength'
        ? strengthToScore(atsMetric.strength)
        : 0;

    const finalizedAt = this.now().toISOString();
    const totalWordCount = sectionsWithGaps.reduce(
      (acc, section) => acc + (section.metadata?.wordCount ?? 0),
      0,
    );
    const differentiatorCoverage = {
      addressed: differentiatorSummary.filter(item => item.status === 'addressed').length,
      missing: differentiatorSummary.filter(item => item.status !== 'addressed').length,
      total: differentiatorSummary.length,
    };

    // Compute final requirement coverage
    const allMatchedIds = new Set(
      sectionsWithGaps.flatMap(s => s.metadata.requirementsMatched),
    );
    const coreMet = jobDescription.standardRequirements.filter(req =>
      allMatchedIds.has(req.id),
    ).length;
    const differentiatorAddressed = jobDescription.differentiatorRequirements.filter(req =>
      allMatchedIds.has(req.id),
    ).length;

    const existingAnalytics =
      draftRow.analytics && typeof draftRow.analytics === 'object'
        ? (draftRow.analytics as CoverLetterAnalytics)
        : {};

    const analyticsPayload: CoverLetterAnalytics & {
      finalizedAt: string;
      wordCount: number;
      sections: number;
      differentiatorCoverage: typeof differentiatorCoverage;
    } = {
      ...existingAnalytics,
      atsScore,
      finalizedAt,
      wordCount: totalWordCount,
      sections: normalizedSections.length,
      differentiatorCoverage,
    };

    if (ratingMetric) {
      if (ratingMetric.type === 'score') {
        analyticsPayload.overallScore = Math.round(ratingMetric.value);
      } else if (ratingMetric.type === 'strength') {
        analyticsPayload.metricSummary = {
          ...(existingAnalytics.metricSummary ?? {}),
          ratingStrength: ratingMetric.strength,
        };
      }
    }

    const { data: updatedRow, error: updateError } = await this.supabaseClient
      .from('cover_letters')
      .update({
        sections: sectionsWithGaps as unknown as Record<string, unknown>,
        differentiator_summary: differentiatorSummary as unknown as Record<string, unknown>,
        analytics: {
          ...analyticsPayload,
          requirementCoverage: {
            core: {
              met: coreMet,
              total: jobDescription.standardRequirements.length,
            },
            differentiators: {
              addressed: differentiatorAddressed,
              total: jobDescription.differentiatorRequirements.length,
            },
          },
        } as unknown as Record<string, unknown>,
        status: 'finalized',
        finalized_at: finalizedAt,
        applied_at: finalizedAt,
        updated_at: finalizedAt,
      })
      .eq('id', draftId)
      .select()
      .single();

    if (updateError || !updatedRow) {
      throw new Error('Unable to finalize cover letter draft.');
    }

    const workpadRow = await this.upsertWorkpad({
      draftId,
      userId: updatedRow.user_id,
      jobDescriptionId: updatedRow.job_description_id,
      matchState,
      sections: sectionsWithGaps,
      phase: 'finalized',
    });

    const updatedMetrics = this.normaliseMatchMetrics(updatedRow.metrics);
    const updatedAtsMetric = updatedMetrics.find(metric => metric.key === 'ats');
    const updatedAtsScore =
      updatedAtsMetric && updatedAtsMetric.type === 'score'
        ? Math.round(updatedAtsMetric.value)
        : updatedAtsMetric && updatedAtsMetric.type === 'strength'
        ? strengthToScore(updatedAtsMetric.strength)
        : atsScore;

    const draft = {
      ...this.mapCoverLetterRow(updatedRow, updatedMetrics, updatedAtsScore),
      sections: sectionsWithGaps,
      differentiatorSummary,
    };

    return {
      draft,
      workpad: workpadRow,
    };
  }

  private emitProgress(
    onProgress: DraftGenerationOptions['onProgress'],
    phase: DraftGenerationPhase,
    message: string,
    soft = false,
  ) {
    if (!onProgress) return;
    const update: DraftGenerationProgressUpdate = {
      phase,
      message,
      timestamp: Date.now(),
    };
    if (!soft) {
      onProgress(update);
    } else {
      // Soft updates (token streaming) should not spam; throttle outside if needed.
      onProgress(update);
    }
  }

  private async fetchJobDescription(
    userId: string,
    jobDescriptionId: string,
  ): Promise<ParsedJobDescription> {
    const record = await this.jobDescriptionService.getJobDescription(userId, jobDescriptionId);
    if (!record) {
      throw new Error('Job description not found.');
    }

    return {
      company: record.company,
      role: record.role,
      summary: record.summary,
      standardRequirements: record.standardRequirements,
      preferredRequirements: record.preferredRequirements,
      differentiatorRequirements: record.differentiatorRequirements,
      boilerplateSignals: record.boilerplateSignals ?? [],
      differentiatorSignals: record.differentiatorSignals ?? [],
      keywords: record.keywords,
      structuredInsights: record.structuredInsights ?? {},
      structuredData: record.structuredData ?? {},
      analysis: record.analysis ?? {},
      differentiatorNotes: record.differentiatorNotes,
      rawSections: record.rawSections ?? [],
    };
  }

  private async fetchTemplate(userId: string, templateId: string): Promise<TemplateRow> {
    const { data, error } = await this.supabaseClient
      .from('cover_letter_templates')
      .select('*')
      .eq('user_id', userId)
      .eq('id', templateId)
      .single();

    if (error || !data) {
      throw new Error('Cover letter template not found.');
    }

    return data;
  }

  private async fetchStories(userId: string): Promise<StoryRow[]> {
    // PERF: Check cache first
    if (isCacheValid(userContextCache.stories, userId)) {
      console.log(`[CoverLetterDraftService] Stories cache HIT (${userContextCache.stories.data.length} items)`);
      return userContextCache.stories.data;
    }

    // Check for synthetic user context and filter by source_id if needed
    let allowedSourceIds: string[] | undefined;
    try {
      const { SyntheticUserService } = await import('./syntheticUserService');
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser?.profileId) {
        const profileId = syntheticContext.currentUser.profileId.toUpperCase();
        
        // Find sources matching the profile (e.g., P01_resume.txt, P01-cover-letter.txt)
        const { data: sourceRows } = await this.supabaseClient
          .from('sources')
          .select('id, file_name')
          .eq('user_id', userId);
        
        if (sourceRows && sourceRows.length > 0) {
          const matchingSources = sourceRows.filter((row: any) => {
            const fileName = (row.file_name || '').toUpperCase();
            return (
              fileName.startsWith(`${profileId}_`) ||
              fileName.startsWith(`${profileId}-`) ||
              fileName.startsWith(`${profileId} `) ||
              fileName.startsWith(`${profileId}.`)
            );
          });
          
          if (matchingSources.length > 0) {
            allowedSourceIds = matchingSources.map((s: any) => s.id);
            console.log(`[CoverLetterDraftService] Filtering stories by ${allowedSourceIds.length} source IDs for profile ${profileId}`);
          } else {
            console.warn(`[CoverLetterDraftService] No sources found matching profile ${profileId}`);
          }
        }
      }
    } catch (syntheticError) {
      // If synthetic service fails, continue without filtering (non-blocking)
      console.warn('[CoverLetterDraftService] Unable to load synthetic user context:', syntheticError);
    }

    let query = this.supabaseClient
      .from('stories')
      .select('*')
      .eq('user_id', userId);
      // Note: No longer filtering by status - all stories are available for matching

    // Filter by source_id if synthetic profile is active
    if (allowedSourceIds && allowedSourceIds.length > 0) {
      query = query.in('source_id', allowedSourceIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load approved content:', error);
      return [];
    }

    const stories = data ?? [];

    // Include story variations (content_variations) as additional story candidates.
    // This makes HIL-generated story variations eligible for selection in subsequent drafts.
    const storiesWithVariations = await this.mergeStoryVariations(userId, stories);
    
    // PERF: Update cache
    userContextCache.stories = {
      data: storiesWithVariations,
      fetchedAt: Date.now(),
      userId,
    };
    console.log(`[CoverLetterDraftService] Stories cache MISS - fetched ${stories.length} items${allowedSourceIds ? ` (filtered by profile)` : ''}${storiesWithVariations.length !== stories.length ? ` (+${storiesWithVariations.length - stories.length} variations)` : ''}`);
    
    return storiesWithVariations;
  }

  private async fetchStoryVariations(userId: string): Promise<any[]> {
    if (isCacheValid(userContextCache.storyVariations, userId)) {
      return userContextCache.storyVariations.data;
    }

    const { data, error } = await this.supabaseClient
      .from('content_variations')
      .select('*')
      .eq('user_id', userId)
      .eq('parent_entity_type', 'approved_content');

    if (error) {
      console.warn('[CoverLetterDraftService] Failed to load content variations:', error);
      userContextCache.storyVariations = { data: [], fetchedAt: Date.now(), userId };
      return [];
    }

    const variations = data ?? [];
    userContextCache.storyVariations = { data: variations, fetchedAt: Date.now(), userId };
    return variations;
  }

  private async mergeStoryVariations(userId: string, stories: StoryRow[]): Promise<StoryRow[]> {
    if (stories.length === 0) return stories;

    const variations = await this.fetchStoryVariations(userId);
    if (!variations.length) return stories;

    const storyById = new Map(stories.map(story => [story.id, story]));
    const merged: StoryRow[] = [...stories];

    for (const variation of variations) {
      const parentId = (variation as any).parent_entity_id as string | undefined;
      if (!parentId) continue;
      const parent = storyById.get(parentId);
      if (!parent) continue;

      const content = String((variation as any).content ?? '').trim();
      if (!content) continue;

      const gapTags = Array.isArray((variation as any).gap_tags) ? (variation as any).gap_tags : [];
      const targetJobTitle = typeof (variation as any).target_job_title === 'string'
        ? (variation as any).target_job_title.trim()
        : '';
      const targetCompany = typeof (variation as any).target_company === 'string'
        ? (variation as any).target_company.trim()
        : '';
      const parentTags = Array.isArray((parent as any).tags) ? (parent as any).tags : [];
      const tags = Array.from(new Set([
        ...parentTags,
        ...gapTags,
        ...(targetJobTitle ? [targetJobTitle] : []),
        ...(targetCompany ? [targetCompany] : []),
      ]));

      // Create a synthetic StoryRow candidate:
      // - Keep `id` as the parent story id so downstream "source.entityId" remains a story id.
      // - Override content/title/tags to reflect the variation.
      merged.push({
        ...(parent as any),
        id: parent.id,
        title: (variation as any).title || parent.title,
        content,
        tags,
        times_used: (variation as any).times_used ?? parent.times_used,
        last_used: (variation as any).last_used ?? parent.last_used,
      } as StoryRow);
    }

    return merged;
  }

  private async fetchSavedSections(userId: string): Promise<SavedSectionRow[]> {
    // PERF: Check cache first
    if (isCacheValid(userContextCache.savedSections, userId)) {
      console.log(`[CoverLetterDraftService] SavedSections cache HIT (${userContextCache.savedSections.data.length} items)`);
      return userContextCache.savedSections.data;
    }

    // Check for synthetic user context and filter by source_id if needed
    let allowedSourceIds: string[] | undefined;
    try {
      const { SyntheticUserService } = await import('./syntheticUserService');
      const syntheticService = new SyntheticUserService();
      const syntheticContext = await syntheticService.getSyntheticUserContext();
      
      if (syntheticContext.isSyntheticTestingEnabled && syntheticContext.currentUser?.profileId) {
        const profileId = syntheticContext.currentUser.profileId.toUpperCase();
        
        // Find sources matching the profile (e.g., P01_resume.txt, P01-cover-letter.txt)
        const { data: sourceRows } = await this.supabaseClient
          .from('sources')
          .select('id, file_name')
          .eq('user_id', userId);
        
        if (sourceRows && sourceRows.length > 0) {
          const matchingSources = sourceRows.filter((row: any) => {
            const fileName = (row.file_name || '').toUpperCase();
            return (
              fileName.startsWith(`${profileId}_`) ||
              fileName.startsWith(`${profileId}-`) ||
              fileName.startsWith(`${profileId} `) ||
              fileName.startsWith(`${profileId}.`)
            );
          });
          
          if (matchingSources.length > 0) {
            allowedSourceIds = matchingSources.map((s: any) => s.id);
            console.log(`[CoverLetterDraftService] Filtering saved sections by ${allowedSourceIds.length} source IDs for profile ${profileId}`);
          } else {
            console.warn(`[CoverLetterDraftService] No sources found matching profile ${profileId} for saved sections`);
          }
        }
      }
    } catch (syntheticError) {
      // If synthetic service fails, continue without filtering (non-blocking)
      console.warn('[CoverLetterDraftService] Unable to load synthetic user context for saved sections:', syntheticError);
    }

    let query = this.supabaseClient
      .from('saved_sections')
      .select('*')
      .eq('user_id', userId);

    // Filter by source_id if synthetic profile is active
    if (allowedSourceIds && allowedSourceIds.length > 0) {
      query = query.in('source_id', allowedSourceIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load saved sections:', error);
      return [];
    }

    const savedSections = data ?? [];
    
    // PERF: Update cache
    userContextCache.savedSections = {
      data: savedSections,
      fetchedAt: Date.now(),
      userId,
    };
    console.log(`[CoverLetterDraftService] SavedSections cache MISS - fetched ${savedSections.length} items${allowedSourceIds ? ` (filtered by profile)` : ''}`);
    
    return savedSections;
  }

  /**
   * Fetch user's work history for enhanced match analysis
   */
  private async fetchWorkHistory(userId: string): Promise<Array<{
    id: string;
    company: string;
    title: string;
    description: string;
    achievements: string[];
  }>> {
    // PERF: Check cache first
    if (isCacheValid(userContextCache.workHistory, userId)) {
      console.log(`[CoverLetterDraftService] WorkHistory cache HIT (${userContextCache.workHistory.data.length} items)`);
      return userContextCache.workHistory.data;
    }

    const { data, error } = await this.supabaseClient
      .from('work_items')
      .select('id, company:companies(name), title, description, achievements')
      .eq('user_id', userId);

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load work history:', error);
      return [];
    }

    const workHistory = (data ?? []).map(item => ({
      id: item.id,
      company: (item.company as any)?.name || 'Unknown',
      title: item.title || '',
      description: item.description || '',
      achievements: Array.isArray(item.achievements) ? item.achievements as string[] : [],
    }));

    // PERF: Update cache
    userContextCache.workHistory = {
      data: workHistory,
      fetchedAt: Date.now(),
      userId,
    };
    console.log(`[CoverLetterDraftService] WorkHistory cache MISS - fetched ${workHistory.length} items`);

    return workHistory;
  }

  /**
   * Fetch user's approved content (stories) for enhanced match analysis
   */
  private async fetchStoriesForMatching(userId: string): Promise<Array<{
    id: string;
    title: string;
    content: string;
  }>> {
    // PERF: Check cache first
    if (isCacheValid(userContextCache.approvedContent, userId)) {
      console.log(`[CoverLetterDraftService] ApprovedContent cache HIT (${userContextCache.approvedContent.data.length} items)`);
      return userContextCache.approvedContent.data;
    }

    const { data, error } = await this.supabaseClient
      .from('stories')
      .select('id, title, content')
      .eq('user_id', userId);

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load approved content:', error);
      return [];
    }

    const approvedContent = (data ?? []).map(item => ({
      id: item.id,
      title: item.title || '',
      content: item.content || '',
    }));

    // PERF: Update cache
    userContextCache.approvedContent = {
      data: approvedContent,
      fetchedAt: Date.now(),
      userId,
    };
    console.log(`[CoverLetterDraftService] ApprovedContent cache MISS - fetched ${approvedContent.length} items`);

    return approvedContent;
  }

  private normaliseTemplateSections(sections: TemplateRow['sections']): CoverLetterSection[] {
    if (Array.isArray(sections)) {
      return sections as CoverLetterSection[];
    }

    if (sections && typeof sections === 'object' && 'data' in (sections as any)) {
      const maybeData = (sections as any).data;
      if (Array.isArray(maybeData)) {
        return maybeData as CoverLetterSection[];
      }
    }

    return [];
  }

  private normaliseDraftSections(sections: CoverLetterRow['sections']): CoverLetterDraftSection[] {
    if (Array.isArray(sections)) {
      return sections as CoverLetterDraftSection[];
    }

    if (sections && typeof sections === 'object') {
      const maybeArray = Object.values(sections);
      if (Array.isArray(maybeArray)) {
        return maybeArray as CoverLetterDraftSection[];
      }
    }

    return [];
  }

  private buildSections(input: {
    templateSections: CoverLetterSection[];
    stories: StoryRow[];
    savedSections: SavedSectionRow[];
    jobDescription: ParsedJobDescription;
    userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>> | null;
    onSectionBuilt?: (section: CoverLetterDraftSection, index: number, total: number) => void;
  }): { sections: CoverLetterDraftSection[]; matchState: Record<string, unknown> } {
    const { templateSections, stories, savedSections, jobDescription, userGoals, onSectionBuilt } = input;
    const nowIso = this.now().toISOString();
    const usedStoryIds = new Set<string>();
    const includeStorySelectionDiagnostics =
      Boolean((import.meta as any)?.env?.DEV) ||
      (import.meta as any)?.env?.VITE_COVER_LETTER_STORY_SELECTION_DIAGNOSTICS === '1' ||
      (typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'development' ||
          process.env.COVER_LETTER_STORY_SELECTION_DIAGNOSTICS === '1'));

    console.log(`[CoverLetterDraftService] buildSections: ${templateSections.length} template sections, ${stories.length} stories, ${savedSections.length} saved sections`);
    
    // Log dynamic sections
    const dynamicSections = templateSections.filter(s => !s.isStatic);
    console.log(`[CoverLetterDraftService] buildSections: ${dynamicSections.length} dynamic sections:`, dynamicSections.map(s => ({ title: s.title, contentType: s.contentType })));

    const differentiatorWeights = new Map(
      jobDescription.differentiatorRequirements.map(req => [req.id, req]),
    );

    const sectionResults: CoverLetterDraftSection[] = templateSections
      .sort((a, b) => a.order - b.order)
      .map((section, index) => {
        const slug = slugify(section.title || `section-${index + 1}`, `section-${index + 1}`);
        const sectionId = `${slug}-${index + 1}`;

        let builtSection: CoverLetterDraftSection;

        if (section.isStatic) {
          // IMPORTANT: For static sections, `staticContent` in the template can drift from the
          // latest `saved_sections` content. If a `savedSectionId` is present, treat the saved
          // section as the source of truth so edits automatically reflect in new drafts.
          const normalize = (text: string) => text.replace(/\s+/g, ' ').trim().toLowerCase();

          let rawContent = section.staticContent || '';
          const savedSectionId = (section as any).savedSectionId as string | undefined;
          const linkedSaved = savedSectionId
            ? savedSections.find(candidate => candidate.id === savedSectionId)
            : undefined;

          if (linkedSaved?.content) {
            rawContent = linkedSaved.content;
          } else if (rawContent) {
            const normalized = normalize(rawContent);
            const matched = normalized
              ? savedSections.find(candidate => normalize(String(candidate.content || '')) === normalized)
              : undefined;
            if (matched?.content) {
              rawContent = matched.content;
            }
          }

          const content = this.applyTemplateTokens(rawContent, jobDescription);
          builtSection = this.createSection({
            id: sectionId,
            slug,
            title: section.title || `Section ${index + 1}`,
            templateSectionId: section.id,
            type: this.resolveSectionType(section),
            order: index + 1,
            content,
            source: { kind: 'template_static', entityId: linkedSaved?.id ?? null },
            requirementsMatched: [],
            tags: [],
            nowIso,
          });
        } else if (section.contentType === 'saved') {
          const bestSaved = this.pickBestSavedSection(section, savedSections, jobDescription);
          if (bestSaved) {
            const content = this.applyTemplateTokens(bestSaved.content || '', jobDescription);
            const requirementsMatched = this.matchRequirements(content, jobDescription);
            builtSection = this.createSection({
              id: sectionId,
              slug,
              title: section.title || bestSaved.title,
              templateSectionId: section.id,
              type: this.resolveSectionType(section),
              order: index + 1,
              content,
              source: { kind: 'saved_section', entityId: bestSaved.id },
              requirementsMatched,
              tags: bestSaved.tags ?? [],
              nowIso,
            });
          } else {
            const { story: bestStory, diagnostics } = this.pickBestStory(
              section,
              stories,
              jobDescription,
              userGoals,
              { usedStoryIds },
          );
          if (bestStory && bestStory.content?.trim()) {
            // Only use story if it has actual content
            const content = this.applyTemplateTokens(bestStory.content, jobDescription);
            const requirementsMatched = this.matchRequirements(content, jobDescription);
            usedStoryIds.add(bestStory.id);
            builtSection = this.createSection({
              id: sectionId,
              slug,
              title: section.title || bestStory.title || 'Experience Highlight',
              templateSectionId: section.id,
              type: this.resolveSectionType(section),
              order: index + 1,
              content,
              source: { kind: 'work_story', entityId: bestStory.id },
              requirementsMatched,
              tags: bestStory.tags ?? [],
              storySelection: includeStorySelectionDiagnostics ? diagnostics : undefined,
              nowIso,
              });
            } else {
              // No story found - provide helpful fallback message
              const hasStories = stories.length > 0;
              const fallbackContent = hasStories
                ? 'None of your existing stories were a strong enough match for this section based on the job description. Consider adding a story that better aligns with the role requirements, or use the "Generate Content" button to create new content.'
                : 'No stories available for this section. Add stories to your work history or use the "Generate Content" button to create new content.';
              
              builtSection = this.createSection({
                id: sectionId,
                slug,
                title: section.title || `Section ${index + 1}`,
                templateSectionId: section.id,
                type: this.resolveSectionType(section),
                order: index + 1,
                content: fallbackContent,
                source: { kind: 'template_static', entityId: null },
                requirementsMatched: [],
                tags: [],
                nowIso,
              });
            }
          }
        } else {
          const { story: bestStory, diagnostics } = this.pickBestStory(
            section,
            stories,
            jobDescription,
            userGoals,
            { usedStoryIds },
          );
          if (bestStory && bestStory.content?.trim()) {
            // Only use story if it has actual content
            const content = this.applyTemplateTokens(bestStory.content, jobDescription);
            const requirementsMatched = this.matchRequirements(content, jobDescription);
            usedStoryIds.add(bestStory.id);
            builtSection = this.createSection({
              id: sectionId,
              slug,
              title: section.title || bestStory.title || 'Experience Highlight',
              templateSectionId: section.id,
              type: this.resolveSectionType(section),
              order: index + 1,
              content,
              source: { kind: 'work_story', entityId: bestStory.id },
              requirementsMatched,
              tags: bestStory.tags ?? [],
              storySelection: includeStorySelectionDiagnostics ? diagnostics : undefined,
              nowIso,
            });
          } else {
            // No story found - provide helpful fallback message
            const hasStories = stories.length > 0;
            const fallbackContent = hasStories
              ? 'None of your existing stories were a strong enough match for this section based on the job description. Consider adding a story that better aligns with the role requirements, or use the "Generate Content" button to create new content.'
              : 'No stories available for this section. Add stories to your work history or use the "Generate Content" button to create new content.';
            
            builtSection = this.createSection({
              id: sectionId,
              slug,
              title: section.title || `Section ${index + 1}`,
              templateSectionId: section.id,
              type: this.resolveSectionType(section),
              order: index + 1,
              content: fallbackContent,
              source: { kind: 'template_static', entityId: null },
              requirementsMatched: [],
              tags: [],
              nowIso,
            });
          }
        }

        // Emit section immediately after building
        onSectionBuilt?.(builtSection, index, templateSections.length);

        return builtSection;
      });

    const matchState = this.buildMatchState(sectionResults, differentiatorWeights);

    return { sections: sectionResults, matchState };
  }

  private resolveSectionType(section: CoverLetterSection): CoverLetterDraftSection['type'] {
    if (section.contentType === 'work-history') return 'dynamic-story';
    if (section.contentType === 'saved') return 'dynamic-saved';
    if (section.type === 'closer') return 'closing';
    return 'static';
  }

  private applyTemplateTokens(
    content: string,
    jobDescription: Pick<ParsedJobDescription, 'company' | 'role'>,
  ): string {
    if (!content) return content;
    let out = content;

    if (jobDescription.company) {
      out = out.replace(/\[COMPANY-NAME\]/gi, jobDescription.company);
    }

    if (jobDescription.role) {
      out = out.replace(/\[ROLE\]/gi, jobDescription.role);
    }

    return out;
  }

  private createSection(input: {
    id: string;
    slug: string;
    title: string;
    templateSectionId: string | undefined;
    type: CoverLetterDraftSection['type'];
    order: number;
    content: string;
    source: CoverLetterDraftSection['source'];
    requirementsMatched: string[];
    tags: string[];
    storySelection?: StorySelectionDiagnostics;
    nowIso: string;
  }): CoverLetterDraftSection {
    return {
      id: input.id,
      templateSectionId: input.templateSectionId ?? null,
      slug: input.slug,
      title: input.title,
      type: input.type,
      order: input.order,
      content: input.content,
      source: input.source,
      metadata: {
        requirementsMatched: input.requirementsMatched,
        tags: input.tags,
        wordCount: countWords(input.content),
        ...(input.storySelection ? { storySelection: input.storySelection } : {}),
      },
      status: {
        hasGaps: false,
        gapIds: [],
        isModified: false,
        lastUpdatedAt: input.nowIso,
      },
      analytics: {
        matchScore: input.requirementsMatched.length > 0 ? 0.8 : 0.4,
        atsScore: 0,
      },
    };
  }

  private async incrementSavedSectionUsageForDraft(sections: CoverLetterDraftSection[]): Promise<void> {
    const savedSectionIds = new Set<string>();

    sections.forEach(section => {
      const source = section.source as { kind?: string; entityId?: string | null } | null;
      if (!source?.entityId) return;
      if (source.kind === 'saved_section' || source.kind === 'template_static') {
        savedSectionIds.add(source.entityId);
      }
    });

    if (!savedSectionIds.size) return;

    await Promise.all(
      Array.from(savedSectionIds).map((sectionId) =>
        CoverLetterTemplateService.incrementSectionUsage(sectionId),
      ),
    );
  }

  private pickBestStory(
    section: CoverLetterSection,
    stories: StoryRow[],
    jobDescription: ParsedJobDescription,
    userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>> | null,
    options?: { usedStoryIds?: Set<string> },
  ): { story: StoryRow | null; diagnostics: StorySelectionDiagnostics } {
    if (!stories.length) {
      console.log(`[CoverLetterDraftService] No stories available for section "${section.title || 'unnamed'}"`);
      return {
        story: null,
        diagnostics: {
          sectionTitle: section.title,
          selectedStoryId: null,
          selectedScore: null,
          hasUnusedStories: false,
          usedStoryIds: Array.from(options?.usedStoryIds ?? []),
          topCandidates: [],
        },
      };
    }

    const goals = section.blurbCriteria?.goals ?? [];
    const differentiatorIds = new Set(jobDescription.differentiatorRequirements.map(req => req.id));
    const usedStoryIds = options?.usedStoryIds;

    let bestStory: StoryRow | null = null;
    let bestScore = -Infinity;
    const candidates: StorySelectionDiagnostics['topCandidates'] = [];

    const hasUnusedStories =
      !!usedStoryIds && stories.some(story => !!story.content?.trim() && !usedStoryIds.has(story.id));

    const normalisedJdKeywords = (jobDescription.keywords ?? [])
      .map(keyword => keyword.trim().toLowerCase())
      .filter(Boolean);

    const structured = (jobDescription.structuredData ?? jobDescription.structuredInsights ?? {}) as Record<string, unknown>;
    const companyIndustry =
      typeof structured.companyIndustry === 'string' ? structured.companyIndustry : '';
    const companyVertical =
      typeof structured.companyVertical === 'string' ? structured.companyVertical : '';
    const companyBusinessModel =
      typeof structured.companyBusinessModel === 'string' ? structured.companyBusinessModel : '';
    const buyerSegment =
      typeof structured.buyerSegment === 'string' ? structured.buyerSegment : '';
    const userSegment =
      typeof structured.userSegment === 'string' ? structured.userSegment : '';

    const normalizeTokenList = (value: string): string[] => {
      if (!value) return [];
      return value
        .split(/[,/|]/)
        .map(token => token.trim().toLowerCase())
        .filter(token => token.length > 2);
    };

    const industryTokens = normalizeTokenList(companyIndustry);
    const verticalTokens = normalizeTokenList(companyVertical);
    const buyerSegmentTokens = Array.from(
      new Set([
        ...normalizeTokenList(companyBusinessModel),
        ...normalizeTokenList(buyerSegment),
      ]),
    );
    const userSegmentTokens = normalizeTokenList(userSegment);

    const genericKeywordStoplist = new Set([
      'product',
      'products',
      'product management',
      'product manager',
      'manager',
      'management',
      'strategy',
      'roadmap',
      'stakeholder',
      'stakeholders',
      'cross functional',
      'cross-functional',
      'agile',
      'scrum',
      'saas',
      'b2b',
      'b2c',
      'gtm',
      'go-to-market',
    ]);

    const jdKeywordWeight = (keyword: string): number => {
      if (!keyword) return 0;
      if (genericKeywordStoplist.has(keyword)) return 0;
      if (keyword.length < 4) return 0;
      if (keyword.includes(' ') || keyword.includes('-')) return 2;
      return 1;
    };

    const scoreJdKeywordMatches = (content: string, tags: string[] | null | undefined): { contentScore: number; tagScore: number } => {
      if (!normalisedJdKeywords.length) return { contentScore: 0, tagScore: 0 };
      const lowerContent = content.toLowerCase();
      const lowerTags = (tags ?? []).map(tag => tag.toLowerCase());

      let contentScore = 0;
      let tagScore = 0;

      for (const keyword of normalisedJdKeywords) {
        const weight = jdKeywordWeight(keyword);
        if (!weight) continue;

        const regex = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i');
        if (regex.test(lowerContent)) contentScore += weight;
        if (lowerTags.some(tag => tag.includes(keyword))) tagScore += weight;
      }

      return { contentScore, tagScore };
    };

    const scoreDomainMatches = (
      content: string,
      tags: string[] | null | undefined,
      tokens: string[],
      weights: { content: number; tags: number; cap: number },
    ): { score: number; matches: number } => {
      if (!tokens.length) return { score: 0, matches: 0 };
      const lowerContent = content.toLowerCase();
      const lowerTags = (tags ?? []).map(tag => tag.toLowerCase());
      let matches = 0;
      let score = 0;

      tokens.forEach(token => {
        if (!token) return;
        const regex = new RegExp(`\\b${escapeRegExp(token)}\\b`, 'i');
        if (regex.test(lowerContent)) {
          matches += 1;
          score += weights.content;
        }
        if (lowerTags.some(tag => tag.includes(token))) {
          matches += 1;
          score += weights.tags;
        }
      });

      if (score > weights.cap) score = weights.cap;
      return { score, matches };
    };

    for (const story of stories) {
      const content = story.content || '';
      if (!content.trim()) {
        console.warn(`[CoverLetterDraftService] Story "${story.title || story.id}" has empty content, skipping`);
        continue;
      }

      const requirementsMatched = this.matchRequirements(content, jobDescription);
      const differentiatorMatches = requirementsMatched.filter(reqId => differentiatorIds.has(reqId));

      let score = requirementsMatched.length * 10 + differentiatorMatches.length * 15;

      const { contentScore: jdKeywordsInContentScore, tagScore: jdKeywordsInTagsScore } =
        scoreJdKeywordMatches(content, story.tags ?? []);
      score += jdKeywordsInContentScore * 8;
      score += jdKeywordsInTagsScore * 10;

      if (goals.length) {
        const goalMatches = goals.reduce((count, goal) => {
          const regex = new RegExp(`\\b${escapeRegExp(goal)}\\b`, 'i');
          return count + (regex.test(content) ? 1 : 0);
        }, 0);
        score += goalMatches * 8;
      }

      const industryMatch = scoreDomainMatches(
        content,
        story.tags ?? [],
        industryTokens,
        { content: 8, tags: 12, cap: 30 },
      );
      const verticalMatch = scoreDomainMatches(
        content,
        story.tags ?? [],
        verticalTokens,
        { content: 12, tags: 16, cap: 40 },
      );
      const buyerMatch = scoreDomainMatches(
        content,
        story.tags ?? [],
        buyerSegmentTokens,
        { content: 12, tags: 16, cap: 40 },
      );
      const userMatch = scoreDomainMatches(
        content,
        story.tags ?? [],
        userSegmentTokens,
        { content: 8, tags: 12, cap: 24 },
      );
      score += industryMatch.score;
      score += verticalMatch.score;
      score += buyerMatch.score;
      score += userMatch.score;

      let targetTitleTagBonus = 0;
      if (userGoals?.targetTitles?.length) {
        const tagMatches = (story.tags || []).filter(tag =>
          userGoals.targetTitles.some(title => tag.toLowerCase().includes(title.toLowerCase())),
        );
        targetTitleTagBonus = tagMatches.length * 4;
        score += targetTitleTagBonus;
      }

      let lowTimesUsedBonus = 0;
      if ((story.times_used ?? 0) < 3) {
        lowTimesUsedBonus = 3;
        score += lowTimesUsedBonus;
      }

      const storyWordCount = countWords(content);
      let shortContentPenalty = 0;
      if (storyWordCount < 12) shortContentPenalty = 40;
      else if (storyWordCount < 25) shortContentPenalty = 20;
      score -= shortContentPenalty;

      let reusePenalty = 0;
      if (usedStoryIds?.has(story.id) && hasUnusedStories) {
        reusePenalty = 1000;
        score -= reusePenalty;
      }

      candidates.push({
        storyId: story.id,
        title: story.title ?? undefined,
        score,
        wasUsed: !!usedStoryIds?.has(story.id),
        counts: {
          requirementsMatched: requirementsMatched.length,
          differentiatorsMatched: differentiatorMatches.length,
          goalsMatched: goals.length
            ? goals.reduce((count, goal) => {
                const regex = new RegExp(`\\b${escapeRegExp(goal)}\\b`, 'i');
                return count + (regex.test(content) ? 1 : 0);
              }, 0)
            : 0,
          jdKeywordsInContentScore,
          jdKeywordsInTagsScore,
          industryMatches: industryMatch.matches,
          verticalMatches: verticalMatch.matches,
          buyerMatches: buyerMatch.matches,
          userMatches: userMatch.matches,
        },
        adjustments: {
          reusePenalty,
          shortContentPenalty,
          lowTimesUsedBonus,
          targetTitleTagBonus,
          industryMatchBonus: industryMatch.score,
          verticalMatchBonus: verticalMatch.score,
          buyerMatchBonus: buyerMatch.score,
          userMatchBonus: userMatch.score,
        },
      });

      if (score > bestScore) {
        bestScore = score;
        bestStory = story;
      }
    }

    if (bestStory) {
      console.log(`[CoverLetterDraftService] Selected best story "${bestStory.title || bestStory.id}" for section "${section.title || 'unnamed'}" (score: ${bestScore})`);
    } else if (stories.length > 0) {
      // If no story was selected but stories exist, try to find one with content
      // This handles edge cases where all stories have empty content or very low scores
      const fallbackStory = stories.find(s => s.content?.trim());
      if (fallbackStory) {
        console.warn(`[CoverLetterDraftService] No story selected for section "${section.title || 'unnamed'}" (${stories.length} stories evaluated, score: ${bestScore}), using fallback with content: "${fallbackStory.title || fallbackStory.id}"`);
        bestStory = fallbackStory;
        bestScore = bestScore === -Infinity ? 0 : bestScore;
      } else {
        // If all stories have empty content, return null so caller can show helpful message
        console.warn(`[CoverLetterDraftService] All ${stories.length} stories have empty content for section "${section.title || 'unnamed'}"`);
      }
    } else {
      console.warn(`[CoverLetterDraftService] No stories available for section "${section.title || 'unnamed'}"`);
    }

    const diagnostics: StorySelectionDiagnostics = {
      sectionTitle: section.title,
      selectedStoryId: bestStory?.id ?? null,
      selectedScore: Number.isFinite(bestScore) ? bestScore : null,
      hasUnusedStories,
      usedStoryIds: Array.from(usedStoryIds ?? []),
      topCandidates: candidates.sort((a, b) => b.score - a.score).slice(0, 5),
    };

    const storySelectionDebugEnabled =
      (import.meta as any)?.env?.VITE_COVER_LETTER_STORY_SELECTION_DEBUG === '1' ||
      (typeof process !== 'undefined' && process.env.COVER_LETTER_STORY_SELECTION_DEBUG === '1');
    if (storySelectionDebugEnabled) {
      console.log(
        `[CoverLetterDraftService] Story selection diagnostics for "${section.title || 'unnamed'}": ${JSON.stringify(diagnostics)}`,
      );
    }

    return { story: bestStory, diagnostics };
  }

  private pickBestSavedSection(
    section: CoverLetterSection,
    savedSections: SavedSectionRow[],
    jobDescription: ParsedJobDescription,
  ): SavedSectionRow | null {
    if (!savedSections.length) return null;

    let bestSection: SavedSectionRow | null = null;
    let bestScore = -Infinity;

    for (const saved of savedSections) {
      const content = saved.content || '';
      const requirementsMatched = this.matchRequirements(content, jobDescription);
      let score = requirementsMatched.length * 8;

      if (section.blurbCriteria?.goals?.length) {
        const goalMatches = section.blurbCriteria.goals.reduce((count, goal) => {
          const regex = new RegExp(`\\b${escapeRegExp(goal)}\\b`, 'i');
          return count + (regex.test(content) ? 1 : 0);
        }, 0);
        score += goalMatches * 6;
      }

      if (saved.tags?.length) {
        const keywordMatches = saved.tags.filter(tag =>
          jobDescription.keywords.some(keyword => tag.toLowerCase().includes(keyword)),
        );
        score += keywordMatches.length * 4;
      }

      if (score > bestScore) {
        bestScore = score;
        bestSection = saved;
      }
    }

    return bestSection;
  }

  private matchRequirements(
    content: string,
    jobDescription: ParsedJobDescription,
  ): string[] {
    const lowerContent = content.toLowerCase();
    const requirements: RequirementInsight[] = [
      ...jobDescription.standardRequirements,
      ...jobDescription.preferredRequirements,
      ...jobDescription.differentiatorRequirements,
    ];

    return requirements
      .filter(req => {
        const keywords = req.keywords?.length ? req.keywords : [req.label];
        return keywords.some(keyword => {
          const trimmed = keyword.trim();
          if (!trimmed) return false;
          const regex = new RegExp(`\\b${escapeRegExp(trimmed)}\\b`, 'i');
          return regex.test(lowerContent);
        });
      })
      .map(req => req.id);
  }

  private buildDifferentiatorSummary(
    jobDescription: ParsedJobDescription,
    sections: CoverLetterDraftSection[],
  ): DifferentiatorInsight[] {
    const matchedRequirementIds = new Set(
      sections.flatMap(section => section.metadata.requirementsMatched),
    );

    return jobDescription.differentiatorRequirements.map(req => ({
      requirementId: req.id,
      label: req.label,
      status: matchedRequirementIds.has(req.id) ? 'addressed' : 'missing',
      summary: matchedRequirementIds.has(req.id)
        ? 'This differentiator is covered in the draft.'
        : 'No section directly addresses this differentiator yet.',
    }));
  }

  private buildMatchState(
    sections: CoverLetterDraftSection[],
    differentiatorWeights?: Map<string, RequirementInsight>,
  ): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    sections.forEach(section => {
      state[section.slug] = {
        source: section.source,
        requirementsMatched: section.metadata.requirementsMatched,
        differentiators: (section.metadata.requirementsMatched || []).filter(reqId =>
          differentiatorWeights?.has(reqId),
        ),
      };
    });

    return state;
  }

  private async upsertWorkpad(input: {
    draftId: string;
    userId: string;
    jobDescriptionId: string;
    matchState: Record<string, unknown>;
    sections: CoverLetterDraftSection[];
    phase: DraftGenerationPhase;
  }): Promise<DraftWorkpad> {
    const workpadPayload = {
      matchState: input.matchState,
      sections: input.sections,
    };

    // Check if workpad already exists for this draft
    const { data: existing } = await this.supabaseClient
      .from('cover_letter_workpads')
      .select('id')
      .eq('draft_id', input.draftId)
      .maybeSingle();

    const payload: Database['public']['Tables']['cover_letter_workpads']['Insert'] = {
      draft_id: input.draftId,
      user_id: input.userId,
      job_description_id: input.jobDescriptionId,
      phase: input.phase,
      payload: workpadPayload as unknown as Json,
      updated_at: this.now().toISOString(),
    };

    let data;
    let error;

    if (existing?.id) {
      // Update existing workpad
      const { data: updated, error: updateError } = await this.supabaseClient
        .from('cover_letter_workpads')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      data = updated;
      error = updateError;
    } else {
      // Insert new workpad
      const { data: inserted, error: insertError } = await this.supabaseClient
        .from('cover_letter_workpads')
        .insert(payload)
        .select()
        .single();
      data = inserted;
      error = insertError;
    }

    if (error || !data) {
      console.error('[CoverLetterDraftService] Workpad upsert failed:', error);
      throw new Error(
        `Unable to persist draft checkpoint: ${error?.message ?? 'Unknown error'}`,
      );
    }

    return this.mapWorkpadRow(data);
  }

  private mapWorkpadRow(row: WorkpadRow): DraftWorkpad {
    const payload = (row.payload as Record<string, unknown>) ?? {};
    const sectionsSnapshot = Array.isArray((payload as any)?.sections)
      ? ((payload as any).sections as CoverLetterDraftSection[])
      : [];
    const matchStateRaw = (payload as any)?.matchState;
    const matchState =
      matchStateRaw && typeof matchStateRaw === 'object' && !Array.isArray(matchStateRaw)
        ? (matchStateRaw as Record<string, unknown>)
        : {};

    return {
      id: row.id,
      draftId: row.draft_id ?? '',
      userId: row.user_id,
      matchState,
      sectionsSnapshot,
      lastPhase: (row.phase as DraftGenerationPhase | null) ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapCoverLetterRow(
    row: CoverLetterRow,
    metrics: CoverLetterMatchMetric[],
    atsScore: number,
  ): CoverLetterDraft {
    // Diagnostic logging (Task 1.2)
    if (Boolean((import.meta as any)?.env?.DEV) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
      console.log('[mapCoverLetterRow] Top-level metrics parameter:', metrics);
      console.log('[mapCoverLetterRow] Top-level metrics isArray:', Array.isArray(metrics));
      console.log('[mapCoverLetterRow] Top-level metrics length:', metrics?.length);
    }
    const sections = this.normaliseDraftSections(row.sections);
    const differentiatorSummary = Array.isArray(row.differentiator_summary)
      ? (row.differentiator_summary as DifferentiatorInsight[])
      : [];
    const analytics =
      row.analytics && typeof row.analytics === 'object'
        ? (row.analytics as Record<string, unknown>)
        : undefined;

    // Extract enhancedMatchData from llm_feedback
    const llmFeedback = (row.llm_feedback as Record<string, unknown>) ?? {
      generatedAt: null,
      metrics: [],
    };
    
    // Diagnostic logging (Task 1.1)
    if (Boolean((import.meta as any)?.env?.DEV) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
      console.log('[mapCoverLetterRow] llmFeedback.metrics:', llmFeedback?.metrics);
      console.log('[mapCoverLetterRow] llmFeedback.metrics type:', typeof llmFeedback?.metrics);
      console.log('[mapCoverLetterRow] llmFeedback.metrics isArray:', Array.isArray(llmFeedback?.metrics));
    }
    
    const enhancedMatchData = llmFeedback?.enhancedMatchData as EnhancedMatchData | undefined;
    
    // Extract MwS (Match with Strengths) from llm_feedback
    const mws = llmFeedback?.mws as CoverLetterDraft['mws'] | undefined;

    return {
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      jobDescriptionId: row.job_description_id,
      status: row.status,
      outcomeStatus: row.outcome_status ?? null,
      appliedAt: row.applied_at ?? row.finalized_at ?? null,
      outcomeUpdatedAt: row.outcome_updated_at ?? null,
      sections,
      metrics,
      atsScore,
      differentiatorSummary,
      llmFeedback,
      enhancedMatchData, // Extract to top-level for easy access
      mws, // Match with Strengths - persisted from A-phase streaming
      analytics: analytics as unknown as CoverLetterDraft['analytics'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      finalizedAt: row.finalized_at ?? null,
    };
  }

  private normaliseMatchMetrics(payload: CoverLetterRow['metrics']): CoverLetterMatchMetric[] {
    // Diagnostic logging (Task 1.2)
    if (Boolean((import.meta as any)?.env?.DEV) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
      console.log('[normaliseMatchMetrics] Input payload:', payload);
      console.log('[normaliseMatchMetrics] Payload type:', typeof payload);
      console.log('[normaliseMatchMetrics] Payload isArray:', Array.isArray(payload));
    }
    
    if (!payload) {
      if (Boolean((import.meta as any)?.env?.DEV) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
        console.warn('[normaliseMatchMetrics] Payload is null/undefined, returning empty array');
      }
      return [];
    }
    if (Array.isArray(payload)) {
      const result = payload as CoverLetterMatchMetric[];
      if (Boolean((import.meta as any)?.env?.DEV) || (typeof process !== 'undefined' && process.env.NODE_ENV === 'development')) {
        console.log('[normaliseMatchMetrics] Returning array with', result.length, 'metrics');
      }
      return result;
    }

    if (typeof payload === 'object') {
      const metrics = transformMetricPayload(payload as Record<string, unknown>);
      if (metrics.length) return metrics;
    }

    return [];
  }

  private normaliseFinalSections(
    sections: CoverLetterDraftSection[],
    jobDescription: ParsedJobDescription,
  ): CoverLetterDraftSection[] {
    const nowIso = this.now().toISOString();

    return [...sections]
      .sort((a, b) => a.order - b.order)
      .map(section => {
        const content = section.content ?? '';
        const requirementsMatched = this.matchRequirements(content, jobDescription);
        const wordCount = countWords(content);

        return {
          ...section,
          content,
          metadata: {
            requirementsMatched,
            tags: section.metadata?.tags ?? [],
            wordCount,
          },
          status: {
            hasGaps: section.status?.hasGaps ?? false,
            gapIds: section.status?.gapIds ?? [],
            isModified: section.status?.isModified ?? false,
            lastUpdatedAt: section.status?.lastUpdatedAt ?? nowIso,
          },
        };
      });
  }

  private buildGapDiagnostics(enhancedMatchData?: EnhancedMatchData): {
    sectionCount: number;
    sectionsWithGaps: number;
    sectionsWithUnmet: number;
    totalGaps: number;
    statusCounts: { unmet: number; met: number; not_applicable: number; missing: number };
    unmetMissingHiringRisk: number;
    unmetMissingWhyNow: number;
    unmetMissingDecisionTest: number;
    decisionTestAllFalse: number;
    gapsWithJdRequirementId: number;
    gapsWithRubricCriterionId: number;
  } {
    const sectionGapInsights = Array.isArray(enhancedMatchData?.sectionGapInsights)
      ? enhancedMatchData.sectionGapInsights
      : [];
    const allGaps = sectionGapInsights.flatMap(section =>
      Array.isArray((section as any)?.requirementGaps) ? (section as any).requirementGaps : [],
    );

    const statusCounts = {
      unmet: 0,
      met: 0,
      not_applicable: 0,
      missing: 0,
    };
    let unmetMissingHiringRisk = 0;
    let unmetMissingWhyNow = 0;
    let unmetMissingDecisionTest = 0;
    let decisionTestAllFalse = 0;
    let gapsWithJdRequirementId = 0;
    let gapsWithRubricCriterionId = 0;

    for (const gap of allGaps) {
      const status = typeof (gap as any)?.status === 'string' ? (gap as any).status : '';
      if (status === 'unmet') statusCounts.unmet += 1;
      else if (status === 'met') statusCounts.met += 1;
      else if (status === 'not_applicable') statusCounts.not_applicable += 1;
      else statusCounts.missing += 1;

      if (typeof (gap as any)?.jdRequirementId === 'string' && (gap as any).jdRequirementId.trim().length > 0) {
        gapsWithJdRequirementId += 1;
      }
      if (typeof (gap as any)?.rubricCriterionId === 'string' && (gap as any).rubricCriterionId.trim().length > 0) {
        gapsWithRubricCriterionId += 1;
      }

      if (status !== 'unmet') continue;

      const hiringRisk = typeof (gap as any)?.hiringRisk === 'string' ? (gap as any).hiringRisk.trim() : '';
      const whyNow = typeof (gap as any)?.whyNow === 'string' ? (gap as any).whyNow.trim() : '';
      if (!hiringRisk) unmetMissingHiringRisk += 1;
      if (!whyNow) unmetMissingWhyNow += 1;

      const decisionTest = (gap as any)?.decisionTest;
      if (!decisionTest || typeof decisionTest !== 'object') {
        unmetMissingDecisionTest += 1;
        continue;
      }
      const hasSignal = Boolean(
        decisionTest.addsSignal ||
        decisionTest.removesRedundancy ||
        decisionTest.clarifiesOwnership ||
        decisionTest.fixesSeniorityWeakness,
      );
      if (!hasSignal) decisionTestAllFalse += 1;
    }

    const sectionsWithGaps = sectionGapInsights.filter(section =>
      Array.isArray((section as any)?.requirementGaps) && (section as any).requirementGaps.length > 0,
    ).length;
    const sectionsWithUnmet = sectionGapInsights.filter(section =>
      Array.isArray((section as any)?.requirementGaps) &&
      (section as any).requirementGaps.some((gap: any) => gap?.status === 'unmet'),
    ).length;

    return {
      sectionCount: sectionGapInsights.length,
      sectionsWithGaps,
      sectionsWithUnmet,
      totalGaps: allGaps.length,
      statusCounts,
      unmetMissingHiringRisk,
      unmetMissingWhyNow,
      unmetMissingDecisionTest,
      decisionTestAllFalse,
      gapsWithJdRequirementId,
      gapsWithRubricCriterionId,
    };
  }

  // ============================================================================
  // EVALUATION LOGGING
  // ============================================================================

  /**
   * Log draft cover letter generation result to evaluation_runs table
   * 
   * Tracks completeness of all toolbar metrics to catch regressions like:
   * - Gaps badge showing count but no children populating
   * - MwS/MwG not displaying
   * - Overall score missing
   */
  private async logDraftCoverLetterResult(data: {
    userId: string;
    draftId: string;
    jobDescriptionId: string;
    sections: CoverLetterDraftSection[];
    enhancedMatchData?: EnhancedMatchData;
    metrics?: CoverLetterMatchMetric[];
    contentStandards?: ContentStandardsAnalysis | null;
    overallScore?: number;
    mws?: { summaryScore: 0 | 1 | 2 | 3; details: Array<{ label: string; strengthLevel: string; explanation: string }> } | null;
    phaseALatencyMs?: number;
    phaseBLatencyMs: number;
    status: 'success' | 'failed';
    errorMessage?: string;
    syntheticProfileId?: string;
  }): Promise<void> {
    try {
      // Build Phase A completeness (from metrics if available)
      const goalsMetric = data.metrics?.find(m => m.key === 'goals');
      const coreReqMetric = data.metrics?.find(m => m.key === 'coreRequirements');
      const prefReqMetric = data.metrics?.find(m => m.key === 'preferredRequirements');

      // Check MwS completeness (now available from draft.llm_feedback.mws)
      const hasMws = data.mws && typeof data.mws.summaryScore === 'number' && Array.isArray(data.mws.details);

      const phaseA: PhaseACompleteness = {
        jdAnalysis: {
          complete: true, // If we got here, JD was loaded
        },
        coreRequirements: {
          complete: coreReqMetric?.type === 'requirement' && coreReqMetric.total > 0,
          count: coreReqMetric?.type === 'requirement' ? coreReqMetric.total : 0,
        },
        preferredRequirements: {
          complete: prefReqMetric !== undefined,
          count: prefReqMetric?.type === 'requirement' ? prefReqMetric.total : 0,
        },
        goalsMatched: {
          complete: goalsMetric !== undefined,
          met: goalsMetric?.type === 'requirement' ? goalsMetric.met : 0,
          total: goalsMetric?.type === 'requirement' ? goalsMetric.total : 0,
        },
        strengthsMatched: {
          complete: hasMws ?? false,
          summaryScore: data.mws?.summaryScore ?? null,
          detailCount: data.mws?.details?.length ?? 0,
        },
      };

      // Build Phase B completeness
      const allGaps = data.enhancedMatchData?.sectionGapInsights
        ?.flatMap(s => s.requirementGaps || []) ?? [];
      const badgeCount = allGaps.length;
      const hasGapsChildren = (data.enhancedMatchData?.sectionGapInsights?.length ?? 0) > 0;
      const gapDiagnostics = this.buildGapDiagnostics(data.enhancedMatchData);

      const phaseB: PhaseBCompleteness = {
        sectionsGenerated: {
          complete: data.sections.length > 0,
          count: data.sections.length,
        },
        gapsAnalyzed: {
          complete: hasGapsChildren || badgeCount === 0, // Complete if we have children OR no gaps
          badgeCount,
          actualGaps: allGaps.length,
          match: true, // Badge count always equals actual in our implementation
        },
        overallScore: {
          complete: typeof data.overallScore === 'number',
          value: data.overallScore ?? null,
        },
        contentStandards: {
          complete: data.contentStandards?.perSection !== undefined,
          perSectionCount: data.contentStandards?.perSection?.length ?? 0,
        },
      };

      // Validate toolbar completeness
      const toolbarPopulated: ToolbarValidation = {
        gaps: phaseB.gapsAnalyzed.complete && (badgeCount === 0 || hasGapsChildren),
        mwg: phaseA.goalsMatched.complete,
        mws: phaseA.strengthsMatched.complete, // Now tracked from draft.llm_feedback.mws or job_descriptions.analysis.mws
        coreReqs: phaseA.coreRequirements.complete,
        preferredReqs: phaseA.preferredRequirements.complete,
        overallScore: phaseB.overallScore.complete,
        readiness: false, // Async, checked separately
      };

      // Determine eval status and missing fields
      const missingFields: string[] = [];
      if (!toolbarPopulated.gaps) missingFields.push('gaps.children');
      if (!toolbarPopulated.mwg) missingFields.push('mwg');
      if (!toolbarPopulated.mws) missingFields.push('mws'); // Now tracked!
      if (!toolbarPopulated.coreReqs) missingFields.push('core_requirements');
      if (!toolbarPopulated.overallScore) missingFields.push('overall_score');
      // Note: Readiness is handled separately (async)

      let evalStatus: EvalStatus = 'pass';
      if (data.status === 'failed') {
        evalStatus = 'fail';
      } else if (missingFields.length > 0) {
        evalStatus = 'review';
      }

      const totalLatencyMs = (data.phaseALatencyMs ?? 0) + data.phaseBLatencyMs;
      const gapDiagnosticsEnabled =
        Boolean((import.meta as any)?.env?.DEV) ||
        (import.meta as any)?.env?.VITE_COVER_LETTER_GAP_DIAGNOSTICS === '1' ||
        (typeof process !== 'undefined' && process.env.COVER_LETTER_GAP_DIAGNOSTICS === '1');

      if (gapDiagnosticsEnabled) {
        console.log('[CoverLetterDraftService] Gap diagnostics:', gapDiagnostics);
        const missingCritical =
          gapDiagnostics.unmetMissingHiringRisk +
          gapDiagnostics.unmetMissingWhyNow +
          gapDiagnostics.unmetMissingDecisionTest;
        if (missingCritical > 0) {
          console.warn('[CoverLetterDraftService] Gaps missing required fields:', {
            unmetMissingHiringRisk: gapDiagnostics.unmetMissingHiringRisk,
            unmetMissingWhyNow: gapDiagnostics.unmetMissingWhyNow,
            unmetMissingDecisionTest: gapDiagnostics.unmetMissingDecisionTest,
          });
        }
      }

      // Build payload matching evaluation_runs schema
      const payload = {
        user_id: data.userId,
        session_id: `draft-cl-${data.draftId}`,
        source_id: data.draftId,
        file_type: 'draft_cover_letter',
        user_type: data.syntheticProfileId ? 'synthetic' : 'real',
        synthetic_profile_id: data.syntheticProfileId ?? null,

        // Latency
        llm_analysis_latency_ms: data.phaseBLatencyMs,
        total_latency_ms: totalLatencyMs,

        // Model info
        model: 'gpt-4o-mini',

        // Standard eval fields
        accuracy_score: evalStatus === 'pass' ? '✅ Pass' : evalStatus === 'review' ? '⚠️ Review' : '❌ Fail',
        go_nogo_decision: evalStatus === 'pass' ? '✅ Pass' : evalStatus === 'review' ? '⚠️ Review' : '❌ Fail',
        evaluation_rationale: evalStatus === 'pass'
          ? `Draft generated successfully. ${data.sections.length} sections, score: ${data.overallScore ?? 'N/A'}`
          : evalStatus === 'review'
            ? `Missing fields: ${missingFields.join(', ')}`
            : data.errorMessage ?? 'Draft generation failed',

        // Draft-specific snapshot
        draft_cl_snapshot: {
          phaseA,
          phaseB,
          toolbarPopulated,
          missingFields,
          evalStatus,
          gapDiagnostics,
        } as unknown as Record<string, unknown>,
      };

      const { error } = await this.supabaseClient
        .from('evaluation_runs')
        .insert([payload as any]);

      if (error) {
        console.error('[CoverLetterDraftService] Failed to log eval result:', error);
      } else {
        console.log('[CoverLetterDraftService] Logged draft eval result:', evalStatus, missingFields);
      }
    } catch (logError) {
      // Non-blocking - don't fail draft generation if logging fails
      console.error('[CoverLetterDraftService] Error logging eval result:', logError);
    }
  }

  /**
   * Create fallback metrics when AI analysis is unavailable
   * 
   * RESILIENCE STRATEGY: When LLM calls fail after all retries, we provide
   * reasonable default metrics so users always get a usable draft.
   * This implements the "graceful degradation" principle.
   * 
   * @returns Fallback metrics with average/neutral values
   */
  private createFallbackMetrics(): {
    metrics: CoverLetterMatchMetric[];
    atsScore: number;
    enhancedMatchData?: EnhancedMatchData;
    raw: Record<string, unknown>;
  } {
    const fallbackMetrics: CoverLetterMatchMetric[] = [
      {
        key: 'goals',
        label: 'Match with Goals',
        type: 'strength',
        strength: 'average',
        summary: 'AI analysis unavailable',
        tooltip: 'Unable to calculate goals match at this time. Your draft has been created successfully.',
        differentiatorHighlights: [],
      },
      {
        key: 'experience',
        label: 'Match with Experience',
        type: 'strength',
        strength: 'average',
        summary: 'AI analysis unavailable',
        tooltip: 'Unable to calculate experience match at this time. Your draft has been created successfully.',
        differentiatorHighlights: [],
      },
      {
        key: 'rating',
        label: 'Cover Letter Rating',
        type: 'score',
        value: 70,
        summary: 'Estimated rating',
        tooltip: 'AI quality rating unavailable. Your draft has been created successfully.',
        differentiatorHighlights: [],
      },
      {
        key: 'ats',
        label: 'ATS Score',
        type: 'score',
        value: 70,
        summary: 'Estimated ATS compatibility',
        tooltip: 'AI ATS analysis unavailable. Your draft has been created successfully.',
        differentiatorHighlights: [],
      },
      {
        key: 'coreRequirements',
        label: 'Core Requirements',
        type: 'requirement',
        met: 0,
        total: 0,
        summary: 'Analysis unavailable',
        tooltip: 'Unable to analyze core requirements at this time. Your draft has been created successfully.',
        differentiatorHighlights: [],
      },
      {
        key: 'preferredRequirements',
        label: 'Preferred Requirements',
        type: 'requirement',
        met: 0,
        total: 0,
        summary: 'Analysis unavailable',
        tooltip: 'Unable to analyze preferred requirements at this time. Your draft has been created successfully.',
        differentiatorHighlights: [],
      },
    ];

    return {
      metrics: fallbackMetrics,
      atsScore: 70,
      enhancedMatchData: undefined, // No enhanced data available in fallback
      raw: {
        goals: { strength: 'average', summary: 'AI analysis unavailable', tooltip: '' },
        experience: { strength: 'average', summary: 'AI analysis unavailable', tooltip: '' },
        rating: { score: 70, summary: 'Estimated rating', tooltip: '' },
        ats: { score: 70, summary: 'Estimated ATS compatibility', tooltip: '' },
        coreRequirements: { met: 0, total: 0, summary: 'Analysis unavailable', tooltip: '' },
        preferredRequirements: { met: 0, total: 0, summary: 'Analysis unavailable', tooltip: '' },
      },
    };
  }
}

const countWords = (value: string): number =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
