import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { GapSummary } from '@/services/gapDetectionService';

interface HighSeverityGapsWidgetProps {
  gapSummary: GapSummary | null;
  isLoading?: boolean;
  onClick?: () => void;
}

export function HighSeverityGapsWidget({ gapSummary, isLoading, onClick }: HighSeverityGapsWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-8 text-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const count = gapSummary?.bySeverity.high || 0;
  const hasGaps = count > 0;
  const displayValue = hasGaps ? count : '—';

  return (
    <Card 
      className={`shadow-soft border-muted ${hasGaps ? 'cursor-pointer hover:shadow-medium' : 'opacity-50'} transition-shadow overflow-hidden relative`}
      onClick={hasGaps ? onClick : undefined}
    >
      {/* Background Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
        <AlertTriangle className="w-32 h-32" />
      </div>
      
      {/* Content */}
      <CardContent className="py-6 text-center relative z-10">
        <div className="text-xs font-medium text-muted-foreground mb-3">High</div>
        <div className="text-4xl font-bold text-destructive">{displayValue}</div>
      </CardContent>
    </Card>
  );
}

