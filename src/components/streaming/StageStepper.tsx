import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

type StageStatus = 'pending' | 'running' | 'complete' | 'error';

export interface StageDef {
  key: string;
  label: string;
}

export interface StageStepperProps {
  stages: StageDef[];
  statusByKey: Record<string, StageStatus>;
  percent?: number;
  className?: string;
}

export function StageStepper({ stages, statusByKey, percent = 0, className }: StageStepperProps) {
  const completed = stages.filter(s => statusByKey[s.key] === 'complete').length;
  const total = stages.length;
  const pct = percent || Math.round((completed / total) * 100);

  return (
    <div className={className}>
      <div className="flex justify-between mb-2 text-sm">
        <span>Progress</span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} />
      <div className="flex gap-2 mt-3 flex-wrap">
        {stages.map((s) => {
          const st = statusByKey[s.key] || 'pending';
          const label = s.label;
          const text =
            st === 'complete' ? `${label} ✓` :
            st === 'running' ? `${label} …` :
            st === 'error' ? `${label} !` : label;
          return (
            <Badge key={s.key} variant={st === 'complete' ? 'default' : st === 'error' ? 'destructive' : 'secondary'}>
              {text}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}


