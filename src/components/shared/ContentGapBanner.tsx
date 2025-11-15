import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ContentGapBannerProps {
  title?: string;
  description?: string; // Single description (backward compat)
  gaps?: Array<{ id: string; title?: string; description: string }>; // Agent C: title is optional for structured gaps
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

  // Default to "Gap Detected" (singular or plural based on count)
  const displayTitle = title || (displayGaps.length > 1 ? "Gaps Detected" : "Gap Detected");

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
                    className="h-6 w-6 rounded-full bg-warning text-white flex items-center justify-center hover:bg-destructive transition-colors"
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
        
        {/* Agent C: Show rubric/prompt summary if provided */}
        {gapSummary && (
          <div className="mb-3 p-3 bg-amber-50/50 rounded-md border border-amber-200/50">
            <p className="text-xs font-medium text-amber-900 mb-1">Section Guidance</p>
            <p className="text-xs text-amber-800">{gapSummary}</p>
          </div>
        )}
        
        {/* Agent C: Support structured gaps with title + description */}
        {displayGaps.length === 1 ? (
          <div className="mb-3">
            {displayGaps[0].title && (
              <p className="text-sm font-medium text-foreground mb-1">
                {displayGaps[0].title}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {displayGaps[0].description}
            </p>
          </div>
        ) : displayGaps.length > 1 ? (
          <ul className="text-sm text-muted-foreground mb-3 space-y-2">
            {displayGaps.map((gap) => (
              <li key={gap.id} className="list-none">
                {gap.title && (
                  <p className="font-medium text-foreground mb-0.5">
                    • {gap.title}
                  </p>
                )}
                <p className={cn("text-sm", gap.title && "ml-3")}>
                  {gap.description}
                </p>
              </li>
            ))}
          </ul>
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

