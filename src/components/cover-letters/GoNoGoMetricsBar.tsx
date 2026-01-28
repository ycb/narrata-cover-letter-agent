import React, { useMemo, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useMatchMetricsDetails,
  type MatchMetricsData,
  type MatchJobDescription,
  type GoalMatchDisplay,
  type RequirementDisplayItem,
} from './useMatchMetricsDetails';
import type { EnhancedMatchData } from '@/types/coverLetters';
import type { APhaseInsights } from '@/types/jobs';

type MetricKey = 'goals' | 'strengths' | 'core' | 'preferred';

interface GoNoGoMetricsBarProps {
  metrics: MatchMetricsData;
  jobDescription?: MatchJobDescription | null;
  enhancedMatchData?: EnhancedMatchData | null;
  aPhaseInsights?: APhaseInsights | null;
  isLoading?: boolean;
}

interface MatchSummaryItem {
  id: string;
  label: string;
  requirement?: string;
  demonstrated?: boolean;
}

interface MatchMetricsSummary {
  label: string;
  met: number;
  total: number;
  items: MatchSummaryItem[];
}

type MwsDetail = APhaseInsights['mws']['details'][number];

const toSummaryItemFromGoalMatch = (match: GoalMatchDisplay, index: number): MatchSummaryItem => {
  const baseLabel = match.goalType || match.criterion || match.id;
  return {
    id: match.id || `goal-${index}`,
    label: baseLabel,
    requirement: baseLabel,
    demonstrated: match.met,
  };
};

const toSummaryItemFromRequirement = (requirement: RequirementDisplayItem): MatchSummaryItem => ({
  id: requirement.id,
  label: requirement.requirement,
  requirement: requirement.requirement,
  demonstrated: requirement.demonstrated,
});

const toSummaryItemFromMwsDetail = (detail: MwsDetail, index: number): MatchSummaryItem => ({
  id: detail.label || `mws-${index}`,
  label: detail.label || 'Strength',
  requirement: detail.label || 'Strength',
  demonstrated: detail.strengthLevel === 'strong' || detail.strengthLevel === 'moderate',
});

export function GoNoGoMetricsBar({
  metrics,
  jobDescription,
  enhancedMatchData,
  aPhaseInsights,
  isLoading = false,
}: GoNoGoMetricsBarProps) {
  const [openKeys, setOpenKeys] = useState<Set<MetricKey>>(new Set());

  const { goalMatches, goalsSummary, coreRequirements, preferredRequirements } = useMatchMetricsDetails({
    jobDescription: jobDescription || undefined,
    enhancedMatchData: enhancedMatchData || undefined,
    goNoGoAnalysis: undefined,
  });

  const mws = aPhaseInsights?.mws;
  const derivedMwsScore = useMemo(() => {
    if (!mws) return 0;
    const details = Array.isArray(mws.details) ? mws.details : [];
    if (details.length) {
      return Math.min(
        3,
        details.reduce(
          (count: number, detail: MwsDetail) =>
            count + (detail.strengthLevel === 'strong' || detail.strengthLevel === 'moderate' ? 1 : 0),
          0,
        ),
      );
    }
    return mws.summaryScore ?? 0;
  }, [mws]);

  const summary: Record<MetricKey, MatchMetricsSummary> = useMemo(() => {
    const goalItems = (goalMatches || []).map((match, idx) => toSummaryItemFromGoalMatch(match, idx));
    const strengthItems = (mws?.details || []).map((detail, idx) => toSummaryItemFromMwsDetail(detail, idx));
    const coreItems = (coreRequirements?.list || []).map(toSummaryItemFromRequirement);
    const preferredItems = (preferredRequirements?.list || []).map(toSummaryItemFromRequirement);

    return {
      goals: {
        label: 'Match w/ Goals',
        met: goalsSummary?.met ?? 0,
        total: goalsSummary?.total ?? 0,
        items: goalItems,
      },
      strengths: {
        label: 'Match w/ Strengths',
        met: derivedMwsScore,
        total: 3,
        items: strengthItems,
      },
      core: {
        label: 'Core Req',
        met: coreRequirements?.summary.met ?? 0,
        total: coreRequirements?.summary.total ?? 0,
        items: coreItems,
      },
      preferred: {
        label: 'Pref Req',
        met: preferredRequirements?.summary.met ?? 0,
        total: preferredRequirements?.summary.total ?? 0,
        items: preferredItems,
      },
    };
  }, [goalMatches, goalsSummary, coreRequirements, preferredRequirements, mws, derivedMwsScore]);

  const tiles: MetricKey[] = ['goals', 'strengths', 'core', 'preferred'];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((key) => {
          const data = summary[key];
          const showSkeleton = isLoading;
          const isOpen = openKeys.has(key);
          const toggle = () => {
            setOpenKeys(prev => {
              const next = new Set(prev);
              if (next.has(key)) {
                next.delete(key);
              } else {
                next.add(key);
              }
              return next;
            });
          };
          return (
            <div
              key={key}
              className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3"
            >
              <button
                type="button"
                onClick={toggle}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{data.label}</span>
                {showSkeleton ? (
                  <Skeleton className="h-4 w-12" />
                ) : (
                  <span className="text-lg font-semibold text-foreground">
                    {data.met}/{data.total}
                  </span>
                )}
              </button>
              {!showSkeleton && isOpen && data.items.length > 0 && (
                <div className="mt-2 rounded-lg border border-border/40 bg-background">
                  {data.items.map((item, idx) => (
                    <div
                      key={item.id || `${key}-${idx}`}
                      className={cn(
                        'flex items-center justify-between px-3 py-2 text-sm',
                        idx > 0 && 'border-t border-border/30'
                      )}
                    >
                      <span className="text-foreground">{item.requirement || item.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.demonstrated === true ? '✓' : '✕'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
