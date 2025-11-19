/**
 * useGapResolution Hook
 * 
 * Manages the complete gap resolution workflow:
 * - Generates streaming content to address gaps
 * - Persists variations to database
 * - Updates metrics incrementally
 * - Provides real-time UI feedback
 */

import { useState, useCallback } from 'react';
import { GapResolutionStreamingService } from '@/services/gapResolutionStreamingService';
import { CoverLetterVariationService, type VariationMetadata } from '@/services/coverLetterVariationService';
import { MetricsUpdateService, type MetricsDelta } from '@/services/metricsUpdateService';
import type { Gap } from '@/services/gapTransformService';
import type { CoverLetterSection, DetailedMatchAnalysis } from '@/services/coverLetterDraftService';
import type { MatchMetricsData } from '@/components/cover-letters/useMatchMetricsDetails';
import { useAuth } from '@/contexts/AuthContext';

interface UseGapResolutionOptions {
  onMetricsUpdated?: (metrics: MatchMetricsData, delta: MetricsDelta) => void;
  onVariationSaved?: (variationId: string) => void;
  onError?: (error: Error) => void;
}

interface GapResolutionState {
  isGenerating: boolean;
  isSaving: boolean;
  streamingContent: string;
  error: Error | null;
}

export function useGapResolution(options: UseGapResolutionOptions = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<GapResolutionState>({
    isGenerating: false,
    isSaving: false,
    streamingContent: '',
    error: null,
  });

  const streamingService = new GapResolutionStreamingService();
  const metricsService = new MetricsUpdateService();

  /**
   * Resolve a gap with streaming content generation
   */
  const resolveGap = useCallback(
    async (
      gap: Gap,
      jobDescription: {
        role?: string;
        company?: string;
        coreRequirements?: string[];
        preferredRequirements?: string[];
      },
      currentSections: CoverLetterSection[],
      currentMetrics: MatchMetricsData,
      currentAnalysis: DetailedMatchAnalysis,
      options: {
        saveVariation?: boolean;
        variationMetadata?: Partial<VariationMetadata>;
      } = {}
    ): Promise<{
      content: string;
      variationId?: string;
      updatedMetrics?: MatchMetricsData;
      delta?: MetricsDelta;
    }> => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      setState(prev => ({
        ...prev,
        isGenerating: true,
        streamingContent: '',
        error: null,
      }));

      try {
        // 1. Generate content with streaming
        const content = await streamingService.streamGapResolution(gap, jobDescription, {
          onUpdate: (chunk) => {
            setState(prev => ({
              ...prev,
              streamingContent: chunk,
            }));
          },
          onError: (error) => {
            setState(prev => ({
              ...prev,
              error,
              isGenerating: false,
            }));
            options?.onError?.(error);
          },
        });

        setState(prev => ({
          ...prev,
          isGenerating: false,
        }));

        // 2. Save variation if requested
        let variationId: string | undefined;
        if (options.saveVariation && gap.paragraphId) {
          setState(prev => ({
            ...prev,
            isSaving: true,
          }));

          const metadata: VariationMetadata = {
            gapId: gap.id,
            gapType: gap.type,
            targetSection: gap.paragraphId,
            requirementsAddressed: gap.addresses || [],
            createdBy: 'AI',
            targetJobTitle: jobDescription.role,
            targetCompany: jobDescription.company,
            ...options.variationMetadata,
          };

          const variation = await CoverLetterVariationService.saveVariation(
            user.id,
            gap.paragraphId,
            content,
            metadata
          );

          variationId = variation.id;
          options?.onVariationSaved?.(variationId);

          setState(prev => ({
            ...prev,
            isSaving: false,
          }));
        }

        // 3. Update metrics incrementally
        const updatedSections = currentSections.map(section =>
          section.id === gap.paragraphId
            ? { ...section, content }
            : section
        );

        const { metrics: updatedMetrics, delta } = await metricsService.updateMetricsAfterGapResolution(
          currentMetrics,
          currentAnalysis,
          gap,
          updatedSections,
          jobDescription.coreRequirements || [],
          jobDescription.preferredRequirements || []
        );

        options?.onMetricsUpdated?.(updatedMetrics, delta);

        return {
          content,
          variationId,
          updatedMetrics,
          delta,
        };
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState(prev => ({
          ...prev,
          error: err,
          isGenerating: false,
          isSaving: false,
        }));
        options?.onError?.(err);
        throw err;
      }
    },
    [user, streamingService, metricsService, options]
  );

  /**
   * Generate multiple variations for a gap
   */
  const generateVariations = useCallback(
    async (
      gap: Gap,
      jobDescription: {
        role?: string;
        company?: string;
        coreRequirements?: string[];
        preferredRequirements?: string[];
      },
      count: number = 3
    ): Promise<string[]> => {
      setState(prev => ({
        ...prev,
        isGenerating: true,
        error: null,
      }));

      try {
        const variations = await streamingService.generateVariations(gap, jobDescription, count);

        setState(prev => ({
          ...prev,
          isGenerating: false,
        }));

        return variations;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');
        setState(prev => ({
          ...prev,
          error: err,
          isGenerating: false,
        }));
        options?.onError?.(err);
        throw err;
      }
    },
    [streamingService, options]
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState({
      isGenerating: false,
      isSaving: false,
      streamingContent: '',
      error: null,
    });
  }, []);

  return {
    ...state,
    resolveGap,
    generateVariations,
    reset,
  };
}

