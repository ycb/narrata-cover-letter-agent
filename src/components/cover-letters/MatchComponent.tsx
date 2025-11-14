import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { CoverLetterMatchMetric, DifferentiatorInsight } from '@/types/coverLetters';

interface MatchComponentProps {
  metrics?: CoverLetterMatchMetric[] | null;
  differentiators?: DifferentiatorInsight[];
  className?: string;
  isLoading?: boolean;
}

const strengthStyles: Record<string, string> = {
  strong: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  average: 'bg-amber-50 text-amber-700 border-amber-200',
  weak: 'bg-rose-50 text-rose-700 border-rose-200',
};

const scoreStyle = (score: number) => {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (score >= 60) return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-rose-50 text-rose-700 border-rose-200';
};

const RequirementProgress = ({
  met,
  total,
}: {
  met: number;
  total: number;
}) => {
  const ratio = total > 0 ? Math.min(met / total, 1) : 0;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Met</span>
        <span>
          {met}/{total}
        </span>
      </div>
      <div className="mt-1 h-2 w-full rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            ratio >= 0.66
              ? 'bg-emerald-500'
              : ratio >= 0.33
              ? 'bg-amber-500'
              : 'bg-rose-500',
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
};

const MetricTooltip = ({
  metric,
  differentiators,
  children,
}: {
  metric: CoverLetterMatchMetric | null;
  differentiators?: DifferentiatorInsight[];
  children: React.ReactNode;
}) => {
  if (!metric) {
    return <>{children}</>;
  }

  const differentiatorNotes =
    metric.differentiatorHighlights?.length && differentiators?.length
      ? differentiators.filter(({ requirementId }) =>
          metric.differentiatorHighlights?.includes(requirementId),
        )
      : [];

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-2 text-sm">
        {metric.summary && <p className="font-medium">{metric.summary}</p>}
        {metric.tooltip && <p className="text-muted-foreground">{metric.tooltip}</p>}
        {!!differentiatorNotes.length && (
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              Differentiator Focus
            </p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
              {differentiatorNotes.map(insight => (
                <li key={insight.requirementId}>
                  <span className="font-medium capitalize">{insight.status}:</span>{' '}
                  {insight.summary ?? insight.description}
                </li>
              ))}
            </ul>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
};

export const MatchComponent = ({
  metrics,
  differentiators,
  className,
  isLoading,
}: MatchComponentProps) => {
  const metricMap = new Map<string, CoverLetterMatchMetric>();
  metrics?.forEach(metric => metricMap.set(metric.key, metric));

  const renderStrengthMetric = (metric: CoverLetterMatchMetric | null, label: string) => {
    const strength =
      metric && metric.type === 'strength' ? metric.strength : ('weak' as 'weak');
    return (
      <MetricTooltip metric={metric} differentiators={differentiators}>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <Badge
            variant="outline"
            className={cn(
              'w-fit px-3 py-1 text-xs font-semibold uppercase',
              strengthStyles[strength],
            )}
          >
            {strength}
          </Badge>
        </div>
      </MetricTooltip>
    );
  };

  const renderScoreMetric = (metric: CoverLetterMatchMetric | null, label: string) => {
    const value = metric && metric.type === 'score' ? Math.round(metric.value) : 0;
    return (
      <MetricTooltip metric={metric} differentiators={differentiators}>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <Badge
            variant="outline"
            className={cn('w-fit px-3 py-1 text-xs font-semibold', scoreStyle(value))}
          >
            {value}
            {label === 'ATS' ? '%' : ''}
          </Badge>
        </div>
      </MetricTooltip>
    );
  };

  const renderRequirementMetric = (
    metric: CoverLetterMatchMetric | null,
    label: string,
  ) => {
    const met = metric && metric.type === 'requirement' ? metric.met : 0;
    const total = metric && metric.type === 'requirement' ? metric.total : 0;

    return (
      <MetricTooltip metric={metric} differentiators={differentiators}>
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <RequirementProgress met={met} total={total} />
        </div>
      </MetricTooltip>
    );
  };

  if (isLoading) {
    return (
      <Card className={cn('border-dashed border-muted-foreground/30', className)}>
        <CardContent className="flex h-28 items-center justify-center text-sm text-muted-foreground">
          Generating match insights…
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.length === 0) {
    return (
      <Card className={cn('border-dashed border-muted-foreground/30', className)}>
        <CardContent className="flex h-28 items-center justify-center text-sm text-muted-foreground">
          Match insights will appear here after you generate your draft.
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn('border-muted-foreground/20 shadow-sm', className)}>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {renderStrengthMetric(metricMap.get('goals') ?? null, 'Match with Goals')}
          {renderStrengthMetric(metricMap.get('experience') ?? null, 'Match with Experience')}
          {renderScoreMetric(metricMap.get('rating') ?? null, 'Cover Letter Rating')}
          {renderScoreMetric(metricMap.get('ats') ?? null, 'ATS')}
          {renderRequirementMetric(metricMap.get('coreRequirements') ?? null, 'Core Requirements')}
          {renderRequirementMetric(
            metricMap.get('preferredRequirements') ?? null,
            'Preferred Requirements',
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};
