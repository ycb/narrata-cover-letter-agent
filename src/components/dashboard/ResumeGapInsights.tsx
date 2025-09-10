import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResumeGapInsight } from "@/types/dashboard";
import { 
  AlertTriangle, 
  Plus, 
  Target,
  TrendingUp,
  FileText,
  Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";

interface ResumeGapInsightsProps {
  gaps: ResumeGapInsight[];
}

export function ResumeGapInsights({ gaps }: ResumeGapInsightsProps) {
  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'text-destructive';
      case 'medium':
        return 'text-warning';
      case 'low':
        return 'text-success';
    }
  };

  const getPriorityVariant = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'default';
    }
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4" />;
      case 'low':
        return <Target className="h-4 w-4" />;
    }
  };

  if (gaps.length === 0) {
    return (
      <Card className="shadow-medium">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-success" />
            Resume Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Great Coverage!</h3>
            <p className="text-muted-foreground">
              Your stories cover all key PM competencies well.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          Resume Gap Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {gaps.map((gap) => (
            <div
              key={gap.competency.id}
              className={`p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                gap.priority === 'high' 
                  ? 'border-destructive/20 bg-destructive/5' 
                  : gap.priority === 'medium'
                  ? 'border-warning/20 bg-warning/5'
                  : 'border-success/20 bg-success/5'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">
                      {gap.competency.name}
                    </h4>
                    <Badge variant={getPriorityVariant(gap.priority)} size="sm">
                      {gap.priority === 'high' ? 'Critical' : gap.priority === 'medium' ? 'Important' : 'Minor'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {gap.competency.description}
                  </p>
                </div>
                {getPriorityIcon(gap.priority)}
              </div>

              <div className="space-y-3">
                {/* Gap Summary */}
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Missing {gap.missingStories} story{gap.missingStories !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Suggested Actions */}
                <div className="space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Suggested Actions
                  </h5>
                  <div className="space-y-1">
                    {gap.suggestedActions.map((action, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                        <span className="text-muted-foreground">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    asChild
                  >
                    <Link to={`/work-history?tab=stories&competency=${gap.competency.id}`}>
                      <Plus className="h-3 w-3 mr-1" />
                      Add Story
                    </Link>
                  </Button>
                  
                  {gap.priority === 'high' && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 px-3 text-xs"
                      asChild
                    >
                      <Link to="/work-history?tab=stories&competency=strategy">
                        <Briefcase className="h-3 w-3 mr-1" />
                        Start Now
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Summary Actions */}
          <div className="mt-6 p-4 bg-accent/5 border border-accent/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-accent" />
              <span className="font-medium text-sm">Quick Start</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Focus on high-priority gaps first to improve your overall coverage:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to="/work-history?tab=stories">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Story
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to="/assessment">
                  <Target className="h-4 w-4 mr-2" />
                  View Assessment
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Import CheckCircle for the success state
import { CheckCircle } from "lucide-react";
