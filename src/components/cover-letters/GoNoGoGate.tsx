import React, { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, ShieldX } from 'lucide-react';
import { MatchMetricsSummaryBar } from './MatchMetricsSummaryBar';
import type { GoNoGoAnalysis } from '@/services/goNoGoService';
import type { MatchMetricsData, MatchJobDescription } from './useMatchMetricsDetails';

type GoNoGoTier = 'high' | 'medium' | 'low' | 'pending' | 'error';

interface GoNoGoGateProps {
  tier: GoNoGoTier;
  analysis?: GoNoGoAnalysis | null;
  metrics: MatchMetricsData;
  jobDescription?: MatchJobDescription;
  isLoading?: boolean;
  onProceed?: () => void; // medium/high path
  onOverride?: () => void; // low override
  onRetry?: () => void; // retry the analysis
}

/**
 * GoNoGoGate
 * Reusable panel for Go/No-Go decisions in the CL draft flow.
 * - Shows summary via MatchMetricsToolbar (reuses existing pattern)
 * - Shows ranked blockers for low/medium tiers
 * - Provides consistent CTAs for proceed/override
 */
export const GoNoGoGate: React.FC<GoNoGoGateProps> = ({
  tier,
  analysis,
  metrics,
  jobDescription,
  isLoading = false,
  onProceed,
  onOverride,
  onRetry,
}) => {
  const sortedMismatches = useMemo(() => {
    if (!analysis?.mismatches) return [];
    const severityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return [...analysis.mismatches].sort(
      (a, b) => (severityRank[a.severity] ?? 3) - (severityRank[b.severity] ?? 3),
    );
  }, [analysis?.mismatches]);

  const headline =
    tier === 'high'
      ? 'Strong match'
      : tier === 'medium'
        ? 'Potential fit – review blockers'
        : tier === 'low'
          ? 'No-go – major blockers found'
          : tier === 'error'
            ? 'Analysis unavailable'
            : 'Checking fit...';

  const headlineIcon =
    tier === 'high'
      ? <CheckCircle className="h-5 w-5 text-success" />
      : tier === 'low'
        ? <ShieldX className="h-5 w-5 text-destructive" />
        : tier === 'medium'
          ? <AlertTriangle className="h-5 w-5 text-warning" />
          : <Info className="h-5 w-5 text-muted-foreground" />;

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {headlineIcon}
            <CardTitle className="text-base">{headline}</CardTitle>
            {analysis?.confidence !== undefined && (
              <Badge variant="outline" className="text-xs">
                Confidence: {Math.round(analysis.confidence)}%
              </Badge>
            )}
          </div>
          {tier === 'pending' && onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} disabled={isLoading}>
              Retry
            </Button>
          )}
        </div>
        <CardDescription className="text-sm">
          Uses phase-A signals (JD core/preferred, goals, work history, PM level) to recommend apply vs. hold.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary metrics — collapsed horizontal bar focused on MwG, MwS, Core, Pref */}
        <MatchMetricsSummaryBar
          metrics={metrics}
          goNoGoAnalysis={analysis || undefined}
          className="border-none shadow-none p-0"
        />

        {/* Details for caution / no-go */}
        {(tier === 'low' || tier === 'medium') && sortedMismatches.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={tier === 'low' ? 'destructive' : 'outline'}>
                {tier === 'low' ? 'No-Go' : 'Review'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Ranked blockers to address before drafting
              </span>
            </div>
            <div className="space-y-2">
              {sortedMismatches.map((mismatch, idx) => (
                <div
                  key={`${mismatch.type}-${idx}`}
                  className="p-3 rounded border border-border/50 bg-muted/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        mismatch.severity === 'high'
                          ? 'destructive'
                          : mismatch.severity === 'medium'
                            ? 'default'
                            : 'outline'
                      }
                      className="text-xs capitalize"
                    >
                      {mismatch.severity}
                    </Badge>
                    <span className="text-sm font-medium capitalize">{mismatch.type.replace('-', ' ')}</span>
                  </div>
                  <p className="text-sm text-foreground">{mismatch.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 justify-end">
          {tier === 'low' && (
            <>
              {onRetry && (
                <Button variant="ghost" size="sm" onClick={onRetry} disabled={isLoading}>
                  Retry
                </Button>
              )}
              <Button variant="secondary" onClick={onOverride} disabled={isLoading}>
                Proceed anyway
              </Button>
            </>
          )}
          {tier === 'medium' && (
            <Button onClick={onProceed} disabled={isLoading}>
              Proceed
            </Button>
          )}
          {tier === 'high' && (
            <Button variant="secondary" onClick={onProceed} disabled={isLoading}>
              Continue
            </Button>
          )}
          {tier === 'pending' && (
            <Button variant="secondary" disabled>
              Analyzing...
            </Button>
          )}
          {tier === 'error' && onRetry && (
            <Button variant="secondary" onClick={onRetry} disabled={isLoading}>
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
