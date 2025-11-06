import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface ContentGapBannerProps {
  title?: string;
  description?: string; // Single description (backward compat)
  gaps?: Array<{ id: string; description: string }>; // Multiple gaps (list)
  onGenerateContent: () => void;
  onDismiss?: (gapId?: string) => void; // Callback for manual dismissal (optionally pass gapId)
  isResolved?: boolean;
}

export const ContentGapBanner = ({
  title,
  description,
  gaps,
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
        {displayGaps.length === 1 ? (
          <p className="text-sm text-muted-foreground mb-3">
            {displayGaps[0].description}
          </p>
        ) : displayGaps.length > 1 ? (
          <ul className="text-sm text-muted-foreground mb-3 list-disc list-inside space-y-1">
            {displayGaps.map((gap) => (
              <li key={gap.id}>{gap.description}</li>
            ))}
          </ul>
        ) : null}
        <Button
          variant="cta-secondary"
          size="sm"
          className="w-full"
          onClick={onGenerateContent}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Generate Content
        </Button>
      </div>
    </div>
  );
};

