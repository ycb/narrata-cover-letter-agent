import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

type TemplateBannerProps = {
  onDone: () => void | Promise<void>;
  previewButton?: ReactNode;
  doneLabel?: string;
  isDoneDisabled?: boolean;
  isDoneLoading?: boolean;
};

export const TemplateBanner = ({
  onDone,
  previewButton,
  doneLabel = 'Done',
  isDoneDisabled,
  isDoneLoading
}: TemplateBannerProps) => {
  return (
    <div className="bg-muted/30 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with buttons */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Editing Cover Letter Template</h1>
            <div className="flex items-center gap-3">
              {previewButton}
              <Button onClick={onDone} variant="primary" size="sm" disabled={isDoneDisabled}>
                {isDoneLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  doneLabel
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};