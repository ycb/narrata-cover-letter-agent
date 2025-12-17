import { useState, useEffect, useCallback, useRef } from 'react';
import { log } from '@/lib/log';
import { supabase } from '../lib/supabase';
import type {
  JobType,
  JobStreamState,
  CreateJobRequest,
  CreateJobResponse,
  JobInput,
  JobResult,
} from '../types/jobs';

// Dev-only logging (Task 5: streaming wiring diagnostics)
const IS_DEV = process.env.NODE_ENV !== 'production';
const devLog = (...args: unknown[]) => {
  if (IS_DEV) {
    console.log(...args);
  }
};

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
   * Polling interval in milliseconds
   * @default 2000
   */
  pollIntervalMs?: number;

  /**
   * Disable SSE and use polling only.
   * Useful when EventSource is blocked/flaky in the current environment.
   * @default false
   */
  disableSSE?: boolean;

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
    disableSSE = false,
    pollIntervalMs = 2000,
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
    log.debug('[useJobStream] disconnect() called');
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
        const requestBody = { type, input } as CreateJobRequest;
        console.log('[useJobStream] Creating job with payload:', requestBody);
        
        const { data, error: fetchError } =
          await supabase.functions.invoke<CreateJobResponse>('create-job', {
            body: requestBody,
          });

        console.log('[useJobStream] create-job response:', { data, error: fetchError });

        if (fetchError) {
          console.error('[useJobStream] create-job error:', fetchError);
          throw new Error(fetchError.message || 'Failed to create job');
        }

        if (!data?.jobId) {
          throw new Error('No job ID returned');
        }

        const jobId = data.jobId;
        log.info('[useJobStream] Created job:', jobId);

        // Initialize state
        setState({
          jobId,
          type,
          status: 'pending',
          stages: {},
        });

        jobIdRef.current = jobId;

        // Kick off processing immediately (bypass SSE dependency)
        try {
          await supabase.functions.invoke('stream-job-process', {
            body: { jobId },
          });
        } catch (procErr) {
          console.warn('[useJobStream] stream-job-process invoke failed (non-blocking):', procErr);
        }

        // Auto-connect if enabled
        if (autoStart) {
          connect(jobId);
        }

        return jobId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create job';
        log.error('[useJobStream] createJob error:', errorMessage, err);
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
      // Helper: polling fallback
      const startPolling = () => {
        log.info('[useJobStream] Falling back to polling for job:', jobId);
        // Clean up any previous job
        disconnect();
        setError(null);
        setIsStreaming(true);
        jobIdRef.current = jobId;

        const pollInterval = pollIntervalMs; // configurable
        let pollCount = 0;

        const poll = async () => {
          const currentJobId = jobIdRef.current;
          if (!currentJobId) {
            log.info('[useJobStream] Poll called with no jobIdRef, stopping poll.');
            disconnect();
            return;
          }
          pollCount++;
          log.debug('[useJobStream] Polling (#' + pollCount + ') for jobId:', currentJobId);
          try {
            const { data: job, error: queryError } = await supabase
              .from('jobs')
              .select('*')
              .eq('id', currentJobId)
              .single();
            if (queryError || !job) {
              log.error('[useJobStream] Error fetching job:', queryError);
              const msg = queryError?.message || 'Job not found';
              setError(msg);
              onError?.(msg);
              disconnect();
              return;
            }
            // Update state
            const newState = {
              jobId: job.id,
              type: job.type,
              status: job.status,
              stages: job.stages || {},
              result: job.result,
              error: job.error_message,
              progress: job.progress,
              createdAt: job.created_at ? new Date(job.created_at) : undefined,
              startedAt: job.started_at ? new Date(job.started_at) : undefined,
              completedAt: job.completed_at ? new Date(job.completed_at) : undefined,
            };
            setState(newState);
            if (job.stages) {
              Object.entries(job.stages).forEach(([stageName, stageData]: [string, any]) => {
                if (stageData?.status === 'complete') {
                  onProgress?.(stageName, stageData.data);
                }
              });
            }
            if (job.status === 'complete') {
              onComplete?.(job.result);
              disconnect();
              return;
            }
            if (job.status === 'error') {
              const msg = job.error_message || 'Job failed';
              setError(msg);
              onError?.(msg);
              disconnect();
              return;
            }
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Polling failed';
            setError(msg);
            onError?.(msg);
            disconnect();
          }
        };
        poll();
        pollTimerRef.current = window.setInterval(poll, pollInterval);
        if (timeout > 0) {
          timeoutRef.current = window.setTimeout(() => {
            disconnect();
            const msg = 'Job timed out';
            setError(msg);
            onError?.(msg);
          }, timeout);
        }
      };

      // Preferred: SSE (unless disabled)
      if (disableSSE) {
        startPolling();
        return;
      }

      (async () => {
        try {
          log.info('[useJobStream] Starting SSE for job:', jobId);
          disconnect();
          setError(null);
          setIsStreaming(true);
          jobIdRef.current = jobId;

          const {
            data: { session },
          } = await supabase.auth.getSession();
          const token = session?.access_token;
          const supabaseUrl =
            (import.meta as any).env?.VITE_SUPABASE_URL ||
            (typeof process !== 'undefined' ? (process as any).env?.VITE_SUPABASE_URL : '');
          
          // Task 5: Dev-only SSE conditions logging
          devLog('[useJobStream] SSE conditions', {
            jobId,
            hasSession: !!session,
            hasToken: !!token,
            tokenLength: token?.length,
            supabaseUrl: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
            autoStart,
          });
          
          const primaryUrl = `${supabaseUrl}/functions/v1/stream-job?jobId=${encodeURIComponent(
            jobId
          )}${token ? `&access_token=${encodeURIComponent(token)}` : ''}`;
          // Fallback endpoint style (functions subdomain)
          const functionsSubdomain = supabaseUrl.replace('://', '://').replace('.supabase.co', '.functions.supabase.co');
          const secondaryUrl = `${functionsSubdomain}/stream-job?jobId=${encodeURIComponent(
            jobId
          )}${token ? `&access_token=${encodeURIComponent(token)}` : ''}`;

          // Try primary; if it errors early, retry secondary once
          // Task 5: Dev-only detailed SSE connection logging
          devLog('[useJobStream] Connecting SSE', {
            url: primaryUrl.replace(/access_token=[^&]+/, 'access_token=<redacted>'),
            hasToken: Boolean(token),
          });
          console.log('[useJobStream] SSE url:', primaryUrl.replace(/access_token=[^&]+/, 'access_token=***'), 'hasToken:', Boolean(token));
          let es = new EventSource(primaryUrl);

          const handleProgress = (ev: MessageEvent) => {
            try {
              const payload = JSON.parse(ev.data || '{}');
              const stage =
                payload.stage || payload.stageName || payload.name || payload.stage_id;
              
              // Task 5: Dev-only progress event logging - DETAILED
              devLog('[useJobStream] SSE progress event received', {
                stage,
                isPartial: payload.isPartial,
                hasData: !!payload.data,
                dataKeys: payload.data ? Object.keys(payload.data) : [],
                // Show actual values for A-phase fields
                roleInsights: payload.data?.roleInsights ? 'PRESENT' : 'missing',
                jdRequirementSummary: payload.data?.jdRequirementSummary ? 'PRESENT' : 'missing',
                mws: payload.data?.mws ? 'PRESENT' : 'missing',
                companyContext: payload.data?.companyContext ? 'PRESENT' : 'missing',
                timestamp: payload.timestamp,
              });
              
              if (!stage) return;
              setState((prev) => {
                const prevStages = prev?.stages || {};
                const nextStages: any = { ...prevStages };
                
                // CRITICAL FIX: Merge stage data instead of replacing
                // Later SSE events for the same stage should not overwrite existing data
                const existingData = prevStages[stage]?.data || {};
                const newData = payload.data || {};
                const mergedData = { ...existingData, ...newData };
                
                devLog('[useJobStream] Merging stage data', {
                  stage,
                  existingKeys: Object.keys(existingData),
                  newKeys: Object.keys(newData),
                  mergedKeys: Object.keys(mergedData),
                  // Show A-phase fields after merge
                  mergedRoleInsights: mergedData.roleInsights ? 'PRESENT' : 'missing',
                  mergedJdRequirementSummary: mergedData.jdRequirementSummary ? 'PRESENT' : 'missing',
                  mergedMws: mergedData.mws ? 'PRESENT' : 'missing',
                  mergedCompanyContext: mergedData.companyContext ? 'PRESENT' : 'missing',
                });
                
                nextStages[stage] = {
                  status: payload.isPartial ? 'partial' : payload.status || 'complete',
                  data: Object.keys(mergedData).length > 0 ? mergedData : payload,
                };
                const next = {
                  ...(prev || { jobId, type: 'coverLetter', status: 'running', stages: {} }),
                  stages: nextStages,
                  status: 'running',
                } as JobStreamState;
                if (!payload.isPartial) {
                  devLog('[useJobStream] [STREAM] Stage complete:', stage);
                  onProgress?.(stage, nextStages[stage].data);
                }
                return next;
              });
            } catch (parseErr) {
              // Task 5: Dev-only parse error logging
              devLog('[useJobStream] SSE parse error:', parseErr);
            }
          };
          const handleComplete = (ev: MessageEvent) => {
            // Task 5: Dev-only complete event logging
            devLog('[useJobStream] [STREAM] complete event received');
            try {
              const payload = JSON.parse(ev.data || '{}');
              devLog('[useJobStream] [STREAM] Job complete', {
                hasResult: !!payload.result,
                resultKeys: payload.result ? Object.keys(payload.result) : [],
              });
              setState((prev) => ({
                ...(prev as any),
                status: 'complete',
                result: payload.result || (prev as any)?.result,
                completedAt: new Date(),
              }));
              if (payload.result) onComplete?.(payload.result);
            } finally {
              es.close();
              setIsStreaming(false);
            }
          };
          const handleError = (e?: MessageEvent) => {
            // Task 5: Dev-only SSE error logging
            devLog('[useJobStream] [STREAM] SSE error occurred', {
              hasEventData: !!e?.data,
              eventData: e?.data,
              readyState: es.readyState,
            });
          console.warn('[useJobStream] SSE error; attempting secondary endpoint', e?.data);
            es.close();
            // Retry once using secondary URL, then fall back
            try {
              console.log(
                '[useJobStream] SSE secondary url:',
                secondaryUrl.replace(/access_token=[^&]+/, 'access_token=***'),
              );
              es = new EventSource(secondaryUrl);
              es.addEventListener('open', () => console.log('[useJobStream] SSE (secondary) connection opened'));
              es.addEventListener('progress', handleProgress);
              es.addEventListener('complete', handleComplete);
              es.addEventListener('error', () => {
                console.warn('[useJobStream] SSE secondary failed; falling back to polling');
                es.close();
                startPolling();
              });
              es.onmessage = handleProgress;
            } catch {
              startPolling();
            }
          };
          es.addEventListener('open', () => {
            console.log('[useJobStream] SSE connection opened');
            devLog('[useJobStream] [STREAM] SSE connection established successfully', {
              jobId,
              readyState: es.readyState,
            });
          });
          es.addEventListener('progress', handleProgress);
          es.addEventListener('complete', handleComplete);
          es.addEventListener('error', handleError);
          es.onmessage = handleProgress; // default fallback
        } catch (e) {
          startPolling();
        }
      })();
    },
    [disconnect, onComplete, onError, onProgress, pollIntervalMs, timeout]
  );

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    log.debug('[useJobStream] reset() called');
    disconnect();
    setState(null);
    setError(null);
    jobIdRef.current = undefined;
  }, [disconnect]);

  // ============================================================================
  // Dev-only: Mount logging (Task 5: streaming wiring diagnostics)
  // ============================================================================

  useEffect(() => {
    devLog('[useJobStream] mounted', {
      autoStart,
      hasInitialJobId: !!initialJobId,
      pollIntervalMs,
      timeout,
    });
  }, []);

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
