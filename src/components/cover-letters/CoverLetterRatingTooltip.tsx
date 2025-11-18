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
    <div>
      {criteria.map((criterion, index) => (
        <div
          key={criterion.name}
          className={`p-2 flex items-center gap-2 ${index > 0 ? 'border-t border-border/30' : ''}`}
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1.5">
              <h4 className="text-sm font-medium text-foreground">{criterion.name}</h4>
            </div>
            <div className="text-xs">
              <div>
                <span className="font-medium text-foreground/90">Status:</span>{' '}
                <span className={`${criterion.passed ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                  {criterion.description}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 p-2 flex items-center">
            {criterion.passed ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
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
