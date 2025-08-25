import React from 'react';
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OutcomeMetricsProps {
  metrics: string[];
  className?: string;
}

export const OutcomeMetrics: React.FC<OutcomeMetricsProps> = ({
  metrics,
  className
}) => {
  // Don't render if no metrics
  if (!metrics || metrics.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Outcome Metrics</span>
      </div>

      {/* Metrics List */}
      <ul className="space-y-2">
        {metrics.map((metric, index) => (
          <li key={index} className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2 shrink-0" />
            <span className="text-sm text-foreground">{metric}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
