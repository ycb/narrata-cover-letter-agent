import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CompetencyCoverage } from "@/types/dashboard";
import { 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  Plus,
  TrendingUp,
  Target
} from "lucide-react";
import { Link } from "react-router-dom";

interface CoverageMapProps {
  coverage: CompetencyCoverage[];
  overallCoverage: number;
  priorityGaps: string[];
}

export function CoverageMap({ coverage, overallCoverage, priorityGaps }: CoverageMapProps) {
  const getGapIcon = (gap: 'low' | 'medium' | 'high') => {
    switch (gap) {
      case 'low':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'high':
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getGapColor = (gap: 'low' | 'medium' | 'high') => {
    switch (gap) {
      case 'low':
        return 'text-success';
      case 'medium':
        return 'text-warning';
      case 'high':
        return 'text-destructive';
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

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            PM Competency Coverage
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {overallCoverage}% Overall
            </Badge>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Coverage</span>
              <span className="text-sm text-muted-foreground">{overallCoverage}%</span>
            </div>
            <Progress value={overallCoverage} className="h-2" />
          </div>

          {/* Competency Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coverage.map((item) => (
              <div
                key={item.competency.id}
                className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                  item.gap === 'high' 
                    ? 'border-destructive/20 bg-destructive/5' 
                    : item.gap === 'medium'
                    ? 'border-warning/20 bg-warning/5'
                    : 'border-success/20 bg-success/5'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">
                      {item.competency.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {item.competency.description}
                    </p>
                  </div>
                  {getGapIcon(item.gap)}
                </div>

                <div className="space-y-2">
                  {/* Coverage Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">Coverage</span>
                      <span className="text-xs font-medium">{item.coverage}%</span>
                    </div>
                    <Progress value={item.coverage} className="h-1.5" />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {item.stories.length} stories
                    </span>
                    <span className="text-muted-foreground">
                      Avg: {item.averageStrength}/100
                    </span>
                  </div>

                  {/* Gap Status */}
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={item.gap === 'high' ? 'destructive' : item.gap === 'medium' ? 'secondary' : 'default'}
                      className="text-xs"
                    >
                      {getGapText(item.gap)}
                    </Badge>
                    
                    {item.gap !== 'low' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        asChild
                      >
                        <Link to={`/work-history?tab=stories&competency=${item.competency.id}`}>
                          <Plus className="h-3 w-3 mr-1" />
                          Add Story
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Priority Actions */}
          {priorityGaps.length > 0 && (
            <div className="mt-6 p-4 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="font-medium text-sm">Priority Actions</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Focus on these competencies to improve your overall coverage:
              </p>
              <div className="flex flex-wrap gap-2">
                {priorityGaps.map((gapId) => {
                  const competency = coverage.find(c => c.competency.id === gapId);
                  return (
                    <Button
                      key={gapId}
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs"
                      asChild
                    >
                      <Link to={`/work-history?tab=stories&competency=${gapId}`}>
                        <Plus className="h-3 w-3 mr-1" />
                        {competency?.competency.name}
                      </Link>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
