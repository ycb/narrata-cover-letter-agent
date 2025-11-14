import type {
  StreamingLifecycleStatus,
  StreamingStepState,
  StreamingTimelineEvent
} from "@/hooks/useStreamingProgress";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Dot,
  Loader2,
  PauseCircle
} from "lucide-react";

const statusIcon = {
  pending: Circle,
  running: Loader2,
  success: CheckCircle2,
  error: AlertCircle
} as const;

const statusTone = {
  pending: "text-muted-foreground",
  running: "text-primary",
  success: "text-emerald-500",
  error: "text-destructive"
} as const;

const eventTone = {
  info: "text-muted-foreground",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-destructive"
} as const;

interface StreamingProgressProps {
  steps: StreamingStepState[];
  status: StreamingLifecycleStatus;
  events?: StreamingTimelineEvent[];
  output?: string;
  reasoning?: string;
  className?: string;
  showTimeline?: boolean;
  showOutput?: boolean;
}

export function StreamingProgress({
  steps,
  status,
  events = [],
  output,
  reasoning,
  className,
  showTimeline = true,
  showOutput = false
}: StreamingProgressProps) {
  const isStreaming = status === "streaming";

  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = statusIcon[step.status];
          const tone = statusTone[step.status];
          const isLast = index === steps.length - 1;

          return (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    step.status === "running" ? "animate-spin" : "",
                    tone
                  )}
                />
                {!isLast && <div className="h-full w-px bg-border mt-1" />}
              </div>
              <div className="flex-1 space-y-1 pb-6">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{step.label}</span>
                  {step.status === "running" && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      In progress
                    </span>
                  )}
                  {step.status === "success" && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" />
                      Complete
                    </span>
                  )}
                  {step.status === "error" && (
                    <span className="inline-flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Failed
                    </span>
                  )}
                </div>
                {step.detail && <p className="text-sm text-muted-foreground">{step.detail}</p>}
                {typeof step.progress === "number" && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        step.status === "error" ? "bg-destructive/70" : "bg-primary/70"
                      )}
                      style={{ width: `${Math.max(0, Math.min(100, Math.round(step.progress * 100)))}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showTimeline && events.length > 0 && (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
            <PauseCircle className="h-4 w-4 text-muted-foreground" />
            Live updates
          </div>
          <ul className="space-y-2">
            {events.map((event) => (
              <li key={event.id} className="flex items-start gap-2">
                <Dot className={cn("h-5 w-5 flex-none", eventTone[event.tone])} />
                <div>
                  <p className={cn("text-sm", eventTone[event.tone])}>{event.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showOutput && (output || reasoning) && (
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Loader2 className={cn("h-4 w-4", isStreaming ? "animate-spin" : "text-muted-foreground")} />
            {isStreaming ? "Streaming response" : "Latest response"}
          </div>

          {output && (
            <pre className="mt-3 whitespace-pre-wrap rounded bg-muted/50 p-3 text-sm text-foreground">
              {output}
            </pre>
          )}

          {reasoning && (
            <details className="mt-2 text-sm text-muted-foreground">
              <summary className="cursor-pointer select-none text-xs uppercase tracking-wide">
                Model reasoning
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded bg-muted/30 p-2 text-xs">{reasoning}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default StreamingProgress;

