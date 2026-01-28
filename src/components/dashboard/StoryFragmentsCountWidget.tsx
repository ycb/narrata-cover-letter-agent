import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';

interface StoryFragmentsCountWidgetProps {
  count: number;
  isLoading?: boolean;
  onClick?: () => void;
}

export function StoryFragmentsCountWidget({ count, isLoading, onClick }: StoryFragmentsCountWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardContent className="py-8 text-center">
          <div className="text-sm text-muted-foreground">Loading fragments…</div>
        </CardContent>
      </Card>
    );
  }

  const hasFragments = count > 0;
  const displayValue = hasFragments ? count : '—';

  return (
    <Card
      className={`shadow-soft border-muted ${hasFragments ? 'cursor-pointer hover:shadow-medium' : 'opacity-50'} transition-shadow`}
      onClick={hasFragments ? onClick : undefined}
    >
      <CardContent className="p-4">
        <div className="text-xs font-medium text-muted-foreground text-center mb-3">
          <span className="uppercase tracking-wider">Story Fragments</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Layers className="w-8 h-8 text-muted-foreground" />
          <div className="text-4xl font-bold text-foreground">{displayValue}</div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {hasFragments ? 'Finish fragments to unlock polished stories' : 'No fragments pending review'}
        </p>
      </CardContent>
    </Card>
  );
}
