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
  
  // Streaming props (Phase 1: defined but not used yet)
  isStreaming?: boolean;
  jobState?: any; // Will be typed properly in Phase 2
  
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
  isStreaming = false, // Phase 1: not used yet
  jobState = null, // Phase 1: not used yet
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
  
  // Early return: no draft to render
  if (!draft) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No draft available
      </div>
    );
  }

  // Calculate job-level totals for requirement denominators
  const totalCoreReqs = draft.enhancedMatchData?.coreRequirementDetails?.length ?? 0;
  const totalPrefReqs = draft.enhancedMatchData?.preferredRequirementDetails?.length ?? 0;

  // Extract content standards from draft
  const contentStandards = draft.llmFeedback?.contentStandards as any;

  /**
   * Helper: Get section-specific gap insights
   * Agent D: Checks pendingSectionInsights for instant feedback
   * Falls back to draft.enhancedMatchData.sectionGapInsights
   */
  const getSectionGapInsights = (sectionId: string, sectionSlug: string) => {
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

    // If no enhancedMatchData at all, we're likely still loading metrics
    // Check if we have pending insight to show meanwhile
    if (!draft.enhancedMatchData) {
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
    
    // If no sectionGapInsights, fallback to old heuristic
    if (!draft.enhancedMatchData.sectionGapInsights) {
      const unmetCoreReqs = draft.enhancedMatchData.coreRequirementDetails?.filter(
        (req: any) => !req.demonstrated
      ) || [];
      const unmetPreferredReqs = draft.enhancedMatchData.preferredRequirementDetails?.filter(
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
    
    // New behavior: use sectionGapInsights
    // PHASE 2: Match by sectionId first (exact match), fallback to sectionSlug
    let sectionInsight = draft.enhancedMatchData.sectionGapInsights.find(
      insight => insight.sectionId === sectionId
    );

    // Fallback: if no exact ID match, try slug matching (for backward compatibility)
    if (!sectionInsight) {
      const normalizedSlugs = normalizeSlug(sectionSlug);
      sectionInsight = draft.enhancedMatchData.sectionGapInsights.find(
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
          metrics={matchMetrics}
          isPostHIL={isPostHIL}
          isLoading={metricsLoading}
          enhancedMatchData={draft.enhancedMatchData}
          goNoGoAnalysis={undefined}
          jobDescription={jobDescription ?? undefined}
          sections={draft.sections.map(s => ({ id: s.id, type: s.type }))}
          onEditGoals={onEditGoals}
          onEnhanceSection={(sectionId, requirement, ratingCriteria) => {
            // Open section enhancement flow with rating criteria if provided
            const section = draft.sections.find(s => s.id === sectionId);
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
              
              // Get requirement gaps for this section from enhancedMatchData
              const sectionInsight = draft.enhancedMatchData?.sectionGapInsights?.find(
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
            <SectionInsertButton onClick={() => onInsertBetweenSections(0)} />
            
            {draft.sections.map((section, sectionIndex) => {
              const editedContent = sectionDrafts[section.id] ?? section.content;
              const isDirty = editedContent !== section.content;
              const isSaving = !!savingSections[section.id];
              
              const { promptSummary, gaps: gapObjects, isLoading: gapsLoading } = getSectionGapInsights(section.id, section.slug);
              const hasGaps = gapObjects.length > 0;

              // Strip trailing periods from gap summary for cover letters
              const cleanGapSummary = promptSummary ? promptSummary.replace(/\.+$/, '') : null;

              // Compute section-level attribution using pure function (safe to call in map)
              const hasAttributionData = draft.enhancedMatchData != null || contentStandards != null || (matchMetrics?.ratingCriteria && matchMetrics.ratingCriteria.length > 0);
              const { attribution: sectionAttribution } = computeSectionAttribution({
                sectionId: section.id,
                sectionType: section.slug || section.type,
                enhancedMatchData: draft.enhancedMatchData,
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
                if (sectionIndex === draft.sections.length - 1) return 'closing';
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
                    {/* Inline editable Textarea */}
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
                  </ContentCard>

                  {/* Add Section button after each section */}
                  <SectionInsertButton
                    onClick={() => onInsertBetweenSections(sectionIndex + 1)}
                    variant="default"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

