import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sparkles, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import type { Gap } from '@/services/gapTransformService';
import type { SectionAttributionData } from '@/components/cover-letters/SectionInspector';

interface GapAnalysis {
  id: string;
  type: 'core-requirement' | 'preferred-requirement' | 'best-practice' | 'content-enhancement';
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
  paragraphId?: string;
  requirementId?: string;
  origin: 'ai' | 'human' | 'library';
  addresses?: string[];
  existingContent?: string;
  // Rich gap structure for ContentGapBanner display
  gaps?: Array<{ id: string; title?: string; description: string }>;
  gapSummary?: string | null;
  // Rating criteria gaps stored separately from requirement gaps
  ratingCriteriaGaps?: Array<{ id: string; title?: string; description: string }>;
  // Section attribution (for cover letters only)
  sectionAttribution?: SectionAttributionData;
}

interface TagSuggestion {
  id: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  category?: 'industry' | 'business_model' | 'skill' | 'competency' | 'other';
}

interface ContentGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  gap?: GapAnalysis | null;
  onApplyContent?: (content: string) => void;
  // Tag suggestion mode
  mode?: 'gap-detection' | 'tag-suggestion';
  content?: string;
  contentType?: 'company' | 'role' | 'saved_section';
  entityId?: string; // For persisting tags
  existingTags?: string[];
  suggestedTags?: TagSuggestion[];
  onApplyTags?: (tags: string[]) => void;
  onGenerateTags?: () => Promise<void>; // New: trigger tag generation
  isSearching?: boolean; // For company research status
  searchError?: string | null; // For search error display
  onRetry?: () => void; // For retrying failed searches
}

