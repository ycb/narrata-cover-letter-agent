import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CompetencyCoverage } from "@/types/dashboard";
import { 
  Target, 
  TrendingUp,
  Plus,
  CheckCircle, 
  AlertCircle, 
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";

interface CoverageMapSimplifiedProps {
  coverage: CompetencyCoverage[];
  overallCoverage: number;
  priorityGaps: string[];
}

export function CoverageMapSimplified({ coverage, overallCoverage, priorityGaps }: CoverageMapSimplifiedProps) {
  const getGapIcon = (gap: 'low' | 'medium' | 'high') => {
    switch (gap) {
      case 'low':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'high':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getGapText = (gap: 'low' | 'medium' | 'high') => {
    switch (gap) {
      case 'low':
        return 'Strong';
      case 'medium':
        return 'Needs Attention';
      case 'high':
        return 'Critical Gap';
    }
  };

  // Group competencies by gap level
  const strongCompetencies = coverage.filter(c => c.gap === 'low');
  const needsAttention = coverage.filter(c => c.gap === 'medium');
  const criticalGaps = coverage.filter(c => c.gap === 'high');

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-4 text-accent" />
            PM Competency Coverage
          </CardTitle>
          <Badge variant="secondary" className="text-sm">
            {overallCoverage}% Overall
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Progress - Simplified */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Coverage</span>
              <span className="text-sm text-muted-foreground">{overallCoverage}%</span>
            </div>
            <Progress value={overallCoverage} className="h-2" />
          </div>

          {/* Critical Gaps - Most Important */}
          {criticalGaps.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-destructive uppercase tracking-wide">
                Critical Gaps
              </h4>
              {criticalGaps.map((item) => (
                <div key={item.competency.id} className="p-3 border-2 border-destructive/20 bg-destructive/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">{item.competency.name}</h5>
                    <Badge variant="destructive" size="sm">
                      {item.coverage}% coverage
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Missing {item.stories.length < 3 ? 'strong stories' : 'key examples'}
                  </p>
                  <Button variant="destructive" size="sm" className="w-full" asChild>
                    <Link to={`/work-history?tab=stories&competency=${item.competency.id}`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Story Now
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-warning uppercase tracking-wide">
                Needs Attention
              </h4>
              {needsAttention.map((item) => (
                <div key={item.competency.id} className="p-3 border border-warning/20 bg-warning/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-sm">{item.competency.name}</h5>
                    <Badge variant="secondary" size="sm">
                      {item.coverage}% coverage
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Could use {item.stories.length < 2 ? 'more examples' : 'stronger stories'}
                  </p>
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link to={`/work-history?tab=stories&competency=${item.competency.id}`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Story
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Strong Areas - Collapsed by Default */}
          {strongCompetencies.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-success uppercase tracking-wide">
                Strong Areas
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {strongCompetencies.map((item) => (
                  <div key={item.competency.id} className="p-2 border border-success/20 bg-success/5 rounded-lg text-center">
                    <div className="text-xs font-medium mb-1">{item.competency.name}</div>
                    <div className="text-xs text-muted-foreground">{item.coverage}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Summary */}
          <div className="pt-3 border-t border-border">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-bold text-destructive">
                  {criticalGaps.length}
                </div>
                <div className="text-xs text-muted-foreground">Critical</div>
              </div>
              <div>
                <div className="text-lg font-bold text-warning">
                  {needsAttention.length}
                </div>
                <div className="text-xs text-muted-foreground">Attention</div>
              </div>
              <div>
                <div className="text-lg font-bold text-success">
                  {strongCompetencies.length}
                </div>
                <div className="text-xs text-muted-foreground">Strong</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
