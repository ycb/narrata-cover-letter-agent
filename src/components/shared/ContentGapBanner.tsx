import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ContentGapBannerProps {
  title?: string;
  description?: string; // Single description (backward compat)
  gaps?: Array<{
    id: string;
    title?: string;
    headline?: string;
    suggestion?: string;
    explanation?: string;
    description?: string;
  }>; // Agent C: title is optional for structured gaps
  gapSummary?: string | null; // Agent C: Rubric/prompt summary shown at top
  onGenerateContent?: () => void; // Agent C: Make optional to support display-only mode
  onDismiss?: (gapId?: string) => void; // Callback for manual dismissal (optionally pass gapId)
  isResolved?: boolean;
}

export const ContentGapBanner = ({
  title,
  description,
  gaps,
  gapSummary = null,
  onGenerateContent,
  onDismiss,
  isResolved = false
}: ContentGapBannerProps) => {
  const [isDismissing, setIsDismissing] = useState(false);

  const handleDismiss = () => {
    setIsDismissing(true);
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      onDismiss?.();
    }, 2000); // Match transition duration (2000ms = 2 seconds)
  };

  if (isResolved) return null;

  // Support both single description (backward compat) and gaps array
  const displayGaps = gaps || (description ? [{ id: 'single', description }] : []);

  const singleGap = displayGaps.length === 1 ? displayGaps[0] : null;

  // Use single-gap issue headline for the banner title; otherwise use summary/default.
  const displayTitle = singleGap?.headline || gapSummary || title || (displayGaps.length > 1 ? "Gaps Detected" : "Gap Detected");

  const renderGapContent = (gap: typeof displayGaps[number], showIssue: boolean) => {
    const issue = gap.headline || gap.description;
    const hasStructured = Boolean(gap.suggestion) || Boolean(gap.explanation);
    if (!hasStructured) {
      return (
        <p className="text-sm text-muted-foreground">
          {gap.description}
        </p>
      );
    }

    return (
      <>
        {showIssue && issue && (
          <p className="text-sm font-medium text-warning mb-1">
            {issue}
          </p>
        )}
        {gap.suggestion && (
          <p className="text-sm font-semibold text-foreground mb-1">
            {gap.suggestion}
          </p>
        )}
        {gap.explanation && (
          <p className="text-sm text-muted-foreground">
            {gap.explanation}
          </p>
        )}
        {!gap.explanation && gap.description && gap.description !== issue && (
          <p className="text-sm text-muted-foreground">
            {gap.description}
          </p>
        )}
      </>
    );
  };

  return (
    <div 
      className={cn(
        "mt-6 pt-0 pb-0 border-t border-muted",
        isDismissing && "opacity-0 max-h-0 mt-0 transition-all duration-[2000ms] ease-in-out overflow-hidden"
      )}
    >
      <div 
      className={cn(
        "bg-orange-50 rounded-b-lg -mx-6 -mb-6 px-6 py-6",
        isDismissing && "scale-y-0 origin-top transition-all duration-[2000ms] ease-in-out"
      )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="font-medium text-warning">{displayTitle}</span>
          </div>
          {onDismiss && (
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDismiss();
                    }}
                    className="inline-flex h-6 w-6 aspect-square shrink-0 items-center justify-center rounded-full bg-warning text-white hover:bg-destructive transition-colors"
                    aria-label="Dismiss gap"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Dismiss</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Agent C: Support structured gaps with title + description */}
        {displayGaps.length === 1 ? (
          <div className="mb-3">
            {renderGapContent(displayGaps[0], false)}
          </div>
        ) : displayGaps.length > 1 ? (
          <div className="mb-3 space-y-3">
            {displayGaps.map((gap) => (
              <div key={gap.id}>
                {renderGapContent(gap, true)}
              </div>
            ))}
          </div>
        ) : null}
        
        {/* Agent C: Only show generate button if callback provided */}
        {onGenerateContent && (
          <Button
            variant="cta-secondary"
            size="sm"
            className="w-full"
            onClick={onGenerateContent}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate Content
          </Button>
        )}
      </div>
    </div>
  );
};
