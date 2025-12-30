import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X, HelpCircle } from 'lucide-react';

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
  statusContext?: 'profile' | 'draft';
}

export function RequirementsTooltip({
  children,
  className,
  title,
  requirements,
  description,
  statusContext = 'draft',
}: RequirementsTooltipProps) {
  const content = (
    <div className="space-y-3">
      {requirements.length === 0 ? (
        <div className="border rounded-lg p-3 bg-muted/10 border-muted/40">
          <div className="flex items-start gap-2 mb-1.5">
            <div className="flex-shrink-0 mt-0.5">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-muted-foreground">
                {title?.toLowerCase().includes('preferred')
                  ? 'Preferred Requirements: Unknown'
                  : 'Requirements: Unknown'}
              </h4>
            </div>
          </div>
        </div>
      ) : requirements.map((req) => (
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
              {req.evidence ||
                (statusContext === 'profile'
                  ? (req.demonstrated ? 'Supported by your background' : 'Not supported by your background')
                  : (req.demonstrated ? 'Mentioned in draft' : 'Not mentioned in current draft'))}
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
