import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronsUpDown, CheckCircle, AlertTriangle, XCircle, Shield, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MatchMetricsData, RequirementDisplayItem } from './useMatchMetricsDetails';
import type { GoNoGoAnalysis } from '@/services/goNoGoService';
import { RequirementItem } from './RequirementItem';

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
  const percent = total > 0 ? Math.round((met / total) * 100) : 0;
  const status =
    percent === 100 ? 'success' : percent >= 60 ? 'warn' : 'error';

  const statusIcon =
    status === 'success' ? <CheckCircle className="h-4 w-4 text-success" /> :
    status === 'warn' ? <AlertTriangle className="h-4 w-4 text-warning" /> :
    <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <div className="flex-1 min-w-[180px]">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-left hover:bg-muted/60 transition',
          open && 'ring-1 ring-primary/40'
        )}
      >
        <div className="flex items-center gap-2">
          {icon}
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="text-sm font-medium">{met}/{total} ({percent}%)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon}
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </button>
      {open && items && items.length > 0 && (
        <div className="mt-2 border border-border/60 rounded-md bg-muted/30">
          {items.map((item, idx) => (
            <div key={`${item.requirement || item.label}-${idx}`} className={`${idx > 0 ? 'border-t border-border/40' : ''}`}>
              <RequirementItem
                label={item.requirement || item.label}
                type={item.demonstrated ? 'met' : 'unmet'}
                evidence={item.evidence}
              />
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
        icon: <Shield className="h-4 w-4 text-primary" />,
      },
      strengths: {
        label: 'Match w/ Strengths',
        met: metrics.strengths?.met ?? 0,
        total: metrics.strengths?.total ?? 0,
        items: metrics.strengths?.items ?? [],
        icon: <Gauge className="h-4 w-4 text-primary" />,
      },
      core: {
        label: 'Core Req',
        met: metrics.coreRequirements?.met ?? 0,
        total: metrics.coreRequirements?.total ?? 0,
        items: metrics.coreRequirements?.items ?? [],
        icon: <Badge variant="secondary" className="text-xs">Core</Badge>,
      },
      preferred: {
        label: 'Pref Req',
        met: metrics.preferredRequirements?.met ?? 0,
        total: metrics.preferredRequirements?.total ?? 0,
        items: metrics.preferredRequirements?.items ?? [],
        icon: <Badge variant="outline" className="text-xs">Pref</Badge>,
      },
    };
  }, [metrics]);

  const confidence = goNoGoAnalysis?.confidence;
  const tier =
    goNoGoAnalysis?.decision === 'no-go' ? 'No-Go' :
    goNoGoAnalysis?.decision === 'go' && confidence !== undefined
      ? confidence >= 75 ? 'High' : confidence >= 50 ? 'Medium' : 'Low'
      : 'Pending';

  return (
    <Card className={cn('w-full border border-border/60', className)}>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {goNoGoAnalysis?.decision === 'go' ? (
              <CheckCircle className="h-5 w-5 text-success" />
            ) : goNoGoAnalysis?.decision === 'no-go' ? (
              <XCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Fit</span>
              <span className="text-sm font-medium">
                {goNoGoAnalysis?.decision ? goNoGoAnalysis.decision.toUpperCase() : 'Pending'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</span>
            <Badge variant="outline" className="text-xs">
              {confidence !== undefined ? `${Math.round(confidence)}% (${tier})` : '—'}
            </Badge>
          </div>
        </div>

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
      </CardContent>
    </Card>
  );
}
