import React from 'react';
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
      {/* Metrics List or Empty State */}
      <ul className="space-y-2">
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
