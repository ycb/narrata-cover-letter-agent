import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MatchMetricsSummaryBar } from './MatchMetricsSummaryBar';
import type { GoNoGoAnalysis } from '@/services/goNoGoService';
import type { MatchMetricsData } from './useMatchMetricsDetails';

type GoNoGoTier = 'high' | 'medium' | 'low' | 'pending' | 'error';

interface GoNoGoGateProps {
  tier: GoNoGoTier;
  analysis?: GoNoGoAnalysis | null;
  metrics: MatchMetricsData;
  isLoading?: boolean;
  onProceed?: () => void;
  onOverride?: () => void;
  onRetry?: () => void;
}

export const GoNoGoGate: React.FC<GoNoGoGateProps> = ({
  tier,
  analysis,
  metrics,
  isLoading = false,
  onProceed,
  onOverride,
  onRetry,
}) => {
  const isNoGo = tier === 'low';
  return (
    <Card className="border border-border/40">
      <CardContent className="space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant={isNoGo ? 'destructive' : 'secondary'} className="text-sm font-semibold px-3 py-1">
              {isNoGo ? 'No-Go' : 'Go'}
            </Badge>
            <span className="text-lg font-semibold text-foreground">
              {isNoGo ? 'Potential blockers' : 'Strong match'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</span>
            <div className="px-3 py-1 rounded-full border border-border/60 text-sm font-semibold text-foreground bg-background">
              {analysis?.confidence !== undefined ? `${Math.round(analysis.confidence)}%` : '—'}
            </div>
          </div>
        </div>

        {/* Summary metrics */}
        <MatchMetricsSummaryBar
          metrics={metrics}
          goNoGoAnalysis={analysis || undefined}
          className="border-none shadow-none p-0"
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {isNoGo && onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} disabled={isLoading}>
              Retry
            </Button>
          )}
          {isNoGo && (
            <Button variant="outline" onClick={onOverride} disabled={isLoading} className="px-4">
              Proceed anyway
            </Button>
          )}
          {!isNoGo && (
            <Button onClick={onProceed} disabled={isLoading} className="px-4">
              Continue
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
