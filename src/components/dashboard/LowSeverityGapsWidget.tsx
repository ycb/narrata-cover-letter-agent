import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { GapSummary } from '@/services/gapDetectionService';

interface LowSeverityGapsWidgetProps {
  gapSummary: GapSummary | null;
  isLoading?: boolean;
  onClick?: () => void;
}

export function LowSeverityGapsWidget({ gapSummary, isLoading, onClick }: LowSeverityGapsWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-8 text-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const count = gapSummary?.bySeverity.low || 0;
  const hasGaps = count > 0;
  const displayValue = hasGaps ? count : '—';

  return (
    <Card 
      className={`shadow-soft border-muted ${hasGaps ? 'cursor-pointer hover:shadow-medium' : 'opacity-50'} transition-shadow overflow-hidden`}
      onClick={hasGaps ? onClick : undefined}
    >
      <CardContent className="p-4">
        {/* Row 1: Title */}
        <div className="text-xs font-medium text-muted-foreground text-center mb-3">
          Low
        </div>
        
        {/* Row 2: Icon + Count */}
        <div className="flex items-center justify-center gap-3">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
          <div className="text-4xl font-bold text-muted-foreground">{displayValue}</div>
        </div>
      </CardContent>
    </Card>
  );
}

