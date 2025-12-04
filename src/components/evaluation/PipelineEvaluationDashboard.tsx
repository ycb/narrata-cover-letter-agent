/**
 * Pipeline Evaluation Dashboard (Evals V1.1)
 * 
 * Displays evaluation metrics for coverLetter and pmLevels pipelines.
 * Data sourced from evals_log table via evalsService.
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { JobTypeFilter } from './pipeline/JobTypeFilter';
import { LatencyOverviewCard } from './pipeline/LatencyOverviewCard';
import { StageLatencyChart } from './pipeline/StageLatencyChart';
import { StructuralChecksCard } from './pipeline/StructuralChecksCard';
import { ErrorTable } from './pipeline/ErrorTable';
import { ExportButton } from './pipeline/ExportButton';

export function PipelineEvaluationDashboard() {
  const [timeRange, setTimeRange] = useState<number>(7);
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all');

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pipeline Evaluations</h1>
          <p className="text-muted-foreground mt-1">
            Performance and quality metrics for cover letter and PM levels pipelines
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton days={timeRange} jobType={jobTypeFilter} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Time Range</label>
              <Select
                value={timeRange.toString()}
                onValueChange={(v) => setTimeRange(parseInt(v, 10))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Job Type</label>
              <JobTypeFilter value={jobTypeFilter} onChange={setJobTypeFilter} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyOverviewCard days={timeRange} />
        <StructuralChecksCard days={timeRange} jobType={jobTypeFilter} />
      </div>

      {/* Stage Breakdown */}
      <StageLatencyChart days={timeRange} jobType={jobTypeFilter} />

      {/* Error Table */}
      <ErrorTable jobType={jobTypeFilter} limit={50} />

      {/* Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">About Pipeline Evaluations</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>
                <strong>Latency metrics:</strong> P50 (median), P90, P99 show pipeline execution times
              </li>
              <li>
                <strong>Quality scores:</strong> 0-100 scores from deterministic structural checks
              </li>
              <li>
                <strong>Success rate:</strong> Percentage of jobs that completed without errors
              </li>
              <li>
                <strong>TTFU:</strong> Time to first update (for streaming stages only)
              </li>
            </ul>
            <p className="mt-3 text-xs">
              Data sourced from <code className="bg-muted px-1 py-0.5 rounded">evals_log</code> table.
              Pipeline instrumentation added in Evals V1.1.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

