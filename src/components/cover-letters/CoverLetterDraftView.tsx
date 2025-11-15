import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ContentCard } from '@/components/shared/ContentCard';
import { ProgressIndicatorWithTooltips } from './ProgressIndicatorWithTooltips';
import { cn } from '@/lib/utils';
import type { EnhancedMatchData } from '@/types/coverLetters';

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
  goNoGoAnalysis?: GoNoGoAnalysis | null;
  jobDescription?: JobDescription | null;
  isEditable?: boolean;
  hilCompleted?: boolean;
  onSectionChange?: (sectionId: string, newContent: string) => void;
  onSectionDelete?: (sectionId: string) => void;
  onSectionDuplicate?: (sectionId: string) => void;
  onEditGoals?: () => void;
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
  onEnhanceSection?: (sectionId: string, requirement?: string) => void; // Agent C: enhance section CTA
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
      'experience': ['experience', 'exp', 'background', 'body'],
      'closing': ['closing', 'conclusion', 'signature'],
      'signature': ['signature', 'closing', 'signoff'],
    };
    
    const lowerType = sectionType.toLowerCase();
    
    // Find canonical type and return all aliases
    for (const [canonical, variations] of Object.entries(aliases)) {
      if (variations.includes(lowerType)) {
        return variations;
      }
    }
    
    // If not found in aliases, return the type itself
    return [lowerType];
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Progress Indicators */}
      {hilProgressMetrics && (
        <ProgressIndicatorWithTooltips
          metrics={hilProgressMetrics}
          isPostHIL={hilCompleted}
          goNoGoAnalysis={goNoGoAnalysis || undefined}
          jobDescription={jobDescription || undefined}
          enhancedMatchData={enhancedMatchData || undefined}
          onEditGoals={onEditGoals}
          onAddStory={onAddStory}
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      )}

      {/* Cover Letter Sections */}
      {sections.map((section) => {
        const sectionTitle = getSectionTitle(section.type);
        const requirements = getRequirementsForParagraph(section.type);

        // Check for gaps: unmet requirements from the draft analysis
        // Use cached gaps from enhancedMatchData (already calculated during draft creation)
        // This avoids recalculating and prevents gaps appearing after async JD load
        const unmetCoreReqs = enhancedMatchData?.coreRequirementDetails?.filter(
          (req: any) => !req.demonstrated
        ) || [];
        const unmetPreferredReqs = enhancedMatchData?.preferredRequirementDetails?.filter(
          (req: any) => !req.demonstrated
        ) || [];
        
        // Combine all unmet requirements as gaps
        const allGaps = [...unmetCoreReqs, ...unmetPreferredReqs];
        
        // For now, show all gaps on all sections (we can refine to per-section later)
        // This matches the UX where gaps are about the overall draft, not individual sections
        const hasGaps = allGaps.length > 0;
        const gapObjects = allGaps.map((req: any, index: number) => ({
          id: req.id || `gap-${index}`,
          description: req.requirement || req.evidence || 'Missing requirement'
        }));

        return (
          <ContentCard
            key={section.id}
            title={sectionTitle}
            content={isEditable ? undefined : section.content} // Don't show content if editable (textarea will display it)
            tags={requirements} // Always pass tags array (empty or populated)
            hasGaps={hasGaps}
            gaps={gapObjects}
            isGapResolved={false}
            onGenerateContent={onAddStory ? () => onAddStory() : undefined} // Hook up to HIL story creation
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
                      // Set initial height based on content
                      textarea.style.height = 'auto';
                      textarea.style.height = `${textarea.scrollHeight}px`;
                    }
                  }}
                  onChange={(e) => {
                    onSectionChange(section.id, e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = `${e.target.scrollHeight}px`;
                  }}
                  className="resize-none overflow-hidden"
                  placeholder="Enter cover letter content..."
                  rows={1}
                />
              </div>
            ) : null}
          </ContentCard>
        );
      })}
    </div>
  );
}
