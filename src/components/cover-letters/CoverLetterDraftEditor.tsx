import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { GrammarTextarea } from '@/components/ui/grammar-textarea';
import { GripVertical, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MatchMetricsToolbar } from './MatchMetricsToolbar';
import { FinalCheckPanel } from './FinalCheckPanel';
import { ContentCard } from '@/components/shared/ContentCard';
import { SectionInsertButton } from '@/components/template-blurbs/SectionInsertButton';
import { DraftProgressBanner } from './DraftProgressBanner';
import { computeSectionAttribution } from './useSectionAttribution';
import { getUnresolvedRatingCriteria } from './useMatchMetricsDetails';
import { getApplicableStandards } from '@/config/contentStandards';
import { parseLlmSlotTokens } from '@/lib/coverLetterSlots';
import type { CoverLetterDraft, JobDescriptionRecord } from '@/types/coverLetters';
import type { MatchMetricsData } from './useMatchMetricsDetails';
import type { SectionGapInsight } from '@/types/coverLetters';
import { useUiZoom } from "@/hooks/useUiZoom";
import { FloatingZoomControls } from "@/components/shared/FloatingZoomControls";

/**
 * Phase 1: Extract shared editor component from CreateModal
 * 
 * This component handles the visual editing of cover letter drafts.
 * It renders:
 * - Left sidebar: MatchMetricsToolbar
 * - Right area: ContentCards for each section with inline editing
 * 
 * State management remains in parent (CreateModal/EditModal)
 * All callbacks are passed as props
 */

interface CoverLetterSection {
  id: string;
  type: string;
  slug?: string;
  title: string;
  content: string;
  isEnhanced?: boolean;
  order?: number;
}

interface CoverLetterDraftEditorProps {
  // Core data
  draft: CoverLetterDraft | null;
  jobDescription?: JobDescriptionRecord | null;
  matchMetrics: MatchMetricsData | null;
  
  // UNIFIED LOADING: Streaming/skeleton props
  isStreaming?: boolean; // Shows skeleton when true, content when false
  jobState?: any;
  templateSections?: CoverLetterSection[];
  
  // UNIFIED LOADING: Progress banner props
  showProgressBanner?: boolean; // Banner visibility
  progressPercent?: number; // 0-100 progress
  progressState?: {
    hasAnalysis: boolean;
    isJobStreaming: boolean;
    isGeneratingDraft: boolean;
    aPhaseInsights?: any; // Task 6: A-phase insights for stage labels
  };
  
  // Task 7: A-phase streaming insights for toolbar accordions
  aPhaseInsights?: any; // From useAPhaseInsights(jobState)
  toolbarIsLoading?: boolean; // Keep toolbar in Phase A streaming mode

  // UI state
  isPostHIL?: boolean;
  metricsLoading?: boolean;
  generationError?: string | null;
  jobInputError?: string | null;
  
  // Section editing state (tracked by parent)
  sectionDrafts: Record<string, string>; // sectionId -> edited content
  savingSections: Record<string, boolean>; // sectionId -> isSaving
  sectionFocusContent: Record<string, string>; // sectionId -> content at focus time
  
  // Callbacks for section changes
  onSectionChange: (sectionId: string, newContent: string) => void;
  onSectionSave: (sectionId: string) => Promise<void>;
  onSectionFocus: (sectionId: string, content: string) => void;
  onSectionBlur: (sectionId: string, newContent: string, jobDescriptionRecord: JobDescriptionRecord | null, goals: any, draft: CoverLetterDraft | null) => Promise<void>;
  
  // Callbacks for section operations
  onSectionDelete: (sectionId: string) => Promise<void>;
  onInsertBetweenSections: (insertIndex: number) => void;
  onInsertFromLibrary: (sectionId: string, sectionType: 'intro' | 'body' | 'closing', sectionIndex: number) => void;
  onReorderSections: (fromIndex: number, toIndex: number) => void;
  onSaveSavedSectionVariation?: (section: CoverLetterDraftSection, content: string) => void;
  
