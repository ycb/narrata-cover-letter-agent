import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase } from 'lucide-react';
import { ContentItemWithGaps } from '@/services/gapDetectionService';

interface WorkHistoryGapsCountWidgetProps {
  items: ContentItemWithGaps[];
  isLoading?: boolean;
  onClick?: () => void;
}

export function WorkHistoryGapsCountWidget({ items, isLoading, onClick }: WorkHistoryGapsCountWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-center">Work History</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const count = items.length;
  const hasGaps = count > 0;
  const displayValue = hasGaps ? count : '—';

  return (
    <Card 
      className={`shadow-soft border-muted ${hasGaps ? 'cursor-pointer hover:shadow-medium' : 'opacity-50'} transition-shadow`}
      onClick={hasGaps ? onClick : undefined}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-center gap-2">
          <Briefcase className="w-4 h-4" />
          Work History
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-3xl font-bold text-foreground">{displayValue}</div>
        <div className="text-xs text-muted-foreground mt-1">items with gaps</div>
      </CardContent>
    </Card>
  );
}

