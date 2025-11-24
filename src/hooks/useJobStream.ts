import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type {
  JobType,
  JobStreamState,
  SSEEvent,
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
   * Reconnect on disconnect
   * @default true
   */
  autoReconnect?: boolean;

  /**
   * Max reconnect attempts
   * @default 3
   */
  maxReconnectAttempts?: number;

  /**
   * Reconnect delay in ms
   * @default 1000
   */
  reconnectDelay?: number;

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
    autoReconnect = true,
    maxReconnectAttempts = 3,
    reconnectDelay = 1000,
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
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const jobIdRef = useRef<string | undefined>(initialJobId);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const clearTimeout = useCallback(() => {
    if (timeoutRef.current) {
      global.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const closeEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
    clearTimeout();
  }, [clearTimeout]);

  // ============================================================================
  // Create Job
  // ============================================================================

  const createJob = useCallback(
    async (type: JobType, input: JobInput): Promise<string> => {
      try {
        setError(null);

        // Get auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        // Call Edge Function to create job
        const { data, error: fetchError } = await supabase.functions.invoke<CreateJobResponse>(
          'create-job',
          {
            body: { type, input } as CreateJobRequest,
          }
        );

        if (fetchError) {
          throw new Error(fetchError.message || 'Failed to create job');
        }

        if (!data?.jobId) {
          throw new Error('No job ID returned');
        }

        // Initialize state
        setState({
          jobId: data.jobId,
          type,
          status: 'pending',
          stages: {},
        });

        jobIdRef.current = data.jobId;

        // Auto-connect if enabled
        if (autoStart) {
          connect(data.jobId);
        }

        return data.jobId;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create job';
        setError(errorMessage);
        onError?.(errorMessage);
        throw err;
      }
    },
    [autoStart, onError]
  );

  // ============================================================================
  // Connect to Stream
  // ============================================================================

  const connect = useCallback(
    (jobId: string) => {
      // Close existing connection
      closeEventSource();

      try {
        setError(null);
        setIsStreaming(true);
        jobIdRef.current = jobId;

        // Get Supabase URL and anon key
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase configuration');
        }

        // Get current session token
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (!session) {
            throw new Error('Not authenticated');
          }

          const authToken = session.access_token;

          // Construct SSE URL
          const streamUrl = `${supabaseUrl}/functions/v1/stream-job?jobId=${jobId}`;

          // Create EventSource with auth header
          // Note: EventSource doesn't support custom headers, so we'll use a workaround
          // We'll pass the token as a query parameter (Edge Function will need to handle this)
          const urlWithAuth = `${streamUrl}&token=${authToken}`;

          const eventSource = new EventSource(urlWithAuth);
          eventSourceRef.current = eventSource;

          // Set timeout
          if (timeout > 0) {
            timeoutRef.current = setTimeout(() => {
              closeEventSource();
              setError('Job timed out');
              onError?.('Job timed out');
            }, timeout);
          }

          // Event handlers
          eventSource.addEventListener('progress', (e) => {
            try {
              const event = JSON.parse(e.data) as SSEEvent;
              if (event.type === 'progress') {
                setState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    status: 'running',
                    stages: {
                      ...prev.stages,
                      [event.stage]: event.data,
                    },
                  };
                });
                onProgress?.(event.stage, event.data);
              }
            } catch (err) {
              console.error('Failed to parse progress event:', err);
            }
          });

          eventSource.addEventListener('complete', (e) => {
            try {
              const event = JSON.parse(e.data) as SSEEvent;
              if (event.type === 'complete') {
                setState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    status: 'complete',
                    result: event.result,
                    completedAt: new Date(),
                  };
                });
                onComplete?.(event.result);
                closeEventSource();
              }
            } catch (err) {
              console.error('Failed to parse complete event:', err);
            }
          });

          eventSource.addEventListener('error', (e) => {
            try {
              const event = JSON.parse((e as MessageEvent).data) as SSEEvent;
              if (event.type === 'error') {
                const errorMsg = event.error || 'Unknown error';
                setState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    status: 'error',
                    error: errorMsg,
                    completedAt: new Date(),
                  };
                });
                setError(errorMsg);
                onError?.(errorMsg);
                closeEventSource();
              }
            } catch (err) {
              console.error('Failed to parse error event:', err);
            }
          });

          eventSource.onerror = (err) => {
            console.error('EventSource error:', err);

            // Auto-reconnect logic
            if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
              reconnectAttemptsRef.current++;
              console.log(
                `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
              );
              setTimeout(() => {
                connect(jobId);
              }, reconnectDelay);
            } else {
              setError('Connection lost');
              onError?.('Connection lost');
              closeEventSource();
            }
          };
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
        setError(errorMessage);
        onError?.(errorMessage);
        closeEventSource();
      }
    },
    [
      closeEventSource,
      timeout,
      autoReconnect,
      maxReconnectAttempts,
      reconnectDelay,
      onProgress,
      onComplete,
      onError,
    ]
  );

  // ============================================================================
  // Disconnect
  // ============================================================================

  const disconnect = useCallback(() => {
    closeEventSource();
    reconnectAttemptsRef.current = 0;
  }, [closeEventSource]);

  // ============================================================================
  // Reset
  // ============================================================================

  const reset = useCallback(() => {
    closeEventSource();
    setState(null);
    setError(null);
    reconnectAttemptsRef.current = 0;
    jobIdRef.current = undefined;
  }, [closeEventSource]);

  // ============================================================================
  // Auto-start on mount
  // ============================================================================

  useEffect(() => {
    if (autoStart && initialJobId) {
      connect(initialJobId);
    }

    return () => {
      closeEventSource();
    };
  }, [autoStart, initialJobId, connect, closeEventSource]);

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

