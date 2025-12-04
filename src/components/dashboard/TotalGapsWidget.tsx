import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GapSummary } from '@/services/gapDetectionService';

interface TotalGapsWidgetProps {
  gapSummary: GapSummary | null;
  previousGapSummary?: GapSummary | null;
  isLoading?: boolean;
  onClick?: () => void;
}

export function TotalGapsWidget({ gapSummary, previousGapSummary, isLoading, onClick }: TotalGapsWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const total = gapSummary?.total || 0;
  const previousTotal = previousGapSummary?.total || 0;
  const change = total - previousTotal;
  
  // For gaps: increase is bad (red), decrease is good (green)
  const isGood = change < 0; // Decrease in gaps is good
  const arrowIcon = change > 0 ? '↗' : '↘'; // Up arrow for increase, down for decrease

  return (
    <Card 
      className={`shadow-soft hover:shadow-medium transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">Gaps</p>
          <p className="text-3xl font-bold text-foreground mt-2">{total}</p>
          <div className={`text-sm mt-2 ${isGood ? 'text-success' : 'text-destructive'}`}>
            {arrowIcon} {change >= 0 ? '+' : ''}{change} this month
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

