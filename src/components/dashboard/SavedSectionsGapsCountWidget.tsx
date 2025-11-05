import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutTemplate } from 'lucide-react';
import { ContentItemWithGaps } from '@/services/gapDetectionService';

interface SavedSectionsGapsCountWidgetProps {
  items: ContentItemWithGaps[];
  isLoading?: boolean;
  onClick?: () => void;
}

export function SavedSectionsGapsCountWidget({ items, isLoading, onClick }: SavedSectionsGapsCountWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-center">Saved Sections</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const count = items.length;

  return (
    <Card className="shadow-soft cursor-pointer hover:shadow-medium transition-shadow" onClick={onClick}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-center gap-2">
          <LayoutTemplate className="w-4 h-4" />
          Saved Sections
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <div className="text-3xl font-bold text-foreground">{count}</div>
        <div className="text-xs text-muted-foreground mt-1">items with gaps</div>
      </CardContent>
    </Card>
  );
}

