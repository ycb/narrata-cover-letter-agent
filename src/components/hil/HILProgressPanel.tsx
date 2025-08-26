import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  TrendingUp, 
  Users, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Zap
} from 'lucide-react';

interface ProgressMetrics {
  // Match with Goals: strong/average/weak
  goalsMatch: 'strong' | 'average' | 'weak';
  // Match with Experience: strong/average/weak  
  experienceMatch: 'strong' | 'average' | 'weak';
  // Cover Letter Rating: strong/average/weak
  coverLetterRating: 'strong' | 'average' | 'weak';
  // ATS score (0-100)
  atsScore: number;
  // Core requirements met (e.g., 4/8)
  coreRequirementsMet: { met: number; total: number };
  // Preferred requirements met (e.g., 3/5)
  preferredRequirementsMet: { met: number; total: number };
}

interface GapAnalysis {
  id: string;
  type: 'core-requirement' | 'preferred-requirement' | 'best-practice' | 'content-enhancement';
  severity: 'high' | 'medium' | 'low';
  description: string;
  impact: string;
  suggestion: string;
  canAddress: boolean;
}

interface HILProgressPanelProps {
  metrics: ProgressMetrics;
  gaps: GapAnalysis[];
  onAddressGap: (gap: GapAnalysis) => void;
  onGenerateContent: () => void;
  onOptimizeATS: () => void;
}

export function HILProgressPanel({
  metrics,
  gaps,
  onAddressGap,
  onGenerateContent,
  onOptimizeATS
}: HILProgressPanelProps) {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'strong': return 'text-success';
      case 'average': return 'text-warning';
      case 'weak': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getRatingIcon = (rating: string) => {
    switch (rating) {
      case 'strong': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'average': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'weak': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <BarChart3 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getGapTypeIcon = (type: string) => {
    switch (type) {
      case 'core-requirement': return <Target className="h-4 w-4" />;
      case 'preferred-requirement': return <TrendingUp className="h-4 w-4" />;
      case 'best-practice': return <CheckCircle className="h-4 w-4" />;
      case 'content-enhancement': return <Sparkles className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          HIL Progress & Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Match Ratings */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Match Assessment</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Goals Match</span>
                <div className="flex items-center gap-2">
                  {getRatingIcon(metrics.goalsMatch)}
                  <Badge variant="outline" className={getRatingColor(metrics.goalsMatch)}>
                    {metrics.goalsMatch}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Experience Match</span>
                <div className="flex items-center gap-2">
                  {getRatingIcon(metrics.experienceMatch)}
                  <Badge variant="outline" className={getRatingColor(metrics.experienceMatch)}>
                    {metrics.experienceMatch}
                  </Badge>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Cover Letter Rating</span>
                <div className="flex items-center gap-2">
                  {getRatingIcon(metrics.coverLetterRating)}
                  <Badge variant="outline" className={getRatingColor(metrics.coverLetterRating)}>
                    {metrics.coverLetterRating}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* ATS & Requirements */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">ATS & Requirements</h4>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">ATS Score</span>
                  <span className="text-sm font-medium">{metrics.atsScore}%</span>
                </div>
                <Progress value={metrics.atsScore} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Core Requirements</span>
                  <span className="text-sm font-medium">
                    {metrics.coreRequirementsMet.met}/{metrics.coreRequirementsMet.total}
                  </span>
                </div>
                <Progress 
                  value={(metrics.coreRequirementsMet.met / metrics.coreRequirementsMet.total) * 100} 
                  className="h-2" 
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Preferred Requirements</span>
                  <span className="text-sm font-medium">
                    {metrics.preferredRequirementsMet.met}/{metrics.preferredRequirementsMet.total}
                  </span>
                </div>
                <Progress 
                  value={(metrics.preferredRequirementsMet.met / metrics.preferredRequirementsMet.total) * 100} 
                  className="h-2" 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onOptimizeATS}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Optimize ATS
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerateContent}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Generate Content
            </Button>
          </div>
        </div>

        {/* Gap Analysis */}
        {gaps.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Identified Gaps</h4>
            <div className="space-y-3">
              {gaps.map((gap) => (
                <div key={gap.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getGapTypeIcon(gap.type)}
                      <Badge className={getSeverityColor(gap.severity)}>
                        {gap.severity} priority
                      </Badge>
                      <Badge variant="outline">
                        {gap.type.replace('-', ' ')}
                      </Badge>
                    </div>
                    {gap.canAddress && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAddressGap(gap)}
                        className="flex items-center gap-1"
                      >
                        <Zap className="h-3 w-3" />
                        Address
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{gap.description}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Impact:</span> {gap.impact}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Suggestion:</span> {gap.suggestion}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Gaps State */}
        {gaps.length === 0 && (
          <div className="border-t pt-4">
            <div className="text-center py-6">
              <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
              <h4 className="text-sm font-medium text-success mb-1">Excellent Match!</h4>
              <p className="text-xs text-muted-foreground">
                No significant gaps identified. Your cover letter is well-aligned with the job requirements.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
