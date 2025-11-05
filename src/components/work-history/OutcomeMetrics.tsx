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
  const hasMetrics = metrics && metrics.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header - Always visible */}
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Outcome Metrics</span>
      </div>

      {/* Metrics List or Empty State */}
      <ul className="space-y-2 pl-8">
        {hasMetrics ? (
          metrics.map((metric, index) => (
            <li key={index} className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2 shrink-0" />
              <span className="text-sm text-foreground">{metric}</span>
            </li>
          ))
        ) : (
          <li className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-foreground mt-2 shrink-0" />
            <span className="text-sm italic text-muted-foreground">No metrics found</span>
          </li>
        )}
      </ul>
    </div>
  );
};
