import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface Requirement {
  id: string;
  requirement: string; // Changed from 'text' to match RequirementsMatchService
  demonstrated: boolean;
  evidence?: string;
}

interface RequirementsTooltipProps {
  children: React.ReactNode;
  className?: string;
  title: string;
  requirements: Requirement[];
  description?: string;
}

export function RequirementsTooltip({
  children,
  className,
  title,
  requirements,
  description
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
          <div className="ml-6">
            <p className={`text-xs ${req.demonstrated ? 'text-foreground/80' : 'text-muted-foreground'}`}>
              {req.evidence || (req.demonstrated ? 'Mentioned in draft' : 'Not mentioned in current draft')}
            </p>
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

