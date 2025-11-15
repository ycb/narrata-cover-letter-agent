import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { OPENAI_CONFIG } from '@/lib/config/fileUpload';
import { supabase } from '@/lib/supabase';
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
} from '@/types/coverLetters';
import type { CoverLetterSection } from '@/types/workHistory';
import { UserPreferencesService } from './userPreferencesService';
import { JobDescriptionService } from './jobDescriptionService';
import { ENHANCED_METRICS_SYSTEM_PROMPT, buildEnhancedMetricsUserPrompt } from '@/prompts/enhancedMetricsAnalysis';

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
interface ApprovedContentRow extends Database['public']['Tables']['approved_content']['Row'] {}
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
    (import.meta.env?.VITE_OPENAI_KEY) ||
    (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined) ||
    (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

  if (!apiKey) {
    throw new Error('OpenAI API key not configured. Set VITE_OPENAI_KEY or OPENAI_API_KEY.');
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
        slug: section.slug,
        title: section.title,
        content: section.content,
        requirementsMatched: section.metadata.requirementsMatched,
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
    };

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
      maxTokens: 3500, // Increased for enhanced response with detailed breakdowns
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

export class CoverLetterDraftService {
  private readonly supabaseClient: SupabaseClient;
  private readonly jobDescriptionService: JobDescriptionService;
  private readonly metricsStreamer: MetricsStreamer;
  private readonly now: () => Date;

  constructor(options: CoverLetterDraftServiceOptions = {}) {
    this.supabaseClient = options.supabaseClient ?? supabase;
    this.jobDescriptionService = options.jobDescriptionService ?? new JobDescriptionService();
    this.metricsStreamer = options.metricsStreamer ?? createDefaultMetricsStreamer();
    this.now = options.now ?? (() => new Date());
  }

  async generateDraft(options: DraftGenerationOptions): Promise<DraftGenerationResult> {
    const { userId, templateId, jobDescriptionId, onProgress, signal } = options;

    this.emitProgress(onProgress, 'jd_parse', 'Loading job description…');
    const jobDescription = await this.fetchJobDescription(userId, jobDescriptionId);

    this.emitProgress(onProgress, 'content_match', 'Loading content libraries…');
    const [templateRow, stories, savedSections, userGoals, workHistory, approvedContent] = await Promise.all([
      this.fetchTemplate(userId, templateId),
      this.fetchStories(userId),
      this.fetchSavedSections(userId),
      UserPreferencesService.loadGoals(userId),
      this.fetchWorkHistory(userId),
      this.fetchApprovedContent(userId),
    ]);

    const templateSections = this.normaliseTemplateSections(templateRow.sections);

    const { sections, matchState } = this.buildSections({
      templateSections,
      stories,
      savedSections,
      jobDescription,
      userGoals,
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
    let metricResult;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
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
          break;
        }
      }
    }

    if (!metricResult) {
      // This should never happen due to fallback, but TypeScript needs it
      metricResult = this.createFallbackMetrics();
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

  private async fetchStories(userId: string): Promise<ApprovedContentRow[]> {
    const { data, error } = await this.supabaseClient
      .from('approved_content')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load approved content:', error);
      return [];
    }

    return data ?? [];
  }

  private async fetchSavedSections(userId: string): Promise<SavedSectionRow[]> {
    const { data, error } = await this.supabaseClient
      .from('saved_sections')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load saved sections:', error);
      return [];
    }

    return data ?? [];
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
    const { data, error } = await this.supabaseClient
      .from('work_items')
      .select('id, company:companies(name), title, description, achievements')
      .eq('user_id', userId);

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load work history:', error);
      return [];
    }

    return (data ?? []).map(item => ({
      id: item.id,
      company: (item.company as any)?.name || 'Unknown',
      title: item.title || '',
      description: item.description || '',
      achievements: Array.isArray(item.achievements) ? item.achievements as string[] : [],
    }));
  }

  /**
   * Fetch user's approved content (stories) for enhanced match analysis
   */
  private async fetchApprovedContent(userId: string): Promise<Array<{
    id: string;
    title: string;
    content: string;
  }>> {
    const { data, error } = await this.supabaseClient
      .from('approved_content')
      .select('id, title, content')
      .eq('user_id', userId);

    if (error) {
      console.error('[CoverLetterDraftService] Failed to load approved content:', error);
      return [];
    }

    return (data ?? []).map(item => ({
      id: item.id,
      title: item.title || '',
      content: item.content || '',
    }));
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
    stories: ApprovedContentRow[];
    savedSections: SavedSectionRow[];
    jobDescription: ParsedJobDescription;
    userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>> | null;
  }): { sections: CoverLetterDraftSection[]; matchState: Record<string, unknown> } {
    const { templateSections, stories, savedSections, jobDescription, userGoals } = input;
    const nowIso = this.now().toISOString();

    const differentiatorWeights = new Map(
      jobDescription.differentiatorRequirements.map(req => [req.id, req]),
    );

    const sectionResults: CoverLetterDraftSection[] = templateSections
      .sort((a, b) => a.order - b.order)
      .map((section, index) => {
        const slug = slugify(section.title || `section-${index + 1}`, `section-${index + 1}`);
        const sectionId = `${slug}-${index + 1}`;

        if (section.isStatic) {
          const content = section.staticContent || '';
          return this.createSection({
            id: sectionId,
            slug,
            title: section.title || `Section ${index + 1}`,
            templateSectionId: section.id,
            type: this.resolveSectionType(section),
            order: index + 1,
            content,
            source: { kind: 'template_static', entityId: null },
            requirementsMatched: [],
            tags: [],
            nowIso,
          });
        }

        if (section.contentType === 'saved') {
          const bestSaved = this.pickBestSavedSection(section, savedSections, jobDescription);
          if (bestSaved) {
            const requirementsMatched = this.matchRequirements(bestSaved.content, jobDescription);
            return this.createSection({
              id: sectionId,
              slug,
              title: section.title || bestSaved.title,
              templateSectionId: section.id,
              type: this.resolveSectionType(section),
              order: index + 1,
              content: bestSaved.content,
              source: { kind: 'saved_section', entityId: bestSaved.id },
              requirementsMatched,
              tags: bestSaved.tags ?? [],
              nowIso,
            });
          }
        }

        const bestStory = this.pickBestStory(section, stories, jobDescription, userGoals);
        if (bestStory) {
          const requirementsMatched = this.matchRequirements(bestStory.content, jobDescription);
          return this.createSection({
            id: sectionId,
            slug,
            title: section.title || bestStory.title || 'Experience Highlight',
            templateSectionId: section.id,
            type: this.resolveSectionType(section),
            order: index + 1,
            content: bestStory.content,
            source: { kind: 'work_story', entityId: bestStory.id },
            requirementsMatched,
            tags: bestStory.tags ?? [],
            nowIso,
          });
        }

        const fallbackContent = section.staticContent || section.title || '';
        return this.createSection({
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

  private pickBestStory(
    section: CoverLetterSection,
    stories: ApprovedContentRow[],
    jobDescription: ParsedJobDescription,
    userGoals: Awaited<ReturnType<typeof UserPreferencesService.loadGoals>> | null,
  ): ApprovedContentRow | null {
    if (!stories.length) return null;

    const goals = section.blurbCriteria?.goals ?? [];
    const differentiatorIds = new Set(jobDescription.differentiatorRequirements.map(req => req.id));

    let bestStory: ApprovedContentRow | null = null;
    let bestScore = -Infinity;

    for (const story of stories) {
      const content = story.content || '';
      const requirementsMatched = this.matchRequirements(content, jobDescription);
      const differentiatorMatches = requirementsMatched.filter(reqId => differentiatorIds.has(reqId));

      let score = requirementsMatched.length * 10 + differentiatorMatches.length * 15;

      if (goals.length) {
        const goalMatches = goals.reduce((count, goal) => {
          const regex = new RegExp(`\\b${escapeRegExp(goal)}\\b`, 'i');
          return count + (regex.test(content) ? 1 : 0);
        }, 0);
        score += goalMatches * 8;
      }

      if (userGoals?.targetTitles?.length) {
        const tagMatches = (story.tags || []).filter(tag =>
          userGoals.targetTitles.some(title => tag.toLowerCase().includes(title.toLowerCase())),
        );
        score += tagMatches.length * 4;
      }

      if ((story.times_used ?? 0) < 3) {
        score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestStory = story;
      }
    }

    return bestStory;
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
    const sections = this.normaliseDraftSections(row.sections);
    const differentiatorSummary = Array.isArray(row.differentiator_summary)
      ? (row.differentiator_summary as DifferentiatorInsight[])
      : [];
    const analytics =
      row.analytics && typeof row.analytics === 'object'
        ? (row.analytics as Record<string, unknown>)
        : undefined;

    return {
      id: row.id,
      userId: row.user_id,
      templateId: row.template_id,
      jobDescriptionId: row.job_description_id,
      status: row.status,
      sections,
      metrics,
      atsScore,
      differentiatorSummary,
      llmFeedback:
        (row.llm_feedback as Record<string, unknown>) ?? {
          generatedAt: null,
          metrics: [],
        },
      analytics: analytics as unknown as CoverLetterDraft['analytics'],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      finalizedAt: row.finalized_at ?? null,
    };
  }

  private normaliseMatchMetrics(payload: CoverLetterRow['metrics']): CoverLetterMatchMetric[] {
    if (!payload) return [];
    if (Array.isArray(payload)) {
      return payload as CoverLetterMatchMetric[];
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

