import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, X, AlertTriangle, Target, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { GapAnalysis } from './HILProgressPanel';

interface Requirements {
  core: { met: number; total: number };
  preferred: { met: number; total: number };
}

interface GapAnalysisPanelProps {
  gaps: GapAnalysis[];
  requirements: Requirements | null;
  onAddressGap: (gap: GapAnalysis) => void;
}

export function GapAnalysisPanel({
  gaps,
  requirements,
  onAddressGap
}: GapAnalysisPanelProps) {
  // Mock requirements data - in real implementation this would come from JD analysis
  const matchedRequirements = [
    'Previous startup experience',
    '6+ years as PM',
    'Growth specialization',
    'Responsive web dev and mobile apps'
  ];

  const missingRequirements = [
    '1-for ROB SaaS',
    'Tableau and Looker',
    'Fintech experience',
    'SQL and Python'
  ];

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
      case 'content-enhancement': return <AlertTriangle className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Requirements Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Requirements & Best Practices</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Matched Requirements */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-success">Matched Reqs</h4>
            <div className="grid grid-cols-2 gap-2">
              {matchedRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Missing Requirements */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-destructive">Missing Reqs</h4>
            <div className="grid grid-cols-2 gap-2">
              {missingRequirements.map((req, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <X className="h-4 w-4 text-destructive" />
                  <span className="text-muted-foreground">{req}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cover Letter Best Practices */}
          <div>
            <h4 className="text-sm font-medium mb-2">Cover Letter (Basic/Advanced)</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">Mission alignment</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">Customer + product knowledge</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">Brevity and tone</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-muted-foreground">Work samples</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <X className="h-4 w-4 text-destructive" />
                <span className="text-muted-foreground">Culture alignment</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gap Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {gaps.length > 0 ? (
            gaps.map((gap) => (
              <div key={gap.id} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(gap.severity)}>
                      {gap.severity} impact
                    </Badge>
                    <Badge variant="outline">
                      {gap.type.replace('-', ' ')}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddressGap(gap)}
                    className="flex items-center gap-1"
                  >
                    <Target className="h-3 w-3" />
                    Edit
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <h5 className="font-medium text-sm">Issue:</h5>
                    <p className="text-sm text-muted-foreground">{gap.description}</p>
                  </div>
                  <div>
                    <h5 className="font-medium text-sm">Suggestion:</h5>
                    <p className="text-sm text-muted-foreground">{gap.suggestion}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
              <h4 className="text-sm font-medium text-success mb-1">All Gaps Addressed!</h4>
              <p className="text-xs text-muted-foreground">
                Your cover letter is now strong and addresses all identified requirements.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
