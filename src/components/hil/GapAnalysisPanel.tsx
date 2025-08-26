import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  Users
} from 'lucide-react';
import { useHIL } from '@/contexts/HILContext';
import type { GapAnalysis, ParagraphGap, ImprovementSuggestion, ContentRecommendation } from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';

interface GapAnalysisPanelProps {
  variation: BlurbVariation;
  onApplySuggestion: (suggestion: ImprovementSuggestion) => void;
  onViewRelatedContent: (content: ContentRecommendation) => void;
}

export function GapAnalysisPanel({
  variation,
  onApplySuggestion,
  onViewRelatedContent
}: GapAnalysisPanelProps) {
  const { state, dispatch } = useHIL();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGap, setSelectedGap] = useState<string | null>(null);

  // Mock gap analysis data - in Phase 3 this will come from AI service
  const mockGapAnalysis: GapAnalysis = {
    overallScore: 78,
    paragraphGaps: [
      {
        paragraphId: 'p1',
        gap: 'Missing specific metrics',
        impact: 'high',
        suggestion: 'Add quantifiable outcomes like "increased conversion by 25%"',
        relatedVariations: ['var-2', 'var-3']
      },
      {
        paragraphId: 'p2',
        gap: 'Leadership context unclear',
        impact: 'medium',
        suggestion: 'Clarify team size and reporting structure',
        relatedVariations: ['var-1']
      },
      {
        paragraphId: 'p3',
        gap: 'Technical depth insufficient',
        impact: 'low',
        suggestion: 'Include specific technologies or methodologies used',
        relatedVariations: []
      }
    ],
    suggestions: [
      {
        type: 'add-metrics',
        content: 'Include specific KPIs and outcomes achieved',
        priority: 'high',
        relatedVariations: ['var-2']
      },
      {
        type: 'clarify-ownership',
        content: 'Specify your role and level of responsibility',
        priority: 'medium',
        relatedVariations: ['var-1']
      },
      {
        type: 'match-keywords',
        content: 'Align with job description keywords',
        priority: 'medium',
        relatedVariations: []
      }
    ],
    relatedContent: [
      {
        id: 'content-1',
        title: 'Leadership Metrics Story',
        relevance: 0.85,
        source: 'work-history'
      },
      {
        id: 'content-2',
        title: 'Team Management Example',
        relevance: 0.72,
        source: 'reusable'
      }
    ],
    variationsCoverage: {
      'var-1': {
        gapsCovered: ['Leadership context unclear'],
        gapsUncovered: ['Missing specific metrics'],
        relevance: 0.75
      },
      'var-2': {
        gapsCovered: ['Missing specific metrics'],
        gapsUncovered: ['Technical depth insufficient'],
        relevance: 0.88
      }
    }
  };

  useEffect(() => {
    // Simulate loading gap analysis
    setIsLoading(true);
    const timer = setTimeout(() => {
      dispatch({ type: 'SET_GAP_ANALYSIS', payload: mockGapAnalysis });
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [dispatch]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium': return 'bg-warning/10 text-warning border-warning/20';
      case 'low': return 'bg-muted text-muted-foreground border-muted';
      default: return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-destructive/10 text-destructive';
      case 'medium': return 'bg-warning/10 text-warning';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'add-metrics': return <BarChart3 className="h-4 w-4" />;
      case 'clarify-ownership': return <Users className="h-4 w-4" />;
      case 'match-keywords': return <Target className="h-4 w-4" />;
      case 'improve-tone': return <Lightbulb className="h-4 w-4" />;
      case 'fill-gap': return <Sparkles className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Gap Analysis</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Analyzing content gaps...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const gapAnalysis = state.gapAnalysis || mockGapAnalysis;

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Gap Analysis</CardTitle>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {gapAnalysis.overallScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Content Match Score</span>
                <span className="text-sm text-muted-foreground">
                  {gapAnalysis.overallScore < 70 ? 'Needs improvement' : 
                   gapAnalysis.overallScore < 85 ? 'Good' : 'Excellent'}
                </span>
              </div>
              <Progress value={gapAnalysis.overallScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-destructive">
                  {gapAnalysis.paragraphGaps.filter(g => g.impact === 'high').length}
                </div>
                <div className="text-xs text-muted-foreground">High Impact Gaps</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-warning">
                  {gapAnalysis.paragraphGaps.filter(g => g.impact === 'medium').length}
                </div>
                <div className="text-xs text-muted-foreground">Medium Impact Gaps</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {gapAnalysis.suggestions.length}
                </div>
                <div className="text-xs text-muted-foreground">Suggestions</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Paragraph Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Content Gaps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {gapAnalysis.paragraphGaps.map((gap, index) => (
              <div key={gap.paragraphId} className="p-4 border rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getImpactColor(gap.impact)}>
                      {gap.impact} impact
                    </Badge>
                    <span className="text-sm font-medium">Gap {index + 1}</span>
                  </div>
                  {gap.relatedVariations.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {gap.relatedVariations.length} related variation{gap.relatedVariations.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">Issue:</span>
                    <p className="text-sm text-muted-foreground mt-1">{gap.gap}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Suggestion:</span>
                    <p className="text-sm text-muted-foreground mt-1">{gap.suggestion}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplySuggestion({
                      type: 'fill-gap',
                      content: gap.suggestion,
                      priority: gap.impact as 'high' | 'medium' | 'low',
                      relatedVariations: gap.relatedVariations
                    })}
                    className="flex items-center gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    Apply Fix
                  </Button>
                  {gap.relatedVariations.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <ArrowRight className="h-3 w-3" />
                      View Related
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Improvement Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-warning" />
            Improvement Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gapAnalysis.suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSuggestionIcon(suggestion.type)}
                    <span className="text-sm font-medium capitalize">
                      {suggestion.type.replace('-', ' ')}
                    </span>
                  </div>
                  <Badge variant="outline" className={getPriorityColor(suggestion.priority)}>
                    {suggestion.priority} priority
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">{suggestion.content}</p>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onApplySuggestion(suggestion)}
                    className="flex items-center gap-1"
                  >
                    <CheckCircle className="h-3 w-3" />
                    Apply
                  </Button>
                  {suggestion.relatedVariations && suggestion.relatedVariations.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {suggestion.relatedVariations.length} related
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Related Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Related Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {gapAnalysis.relatedContent.map((content) => (
              <div key={content.id} className="p-3 border rounded-lg hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium">{content.title}</h4>
                  <Badge variant="outline">
                    {Math.round(content.relevance * 100)}% match
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs capitalize">
                    {content.source.replace('-', ' ')}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewRelatedContent(content)}
                    className="flex items-center gap-1"
                  >
                    <ArrowRight className="h-3 w-3" />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
