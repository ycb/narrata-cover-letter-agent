import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface CoverLetterRatingTooltipProps {
  children: React.ReactNode;
  className?: string;
  isPostHIL?: boolean;
  ratingLabel?: string;
}

export interface CoverLetterRatingInsightsProps {
  isPostHIL?: boolean;
  ratingLabel?: string;
}

export function CoverLetterRatingInsights({ isPostHIL = false, ratingLabel }: CoverLetterRatingInsightsProps) {
  const criteria = [
    { name: 'Compelling Opening', description: 'Strong hook that captures attention', passed: isPostHIL },
    { name: 'Understanding of Business/Users', description: 'Demonstrates knowledge of company', passed: isPostHIL },
    { name: 'Quantified Impact', description: 'Specific metrics and achievements', passed: isPostHIL },
    { name: 'Action Verbs', description: 'Strong, active language', passed: isPostHIL },
    { name: 'Concise Length', description: '3-4 paragraphs, under 400 words', passed: isPostHIL },
    { name: 'Error-Free Writing', description: 'No spelling or grammar errors', passed: isPostHIL },
    { name: 'Personalized Content', description: 'Tailored to specific role', passed: isPostHIL },
    { name: 'Specific Examples', description: 'Concrete examples from work history', passed: true },
    { name: 'Professional Tone', description: 'Appropriate formality level', passed: true },
    { name: 'Company Research', description: 'Shows understanding of culture', passed: isPostHIL },
    { name: 'Role Understanding', description: 'Clear grasp of responsibilities', passed: true },
  ];

  return (
    <div className="space-y-3">
      {ratingLabel && (
        <div className="flex items-baseline justify-between border rounded-lg p-3 bg-muted/20">
          <span className="text-sm text-muted-foreground">Overall Rating</span>
          <span className="text-lg font-semibold text-foreground">{ratingLabel}</span>
        </div>
      )}
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

export function CoverLetterRatingTooltip({
  children,
  className,
  isPostHIL = false,
  ratingLabel,
}: CoverLetterRatingTooltipProps) {
  const content = <CoverLetterRatingInsights isPostHIL={isPostHIL} ratingLabel={ratingLabel} />;

  return (
    <FullWidthTooltip
      content={content}
      className={className}
    >
      {children}
    </FullWidthTooltip>
  );
}
