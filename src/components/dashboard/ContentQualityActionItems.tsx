import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Target,
  Zap,
  ChevronRight,
  Circle
} from 'lucide-react';
import { GapSummary } from '@/services/gapDetectionService';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ContentQualityActionItemsProps {
  gapSummary: GapSummary | null;
  isLoading?: boolean;
  onFixGaps?: (severity: string, contentType?: string) => void;
  onViewDetails?: (severity: string) => void;
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  stories: 'Stories',
  savedSections: 'Saved Sections',
  roleDescriptions: 'Role Descriptions',
  roleMetrics: 'Role Metrics',
  coverLetterSections: 'Cover Letter Sections',
};

const SEVERITY_CONFIG = {
  high: {
    label: 'High Priority',
    icon: AlertTriangle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
    badgeVariant: 'destructive' as const,
  },
  medium: {
    label: 'Medium Priority',
    icon: Target,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
    badgeVariant: 'secondary' as const,
  },
  low: {
    label: 'Low Priority',
    icon: Circle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    borderColor: 'border-muted',
    badgeVariant: 'outline' as const,
  },
};

const SEVERITY_ORDER: ('high' | 'medium' | 'low')[] = ['high', 'medium', 'low'];

export function ContentQualityActionItems({ 
  gapSummary, 
  isLoading, 
  onFixGaps,
  onViewDetails 
}: ContentQualityActionItemsProps) {
  const navigate = useNavigate();

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
          <div className="text-sm text-muted-foreground">Analyzing content quality...</div>
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

  // Calculate completion percentage (inverse of gaps)
  // For now, we'll use a simple calculation - can be enhanced with total content count
  const completionPercentage = Math.max(0, Math.min(100, 100 - (gapSummary.total * 5))); // Rough estimate

  // Build action items by severity
  const actionItems = SEVERITY_ORDER.map((severity) => {
    const severityData = gapSummary.bySeverityAndType[severity];
    const totalForSeverity = gapSummary.bySeverity[severity];
    
    if (totalForSeverity === 0) return null;

    const items = Object.entries(severityData)
      .filter(([_, count]) => count > 0)
      .map(([contentType, count]) => ({
        contentType,
        count,
        label: CONTENT_TYPE_LABELS[contentType] || contentType,
      }));

    return {
      severity,
      config: SEVERITY_CONFIG[severity],
      total: totalForSeverity,
      items,
    };
  }).filter(Boolean);

  const handleFixGaps = (severity: string, contentType?: string) => {
    if (onFixGaps) {
      onFixGaps(severity, contentType);
    } else {
      // Default navigation
      if (contentType === 'stories') {
        navigate('/show-all-stories?filter=gap-detected&severity=' + severity);
      } else if (contentType === 'roleDescriptions' || contentType === 'roleMetrics') {
        navigate('/work-history?filter=gaps&severity=' + severity);
      } else if (contentType === 'savedSections') {
        navigate('/cover-letter-template?filter=gaps&severity=' + severity);
      } else {
        navigate('/dashboard');
      }
    }
  };

  const handleViewDetails = (severity: string) => {
    if (onViewDetails) {
      onViewDetails(severity);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <Card className="shadow-soft border-warning/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-warning" />
            Content Quality
          </CardTitle>
          <Badge variant="destructive" className="text-sm font-semibold">
            {gapSummary.total} {gapSummary.total === 1 ? 'gap' : 'gaps'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Content Quality Score</span>
            <span className="text-muted-foreground">{completionPercentage}% complete</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {/* Action Items by Priority */}
        <div className="space-y-4">
          {actionItems.map((item, index) => {
            const Icon = item.config.icon;
            const totalItems = item.items.length;
            
            return (
              <Card 
                key={item.severity}
                className={cn(
                  "border-2 transition-all hover:shadow-md",
                  item.config.borderColor,
                  item.config.bgColor
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        item.config.bgColor
                      )}>
                        <Icon className={cn("w-4 h-4", item.config.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">
                          {index + 1}. {item.config.label}
                        </CardTitle>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {item.total} {item.total === 1 ? 'item' : 'items'} need attention
                        </div>
                      </div>
                    </div>
                    <Badge variant={item.config.badgeVariant} className="font-semibold">
                      {item.total}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Action Items List */}
                  <div className="space-y-2">
                    {item.items.map((contentItem) => (
                      <div
                        key={contentItem.contentType}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-background/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Circle className="w-2 h-2 fill-current text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {contentItem.label}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {contentItem.count}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFixGaps(item.severity, contentItem.contentType)}
                          className="h-7 text-xs"
                        >
                          Fix
                          <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Quick Action Button */}
                  <Button
                    variant={item.severity === 'high' ? 'destructive' : 'default'}
                    size="sm"
                    className="w-full"
                    onClick={() => handleFixGaps(item.severity)}
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Fix All {item.config.label}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            View All Gaps
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

