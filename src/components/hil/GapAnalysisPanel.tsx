import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import type { GapAnalysis, ImprovementSuggestion, ContentRecommendation } from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';
import { useHilGapAnalysis } from '@/hooks/useHilGapAnalysis';

interface GapAnalysisPanelProps {
  variation: BlurbVariation | null;
  targetRole: string;
  jobKeywords: string[];
  onApplySuggestion: (suggestion: ImprovementSuggestion) => void;
  onViewRelatedContent: (content: ContentRecommendation) => void;
  onComplete?: (analysis: GapAnalysis) => void;
}

const impactBadgeClass = (impact: 'high' | 'medium' | 'low') => {
  switch (impact) {
    case 'high':
      return 'bg-destructive/10 text-destructive';
    case 'medium':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const priorityBadgeClass = (priority: ImprovementSuggestion['priority']) => {
  switch (priority) {
    case 'high':
      return 'bg-destructive/10 text-destructive';
    case 'medium':
      return 'bg-warning/10 text-warning';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function GapAnalysisPanel({
  variation,
  targetRole,
  jobKeywords,
  onApplySuggestion,
  onViewRelatedContent,
  onComplete,
}: GapAnalysisPanelProps) {
  const { status, analysis, streamingMessages, error, retry } = useHilGapAnalysis(variation, targetRole, jobKeywords, {
    enabled: Boolean(variation),
    onComplete,
  });

  const gapCounts = useMemo(() => {
    if (!analysis) {
      return { high: 0, medium: 0, low: 0 };
    }
    return analysis.paragraphGaps.reduce(
      (acc, gap) => {
        acc[gap.impact] += 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 } as { high: number; medium: number; low: number },
    );
  }, [analysis]);

  if (!variation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Gap Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Select a variation to begin gap analysis.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'loading' || (status === 'idle' && !analysis)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Loader2 className="h-4 w-4 animate-spin" /> Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">Analyzing content gaps...</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            {streamingMessages.map(message => (
              <div key={message} className="flex items-center gap-2">
                <Sparkles className="h-3 w-3 text-primary" />
                <span>{message}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-destructive">
            {error ?? 'Unable to complete gap analysis.'}
          </p>
          <Button variant="outline" size="sm" onClick={retry} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Retry analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-lg">
            <span>Content Match Score</span>
            <Badge variant="outline" className="text-base font-semibold">
              {analysis.overallScore}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">High Impact Gaps</p>
              <p className="text-lg font-semibold text-destructive">{gapCounts.high}</p>
            </div>
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Medium Impact Gaps</p>
              <p className="text-lg font-semibold text-warning">{gapCounts.medium}</p>
            </div>
            <div className="p-3 rounded-md border bg-muted/30">
              <p className="text-xs text-muted-foreground">Low Impact Gaps</p>
              <p className="text-lg font-semibold text-muted-foreground">{gapCounts.low}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Match Coverage</span>
              <span className="font-medium">{analysis.summary?.matchedParagraphs ?? 2}/{analysis.summary?.totalParagraphs ?? 3}</span>
            </div>
            <Progress value={(analysis.summary?.matchedParagraphs ?? 2) / (analysis.summary?.totalParagraphs ?? 3) * 100} />
          </div>

          {analysis.summary?.keywordEmphasis && analysis.summary.keywordEmphasis.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="uppercase tracking-wide">Differentiator focus:</span>
              {analysis.summary.keywordEmphasis.map(keyword => (
                <Badge key={keyword} variant="outline" className="text-xs">
                  {keyword}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Content Gaps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis.paragraphGaps.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2" />
              <h4 className="text-sm font-medium text-success mb-1">All gaps resolved</h4>
              <p className="text-xs text-muted-foreground">This variation covers every differentiator we detected.</p>
            </div>
          ) : (
            analysis.paragraphGaps.map(gap => (
              <div key={gap.paragraphId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={impactBadgeClass(gap.impact)}>{gap.impact} impact</Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {gap.paragraphId.replace('-', ' ')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {gap.relatedVariations?.length ?? 0}{' '}
                      {gap.relatedVariations && gap.relatedVariations.length === 1 ? 'related variation' : 'related variations'}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      onApplySuggestion({
                        type: 'fill-gap',
                        content: gap.suggestion,
                        priority: gap.impact === 'high' ? 'high' : gap.impact === 'medium' ? 'medium' : 'low',
                        relatedVariations: gap.relatedVariations,
                      })
                    }
                    className="flex items-center gap-1"
                  >
                    <Target className="h-3 w-3" /> Apply Fix
                  </Button>
                </div>
                <div className="space-y-1 text-sm">
                  <div>
                    <span className="font-medium">Issue:</span>
                    <p className="text-muted-foreground">{gap.gap}</p>
                  </div>
                  <div>
                    <span className="font-medium">Suggestion:</span>
                    <p className="text-muted-foreground">{gap.suggestion}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Improvement Suggestions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.suggestions.map(suggestion => (
            <div key={`${suggestion.type}-${suggestion.content}`} className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={priorityBadgeClass(suggestion.priority)}>{suggestion.priority} priority</Badge>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {suggestion.type.replace(/-/g, ' ')}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{suggestion.content}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => onApplySuggestion(suggestion)} className="self-start md:self-center">
                Apply
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Related Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.relatedContent.map(item => (
            <div key={item.id} className="border rounded-lg p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {item.source.replace('-', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(item.relevance * 100)}% match
                  </span>
                </div>
                <p className="text-sm font-medium">{item.title}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewRelatedContent(item)}
                className="self-start md:self-center flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" /> View
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
