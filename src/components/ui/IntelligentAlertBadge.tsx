import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IntelligentAlertBadgeProps {
  gapCount: number;
  severity: 'high' | 'medium';
  onAnalyze: () => void;
  className?: string;
}

export function IntelligentAlertBadge({
  gapCount,
  severity,
  onAnalyze,
  className
}: IntelligentAlertBadgeProps) {
  const severityConfig = {
    high: {
      borderClass: 'border-destructive bg-destructive/10 text-destructive',
      iconClass: 'text-destructive'
    },
    medium: {
      borderClass: 'border-warning bg-warning/10 text-warning',
      iconClass: 'text-warning'
    }
  };

  const config = severityConfig[severity];

  return (
    <Badge
      variant="outline"
      className={cn(
        "cursor-pointer hover:opacity-80 transition-opacity",
        config.borderClass,
        className
      )}
      onClick={onAnalyze}
    >
      <AlertTriangle className={cn("h-3 w-3 mr-1", config.iconClass)} />
      {gapCount}
    </Badge>
  );
}
