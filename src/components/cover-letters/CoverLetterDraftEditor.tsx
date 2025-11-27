import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { MatchMetricsToolbar } from './MatchMetricsToolbar';
import { ContentCard } from '@/components/shared/ContentCard';
import { SectionInsertButton } from '@/components/template-blurbs/SectionInsertButton';
import { computeSectionAttribution } from './useSectionAttribution';
import { getUnresolvedRatingCriteria } from './useMatchMetricsDetails';
import { getApplicableStandards } from '@/config/contentStandards';
import type { CoverLetterDraft, JobDescriptionRecord } from '@/types/coverLetters';
import type { MatchMetricsData } from './useMatchMetricsDetails';
import type { SectionGapInsight } from '@/types/coverLetters';

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
  
  // Streaming props (Phase 2: now used for skeleton)
  isStreaming?: boolean;
  jobState?: any; // Will be typed properly in Phase 2
  templateSections?: CoverLetterSection[]; // Phase 2: Template structure for skeleton
  
  // UI state
  isPostHIL?: boolean;
  metricsLoading?: boolean;
  generationError?: string | null;
  jobInputError?: string | null;
  
  // Section editing state (tracked by parent)
  sectionDrafts: Record<string, string>; // sectionId -> edited content
  savingSections: Record<string, boolean>; // sectionId -> isSaving
  sectionFocusContent: Record<string, string>; // sectionId -> content at focus time
  pendingSectionInsights: Record<string, SectionGapInsight>; // Agent D: heuristic insights
  
  // Callbacks for section changes
  onSectionChange: (sectionId: string, newContent: string) => void;
  onSectionSave: (sectionId: string) => Promise<void>;
  onSectionFocus: (sectionId: string, content: string) => void;
  onSectionBlur: (sectionId: string, newContent: string, jobDescriptionRecord: JobDescriptionRecord | null, goals: any, draft: CoverLetterDraft | null) => Promise<void>;
  
  // Callbacks for section operations
  onSectionDuplicate: (section: CoverLetterSection, sectionIndex: number) => Promise<void>;
  onSectionDelete: (sectionId: string) => Promise<void>;
  onInsertBetweenSections: (insertIndex: number) => void;
  onInsertFromLibrary: (sectionId: string, sectionType: 'intro' | 'body' | 'closing', sectionIndex: number) => void;
  
  // Callbacks for content generation (HIL)
  onEnhanceSection: (gapData: any) => void;
  onAddMetrics: (sectionId?: string) => void;
  onEditGoals: () => void;
  
  // Progress render (if parent wants to show progress card)
  renderProgress?: () => React.ReactNode;
}

