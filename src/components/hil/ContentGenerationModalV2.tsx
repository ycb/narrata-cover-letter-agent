import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import { SectionInspector, type SectionAttributionData } from '@/components/cover-letters/SectionInspector';
import { GapResolutionStreamingServiceV2, type JobContextV2 } from '@/services/gapResolutionStreamingServiceV2';
import { useUserVoice } from '@/contexts/UserVoiceContext';

interface GapAnalysisV2 {
  id: string;
  type: 'core-requirement' | 'preferred-requirement' | 'best-practice' | 'content-enhancement';
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
  paragraphId?: string;
  origin: 'ai' | 'human' | 'library';
  addresses?: string[];
  existingContent?: string;
  gaps?: Array<{ id: string; title?: string; description: string }>;
  gapSummary?: string | null;
  ratingCriteriaGaps?: Array<{ id: string; title?: string; description: string }>;
  sectionAttribution?: SectionAttributionData;
}

export interface ContentGenerationModalV2Props {
  isOpen: boolean;
  onClose: () => void;
  gap?: GapAnalysisV2 | null;
  onApplyContent?: (content: string, options?: { saveToSavedSections?: boolean; saveToStories?: boolean }) => void;
  allowSaveToSavedSections?: boolean;
  allowSaveToStories?: boolean;
  jobContext?: JobContextV2;
  // UI choice: by default keep rating criteria out of UI to reduce redundancy.
  showQualityCriteriaInUI?: boolean;
}

const NEEDS_INPUT_RE = /\[NEEDS-INPUT:\s*([^\]]+)\]/g;

function extractNeedsInputs(text: string): string[] {
  const matches = new Set<string>();
  for (const match of text.matchAll(NEEDS_INPUT_RE)) {
    const key = (match[1] || '').trim();
    if (key) matches.add(key);
  }
  return Array.from(matches);
}

