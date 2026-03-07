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
import { CoverLetterVariationService, type VariationMetadata } from '@/services/coverLetterVariationService';
import { MetricsUpdateService, type MetricsDelta } from '@/services/metricsUpdateService';
import type { Gap } from '@/services/gapTransformService';
import type { CoverLetterSection, DetailedMatchAnalysis } from '@/services/coverLetterDraftService';
import type { MatchMetricsData } from '@/components/cover-letters/useMatchMetricsDetails';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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
        // 1. Generate content with streaming via Edge Function
        const content = await streamGapResolutionViaEdgeFunction(
          user.id,
          gap,
          jobDescription,
          {
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
          }
        );

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
      if (!user) {
        throw new Error('User not authenticated');
      }

      setState(prev => ({
        ...prev,
        isGenerating: true,
        error: null,
      }));

      try {
        // Generate variations by calling Edge Function multiple times
        const variations: string[] = [];
        for (let i = 0; i < count; i++) {
          const content = await streamGapResolutionViaEdgeFunction(
            user.id,
            gap,
            jobDescription,
            {}
          );
          variations.push(content);
        }

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
    [user, options]
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

/**
 * Call Edge Function for gap resolution with SSE streaming
 */
async function streamGapResolutionViaEdgeFunction(
  userId: string,
  gap: Gap,
  jobContext: {
    role?: string;
    company?: string;
    coreRequirements?: string[];
    preferredRequirements?: string[];
  },
  options: {
    onUpdate?: (content: string) => void;
    onError?: (error: Error) => void;
  }
): Promise<string> {
  // Get auth session for token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('No active session');
  }

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stream-gap-resolution`;

  return new Promise((resolve, reject) => {
    let fullContent = '';
    let eventSource: EventSource | null = null;

    try {
      // Create EventSource connection with auth token
      eventSource = new EventSource(functionUrl + '?access_token=' + session.access_token);

      // Send request body via fetch first (EventSource doesn't support POST body)
      fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gap: {
            id: gap.id,
            type: gap.type,
            severity: gap.severity,
            description: gap.description,
            suggestion: gap.suggestion,
          },
          jobContext,
        }),
      }).catch(err => {
        console.error('[useGapResolution] Fetch error:', err);
        reject(err);
      });

      eventSource.addEventListener('start', () => {
        console.log('[useGapResolution] Stream started');
      });

      eventSource.addEventListener('update', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        fullContent = data.content;
        options.onUpdate?.(fullContent);
      });

      eventSource.addEventListener('complete', (e: MessageEvent) => {
        const data = JSON.parse(e.data);
        fullContent = data.content;
        eventSource?.close();
        resolve(fullContent);
      });

      eventSource.addEventListener('error', (e: Event) => {
        console.error('[useGapResolution] SSE error:', e);
        eventSource?.close();
        const error = new Error('Stream error');
        options.onError?.(error);
        reject(error);
      });

      eventSource.onerror = (e) => {
        console.error('[useGapResolution] Connection error:', e);
        eventSource?.close();
        const error = new Error('Connection failed');
        options.onError?.(error);
        reject(error);
      };

    } catch (error) {
      eventSource?.close();
      const err = error instanceof Error ? error : new Error('Unknown error');
      options.onError?.(err);
      reject(err);
    }
  });
}

