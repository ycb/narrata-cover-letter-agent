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
  RefreshCw
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
  onGenerate
}: UnifiedGapCardProps) {
  // Origin tag configuration
  const originConfig = {
    ai: { icon: Sparkles, label: 'AI', className: 'bg-blue-100 text-blue-800 border-blue-200' },
    human: { icon: User, label: 'Human', className: 'bg-purple-100 text-purple-800 border-purple-200' },
    library: { icon: FileText, label: 'Library', className: 'bg-green-100 text-green-800 border-green-200' }
  };

  // Status-based styling
  const statusConfig = {
    gap: {
      borderClass: 'border-warning bg-warning/5',
      icon: AlertTriangle,
      iconClass: 'text-warning',
      titleClass: 'text-warning-foreground',
      showActions: true
    },
    met: {
      borderClass: 'border-success bg-success/5',
      icon: CheckCircle,
      iconClass: 'text-success',
      titleClass: 'text-foreground',
      showActions: false
    }
  };

  const config = statusConfig[status];
  const originInfo = originConfig[origin];
  const OriginIcon = originInfo.icon;
  const StatusIcon = config.icon;

  return (
    <Card className={`h-full ${config.borderClass}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${config.iconClass}`} />
            <CardTitle className={`text-sm font-semibold ${config.titleClass}`}>
              {status === 'gap' ? 'Issue' : 'Matches Job Req'}
            </CardTitle>
          </div>
          
          {/* Right-aligned Chips */}
          <div className="flex items-center gap-2">
            {status === 'gap' && severity && (
              <Badge 
                className={
                  severity === 'high' ? 'bg-destructive text-destructive-foreground' : 
                  severity === 'medium' ? 'bg-warning text-warning-foreground' : 
                  'bg-muted text-muted-foreground'
                }
              >
                {severity} priority
              </Badge>
            )}
            
            {/* Origin Tag */}
            <Badge variant="outline" className={`text-xs px-2 py-1 ${originInfo.className}`}>
              <OriginIcon className="h-3 w-3 mr-1" />
              {originInfo.label}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Body Content */}
        <div className="space-y-2">
          {status === 'gap' ? (
            <>
              {issue && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Issue: </span>
                  <span className="text-sm text-muted-foreground">{issue}</span>
                </div>
              )}
              {suggestion && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Suggestion: </span>
                  <span className="text-sm text-muted-foreground">{suggestion}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {addresses && addresses.length > 0 && (
                <div className="space-y-1">
                  {addresses.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-3 w-3 text-success" />
                      <span className="text-muted-foreground">{req}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        {config.showActions && (
          <div className="flex justify-end pt-2">
            {onGenerate && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={onGenerate}
                className="px-6"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Generate
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
