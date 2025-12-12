import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GoNoGoMetricsBar } from './GoNoGoMetricsBar';
import type { GoNoGoAnalysis } from '@/services/goNoGoService';
import type { MatchMetricsData, MatchJobDescription } from './useMatchMetricsDetails';
import type { EnhancedMatchData } from '@/types/coverLetters';
import type { APhaseInsights } from '@/types/jobs';

type GoNoGoTier = 'high' | 'medium' | 'low' | 'pending' | 'error';

interface GoNoGoGateProps {
  tier: GoNoGoTier;
  analysis?: GoNoGoAnalysis | null;
  metrics: MatchMetricsData;
  jobDescription?: MatchJobDescription | null;
  enhancedMatchData?: EnhancedMatchData | null;
  aPhaseInsights?: APhaseInsights | null;
  isLoading?: boolean;
  onProceed?: () => void;
  onOverride?: () => void;
  onRetry?: () => void;
  onDiscard?: () => void;
}

export const GoNoGoGate: React.FC<GoNoGoGateProps> = ({
  tier,
  analysis,
  metrics,
  jobDescription,
  enhancedMatchData,
  aPhaseInsights,
  isLoading = false,
  onProceed,
  onOverride,
  onRetry,
  onDiscard,
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
        <GoNoGoMetricsBar
          metrics={metrics}
          jobDescription={jobDescription}
          enhancedMatchData={enhancedMatchData}
          aPhaseInsights={aPhaseInsights}
          isLoading={isLoading}
        />

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {tier === 'high' && (
            <Button onClick={onProceed} disabled={isLoading} className="px-4">
              Continue
            </Button>
          )}
          {tier === 'medium' && (
            <>
              <Button
                variant="destructive"
                onClick={onDiscard}
                disabled={isLoading}
                className="px-4"
              >
                Discard draft
              </Button>
              <Button onClick={onProceed} disabled={isLoading} className="px-4">
                Continue
              </Button>
            </>
          )}
          {tier === 'low' && (
            <>
              <Button
                variant="secondary"
                onClick={onProceed}
                disabled={isLoading}
                className="px-4"
              >
                Continue
              </Button>
              <Button
                variant="destructive"
                onClick={onDiscard}
                disabled={isLoading}
                className="px-4"
              >
                Discard draft
              </Button>
            </>
          )}
          {tier === 'pending' && (
            <Button variant="secondary" disabled className="px-4">
              Analyzing...
            </Button>
          )}
          {tier === 'error' && onRetry && (
            <Button variant="outline" onClick={onRetry} disabled={isLoading} className="px-4">
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
