import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  CheckCircle,
  AlertCircle,
  Target,
  FileText,
  BarChart3,
  Clock,
  Zap,
  Lightbulb,
  RefreshCw,
  Copy,
  Save,
  TrendingUp,
  Users,
  Award
} from 'lucide-react';
import { useHIL } from '@/contexts/HILContext';
import { mockAIService } from '@/services/mockAIService';
import type { MockAIGeneratedMetadata, TruthScore } from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';

interface ContentGenerationPanelProps {
  variation: BlurbVariation;
  targetRole: string;
  jobKeywords: string[];
  onContentGenerated: (content: string) => void;
}

export function ContentGenerationPanel({
  variation,
  targetRole,
  jobKeywords,
  onContentGenerated
}: ContentGenerationPanelProps) {
  const { state, dispatch } = useHIL();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generationPrompt, setGenerationPrompt] = useState<string>('');
  const [generationMetadata, setGenerationMetadata] = useState<MockAIGeneratedMetadata | null>(null);
  const [truthScore, setTruthScore] = useState<TruthScore | null>(null);
  const [selectedGenerationType, setSelectedGenerationType] = useState<string>('enhance');

  useEffect(() => {
    // Initialize with a default prompt based on the variation
    const defaultPrompt = `Enhance this content for a ${targetRole} position, incorporating relevant keywords: ${jobKeywords.join(', ')}. Original: ${variation.content}`;
    setGenerationPrompt(defaultPrompt);
  }, [variation.content, targetRole, jobKeywords]);

  const handleGenerateContent = async (type: string) => {
    setIsGenerating(true);
    setSelectedGenerationType(type);
    
    try {
      let prompt = '';
      switch (type) {
        case 'enhance':
          prompt = `Enhance this content for a ${targetRole} position, incorporating relevant keywords: ${jobKeywords.join(', ')}. Original: ${variation.content}`;
          break;
        case 'expand':
          prompt = `Expand this content with more details and metrics for a ${targetRole} position. Original: ${variation.content}`;
          break;
        case 'rewrite':
          prompt = `Rewrite this content in a different style for a ${targetRole} position. Original: ${variation.content}`;
          break;
        case 'custom':
          prompt = generationPrompt;
          break;
        default:
          prompt = `Enhance this content for a ${targetRole} position. Original: ${variation.content}`;
      }

      const content = await mockAIService.generateContent(prompt, {
        targetRole,
        userLevel: 'Mid-level',
        jobKeywords,
        contentType: 'work-history'
      });

      const metadata = await mockAIService.generateMetadata(content, targetRole);
      
      setGeneratedContent(content);
      setGenerationMetadata(metadata);
      dispatch({ type: 'SET_GENERATED_CONTENT', payload: content });
      dispatch({ type: 'SET_GENERATION_METADATA', payload: metadata });
    } catch (error) {
      console.error('Failed to generate content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVerifyTruth = async () => {
    if (!generatedContent) return;
    
    setIsVerifying(true);
    try {
      const score = await mockAIService.verifyTruth(generatedContent, variation.content);
      setTruthScore(score);
      dispatch({ type: 'SET_TRUTH_SCORE', payload: score });
    } catch (error) {
      console.error('Failed to verify truth:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleApplyContent = () => {
    if (generatedContent) {
      onContentGenerated(generatedContent);
    }
  };

  const handleCopyContent = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent);
    }
  };

  const getTruthScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const getTruthScoreLabel = (score: number) => {
    if (score >= 90) return 'Highly Accurate';
    if (score >= 80) return 'Mostly Accurate';
    if (score >= 70) return 'Somewhat Accurate';
    return 'Needs Review';
  };

  const getTruthScoreVariant = (score: number) => {
    if (score >= 90) return 'default';
    if (score >= 80) return 'secondary';
    if (score >= 70) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Content Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Generation Types */}
            <div>
              <h4 className="text-sm font-medium mb-3">Generation Type</h4>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={selectedGenerationType === 'enhance' ? 'default' : 'outline'}
                  onClick={() => handleGenerateContent('enhance')}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  Enhance
                </Button>
                <Button
                  variant={selectedGenerationType === 'expand' ? 'default' : 'outline'}
                  onClick={() => handleGenerateContent('expand')}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Expand
                </Button>
                <Button
                  variant={selectedGenerationType === 'rewrite' ? 'default' : 'outline'}
                  onClick={() => handleGenerateContent('rewrite')}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Rewrite
                </Button>
                <Button
                  variant={selectedGenerationType === 'custom' ? 'default' : 'outline'}
                  onClick={() => handleGenerateContent('custom')}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <Lightbulb className="h-4 w-4" />
                  Custom
                </Button>
              </div>
            </div>

            {/* Custom Prompt */}
            {selectedGenerationType === 'custom' && (
              <div>
                <label className="text-sm font-medium">Custom Prompt</label>
                <Textarea
                  value={generationPrompt}
                  onChange={(e) => setGenerationPrompt(e.target.value)}
                  placeholder="Enter your custom generation prompt..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            )}

            {/* Generate Button */}
            <Button
              onClick={() => handleGenerateContent(selectedGenerationType)}
              disabled={isGenerating}
              className="w-full flex items-center gap-2"
            >
              {isGenerating ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Content'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generated Content */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Generated Content
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyContent}
                  className="flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleApplyContent}
                  className="flex items-center gap-1"
                >
                  <Save className="h-3 w-3" />
                  Apply
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-muted/30">
              <p className="text-sm whitespace-pre-wrap">{generatedContent}</p>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Word count: {generatedContent.split(' ').length}</span>
                <span>Character count: {generatedContent.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generation Metadata */}
      {generationMetadata && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Generation Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {generationMetadata.keywordDensity}%
                  </div>
                  <div className="text-xs text-muted-foreground">Keyword Density</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">
                    {generationMetadata.readabilityScore}
                  </div>
                  <div className="text-xs text-muted-foreground">Readability</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-success">
                    {generationMetadata.impactScore}%
                  </div>
                  <div className="text-xs text-muted-foreground">Impact Score</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Role Alignment</span>
                  <Badge variant="outline">{generationMetadata.roleAlignment}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Content Type</span>
                  <Badge variant="outline">{generationMetadata.contentType}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>Confidence</span>
                  <Badge variant="outline">{generationMetadata.confidence}</Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Keywords Used</h4>
                <div className="flex flex-wrap gap-2">
                  {generationMetadata.keywordsUsed.map((keyword, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Truth Verification */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Truth Verification
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerifyTruth}
                disabled={isVerifying}
                className="flex items-center gap-1"
              >
                {isVerifying ? (
                  <Clock className="h-3 w-3 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3" />
                )}
                {isVerifying ? 'Verifying...' : 'Verify Truth'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {truthScore ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Truth Score</span>
                  <Badge variant={getTruthScoreVariant(truthScore.score)} className="text-lg px-3 py-1">
                    {truthScore.score}%
                  </Badge>
                </div>
                <Progress value={truthScore.score} className="h-2" />
                <div className="text-sm text-muted-foreground">
                  {getTruthScoreLabel(truthScore.score)}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Factual Accuracy</span>
                    <Badge variant="outline">{truthScore.factualAccuracy}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Consistency</span>
                    <Badge variant="outline">{truthScore.consistency}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Source Reliability</span>
                    <Badge variant="outline">{truthScore.sourceReliability}</Badge>
                  </div>
                </div>

                {truthScore.warnings.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      Warnings
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {truthScore.warnings.map((warning, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-warning">•</span>
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {truthScore.suggestions.length > 0 && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      Suggestions
                    </h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {truthScore.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Click "Verify Truth" to check content accuracy</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleGenerateContent('enhance')}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              Quick Enhance
            </Button>
            <Button
              variant="outline"
              onClick={() => handleGenerateContent('expand')}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Add Details
            </Button>
            <Button
              variant="outline"
              onClick={handleVerifyTruth}
              disabled={isVerifying || !generatedContent}
              className="flex items-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Verify Truth
            </Button>
            <Button
              variant="outline"
              onClick={handleApplyContent}
              disabled={!generatedContent}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Apply Content
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