  // Callbacks for content generation (HIL)
  onEnhanceSection: (gapData: any) => void;
  onAddMetrics: (sectionId?: string) => void;
  onEditGoals: () => void;
  onRefreshInsights?: () => void;
  isRefreshLoading?: boolean;
  isRefreshDisabled?: boolean;
  refreshStartedAt?: string | null;
}

const hasGapSignalText = (gap: any): boolean =>
  [
    gap?.issue,
    gap?.label,
    gap?.recommendation,
    gap?.rationale,
    gap?.description,
    gap?.requirement,
    gap?.evidenceQuote,
    gap?.hiringRisk,
    gap?.whyNow,
  ].some((value) => typeof value === 'string' && value.trim().length > 0);

const isActionableGap = (gap: any): boolean => gap?.status === 'unmet' && hasGapSignalText(gap);

export function CoverLetterDraftEditor({
  draft,
  jobDescription,
  matchMetrics,
  isStreaming = false,
  jobState = null,
  templateSections = [],
  showProgressBanner = false,
  progressPercent = 0,
  progressState,
  aPhaseInsights,
  toolbarIsLoading = false,
  isPostHIL = false,
  metricsLoading = false,
  generationError = null,
  jobInputError = null,
  sectionDrafts,
  savingSections,
  sectionFocusContent,
  onSectionChange,
  onSectionSave,
  onSectionFocus,
  onSectionBlur,
  onSectionDelete,
  onInsertBetweenSections,
  onInsertFromLibrary,
  onReorderSections,
  onSaveSavedSectionVariation,
  onEnhanceSection,
  onAddMetrics,
  onEditGoals,
  onRefreshInsights,
  isRefreshLoading = false,
  isRefreshDisabled = false,
  refreshStartedAt = null,
}: CoverLetterDraftEditorProps) {
  const [dismissedGapSections, setDismissedGapSections] = useState<Set<string>>(new Set());
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isFinalCheckOpen, setIsFinalCheckOpen] = useState(false);

  useEffect(() => {
    setDismissedGapSections(new Set());
  }, [draft?.id]);

  useEffect(() => {
    setIsFinalCheckOpen(false);
  }, [draft?.id]);
  const { zoomLevel, minZoom, maxZoom, zoomIn, zoomOut } = useUiZoom({
    storageKey: "uiZoom:coverLetterDraft",
    minZoom: 30,
    maxZoom: 100,
    step: 10,
    defaultZoom: 100
  });

	  // ============================================================================
	  // DRAFT-ONLY DATA (NO STREAMING)
	  // ============================================================================
	  // Use draft directly (no streaming fallback, no mixing)
	  const effectiveEnhancedMatchData = draft?.enhancedMatchData || {};
  
  // Sections to render - priority order
  // 1. If draft exists → use draft.sections (real content)
  // 2. Else if templateSections provided → use template structure (skeleton)
  // 3. Else → fallback to hardcoded placeholders
  const sectionsToRender = draft?.sections && draft.sections.length > 0
    ? draft.sections
    : templateSections.length > 0
    ? templateSections.map((section, idx) => ({
        ...section,
        id: section.id || `skeleton-${idx}`,
        content: '',
      }))
    : [
        { id: 'intro-placeholder', title: 'Introduction', type: 'intro', slug: 'intro', content: '' },
        { id: 'body-placeholder', title: 'Experience', type: 'body', slug: 'experience', content: '' },
        { id: 'closing-placeholder', title: 'Closing', type: 'closing', slug: 'closing', content: '' },
      ];
  
  // Allow users to edit draft text while Phase B (metrics/gaps) is still computing.
  // Only block editing while the draft itself is being assembled (streaming/skeleton).
  const isLoadingSection = isStreaming;
  const isToolbarLoading = toolbarIsLoading || metricsLoading || isStreaming;

  // Calculate job-level totals for requirement denominators
  const totalCoreReqs = draft?.enhancedMatchData?.coreRequirementDetails?.length ?? 0;
  const totalPrefReqs = draft?.enhancedMatchData?.preferredRequirementDetails?.length ?? 0;

  // Extract content standards from draft
  const contentStandards = draft?.llmFeedback?.contentStandards as any;

  /**
   * DRAFT-ONLY GAP MATCHING
   * Get gaps for a section from draft.enhancedMatchData.sectionGapInsights
   * Match by section.id (preferred), fallback to slug/title for legacy drafts
   */
  const getSectionGapInsights = (sectionId: string, sectionSlug: string, sectionIndex: number) => {
    const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
    const toIssueFallback = (value?: string) => {
      const raw = String(value || '').trim();
      if (!raw) return null;
      const cleaned = raw.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) return null;
      const lower = cleaned.toLowerCase();
      if (lower.startsWith('missing ') || lower.startsWith('lacks ') || lower.startsWith('weak ') || lower.startsWith('no ') || lower.startsWith('low ')) {
        return capitalize(cleaned);
      }
      return `Missing ${lower}`;
    };
    const buildHeadline = (gap: any) => {
      const issue = typeof gap?.issue === 'string' ? gap.issue.trim() : '';
      if (issue) {
        const normalized = issue.replace(/\s+/g, ' ').trim();
        const issueLooksValid =
          normalized.length > 0 &&
          normalized.length <= 80 &&
          /^(missing|lacks|weak|no|low)/i.test(normalized);
        if (issueLooksValid) return capitalize(normalized);
      }
      return (
        toIssueFallback(gap?.rubricCriterionId) ||
        toIssueFallback(gap?.label) ||
        toIssueFallback(gap?.requirement) ||
        'Gap identified'
      );
    };
    // Get all gap insights from draft (ONLY source)
    const allInsights = draft?.enhancedMatchData?.sectionGapInsights || [];
    
    // Match by section.id first (preferred)
    let sectionInsight = allInsights.find((insight: any) => insight.sectionId === sectionId);
    
    // Fallback: match by slug or title for legacy drafts (temporary compatibility)
    if (!sectionInsight) {
      sectionInsight = allInsights.find((insight: any) => 
        insight.sectionSlug === sectionSlug || 
        insight.sectionSlug === sectionId.split('-')[0] // e.g., "intro-1" → "intro"
      );
    }

    // Fallback: positional match (pipeline may not preserve ids/slugs)
    if (!sectionInsight && allInsights.length > 0) {
      sectionInsight = allInsights[sectionIndex] || allInsights[0];
    }
    
    const requirementGaps = (sectionInsight?.requirementGaps || []).filter(isActionableGap);
    
    // Transform to UI format
    const gaps = requirementGaps.map((gap: any) => ({
      id: gap.id,
      headline: buildHeadline(gap),
      suggestion: gap.recommendation || gap.suggestion,
      explanation: gap.rationale || gap.currentEvidence,
      description: gap.rationale || gap.currentEvidence,
    }));

    return {
      promptSummary: sectionInsight?.promptSummary || null,
      gaps,
      isLoading: false,
    };
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    index: number,
    sectionId: string,
  ) => {
    dragIndexRef.current = index;
    setDragOverIndex(index);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', sectionId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === index) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }
    onReorderSections(fromIndex, index);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragOverEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== sectionsToRender.length) {
      setDragOverIndex(sectionsToRender.length);
    }
  };

  const handleDropAtEnd = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null) {
      setDragOverIndex(null);
      return;
    }
    onReorderSections(fromIndex, sectionsToRender.length);
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Toolbar */}
      <div className="bg-card flex-shrink-0">
        {isFinalCheckOpen && draft?.id ? (
          <FinalCheckPanel
            draftId={draft.id}
            onClose={() => setIsFinalCheckOpen(false)}
          />
        ) : (
          <MatchMetricsToolbar
            metrics={matchMetrics} // Draft-only metrics
            isPostHIL={isPostHIL}
            isLoading={isToolbarLoading}
            enhancedMatchData={effectiveEnhancedMatchData} // Draft-only enhanced data
            contentStandards={contentStandards || null}
            goNoGoAnalysis={undefined}
            jobDescription={jobDescription ?? undefined}
            draftId={draft?.id}
            draftUpdatedAt={draft?.updatedAt}
            sections={(() => {
              const sectionList = sectionsToRender.map(s => ({ id: s.id, type: s.type }));
              console.log('[TOOLBAR] Passing sections to toolbar:', {
                count: sectionList.length,
                ids: sectionList.map(s => s.id),
                hasEnhancedMatchData: !!effectiveEnhancedMatchData,
                hasSectionGapInsights: !!effectiveEnhancedMatchData?.sectionGapInsights,
                gapSectionIds: effectiveEnhancedMatchData?.sectionGapInsights?.map(g => g.sectionId) || [],
              });
              return sectionList;
            })()}
            aPhaseInsights={aPhaseInsights} // Task 7: A-phase streaming insights
            draftMws={draft?.mws ?? ((draft?.llmFeedback as any)?.mws ?? undefined)} // Persisted MwS from draft (fallback when streaming not available)
            onEditGoals={onEditGoals}
            onRefreshInsights={onRefreshInsights}
            isRefreshLoading={isRefreshLoading}
            isRefreshDisabled={isRefreshDisabled}
            refreshStartedAt={refreshStartedAt}
            phaseBStatus={(draft?.llmFeedback as any)?.phaseB ?? null}
            dismissedGapSectionIds={dismissedGapSections}
            onOpenFinalCheck={() => setIsFinalCheckOpen(true)}
            onEnhanceSection={(sectionId, requirement, ratingCriteria) => {
            // Open section enhancement flow with rating criteria if provided
            const section = draft?.sections.find(s => s.id === sectionId);
            if (section) {
              const existingContent = sectionDrafts[sectionId] ?? section.content ?? '';
              const paragraphIdMap: Record<string, string> = {
                'intro': 'intro',
                'introduction': 'intro',
                'paragraph': 'experience',
                'experience': 'experience',
                'closer': 'closing',
                'closing': 'closing',
                'signature': 'closing'
              };
              const paragraphId = paragraphIdMap[section.type] || paragraphIdMap[section.slug] || 'experience';
              
              // Get requirement gaps from draft
              const sectionInsight = draft?.enhancedMatchData?.sectionGapInsights?.find(
                (insight: any) => insight.sectionId === sectionId || insight.sectionSlug === section.slug || insight.sectionSlug === section.type
              );
              const requirementGaps = sectionInsight?.requirementGaps
                ?.filter(isActionableGap)
                ?.map((gap: any) => ({
                  id: gap.id,
                  headline: buildHeadline(gap),
                  suggestion: gap.recommendation,
                  explanation: gap.rationale,
                  description: gap.rationale,
                })) || [];
              
              // Convert rating criteria to gap format if provided
              const gapsFromRating = ratingCriteria?.map(rc => ({
                id: rc.id,
                title: rc.label,
                description: `${rc.description}. ${rc.suggestion}`,
              })) || [];
              
              // Keep requirement gaps and rating criteria gaps separate
              const gapSummaryParts: string[] = [];
              if (requirementGaps.length > 0) {
                gapSummaryParts.push(`${requirementGaps.length} requirement gap${requirementGaps.length > 1 ? 's' : ''}`);
              }
              if (gapsFromRating.length > 0) {
                gapSummaryParts.push(`${gapsFromRating.length} content quality criteria: ${gapsFromRating.map(g => g.title).join(', ')}`);
              }
              
              onEnhanceSection({
                id: requirement ? `section-${sectionId}-${requirement}` : `section-${sectionId}-enhancement`,
                type: 'content-enhancement',
                severity: 'medium',
                description: requirement || `Enhance ${section.title || section.type} section to improve content quality score`,
                suggestion: requirement || `Add detail that directly addresses content quality criteria`,
                origin: 'ai',
                section_id: sectionId,
                paragraphId: paragraphId,
                existingContent: existingContent,
                gaps: requirementGaps,
                ratingCriteriaGaps: gapsFromRating,
                gapSummary: gapSummaryParts.length > 0 ? gapSummaryParts.join(' • ') : null,
              });
            }
            }}
            onAddMetrics={onAddMetrics}
            className="h-full border-0"
          />
        )}
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pl-6 pb-6">
          {(generationError || jobInputError) && (
            <Alert variant="destructive">
              <AlertTitle>Cover letter generation issue</AlertTitle>
              <AlertDescription>
                {generationError ?? jobInputError ?? 'Unable to generate cover letter.'}
              </AlertDescription>
            </Alert>
          )}

          {/* UNIFIED LOADING: Step-based progress banner for entire generation flow */}
          {showProgressBanner && (
            <DraftProgressBanner
              // A-phase stage flags
              aPhaseStageFlags={aPhaseInsights?.stageFlags}
              // A-phase data for results
              aPhaseData={{
                jdRequirementSummary: aPhaseInsights?.jdRequirementSummary,
                mws: aPhaseInsights?.mws,
              }}
              // B-phase state
              hasDraftSections={Boolean(draft?.sections?.length)}
              sectionCount={draft?.sections?.length}
              hasMetrics={Boolean(effectiveEnhancedMatchData?.coreRequirementDetails)}
              coreRequirementsMet={effectiveEnhancedMatchData?.coreRequirementDetails?.filter((r: any) => r.demonstrated).length}
              coreRequirementsTotal={effectiveEnhancedMatchData?.coreRequirementDetails?.length}
              overallScore={matchMetrics?.overallScore}
            />
          )}

			          <div
			            className="origin-top"
			            style={{
			              transform: `scale(${zoomLevel / 100})`,
			              transformOrigin: "top left",
			              width: `${100 / (zoomLevel / 100)}%`
			            }}
			          >
		            <div className="space-y-4">
              {/* Top controls: Add section (centered) */}
              <div className="flex items-center justify-center">
                {/* Add Section button - centered */}
                {!isLoadingSection && (
                  <SectionInsertButton onClick={() => onInsertBetweenSections(0)} />
                )}
              </div>
            
            {sectionsToRender.map((section, sectionIndex) => {
              const editedContent = sectionDrafts[section.id] ?? section.content;
              const isDirty = editedContent !== section.content;
              const isSaving = !!savingSections[section.id];
              
              const { promptSummary, gaps: gapObjects } = getSectionGapInsights(
                section.id,
                section.slug || section.type,
                sectionIndex,
              );
              const gapInsightsReady = draft?.enhancedMatchData?.sectionGapInsights !== undefined;
              const hasGaps = gapInsightsReady ? gapObjects.length > 0 : false;
              const isGapDismissed = dismissedGapSections.has(section.id);
              const sourceMeta = section.source as { kind?: string; entityId?: string | null; itemId?: string | null; contentType?: string | null } | null;
              const sourceKind = sourceMeta?.kind;
              const sourceEntityId = sourceMeta?.entityId ?? sourceMeta?.itemId ?? null;
              const isSavedSectionSource =
                (sourceKind === 'saved_section' ||
                  sourceKind === 'template_static' ||
                  (sourceKind === 'library' && sourceMeta?.contentType === 'saved_section')) &&
                Boolean(sourceEntityId);

              // Strip trailing periods from gap summary for cover letters
              const cleanGapSummary = promptSummary ? promptSummary.replace(/\.+$/, '') : null;

              // Calculate section category (intro/body/closing) based on slug, type, or position
              const sectionCategory: 'intro' | 'body' | 'closing' = (() => {
                if (section.slug === 'intro' || section.slug === 'introduction') return 'intro';
                if (section.slug === 'closing' || section.slug === 'conclusion' || section.slug === 'closer') return 'closing';
                if (section.type === 'intro' || section.type === 'introduction') return 'intro';
                if (section.type === 'closing' || section.type === 'conclusion' || section.type === 'closer') return 'closing';
                if (sectionIndex === 0) return 'intro';
                if (sectionIndex === sectionsToRender.length - 1) return 'closing';
                return 'body';
              })();
              const sectionTypeForStandards = sectionCategory;

              // Compute section-level attribution from draft
              // IMPORTANT: while Phase B is still computing, do not show "0 core / 0 pref / 0 standards"
              // because it reads like a real result. Use skeleton until we have the necessary attribution inputs.
              const attributionReady = Boolean(
                draft?.enhancedMatchData?.sectionGapInsights !== undefined ||
                  contentStandards?.perSection?.length ||
                  (matchMetrics?.ratingCriteria && matchMetrics.ratingCriteria.length > 0),
              );
              const { attribution: sectionAttribution } = computeSectionAttribution({
                sectionId: section.id,
                sectionType: section.slug || section.type,
                sectionCategory, // Pass pre-computed category for accurate Content Standards
                enhancedMatchData: draft?.enhancedMatchData,
                ratingCriteria: matchMetrics?.ratingCriteria,
                contentStandards: contentStandards || null,
              });

              // Format section title: replace dashes with spaces and capitalize first letter
              const formattedTitle = section.title
                ? section.title.replace(/-/g, ' ').charAt(0).toUpperCase() + section.title.replace(/-/g, ' ').slice(1)
                : '';

              const totalStandardsForSection = getApplicableStandards(sectionCategory).length;

              return (
                <div
                  key={section.id}
                  className={cn(
                    'relative',
                    dragOverIndex === sectionIndex && 'ring-2 ring-primary/40 rounded-xl'
                  )}
                  onDragOver={(event) => handleDragOver(event, sectionIndex)}
                  onDrop={(event) => handleDrop(event, sectionIndex)}
                >
	                  <ContentCard
                    title={formattedTitle}
                    content={undefined} // Don't show preview when editable (Textarea displays it)
                    titleLeading={
                      <span
                        className="cursor-grab text-muted-foreground"
                        draggable
                        onDragStart={(event) => handleDragStart(event, sectionIndex, section.id)}
                        onDragEnd={handleDragEnd}
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-4 w-4" />
                      </span>
                    }
                    sectionAttributionData={attributionReady ? sectionAttribution : undefined}
                    totalCoreReqs={totalCoreReqs}
                    totalPrefReqs={totalPrefReqs}
                    totalStandards={totalStandardsForSection}
                    tagsLabel={undefined}
	                    hasGaps={gapInsightsReady ? hasGaps : false}
	                    gaps={gapInsightsReady ? gapObjects : []}
	                    gapSummary={gapInsightsReady ? cleanGapSummary : null}
	                    isGapResolved={gapInsightsReady ? !hasGaps || isGapDismissed : false}
                      onDismissGap={
                        gapInsightsReady && hasGaps
                          ? () =>
                              setDismissedGapSections(prev => {
                                const next = new Set(prev);
                                next.add(section.id);
                                return next;
                              })
                          : undefined
                      }
	                    isLoading={isLoadingSection}
	                    loadingMessage={isLoadingSection ? `Drafting ${section.title.toLowerCase()}...` : undefined}
                    onDelete={() => onSectionDelete(section.id)}
                    onInsertFromLibrary={() => onInsertFromLibrary(section.id, sectionTypeForStandards, sectionIndex)}
                    onSaveVariation={
                      isSavedSectionSource && onSaveSavedSectionVariation
                        ? () => onSaveSavedSectionVariation(section, editedContent)
                        : undefined
                    }
                    onGenerateContent={() => {
                      const existingContent = sectionDrafts[section.id] ?? section.content ?? '';
                      const paragraphIdMap: Record<string, string> = {
                        'intro': 'intro',
                        'introduction': 'intro',
                        'paragraph': 'experience',
                        'experience': 'experience',
                        'closer': 'closing',
                        'closing': 'closing',
                        'signature': 'closing'
                      };
                      const paragraphId = paragraphIdMap[section.type] || paragraphIdMap[section.slug] || 'experience';
                      
                      const unresolvedRatingCriteria = matchMetrics?.ratingCriteria 
                        ? getUnresolvedRatingCriteria(matchMetrics.ratingCriteria)
                        : undefined;
                      
                      const gapsFromRating = unresolvedRatingCriteria?.map(rc => ({
                        id: rc.id,
                        title: rc.label,
                        description: `${rc.evidence || rc.description || ''}. ${rc.suggestion || ''}`.trim(),
                      })) || [];
                      
                      const firstGap = gapObjects[0];
                      if (firstGap) {
                        onEnhanceSection({
                          id: firstGap.id,
                          type: 'core-requirement',
                          severity: 'high',
                          description: firstGap.description,
                          suggestion: firstGap.description,
                          origin: 'ai',
                          section_id: section.id,
                          paragraphId: paragraphId,
                          existingContent: existingContent,
                          gaps: gapObjects,
                          ratingCriteriaGaps: gapsFromRating,
                          gapSummary: cleanGapSummary,
                          sectionAttribution: sectionAttribution
                        });
                      } else {
                        const gapSummaryParts: string[] = [];
                        if (gapsFromRating.length > 0) {
                          gapSummaryParts.push(`${gapsFromRating.length} content quality criteria: ${gapsFromRating.map(g => g.title).join(', ')}`);
                        }

                        onEnhanceSection({
                          id: `section-${section.id}-enhancement`,
                          type: 'content-enhancement',
                          severity: 'medium',
                          description: `Enhance ${section.title} section with more specific content and quantifiable achievements`,
                          suggestion: `Add detail that directly speaks to ${section.title.toLowerCase()} requirements and demonstrates your experience`,
                          origin: 'ai',
                          section_id: section.id,
                          paragraphId: paragraphId,
                          existingContent: existingContent,
                          ratingCriteriaGaps: gapsFromRating,
                          gapSummary: gapSummaryParts.length > 0 ? gapSummaryParts.join(' • ') : null,
                          sectionAttribution: sectionAttribution
                        });
                      }
                    }}
                    showUsage={false}
                    renderChildrenBeforeTags={true}
	                    className={cn(gapInsightsReady && hasGaps && 'border-warning')}
	                  >
                    {/* Phase 3: Render textarea when loading ends (skeleton handled by ContentCard isLoading prop) */}
                    {!isLoadingSection && (
                      <div className="mb-6">
                        {(() => {
                          const tokens = parseLlmSlotTokens(editedContent);
                          if (tokens.length === 0) return null;
                          return (
                            <div className="mb-2 text-xs text-muted-foreground">
                              AI placeholders detected: {tokens.length} (they’ll auto-fill if possible; otherwise become NOT_FOUND)
                            </div>
                          );
                        })()}
                        <GrammarTextarea
                          data-section-id={section.id}
                          value={editedContent}
                          onFocus={() => {
                            onSectionFocus(section.id, editedContent);
                          }}
                          onChange={event => onSectionChange(section.id, event.target.value)}
                          onBlur={async (event) => {
                            const newContent = event.target.value;
                            await onSectionBlur(section.id, newContent, jobDescription, null, draft);
                          }}
                          ref={(textarea) => {
                            if (textarea) {
                              textarea.style.height = 'auto';
                              const scrollHeight = textarea.scrollHeight;
                              const maxHeight = 600;
                              if (scrollHeight <= maxHeight) {
                                textarea.style.height = `${scrollHeight}px`;
                                textarea.style.overflowY = 'hidden';
                              } else {
                                textarea.style.height = `${maxHeight}px`;
                                textarea.style.overflowY = 'auto';
                              }
                            }
                          }}
                          className="resize-none min-h-[100px]"
                          placeholder="Enter cover letter content..."
                          rows={1}
                        />
                      </div>
                    )}
                  </ContentCard>

                  {/* Add Section button after each section (hide during loading) */}
                  {!isLoadingSection && (
                    <SectionInsertButton
                      onClick={() => onInsertBetweenSections(sectionIndex + 1)}
                      variant="default"
                    />
                  )}
                </div>
              );
            })}
            <div
              className={cn(
                'mt-2 h-10 rounded-lg border-2 border-dashed transition-colors',
                dragOverIndex === sectionsToRender.length
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-muted'
              )}
              onDragOver={handleDragOverEnd}
              onDrop={handleDropAtEnd}
            />
            </div> {/* End space-y-4 */}
          </div> {/* End zoomable content wrapper */}
        </div>

        <FloatingZoomControls
          zoomLevel={zoomLevel}
          minZoom={minZoom}
          maxZoom={maxZoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
        />

	      </div>
	    </div>
	  );
	}
