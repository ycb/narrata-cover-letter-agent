import { Button } from "@/components/ui/button";
import { AlertTriangle, Sparkles } from "lucide-react";

interface ContentGapBannerProps {
  title?: string;
  description: string;
  onGenerateContent: () => void;
  isResolved?: boolean;
}

export const ContentGapBanner = ({
  title = "Content Gap",
  description,
  onGenerateContent,
  isResolved = false
}: ContentGapBannerProps) => {
  if (isResolved) return null;

  return (
    <div className="mt-6 pt-0 pb-0 border-t border-muted">
      <div className="bg-orange-50 rounded-b-lg -mx-6 -mb-6 px-6 py-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="font-medium text-warning">{title}</span>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {description}
        </p>
        <Button
          variant="secondary"
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

