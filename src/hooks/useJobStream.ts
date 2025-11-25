import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type {
  JobType,
  JobStreamState,
  CreateJobRequest,
  CreateJobResponse,
  JobInput,
  JobResult,
} from '../types/jobs';

// ============================================================================
// Hook Configuration
// ============================================================================

interface UseJobStreamOptions {
  /**
   * Auto-start stream on mount (if jobId provided)
   * @default true
   */
  autoStart?: boolean;

  /**
   * Timeout for job completion (ms)
   * Set to 0 to disable
   * @default 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Callback when job completes
   */
  onComplete?: (result: JobResult) => void;

  /**
   * Callback when job errors
   */
  onError?: (error: string) => void;

  /**
   * Callback on each progress update
   */
  onProgress?: (stage: string, data: any) => void;
}

interface UseJobStreamReturn {
  /**
   * Current job state
   */
  state: JobStreamState | null;

  /**
   * Create a new job and start streaming
   */
  createJob: (type: JobType, input: JobInput) => Promise<string>;

  /**
   * Connect to existing job stream
   */
  connect: (jobId: string) => void;

  /**
   * Disconnect from stream
   */
  disconnect: () => void;

  /**
   * Is currently streaming
   */
  isStreaming: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Reset state
   */
  reset: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useJobStream(
  initialJobId?: string,
  options: UseJobStreamOptions = {}
): UseJobStreamReturn {
  const {
    autoStart = true,
    timeout = 300000, // 5 minutes
    onComplete,
    onError,
    onProgress,
  } = options;

  // State
  const [state, setState] = useState<JobStreamState | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const pollTimerRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const jobIdRef = useRef<string | undefined>(initialJobId);

  // ============================================================================
  // Helpers
  // ============================================================================

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const clearTimeoutTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('[useJobStream] disconnect() called');
    clearPollTimer();
    clearTimeoutTimer();
    setIsStreaming(false);
  }, [clearPollTimer, clearTimeoutTimer]);

  // ============================================================================
  // Create Job
  // ============================================================================

  const createJob = useCallback(
    async (type: JobType, input: JobInput): Promise<string> => {
      try {
        setError(null);

        // Get auth session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        // Call Edge Function to create job
        const { data, error: fetchError } =
          await supabase.functions.invoke<CreateJobResponse>('create-job', {
            body: { type, input } as CreateJobRequest,
          });

        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to create job');
        }

        if (!data?.jobId) {
          throw new Error('No job ID returned');
        }

        const jobId = data.jobId;
        console.log('[useJobStream] Created job:', jobId);

        // Initialize state
        setState({
          jobId,
          type,
          status: 'pending',
          stages: {},
        });

        jobIdRef.current = jobId;

        // Trigger the pipeline processing (fire and forget)
        console.log('[useJobStream] Triggering stream-job-process for jobId:', jobId);
        supabase.functions
          .invoke('stream-job-process', {
            body: { jobId },
          })
          .then((result) => {
            console.log(
              '[useJobStream] stream-job-process triggered successfully:',
              result
            );
          })
          .catch((err) => {
            console.error('[useJobStream] Failed to trigger pipeline:', err);
          });

        // Auto-connect if enabled
        if (autoStart) {
          connect(jobId);
        }

        return jobId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create job';
        console.error('[useJobStream] createJob error:', errorMessage, err);
        setError(errorMessage);
        onError?.(errorMessage);
        throw err;
      }
    },
    [autoStart, onError]
  );

  // ============================================================================
  // Connect (Polling implementation)
