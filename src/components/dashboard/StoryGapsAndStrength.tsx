import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  StoryStrength as StoryStrengthType, 
  ResumeGapInsight,
  CompetencyCoverage 
} from "@/types/dashboard";
import { 
  Target, 
  TrendingUp, 
  Edit,
  Plus,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

interface StoryGapsAndStrengthProps {
  storyStrength: StoryStrengthType;
  gaps: ResumeGapInsight[];
  coverage: CompetencyCoverage[];
}

export function StoryGapsAndStrength({ storyStrength, gaps, coverage }: StoryGapsAndStrengthProps) {
  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'Strong';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Needs Work';
    return 'Critical';
  };

  const getPriorityIcon = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'medium':
        return <TrendingUp className="h-4 w-4 text-warning" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  // Find the highest priority gap for the main CTA
  const topPriorityGap = gaps.find(g => g.priority === 'high') || gaps[0];

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" />
          Story Gaps & Strength
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Story Strength - Simplified */}
          <div className="text-center p-4 bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg border border-accent/20">
            <div className="text-3xl font-bold text-accent mb-2">
              {storyStrength.overall}
            </div>
            <div className="text-lg text-muted-foreground mb-3">
              Overall Story Strength
            </div>
            <Progress value={storyStrength.overall} className="h-2 max-w-xs mx-auto mb-3" />
            <div className="text-sm text-muted-foreground">
              Last assessed: {new Date(storyStrength.lastAssessed).toLocaleDateString()}
            </div>
          </div>

          {/* Top Priority Gap - Main CTA */}
          {topPriorityGap && (
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {getPriorityIcon(topPriorityGap.priority)}
                <h4 className="font-medium text-lg">
                  Improve {topPriorityGap.competency.name}
                </h4>
                <Badge variant="secondary">
                  Missing {topPriorityGap.missingStories} story{topPriorityGap.missingStories !== 1 ? 's' : ''}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {topPriorityGap.competency.description}
              </p>
              <div className="space-y-2 mb-4">
                {topPriorityGap.suggestedActions.slice(0, 2).map((action, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                    <span className="text-muted-foreground">{action}</span>
                  </div>
                ))}
              </div>
              <Button className="w-full" asChild>
                <Link to={`/work-history?tab=stories&competency=${topPriorityGap.competency.id}`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start Now
                </Link>
              </Button>
            </div>
          )}

          {/* Quick Gap Summary */}
          {gaps.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Other Areas to Improve
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gaps.slice(0, 4).map((gap) => (
                  <div key={gap.competency.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{gap.competency.name}</span>
                      <Badge variant="outline" size="sm">
                        {gap.missingStories} missing
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {gap.suggestedActions[0]}
                    </p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={`/work-history?tab=stories&competency=${gap.competency.id}`}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Story
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Story Strength Breakdown - Collapsible */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Strength Breakdown
            </h4>
            <div className="space-y-2">
              {Object.entries(storyStrength.breakdown).map(([key, score]) => {
                const max = key === 'outcomes' ? 30 : key === 'context' ? 25 : key === 'technical' ? 20 : key === 'influence' ? 15 : 10;
                const percentage = (score / max) * 100;
                const label = key === 'outcomes' ? 'Outcomes & Impact' :
                             key === 'context' ? 'Context & Scope' :
                             key === 'technical' ? 'Technical Depth' :
                             key === 'influence' ? 'Influence & Leadership' :
                             'Innovation Bonus';
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${getScoreColor(score, max)}`}>
                        {score}/{max}
                      </span>
                      <Badge variant="outline" size="sm">
                        {getScoreLabel(score, max)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/work-history?tab=stories&filter=low-strength">
                <Edit className="h-4 w-4 mr-2" />
                Improve Stories
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
      </CardContent>
    </Card>
  );
}
