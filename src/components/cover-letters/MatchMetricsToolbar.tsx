import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, HelpCircle } from 'lucide-react';
import { GoalMatchCard } from './GoalMatchCard';
import { CoverLetterRatingInsights } from './CoverLetterRatingTooltip';
import { ATSScoreInsights } from './ATSScoreTooltip';
import {
  getATSScoreColor,
  getRatingColor,
  useMatchMetricsDetails,
  type GoalMatchDisplay,
  type GoNoGoAnalysis,
  type HILProgressMetrics,
  type MatchJobDescription,
  type RequirementDisplayItem,
} from './useMatchMetricsDetails';
import type { EnhancedMatchData } from '@/types/coverLetters';

type MetricKey = 'goals' | 'core' | 'preferred' | 'rating' | 'ats';

interface MatchMetricsToolbarProps {
  metrics: HILProgressMetrics;
  className?: string;
  isPostHIL?: boolean;
  isLoading?: boolean;
  goNoGoAnalysis?: GoNoGoAnalysis;
  jobDescription?: MatchJobDescription;
  enhancedMatchData?: EnhancedMatchData;
  onEditGoals?: () => void;
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
  onAddMetrics?: (sectionId?: string) => void;
}

interface ToolbarItem {
  key: MetricKey;
  label: string;
  value: string;
  badgeClass: string;
  disabled?: boolean;
}

