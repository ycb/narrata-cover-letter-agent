/**
 * Recent failures table for debugging
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useRecentFailures } from '../hooks/useEvalsData';

interface ErrorTableProps {
  jobType?: string;
  limit?: number;
}

export function ErrorTable({ jobType, limit = 50 }: ErrorTableProps) {
  const { data, loading, error } = useRecentFailures(
    jobType === 'all' ? undefined : jobType,
    limit
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Failures</CardTitle>
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
          <CardTitle>Recent Failures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load error data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Failures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            🎉 No recent failures! All pipelines running smoothly.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Failures</CardTitle>
        <div className="text-sm text-muted-foreground">
          Last {data.length} failed evaluations
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Job Type</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Error Type</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((failure) => {
              const isExpanded = expandedRows.has(failure.id);

              return (
                <React.Fragment key={failure.id}>
                  <TableRow className="cursor-pointer" onClick={() => toggleRow(failure.id)}>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {failure.job_type === 'coverLetter' ? 'Cover Letter' : 'PM Levels'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{formatStageName(failure.stage)}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{failure.error_type || 'Unknown'}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatTimestamp(failure.created_at)}
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={5} className="bg-muted/50">
                        <div className="space-y-2 py-2">
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">
                              Job ID
                            </div>
                            <code className="text-xs bg-background px-2 py-1 rounded">
                              {failure.job_id}
                            </code>
                          </div>

                          {failure.error_message && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Error Message
                              </div>
                              <div className="text-sm bg-background px-3 py-2 rounded border border-destructive/20">
                                {failure.error_message}
                              </div>
                            </div>
                          )}

                          {failure.quality_checks && (
                            <div>
                              <div className="text-xs font-semibold text-muted-foreground mb-1">
                                Quality Checks
                              </div>
                              <pre className="text-xs bg-background px-3 py-2 rounded overflow-auto max-h-40">
                                {JSON.stringify(failure.quality_checks, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function formatStageName(stage: string): string {
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

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