// ============================================================================

  const connect = useCallback(
    (jobId: string) => {
      console.log('[useJobStream] Starting polling for job:', jobId);

      // Clean up any previous job
      disconnect();

      setError(null);
      setIsStreaming(true);
      jobIdRef.current = jobId;

      const pollInterval = 2000; // 2 seconds
      let pollCount = 0;

      const poll = async () => {
        const currentJobId = jobIdRef.current;
        if (!currentJobId) {
          console.warn(
            '[useJobStream] Poll called with no jobIdRef, stopping poll.'
          );
          disconnect();
          return;
        }

        pollCount++;
        console.log(
          '[useJobStream] Polling (#' + pollCount + ') for jobId:',
          currentJobId
        );

        try {
          const { data: job, error: queryError } = await supabase
            .from('jobs')
            .select('*')
            .eq('id', currentJobId)
            .single();

          if (queryError || !job) {
            console.error('[useJobStream] Error fetching job:', queryError);
            const msg = queryError?.message || 'Job not found';
            setError(msg);
            onError?.(msg);
            disconnect();
            return;
          }

          console.log('[useJobStream] Poll result FULL DATA:', job);
          console.log('[useJobStream] Poll result summary:', {
            status: job.status,
            stagesCount: Object.keys(job.stages || {}).length,
            stageKeys: Object.keys(job.stages || {}),
            hasBasicMetrics: !!job.stages?.basicMetrics,
            hasRequirements: !!job.stages?.requirementAnalysis,
            hasGaps: !!job.stages?.sectionGaps,
          });

          // Update state
          setState({
            jobId: job.id,
            type: job.type,
            status: job.status,
            stages: job.stages || {},
            result: job.result,
            error: job.error_message,
            createdAt: job.created_at ? new Date(job.created_at) : undefined,
            startedAt: job.started_at ? new Date(job.started_at) : undefined,
            completedAt: job.completed_at
              ? new Date(job.completed_at)
              : undefined,
          });

          // Fire progress callbacks
          if (job.stages) {
            Object.entries(job.stages).forEach(
              ([stageName, stageData]: [string, any]) => {
                if (stageData?.status === 'complete') {
                  onProgress?.(stageName, stageData.data);
                }
              }
            );
          }

          // Handle terminal states
          if (job.status === 'complete') {
            console.log('[useJobStream] Job complete:', job.id);
            if (job.result) {
              onComplete?.(job.result);
            }
            disconnect();
            return;
          }

          if (job.status === 'error') {
            console.error('[useJobStream] Job failed:', job.error_message);
            const msg = job.error_message || 'Job failed';
            setError(msg);
            onError?.(msg);
            disconnect();
            return;
          }

          // Otherwise: pending / running → keep polling
        } catch (err) {
          console.error('[useJobStream] Poll error:', err);
          const msg = err instanceof Error ? err.message : 'Polling failed';
          setError(msg);
          onError?.(msg);
          disconnect();
        }
      };

      // Kick off immediately, then every interval
      poll();
      pollTimerRef.current = window.setInterval(poll, pollInterval);

      // Set timeout if configured
      if (timeout > 0) {
        timeoutRef.current = window.setTimeout(() => {
          console.warn('[useJobStream] Job timed out, disconnecting');
          disconnect();
          const msg = 'Job timed out';
          setError(msg);
          onError?.(msg);
        }, timeout);
      }
    },
    [disconnect, onComplete, onError, onProgress, timeout]
  );

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    console.log('[useJobStream] reset() called');
    disconnect();
    setState(null);
    setError(null);
    jobIdRef.current = undefined;
  }, [disconnect]);

  // ============================================================================
  // Auto-start on mount
  // ============================================================================

  useEffect(() => {
    if (autoStart && initialJobId) {
      connect(initialJobId);
    }
    // No cleanup - polling is self-cleaning (stops on complete/error/timeout)
  }, [autoStart, initialJobId, connect]);

  // ============================================================================
  // Return API
  // ============================================================================

  return {
    state,
    createJob,
    connect,
    disconnect,
    isStreaming,
    error,
    reset,
  };
}

// ============================================================================
// Convenience Hooks for Specific Job Types
// ============================================================================

export function useCoverLetterJobStream(options?: UseJobStreamOptions) {
  return useJobStream(undefined, options);
}

export function useOnboardingJobStream(options?: UseJobStreamOptions) {
  return useJobStream(undefined, options);
}

export function usePMLevelsJobStream(options?: UseJobStreamOptions) {
  return useJobStream(undefined, options);
}