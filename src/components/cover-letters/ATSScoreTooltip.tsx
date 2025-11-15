import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface ATSScoreTooltipProps {
  children: React.ReactNode;
  className?: string;
  atsScore?: number;
  isPostHIL?: boolean;
}

export interface ATSScoreInsightsProps {
  isPostHIL?: boolean;
  score?: number;
}

export function ATSScoreInsights({ isPostHIL = false, score }: ATSScoreInsightsProps) {
  const criteria = [
    { name: 'Spelling and Grammar', description: 'No errors that confuse ATS', passed: true },
    { name: 'Email Format', description: 'Professional email address', passed: true },
    { name: 'LinkedIn Profile', description: 'Profile mentioned or linked', passed: isPostHIL },
    { name: 'Complete Contact Info', description: 'Name, email, phone included', passed: true },
    { name: 'File Format', description: 'PDF or Word format', passed: true },
    { name: 'File Size', description: 'Under 2MB for processing', passed: true },
    { name: 'Simple Layout', description: 'Clean formatting', passed: isPostHIL },
    { name: 'Standard Fonts', description: 'Arial, Calibri, Times New Roman', passed: false },
    { name: 'Hard Skills', description: 'Technical skills mentioned', passed: true },
    { name: 'Soft Skills', description: 'Leadership, communication', passed: isPostHIL },
    { name: 'Keyword Density', description: 'Appropriate keyword use', passed: true },
    { name: 'Industry Terms', description: 'Industry-specific terminology', passed: isPostHIL },
    { name: 'Clear Headers', description: 'Proper section headers', passed: true },
    { name: 'Consistent Formatting', description: 'Consistent date formats', passed: true },
    { name: 'Chronological Order', description: 'Reverse chronological order', passed: false },
    { name: 'No Tables', description: 'Linear text format', passed: true },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between border rounded-lg p-3 bg-muted/20">
        <span className="text-sm text-muted-foreground">ATS Score</span>
        <span className="text-lg font-semibold text-foreground">{typeof score === 'number' ? `${score}%` : 'N/A'}</span>
      </div>
      {criteria.map((criterion) => (
        <div
          key={criterion.name}
          className={`border rounded-lg p-3 ${criterion.passed ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}
        >
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 mt-0.5">
              {criterion.passed ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-foreground">{criterion.name}</h4>
              <p className={`text-xs mt-1 ${criterion.passed ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                {criterion.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ATSScoreTooltip({
  children,
  className,
  atsScore = 0,
  isPostHIL = false,
}: ATSScoreTooltipProps) {
  const content = <ATSScoreInsights isPostHIL={isPostHIL} score={atsScore} />;

  return (
    <FullWidthTooltip
      content={content}
      className={className}
    >
      {children}
    </FullWidthTooltip>
  );
}