export function CoverLetterDraftEditor({
  draft,
  jobDescription,
  matchMetrics,
  isStreaming = false,
  jobState = null,
  templateSections = [],
  isPostHIL = false,
  metricsLoading = false,
  generationError = null,
  jobInputError = null,
  sectionDrafts,
  savingSections,
  sectionFocusContent,
  pendingSectionInsights,
  onSectionChange,
  onSectionSave,
  onSectionFocus,
  onSectionBlur,
  onSectionDuplicate,
  onSectionDelete,
  onInsertBetweenSections,
  onInsertFromLibrary,
  onEnhanceSection,
  onAddMetrics,
  onEditGoals,
  renderProgress,
}: CoverLetterDraftEditorProps) {
  
  // Phase 2: Read streaming data from jobState.result
  const streamingResult = jobState?.result as any;
  const draftFromStreaming = streamingResult?.draft;
  const hasDraftFromStreaming = !!draftFromStreaming && !!draftFromStreaming.sections?.length;
  
  // Phase 2: Effective draft = streaming draft OR prop draft OR null
  const effectiveDraft = draftFromStreaming ?? draft ?? null;
  
  // Phase 3: DATA PRIORITY RULES for metrics and gaps
  // 1. Metrics: draft.enhancedMatchData.metrics OR jobState.result.metrics (draft first)
  // 2. Gaps: draft.enhancedMatchData.sectionGapInsights OR jobState.result.sectionGaps (draft first)
  const effectiveMetrics = effectiveDraft?.enhancedMatchData?.metrics 
    || streamingResult?.metrics 
    || matchMetrics;
  
  const effectiveGaps = effectiveDraft?.enhancedMatchData?.sectionGapInsights 
    || streamingResult?.sectionGaps 
    || null;
  
  // Phase 2: Sections to render - priority order
  // 1. If draft exists → use draft.sections (real content)
  // 2. Else if templateSections provided → use template structure (skeleton)
  // 3. Else → fallback to hardcoded placeholders (should rarely happen)
  const sectionsToRender = effectiveDraft?.sections && effectiveDraft.sections.length > 0
    ? effectiveDraft.sections
    : templateSections.length > 0
    ? templateSections.map((section, idx) => ({
        ...section,
        id: section.id || `skeleton-${idx}`,
        content: '', // Empty content for skeleton
      }))
    : [
        // Fallback (should not be reached if Modal passes templateSections)
        { id: 'intro-placeholder', title: 'Introduction', type: 'intro', slug: 'intro', content: '' },
        { id: 'body-placeholder', title: 'Experience', type: 'body', slug: 'experience', content: '' },
        { id: 'closing-placeholder', title: 'Closing', type: 'closing', slug: 'closing', content: '' },
      ];
  
  // Phase 2: Loading state = streaming AND no draft yet
  const isLoadingSection = isStreaming && !effectiveDraft;

  // Calculate job-level totals for requirement denominators
  const totalCoreReqs = effectiveDraft?.enhancedMatchData?.coreRequirementDetails?.length ?? 0;
  const totalPrefReqs = effectiveDraft?.preferredRequirementDetails?.length ?? 0;

  // Extract content standards from effective draft
  const contentStandards = effectiveDraft?.llmFeedback?.contentStandards as any;

  /**
   * Helper: Get section-specific gap insights
   * Agent D: Checks pendingSectionInsights for instant feedback
   * Phase 3 DATA PRIORITY: draft.enhancedMatchData → streaming → heuristic
   */
  const getSectionGapInsights = (sectionId: string, sectionSlug: string) => {
    console.log(`[DraftEditor] Getting gaps for section ${sectionId} (${sectionSlug})`);
    
    // AGENT D: Check for pending heuristic insight first
    const pendingInsight = pendingSectionInsights[sectionId];

    // Normalize section slug to match sectionGapInsights
    const normalizeSlug = (slug: string) => {
      const aliases: Record<string, string[]> = {
        'introduction': ['introduction', 'intro', 'opening'],
        'experience': ['experience', 'exp', 'background', 'body'],
        'closing': ['closing', 'conclusion', 'signature'],
        'signature': ['signature', 'closing', 'signoff'],
      };

      const lowerSlug = slug.toLowerCase();
      for (const [canonical, variations] of Object.entries(aliases)) {
        if (variations.includes(lowerSlug)) {
          return variations;
        }
      }
      return [lowerSlug];
    };

    // Phase 2: Use effectiveDraft instead of draft
    // If no enhancedMatchData at all, we're likely still loading metrics
    // Check if we have pending insight to show meanwhile
    if (!effectiveDraft?.enhancedMatchData) {
      if (pendingInsight) {
        const gaps = pendingInsight.requirementGaps.map(gap => ({
          id: gap.id,
          title: gap.label,
          description: `${gap.rationale} ${gap.recommendation}`,
        }));

        return {
          promptSummary: pendingInsight.promptSummary || 'Quick analysis (calculating full metrics...)',
          gaps,
          isLoading: true, // Still loading LLM insights
        };
      }

      return {
        promptSummary: null,
        gaps: [],
        isLoading: true,
      };
    }
    
    // PHASE 3: If no sectionGapInsights in draft, try streaming results
    if (!effectiveDraft.enhancedMatchData.sectionGapInsights) {
      console.log('[DraftEditor] No sectionGapInsights in draft, checking streaming...');
      
      // Try streaming results (effectiveGaps already computed above)
      if (effectiveGaps) {
        console.log('[DraftEditor] Using gaps from streaming:', effectiveGaps);
        // Map streaming gaps to section
        const streamingGaps = Array.isArray(effectiveGaps) 
          ? effectiveGaps.filter((g: any) => g.sectionId === sectionId || g.sectionSlug === sectionSlug)
          : [];
        
        if (streamingGaps.length > 0) {
          console.log(`[DraftEditor] Found ${streamingGaps.length} streaming gaps for section`);
          return {
            promptSummary: streamingGaps[0]?.promptSummary || null,
            gaps: streamingGaps.flatMap((insight: any) => 
              (insight.requirementGaps || []).map((gap: any) => ({
                id: gap.id,
                title: gap.label || gap.title,
                description: `${gap.rationale || ''} ${gap.recommendation || ''}`.trim(),
              }))
            ),
            isLoading: false,
          };
        }
      }
      
      // Final fallback: old heuristic from coreRequirementDetails
      console.log('[DraftEditor] No streaming gaps, using heuristic fallback');
      const unmetCoreReqs = effectiveDraft.enhancedMatchData.coreRequirementDetails?.filter(
        (req: any) => !req.demonstrated
      ) || [];
      const unmetPreferredReqs = effectiveDraft.enhancedMatchData.preferredRequirementDetails?.filter(
        (req: any) => !req.demonstrated
      ) || [];
      const allGaps = [...unmetCoreReqs, ...unmetPreferredReqs];
      
      return {
        promptSummary: null,
        gaps: allGaps.map((req: any, index: number) => ({
          id: req.id || `gap-${index}`,
          title: req.requirement || 'Missing requirement',
          description: req.evidence || 'Not addressed in draft',
        })),
        isLoading: false,
      };
    }
    
    // PHASE 3: Draft has sectionGapInsights - use them (authoritative)
    console.log('[DraftEditor] Using sectionGapInsights from draft (authoritative)');
    
    // Match by sectionId first (exact match), fallback to sectionSlug
    let sectionInsight = effectiveDraft.enhancedMatchData.sectionGapInsights.find(
      insight => insight.sectionId === sectionId
    );

    // Fallback: if no exact ID match, try slug matching (for backward compatibility)
    if (!sectionInsight) {
      const normalizedSlugs = normalizeSlug(sectionSlug);
      sectionInsight = effectiveDraft.enhancedMatchData.sectionGapInsights.find(
        insight => normalizedSlugs.includes(insight.sectionSlug?.toLowerCase())
      );
    }

    if (!sectionInsight) {
      return { promptSummary: null, gaps: [], isLoading: false };
    }
    
    const gaps = sectionInsight.requirementGaps.map(gap => ({
      id: gap.id,
      title: gap.label,
      description: `${gap.rationale} ${gap.recommendation}`,
    }));
    
    return {
      promptSummary: sectionInsight.promptSummary,
      gaps,
      isLoading: false,
    };
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left Sidebar - Toolbar */}
      <div className="bg-card flex-shrink-0">
        <MatchMetricsToolbar
          metrics={effectiveMetrics} // Phase 3: Uses data priority rules
          isPostHIL={isPostHIL}
          isLoading={metricsLoading || isLoadingSection}
          enhancedMatchData={effectiveDraft?.enhancedMatchData}
          goNoGoAnalysis={undefined}
          jobDescription={jobDescription ?? undefined}
          sections={sectionsToRender.map(s => ({ id: s.id, type: s.type }))}
          onEditGoals={onEditGoals}
          onEnhanceSection={(sectionId, requirement, ratingCriteria) => {
            // Open section enhancement flow with rating criteria if provided
            const section = effectiveDraft?.sections.find(s => s.id === sectionId);
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
              
              // Phase 2: Get requirement gaps from effectiveDraft
              const sectionInsight = effectiveDraft?.enhancedMatchData?.sectionGapInsights?.find(
                (insight: any) => insight.sectionId === sectionId || insight.sectionSlug === section.slug || insight.sectionSlug === section.type
              );
              const requirementGaps = sectionInsight?.requirementGaps?.map((gap: any) => ({
                id: gap.id,
                title: gap.label,
                description: `${gap.rationale} ${gap.recommendation}`,
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

          {/* Show progress card at top when metrics are loading */}
          {renderProgress && renderProgress()}

          <div className="space-y-4">
            {/* Add Section button at the top */}
            {!isLoadingSection && <SectionInsertButton onClick={() => onInsertBetweenSections(0)} />}
            
            {sectionsToRender.map((section, sectionIndex) => {
              const editedContent = sectionDrafts[section.id] ?? section.content;
              const isDirty = editedContent !== section.content;
              const isSaving = !!savingSections[section.id];
              
              const { promptSummary, gaps: gapObjects, isLoading: gapsLoading } = getSectionGapInsights(section.id, section.slug || section.type);
              const hasGaps = gapObjects.length > 0;

              // Strip trailing periods from gap summary for cover letters
              const cleanGapSummary = promptSummary ? promptSummary.replace(/\.+$/, '') : null;

              // Phase 2: Compute section-level attribution (safe during skeleton state)
              const hasAttributionData = effectiveDraft?.enhancedMatchData != null || contentStandards != null || (matchMetrics?.ratingCriteria && matchMetrics.ratingCriteria.length > 0);
              const { attribution: sectionAttribution } = computeSectionAttribution({
                sectionId: section.id,
                sectionType: section.slug || section.type,
                enhancedMatchData: effectiveDraft?.enhancedMatchData,
                ratingCriteria: matchMetrics?.ratingCriteria,
                contentStandards: contentStandards || null,
              });

              // Format section title: replace dashes with spaces and capitalize first letter
              const formattedTitle = section.title
                ? section.title.replace(/-/g, ' ').charAt(0).toUpperCase() + section.title.replace(/-/g, ' ').slice(1)
                : '';

              // Calculate section-type-specific totalStandards
              const sectionTypeForStandards: 'intro' | 'body' | 'closing' = (() => {
                if (section.slug === 'intro' || section.slug === 'introduction') return 'intro';
                if (section.slug === 'closing' || section.slug === 'conclusion' || section.slug === 'closer') return 'closing';
                if (section.type === 'intro' || section.type === 'introduction') return 'intro';
                if (section.type === 'closing' || section.type === 'conclusion' || section.type === 'closer') return 'closing';
                if (sectionIndex === 0) return 'intro';
                if (sectionIndex === sectionsToRender.length - 1) return 'closing';
                return 'body';
              })();
              const totalStandardsForSection = getApplicableStandards(sectionTypeForStandards).length;

              return (
                <div key={section.id}>
                  <ContentCard
                    title={formattedTitle}
                    content={undefined} // Don't show preview when editable (Textarea displays it)
                    sectionAttributionData={hasAttributionData ? sectionAttribution : undefined}
                    totalCoreReqs={totalCoreReqs}
                    totalPrefReqs={totalPrefReqs}
                    totalStandards={totalStandardsForSection}
                    tagsLabel={undefined}
                    hasGaps={hasGaps}
                    gaps={gapObjects}
                    gapSummary={cleanGapSummary}
                    isGapResolved={!hasGaps}
                    isLoading={isLoadingSection}
                    loadingMessage={isLoadingSection ? `Drafting ${section.title.toLowerCase()}...` : undefined}
                    onEdit={() => {
                      const textarea = document.querySelector(`textarea[data-section-id="${section.id}"]`) as HTMLTextAreaElement;
                      if (textarea) {
                        textarea.focus();
                        textarea.select();
                      }
                    }}
                    onDuplicate={() => onSectionDuplicate(section, sectionIndex)}
                    onDelete={() => onSectionDelete(section.id)}
                    onInsertFromLibrary={() => onInsertFromLibrary(section.id, sectionTypeForStandards, sectionIndex)}
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
                    className={cn(hasGaps && 'border-warning')}
                  >
                    {/* Phase 2: Only render textarea when not loading */}
                    {!isLoadingSection && effectiveDraft && (
                      <div className="mb-6">
                        <Textarea
                          data-section-id={section.id}
                          value={editedContent}
                          onFocus={() => {
                            onSectionFocus(section.id, editedContent);
                          }}
                          onChange={event => onSectionChange(section.id, event.target.value)}
                          onBlur={async (event) => {
                            const newContent = event.target.value;
                            await onSectionBlur(section.id, newContent, jobDescription, null, effectiveDraft);
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
          </div>
        </div>
      </div>
    </div>
  );
}

