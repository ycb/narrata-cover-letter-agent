import { useCallback, useMemo, useRef, useState } from "react";
import type { TextStreamPart } from "ai";

export type StreamingStepStatus = "pending" | "running" | "success" | "error";

export interface StreamingStepDefinition {
  id: string;
  label: string;
  detail?: string;
}

export interface StreamingStepState extends StreamingStepDefinition {
  status: StreamingStepStatus;
  progress?: number;
  startedAt?: number;
  finishedAt?: number;
}

export type StreamingTimelineTone = "info" | "success" | "warning" | "error";

export interface StreamingTimelineEvent {
  id: string;
  message: string;
  tone: StreamingTimelineTone;
  timestamp: number;
  meta?: Record<string, unknown>;
}

export type StreamingLifecycleStatus = "idle" | "streaming" | "complete" | "error";

type StreamSource<T> = AsyncIterable<T> | ReadableStream<T>;

export interface StartStreamOptions<TPart = TextStreamPart<unknown>> {
  /**
   * Optional list of steps to replace the current timeline before streaming starts.
   */
  steps?: StreamingStepDefinition[];
  /**
   * Factory that returns the async iterable produced by the AI SDK `streamText` call (or any compatible stream).
   * The hook passes an abort signal that can be forwarded to the underlying request.
   */
  streamFactory: (context: { signal: AbortSignal }) => Promise<StreamSource<TPart>>;
  /**
   * Callback invoked for every chunk emitted by the stream.
   */
  onEvent?: (chunk: TPart) => void;
  /**
   * Convenience callback fired when a text delta is received.
   */
  onToken?: (token: string, aggregatedText: string) => void;
  /**
   * Fired once the stream finishes successfully.
   */
  onFinish?: (result: { output: string; events: StreamingTimelineEvent[] }) => void;
  /**
   * Automatically mark the first step as running when the stream starts and mark all unfinished
   * steps as success when the stream completes.
   * Defaults to true for ease-of-use and can be disabled for manual control.
   */
  autoResolveSteps?: boolean;
}

export interface StartTextStreamOptions<TPart = TextStreamPart<unknown>> {
  steps?: StreamingStepDefinition[];
  autoResolveSteps?: boolean;
  /**
   * Factory that runs an AI SDK `streamText` (or compatible) request and returns the result.
   * The function receives an abort signal so callers can pass it to the SDK.
   */
  run: (context: { signal: AbortSignal }) => Promise<
    | {
        stream:
          | AsyncIterable<TPart>
          | ReadableStream<TPart>;
      }
    | {
        toAIStream: () => AsyncIterable<TPart> | ReadableStream<TPart>;
      }
  >;
  onEvent?: (chunk: TPart) => void;
  onToken?: (token: string, aggregatedText: string) => void;
  onFinish?: (result: { output: string; events: StreamingTimelineEvent[] }) => void;
}

export interface UseStreamingProgressOptions {
  steps?: StreamingStepDefinition[];
  autoResolveSteps?: boolean;
}

export interface UseStreamingProgressReturn {
  steps: StreamingStepState[];
  events: StreamingTimelineEvent[];
  status: StreamingLifecycleStatus;
  output: string;
  reasoning: string;
  error: string | null;
  isStreaming: boolean;
  startStream: (options: StartStreamOptions) => Promise<void>;
  reset: () => void;
  cancel: () => void;
  setStepDefinitions: (steps: StreamingStepDefinition[]) => void;
  setStepStatus: (id: string, status: StreamingStepStatus, detail?: string) => void;
  setStepDetail: (id: string, detail: string) => void;
  setStepProgress: (id: string, progress: number) => void;
  appendEvent: (message: string, tone?: StreamingTimelineTone, meta?: Record<string, unknown>) => void;
  startTextStream: (options: StartTextStreamOptions) => Promise<void>;
}

function initializeSteps(definitions: StreamingStepDefinition[]): StreamingStepState[] {
  return definitions.map((definition) => ({
    ...definition,
    status: "pending",
    progress: 0,
    startedAt: undefined,
    finishedAt: undefined
  }));
}

