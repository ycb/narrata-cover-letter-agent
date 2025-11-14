import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Button } from '@/components/ui/button';
import { Check, X, Wand2, TrendingUp } from 'lucide-react';

interface Requirement {
  id: string;
  requirement: string; // Changed from 'text' to match RequirementsMatchService
  demonstrated: boolean;
  evidence?: string;
  section?: string; // Which section mentions this requirement
}

interface RequirementsTooltipProps {
  children: React.ReactNode;
  className?: string;
  title: string;
  requirements: Requirement[];
  description?: string;
  onEnhanceSection?: (sectionId: string, requirement?: string) => void; // Agent C: enhance section CTA
  onAddMetrics?: (sectionId?: string) => void; // Agent C: add metrics CTA
}

export function RequirementsTooltip({
  children,
  className,
  title,
  requirements,
  description,
  onEnhanceSection,
  onAddMetrics
}: RequirementsTooltipProps) {
  const content = (
    <div className="space-y-3">
      {requirements.map((req) => (
        <div
          key={req.id}
          className={`border rounded-lg p-3 ${req.demonstrated ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}
        >
          {/* Requirement as title */}
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-shrink-0 mt-0.5">
              {req.demonstrated ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
            <h4 className="text-sm font-medium text-foreground flex-1">
              {req.requirement}
            </h4>
          </div>

          {/* Evidence as body */}
          <div className="ml-6 space-y-2">
            <p className={`text-xs ${req.demonstrated ? 'text-foreground/80' : 'text-muted-foreground'}`}>
              {req.evidence || (req.demonstrated ? 'Mentioned in draft' : 'Not mentioned in current draft')}
            </p>
            
            {/* CTAs for demonstrated requirements */}
            {req.demonstrated && (
              <div className="flex gap-2">
                {onEnhanceSection && req.section && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onEnhanceSection(req.section!, req.requirement)}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Enhance This Section
                  </Button>
                )}
                {onAddMetrics && req.section && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onAddMetrics(req.section)}
                  >
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Add Metrics
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <FullWidthTooltip
      content={content}
      className={className}
    >
      {children}
    </FullWidthTooltip>
  );
}

