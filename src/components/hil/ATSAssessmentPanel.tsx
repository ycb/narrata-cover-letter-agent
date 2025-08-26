import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Target,
  FileText,
  BarChart3,
  Sparkles,
  ArrowRight,
  Clock,
  Zap
} from 'lucide-react';
import { useHIL } from '@/contexts/HILContext';
import { mockAIService } from '@/services/mockAIService';
import type { MockATSScore } from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';

interface ATSAssessmentPanelProps {
  variation: BlurbVariation;
  jobKeywords: string[];
  onOptimizeContent: (optimizedContent: string) => void;
}

export function ATSAssessmentPanel({
  variation,
  jobKeywords,
  onOptimizeContent
}: ATSAssessmentPanelProps) {
  const { state, dispatch } = useHIL();
  const [isLoading, setIsLoading] = useState(false);
  const [atsScore, setAtsScore] = useState<MockATSScore | null>(null);
  const [selectedOptimization, setSelectedOptimization] = useState<string | null>(null);

  useEffect(() => {
    const analyzeATS = async () => {
      setIsLoading(true);
      try {
        const score = await mockAIService.scoreATS(variation.content, jobKeywords);
        setAtsScore(score);
        dispatch({ type: 'SET_ATS_SCORE', payload: score });
      } catch (error) {
        console.error('Failed to analyze ATS:', error);
      } finally {
        setIsLoading(false);
      }
    };

    analyzeATS();
  }, [variation.content, jobKeywords, dispatch]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  };

  const getScoreVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'outline';
    return 'destructive';
  };

  const handleOptimizeContent = async (optimizationType: string) => {
    setSelectedOptimization(optimizationType);
    try {
      const optimizedContent = await mockAIService.enhanceContent(variation.content, optimizationType);
      onOptimizeContent(optimizedContent);
    } catch (error) {
      console.error('Failed to optimize content:', error);
    } finally {
      setSelectedOptimization(null);
    }
  };

  const keywordMatches = jobKeywords.filter(keyword => 
    variation.content.toLowerCase().includes(keyword.toLowerCase())
  );

  const missingKeywords = jobKeywords.filter(keyword => 
    !variation.content.toLowerCase().includes(keyword.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>ATS Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Analyzing ATS compatibility...</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!atsScore) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <CardTitle>ATS Assessment</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Unable to analyze ATS compatibility</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              <CardTitle>ATS Assessment</CardTitle>
            </div>
            <Badge variant={getScoreVariant(atsScore.overall)} className="text-lg px-3 py-1">
              {atsScore.overall}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall ATS Score</span>
                <span className={`text-sm font-medium ${getScoreColor(atsScore.overall)}`}>
                  {getScoreLabel(atsScore.overall)}
                </span>
              </div>
              <Progress value={atsScore.overall} className="h-2" />
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-2xl font-bold ${getScoreColor(atsScore.keywordMatch)}`}>
                  {atsScore.keywordMatch}%
                </div>
                <div className="text-xs text-muted-foreground">Keyword Match</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${getScoreColor(atsScore.formatting)}`}>
                  {atsScore.formatting}%
                </div>
                <div className="text-xs text-muted-foreground">Formatting</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${getScoreColor(atsScore.variationsCoverage)}`}>
                  {atsScore.variationsCoverage}%
                </div>
                <div className="text-xs text-muted-foreground">Coverage</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyword Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Keyword Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Matched Keywords */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-success" />
                <span className="text-sm font-medium">Matched Keywords ({keywordMatches.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {keywordMatches.map((keyword, index) => (
                  <Badge key={index} variant="default" className="bg-success/10 text-success border-success/20">
                    {keyword}
                  </Badge>
                ))}
                {keywordMatches.length === 0 && (
                  <span className="text-sm text-muted-foreground">No keywords matched</span>
                )}
              </div>
            </div>

            {/* Missing Keywords */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium">Missing Keywords ({missingKeywords.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {missingKeywords.map((keyword, index) => (
                  <Badge key={index} variant="outline" className="text-destructive border-destructive">
                    {keyword}
                  </Badge>
                ))}
                {missingKeywords.length === 0 && (
                  <span className="text-sm text-success">All keywords matched!</span>
                )}
              </div>
            </div>

            {/* Keyword Density */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Keyword Density</span>
                <span className="text-sm text-muted-foreground">
                  {Math.round((keywordMatches.length / jobKeywords.length) * 100)}%
                </span>
              </div>
              <Progress 
                value={(keywordMatches.length / jobKeywords.length) * 100} 
                className="h-2" 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Suggestions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-warning" />
            Optimization Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {atsScore.suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-warning" />
                    <span className="text-sm font-medium">Suggestion {index + 1}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOptimizeContent(`optimize-${index}`)}
                    disabled={selectedOptimization === `optimize-${index}`}
                    className="flex items-center gap-1"
                  >
                    {selectedOptimization === `optimize-${index}` ? (
                      <Clock className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
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
              onClick={() => handleOptimizeContent('add-keywords')}
              disabled={selectedOptimization === 'add-keywords'}
              className="flex items-center gap-2"
            >
              <Target className="h-4 w-4" />
              Add Keywords
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOptimizeContent('improve-formatting')}
              disabled={selectedOptimization === 'improve-formatting'}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Improve Formatting
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOptimizeContent('enhance-metrics')}
              disabled={selectedOptimization === 'enhance-metrics'}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Add Metrics
            </Button>
            <Button
              variant="outline"
              onClick={() => handleOptimizeContent('optimize-tone')}
              disabled={selectedOptimization === 'optimize-tone'}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Optimize Tone
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Content Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/30">
            <p className="text-sm whitespace-pre-wrap">{variation.content}</p>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Word count: {variation.content.split(' ').length}</span>
              <span>Character count: {variation.content.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
