import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GrammarTextarea } from '@/components/ui/grammar-textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, RefreshCw, ChevronDown } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import { SectionInspector, type SectionAttributionData } from '@/components/cover-letters/SectionInspector';
import { GapResolutionStreamingServiceV2, type JobContextV2 } from '@/services/gapResolutionStreamingServiceV2';
import {
  HilReviewNotesStreamingService,
  type ReviewNotes,
  type ReviewSuggestion,
} from '@/services/hilReviewNotesStreamingService';
import { useUserVoice } from '@/contexts/UserVoiceContext';
import { getApplicableStandards } from '@/config/contentStandards';

interface GapAnalysisV3 {
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

export interface ContentGenerationModalV3Props {
  isOpen: boolean;
  onClose: () => void;
  gap?: GapAnalysisV3 | null;
  onApplyContent?: (content: string, options?: { saveToSavedSections?: boolean; saveToStories?: boolean }) => void;
  allowSaveToSavedSections?: boolean;
  allowSaveToStories?: boolean;
  jobContext?: JobContextV2;
  workHistorySummary?: string;
  draftCoverageSummary?: string;
  draftOutline?: string;
  // UI choice: by default keep rating criteria out of UI to reduce redundancy.
  showQualityCriteriaInUI?: boolean;
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

function uniqLabels(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const label = String(v ?? '').trim();
    if (!label) continue;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

function buildStableAttribution(params: {
  baseCore: string[];
  basePref: string[];
  baseStandards: string[];
  raw?: any;
}): SectionAttributionData | null {
  const raw = params.raw;
  if (!raw) return null;

  const normaliseMetMap = (items: any[]) => {
    const map = new Map<string, string | undefined>();
    for (const it of Array.isArray(items) ? items : []) {
      const label = String(it?.label ?? '').trim();
      if (!label) continue;
      const evidence = String(it?.evidence ?? '').trim();
      map.set(label, evidence || undefined);
    }
    return map;
  };

  const normaliseUnmetSuggestionMap = (items: any[]) => {
    const map = new Map<string, string | undefined>();
    for (const it of Array.isArray(items) ? items : []) {
      const label = String(it?.label ?? '').trim();
      if (!label) continue;
      const suggestion = String(it?.suggestion ?? '').trim();
      map.set(label, suggestion || undefined);
    }
    return map;
  };

  const coreBase = uniqLabels(params.baseCore);
  const prefBase = uniqLabels(params.basePref);
  const standardsBase = uniqLabels(params.baseStandards);

  const coreMet = normaliseMetMap(raw?.coreReqs?.met);
  const prefMet = normaliseMetMap(raw?.prefReqs?.met);
  const standardsMet = normaliseMetMap(raw?.standards?.met);
  const standardsUnmetSuggestion = normaliseUnmetSuggestionMap(raw?.standards?.unmet);

  const asMet = (label: string, evidence?: string) => ({ id: label, label, evidence });
  const asUnmet = (label: string) => ({ id: label, label });
  const asUnmetStandard = (label: string) => ({
    id: label,
    label,
    suggestion: standardsUnmetSuggestion.get(label),
  });

  const resolveBase = (base: string[], metMap: Map<string, string | undefined>) => {
    if (!base.length) {
      const labels = uniqLabels(Array.from(metMap.keys()));
      return { met: labels.map((l) => asMet(l, metMap.get(l))), unmet: [] as Array<{ id: string; label: string }> };
    }
    return {
      met: base.filter((l) => metMap.has(l)).map((l) => asMet(l, metMap.get(l))),
      unmet: base.filter((l) => !metMap.has(l)).map((l) => asUnmet(l)),
    };
  };

  const resolveStandardsBase = (base: string[], metMap: Map<string, string | undefined>) => {
    if (!base.length) {
      const labels = uniqLabels(Array.from(metMap.keys()));
      return {
        met: labels.map((l) => asMet(l, metMap.get(l))),
        unmet: [] as Array<{ id: string; label: string; suggestion?: string }>,
      };
    }
    return {
      met: base.filter((l) => metMap.has(l)).map((l) => asMet(l, metMap.get(l))),
      unmet: base.filter((l) => !metMap.has(l)).map((l) => asUnmetStandard(l)),
    };
  };

  return {
    coreReqs: resolveBase(coreBase, coreMet),
    prefReqs: resolveBase(prefBase, prefMet),
    standards: resolveStandardsBase(standardsBase, standardsMet),
  };
}

function formatDelta(delta: number): string {
  if (!delta) return '(0)';
  return delta > 0 ? `(+${delta})` : `(${delta})`;
}

export function ContentGenerationModalV3({
  isOpen,
  onClose,
  gap,
  onApplyContent,
  allowSaveToSavedSections = false,
  allowSaveToStories = false,
  jobContext,
  workHistorySummary,
  draftCoverageSummary,
  draftOutline,
  showQualityCriteriaInUI = false,
}: ContentGenerationModalV3Props) {
  const { toast } = useToast();
  const { voice } = useUserVoice();

  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [reviewNotes, setReviewNotes] = useState<ReviewNotes | null>(null);
  const [reviewRaw, setReviewRaw] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('P0');
  const [reviewTab, setReviewTab] = useState<ReviewTab>('priority');
  const [lastReviewedText, setLastReviewedText] = useState('');
  const [candidateAttribution, setCandidateAttribution] = useState<SectionAttributionData | null>(null);
  const [expandedSuggestionId, setExpandedSuggestionId] = useState<string | null>(null);
  const [regeneratingSuggestionId, setRegeneratingSuggestionId] = useState<string | null>(null);

  const [saveToSavedSections, setSaveToSavedSections] = useState(false);
  const [saveToStories, setSaveToStories] = useState(false);

  const generationService = useMemo(() => new GapResolutionStreamingServiceV2(), []);
  const reviewService = useMemo(() => new HilReviewNotesStreamingService(), []);

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
      setCandidateAttribution(null);
      setExpandedSuggestionId(null);
      setRegeneratingSuggestionId(null);
      setSaveToSavedSections(false);
      setSaveToStories(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && gap && !generatedContent && !isGenerating) {
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
    return suggestions.filter(s => s.priority === reviewFilter);
  }, [reviewNotes, reviewFilter]);

  const canReview = useMemo(() => {
    const current = generatedContent.trim();
    const last = lastReviewedText.trim();
    if (!current) return false;
    if (!last) return true;
    return current !== last;
  }, [generatedContent, lastReviewedText]);

  const effectiveJobContext: JobContextV2 = useMemo(() => {
    return {
      role: jobContext?.role,
      company: jobContext?.company,
      coreRequirements: jobContext?.coreRequirements ?? gap?.addresses ?? [],
      preferredRequirements: jobContext?.preferredRequirements ?? [],
      jobDescriptionText: jobContext?.jobDescriptionText,
    };
  }, [jobContext, gap?.addresses]);

  const sectionCategory = useMemo(() => {
    const id = String(gap?.paragraphId ?? '').toLowerCase();
    if (id === 'intro') return 'intro' as const;
    if (id === 'closing') return 'closing' as const;
    return 'body' as const;
  }, [gap?.paragraphId]);

  const baseStandards = useMemo(() => getApplicableStandards(sectionCategory).map((s) => s.label), [sectionCategory]);

  const baseRequirementLists = useMemo(() => {
    const fromJobCore = uniqLabels(jobContext?.coreRequirements ?? []);
    const fromJobPref = uniqLabels(jobContext?.preferredRequirements ?? []);
    const fromGapCore = uniqLabels([
      ...(gap?.sectionAttribution?.coreReqs?.met?.map((i) => i?.label) ?? []),
      ...(gap?.sectionAttribution?.coreReqs?.unmet?.map((i) => i?.label) ?? []),
    ]);
    const fromGapPref = uniqLabels([
      ...(gap?.sectionAttribution?.prefReqs?.met?.map((i) => i?.label) ?? []),
      ...(gap?.sectionAttribution?.prefReqs?.unmet?.map((i) => i?.label) ?? []),
    ]);
    return {
      core: fromJobCore.length ? fromJobCore : fromGapCore,
      pref: fromJobPref.length ? fromJobPref : fromGapPref,
    };
  }, [jobContext?.coreRequirements, jobContext?.preferredRequirements, gap?.sectionAttribution]);

  const totals = useMemo(() => {
    return {
      core: baseRequirementLists.core.length,
      pref: baseRequirementLists.pref.length,
      standards: baseStandards.length,
    };
  }, [baseRequirementLists.core.length, baseRequirementLists.pref.length, baseStandards.length]);

  const gapForService = useMemo(() => {
    if (!gap) return null;
    return {
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
  }, [gap]);

  const handleGenerate = async () => {
    if (!gapForService) return;
    setIsGenerating(true);
    setGeneratedContent('');
    setReviewNotes(null);
    setReviewRaw('');
    setLastReviewedText('');
    setReviewTab('priority');
    setCandidateAttribution(null);
    setExpandedSuggestionId(null);

    let finalContent = '';
    try {
      finalContent = await generationService.streamGapResolutionV2(
        gapForService,
        effectiveJobContext,
        {
          userVoicePrompt: voice?.prompt,
          sectionTitle: gapForService.paragraphId,
          workHistorySummary,
          draftCoverageSummary,
          draftOutline,
        },
        {
          onUpdate: (partial) => setGeneratedContent(partial),
        },
        { allowNeedsInputPlaceholders: false },
      );
    } catch (error) {
      console.error('[ContentGenerationModalV3] Generation failed:', error);
      toast({
        title: 'Generation failed',
        description: 'Unable to generate content. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }

    // Auto-review after initial generation so the user immediately gets questions/suggestions (without rewriting).
    if (gapForService && finalContent.trim()) {
      setGeneratedContent(finalContent);
      void handleReview(finalContent);
    }
  };

  const handleReview = async (textOverride?: string) => {
    if (!gapForService) return;
    const text = (textOverride ?? generatedContent).trim();
    if (!text) return;
    if (!reviewService.isAvailable()) {
      toast({
        title: 'Review unavailable',
        description: 'OpenAI key is not configured.',
        variant: 'destructive',
      });
      return;
    }

    setIsReviewing(true);
    setReviewNotes(null);
    setReviewRaw('');
    setReviewFilter('P0');
    setReviewTab('priority');
    setCandidateAttribution(null);
    setExpandedSuggestionId(null);

    try {
      const raw = await reviewService.streamReviewNotes(
        {
          originalGap: gapForService,
          job: effectiveJobContext,
          context: {
            userVoicePrompt: voice?.prompt,
            sectionTitle: gapForService.paragraphId,
            workHistorySummary,
            draftCoverageSummary,
            draftOutline,
          },
          text,
        },
        { onUpdate: setReviewRaw },
      );

      setLastReviewedText(text);
      const parsed = safeParseJson<ReviewNotes>(raw);
      if (!parsed || !Array.isArray(parsed.suggestions)) {
        toast({
          title: 'Review incomplete',
          description: 'Could not parse structured suggestions. Showing raw feedback.',
        });
        setReviewNotes(null);
        setReviewTab('notes');
        return;
      }

      const suggestions: ReviewSuggestion[] = (parsed.suggestions || [])
        .filter((s: any) => s && typeof s.anchor === 'string' && typeof s.replacement === 'string')
        .slice(0, 7)
        .map((s: any, idx: number) => ({
          id: String(s.id || `s${idx + 1}`),
          priority: s.priority === 'P0' || s.priority === 'P1' || s.priority === 'P2' ? s.priority : 'P1',
          why: String(s.why || '').trim(),
          anchor: String(s.anchor || '').trim(),
          replacement: String(s.replacement || '').trim(),
        }))
        .filter(s => s.anchor.length >= 8 && s.replacement.length > 0);

      const rawAttribution = (parsed as any)?.sectionAttribution;
      if (rawAttribution && rawAttribution.coreReqs && rawAttribution.prefReqs && rawAttribution.standards) {
        const stable = buildStableAttribution({
          baseCore: baseRequirementLists.core,
          basePref: baseRequirementLists.pref,
          baseStandards,
          raw: rawAttribution,
        });
        if (stable) setCandidateAttribution(stable);
      }

      setReviewNotes({
        summary: parsed.summary ? String(parsed.summary) : undefined,
        suggestions,
        questionsToConsider: Array.isArray(parsed.questionsToConsider) ? parsed.questionsToConsider.map(String) : [],
        missingFacts: Array.isArray(parsed.missingFacts) ? parsed.missingFacts.map(String) : [],
      });
      setReviewFilter('P0');
      setReviewTab('priority');
    } catch (error) {
      console.error('[ContentGenerationModalV3] Review failed:', error);
      toast({
        title: 'Review failed',
        description: 'Unable to generate review notes. Please try again.',
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
    setExpandedSuggestionId(prev => (prev === s.id ? null : prev));
    setCandidateAttribution(null);
    setReviewNotes(prev => {
      if (!prev) return prev;
      return { ...prev, suggestions: prev.suggestions.filter(existing => existing.id !== s.id) };
    });
  };

  const handleRegenerateSuggestion = async (s: ReviewSuggestion) => {
    if (!gapForService) return;
    if (!generatedContent.trim()) return;
    if (!s.anchor.trim()) return;
    if (!reviewService.isAvailable()) return;

    setRegeneratingSuggestionId(s.id);
    try {
      const raw = await reviewService.streamAlternativeSuggestion({
        job: effectiveJobContext,
        context: {
          userVoicePrompt: voice?.prompt,
          sectionTitle: gapForService.paragraphId,
          workHistorySummary,
          draftCoverageSummary,
          draftOutline,
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

      setReviewNotes(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          suggestions: prev.suggestions.map(existing =>
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
      console.error('[ContentGenerationModalV3] Regenerate suggestion failed:', error);
      toast({
        title: 'Regenerate failed',
        description: 'Unable to generate a new suggestion. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setRegeneratingSuggestionId(null);
    }
  };

  const stableExistingAttribution = useMemo(() => {
    if (!gap?.sectionAttribution) return null;
    return buildStableAttribution({
      baseCore: baseRequirementLists.core,
      basePref: baseRequirementLists.pref,
      baseStandards,
      raw: gap.sectionAttribution,
    });
  }, [gap?.sectionAttribution, baseRequirementLists.core, baseRequirementLists.pref, baseStandards]);

  const reqsCounts = useMemo(() => {
    const existing = stableExistingAttribution;
    const draft = candidateAttribution;
    const existingCounts = {
      core: existing?.coreReqs.met.length ?? 0,
      pref: existing?.prefReqs.met.length ?? 0,
      standards: existing?.standards.met.length ?? 0,
    };
    const draftCounts = {
      core: draft?.coreReqs.met.length ?? existingCounts.core,
      pref: draft?.prefReqs.met.length ?? existingCounts.pref,
      standards: draft?.standards.met.length ?? existingCounts.standards,
    };
    return {
      existing: existingCounts,
      draft: draftCounts,
      delta: {
        core: draftCounts.core - existingCounts.core,
        pref: draftCounts.pref - existingCounts.pref,
        standards: draftCounts.standards - existingCounts.standards,
      },
    };
  }, [stableExistingAttribution, candidateAttribution]);

  const changedLabels = useMemo(() => {
    const existing = stableExistingAttribution;
    const draft = candidateAttribution;
    if (!draft) {
      return {
        changedToMet: [] as string[],
        changedToUnmet: [] as string[],
        changedStandardsToMet: [] as string[],
        changedStandardsToUnmet: [] as string[],
      };
    }

    // If we don't have a baseline attribution, treat all "met" labels as new.
    if (!existing) {
      return {
        changedToMet: uniqLabels([
          ...draft.coreReqs.met.map((i) => i.label),
          ...draft.prefReqs.met.map((i) => i.label),
        ]),
        changedToUnmet: [],
        changedStandardsToMet: uniqLabels(draft.standards.met.map((i) => i.label)),
        changedStandardsToUnmet: [],
      };
    }

    const existingMetCore = new Set(existing.coreReqs.met.map((i) => i.label));
    const existingMetPref = new Set(existing.prefReqs.met.map((i) => i.label));
    const existingMetStandards = new Set(existing.standards.met.map((i) => i.label));

    const draftMetCore = new Set(draft.coreReqs.met.map((i) => i.label));
    const draftMetPref = new Set(draft.prefReqs.met.map((i) => i.label));
    const draftMetStandards = new Set(draft.standards.met.map((i) => i.label));

    const allReqs = uniqLabels([...baseRequirementLists.core, ...baseRequirementLists.pref]);
    const allStandards = uniqLabels(baseStandards);

    const changedToMet: string[] = [];
    const changedToUnmet: string[] = [];
    for (const label of allReqs) {
      const wasMet = existingMetCore.has(label) || existingMetPref.has(label);
      const isMet = draftMetCore.has(label) || draftMetPref.has(label);
      if (wasMet === isMet) continue;
      if (isMet) changedToMet.push(label);
      else changedToUnmet.push(label);
    }

    const changedStandardsToMet: string[] = [];
    const changedStandardsToUnmet: string[] = [];
    for (const label of allStandards) {
      const wasMet = existingMetStandards.has(label);
      const isMet = draftMetStandards.has(label);
      if (wasMet === isMet) continue;
      if (isMet) changedStandardsToMet.push(label);
      else changedStandardsToUnmet.push(label);
    }

    return { changedToMet, changedToUnmet, changedStandardsToMet, changedStandardsToUnmet };
  }, [
    stableExistingAttribution,
    candidateAttribution,
    baseRequirementLists.core,
    baseRequirementLists.pref,
    baseStandards,
  ]);

  if (!gap) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Content
          </DialogTitle>
          <DialogDescription>Generate content, then review and apply targeted improvements.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
	          <Card className="flex flex-col">
	            <CardHeader className="pb-3">
	              <CardTitle className="text-lg">Existing</CardTitle>
	            </CardHeader>
	            <CardContent className="pt-0 flex-1 flex flex-col gap-4">
	              <div className="flex-1 min-h-[280px]">
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

	              {/* Reqs-met summary moved to a single full-width component below */}

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

	          <Card className="flex flex-col">
	            <CardHeader className="pb-3 flex flex-row items-center justify-between">
	              <CardTitle className="text-lg">Draft</CardTitle>
	              <div className="flex items-center gap-2">
	                {(isGenerating || isReviewing) && (
	                  <Badge variant="outline" className="text-xs">
	                    <RefreshCw className="h-3 w-3 mr-1 inline animate-spin" />
	                    {isGenerating ? 'Generating' : 'Reviewing'}
	                  </Badge>
	                )}
	              </div>
	              </CardHeader>
	            <CardContent className="pt-0 flex-1 flex flex-col gap-4">
	              <p className="text-xs text-muted-foreground">
	                Edit freely then Click “Get Feedback” for targeted suggestions.
	              </p>
              <GrammarTextarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                className="flex-1 min-h-[280px]"
                placeholder="Generated content will appear here…"
              />

              <div className="flex justify-end gap-3">
                <Button
                  variant="tertiary"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating || isReviewing}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
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

	              {/* Reqs-met summary moved to a single full-width component below */}
	            </CardContent>
	          </Card>
	          </div>

          {candidateAttribution ? (
            <div className="rounded-md border p-3 bg-muted/20">
              <SectionInspector
                data={candidateAttribution}
                defaultOpen={false}
                totalCoreReqs={totals.core}
                totalPrefReqs={totals.pref}
                totalStandards={totals.standards}
                deltaCoreReqs={reqsCounts.delta.core}
                deltaPrefReqs={reqsCounts.delta.pref}
                deltaStandards={reqsCounts.delta.standards}
                changedToMetLabels={changedLabels.changedToMet}
                changedToUnmetLabels={changedLabels.changedToUnmet}
                changedStandardsToMetLabels={changedLabels.changedStandardsToMet}
                changedStandardsToUnmetLabels={changedLabels.changedStandardsToUnmet}
              />
            </div>
          ) : null}

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
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewFilter('P0')}
                        className={
                          reviewFilter === 'P0'
                            ? 'bg-muted text-foreground border border-border hover:bg-muted/80 hover:text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      >
                        P0 ({reviewCounts.P0})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewFilter('P1')}
                        className={
                          reviewFilter === 'P1'
                            ? 'bg-muted text-foreground border border-border hover:bg-muted/80 hover:text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      >
                        P1 ({reviewCounts.P1})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewFilter('P2')}
                        className={
                          reviewFilter === 'P2'
                            ? 'bg-muted text-foreground border border-border hover:bg-muted/80 hover:text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      >
                        P2 ({reviewCounts.P2})
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReviewFilter('all')}
                        className={
                          reviewFilter === 'all'
                            ? 'bg-muted text-foreground border border-border hover:bg-muted/80 hover:text-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        }
                      >
                        All ({reviewCounts.all})
                      </Button>
                    </div>
                  ) : null}

                  {reviewNotes?.suggestions?.length ? (
                    filteredSuggestions.length ? (
                      <div className="w-full max-w-full mt-3 space-y-2">
                        {filteredSuggestions.map((s) => {
                          const regenerating = regeneratingSuggestionId === s.id;
                          const expanded = expandedSuggestionId === s.id;

                          return (
                            <div key={s.id} className="w-full max-w-full overflow-hidden">
                              <div className="flex items-center gap-3 w-full max-w-full">
                                <Badge variant={s.priority === 'P0' ? 'destructive' : 'outline'} className="text-[10px] shrink-0">
                                  {s.priority}
                                </Badge>

                                <div
                                  className="rounded-md border bg-background flex-1 min-w-0 w-full max-w-full overflow-hidden cursor-pointer"
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => setExpandedSuggestionId(prev => (prev === s.id ? null : s.id))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setExpandedSuggestionId(prev => (prev === s.id ? null : s.id));
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
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-3">No suggestions in this priority.</p>
                    )
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
        </div>

        <div className="-mx-6 -mb-6 border-t bg-background">
          <div className="p-6 flex items-center justify-between gap-3 w-full">
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
                onClick={() => {
                  if (!generatedContent.trim()) return;
                  onApplyContent?.(generatedContent, { saveToSavedSections, saveToStories });
                  onClose();
                }}
                disabled={isGenerating || isReviewing || !generatedContent.trim()}
              >
                Apply Content
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
