import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CoverLetterRatingTooltip } from './CoverLetterRatingTooltip';
import { ATSScoreTooltip } from './ATSScoreTooltip';
import { RequirementsTooltip } from './RequirementsTooltip';
import { MatchExperienceTooltip } from './MatchExperienceTooltip';
import { MatchGoalsTooltip } from './MatchGoalsTooltip';
import type { EnhancedMatchData } from '@/types/coverLetters';

interface HILProgressMetrics {
  goalsMatch: string;
  experienceMatch: string;
  coverLetterRating: string;
  atsScore: number;
  coreRequirementsMet: { met: number; total: number };
  preferredRequirementsMet: { met: number; total: number };
}

interface GoNoGoMismatch {
  type: 'geography' | 'pay' | 'core-requirements' | 'work-history';
  severity: 'high' | 'medium' | 'low';
  description: string;
  userOverride?: boolean;
}

interface GoNoGoAnalysis {
  decision: 'go' | 'no-go';
  confidence: number;
  mismatches: GoNoGoMismatch[];
}

interface ProgressIndicatorWithTooltipsProps {
  metrics: HILProgressMetrics;
  className?: string;
  isPostHIL?: boolean;
  goNoGoAnalysis?: GoNoGoAnalysis;
  jobDescription?: {
    role?: string;
    company?: string;
    location?: string;
    salary?: string;
  };
  enhancedMatchData?: EnhancedMatchData; // Agent C: detailed match data
  onEditGoals?: () => void; // Callback to open goals modal
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
  onEnhanceSection?: (sectionId: string, requirement?: string) => void; // Agent C: enhance section CTA
  onAddMetrics?: (sectionId?: string) => void; // Agent C: add metrics CTA
}

export function ProgressIndicatorWithTooltips({
  metrics,
  className,
  isPostHIL = false,
  goNoGoAnalysis,
  jobDescription,
  enhancedMatchData,
  onEditGoals,
  onAddStory,
  onEnhanceSection,
  onAddMetrics
}: ProgressIndicatorWithTooltipsProps) {
  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'strong': return 'bg-success/10 text-success border-success/20';
      case 'average': return 'bg-warning/10 text-warning border-warning/20';
      case 'weak': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getATSScoreColor = (score: number) => {
    if (score >= 80) return 'bg-success/10 text-success border-success/20';
    if (score >= 60) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  // Agent C: Use enhanced match data from consolidated analysis
  const goalMatches = enhancedMatchData?.goalMatches || [];
  const coreReqs = enhancedMatchData?.coreRequirementDetails || [];
  const preferredReqs = enhancedMatchData?.preferredRequirementDetails || [];
  const coreExperienceMatches = enhancedMatchData?.coreExperienceDetails || [];
  const preferredExperienceMatches = enhancedMatchData?.preferredExperienceDetails || [];
  
  // For tooltips that still expect old format, we pass the data directly
  // TODO: Update these tooltips to use the new enhanced data structure
  const coverLetterRating = null; // No longer in enhanced data, use metrics instead
  const atsAnalysis = null; // No longer in enhanced data, use metrics instead

  return (
    <div className={`w-full bg-card border rounded-lg p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
        {/* Match with Goals */}
        <MatchGoalsTooltip goalMatches={goalMatches} isPostHIL={isPostHIL} onEditGoals={onEditGoals}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">MATCH WITH GOALS</div>
            <Badge variant="outline" className={getRatingColor(metrics.goalsMatch)}>
              {metrics.goalsMatch}
            </Badge>
          </div>
        </MatchGoalsTooltip>

        {/* Match with Experience - Combined view of all requirements */}
        <MatchExperienceTooltip 
          matches={[...coreExperienceMatches, ...preferredExperienceMatches]}
          onAddStory={onAddStory}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">MATCH WITH EXPERIENCE</div>
            <Badge variant="outline" className={getRatingColor(metrics.experienceMatch)}>
              {metrics.experienceMatch}
            </Badge>
          </div>
        </MatchExperienceTooltip>

        {/* Core Requirements - Shows what's addressed in the DRAFT */}
        <RequirementsTooltip
          title={`Core Reqs: ${metrics.coreRequirementsMet.met}/${metrics.coreRequirementsMet.total}`}
          requirements={coreReqs}
          description="Essential requirements addressed in your draft"
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">CORE REQS</div>
            <Badge variant="outline" className={getATSScoreColor((metrics.coreRequirementsMet.met / metrics.coreRequirementsMet.total) * 100)}>
              {metrics.coreRequirementsMet.met}/{metrics.coreRequirementsMet.total}
            </Badge>
          </div>
        </RequirementsTooltip>

        {/* Preferred Requirements - Shows what's addressed in the DRAFT */}
        <RequirementsTooltip
          title={`Preferred Reqs: ${metrics.preferredRequirementsMet.met}/${metrics.preferredRequirementsMet.total}`}
          requirements={preferredReqs}
          description="Nice-to-have requirements addressed in your draft"
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">PREFERRED REQS</div>
            <Badge variant="outline" className={getATSScoreColor((metrics.preferredRequirementsMet.met / metrics.preferredRequirementsMet.total) * 100)}>
              {metrics.preferredRequirementsMet.met}/{metrics.preferredRequirementsMet.total}
            </Badge>
          </div>
        </RequirementsTooltip>

        {/* Cover Letter Rating */}
        <CoverLetterRatingTooltip ratingResult={coverLetterRating}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">COVER LETTER RATING</div>
            <Badge variant="outline" className={getRatingColor(metrics.coverLetterRating)}>
              {metrics.coverLetterRating}
            </Badge>
          </div>
        </CoverLetterRatingTooltip>

        {/* ATS Score */}
        <ATSScoreTooltip atsAnalysis={atsAnalysis}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">ATS</div>
            <Badge variant="outline" className={getATSScoreColor(metrics.atsScore)}>
              {metrics.atsScore}%
            </Badge>
          </div>
        </ATSScoreTooltip>
      </div>
    </div>
  );
}