export function MatchMetricsToolbar({
  metrics,
  className,
  isPostHIL = false,
  isLoading = false,
  goNoGoAnalysis,
  jobDescription,
  enhancedMatchData,
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
}: MatchMetricsToolbarProps) {
  const { goalMatches, goalsSummary, coreRequirements, preferredRequirements } = useMatchMetricsDetails({
    jobDescription,
    enhancedMatchData,
    goNoGoAnalysis,
  });

  const toolbarItems = useMemo<ToolbarItem[]>(() => {
    return [
      {
        key: 'goals',
        label: 'Match with Goals',
        value: isLoading ? '' : `${goalsSummary.met}/${goalsSummary.total}`,
        badgeClass: getATSScoreColor(goalsSummary.percentage),
        disabled: isLoading,
      },
      {
        key: 'core',
        label: 'Core Requirements',
        value: isLoading ? '' : `${coreRequirements.summary.met}/${coreRequirements.summary.total || 0}`,
        badgeClass: getATSScoreColor(coreRequirements.summary.percentage),
        disabled: isLoading,
      },
      {
        key: 'preferred',
        label: 'Preferred Requirements',
        value: isLoading ? '' : `${preferredRequirements.summary.met}/${preferredRequirements.summary.total || 0}`,
        badgeClass: getATSScoreColor(preferredRequirements.summary.percentage),
        disabled: isLoading,
      },
      {
        key: 'rating',
        label: 'Cover Letter Rating',
        value: isLoading ? '' : metrics.coverLetterRating || 'N/A',
        badgeClass: getRatingColor(metrics.coverLetterRating),
        disabled: isLoading,
      },
      {
        key: 'ats',
        label: 'ATS',
        value: isLoading ? '' : `${metrics.atsScore ?? 0}%`,
        badgeClass: getATSScoreColor(metrics.atsScore ?? 0),
        disabled: isLoading,
      },
    ];
  }, [coreRequirements.summary, goalsSummary, isLoading, metrics.atsScore, metrics.coverLetterRating, preferredRequirements.summary]);

  const firstAvailable = toolbarItems.find((item) => !item.disabled) ?? toolbarItems[0];
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(firstAvailable.key);

  useEffect(() => {
    if (firstAvailable) {
      setActiveMetric(firstAvailable.key);
    }
  }, [firstAvailable]);

  const hasExpandedItem = activeMetric !== null;

  return (
    <div className={`w-full bg-card border rounded-lg ${className || ''}`}>
      <div
        className={`flex flex-col gap-2 p-3 border-b md:border-b-0 md:border-r transition-all duration-300 ease-in-out ${
          hasExpandedItem ? 'md:w-96' : 'md:w-48'
        }`}
      >
        {toolbarItems.map((item) => {
          const isActive = activeMetric === item.key;
          return (
            <div key={item.key} className="flex flex-col">
              {isLoading ? (
                <div className="h-14 w-full rounded-md bg-muted animate-pulse" aria-hidden="true" />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveMetric(isActive ? null : item.key)}
                    className={`w-full rounded-md border px-3 py-2 text-left transition ${
                      isActive
                        ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                        : 'bg-transparent border-transparent hover:bg-muted/40 text-muted-foreground'
                    }`}
                    aria-pressed={isActive}
                    aria-expanded={isActive}
                  >
                    <div className="flex flex-col w-full">
                      <div className="flex items-center justify-between">
                        <span className={`text-base font-semibold ${isActive ? 'text-white dark:text-black' : 'text-foreground'}`}>
                          {item.value}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={item.badgeClass}
                        >
                          {isActive ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Badge>
                      </div>
                      <span className={`text-[11px] uppercase tracking-wide mt-1 ${isActive ? 'text-white dark:text-black' : 'text-muted-foreground'}`}>
                        {item.label}
                      </span>
                    </div>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isActive && activeMetric ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {isActive && activeMetric && (
                      <div className="p-4 border-t mt-2" id="match-metrics-drawer">
                        <MetricDrawerContent
                          activeMetric={activeMetric}
                          goalMatches={goalMatches}
                          coreRequirements={coreRequirements.list}
                          preferredRequirements={preferredRequirements.list}
                          isPostHIL={isPostHIL}
                          metrics={metrics}
                          onEditGoals={onEditGoals}
                          onEnhanceSection={onEnhanceSection}
                          onAddMetrics={onAddMetrics}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface MetricDrawerContentProps {
  activeMetric: MetricKey;
  goalMatches: GoalMatchDisplay[];
  coreRequirements: RequirementDisplayItem[];
  preferredRequirements: RequirementDisplayItem[];
  isPostHIL: boolean;
  metrics: HILProgressMetrics;
  onEditGoals?: () => void;
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
  onAddMetrics?: (sectionId?: string) => void;
}

function MetricDrawerContent({
  activeMetric,
  goalMatches,
  coreRequirements,
  preferredRequirements,
  isPostHIL,
  metrics,
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
}: MetricDrawerContentProps) {
  switch (activeMetric) {
    case 'goals':
      return (
        <GoalsDrawerContent
          goalMatches={goalMatches}
          onEditGoals={onEditGoals}
        />
      );
    case 'core':
      return (
        <RequirementsDrawerContent
          title="Core Requirements"
          description="Essential requirements addressed in your draft"
          requirements={coreRequirements}
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'preferred':
      return (
        <RequirementsDrawerContent
          title="Preferred Requirements"
          description="Nice-to-have requirements addressed in your draft"
          requirements={preferredRequirements}
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'rating':
      return <CoverLetterRatingInsights isPostHIL={isPostHIL} ratingLabel={metrics.coverLetterRating || 'N/A'} />;
    case 'ats':
    default:
      return <ATSScoreInsights isPostHIL={isPostHIL} score={metrics.atsScore ?? 0} />;
  }
}

interface RequirementsDrawerContentProps {
  title: string;
  description: string;
  requirements: RequirementDisplayItem[];
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
  onAddMetrics?: (sectionId?: string) => void;
}

function RequirementsDrawerContent({
  title,
  description,
  requirements,
  onEnhanceSection,
  onAddMetrics,
}: RequirementsDrawerContentProps) {
  if (!requirements.length) {
    return (
      <div className="flex items-center gap-3 border rounded-lg p-4 bg-muted/20">
        <HelpCircle className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {requirements.map((req) => (
        <div
          key={req.id}
          className={`border rounded-lg p-3 ${req.demonstrated ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium text-foreground">{req.requirement}</h4>
              <p className={`text-xs mt-1 ${req.demonstrated ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                {req.evidence || (req.demonstrated ? 'Mentioned in draft' : 'Not mentioned in draft')}
              </p>
            </div>
            {req.demonstrated && (
              <div className="flex gap-2">
                {onEnhanceSection && req.section && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => onEnhanceSection(req.section!, req.requirement)}
                  >
                    Enhance
                  </Button>
                )}
                {onAddMetrics && req.section && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => onAddMetrics(req.section)}
                  >
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
}

interface GoalsDrawerContentProps {
  goalMatches: GoalMatchDisplay[];
  onEditGoals?: () => void;
}

function GoalsDrawerContent({ goalMatches, onEditGoals }: GoalsDrawerContentProps) {
  const hasAnyGoals = goalMatches.some(
    (match) =>
      match.userValue !== null &&
      match.userValue !== undefined &&
      match.emptyState !== 'goal-not-set',
  );

  const sortedMatches = useMemo(() => {
    return [...goalMatches].sort((a, b) => {
      if (a.emptyState === 'goal-not-set' && b.emptyState !== 'goal-not-set') return 1;
      if (b.emptyState === 'goal-not-set' && a.emptyState !== 'goal-not-set') return -1;
      if (a.met && !b.met) return -1;
      if (!a.met && b.met) return 1;
      return 0;
    });
  }, [goalMatches]);

  if (!hasAnyGoals) {
    return (
      <div className="space-y-3">
        <GoalMatchCard goalType="Career Goals" emptyState="no-goals" onEditGoals={onEditGoals} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedMatches.map((match) => (
        <GoalMatchCard
          key={match.id}
          goalType={match.goalType}
          userValue={match.userValue}
          jobValue={match.jobValue}
          met={match.met}
          matchState={match.matchState}
          evidence={match.evidence}
          requiresManualVerification={match.requiresManualVerification}
          emptyState={match.emptyState}
          onEditGoals={onEditGoals}
        />
      ))}
    </div>
  );
}

