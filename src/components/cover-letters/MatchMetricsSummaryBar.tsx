import React, { useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchMetricsData, RequirementDisplayItem } from './useMatchMetricsDetails';
import type { GoNoGoAnalysis } from '@/services/goNoGoService';
import { StatusIcon } from './StatusIcon';

type SummaryKey = 'goals' | 'strengths' | 'core' | 'preferred';

interface MatchMetricsSummaryBarProps {
  metrics: MatchMetricsData;
  goNoGoAnalysis?: GoNoGoAnalysis | null;
  className?: string;
}

const SummaryItem = ({
  label,
  met,
  total,
  items,
  icon,
  open,
  onToggle,
}: {
  label: string;
  met: number;
  total: number;
  items?: RequirementDisplayItem[];
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) => {
  return (
    <div className="flex-1 min-w-[180px]">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-left hover:bg-muted/40 transition',
          open && 'ring-1 ring-primary/30'
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-lg font-semibold text-foreground">{met}/{total}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      {open && items && items.length > 0 && (
        <div className="mt-2 border border-border/60 rounded-lg overflow-hidden bg-background">
          {items.map((item, idx) => (
            <div
              key={`${item.requirement || item.label}-${idx}`}
              className={cn('flex items-center justify-between px-3 py-3', idx > 0 && 'border-t border-border/40')}
            >
              <div className="text-sm font-medium text-foreground">
                {item.requirement || item.label}
              </div>
              <div className="flex-shrink-0 px-2">
                <StatusIcon met={item.demonstrated === true} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export function MatchMetricsSummaryBar({ metrics, goNoGoAnalysis, className }: MatchMetricsSummaryBarProps) {
  const [openKey, setOpenKey] = useState<SummaryKey | null>(null);

  const summary = useMemo(() => {
    return {
      goals: {
        label: 'Match w/ Goals',
        met: metrics.goals?.met ?? 0,
        total: metrics.goals?.total ?? 0,
        items: metrics.goals?.items ?? [],
        icon: <></>,
      },
      strengths: {
        label: 'Match w/ Strengths',
        met: metrics.strengths?.met ?? 0,
        total: metrics.strengths?.total ?? 0,
        items: metrics.strengths?.items ?? [],
        icon: <></>,
      },
      core: {
        label: 'Core Req',
        met: metrics.coreRequirements?.met ?? 0,
        total: metrics.coreRequirements?.total ?? 0,
        items: metrics.coreRequirements?.items ?? [],
        icon: <></>,
      },
      preferred: {
        label: 'Pref Req',
        met: metrics.preferredRequirements?.met ?? 0,
        total: metrics.preferredRequirements?.total ?? 0,
        items: metrics.preferredRequirements?.items ?? [],
        icon: <></>,
      },
    };
  }, [metrics]);

  return (
    <div className={cn('w-full space-y-3', className)}>
      <div className="flex flex-wrap gap-3">
      {(['goals','strengths','core','preferred'] as SummaryKey[]).map((key) => {
        const data = summary[key];
        const open = openKey === key;
        return (
          <SummaryItem
              key={key}
              label={data.label}
              met={data.met}
              total={data.total}
              items={data.items}
              icon={data.icon}
              open={open}
              onToggle={() => setOpenKey(open ? null : key)}
            />
          );
        })}
      </div>
    </div>
  );
}
