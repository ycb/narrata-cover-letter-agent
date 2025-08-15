import { Button } from "@/components/ui/button";
import { FileText, Library } from "lucide-react";

export const TemplateBanner = ({ onDone }: { onDone: () => void }) => {
  return (
    <div className="bg-muted/30 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with Done button */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">Editing Cover Letter Template</h1>
            <Button onClick={onDone} variant="cta-primary" size="sm">
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};