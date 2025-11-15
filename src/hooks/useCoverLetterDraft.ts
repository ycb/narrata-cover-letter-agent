import { useCallback, useMemo, useState } from 'react';
import { CoverLetterDraftService } from '@/services/coverLetterDraftService';
import type {
  CoverLetterDraft,
  CoverLetterDraftSection,
  CoverLetterMatchMetric,
  DraftGenerationProgressUpdate,
  DraftWorkpad,
  ParsedJobDescription,
} from '@/types/coverLetters';

interface DraftState {
  draft: CoverLetterDraft | null;
  workpad: DraftWorkpad | null;
  streamingSections: CoverLetterDraftSection[];
  progress: DraftGenerationProgressUpdate[];
  isGenerating: boolean;
  metricsLoading: boolean; // AGENT D: Track background metrics calculation
  isMutating: boolean;
  isFinalizing: boolean;
  error: string | null;
}

export interface UseCoverLetterDraftOptions {
  userId: string;
  templateId?: string | null;
  jobDescriptionId?: string | null;
  initialDraft?: CoverLetterDraft | null;
  initialWorkpad?: DraftWorkpad | null;
  service?: CoverLetterDraftService;
}

export interface GenerateDraftArgs {
  templateId?: string | null;
  jobDescriptionId?: string | null;
  signal?: AbortSignal;
}

export interface UpdateSectionArgs {
  sectionId: string;
  content: string;
}

export interface RecalculateMetricsArgs {
  jobDescription: ParsedJobDescription;
  userGoals: unknown;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
}

export interface UseCoverLetterDraftReturn {
  draft: CoverLetterDraft | null;
  workpad: DraftWorkpad | null;
  streamingSections: CoverLetterDraftSection[];
  progress: DraftGenerationProgressUpdate[];
  isGenerating: boolean;
  metricsLoading: boolean; // AGENT D: Expose metrics loading state
  isMutating: boolean;
  isFinalizing: boolean;
  error: string | null;
  templateId: string | null;
  jobDescriptionId: string | null;
  generateDraft: (args?: GenerateDraftArgs) => Promise<{ draft: CoverLetterDraft; workpad: DraftWorkpad | null }>;
  updateSection: (args: UpdateSectionArgs) => Promise<CoverLetterDraft>;
  recalculateMetrics: (args: RecalculateMetricsArgs) => Promise<CoverLetterMatchMetric[]>;
  finalizeDraft: (args?: { sections?: CoverLetterDraftSection[] }) => Promise<CoverLetterDraft>;
  setDraft: (draft: CoverLetterDraft | null) => void;
  setWorkpad: (workpad: DraftWorkpad | null) => void;
  setTemplateId: (templateId: string | null) => void;
  setJobDescriptionId: (jobDescriptionId: string | null) => void;
  clearError: () => void;
  resetProgress: () => void;
}

const deriveAtsScore = (metrics: CoverLetterMatchMetric[]): number => {
  const atsMetric = metrics.find(metric => metric.key === 'ats');
  if (!atsMetric) return 0;
  if (atsMetric.type === 'score') return Math.round(atsMetric.value);
  if (atsMetric.type === 'strength') {
    return atsMetric.strength === 'strong' ? 90 : atsMetric.strength === 'average' ? 70 : 45;
  }
  return 0;
};

