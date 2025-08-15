import { Button } from "@/components/ui/button";
import { FileText, Library } from "lucide-react";

interface TemplateBannerProps {
  view: 'template' | 'library';
  onViewChange: (view: 'template' | 'library') => void;
  onDone: () => void;
}

export const TemplateBanner = ({ view, onViewChange, onDone }: TemplateBannerProps) => {
  return (
    <div className="bg-muted/30 border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Header with Done button */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Editing Cover Letter Template</h1>
            <Button onClick={onDone} size="sm">
              Done
            </Button>
          </div>
          
          {/* Tabs */}
          <div className="flex items-center gap-1 mb-4">
            <Button
              variant={view === 'template' ? 'default' : 'ghost'}
              onClick={() => onViewChange('template')}
              className="flex items-center gap-2"
              size="sm"
            >
              <FileText className="h-4 w-4" />
              Template
            </Button>
            <span className="text-muted-foreground mx-2">|</span>
            <Button
              variant={view === 'library' ? 'default' : 'ghost'}
              onClick={() => onViewChange('library')}
              className="flex items-center gap-2"
              size="sm"
            >
              <Library className="h-4 w-4" />
              Blurb Library
            </Button>
          </div>
          
          {/* Descriptions */}
          <div className="text-sm text-muted-foreground">
            {view === 'template' ? (
              <span>Configure your template structure</span>
            ) : (
              <span>Configure your template content</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};