export function ContentGenerationModalV2({
  isOpen,
  onClose,
  gap,
  onApplyContent,
  allowSaveToSavedSections = false,
  allowSaveToStories = false,
  jobContext,
  showQualityCriteriaInUI = false,
}: ContentGenerationModalV2Props) {
  const { toast } = useToast();
  const { voice } = useUserVoice();
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveToSavedSections, setSaveToSavedSections] = useState(false);
  const [saveToStories, setSaveToStories] = useState(false);

  const [needsInputs, setNeedsInputs] = useState<string[]>([]);
  const [needsInputValues, setNeedsInputValues] = useState<Record<string, string>>({});
  const [isRefining, setIsRefining] = useState(false);
  const [isRefiningEdits, setIsRefiningEdits] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionsText, setSuggestionsText] = useState('');

  const streamingService = useMemo(() => new GapResolutionStreamingServiceV2(), []);

  useEffect(() => {
    if (!isOpen) {
      setGeneratedContent('');
      setIsGenerating(false);
      setSaveToSavedSections(false);
      setSaveToStories(false);
      setNeedsInputs([]);
      setNeedsInputValues({});
      setIsRefining(false);
      setIsRefiningEdits(false);
      setIsSuggesting(false);
      setSuggestionsText('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && gap && !generatedContent && !isGenerating) {
      void handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const hasAnyInputsFilled = useMemo(() => {
    return Object.values(needsInputValues).some(v => v.trim().length > 0);
  }, [needsInputValues]);

  const effectiveJobContext: JobContextV2 = useMemo(() => {
    return {
      role: jobContext?.role,
      company: jobContext?.company,
      coreRequirements: jobContext?.coreRequirements ?? gap?.addresses ?? [],
      preferredRequirements: jobContext?.preferredRequirements ?? [],
      jobDescriptionText: jobContext?.jobDescriptionText,
    };
  }, [jobContext, gap?.addresses]);

  const handleGenerate = async () => {
    if (!gap) return;
    setIsGenerating(true);
    setGeneratedContent('');
    setNeedsInputs([]);
    setNeedsInputValues({});
    setSuggestionsText('');

    try {
      const gapForService = {
        id: gap.id,
        type: gap.type,
        severity: gap.severity,
        description: gap.description,
        suggestion: gap.suggestion,
        paragraphId: gap.paragraphId,
        origin: gap.origin,
        addresses: gap.addresses,
        existingContent: gap.existingContent,
        gaps: gap.gaps,
        gapSummary: gap.gapSummary,
        ratingCriteriaGaps: gap.ratingCriteriaGaps,
        sectionAttribution: gap.sectionAttribution,
      } as any;

      const content = await streamingService.streamGapResolutionV2(
        gapForService,
        effectiveJobContext,
        {
          userVoicePrompt: voice?.prompt,
          sectionTitle: gap.paragraphId,
        },
        {
          onUpdate: (partial) => setGeneratedContent(partial),
        },
      );

      const extracted = extractNeedsInputs(content);
      setNeedsInputs(extracted);
      setNeedsInputValues(extracted.reduce((acc, k) => ({ ...acc, [k]: '' }), {}));
    } catch (error) {
      console.error('[ContentGenerationModalV2] Generation failed:', error);
      toast({
        title: 'Generation failed',
        description: 'Unable to generate content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!gap) return;
    if (!generatedContent.trim()) return;
    setIsRefining(true);
    setSuggestionsText('');

    try {
      const gapForService = {
        id: gap.id,
        type: gap.type,
        severity: gap.severity,
        description: gap.description,
        suggestion: gap.suggestion,
        paragraphId: gap.paragraphId,
        origin: gap.origin,
        addresses: gap.addresses,
        existingContent: gap.existingContent,
        ratingCriteriaGaps: gap.ratingCriteriaGaps,
        sectionAttribution: gap.sectionAttribution,
      } as any;

      const content = await streamingService.streamRefineWithInputs(
        {
          originalGap: gapForService,
          job: effectiveJobContext,
          context: {
            userVoicePrompt: voice?.prompt,
            sectionTitle: gap.paragraphId,
          },
          draft: generatedContent,
          inputs: needsInputValues,
        },
        { onUpdate: setGeneratedContent },
      );

      const extracted = extractNeedsInputs(content);
      setNeedsInputs(extracted);
      setNeedsInputValues(prev => {
        const next: Record<string, string> = {};
        for (const key of extracted) next[key] = prev[key] ?? '';
        return next;
      });
    } catch (error) {
      console.error('[ContentGenerationModalV2] Refinement failed:', error);
      toast({
        title: 'Refine failed',
        description: 'Unable to refine content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefining(false);
    }
  };

  const handleRefineEdits = async () => {
    if (!gap) return;
    if (!generatedContent.trim()) return;
    setIsRefiningEdits(true);
    setSuggestionsText('');

    try {
      const gapForService = {
        id: gap.id,
        type: gap.type,
        severity: gap.severity,
        description: gap.description,
        suggestion: gap.suggestion,
        paragraphId: gap.paragraphId,
        origin: gap.origin,
        addresses: gap.addresses,
        existingContent: gap.existingContent,
        ratingCriteriaGaps: gap.ratingCriteriaGaps,
        sectionAttribution: gap.sectionAttribution,
      } as any;

      const content = await streamingService.streamRefineEditedText(
        {
          originalGap: gapForService,
          job: effectiveJobContext,
          context: {
            userVoicePrompt: voice?.prompt,
            sectionTitle: gap.paragraphId,
          },
          editedText: generatedContent,
        },
        { onUpdate: setGeneratedContent },
      );

      const extracted = extractNeedsInputs(content);
      setNeedsInputs(extracted);
      setNeedsInputValues(prev => {
        const next: Record<string, string> = {};
        for (const key of extracted) next[key] = prev[key] ?? '';
        return next;
      });
    } catch (error) {
      console.error('[ContentGenerationModalV2] Refine edits failed:', error);
      toast({
        title: 'Refine failed',
        description: 'Unable to refine your edits. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsRefiningEdits(false);
    }
  };

  const handleSuggestImprovements = async () => {
    if (!gap) return;
    if (!generatedContent.trim()) return;
    setIsSuggesting(true);
    setSuggestionsText('');

    try {
      const gapForService = {
        id: gap.id,
        type: gap.type,
        severity: gap.severity,
        description: gap.description,
        suggestion: gap.suggestion,
        paragraphId: gap.paragraphId,
        origin: gap.origin,
        addresses: gap.addresses,
        existingContent: gap.existingContent,
        ratingCriteriaGaps: gap.ratingCriteriaGaps,
        sectionAttribution: gap.sectionAttribution,
      } as any;

      await streamingService.streamSuggestImprovements(
        {
          originalGap: gapForService,
          job: effectiveJobContext,
          context: {
            userVoicePrompt: voice?.prompt,
            sectionTitle: gap.paragraphId,
          },
          editedText: generatedContent,
        },
        { onUpdate: setSuggestionsText },
      );
    } catch (error) {
      console.error('[ContentGenerationModalV2] Suggest improvements failed:', error);
      toast({
        title: 'Suggestions failed',
        description: 'Unable to generate suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  if (!gap) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content (V2)
          </DialogTitle>
          <DialogDescription>Generate enhanced content to address gaps for this section.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Existing Content</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {gap.existingContent || 'No existing content available.'}
                </p>
              </div>

              <ContentGapBanner
                gaps={
                  gap.gaps || [
                    {
                      id: gap.id,
                      title: gap.description,
                      description: gap.suggestion,
                    },
                  ]
                }
                gapSummary={
                  gap.gapSummary ||
                  `${gap.severity === 'high' ? 'High' : gap.severity === 'medium' ? 'Medium' : 'Low'} Priority • ${
                    gap.type?.replace('-', ' ') || 'Unknown'
                  }`
                }
              />

              {gap.sectionAttribution && (
                <div className="pt-2">
                  <SectionInspector data={gap.sectionAttribution} totalCoreReqs={0} totalPrefReqs={0} totalStandards={0} />
                </div>
              )}

              {showQualityCriteriaInUI && gap.ratingCriteriaGaps?.length ? (
                <div className="pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Content Quality Criteria to Improve</h3>
                    <Badge variant="outline" className="text-xs">
                      {gap.ratingCriteriaGaps.length}
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-2">
                    {gap.ratingCriteriaGaps.map((c) => (
                      <div key={c.id} className="rounded-md border p-3">
                        <p className="text-sm font-medium">{c.title || c.id}</p>
                        <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Generated Content</CardTitle>
              <div className="flex items-center gap-2">
                {(isGenerating || isRefining || isRefiningEdits || isSuggesting) && (
                  <Badge variant="outline" className="text-xs">
                    <RefreshCw className="h-3 w-3 mr-1 inline animate-spin" />
                    {isGenerating
                      ? 'Generating'
                      : isRefining
                        ? 'Refining'
                        : isRefiningEdits
                          ? 'Polishing'
                          : 'Suggesting'}
                  </Badge>
                )}
                {!isGenerating && !isRefining && !isRefiningEdits && !isSuggesting && (
                  <Button variant="secondary" size="sm" onClick={handleGenerate} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Regenerate
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-xs text-muted-foreground">
                You can edit the text directly. Use “Polish my edits” for a minimal rewrite, or “Suggest improvements” for feedback only.
              </p>
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={8}
                placeholder="Generated content will appear here…"
              />

              {suggestionsText.trim() && (
                <div className="rounded-md border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Suggestions (no rewrite)</p>
                    <Badge variant="outline" className="text-xs">
                      Feedback
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    These are suggestions only; edit the text above, then optionally run “Polish my edits”.
                  </p>
                  <pre className="text-sm whitespace-pre-wrap font-sans">{suggestionsText.trim()}</pre>
                </div>
              )}

              {needsInputs.length > 0 && (
                <div className="rounded-md border p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <p className="text-sm font-semibold">Missing inputs</p>
                    <Badge variant="outline" className="text-xs">
                      {needsInputs.length}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fill these in and click “Refine with inputs” to produce a grounded version (no fabrication).
                  </p>
                  <div className="space-y-2">
                    {needsInputs.map((key) => (
                      <div key={key} className="space-y-1">
                        <label className="text-xs font-medium">{key}</label>
                        <Input
                          value={needsInputValues[key] ?? ''}
                          onChange={(e) => setNeedsInputValues(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="Add the exact fact/metric/example"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="secondary"
                      onClick={handleRefine}
                      disabled={isGenerating || isRefining || isRefiningEdits || isSuggesting || !hasAnyInputsFilled}
                    >
                      Refine with inputs
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-2">
                  {allowSaveToSavedSections && !allowSaveToStories && (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox checked={saveToSavedSections} onCheckedChange={(v) => setSaveToSavedSections(Boolean(v))} />
                      Save to Saved Sections after apply
                    </label>
                  )}
                  {allowSaveToStories && !allowSaveToSavedSections && (
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox checked={saveToStories} onCheckedChange={(v) => setSaveToStories(Boolean(v))} />
                      Add to Stories after apply
                    </label>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={handleRefineEdits}
                    disabled={isGenerating || isRefining || isRefiningEdits || isSuggesting || !generatedContent.trim()}
                  >
                    {isRefiningEdits ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Polishing
                      </>
                    ) : (
                      'Polish my edits'
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSuggestImprovements}
                    disabled={isGenerating || isRefining || isRefiningEdits || isSuggesting || !generatedContent.trim()}
                  >
                    {isSuggesting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Suggesting
                      </>
                    ) : (
                      'Suggest improvements'
                    )}
                  </Button>
                  <Button variant="secondary" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (!generatedContent.trim()) return;
                      onApplyContent?.(generatedContent, { saveToSavedSections, saveToStories });
                      onClose();
                    }}
                    disabled={isGenerating || isRefining || isRefiningEdits || isSuggesting || !generatedContent.trim()}
                  >
                    Apply Content
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
