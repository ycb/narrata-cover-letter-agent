import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ContentCard } from '@/components/shared/ContentCard';
import { MatchMetricsToolbar } from './MatchMetricsToolbar';
import { cn } from '@/lib/utils';
import type { EnhancedMatchData, SectionGapInsight } from '@/types/coverLetters';

interface HILProgressMetrics {
  goalsMatch: 'strong' | 'average' | 'weak';
  experienceMatch: 'strong' | 'average' | 'weak';
  coverLetterRating: 'strong' | 'average' | 'weak';
  atsScore: number;
  coreRequirementsMet: { met: number; total: number };
  preferredRequirementsMet: { met: number; total: number };
}

interface GoNoGoAnalysis {
  decision: 'go' | 'no-go';
  confidence: number;
  mismatches: Array<{
    type: 'geography' | 'pay' | 'core-requirements' | 'work-history';
    severity: 'high' | 'medium' | 'low';
    description: string;
    userOverride?: boolean;
  }>;
}

interface CoverLetterSection {
  id: string;
  type: string;
  content: string;
  isEnhanced?: boolean;
}

interface JobDescription {
  id: string;
  role?: string;
  company?: string;
  location?: string;
  salary?: string;
  workType?: string;
  extracted_requirements?: string[];
  // Canonical requirement lists (normalized at fetch time)
  standardRequirements?: Array<any>;
  preferredRequirements?: Array<any>;
}

interface CoverLetterDraftViewProps {
  sections: CoverLetterSection[];
  hilProgressMetrics?: HILProgressMetrics | null;
  enhancedMatchData?: EnhancedMatchData | null; // Agent C: detailed match data
  pendingSectionInsights?: Record<string, SectionGapInsight>; // Agent D: heuristic insights
  goNoGoAnalysis?: GoNoGoAnalysis | null;
  jobDescription?: JobDescription | null;
  isEditable?: boolean;
  hilCompleted?: boolean;
  onSectionChange?: (sectionId: string, newContent: string) => void;
  onSectionDelete?: (sectionId: string) => void;
  onSectionDuplicate?: (sectionId: string) => void;
  onEditGoals?: () => void;
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
  onEnhanceSection?: (sectionId: string, requirement?: string, gapData?: { gaps?: Array<{ id: string; title?: string; description: string }>; gapSummary?: string | null }) => void; // Agent C: enhance section CTA
  onAddMetrics?: (sectionId?: string) => void; // Agent C: add metrics CTA
  className?: string;
}

/**
 * Shared component for displaying cover letter draft content
 * Used by both CoverLetterCreateModal and CoverLetterEditModal for DRY
 */