export const useCoverLetterDraft = (options: UseCoverLetterDraftOptions): UseCoverLetterDraftReturn => {
  const service = useMemo(
    () => options.service ?? new CoverLetterDraftService(),
    [options.service],
  );

  const [context, setContext] = useState<{
    templateId: string | null;
    jobDescriptionId: string | null;
  }>({
    templateId: options.templateId ?? null,
    jobDescriptionId: options.jobDescriptionId ?? null,
  });

  const [state, setState] = useState<DraftState>({
    draft: options.initialDraft ?? null,
    workpad: options.initialWorkpad ?? null,
    streamingSections: [],
    progress: [],
    isGenerating: false,
    metricsLoading: false, // AGENT D: Initialize metrics loading state
    isMutating: false,
    isFinalizing: false,
    error: null,
  });

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  const resetProgress = useCallback(() => {
    setState(prev => ({
      ...prev,
      progress: [],
    }));
  }, []);

  const setDraft = useCallback((draft: CoverLetterDraft | null) => {
    setState(prev => ({
      ...prev,
      draft,
    }));
  }, []);

  const setWorkpad = useCallback((workpad: DraftWorkpad | null) => {
    setState(prev => ({
      ...prev,
      workpad,
    }));
  }, []);

  const setTemplateId = useCallback((templateId: string | null) => {
    setContext(prev => ({
      ...prev,
      templateId,
    }));
  }, []);

  const setJobDescriptionId = useCallback((jobDescriptionId: string | null) => {
    setContext(prev => ({
      ...prev,
      jobDescriptionId,
    }));
  }, []);

  const generateDraft = useCallback<UseCoverLetterDraftReturn['generateDraft']>(
    async (args = {}) => {
      const resolvedTemplateId = args.templateId ?? context.templateId;
      const resolvedJobDescriptionId = args.jobDescriptionId ?? context.jobDescriptionId;

      if (!resolvedTemplateId || !resolvedJobDescriptionId) {
        const error = new Error('templateId and jobDescriptionId are required to generate a draft.');
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
        throw error;
      }

      setContext(prev => ({
        templateId: resolvedTemplateId,
        jobDescriptionId: resolvedJobDescriptionId,
      }));

      setState(prev => ({
        ...prev,
        isGenerating: true,
        error: null,
        progress: [],
        streamingSections: [], // Reset streaming sections
      }));

        try {
        // AGENT D: Phase 1 - Fast draft generation (~15s)
        const result = await service.generateDraftFast({
          userId: options.userId,
          templateId: resolvedTemplateId,
          jobDescriptionId: resolvedJobDescriptionId,
          signal: args.signal,
          onProgress: update =>
            setState(prev => ({
              ...prev,
              progress: [...prev.progress, update],
            })),
          // AGENT C: Progressive section streaming
          onSectionBuilt: (section, index, total) => {
            setState(prev => ({
              ...prev,
              streamingSections: [...prev.streamingSections, section],
              progress: [
                ...prev.progress,
                {
                  phase: 'content_generation',
                  message: `Building section ${index + 1} of ${total}...`,
                  timestamp: Date.now(),
                },
              ],
            }));
          },
        });

        // Phase 1 complete: Draft is ready, user can start editing
        setState(prev => ({
          ...prev,
          draft: result.draft,
          workpad: result.workpad,
          isGenerating: false,
          metricsLoading: true, // Start background metrics
          streamingSections: [], // Clear streaming sections once draft is complete
          progress: [
            ...prev.progress,
            {
              phase: 'metrics',
              message: 'Calculating match metrics in background...',
              timestamp: Date.now(),
            },
          ],
        }));

        // AGENT D: Phase 2 - Background metrics calculation (~35s, non-blocking)
        // Run in background - user can edit while this runs
        service.calculateMetricsForDraft(
          result.draft.id,
          options.userId,
          resolvedJobDescriptionId,
          (phase, message) => {
            setState(prev => ({
              ...prev,
              progress: [
                ...prev.progress,
                {
                  phase: phase as DraftGenerationProgressUpdate['phase'],
                  message,
                  timestamp: Date.now(),
                },
              ],
            }));
          }
        ).then(async (enhancedMatchData) => {
          // Metrics calculation complete - update draft with results
          try {
            const updatedDraft = await service.getDraft(result.draft.id);
            setState(prev => ({
              ...prev,
              draft: updatedDraft ? {
                ...updatedDraft,
                enhancedMatchData,
              } : prev.draft,
              metricsLoading: false,
              progress: [
                ...prev.progress,
                {
                  phase: 'metrics',
                  message: 'Match metrics calculated successfully!',
                  timestamp: Date.now(),
                },
              ],
            }));
          } catch (error) {
            console.error('[useCoverLetterDraft] Failed to fetch updated metrics:', error);
            // Still clear loading state even if fetch fails
            setState(prev => ({
              ...prev,
              metricsLoading: false,
            }));
          }
        }).catch((error) => {
          console.error('[useCoverLetterDraft] Background metrics calculation failed:', error);
          setState(prev => ({
            ...prev,
            metricsLoading: false,
            progress: [
              ...prev.progress,
              {
                phase: 'metrics',
                message: 'Metrics calculation failed (draft is still usable)',
                timestamp: Date.now(),
              },
            ],
          }));
        });

        // Return immediately - metrics will update in background
        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to generate cover letter draft.';
        setState(prev => ({
          ...prev,
          isGenerating: false,
          metricsLoading: false,
          error: message,
          streamingSections: [], // Clear on error
        }));
        throw error;
      }
    },
    [context.jobDescriptionId, context.templateId, options.userId, service],
  );

  const updateSection = useCallback<UseCoverLetterDraftReturn['updateSection']>(
    async ({ sectionId, content }) => {
      if (!state.draft) {
        const error = new Error('No draft is available to update.');
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
        throw error;
      }

      setState(prev => ({
        ...prev,
        isMutating: true,
        error: null,
      }));

      try {
        const updatedDraft = await service.updateDraftSection(state.draft.id, sectionId, content);
        setState(prev => ({
          ...prev,
          draft: updatedDraft,
          isMutating: false,
        }));
        return updatedDraft;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to update cover letter section.';
        setState(prev => ({
          ...prev,
          isMutating: false,
          error: message,
        }));
        throw error;
      }
    },
    [service, state.draft],
  );

  const recalculateMetrics = useCallback<UseCoverLetterDraftReturn['recalculateMetrics']>(
    async ({ jobDescription, userGoals, signal, onToken }) => {
      if (!state.draft) {
        const error = new Error('No draft is available to score.');
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
        throw error;
      }

      setState(prev => ({
        ...prev,
        isMutating: true,
        error: null,
      }));

      try {
        const metrics = await service.calculateMatchMetrics(
          state.draft,
          jobDescription,
          userGoals,
          { signal, onToken },
        );
        const atsScore = deriveAtsScore(metrics);

        setState(prev => ({
          ...prev,
          draft: prev.draft
            ? {
                ...prev.draft,
                metrics,
                analytics: {
                  ...(prev.draft.analytics ?? {}),
                  atsScore,
                },
              }
            : prev.draft,
          isMutating: false,
        }));

        return metrics;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to recalculate cover letter metrics.';
        setState(prev => ({
          ...prev,
          isMutating: false,
          error: message,
        }));
        throw error;
      }
    },
    [service, state.draft],
  );

  const finalizeDraft = useCallback<UseCoverLetterDraftReturn['finalizeDraft']>(
    async (args = {}) => {
      if (!state.draft) {
        const error = new Error('No draft is available to finalize.');
        setState(prev => ({
          ...prev,
          error: error.message,
        }));
        throw error;
      }

      setState(prev => ({
        ...prev,
        isFinalizing: true,
        error: null,
      }));

      try {
        const { draft: finalizedDraft, workpad } = await service.finalizeDraft({
          draftId: state.draft.id,
          sections: args.sections ?? state.draft.sections,
        });

        setState(prev => ({
          ...prev,
          draft: finalizedDraft,
          workpad: workpad ?? prev.workpad,
          isFinalizing: false,
          progress: [
            ...prev.progress,
            {
              phase: 'finalized',
              message: 'Cover letter finalized.',
              timestamp: Date.now(),
            },
          ],
        }));

        return finalizedDraft;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to finalize cover letter draft.';
        setState(prev => ({
          ...prev,
          isFinalizing: false,
          error: message,
        }));
        throw error;
      }
    },
    [service, state.draft],
  );

  return {
    draft: state.draft,
    workpad: state.workpad,
    streamingSections: state.streamingSections,
    progress: state.progress,
    isGenerating: state.isGenerating,
    metricsLoading: state.metricsLoading, // AGENT D: Expose metrics loading state
    isMutating: state.isMutating,
    isFinalizing: state.isFinalizing,
    error: state.error,
    templateId: context.templateId,
    jobDescriptionId: context.jobDescriptionId,
    generateDraft,
    updateSection,
    recalculateMetrics,
    finalizeDraft,
    setDraft,
    setWorkpad,
    setTemplateId,
    setJobDescriptionId,
    clearError,
    resetProgress,
  };
};

