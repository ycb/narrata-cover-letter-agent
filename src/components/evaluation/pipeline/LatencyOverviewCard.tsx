/**
 * Latency overview card showing P50/P90/P99 for job types
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useJobTypeAggregates } from '../hooks/useEvalsData';

interface LatencyOverviewCardProps {
  days: number;
}

export function LatencyOverviewCard({ days }: LatencyOverviewCardProps) {
  const { data, loading, error } = useJobTypeAggregates(days);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency Overview</CardTitle>
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
          <CardTitle>Latency Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load latency data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latency Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No evaluation data available for the selected time period.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latency Overview</CardTitle>
        <div className="text-sm text-muted-foreground">
          Pipeline execution times (last {days} days)
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {data.map((agg) => (
            <div key={agg.job_type} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">
                  {agg.job_type === 'coverLetter' ? 'Cover Letter' : 'PM Levels'}
                </h3>
                <Badge variant={agg.success_rate >= 95 ? 'default' : 'destructive'}>
                  {agg.success_rate.toFixed(1)}% success
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">P50 (median)</div>
                  <div className="font-semibold">
                    {formatDuration(agg.p50_duration_ms)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">P90</div>
                  <div className="font-semibold">
                    {formatDuration(agg.p90_duration_ms)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">P99</div>
                  <div className="font-semibold">
                    {formatDuration(agg.p99_duration_ms)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm pt-2 border-t">
                <div>
                  <div className="text-muted-foreground">Total runs</div>
                  <div className="font-semibold">{agg.total_runs}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg quality score</div>
                  <div className="font-semibold">
                    {agg.avg_quality_score ? `${Math.round(agg.avg_quality_score)}/100` : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

