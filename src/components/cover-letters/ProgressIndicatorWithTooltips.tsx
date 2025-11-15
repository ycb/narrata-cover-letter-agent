import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CoverLetterRatingTooltip } from './CoverLetterRatingTooltip';
import { ATSScoreTooltip } from './ATSScoreTooltip';
import { RequirementsTooltip } from './RequirementsTooltip';
import { MatchGoalsTooltip } from './MatchGoalsTooltip';
import type { EnhancedMatchData } from '@/types/coverLetters';
import {
  getATSScoreColor,
  getRatingColor,
  useMatchMetricsDetails,
  type GoNoGoAnalysis,
  type HILProgressMetrics,
  type MatchJobDescription,
} from './useMatchMetricsDetails';

interface ProgressIndicatorWithTooltipsProps {
  metrics: HILProgressMetrics;
  className?: string;
  isPostHIL?: boolean;
  isLoading?: boolean; // AGENT D: Show loading state during background metrics calculation
  goNoGoAnalysis?: GoNoGoAnalysis;
  jobDescription?: MatchJobDescription;
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
  isLoading = false, // AGENT D: Default to false
  goNoGoAnalysis,
  jobDescription,
  enhancedMatchData,
  onEditGoals,
  onAddStory,
  onEnhanceSection,
  onAddMetrics
}: ProgressIndicatorWithTooltipsProps) {
  const {
    goalMatches,
    goalsSummary,
    coreRequirements,
    preferredRequirements,
  } = useMatchMetricsDetails({
      jobDescription,
    enhancedMatchData,
    goNoGoAnalysis,
  });

  const coreReqList = coreRequirements.list;
  const preferredReqList = preferredRequirements.list;
  const { met: coreMet, total: coreTotal } = coreRequirements.summary;
  const { met: prefMet, total: prefTotal } = preferredRequirements.summary;
  const { met: goalsMetCount, total: totalGoals } = goalsSummary;

  const renderBadge = (value: string, className: string) => {
    if (isLoading) {
      return <div className="h-6 w-16 rounded-full bg-muted animate-pulse" aria-hidden="true" />;
    }

    return (
      <Badge variant="outline" className={className}>
        {value}
      </Badge>
    );
  };

  const shouldShowGoalsTooltip = !isLoading && goalMatches.length > 0;
  const shouldShowRequirementsTooltip = !isLoading;

  // For tooltips that still expect old format, we pass the data directly
  // TODO: Update these tooltips to use the new enhanced data structure
  const coverLetterRating = null; // No longer in enhanced data, use metrics instead
  const atsAnalysis = null; // No longer in enhanced data, use metrics instead

  const goalsCard = (
    <div className="flex flex-col items-center justify-center">
      {renderBadge(
        `${goalsMetCount}/${totalGoals}`,
        getATSScoreColor(totalGoals ? (goalsMetCount / totalGoals) * 100 : 0)
      )}
      <div className="text-xs text-muted-foreground mt-2 underline underline-offset-2">MATCH WITH GOALS</div>
    </div>
  );

  const coreCard = (
    <div className="flex flex-col items-center justify-center">
      {renderBadge(
        `${coreMet}/${coreTotal || 0}`,
        getATSScoreColor(coreTotal > 0 ? (coreMet / coreTotal) * 100 : 0)
      )}
      <div className="text-xs text-muted-foreground mt-2 underline underline-offset-2">CORE REQS</div>
    </div>
  );

  const preferredCard = (
    <div className="flex flex-col items-center justify-center">
      {renderBadge(
        `${prefMet}/${prefTotal || 0}`,
        getATSScoreColor(prefTotal > 0 ? (prefMet / prefTotal) * 100 : 0)
      )}
      <div className="text-xs text-muted-foreground mt-2 underline underline-offset-2">PREFERRED REQS</div>
    </div>
  );

  const ratingCard = (
    <div className="flex flex-col items-center justify-center">
      {renderBadge(metrics.coverLetterRating || 'N/A', getRatingColor(metrics.coverLetterRating))}
      <div className="text-xs text-muted-foreground mt-2 underline underline-offset-2">COVER LETTER RATING</div>
    </div>
  );

  const atsCard = (
    <div className="flex flex-col items-center justify-center">
      {renderBadge(`${metrics.atsScore ?? 0}%`, getATSScoreColor(metrics.atsScore ?? 0))}
      <div className="text-xs text-muted-foreground mt-2 underline underline-offset-2">ATS</div>
    </div>
  );

  return (
    <div className={`w-full bg-card border rounded-lg p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        {shouldShowGoalsTooltip ? (
          <MatchGoalsTooltip goalMatches={goalMatches} isPostHIL={isPostHIL} onEditGoals={onEditGoals}>
            {goalsCard}
          </MatchGoalsTooltip>
        ) : (
          goalsCard
        )}

        {shouldShowRequirementsTooltip ? (
          <RequirementsTooltip
            title={`Core Reqs: ${coreMet}/${coreTotal}`}
            requirements={coreReqList}
            description="Essential requirements addressed in your draft"
            onEnhanceSection={onEnhanceSection}
            onAddMetrics={onAddMetrics}
          >
            {coreCard}
          </RequirementsTooltip>
        ) : (
          coreCard
        )}

        {shouldShowRequirementsTooltip ? (
          <RequirementsTooltip
            title={`Preferred Reqs: ${prefMet}/${prefTotal}`}
            requirements={preferredReqList}
            description="Nice-to-have requirements addressed in your draft"
            onEnhanceSection={onEnhanceSection}
            onAddMetrics={onAddMetrics}
          >
            {preferredCard}
          </RequirementsTooltip>
        ) : (
          preferredCard
        )}

        {isLoading ? (
          ratingCard
        ) : (
          <CoverLetterRatingTooltip>
            {ratingCard}
          </CoverLetterRatingTooltip>
        )}

        {isLoading ? (
          atsCard
        ) : (
          <ATSScoreTooltip>
            {atsCard}
          </ATSScoreTooltip>
        )}
      </div>
    </div>
  );
}
