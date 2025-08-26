import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StoryStrength as StoryStrengthType } from "@/types/dashboard";
import { 
  TrendingUp, 
  Target, 
  Lightbulb,
  BarChart3,
  Users,
  Zap,
  Edit,
  CheckCircle
} from "lucide-react";
import { Link } from "react-router-dom";

interface StoryStrengthProps {
  storyStrength: StoryStrengthType;
}

export function StoryStrength({ storyStrength }: StoryStrengthProps) {
  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreVariant = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  const getScoreLabel = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'Strong';
    if (percentage >= 60) return 'Good';
    if (percentage >= 40) return 'Needs Work';
    return 'Critical';
  };

  const getScoreIcon = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return <CheckCircle className="h-4 w-4" />;
    if (percentage >= 60) return <TrendingUp className="h-4 w-4" />;
    return <Edit className="h-4 w-4" />;
  };

  const scoreCategories = [
    {
      key: 'outcomes' as keyof typeof storyStrength.breakdown,
      label: 'Outcomes & Impact',
      description: 'Quantified results and business impact',
      max: 30,
      icon: Target,
      color: 'text-blue-600'
    },
    {
      key: 'context' as keyof typeof storyStrength.breakdown,
      label: 'Context & Scope',
      description: 'Role clarity, project scale, team size',
      max: 25,
      icon: BarChart3,
      color: 'text-green-600'
    },
    {
      key: 'technical' as keyof typeof storyStrength.breakdown,
      label: 'Technical Depth',
      description: 'Methodologies, tools, complexity',
      max: 20,
      icon: Zap,
      color: 'text-purple-600'
    },
    {
      key: 'influence' as keyof typeof storyStrength.breakdown,
      label: 'Influence & Leadership',
      description: 'Cross-functional impact, team management',
      max: 15,
      icon: Users,
      color: 'text-orange-600'
    },
    {
      key: 'innovation' as keyof typeof storyStrength.breakdown,
      label: 'Innovation Bonus',
      description: 'Novel approaches and creative solutions',
      max: 10,
      icon: Lightbulb,
      color: 'text-yellow-600'
    }
  ];

  return (
    <Card className="shadow-medium">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent" />
            Story Strength Analysis
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {storyStrength.overall}/100
            </Badge>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Overall Score */}
          <div className="text-center p-6 bg-gradient-to-r from-accent/10 to-accent/5 rounded-lg border border-accent/20">
            <div className="text-4xl font-bold text-accent mb-2">
              {storyStrength.overall}
            </div>
            <div className="text-lg text-muted-foreground mb-4">
              Overall Story Strength
            </div>
            <Progress value={storyStrength.overall} className="h-3 max-w-xs mx-auto" />
            <div className="mt-3 text-sm text-muted-foreground">
              Last assessed: {new Date(storyStrength.lastAssessed).toLocaleDateString()}
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Score Breakdown
            </h4>
            {scoreCategories.map((category) => {
              const score = storyStrength.breakdown[category.key];
              const percentage = (score / category.max) * 100;
              const IconComponent = category.icon;
              
              return (
                <div key={category.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`h-4 w-4 ${category.color}`} />
                      <span className="text-sm font-medium">{category.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${getScoreColor(score, category.max)}`}>
                        {score}/{category.max}
                      </span>
                      <Badge variant={getScoreVariant(score, category.max)} size="sm">
                        {getScoreLabel(score, category.max)}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          {storyStrength.recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Improvement Recommendations
              </h4>
              <div className="space-y-2">
                {storyStrength.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                    <Edit className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
