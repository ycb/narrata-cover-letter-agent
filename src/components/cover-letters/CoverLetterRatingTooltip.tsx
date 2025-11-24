import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { StatusIcon } from './StatusIcon';

interface CoverLetterCriterion {
  id: string;
  label: string;
  met: boolean;
  evidence: string;
  suggestion?: string;
}

interface CoverLetterRatingTooltipProps {
  children: React.ReactNode;
  className?: string;
  isPostHIL?: boolean;
  overallScore?: number;
  criteria?: CoverLetterCriterion[];
}

export interface CoverLetterRatingInsightsProps {
  isPostHIL?: boolean;
  overallScore?: number;
  criteria?: CoverLetterCriterion[];
}

export function CoverLetterRatingInsights({ 
  isPostHIL = false, 
  overallScore, 
  criteria,
}: CoverLetterRatingInsightsProps) {
  // Fallback to hardcoded criteria if real criteria not available (backward compatibility)
  const fallbackCriteria = [
    { id: 'compelling_opening', label: 'Compelling Opening', description: 'Strong hook that captures attention', passed: isPostHIL },
    { id: 'business_understanding', label: 'Understanding of Business/Users', description: 'Demonstrates knowledge of company', passed: isPostHIL },
    { id: 'quantified_impact', label: 'Quantified Impact', description: 'Specific metrics and achievements', passed: isPostHIL },
    { id: 'action_verbs', label: 'Action Verbs', description: 'Strong, active language', passed: isPostHIL },
    { id: 'concise_length', label: 'Concise Length', description: '3-4 paragraphs, under 400 words', passed: isPostHIL },
    { id: 'error_free', label: 'Error-Free Writing', description: 'No spelling or grammar errors', passed: isPostHIL },
    { id: 'personalized', label: 'Personalized Content', description: 'Tailored to specific role', passed: isPostHIL },
    { id: 'specific_examples', label: 'Specific Examples', description: 'Concrete examples from work history', passed: true },
    { id: 'professional_tone', label: 'Professional Tone', description: 'Appropriate formality level', passed: true },
    { id: 'company_research', label: 'Company Research', description: 'Shows understanding of culture', passed: isPostHIL },
    { id: 'role_understanding', label: 'Role Understanding', description: 'Clear grasp of responsibilities', passed: true },
  ];

  // Use real criteria if available, otherwise fallback
  const displayCriteria = criteria && criteria.length > 0 
    ? criteria.map(c => ({
        id: c.id,
        name: c.label,
        met: c.met,
        evidence: c.evidence,
        suggestion: c.suggestion || '',
      }))
    : fallbackCriteria.map(c => ({
        id: c.id,
        name: c.label,
        met: c.passed,
        evidence: c.description,
        suggestion: '',
      }));

  return (
    <div>
      {displayCriteria.map((criterion, index) => (
        <div
          key={criterion.id}
          className={`p-2 flex items-center gap-2 ${index > 0 ? 'border-t border-border/30' : ''}`}
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1.5">
              <h4 className="text-sm font-medium text-foreground">{criterion.name}</h4>
            </div>
            <div className="text-xs space-y-1">
              {criterion.evidence && (
                <div>
                  <span className="font-medium text-foreground/90">Status:</span>{' '}
                  <span className={`${criterion.met ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                    {criterion.evidence}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 p-2 flex items-center">
            <StatusIcon met={criterion.met} />
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
  overallScore,
  criteria,
}: CoverLetterRatingTooltipProps) {
  const content = <CoverLetterRatingInsights isPostHIL={isPostHIL} overallScore={overallScore} criteria={criteria} />;

  return (
    <FullWidthTooltip
      content={content}
      className={className}
    >
      {children}
    </FullWidthTooltip>
  );
}
