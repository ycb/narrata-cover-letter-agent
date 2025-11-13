import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CheckCircle,
  Edit3,
  Sparkles,
  FileText,
  User,
} from 'lucide-react';

export interface UnifiedGapCardProps {
  status: 'gap' | 'met';
  title: string;
  issue?: string;
  suggestion?: string;
  addresses?: string[];
  origin: 'ai' | 'human' | 'library';
  paragraphId: string;
  severity?: 'low' | 'medium' | 'high';
  onEdit?: () => void;
  onGenerate?: () => void;
}

const originConfig = {
  ai: { icon: Sparkles, label: 'AI', className: 'bg-blue-100 text-blue-800 border-blue-200' },
  human: { icon: User, label: 'Human', className: 'bg-purple-100 text-purple-800 border-purple-200' },
  library: { icon: FileText, label: 'Library', className: 'bg-green-100 text-green-800 border-green-200' },
};

const severityConfig = {
  high: { label: 'high priority', className: 'bg-rose-100 text-rose-700 border-rose-200' },
  medium: { label: 'medium priority', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  low: { label: 'low priority', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const statusConfig = {
  gap: {
    borderClass: 'border-warning bg-warning/5',
    icon: AlertTriangle,
    iconClass: 'text-warning',
    title: 'Issue',
    subLabel: 'Needs Action',
    showActions: true,
  },
  met: {
    borderClass: 'border-success bg-success/5',
    icon: CheckCircle,
    iconClass: 'text-success',
    title: 'Requirement Met',
    subLabel: 'Completed',
    showActions: false,
  },
};

const formatParagraphId = (paragraphId: string) => paragraphId.replace(/[-_]/g, ' ');

export function UnifiedGapCard({
  status,
  title,
  issue,
  suggestion,
  addresses,
  origin,
  paragraphId,
  severity = 'medium',
  onEdit,
  onGenerate,
}: UnifiedGapCardProps) {
  const config = statusConfig[status];
  const originInfo = originConfig[origin];
  const severityInfo = severityConfig[severity];
  const StatusIcon = config.icon;
  const OriginIcon = originInfo.icon;

  return (
    <Card className={`h-full ${config.borderClass}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${config.iconClass}`} />
            <div className="flex flex-col">
              <CardTitle className="text-sm font-semibold">{config.title}</CardTitle>
              <span className="text-xs text-muted-foreground">{config.subLabel}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`gap-1 ${severityInfo.className}`}>
              {severityInfo.label}
            </Badge>
            <Badge variant="outline" className={`gap-1 ${originInfo.className}`}>
              <OriginIcon className="h-3 w-3" />
              {originInfo.label}
            </Badge>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{title}</span>
          <span>{formatParagraphId(paragraphId)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-2 text-sm text-muted-foreground">
          {status === 'gap' ? (
            <>
              {issue && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Issue:</span>
                  <span>{issue}</span>
                </div>
              )}
              {suggestion && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">Suggestion:</span>
                  <span>{suggestion}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {addresses && addresses.length > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-success" />
                  <span>{addresses.join(', ')}</span>
                </div>
              )}
            </>
          )}
        </div>

        {config.showActions && (
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {onEdit && (
              <Button variant="secondary" size="sm" onClick={onEdit} className="gap-2">
                <Edit3 className="h-3 w-3" />
                Edit
              </Button>
            )}
            {onGenerate && (
              <Button variant="secondary" size="sm" onClick={onGenerate} className="gap-2">
                <Sparkles className="h-3 w-3" />
                Generate
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