export function CoverLetterDraftView({
  sections,
  hilProgressMetrics,
  enhancedMatchData,
  pendingSectionInsights = {}, // Agent D: default to empty object
  goNoGoAnalysis,
  jobDescription,
  isEditable = false,
  hilCompleted = false,
  onSectionChange,
  onSectionDelete,
  onSectionDuplicate,
  onEditGoals,
  onAddStory,
  onEnhanceSection,
  onAddMetrics,
  className,
}: CoverLetterDraftViewProps) {
  const getSectionTitle = (type: string) => {
    switch (type) {
      case 'intro':
        return 'Introduction';
      case 'experience':
        return 'Experience';
      case 'closing':
        return 'Closing';
      case 'signature':
        return 'Signature';
      default:
        return type;
    }
  };

  /**
   * Normalize section types to handle LLM variations (e.g., "intro" vs "introduction")
   * Returns array of possible aliases for a given section type
   */
  const normalizeSectionType = (sectionType: string): string[] => {
    const aliases: Record<string, string[]> = {
      'introduction': ['introduction', 'intro', 'opening'],
      'experience': ['experience', 'exp', 'background', 'body', 'paragraph'], // 'paragraph' is the section type for experience sections
      'closing': ['closing', 'conclusion', 'closer'],
      'signature': ['signature', 'signoff'],
    };
    
    const lowerType = sectionType.toLowerCase();
    
    // Map section type values to their canonical names
    // CoverLetterSection uses: 'intro' | 'paragraph' | 'closer' | 'signature'
    const typeMapping: Record<string, string> = {
      'intro': 'introduction',
      'paragraph': 'experience',
      'closer': 'closing',
    };
    
    // First check if we need to map the type
    const mappedType = typeMapping[lowerType] || lowerType;
    
    // Find canonical type and return all aliases
    for (const [canonical, variations] of Object.entries(aliases)) {
      if (canonical === mappedType || variations.includes(mappedType) || variations.includes(lowerType)) {
        return variations;
      }
    }
    
    // If not found in aliases, return the mapped type or original type
    return [mappedType, lowerType];
  };

  const getRequirementsForParagraph = (paragraphType: string) => {
    // Agent C: Get requirements from enhancedMatchData if available
    if (enhancedMatchData) {
      const allReqs = [
        ...(enhancedMatchData.coreRequirementDetails || []),
        ...(enhancedMatchData.preferredRequirementDetails || [])
      ];

      // Normalize the current section type to match against sectionIds
      const normalizedTypes = normalizeSectionType(paragraphType);

      // Filter requirements that are:
      // 1. Demonstrated in the draft (met)
      // 2. Addressed in THIS specific section
      const sectionReqs = allReqs
        .filter(req => {
          // Must be demonstrated (requirement is met in the draft)
          if (!req.demonstrated) return false;
          
          // Must be addressed in this specific section
          const sectionIds = req.sectionIds || [];
          
          // Check if any normalized variation of the section type matches
          return sectionIds.some(id => 
            normalizedTypes.includes(id.toLowerCase())
          );
        })
        .map(req => req.requirement);

      if (sectionReqs.length > 0) {
        return sectionReqs;
      }
    }

    // Fallback to generic requirements only if no enhancedMatchData
    // Don't show fallback tags if enhancedMatchData exists but section has no requirements
    if (!enhancedMatchData) {
      switch (paragraphType) {
        case 'intro':
          return ['quantifiable achievements', 'specific metrics', 'KPIs from past projects'];
        case 'experience':
          return ['technical skills', 'leadership experience', 'cross-functional collaboration'];
        case 'closing':
          return ['enthusiasm', 'specific interest in role', 'company alignment'];
        case 'signature':
          return ['professional closing', 'contact information', 'call to action'];
        default:
          return ['requirements met'];
      }
    }

    // If enhancedMatchData exists but no requirements for this section, return empty
    return [];
  };

  /**
   * AGENT D: Get section-specific gap insights with fallback to pending heuristic insights
   * 
   * Priority order:
   * 1. LLM insights from enhancedMatchData.sectionGapInsights (most accurate)
   * 2. Heuristic insights from pendingSectionInsights (fast, immediately after edit)
   * 3. Fallback to unmet requirements (legacy behavior)
   * 
   * Returns { promptSummary, gaps, isLoading }
   * - isLoading: true when metrics are being calculated (no enhancedMatchData yet)
   * - promptSummary: rubric guidance for the section
   * - gaps: structured gap objects with title + description
   */
  const getSectionGapInsights = (sectionId: string, sectionType: string) => {
    // AGENT D: Check for pending heuristic insight first
    const pendingInsight = pendingSectionInsights[sectionId];
    
    // If no enhancedMatchData at all, we're likely still loading metrics
    // Check if we have pending insight to show meanwhile
    if (!enhancedMatchData) {
      if (pendingInsight) {
        // Show pending heuristic insight while waiting for LLM
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
    
    // Priority 1: LLM insights from sectionGapInsights (if available)
    if (enhancedMatchData.sectionGapInsights) {
      const normalizedTypes = normalizeSectionType(sectionType);
      const sectionInsight = enhancedMatchData.sectionGapInsights.find(
        insight => normalizedTypes.includes(insight.sectionSlug.toLowerCase())
      );

      if (sectionInsight) {
        // LLM insight found - use it (most accurate)
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
      }
    }
    
    // Priority 2: Pending heuristic insight (if available and no LLM insight)
    if (pendingInsight) {
      const gaps = pendingInsight.requirementGaps.map(gap => ({
        id: gap.id,
        title: gap.label,
        description: `${gap.rationale} ${gap.recommendation}`,
      }));

      return {
        promptSummary: pendingInsight.promptSummary || 'Quick analysis (press refresh for AI insights)',
        gaps,
        isLoading: false,
      };
    }
    
    // Priority 3: Fallback to legacy unmet requirements
    if (!enhancedMatchData.sectionGapInsights) {
      const unmetCoreReqs = enhancedMatchData.coreRequirementDetails?.filter(
        (req: any) => !req.demonstrated
      ) || [];
      const unmetPreferredReqs = enhancedMatchData.preferredRequirementDetails?.filter(
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

    // No insights available
    return { promptSummary: null, gaps: [], isLoading: false };
  };

  return (
    <div className={cn('flex h-full overflow-hidden', className)}>
      {/* Left Sidebar - Toolbar */}
      {hilProgressMetrics && (
        <div className="bg-card flex-shrink-0">
          <MatchMetricsToolbar
            metrics={hilProgressMetrics}
            isPostHIL={hilCompleted}
            isLoading={false}
            goNoGoAnalysis={goNoGoAnalysis || undefined}
            jobDescription={jobDescription || undefined}
            enhancedMatchData={enhancedMatchData || undefined}
            sections={sections.map(s => ({ id: s.id, type: s.type }))}
            onEditGoals={onEditGoals}
            onEnhanceSection={onEnhanceSection}
            onAddMetrics={onAddMetrics}
            className="h-full border-0"
          />
        </div>
      )}

      {/* Right Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 pl-6 pb-6">
          {sections.map((section) => {
        const sectionTitle = getSectionTitle(section.type);
        const requirements = getRequirementsForParagraph(section.type);

        // Agent C: Get section-specific gap insights
        // AGENT D: Pass sectionId to enable pending insights lookup
        const { promptSummary, gaps: gapObjects, isLoading: gapsLoading } = getSectionGapInsights(section.id, section.type);
        const hasGaps = gapObjects.length > 0;
        
        // Strip trailing periods from gap summary for cover letters
        const cleanGapSummary = promptSummary ? promptSummary.replace(/\.+$/, '') : null;

        return (
          <ContentCard
            key={section.id}
            title={sectionTitle}
            content={isEditable ? undefined : section.content} // Don't show content if editable (textarea will display it)
            tags={requirements} // Always pass tags array (empty or populated)
            hasGaps={hasGaps}
            gaps={gapObjects}
            gapSummary={cleanGapSummary} // Agent C: Pass rubric summary for section guidance (no trailing periods)
            isGapResolved={false}
            onGenerateContent={onEnhanceSection ? () => {
              // Always open HIL workflow - use onEnhanceSection to trigger ContentGenerationModal
              // If no gaps exist, onEnhanceSection will create synthetic gap
              const firstGap = gapObjects[0];
              onEnhanceSection(section.id, firstGap?.description, {
                gaps: gapObjects,
                gapSummary: cleanGapSummary
              });
            } : undefined}
            // NOTE: Don't pass onEdit for tags - requirement tags are system-generated, not user-editable
            // onEdit is for section content editing (handled by Textarea), not for adding tags
            onDuplicate={onSectionDuplicate ? () => onSectionDuplicate(section.id) : undefined}
            onDelete={onSectionDelete ? () => onSectionDelete(section.id) : undefined}
            tagsLabel="Requirements Met" // Always show label, even when empty
            showUsage={false}
            renderChildrenBeforeTags={isEditable}
            className={cn(section.isEnhanced && 'border-success/30')}
          >
            {isEditable && onSectionChange ? (
              <div className="mb-6">
                <Textarea
                  value={section.content}
                  ref={(textarea) => {
                    if (textarea) {
                      // Set initial height based on content, but respect max-height
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
                  onChange={(e) => {
                    onSectionChange(section.id, e.target.value);
                    // Auto-resize textarea, but respect max-height
                    e.target.style.height = 'auto';
                    const scrollHeight = e.target.scrollHeight;
                    const maxHeight = 600;
                    if (scrollHeight <= maxHeight) {
                      e.target.style.height = `${scrollHeight}px`;
                      e.target.style.overflowY = 'hidden';
                    } else {
                      e.target.style.height = `${maxHeight}px`;
                      e.target.style.overflowY = 'auto';
                    }
                  }}
                  className="resize-none min-h-[100px]"
                  placeholder="Enter cover letter content..."
                  rows={1}
                />
              </div>
            ) : null}
          </ContentCard>
        );
      })}
        </div>
      </div>
    </div>
  );
}
