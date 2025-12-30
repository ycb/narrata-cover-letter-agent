import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ChevronDown, Sparkles } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import { useUserVoice } from '@/contexts/UserVoiceContext';
import { ContentGenerationService } from '@/services/contentGenerationService';
import type { Gap as GapRecord } from '@/services/gapDetectionService';
import { clearDraft, loadDraft, saveDraft } from '@/lib/localDraft';
import {
  HilReviewNotesStreamingService,
  type ReviewNotes,
  type ReviewSuggestion,
  type ReviewContentKind,
} from '@/services/hilReviewNotesStreamingService';

interface GapAnalysisLite {
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
}

type EntityType = 'work_item' | 'approved_content' | 'saved_section';
type SavedSectionType = 'introduction' | 'closer' | 'signature' | 'custom';

export interface ContentGenerationModalV3BaselineProps {
  isOpen: boolean;
  onClose: () => void;
  gap?: GapAnalysisLite | null;
  onApplyContent?: (content: string) => void | Promise<void>;
  /**
   * Defaults to true. Set to false when the caller needs to persist content
   * asynchronously and wants to keep the modal open until the save succeeds.
   */
  closeOnApply?: boolean;

  userId?: string;
  entityType?: EntityType;
  entityId?: string;
  savedSectionType?: SavedSectionType;
}

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
}

function safeParseJson<T>(text: string): T | null {
  const candidate = extractJsonObject(text) ?? text.trim();
  if (!candidate) return null;
  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const next = haystack.indexOf(needle, idx);
    if (next === -1) return count;
    count += 1;
    idx = next + needle.length;
  }
}

function applyAnchorReplacement(text: string, anchor: string, replacement: string): { next: string; occurrences: number } {
  const occurrences = countOccurrences(text, anchor);
  if (occurrences < 1) return { next: text, occurrences };
  return { next: text.replace(anchor, replacement), occurrences };
}

type ReviewFilter = 'P0' | 'P1' | 'P2' | 'all';
type ReviewTab = 'notes' | 'priority' | 'questions';

function formatWorkHistoryForLLM(ctx: any): string {
  if (!ctx) return '';

  const lines: string[] = [];
  if (ctx.currentRole?.title || ctx.currentRole?.company) {
    lines.push(`Current role: ${String(ctx.currentRole?.title ?? '').trim()} @ ${String(ctx.currentRole?.company ?? '').trim()}`.trim());
  }
  if (Array.isArray(ctx.metrics) && ctx.metrics.length) {
    lines.push('Role-level metrics:');
    for (const m of ctx.metrics.slice(0, 10)) lines.push(`- ${String(m)}`);
  }
  if (Array.isArray(ctx.allStories) && ctx.allStories.length) {
    lines.push('Related stories (for grounding; do not copy verbatim):');
    for (const s of ctx.allStories.slice(0, 5)) {
      const title = String(s?.title ?? '').trim();
      const content = String(s?.content ?? '').trim().slice(0, 260);
      lines.push(`- ${title}${title && content ? ': ' : ''}${content}`);
    }
  }
  return lines.join('\n').trim();
}

function mapModalTypeToGapType(type: GapAnalysisLite['type']): GapRecord['gap_type'] {
  if (type === 'core-requirement') return 'data_quality';
  if (type === 'preferred-requirement') return 'role_expectation';
  return 'best_practice';
}

function guessGapCategory(gap: GapAnalysisLite): string {
  const fromStructured = gap.gaps?.[0]?.title || gap.gaps?.[0]?.description;
  return String(fromStructured || gap.description || 'content_quality').trim();
}

function kindFromEntityType(entityType?: EntityType): ReviewContentKind {
  if (entityType === 'approved_content') return 'story';
  if (entityType === 'work_item') return 'role_description';
  if (entityType === 'saved_section') return 'saved_section';
  return 'saved_section';
}

