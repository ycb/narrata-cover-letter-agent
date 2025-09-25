import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntelligentAlertBadgeProps {
  gapCount: number;
  onAnalyze: () => void;
  className?: string;
}

export function IntelligentAlertBadge({
  gapCount,
  onAnalyze,
  className
}: IntelligentAlertBadgeProps) {
  // Use consistent orange warning styling
  const borderClass = 'border-warning bg-warning/10 text-warning';
  const iconClass = 'text-warning';

  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer hover:opacity-80 transition-opacity",
        borderClass,
        className
      )}
      onClick={onAnalyze}
    >
      <AlertTriangle className={cn("h-3 w-3 mr-1", iconClass)} />
      {gapCount}
    </Badge>
  );
}
