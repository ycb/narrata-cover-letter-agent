/**
 * Structural quality checks distribution card
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQualityDistribution } from '../hooks/useEvalsData';

interface StructuralChecksCardProps {
  days: number;
  jobType?: string;
}

export function StructuralChecksCard({ days, jobType }: StructuralChecksCardProps) {
  const { data, loading, error } = useQualityDistribution(days, jobType === 'all' ? undefined : jobType);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Score Distribution</CardTitle>
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
          <CardTitle>Quality Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-destructive">
            Failed to load quality data: {error.message}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quality Score Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No quality score data available for the selected filters.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group by job type
  const groupedByJobType = data.reduce((acc, bucket) => {
    if (!acc[bucket.job_type]) {
      acc[bucket.job_type] = [];
    }
    acc[bucket.job_type].push(bucket);
    return acc;
  }, {} as Record<string, typeof data>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quality Score Distribution</CardTitle>
        <div className="text-sm text-muted-foreground">
          Structural validation results (last {days} days)
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(groupedByJobType).map(([jobTypeKey, buckets]) => {
            const totalCount = buckets.reduce((sum, b) => sum + b.count, 0);

            return (
              <div key={jobTypeKey} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">
                    {jobTypeKey === 'coverLetter' ? 'Cover Letter' : 'PM Levels'}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {totalCount} evaluation{totalCount !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2">
                  {buckets.map((bucket) => {
                    const percentage = (bucket.count / totalCount) * 100;

                    return (
                      <div key={bucket.score_bucket} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2">
                            {getBucketBadge(bucket.score_bucket)}
                            <span className="text-muted-foreground">
                              {bucket.score_bucket}
                            </span>
                          </span>
                          <span className="font-medium">
                            {bucket.count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="relative h-2 bg-muted rounded overflow-hidden">
                          <div
                            className={`absolute h-full transition-all ${getBucketColor(bucket.score_bucket)}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getBucketBadge(bucket: string): React.ReactNode {
  if (bucket.includes('Excellent')) {
    return <Badge variant="default" className="bg-green-600">✓</Badge>;
  }
  if (bucket.includes('Good')) {
    return <Badge variant="default" className="bg-blue-600">✓</Badge>;
  }
  if (bucket.includes('Fair')) {
    return <Badge variant="secondary">~</Badge>;
  }
  if (bucket.includes('Weak') || bucket.includes('Poor')) {
    return <Badge variant="destructive">✗</Badge>;
  }
  return <Badge variant="outline">?</Badge>;
}

function getBucketColor(bucket: string): string {
  if (bucket.includes('Excellent')) return 'bg-green-600';
  if (bucket.includes('Good')) return 'bg-blue-600';
  if (bucket.includes('Fair')) return 'bg-yellow-500';
  if (bucket.includes('Weak')) return 'bg-orange-500';
  if (bucket.includes('Poor')) return 'bg-red-600';
  return 'bg-gray-500';
}