async function* normalizeStream<T>(source: StreamSource<T>): AsyncIterable<T> {
  if (typeof (source as ReadableStream<T>)?.getReader === "function") {
    const reader = (source as ReadableStream<T>).getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        if (value !== undefined) {
          yield value;
        }
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }

  for await (const value of source as AsyncIterable<T>) {
    yield value;
  }
}

export function useStreamingProgress(options: UseStreamingProgressOptions = {}): UseStreamingProgressReturn {
  const { steps: initialSteps = [], autoResolveSteps = true } = options;

  const stepDefinitionsRef = useRef<StreamingStepDefinition[]>(initialSteps);
  const [steps, setSteps] = useState<StreamingStepState[]>(() => initializeSteps(stepDefinitionsRef.current));
  const [events, setEvents] = useState<StreamingTimelineEvent[]>([]);
  const [status, setStatus] = useState<StreamingLifecycleStatus>("idle");
  const [output, setOutput] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const appendEvent = useCallback(
    (message: string, tone: StreamingTimelineTone = "info", meta?: Record<string, unknown>) => {
      setEvents((prev) => [
        ...prev,
        {
          id: `${Date.now()}-${prev.length}`,
          message,
          tone,
          timestamp: Date.now(),
          meta
        }
      ]);
    },
    []
  );

  const setStepDefinitions = useCallback((definitions: StreamingStepDefinition[]) => {
    stepDefinitionsRef.current = definitions;
    setSteps(initializeSteps(definitions));
  }, []);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setOutput("");
    setReasoning("");
    setEvents([]);
    setSteps(initializeSteps(stepDefinitionsRef.current));
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const mutateStep = useCallback((id: string, updater: (step: StreamingStepState) => StreamingStepState) => {
    setSteps((prev) =>
      prev.map((step) => {
        if (step.id !== id) {
          return step;
        }
        return updater(step);
      })
    );
  }, []);

  const setStepStatus = useCallback(
    (id: string, nextStatus: StreamingStepStatus, detail?: string) => {
      mutateStep(id, (step) => ({
        ...step,
        status: nextStatus,
        detail: detail ?? step.detail,
        startedAt: step.startedAt ?? (nextStatus === "running" ? Date.now() : step.startedAt),
        finishedAt: nextStatus === "success" || nextStatus === "error" ? Date.now() : step.finishedAt,
        progress: nextStatus === "success" ? 1 : step.progress
      }));
    },
    [mutateStep]
  );

  const setStepDetail = useCallback(
    (id: string, detail: string) => {
      mutateStep(id, (step) => ({
        ...step,
        detail
      }));
    },
    [mutateStep]
  );

  const setStepProgress = useCallback(
    (id: string, progress: number) => {
      mutateStep(id, (step) => ({
        ...step,
        progress: Math.min(1, Math.max(0, progress)),
        status: progress > 0 && step.status === "pending" ? "running" : step.status,
        startedAt: step.startedAt ?? (progress > 0 ? Date.now() : step.startedAt),
        finishedAt: progress >= 1 ? Date.now() : step.finishedAt
      }));
    },
    [mutateStep]
  );

  const finalizeSteps = useCallback(
    (resultStatus: "success" | "error") => {
      if (!autoResolveSteps) {
        return;
      }
      setSteps((prev) =>
        prev.map((step) => {
          if (step.status === "success" || step.status === "error") {
            return step;
          }

          if (resultStatus === "success") {
            return {
              ...step,
              status: "success",
              progress: 1,
              finishedAt: Date.now()
            };
          }

          return {
            ...step,
            status: step.status === "pending" ? "error" : step.status,
            finishedAt: Date.now()
          };
        })
      );
    },
    [autoResolveSteps]
  );

  const startStream = useCallback(
    async (startOptions: StartStreamOptions) => {
      const {
        steps: overrideSteps,
        streamFactory,
        onEvent: handleEvent,
        onToken,
        onFinish,
        autoResolveSteps: overrideAutoResolve
      } = startOptions;

      const shouldAutoResolve = overrideAutoResolve ?? autoResolveSteps;

      const controller = new AbortController();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = controller;

      if (overrideSteps) {
        stepDefinitionsRef.current = overrideSteps;
        setSteps(initializeSteps(overrideSteps));
      } else {
        setSteps(initializeSteps(stepDefinitionsRef.current));
      }

      setStatus("streaming");
      setError(null);
      setOutput("");
      setReasoning("");
      setEvents([]);

      if ((overrideSteps ?? stepDefinitionsRef.current).length > 0 && shouldAutoResolve) {
        const firstStep = (overrideSteps ?? stepDefinitionsRef.current)[0];
        if (firstStep) {
          setStepStatus(firstStep.id, "running");
        }
      }

      try {
        const streamSource = await streamFactory({ signal: controller.signal });
        let aggregatedText = "";
        const normalized = normalizeStream(streamSource);

        for await (const chunk of normalized) {
          if (controller.signal.aborted) {
            return;
          }

          handleEvent?.(chunk);

          const typedChunk = chunk as TextStreamPart<unknown>;
          if (typedChunk && typeof typedChunk === "object" && "type" in typedChunk) {
            switch (typedChunk.type) {
              case "text":
              case "text-delta":
                if ("text" in typedChunk && typeof typedChunk.text === "string") {
                  setOutput((prev) => {
                    const next = prev + typedChunk.text;
                    aggregatedText = next;
                    onToken?.(typedChunk.text as string, next);
                    return next;
                  });
                }
                break;
              case "reasoning":
                if ("text" in typedChunk && typeof typedChunk.text === "string") {
                  setReasoning((prev) => `${prev}${typedChunk.text}`);
                }
                break;
              case "finish":
              case "finish-step":
                if (typeof (typedChunk as any)?.id === "string" && shouldAutoResolve) {
                  const stepId = (typedChunk as any).id as string;
                  setStepStatus(stepId, "success");
                }
                break;
              case "start":
              case "start-step":
                if (typeof (typedChunk as any)?.id === "string" && shouldAutoResolve) {
                  const stepId = (typedChunk as any).id as string;
                  setStepStatus(stepId, "running");
                }
                break;
              default:
                break;
            }
          }
        }

        if (controller.signal.aborted) {
          return;
        }

        if (shouldAutoResolve) {
          finalizeSteps("success");
        }

        setStatus("complete");
        appendEvent("Streaming complete", "success");
        onFinish?.({ output: aggregatedText, events: events });
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          setStatus("idle");
          appendEvent("Streaming cancelled", "warning");
          return;
        }

        console.error("[useStreamingProgress] Streaming failed:", err);
        const message = err instanceof Error ? err.message : "Unknown streaming error";
        setError(message);
        setStatus("error");
        appendEvent(message, "error");
        finalizeSteps("error");
      } finally {
        abortControllerRef.current = null;
      }
    },
    [appendEvent, autoResolveSteps, events, finalizeSteps, setStepStatus]
  );

  const startTextStream = useCallback(
    async (options: StartTextStreamOptions) => {
      const { run, steps: overrideSteps, autoResolveSteps: overrideAutoResolve, onEvent, onToken, onFinish } = options;

      await startStream({
        steps: overrideSteps,
        autoResolveSteps: overrideAutoResolve,
        onEvent,
        onToken,
        onFinish,
        streamFactory: async ({ signal }) => {
          const result = await run({ signal });

          if (!result) {
            throw new Error("[useStreamingProgress] startTextStream run() must return a stream result.");
          }

          if ("stream" in result && result.stream) {
            return result.stream;
          }

          if ("toAIStream" in result && typeof result.toAIStream === "function") {
            return result.toAIStream();
          }

          throw new Error("[useStreamingProgress] startTextStream run() returned an unsupported result shape.");
        }
      });
    },
    [startStream]
  );

  return useMemo(
    () => ({
      steps,
      events,
      status,
      output,
      reasoning,
      error,
      isStreaming: status === "streaming",
      startStream,
      startTextStream,
      reset,
      cancel,
      setStepDefinitions,
      setStepStatus,
      setStepDetail,
      setStepProgress,
      appendEvent
    }),
    [
      steps,
      events,
      status,
      output,
      reasoning,
      error,
      startStream,
      startTextStream,
      reset,
      cancel,
      setStepDefinitions,
      setStepStatus,
      setStepDetail,
      setStepProgress,
      appendEvent
    ]
  );
}

