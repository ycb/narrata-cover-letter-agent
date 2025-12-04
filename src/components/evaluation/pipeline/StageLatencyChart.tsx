/**
 * Stage-level latency breakdown chart
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStageAggregates } from '../hooks/useEvalsData';

interface StageLatencyChartProps {
  days: number;
  jobType?: string;
}

export function StageLatencyChart({ days, jobType }: StageLatencyChartProps) {
  const { data, loading, error } = useStageAggregates(days, jobType === 'all' ? undefined : jobType);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stage Latency Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stage Latency Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load stage data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stage Latency Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No stage data available for the selected filters.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by job type
  const groupedByJobType = data.reduce((acc, stage) => {
    if (!acc[stage.job_type]) {
      acc[stage.job_type] = [];
    }
    acc[stage.job_type].push(stage);
    return acc;
  }, {} as Record<string, typeof data>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage Latency Breakdown</CardTitle>
        <div className="text-sm text-muted-foreground">
          Performance by pipeline stage (last {days} days)
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {Object.entries(groupedByJobType).map(([jobTypeKey, stages]) => (
            <div key={jobTypeKey} className="space-y-4">
              <h3 className="font-semibold text-sm">
                {jobTypeKey === 'coverLetter' ? 'Cover Letter Pipeline' : 'PM Levels Pipeline'}
              </h3>

              <div className="space-y-3">
                {stages.map((stage) => (
                  <div key={stage.stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatStageName(stage.stage)}</span>
                        <Badge
                          variant={stage.success_rate >= 95 ? 'outline' : 'destructive'}
                          className="text-xs"
                        >
                          {stage.success_rate.toFixed(0)}%
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        P50: {formatDuration(stage.p50_duration_ms)}
                      </span>
                    </div>

                    {/* Simple bar chart */}
                    <div className="relative h-6 bg-muted rounded overflow-hidden">
                      <div
                        className="absolute h-full bg-primary transition-all"
                        style={{
                          width: `${Math.min((stage.p50_duration_ms / getMaxDuration(stages)) * 100, 100)}%`,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center px-2 text-xs font-medium">
                        {formatDuration(stage.p50_duration_ms)}
                        {stage.avg_ttfu_ms && (
                          <span className="ml-2 text-muted-foreground">
                            (TTFU: {formatDuration(stage.avg_ttfu_ms)})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>P90: {formatDuration(stage.p90_duration_ms)}</span>
                      <span>Runs: {stage.total_runs}</span>
                      {stage.failure_count > 0 && (
                        <span className="text-destructive">
                          Failures: {stage.failure_count}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatStageName(stage: string): string {
  // Convert camelCase to Title Case
  const nameMap: Record<string, string> = {
    jdAnalysis: 'JD Analysis',
    requirementAnalysis: 'Requirement Analysis',
    goalsAndStrengths: 'Goals & Strengths',
    sectionGaps: 'Section Gaps',
    baselineAssessment: 'Baseline Assessment',
    competencyBreakdown: 'Competency Breakdown',
    specializationAssessment: 'Specialization Assessment',
    structural_checks: 'Structural Validation',
  };

  return nameMap[stage] || stage;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getMaxDuration(stages: Array<{ p50_duration_ms: number }>): number {
  return Math.max(...stages.map(s => s.p50_duration_ms || 0));
}

