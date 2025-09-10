import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Target,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
  Award,
  Lightbulb
} from 'lucide-react';
import { useHIL } from '@/contexts/HILContext';
import { mockAIService } from '@/services/mockAIService';
import type { PMAlignment } from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';

interface PMAssessmentPanelProps {
  variation: BlurbVariation;
  targetRole: string;
  userLevel: string;
  onApplySuggestion: (suggestion: string) => void;
}

export function PMAssessmentPanel({
  variation,
  targetRole,
  userLevel,
  onApplySuggestion
}: PMAssessmentPanelProps) {
  const { state, dispatch } = useHIL();
  const [isLoading, setIsLoading] = useState(false);
  const [pmAlignment, setPmAlignment] = useState<PMAlignment | null>(null);
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(null);

  useEffect(() => {
    const analyzePMAlignment = async () => {
      setIsLoading(true);
      try {
        const alignment = await mockAIService.analyzePMAlignment(variation.content, targetRole, userLevel);
        setPmAlignment(alignment);
        dispatch({ type: 'SET_PM_ALIGNMENT', payload: alignment });
      } catch (error) {
        console.error('Failed to analyze PM alignment:', error);
      } finally {
        setIsLoading(false);
      }
    };

    analyzePMAlignment();
  }, [variation.content, targetRole, userLevel, dispatch]);

  const getAlignmentColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getAlignmentLabel = (score: number) => {
    if (score >= 90) return 'Excellent Match';
    if (score >= 80) return 'Good Match';
    if (score >= 70) return 'Fair Match';
    return 'Needs Improvement';
  };

  const getAlignmentVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'outline';
    return 'destructive';
  };

  const getCompetencyColor = (strength: number) => {
    if (strength >= 0.8) return 'text-success';
    if (strength >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const handleApplySuggestion = async (suggestion: string) => {
    setSelectedSuggestion(suggestion);
    try {
      // Simulate applying suggestion
      await new Promise(resolve => setTimeout(resolve, 1000));
      onApplySuggestion(suggestion);
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
    } finally {
      setSelectedSuggestion(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>PM Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Analyzing PM alignment...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pmAlignment) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle>PM Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Unable to analyze PM alignment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Alignment */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <CardTitle>PM Assessment</CardTitle>
            </div>
            <Badge variant={getAlignmentVariant(pmAlignment.alignmentScore)} className="text-lg px-3 py-1">
              {pmAlignment.alignmentScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Role Alignment Score</span>
                <span className={`text-sm font-medium ${getAlignmentColor(pmAlignment.alignmentScore)}`}>
                  {getAlignmentLabel(pmAlignment.alignmentScore)}
                </span>
              </div>
              <Progress value={pmAlignment.alignmentScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Target Role</div>
                <div className="text-lg font-semibold">{pmAlignment.targetRoleLevel}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground">Your Level</div>
                <div className="text-lg font-semibold">{pmAlignment.userLevel}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competency Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Competency Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pmAlignment.competencyGaps.map((gap, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium capitalize">
                      {gap.competency.replace('-', ' ')}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Gap: {Math.round(gap.gap * 100)}%
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-3">
                  <div className="flex items-center justify-between text-xs">
                    <span>Current Strength</span>
                    <span className={`font-medium ${getCompetencyColor(gap.currentStrength)}`}>
                      {Math.round(gap.currentStrength * 100)}%
                    </span>
                  </div>
                  <Progress value={gap.currentStrength * 100} className="h-1" />
                  
                  <div className="flex items-center justify-between text-xs">
                    <span>Target Strength</span>
                    <span className="font-medium text-success">
                      {Math.round(gap.targetStrength * 100)}%
                    </span>
                  </div>
                  <Progress value={gap.targetStrength * 100} className="h-1" />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-3 w-3 text-warning" />
                    <span className="text-xs font-medium">Suggestions:</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-5">
                    {gap.suggestions.map((suggestion, suggestionIndex) => (
                      <li key={suggestionIndex} className="list-disc">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySuggestion(gap.suggestions[0])}
                    disabled={selectedSuggestion === gap.suggestions[0]}
                    className="flex items-center gap-1"
                  >
                    {selectedSuggestion === gap.suggestions[0] ? (
                      <Clock className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Apply Top Suggestion
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Level-Specific Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-warning" />
            Level-Specific Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pmAlignment.levelSpecificSuggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Suggestion {index + 1}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleApplySuggestion(suggestion)}
                    disabled={selectedSuggestion === suggestion}
                    className="flex items-center gap-1"
                  >
                    {selectedSuggestion === suggestion ? (
                      <Clock className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckCircle className="h-3 w-3" />
                    )}
                    Apply
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Transition Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Role Transition Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Current Level: {pmAlignment.userLevel}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                You're currently at the {pmAlignment.userLevel} level, targeting {pmAlignment.targetRoleLevel} position.
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium">Transition Path</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Focus on {pmAlignment.competencyGaps.length} key competency areas to bridge the gap to {pmAlignment.targetRoleLevel}.
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Strengths to Leverage</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your current experience provides a solid foundation. Focus on enhancing specific competencies.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleApplySuggestion('Emphasize strategic impact over tactical execution')}
              disabled={selectedSuggestion === 'Emphasize strategic impact over tactical execution'}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Strategic Focus
            </Button>
            <Button
              variant="outline"
              onClick={() => handleApplySuggestion('Show cross-functional leadership experience')}
              disabled={selectedSuggestion === 'Show cross-functional leadership experience'}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Leadership
            </Button>
            <Button
              variant="outline"
              onClick={() => handleApplySuggestion('Include stakeholder management examples')}
              disabled={selectedSuggestion === 'Include stakeholder management examples'}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Stakeholders
            </Button>
            <Button
              variant="outline"
              onClick={() => handleApplySuggestion('Add data-driven decision examples')}
              disabled={selectedSuggestion === 'Add data-driven decision examples'}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Data Focus
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
