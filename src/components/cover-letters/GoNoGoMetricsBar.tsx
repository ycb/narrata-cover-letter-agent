import React, { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useMatchMetricsDetails, type MatchMetricsData, type MatchJobDescription } from './useMatchMetricsDetails';
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

export function GoNoGoMetricsBar({
  metrics,
  jobDescription,
  enhancedMatchData,
  aPhaseInsights,
  isLoading = false,
}: GoNoGoMetricsBarProps) {
  const { goalMatches, goalsSummary, coreRequirements, preferredRequirements } = useMatchMetricsDetails({
    jobDescription: jobDescription || undefined,
    enhancedMatchData: enhancedMatchData || undefined,
    goNoGoAnalysis: undefined,
  });

  const mws = aPhaseInsights?.mws;

  const summary = useMemo(() => {
    return {
      goals: {
        label: 'Match w/ Goals',
        met: goalsSummary?.met ?? 0,
        total: goalsSummary?.total ?? 0,
        items: goalMatches || [],
      },
      strengths: {
        label: 'Match w/ Strengths',
        met: mws?.summaryScore ?? 0,
        total: 3,
        items: (mws?.details || []).map((detail: any, idx: number) => ({
          id: detail.label || `mws-${idx}`,
          requirement: detail.label || 'Strength',
          demonstrated: true,
        })),
      },
      core: {
        label: 'Core Req',
        met: coreRequirements?.summary.met ?? 0,
        total: coreRequirements?.summary.total ?? 0,
        items: coreRequirements?.list || [],
      },
      preferred: {
        label: 'Pref Req',
        met: preferredRequirements?.summary.met ?? 0,
        total: preferredRequirements?.summary.total ?? 0,
        items: preferredRequirements?.list || [],
      },
    };
  }, [goalMatches, goalsSummary, coreRequirements, preferredRequirements, mws]);

  const tiles: MetricKey[] = ['goals', 'strengths', 'core', 'preferred'];

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tiles.map((key) => {
          const data = summary[key];
          const showSkeleton = isLoading || data.total === 0;
          return (
            <div
              key={key}
              className="rounded-2xl border border-border/60 bg-muted/10 px-4 py-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">{data.label}</span>
                {showSkeleton ? (
                  <Skeleton className="h-4 w-12" />
                ) : (
                  <span className="text-lg font-semibold text-foreground">
                    {data.met}/{data.total}
                  </span>
                )}
              </div>
              {!showSkeleton && data.items.length > 0 && (
                <div className="mt-2 rounded-lg border border-border/40 bg-background">
                  {data.items.map((item: any, idx: number) => (
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
