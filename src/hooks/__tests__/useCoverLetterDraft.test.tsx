import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import type {
  CoverLetterDraft,
  CoverLetterMatchMetric,
  DraftWorkpad,
  ParsedJobDescription,
} from '@/types/coverLetters';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      throw new Error('Supabase client should be injected for tests.');
    }),
  },
}));

let useCoverLetterDraftHook: typeof import('../useCoverLetterDraft').useCoverLetterDraft;

beforeAll(async () => {
  process.env.VITE_OPENAI_API_KEY = 'test-key';
  const module = await import('../useCoverLetterDraft');
  useCoverLetterDraftHook = module.useCoverLetterDraft;
});

describe('useCoverLetterDraft', () => {
  const baseDraft: CoverLetterDraft = {
    id: 'draft-1',
    userId: 'user-1',
    templateId: 'tmpl-1',
    jobDescriptionId: 'jd-1',
    company: 'Narrata',
    role: 'Senior PM',
    status: 'draft',
    sections: [
      {
        id: 'section-1',
        templateSectionId: 'sec-1',
        slug: 'introduction',
        title: 'Introduction',
        type: 'static',
        order: 1,
        content: 'Hello world',
        source: { kind: 'template_static', entityId: null },
        metadata: {
          requirementsMatched: [],
          tags: [],
          wordCount: 2,
        },
        status: {
          hasGaps: false,
          gapIds: [],
          isModified: false,
          lastUpdatedAt: '2025-11-12T00:00:00.000Z',
        },
        analytics: {
          matchScore: 0.5,
          atsScore: 0,
        },
      },
    ],
    metrics: [],
    atsScore: 0,
    differentiatorSummary: [],
    llmFeedback: {},
    analytics: {
      atsScore: 0,
    },
    createdAt: '2025-11-12T00:00:00.000Z',
    updatedAt: '2025-11-12T00:00:00.000Z',
    finalizedAt: null,
  };

  const workpad: DraftWorkpad = {
    id: 'workpad-1',
    draftId: 'draft-1',
    userId: 'user-1',
    matchState: {},
    sectionsSnapshot: baseDraft.sections,
    lastPhase: 'metrics',
    createdAt: '2025-11-12T00:00:00.000Z',
    updatedAt: '2025-11-12T00:00:00.000Z',
  };

  const jobDescription: ParsedJobDescription = {
    company: 'Narrata',
    role: 'Senior PM',
    summary: 'Summary',
    standardRequirements: [],
    preferredRequirements: [],
    differentiatorRequirements: [],
    boilerplateSignals: [],
    differentiatorSignals: [],
    keywords: [],
    structuredInsights: {},
    analysis: {},
    structuredData: {},
    differentiatorNotes: undefined,
    rawSections: [],
  };

  const metrics: CoverLetterMatchMetric[] = [
    {
      key: 'ats',
      label: 'ATS Score',
      type: 'score',
      value: 88,
      summary: 'High ATS score.',
      tooltip: '',
    },
  ];

  let service: {
    generateDraftFast: ReturnType<typeof vi.fn>;
    getDraft: ReturnType<typeof vi.fn>;
    updateDraftSection: ReturnType<typeof vi.fn>;
    calculateMatchMetrics: ReturnType<typeof vi.fn>;
    calculateMetricsForDraft: ReturnType<typeof vi.fn>;
    finalizeDraft: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    const finalizedDraft: CoverLetterDraft = {
      ...baseDraft,
      status: 'finalized',
      finalizedAt: '2025-11-13T00:00:00.000Z',
      analytics: {
        ...(baseDraft.analytics ?? {}),
        finalizedAt: '2025-11-13T00:00:00.000Z',
        wordCount: 2,
        sections: 1,
        differentiatorCoverage: { addressed: 0, missing: 0, total: 0 },
      },
    };

    service = {
      generateDraftFast: vi.fn(async ({ onProgress }) => {
        onProgress?.({ phase: 'jd_parse', message: 'Parsing', timestamp: 1 });
        onProgress?.({ phase: 'metrics', message: 'Scoring', timestamp: 2 });
        return { draft: baseDraft, workpad, heuristicInsights: {} };
      }),
      getDraft: vi.fn(async () => baseDraft),
      updateDraftSection: vi.fn(async () => ({
        ...baseDraft,
        sections: [
          {
            ...baseDraft.sections[0],
            content: 'Updated content',
            status: {
              ...baseDraft.sections[0].status,
              isModified: true,
            },
          },
        ],
      })),
      calculateMatchMetrics: vi.fn(async () => metrics),
      calculateMetricsForDraft: vi.fn(async () => undefined),
      finalizeDraft: vi.fn(async () => ({
        draft: finalizedDraft,
        workpad: { ...workpad, lastPhase: 'finalized' as const },
      })),
    };
  });

  it('generates a draft and tracks progress', async () => {
    const { result } = renderHook(() =>
      useCoverLetterDraftHook({
        userId: 'user-1',
        service: service as any,
      }),
    );

    await act(async () => {
      await result.current.generateDraft({
        templateId: 'tmpl-1',
        jobDescriptionId: 'jd-1',
      });
    });

    expect(service.generateDraftFast).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        templateId: 'tmpl-1',
        jobDescriptionId: 'jd-1',
      }),
    );
    expect(result.current.draft).toEqual(baseDraft);
    expect(result.current.workpad).toEqual(workpad);
    expect(result.current.progress.map(update => update.phase)).toEqual(['jd_parse', 'metrics']);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('defers full Phase B to the server job when requested by the create flow', async () => {
    const { result } = renderHook(() =>
      useCoverLetterDraftHook({
        userId: 'user-1',
        service: service as any,
      }),
    );

    await act(async () => {
      await result.current.generateDraft({
        templateId: 'tmpl-1',
        jobDescriptionId: 'jd-1',
        deferPhaseBToServer: true,
      });
    });

    expect(service.generateDraftFast).toHaveBeenCalled();
    expect(service.calculateMetricsForDraft).not.toHaveBeenCalled();
    expect(result.current.metricsLoading).toBe(true);
  });

  it('updates a draft section through the service', async () => {
    const { result } = renderHook(() =>
      useCoverLetterDraftHook({
        userId: 'user-1',
        service: service as any,
        initialDraft: baseDraft,
      }),
    );

    await act(async () => {
      await result.current.updateSection({
        sectionId: 'section-1',
        content: 'Updated content',
      });
    });

    expect(service.updateDraftSection).toHaveBeenCalledWith('draft-1', 'section-1', 'Updated content');
    expect(result.current.draft?.sections[0].content).toBe('Updated content');
    expect(result.current.draft?.sections[0].status.isModified).toBe(true);
  });

  it('recalculates metrics and updates analytics', async () => {
    const { result } = renderHook(() =>
      useCoverLetterDraftHook({
        userId: 'user-1',
        service: service as any,
        initialDraft: baseDraft,
      }),
    );

    await act(async () => {
      await result.current.recalculateMetrics({
        jobDescription,
        userGoals: null,
      });
    });

    expect(service.calculateMatchMetrics).toHaveBeenCalledWith(
      baseDraft,
      jobDescription,
      null,
      expect.any(Object),
    );
    expect(result.current.draft?.metrics).toEqual(metrics);
    expect(result.current.draft?.analytics?.atsScore).toBe(88);
  });

  it('finalizes draft using the service and updates state', async () => {
    const { result } = renderHook(() =>
      useCoverLetterDraftHook({
        userId: 'user-1',
        service: service as any,
        initialDraft: baseDraft,
        initialWorkpad: workpad,
      }),
    );

    expect(result.current.isFinalizing).toBe(false);

    await act(async () => {
      await result.current.finalizeDraft();
    });

    expect(service.finalizeDraft).toHaveBeenCalledWith({
      draftId: 'draft-1',
      sections: baseDraft.sections,
    });
    expect(result.current.draft?.status).toBe('finalized');
    expect(result.current.draft?.finalizedAt).toBe('2025-11-13T00:00:00.000Z');
    expect(result.current.workpad?.lastPhase).toBe('finalized');
    expect(result.current.progress.some(update => update.phase === 'finalized')).toBe(true);
    expect(result.current.isFinalizing).toBe(false);
  });

  it('keeps metricsLoading true until Phase B artifacts land (sectionGapInsights)', async () => {
    vi.useFakeTimers();

    const phaseAEnhancedOnly: CoverLetterDraft = {
      ...baseDraft,
      enhancedMatchData: {
        coreRequirementDetails: [{ id: 'core-1', requirement: 'Req', demonstrated: true }],
        preferredRequirementDetails: [],
      } as any,
    };

    const phaseBGapsArrived: CoverLetterDraft = {
      ...phaseAEnhancedOnly,
      enhancedMatchData: {
        ...(phaseAEnhancedOnly.enhancedMatchData as any),
        sectionGapInsights: [],
      } as any,
    };

    let pollCount = 0;
    service.getDraft = vi.fn(async () => {
      pollCount += 1;
      return pollCount < 3 ? phaseAEnhancedOnly : phaseBGapsArrived;
    });

    const { result } = renderHook(() =>
      useCoverLetterDraftHook({
        userId: 'user-1',
        service: service as any,
      }),
    );

    await act(async () => {
      await result.current.generateDraft({
        templateId: 'tmpl-1',
        jobDescriptionId: 'jd-1',
      });
    });

    // Immediately after draft generation, metrics polling begins.
    expect(result.current.metricsLoading).toBe(true);

    // First poll: enhancedMatchData exists, but sectionGapInsights is still undefined -> should remain loading.
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.metricsLoading).toBe(true);

    // Second poll: sectionGapInsights becomes defined -> should clear loading.
    await act(async () => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.metricsLoading).toBe(false);

    vi.useRealTimers();
  });
});
