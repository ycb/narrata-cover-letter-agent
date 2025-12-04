import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { GapSummary } from '@/services/gapDetectionService';

interface MediumSeverityGapsWidgetProps {
  gapSummary: GapSummary | null;
  isLoading?: boolean;
  onClick?: () => void;
}

export function MediumSeverityGapsWidget({ gapSummary, isLoading, onClick }: MediumSeverityGapsWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-center">Medium</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const count = gapSummary?.bySeverity.medium || 0;
  const hasGaps = count > 0;
  const displayValue = hasGaps ? count : '—';

  return (
    <Card 
      className={`shadow-soft border-muted ${hasGaps ? 'cursor-pointer hover:shadow-medium' : 'opacity-50'} transition-shadow`}
      onClick={hasGaps ? onClick : undefined}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Medium
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-3xl font-bold text-warning">{displayValue}</div>
        <div className="text-xs text-muted-foreground mt-1">medium priority</div>
      </CardContent>
    </Card>
  );
}

