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
  Plus
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

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">
          Story Gaps & Strength
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {/* Overall Story Strength - Simplified */}
          <div className="text-center p-6 bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg border border-accent/20">
            <div className="text-4xl font-bold text-accent mb-3">
              {storyStrength.overall}
            </div>
            <div className="text-xl text-muted-foreground mb-2">
              Overall Story Strength
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Based on 5 key story elements
            </div>
            <Progress value={storyStrength.overall} className="h-3 max-w-xs mx-auto mb-4" />
            <div className="text-sm text-muted-foreground">
              Last assessed: {new Date(storyStrength.lastAssessed).toLocaleDateString()}
            </div>
          </div>

          {/* Suggested Actions - Consolidated */}
          {gaps.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
                Suggested Actions
              </h4>
              <div className="space-y-4">
                {/* Show only Influence & Leadership card */}
                {gaps.filter(gap => gap.competency.name === 'Influence & Leadership').slice(0, 1).map((gap, index) => (
                  <div key={gap.competency.id} className="p-4 border rounded-lg">
                    <div className="mb-3">
                      <span className="font-medium text-base">{gap.competency.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Strengthen your <strong>Influence and Leadership</strong> skills
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      for <strong>PM</strong> at <strong>Startup XYZ</strong>
                    </p>
                    <Button variant="secondary" size="sm" asChild>
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

          {/* Story Strength Breakdown - Simplified Grid */}
          <div className="space-y-4">
            <h4 className="text-base font-semibold text-muted-foreground uppercase tracking-wide">
              Strength Breakdown
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {storyStrength?.breakdown ? Object.entries(storyStrength.breakdown).map(([key, score]) => {
                const max = key === 'outcomes' ? 30 : key === 'context' ? 25 : key === 'technical' ? 20 : key === 'influence' ? 15 : 10;
                const percentage = (score / max) * 100;
                const label = key === 'outcomes' ? 'Outcomes & Impact' :
                             key === 'context' ? 'Context & Scope' :
                             key === 'technical' ? 'Technical Depth' :
                             key === 'influence' ? 'Influence & Leadership' :
                             'Innovation Bonus';
                
                return (
                  <div key={key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">{label}</span>
                    <Badge variant="secondary">
                      {getScoreLabel(score, max)}
                    </Badge>
                  </div>
                );
              }) : (
                <div className="col-span-2 text-center text-muted-foreground py-8">
                  No story strength data available yet. Complete your onboarding to see your story analysis.
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
