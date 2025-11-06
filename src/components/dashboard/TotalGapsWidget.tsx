import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { GapSummary } from '@/services/gapDetectionService';

interface TotalGapsWidgetProps {
  gapSummary: GapSummary | null;
  isLoading?: boolean;
  onClick?: () => void;
}

export function TotalGapsWidget({ gapSummary, isLoading, onClick }: TotalGapsWidgetProps) {
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

  return (
    <Card className="shadow-soft h-full cursor-pointer hover:shadow-medium transition-shadow" onClick={onClick}>
      <CardContent className="flex flex-col items-center justify-center h-full p-6">
        <div className="text-5xl font-bold text-foreground">{total}</div>
        <div className="text-sm text-muted-foreground mt-2">Total Gaps</div>
      </CardContent>
    </Card>
  );
}