export function ContentGenerationModal({
  isOpen,
  onClose,
  gap,
  onApplyContent,
  mode = 'gap-detection',
  content,
  contentType,
  existingTags = [],
  suggestedTags = [],
  onApplyTags,
  onGenerateTags,
  isSearching = false,
  searchError = null,
  onRetry
}: ContentGenerationModalProps) {
  console.log('ContentGenerationModal render:', { isOpen, mode, suggestedTags, isSearching, searchError });
  const { toast } = useToast();
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentQuality, setContentQuality] = useState<'draft' | 'review' | 'ready'>('draft');

  // Tag suggestion state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  // Reset selected tags when modal opens/closes or suggested tags change
  useEffect(() => {
    if (isOpen && mode === 'tag-suggestion') {
      setSelectedTags([]);
    }
  }, [isOpen, mode, suggestedTags]);

  // Auto-start content generation when modal opens in gap-detection mode
  useEffect(() => {
    if (isOpen && mode === 'gap-detection' && gap && !generatedContent && !isGenerating) {
      handleGenerate();
    }
  }, [isOpen, mode, gap]); // Only trigger on modal open, not on content changes

  const handleGenerate = async () => {
    if (!gap) {
      console.error('[ContentGenerationModal] No gap provided');
      return;
    }
    
    console.log('[ContentGenerationModal] Starting generation with gap:', gap);
    setIsGenerating(true);
    setGeneratedContent(''); // Clear previous content
    
    try {
      // Use real streaming service
      const { GapResolutionStreamingService } = await import('@/services/gapResolutionStreamingService');
      const streamingService = new GapResolutionStreamingService();
      
      // Extract job description context from gap or use defaults
      const jobContext = {
        role: gap.paragraphId === 'intro' ? 'the role' : undefined,
        company: undefined,
        coreRequirements: gap.addresses || [],
        preferredRequirements: [],
      };
      
      // Convert GapAnalysis to Gap type for the service
      const gapForService: Gap = {
        id: gap.id,
        type: gap.type,
        severity: gap.severity,
        description: gap.description,
        suggestion: gap.suggestion,
        paragraphId: gap.paragraphId,
        requirementId: gap.requirementId,
        origin: gap.origin,
        addresses: gap.addresses,
        existingContent: gap.existingContent,
        gaps: gap.gaps, // Requirement gaps only
        gapSummary: gap.gapSummary,
        ratingCriteriaGaps: gap.ratingCriteriaGaps, // Rating criteria gaps stored separately
      };
      
      console.log('[ContentGenerationModal] Calling streamGapResolution with:', { gapForService, jobContext });
      
      await streamingService.streamGapResolution(gapForService, jobContext, {
        onUpdate: (content) => {
          setGeneratedContent(content);
        },
        onComplete: (content) => {
          setGeneratedContent(content);
          setContentQuality('review');
          setIsGenerating(false);
        },
        onError: (error) => {
          console.error('[ContentGenerationModal] Streaming error:', error);
          setIsGenerating(false);
          toast({
            title: "Generation Failed",
            description: "Failed to generate content. Using fallback content instead.",
            variant: "destructive",
          });
          // Fallback to mock content on error
          handleGenerateFallback();
        }
      });
    } catch (error) {
      console.error('[ContentGenerationModal] Failed to initialize streaming:', error);
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: "Failed to initialize content generation. Using fallback content instead.",
        variant: "destructive",
      });
      // Fallback to mock content on error
      handleGenerateFallback();
    }
  };

  const handleGenerateFallback = () => {
    if (!gap) return;
    
    // Fallback mock content generation
    let content = '';
    
    switch (gap.paragraphId) {
      case 'intro':
        content = `I am writing to express my strong interest in this position. ${gap.suggestion}. My background includes relevant experience that directly aligns with your requirements.`;
        break;
      case 'experience':
        content = `In my previous role, I successfully ${gap.suggestion.toLowerCase()}. Specifically, I delivered measurable results that demonstrate my capabilities in this area.`;
        break;
      case 'closing':
        content = `I am particularly excited about this opportunity because ${gap.suggestion.toLowerCase()}. I look forward to discussing how my background aligns with your needs.`;
        break;
      default:
        content = `${gap.suggestion}. I am confident I can contribute to your team's success.`;
    }
    
    setGeneratedContent(content);
    setContentQuality('review');
  };

  const handleRegenerate = () => {
    setGeneratedContent('');
    setContentQuality('draft');
    handleGenerate();
  };

  const handleApply = () => {
    if (generatedContent.trim()) {
      onApplyContent(generatedContent);
      onClose();
      // Reset state
      setGeneratedContent('');
      setContentQuality('draft');
    }
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setGeneratedContent('');
    setContentQuality('draft');
  };

  if (mode === 'gap-detection' && !gap) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {mode === 'tag-suggestion' ? 'Suggest Tags' : 'Generate Content'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'tag-suggestion' ? 'AI-powered tag suggestions for your content' : 'Generate enhanced content to address this gap'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Existing Content with Gap Banner - Only show in gap detection mode */}
          {mode === 'gap-detection' && gap && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Existing Content</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* Content without background box - matching ContentCard pattern */}
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {gap.existingContent ||
                      (gap.paragraphId === 'intro' && "Dear Hiring Team,\n\nI'm a product manager with experience leading growth initiatives. I've learned that compounding growth comes from disciplined experimentation and clear measurement. Over the past several years, I've helped teams translate strategy into shipped impact across web and mobile platforms.") ||
                      (gap.paragraphId === 'experience' && "In my previous role as a Lead Developer at InnovateTech, I successfully architected and implemented a microservices platform that reduced system latency by 40% and improved scalability for over 100,000 daily active users. My expertise in React, Node.js, and cloud technologies aligns perfectly with TechCorp's technology stack.") ||
                      (gap.paragraphId === 'closing' && "What particularly excites me about TechCorp is your commitment to innovation and sustainable technology solutions. I led a green technology initiative that reduced our infrastructure costs by 30% while improving performance, demonstrating my ability to balance technical excellence with business impact.") ||
                      "No existing content available."
                    }
                  </p>
                </div>

                {/* Integrated Gap Banner - matches ContentCard pattern */}
                <ContentGapBanner
                  gaps={gap.gaps || [
                    {
                      id: gap.id,
                      title: gap.description,
                      description: gap.suggestion
                    }
                  ]}
                  gapSummary={gap.gapSummary || `${gap.severity === 'high' ? 'High' : gap.severity === 'medium' ? 'Medium' : 'Low'} Priority • ${gap.type.replace('-', ' ')}`}
                />

                {/* Section Attribution - Show what requirements/standards this section currently meets */}
                {gap.sectionAttribution && (
                  gap.sectionAttribution.coreReqs.met.length > 0 ||
                  gap.sectionAttribution.prefReqs.met.length > 0 ||
                  gap.sectionAttribution.standards.met.length > 0
                ) && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <h4 className="text-sm font-semibold mb-3 text-success flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      What's Working in This Section
                    </h4>
                    <div className="space-y-3 text-xs">
                      {gap.sectionAttribution.coreReqs.met.length > 0 && (
                        <div>
                          <div className="font-medium text-foreground mb-1.5">Core Requirements Met ({gap.sectionAttribution.coreReqs.met.length})</div>
                          <div className="space-y-1">
                            {gap.sectionAttribution.coreReqs.met.map((req) => (
                              <div key={req.id} className="p-2 bg-success/10 rounded border border-success/20">
                                <div className="font-medium text-foreground">{req.label}</div>
                                {req.evidence && (
                                  <div className="text-muted-foreground mt-1 italic">"{req.evidence}"</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {gap.sectionAttribution.prefReqs.met.length > 0 && (
                        <div>
                          <div className="font-medium text-foreground mb-1.5">Preferred Requirements Met ({gap.sectionAttribution.prefReqs.met.length})</div>
                          <div className="space-y-1">
                            {gap.sectionAttribution.prefReqs.met.map((req) => (
                              <div key={req.id} className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                                <div className="font-medium text-foreground">{req.label}</div>
                                {req.evidence && (
                                  <div className="text-muted-foreground mt-1 italic">"{req.evidence}"</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {gap.sectionAttribution.standards.met.length > 0 && (
                        <div>
                          <div className="font-medium text-foreground mb-1.5">Content Standards Met ({gap.sectionAttribution.standards.met.length})</div>
                          <div className="space-y-1">
                            {gap.sectionAttribution.standards.met.map((standard) => (
                              <div key={standard.id} className="p-2 bg-success/10 rounded border border-success/20">
                                <div className="font-medium text-foreground">{standard.label}</div>
                                {standard.evidence && (
                                  <div className="text-muted-foreground mt-1 italic">"{standard.evidence}"</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Rating Criteria Section - Show content quality criteria that need improvement */}
                {gap.ratingCriteriaGaps && gap.ratingCriteriaGaps.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/30">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Content Quality Criteria to Improve</h4>
                    <div className="space-y-2">
                      {gap.ratingCriteriaGaps.map((criterionGap) => (
                        <div key={criterionGap.id} className="text-xs p-2 bg-muted/30 rounded border border-border/20">
                          <div className="font-medium text-foreground mb-1">{criterionGap.title}</div>
                          <div className="text-muted-foreground">{criterionGap.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Content Generation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {!generatedContent ? 'Generated Content' : 'Generated Content'}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {contentQuality === 'review' && (
                    <Badge variant="outline" className="text-warning">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Review
                    </Badge>
                  )}
                  {contentQuality === 'ready' && (
                    <Badge variant="outline" className="text-success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ready
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
        <CardContent className="space-y-4">
          {mode === 'tag-suggestion' ? (
            <div className="space-y-4">
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Content to analyze:</p>
                <p className="text-sm">{content}</p>
              </div>

              {/* Existing tags display */}
              {existingTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Existing tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {existingTags.map((tag, index) => (
                      <Badge key={`existing-${index}`} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Search status indicator */}
              {isSearching && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Researching company information...
                  </span>
                </div>
              )}

              {/* Search error with retry */}
              {searchError && (
                <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <p className="text-sm text-red-700 dark:text-red-300">{searchError}</p>
                  </div>
                  {onRetry && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onRetry}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  )}
                </div>
              )}
              
              {suggestedTags.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium">Suggested tags:</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((tag) => (
                      <Badge
                        key={tag.id}
                        variant={selectedTags.includes(tag.value) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          if (selectedTags.includes(tag.value)) {
                            setSelectedTags(selectedTags.filter(t => t !== tag.value));
                          } else {
                            setSelectedTags([...selectedTags, tag.value]);
                          }
                        }}
                      >
                        {tag.value}
                      </Badge>
                    ))}
                  </div>
                  
                  <Button 
                    onClick={() => onApplyTags?.(selectedTags)}
                    disabled={selectedTags.length === 0}
                    className="w-full"
                  >
                    Apply {selectedTags.length} selected tags
                  </Button>
                </div>
              ) : !isSearching && !searchError ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Analyzing content to suggest relevant tags...
                  </p>
                  <div className="flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span>Generating tag suggestions...</span>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
                <>
                  {/* Show generating state while streaming */}
                  {isGenerating && !generatedContent && (
                    <div className="text-center py-8">
                      <div className="flex items-center justify-center mb-4">
                        <RefreshCw className="h-5 w-5 animate-spin text-primary mr-2" />
                        <span className="text-muted-foreground">Generating enhanced content...</span>
                      </div>
                    </div>
                  )}

                  {/* Show textarea once content starts streaming or is complete */}
                  {(generatedContent || !isGenerating) && (
                    <>
                      <Textarea
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        placeholder="Generated content will appear here..."
                        rows={8}
                        className="resize-none"
                      />

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={handleRegenerate} disabled={isGenerating}>
                            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                            Regenerate
                          </Button>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="secondary" onClick={handleClose}>
                            Cancel
                          </Button>
                          <Button onClick={handleApply} disabled={isGenerating || !generatedContent}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Apply Content
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
