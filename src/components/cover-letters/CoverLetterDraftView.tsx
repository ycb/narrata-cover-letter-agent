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
  extracted_requirements?: string[];
  // Optional enhanced shapes to carry parsed JD lists and metadata
  standardRequirements?: Array<any>;
  preferredRequirements?: Array<any>;
  standard_requirements?: Array<any>;
  preferred_requirements?: Array<any>;
  structuredData?: {
    standardRequirements?: Array<any>;
    preferredRequirements?: Array<any>;
    location?: string;
    compensation?: string;
    salary?: string;
  };
  analysis?: any;
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

  const getRequirementsForParagraph = (paragraphType: string) => {
    // Agent C: Get requirements from enhancedMatchData if available
    if (enhancedMatchData) {
      const allReqs = [
        ...(enhancedMatchData.coreRequirementDetails || []),
        ...(enhancedMatchData.preferredRequirementDetails || [])
      ];

      // Filter requirements that are demonstrated in this section
      const sectionReqs = allReqs
        .filter(req => req.demonstrated)
        .map(req => req.requirement);

      if (sectionReqs.length > 0) {
        return sectionReqs;
      }
    }

    // Fallback to generic requirements
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

        return (
          <ContentCard
            key={section.id}
            title={sectionTitle}
            content={section.content}
            tags={requirements}
            hasGaps={false}
            gaps={[]}
            isGapResolved={true}
            onEdit={onSectionChange ? () => {} : undefined} // Will be handled by Textarea
            onDuplicate={onSectionDuplicate ? () => onSectionDuplicate(section.id) : undefined}
            onDelete={onSectionDelete ? () => onSectionDelete(section.id) : undefined}
            tagsLabel="Job Requirements"
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