export function ContentGenerationModalV3Baseline({
  isOpen,
  onClose,
  gap,
  onApplyContent,
  closeOnApply = true,
  userId,
  entityType,
  entityId,
  savedSectionType = 'custom',
}: ContentGenerationModalV3BaselineProps) {
  const { toast } = useToast();
  const { voice } = useUserVoice();

  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  const [reviewNotes, setReviewNotes] = useState<ReviewNotes | null>(null);
  const [reviewRaw, setReviewRaw] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('P0');
  const [reviewTab, setReviewTab] = useState<ReviewTab>('priority');
  const [lastReviewedText, setLastReviewedText] = useState('');
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<string | null>(null);
  const [regeneratingSuggestionId, setRegeneratingSuggestionId] = useState<string | null>(null);

  const [workHistorySummary, setWorkHistorySummary] = useState<string>('');

  const latestGeneratedContentRef = React.useRef('');
  const latestReviewRawRef = React.useRef('');
  const latestLastReviewedTextRef = React.useRef('');
  const latestReviewFilterRef = React.useRef<ReviewFilter>('P0');
  const latestReviewTabRef = React.useRef<ReviewTab>('priority');
  const latestReviewNotesRef = React.useRef<ReviewNotes | null>(null);

  useEffect(() => {
    latestGeneratedContentRef.current = generatedContent;
  }, [generatedContent]);
  useEffect(() => {
    latestReviewRawRef.current = reviewRaw;
  }, [reviewRaw]);
  useEffect(() => {
    latestLastReviewedTextRef.current = lastReviewedText;
  }, [lastReviewedText]);
  useEffect(() => {
    latestReviewFilterRef.current = reviewFilter;
  }, [reviewFilter]);
  useEffect(() => {
    latestReviewTabRef.current = reviewTab;
  }, [reviewTab]);
  useEffect(() => {
    latestReviewNotesRef.current = reviewNotes;
  }, [reviewNotes]);

  const generationService = useMemo(() => new ContentGenerationService(), []);
  const reviewService = useMemo(() => new HilReviewNotesStreamingService(), []);

  const draftKey = useMemo(() => {
    const entity = entityType && entityId ? `${entityType}:${entityId}` : `gap:${gap?.id ?? 'unknown'}`;
    // Avoid key churn if `userId` is temporarily undefined (e.g. auth still loading).
    // Keeping the key stable makes restores reliable even if the page refreshes mid-session.
    return `draft:hil:v3:${entity}:${savedSectionType}`;
  }, [entityId, entityType, gap?.id, savedSectionType, userId]);

  const persistDraft = (opts?: { clearIfEmpty?: boolean }) => {
    if (!draftKey) return;
    const currentGenerated = latestGeneratedContentRef.current;
    const currentReviewRaw = latestReviewRawRef.current;
    const currentReviewNotes = latestReviewNotesRef.current;
    const currentLastReviewedText = latestLastReviewedTextRef.current;
    const currentReviewFilter = latestReviewFilterRef.current;
    const currentReviewTab = latestReviewTabRef.current;
    const hasWork =
      currentGenerated.trim().length > 0 ||
      currentReviewRaw.trim().length > 0 ||
      (currentReviewNotes?.suggestions?.length ?? 0) > 0;

    if (!hasWork && opts?.clearIfEmpty) {
      clearDraft(draftKey);
      return;
    }

    if (!hasWork) return;

    saveDraft(draftKey, {
      generatedContent: currentGenerated,
      reviewNotes: currentReviewNotes,
      reviewRaw: currentReviewRaw,
      lastReviewedText: currentLastReviewedText,
      reviewFilter: currentReviewFilter,
      reviewTab: currentReviewTab,
      savedSectionType,
    });
  };

  useEffect(() => {
    if (!isOpen || !draftKey) return;
    const draft = loadDraft<{
      generatedContent?: string;
      reviewNotes?: ReviewNotes | null;
      reviewRaw?: string;
      lastReviewedText?: string;
      reviewFilter?: ReviewFilter;
      reviewTab?: ReviewTab;
    }>(draftKey);

    if (!draft?.data) return;
    if (generatedContent.trim()) return;

    if (draft.data.generatedContent?.trim()) {
      setGeneratedContent(draft.data.generatedContent);
      setReviewNotes(draft.data.reviewNotes ?? null);
      setReviewRaw(draft.data.reviewRaw ?? '');
      setLastReviewedText(draft.data.lastReviewedText ?? '');
      setReviewFilter(draft.data.reviewFilter ?? 'P0');
      setReviewTab(draft.data.reviewTab ?? 'priority');
      setRestoredDraft(true);
      toast({ title: 'Restored draft', description: 'Recovered your unsaved HIL content.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftKey]);

  useEffect(() => {
    if (!isOpen || !draftKey) return;
    const timer = window.setTimeout(() => {
      persistDraft({ clearIfEmpty: true });
    }, 500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftKey, generatedContent, reviewRaw, reviewNotes, lastReviewedText, reviewFilter, reviewTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => persistDraft();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftKey, generatedContent, reviewRaw, reviewNotes, lastReviewedText, reviewFilter, reviewTab]);

  useEffect(() => {
    if (!isOpen) return;
    const onVisibilityChange = () => {
      if (document.hidden) persistDraft();
    };
    const onPageHide = () => persistDraft();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, draftKey, generatedContent, reviewRaw, reviewNotes, lastReviewedText, reviewFilter, reviewTab]);

  useEffect(() => {
    if (!isOpen) {
      setGeneratedContent('');
      setIsGenerating(false);
      setReviewNotes(null);
      setReviewRaw('');
      setIsReviewing(false);
      setReviewFilter('P0');
      setReviewTab('priority');
      setLastReviewedText('');
      setExpandedSuggestionId(null);
      setRegeneratingSuggestionId(null);
      setWorkHistorySummary('');
      setRestoredDraft(false);

      latestGeneratedContentRef.current = '';
      latestReviewRawRef.current = '';
      latestLastReviewedTextRef.current = '';
      latestReviewFilterRef.current = 'P0';
      latestReviewTabRef.current = 'priority';
      latestReviewNotesRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && gap && !generatedContent && !isGenerating) {
      // If we restored a draft, don't immediately clobber it by auto-generating again.
      if (restoredDraft) return;
      void handleGenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const reviewCounts = useMemo(() => {
    const suggestions = reviewNotes?.suggestions ?? [];
    const counts = { P0: 0, P1: 0, P2: 0, all: suggestions.length };
    for (const s of suggestions) {
      if (s.priority === 'P0') counts.P0 += 1;
      else if (s.priority === 'P1') counts.P1 += 1;
      else if (s.priority === 'P2') counts.P2 += 1;
    }
    return counts;
  }, [reviewNotes]);

  const filteredSuggestions = useMemo(() => {
    const suggestions = reviewNotes?.suggestions ?? [];
    if (reviewFilter === 'all') return suggestions;
    return suggestions.filter((s) => s.priority === reviewFilter);
  }, [reviewNotes, reviewFilter]);

  const canReview = useMemo(() => {
    const current = generatedContent.trim();
    const last = lastReviewedText.trim();
    if (!current) return false;
    if (!last) return true;
    return current !== last;
  }, [generatedContent, lastReviewedText]);

  const handleGenerate = async () => {
    if (!gap) return;
    if (!userId || !entityType || !entityId) {
      toast({
        title: 'Missing context',
        description: 'Unable to generate content without entity context.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedContent('');
    setReviewNotes(null);
    setReviewRaw('');
    setLastReviewedText('');
    setReviewTab('priority');
    setExpandedSuggestionId(null);

    try {
      const workHistoryContext = await generationService.fetchWorkHistoryContext(userId, entityType, entityId);
      const summary = formatWorkHistoryForLLM(workHistoryContext);
      setWorkHistorySummary(summary);

      const gapForGeneration: GapRecord = {
        id: gap.id,
        user_id: userId,
        entity_type: entityType,
        entity_id: entityId,
        gap_type: mapModalTypeToGapType(gap.type),
        gap_category: guessGapCategory(gap),
        severity: gap.severity,
        description: gap.description,
        suggestions: [gap.suggestion].filter(Boolean),
        resolved: false,
      };

      const generated = await generationService.generateContent(
        {
          gap: gapForGeneration,
          existingContent: gap.existingContent ?? '',
          entityType,
          entityId,
          workHistoryContext,
          userVoicePrompt: voice?.prompt,
          sectionType: entityType === 'saved_section' ? savedSectionType : undefined,
        },
        { userId },
      );

      const cleaned = String(generated ?? '').trim();
      setGeneratedContent(cleaned);

      if (cleaned && reviewService.isAvailable()) {
        await handleReview(cleaned, summary);
      }
    } catch (error) {
      console.error('[ContentGenerationModalV3Baseline] Generation failed:', error);
      toast({
        title: 'Generation failed',
        description: 'Unable to generate content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReview = async (textOverride?: string, workSummaryOverride?: string) => {
    if (!gap) return;
    if (!reviewService.isAvailable()) {
      toast({
        title: 'Feedback unavailable',
        description: 'No OpenAI key is configured for feedback.',
        variant: 'destructive',
      });
      setReviewRaw('Feedback unavailable (missing OpenAI configuration).');
      setReviewNotes(null);
      return;
    }

    const textToReview = String(textOverride ?? generatedContent).trim();
    if (!textToReview) return;

    const kind = kindFromEntityType(entityType) as Exclude<ReviewContentKind, 'cover_letter_section'>;

    setIsReviewing(true);
    setReviewRaw('');
    setReviewNotes(null);
    setExpandedSuggestionId(null);

    try {
      const raw = await reviewService.streamReviewNotesForContent(
        {
          contentKind: kind,
          context: {
            userVoicePrompt: voice?.prompt,
            sectionTitle: gap.paragraphId,
            workHistorySummary: workSummaryOverride ?? workHistorySummary,
            savedSectionType: entityType === 'saved_section' ? savedSectionType : undefined,
          },
          text: textToReview,
        },
        { onUpdate: (partial) => setReviewRaw(partial) },
      );

      const parsed = safeParseJson<ReviewNotes>(raw);
      if (!parsed || !Array.isArray(parsed.suggestions)) {
        toast({
          title: 'Could not parse feedback',
          description: 'The model returned an unexpected format.',
        });
        return;
      }

      setReviewNotes(parsed);
      setLastReviewedText(textToReview);
      setReviewTab('priority');
      setReviewFilter('P0');
    } catch (error) {
      console.error('[ContentGenerationModalV3Baseline] Review failed:', error);
      setReviewRaw(
        `Feedback failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nTry again, or refresh the page.`,
      );
      toast({
        title: 'Feedback failed',
        description: 'Unable to generate feedback. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAcceptSuggestion = (s: ReviewSuggestion) => {
    if (!s.anchor.trim() || !s.replacement.trim()) return;
    const { next, occurrences } = applyAnchorReplacement(generatedContent, s.anchor, s.replacement);
    if (occurrences === 0) {
      toast({
        title: 'Anchor not found',
        description: 'Your text changed; this suggestion no longer matches exactly.',
      });
      return;
    }
    if (occurrences > 1) {
      toast({
        title: 'Applied to first match',
        description: 'The highlighted phrase appeared multiple times; only the first occurrence was replaced.',
      });
    }
    setGeneratedContent(next);
    setLastReviewedText('');
    setExpandedSuggestionId((prev) => (prev === s.id ? null : prev));
    setReviewNotes((prev) => {
      if (!prev) return prev;
      return { ...prev, suggestions: prev.suggestions.filter((existing) => existing.id !== s.id) };
    });
  };

  const handleRegenerateSuggestion = async (s: ReviewSuggestion) => {
    if (!reviewService.isAvailable()) return;
    if (!generatedContent.trim()) return;
    if (!s.anchor.trim()) return;
    if (!entityType) return;

    const kind = kindFromEntityType(entityType) as Exclude<ReviewContentKind, 'cover_letter_section'>;

    setRegeneratingSuggestionId(s.id);
    try {
      const raw = await reviewService.streamAlternativeSuggestionForContent({
        contentKind: kind,
        context: {
          userVoicePrompt: voice?.prompt,
          sectionTitle: gap?.paragraphId,
          workHistorySummary,
          savedSectionType: entityType === 'saved_section' ? savedSectionType : undefined,
        },
        text: generatedContent,
        anchor: s.anchor,
        currentReplacement: s.replacement,
      });

      const parsed = safeParseJson<{ why?: string; anchor?: string; replacement?: string }>(raw);
      if (!parsed || typeof parsed.replacement !== 'string') {
        toast({
          title: 'Could not regenerate',
          description: 'Failed to parse an alternative replacement.',
        });
        return;
      }

      setReviewNotes((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          suggestions: prev.suggestions.map((existing) =>
            existing.id === s.id
              ? {
                  ...existing,
                  why: String(parsed.why || existing.why),
                  anchor: String(parsed.anchor || existing.anchor),
                  replacement: String(parsed.replacement || existing.replacement),
                }
              : existing,
          ),
        };
      });
    } catch (error) {
      console.error('[ContentGenerationModalV3Baseline] Regenerate suggestion failed:', error);
      toast({
        title: 'Regenerate failed',
        description: 'Unable to generate a new suggestion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingSuggestionId(null);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) return;
        // Switching browser tabs can trigger Radix "dismiss" via focus-loss.
        // Ignore dismiss attempts while the document is hidden.
        if (typeof document !== 'undefined' && document.hidden) return;
        persistDraft({ clearIfEmpty: true });
        onClose();
      }}
    >
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        onEscapeKeyDown={(e) => {
          if (isGenerating || isReviewing) e.preventDefault();
        }}
        onInteractOutside={(e) => {
          if (isGenerating || isReviewing) e.preventDefault();
          // Prevent closing when the browser window/tab loses focus (Radix reports this as an "interact outside").
          const originalEvent = (e as any)?.detail?.originalEvent;
          if (originalEvent instanceof FocusEvent) e.preventDefault();
        }}
        onFocusOutside={(e) => {
          // Prevent the dialog from closing when the browser window/tab loses focus.
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content
          </DialogTitle>
          <DialogDescription>Generate content, then review and apply targeted improvements.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Existing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border p-3 text-sm text-muted-foreground whitespace-pre-wrap min-h-[140px]">
                {gap?.existingContent?.trim() ? gap.existingContent : 'No existing content.'}
              </div>

              {gap ? (
                <ContentGapBanner
                  title={gap.description}
                  description={gap.suggestion}
                  gaps={gap.gaps}
                  gapSummary={gap.gapSummary ?? null}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Draft</span>
                {isReviewing ? (
                  <Badge variant="secondary" className="gap-2">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Reviewing
                  </Badge>
                ) : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Edit freely then click “Get Feedback” for targeted suggestions.</p>

              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={10}
                className="min-h-[240px]"
                placeholder={isGenerating ? 'Generating…' : 'Generated content will appear here…'}
                disabled={isGenerating}
              />

              <div className="flex items-center justify-center gap-2">
                <Button variant="tertiary" onClick={() => void handleGenerate()} disabled={isGenerating || isReviewing}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => void handleReview()}
                  disabled={isGenerating || isReviewing || !canReview}
                >
                  {isReviewing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Getting Feedback
                    </>
                  ) : (
                    'Get Feedback'
                  )}
                </Button>
              </div>
              {!canReview && generatedContent.trim() && lastReviewedText.trim() ? (
                <p className="text-xs text-muted-foreground text-center">
                  Feedback is up to date. Make an edit to enable “Get Feedback”.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {(reviewNotes || reviewRaw.trim()) && (
          <div className="rounded-md border p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Draft Feedback</p>
            </div>

            <Tabs value={reviewTab} onValueChange={(v) => setReviewTab(v as ReviewTab)}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="priority">
                  Priority Fixes
                  {reviewNotes?.suggestions?.length ? (
                    <Badge variant="outline" className="text-xs ml-2">
                      {reviewNotes.suggestions.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="notes">Review Notes</TabsTrigger>
                <TabsTrigger value="questions">Open Questions</TabsTrigger>
              </TabsList>

              <TabsContent value="priority">
                {reviewNotes?.suggestions?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {(['P0', 'P1', 'P2', 'all'] as const).map((f) => (
                      <Button
                        key={f}
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewFilter(f)}
                        className={
                          reviewFilter === f
                            ? 'bg-muted text-foreground border border-border hover:bg-muted/80 hover:text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      >
                        {f === 'all' ? `All (${reviewCounts.all})` : `${f} (${(reviewCounts as any)[f]})`}
                      </Button>
                    ))}
                  </div>
                ) : null}

                {filteredSuggestions.length ? (
                  <div className="mt-3 space-y-2">
                    {filteredSuggestions.map((s) => {
                      const expanded = expandedSuggestionId === s.id;
                      const regenerating = regeneratingSuggestionId === s.id;
                      return (
                        <div key={s.id} className="flex items-stretch gap-3">
                          <div className="shrink-0 flex items-center justify-center">
                            <Badge
                              variant={s.priority === 'P0' ? 'destructive' : 'outline'}
                              className={s.priority === 'P0' ? 'rounded-full' : 'rounded-full text-muted-foreground'}
                            >
                              {s.priority}
                            </Badge>
                          </div>

                          <div className="flex-1 rounded-md border bg-background overflow-hidden">
                            <div
                              className="w-full overflow-hidden cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onClick={() => setExpandedSuggestionId((prev) => (prev === s.id ? null : s.id))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setExpandedSuggestionId((prev) => (prev === s.id ? null : s.id));
                                }
                              }}
                            >
                              <div className="flex items-center gap-2 w-full px-3 py-2">
                                <p className="text-sm text-muted-foreground whitespace-normal break-words flex-1 min-w-0">
                                  {s.replacement || s.why || 'Suggestion'}
                                </p>
                                <ChevronDown
                                  className={`h-4 w-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
                                />
                              </div>

                              {expanded ? (
                                <div className="px-3 pt-2 pb-3 space-y-3">
                                  {s.why ? (
                                    <div className="space-y-1">
                                      <p className="text-xs font-semibold">Issue found</p>
                                      <p className="text-xs text-muted-foreground">{s.why}</p>
                                    </div>
                                  ) : null}
                                  <div className="grid gap-2">
                                    <div>
                                      <p className="text-[11px] font-semibold">Text to replace</p>
                                      <p className="text-xs text-muted-foreground whitespace-pre-wrap">{s.anchor}</p>
                                    </div>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAcceptSuggestion(s)}
                              disabled={isGenerating || isReviewing}
                              className={expanded ? 'w-full justify-center' : undefined}
                            >
                              Accept
                            </Button>
                            {expanded ? (
                              <Button
                                variant="tertiary"
                                size="sm"
                                onClick={() => void handleRegenerateSuggestion(s)}
                                disabled={regenerating || isGenerating || isReviewing}
                                className="gap-2 w-full justify-center"
                              >
                                <RefreshCw className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`} />
                                Regenerate
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : reviewNotes ? (
                  <p className="text-xs text-muted-foreground mt-3">No suggestions in this priority.</p>
                ) : null}
              </TabsContent>

              <TabsContent value="notes">
                {reviewNotes?.summary ? (
                  <p className="text-sm text-muted-foreground">{reviewNotes.summary}</p>
                ) : reviewNotes ? (
                  <p className="text-sm text-muted-foreground">
                    No review notes were returned. Check Priority Fixes and Open Questions.
                  </p>
                ) : null}
                {reviewRaw.trim() && !reviewNotes ? (
                  <pre className="text-sm whitespace-pre-wrap font-sans">{reviewRaw.trim()}</pre>
                ) : null}
              </TabsContent>

              <TabsContent value="questions">
                {reviewNotes?.missingFacts?.length ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">Missing facts</p>
                    <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                      {reviewNotes.missingFacts.map((m, idx) => (
                        <li key={`${m}-${idx}`}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {reviewNotes?.questionsToConsider?.length ? (
                  <div className="space-y-1 mt-3">
                    <p className="text-xs font-semibold">Questions to consider</p>
                    <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                      {reviewNotes.questionsToConsider.map((q, idx) => (
                        <li key={`${q}-${idx}`}>{q}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <div className="-mx-6 -mb-6 border-t bg-background">
          <div className="p-6 flex items-center justify-end gap-3 w-full">
	            <Button
	              onClick={async () => {
	                if (!generatedContent.trim()) return;
	                try {
	                  await onApplyContent?.(generatedContent);
	                  if (draftKey) clearDraft(draftKey);
	                  if (closeOnApply) onClose();
	                } catch (error) {
	                  console.error('Error applying generated content:', error);
	                  toast({
                    title: 'Save failed',
                    description: 'Unable to apply content. Please try again.',
                    variant: 'destructive',
                  });
                }
              }}
              disabled={isGenerating || isReviewing || !generatedContent.trim()}
            >
              Apply Content
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
