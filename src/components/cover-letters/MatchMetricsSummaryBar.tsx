import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, XCircle, Shield, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
        icon: <></>, // Minimal pill per mock
      },
      strengths: {
        label: 'Match w/ Strengths',
        met: metrics.strengths?.met ?? 0,
        total: metrics.strengths?.total ?? 0,
        items: metrics.strengths?.items ?? [],
        icon: <></>, // Minimal pill per mock
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

  const confidence = goNoGoAnalysis?.confidence;
  const tier =
    goNoGoAnalysis?.decision === 'no-go' ? 'No-Go' :
    goNoGoAnalysis?.decision === 'go' && confidence !== undefined
      ? confidence >= 75 ? 'High' : confidence >= 50 ? 'Medium' : 'Low'
      : 'Pending';

  const openData = openKey ? summary[openKey] : null;

  return (
    <>
      <Card className={cn('w-full border border-border/40 shadow-sm', className)}>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {goNoGoAnalysis?.decision === 'go' ? (
                <CheckCircle className="h-5 w-5 text-success" />
              ) : goNoGoAnalysis?.decision === 'no-go' ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              )}
              <span className="text-base font-semibold text-foreground">
                {goNoGoAnalysis?.decision === 'go'
                  ? 'Strong match'
                  : goNoGoAnalysis?.decision === 'no-go'
                    ? 'Potential blockers'
                    : 'Checking fit'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Confidence</span>
              <div className="px-3 py-1 rounded-full border border-border/60 text-sm font-semibold text-foreground bg-background">
                {confidence !== undefined ? `${Math.round(confidence)}% (${tier})` : '—'}
              </div>
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

      {/* Slide-in panel for detailed requirements */}
      <Sheet open={!!openKey} onOpenChange={(open) => !open && setOpenKey(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          {openData && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {openData.icon}
                  {openData.label}
                </SheetTitle>
                <SheetDescription>
                  {openData.met} of {openData.total} requirements met ({openData.total > 0 ? Math.round((openData.met / openData.total) * 100) : 0}%)
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-2">
                {openData.items && openData.items.length > 0 ? (
                  openData.items.map((item, idx) => (
                    <div key={`${item.requirement || item.label}-${idx}`} className={`${idx > 0 ? 'border-t border-border/40' : ''}`}>
                      <RequirementItem
                        label={item.requirement || item.label}
                        type={item.demonstrated ? 'met' : 'unmet'}
                        evidence={item.evidence}
                      />
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    No requirements to display
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
