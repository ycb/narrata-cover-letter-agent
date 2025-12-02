import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, LayoutTemplate, AlertTriangle, Target, Circle, CheckCircle } from 'lucide-react';
import { GapSummary } from '@/services/gapDetectionService';
import { cn } from '@/lib/utils';

interface GapSummaryWidgetProps {
  gapSummary: GapSummary | null;
  isLoading?: boolean;
  onContentTypeClick?: (contentType: 'workHistory' | 'savedSections') => void;
  onSeverityClick?: (severity: 'high' | 'medium' | 'low') => void;
}

const CONTENT_TYPE_CONFIG = {
  workHistory: {
    label: 'Work History',
    icon: Users,
    color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    countKey: 'roleDescriptions' as const,
  },
  savedSections: {
    label: 'Saved Sections',
    icon: LayoutTemplate,
    color: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
    countKey: 'savedSections' as const,
  },
};

const SEVERITY_CONFIG = {
  high: {
    label: 'High',
    icon: AlertTriangle,
    color: 'bg-destructive/20 text-destructive border-destructive/30',
  },
  medium: {
    label: 'Medium',
    icon: Target,
    color: 'bg-warning/20 text-warning border-warning/30',
  },
  low: {
    label: 'Low',
    icon: Circle,
    color: 'bg-muted/20 text-muted-foreground border-muted',
  },
};

export function GapSummaryWidget({ 
  gapSummary, 
  isLoading,
  onContentTypeClick,
  onSeverityClick 
}: GapSummaryWidgetProps) {
  if (isLoading) {
    return (
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Content Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading gap summary...</div>
        </CardContent>
      </Card>
    );
  }

  if (!gapSummary || gapSummary.total === 0) {
    return (
      <Card className="shadow-soft border-success/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-success" />
            Content Quality
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-success/10 rounded-lg border border-success/30">
            <CheckCircle className="w-6 h-6 text-success flex-shrink-0" />
            <div className="flex-1">
              <div className="font-semibold text-success">All content looks great!</div>
              <div className="text-sm text-muted-foreground mt-1">
                You've addressed all identified gaps in your content.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate counts for Work History (role descriptions + role metrics + stories)
  const workHistoryCount = gapSummary.byContentType.roleDescriptions + 
                          gapSummary.byContentType.outcomeMetrics + 
                          gapSummary.byContentType.stories;

  return (
    <Card className="shadow-soft border-warning/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-warning" />
          Content Quality
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Gaps */}
        <div className="text-center">
          <div className="text-3xl font-bold text-foreground">{gapSummary.total}</div>
          <div className="text-sm text-muted-foreground">Total Gaps</div>
        </div>

        {/* Gaps by Content Type */}
        <div className="space-y-3">
          <div className="text-sm font-semibold">Gaps by Content Type:</div>
          <div className="flex flex-wrap gap-2">
            {workHistoryCount > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5",
                  CONTENT_TYPE_CONFIG.workHistory.color
                )}
                onClick={() => onContentTypeClick?.('workHistory')}
              >
                <Users className="w-3 h-3 mr-1.5" />
                Work History: {workHistoryCount}
              </Badge>
            )}
            {gapSummary.byContentType.savedSections > 0 && (
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5",
                  CONTENT_TYPE_CONFIG.savedSections.color
                )}
                onClick={() => onContentTypeClick?.('savedSections')}
              >
                <LayoutTemplate className="w-3 h-3 mr-1.5" />
                Saved Sections: {gapSummary.byContentType.savedSections}
              </Badge>
            )}
          </div>
        </div>

        {/* Gaps by Severity */}
        <div className="space-y-3">
          <div className="text-sm font-semibold">Gaps by Severity:</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SEVERITY_CONFIG).map(([severity, config]) => {
              const count = gapSummary.bySeverity[severity as keyof typeof gapSummary.bySeverity];
              if (count === 0) return null;
              
              const Icon = config.icon;
              return (
                <Badge
                  key={severity}
                  variant="outline"
                  className={cn(
                    "cursor-pointer hover:opacity-80 transition-opacity px-3 py-1.5",
                    config.color
                  )}
                  onClick={() => onSeverityClick?.(severity as 'high' | 'medium' | 'low')}
                >
                  <Icon className="w-3 h-3 mr-1.5" />
                  {config.label}: {count}
                </Badge>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
