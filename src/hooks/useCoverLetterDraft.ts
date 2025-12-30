import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoverLetterDraftService } from '@/services/coverLetterDraftService';
import { evaluateSectionGap } from '@/services/sectionGapEvaluator';
import type {
  CoverLetterDraft,
  CoverLetterDraftSection,
  CoverLetterMatchMetric,
  DraftGenerationProgressUpdate,
  DraftWorkpad,
  ParsedJobDescription,
  SectionGapInsight,
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
  pendingSectionInsights: Record<string, SectionGapInsight>; // AGENT D: Heuristic insights pending LLM refresh
  sectionInsightsRefreshing: Set<string>; // AGENT D: Track which sections are being refreshed
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
  pendingSectionInsights: Record<string, SectionGapInsight>; // AGENT D: Heuristic insights
  sectionInsightsRefreshing: Set<string>; // AGENT D: Sections being refreshed
  generateDraft: (args?: GenerateDraftArgs) => Promise<{ draft: CoverLetterDraft; workpad: DraftWorkpad | null }>;
  updateSection: (args: UpdateSectionArgs) => Promise<CoverLetterDraft>;
  recalculateMetrics: (args: RecalculateMetricsArgs) => Promise<CoverLetterMatchMetric[]>;
  refreshSectionInsights: (sectionId: string) => Promise<void>; // AGENT D: Manual refresh
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
    pendingSectionInsights: {}, // AGENT D: Initialize pending insights
    sectionInsightsRefreshing: new Set(), // AGENT D: Initialize refreshing set
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

  // Phase B should be launched exactly once per draft id (and retried automatically on error).
  const phaseBKickDraftIdRef = useRef<string | null>(null);
  const phaseBAutoRetryCountRef = useRef<Record<string, number>>({});

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
        // AGENT D: Set heuristic insights for instant gap feedback
        console.log('[AGENT D] useCoverLetterDraft - Setting pendingSectionInsights:', {
          heuristicInsights: result.heuristicInsights,
          insightKeys: result.heuristicInsights ? Object.keys(result.heuristicInsights) : []
        });

        setState(prev => ({
          ...prev,
          draft: result.draft,
          workpad: result.workpad,
          isGenerating: false,
          metricsLoading: true, // Metrics calculation happening in background (3 parallel calls)
          streamingSections: [], // Clear streaming sections once draft is complete
          pendingSectionInsights: result.heuristicInsights || {}, // AGENT D: Heuristic gaps
          progress: prev.progress.some(update => update.phase === 'metrics')
            ? prev.progress
            : [
                ...prev.progress,
                {
                  phase: 'metrics',
                  message: 'Calculating match metrics (~45 seconds)...',
                  timestamp: Date.now(),
                },
              ],
        }));

        // PHASE 2: Kick off metrics + gap detection in the background (caller-managed).
        // This prevents "gap stall" cases where the background run never starts or fails silently.
        if (phaseBKickDraftIdRef.current !== result.draft.id) {
          phaseBKickDraftIdRef.current = result.draft.id;
          phaseBAutoRetryCountRef.current[result.draft.id] = 0;

          const runPhaseB = async () => {
            const attempt = (phaseBAutoRetryCountRef.current[result.draft.id] ?? 0) + 1;
            phaseBAutoRetryCountRef.current[result.draft.id] = attempt;
            try {
              await service.calculateMetricsForDraft(
                result.draft.id,
                options.userId,
                resolvedJobDescriptionId,
                update =>
                  setState(prev => ({
                    ...prev,
                    progress: [...prev.progress, update],
                  })),
              );
            } catch (error) {
              console.warn('[useCoverLetterDraft] Phase B run failed:', error);
              // Auto-retry quickly (once) to avoid forcing users to click "Retry gaps".
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 1500));
                return runPhaseB();
              }
            } finally {
              // Fetch updated draft regardless (Phase B persists status + sectionGapInsights even on error).
              try {
                const updated = await service.getDraft(result.draft.id);
                if (updated) {
                  setState(prev => {
                    const hasGapInsights = updated.enhancedMatchData?.sectionGapInsights !== undefined;
                    return {
                      ...prev,
                      draft: updated,
                      ...(hasGapInsights ? { metricsLoading: false, pendingSectionInsights: {} } : null),
                    };
                  });
                }
              } catch (fetchError) {
                console.error('[useCoverLetterDraft] Failed to fetch draft after Phase B:', fetchError);
              }
            }
          };

          runPhaseB().catch(error => {
            console.error('[useCoverLetterDraft] Phase B background runner crashed:', error);
          });
        }

        // PHASE 2: Metrics calculating in background with 3 parallel calls
        // Set up polling to check when metrics are complete
        const pollForMetrics = async () => {
          const maxAttempts = 15; // 15 attempts * 4s = 60s max
          let lastDraft: CoverLetterDraft | null = null;

          for (let i = 0; i < maxAttempts; i++) {
            await new Promise(resolve => setTimeout(resolve, 4000)); // Check every 4s

            try {
              const updatedDraft = await service.getDraft(result.draft.id);
              if (updatedDraft) {
                lastDraft = updatedDraft;

                // Keep draft content in sync while Phase B runs (e.g., template slot fills),
                // but keep `metricsLoading` true until `sectionGapInsights` lands.
                setState(prev => {
                  if (!prev.draft) return prev;
                  if (prev.draft.updatedAt === updatedDraft.updatedAt) return prev;
                  return { ...prev, draft: updatedDraft };
                });

                // IMPORTANT:
                // For the cover letter draft UI, gap detection is the critical Phase B artifact.
                // We must keep polling until `sectionGapInsights` lands; otherwise the UI can
                // stall in a "Gaps" skeleton state even if other Phase B artifacts (score/readiness)
                // arrive first.
                const hasSectionGapInsights =
                  updatedDraft.enhancedMatchData?.sectionGapInsights !== undefined;

                if (hasSectionGapInsights) {
                  setState(prev => ({
                    ...prev,
                    draft: updatedDraft,
                    metricsLoading: false,
                    pendingSectionInsights: {}, // Clear heuristic gaps once LLM metrics complete
                  }));
                  return;
                }
              }
            } catch (error) {
              console.error('[useCoverLetterDraft] Failed to poll for metrics:', error);
            }
          }

          // Timeout after 60s (or no usable data found) – still lift last draft into state if we have one
          setState(prev => ({
            ...prev,
            draft: lastDraft ?? prev.draft,
            metricsLoading: false,
            pendingSectionInsights: {}, // Clear heuristic gaps even on timeout
          }));
        };

        // Start polling in background
        pollForMetrics().catch(error => {
          console.error('[useCoverLetterDraft] Metrics polling failed:', error);
        });

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

  // If gap detection arrives through any path, clear metricsLoading so UI can render data.
  useEffect(() => {
    setState(prev => {
      const hasGapInsights = prev.draft?.enhancedMatchData?.sectionGapInsights !== undefined;

      if (prev.metricsLoading && hasGapInsights) {
        return { ...prev, metricsLoading: false, pendingSectionInsights: {} };
      }
      return prev;
    });
  }, [state.draft?.enhancedMatchData?.sectionGapInsights]);

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
        // AGENT D: Update draft via service
        const updatedDraft = await service.updateDraftSection(state.draft.id, sectionId, content);
        
        // AGENT D: Immediately run heuristic gap evaluation for this section
        const updatedSection = updatedDraft.sections.find(s => s.id === sectionId);
        if (updatedSection && context.jobDescriptionId) {
          try {
            // Fetch JD for heuristic evaluation
            const jobDescription = await service['fetchJobDescription'](
              options.userId,
              context.jobDescriptionId
            );
            
            // Run heuristic evaluation
            const heuristicInsight = evaluateSectionGap({
              section: updatedSection,
              jobDescription,
              allSections: updatedDraft.sections,
            });
            
            // Store heuristic insight as pending (will be replaced by LLM when available)
            setState(prev => ({
              ...prev,
              draft: updatedDraft,
              isMutating: false,
              pendingSectionInsights: {
                ...prev.pendingSectionInsights,
                [sectionId]: heuristicInsight,
              },
            }));
            
            // AGENT D: Trigger background metrics refresh
            // This will recalculate full metrics + sectionGapInsights via LLM
            console.log(`[useCoverLetterDraft] Section ${sectionId} updated, triggering background refresh...`);
            // Note: Background refresh will be implemented in next steps
          } catch (heuristicError) {
            console.error('[useCoverLetterDraft] Heuristic gap evaluation failed:', heuristicError);
            // Still update draft even if heuristic fails
            setState(prev => ({
              ...prev,
              draft: updatedDraft,
              isMutating: false,
            }));
          }
        } else {
          // No JD available, just update draft
          setState(prev => ({
            ...prev,
            draft: updatedDraft,
            isMutating: false,
          }));
        }
        
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
    [service, state.draft, context.jobDescriptionId, options.userId],
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

  /**
   * AGENT D: Refresh section insights (manual trigger from UI)
   * This allows users to press "Generate Content" or "Refresh" to get
   * updated LLM-based gap analysis for a specific section.
   */
  const refreshSectionInsights = useCallback<UseCoverLetterDraftReturn['refreshSectionInsights']>(
    async (sectionId: string) => {
      if (!state.draft || !context.jobDescriptionId) {
        console.warn('[useCoverLetterDraft] Cannot refresh insights without draft and JD');
        return;
      }

      // Mark section as refreshing
      setState(prev => ({
        ...prev,
        sectionInsightsRefreshing: new Set([...prev.sectionInsightsRefreshing, sectionId]),
      }));

      try {
        console.log(`[useCoverLetterDraft] Refreshing insights for section ${sectionId}...`);
        // Fast retry path: only recompute sectionGapInsights so "Retry gaps" doesn't
        // wait on the entire Phase B bundle (requirements, content standards, etc).
        await service.calculateSectionGapsForDraft(
          state.draft.id,
          options.userId,
          context.jobDescriptionId,
          update => {
            setState(prev => ({
              ...prev,
              progress: [...prev.progress, update],
            }));
          },
        );

        // Fetch updated draft with new insights
        const updatedDraft = await service.getDraft(state.draft.id);
        if (updatedDraft) {
          setState(prev => {
            // Remove pending insight for this section (replaced by LLM insight)
            const newPendingInsights = { ...prev.pendingSectionInsights };
            delete newPendingInsights[sectionId];
            
            // Remove from refreshing set
            const newRefreshing = new Set(prev.sectionInsightsRefreshing);
            newRefreshing.delete(sectionId);
            
            return {
              ...prev,
              draft: updatedDraft,
              pendingSectionInsights: newPendingInsights,
              sectionInsightsRefreshing: newRefreshing,
            };
          });
        }
      } catch (error) {
        console.error(`[useCoverLetterDraft] Failed to refresh insights for section ${sectionId}:`, error);
        // Remove from refreshing set even on error
        setState(prev => {
          const newRefreshing = new Set(prev.sectionInsightsRefreshing);
          newRefreshing.delete(sectionId);
          return {
            ...prev,
            sectionInsightsRefreshing: newRefreshing,
          };
        });
      }
    },
    [state.draft, context.jobDescriptionId, service, options.userId],
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
    pendingSectionInsights: state.pendingSectionInsights, // AGENT D: Expose pending insights
    sectionInsightsRefreshing: state.sectionInsightsRefreshing, // AGENT D: Expose refreshing state
    generateDraft,
    updateSection,
    recalculateMetrics,
    refreshSectionInsights, // AGENT D: Expose manual refresh method
    finalizeDraft,
    setDraft,
    setWorkpad,
    setTemplateId,
    setJobDescriptionId,
    clearError,
    resetProgress,
  };
};
