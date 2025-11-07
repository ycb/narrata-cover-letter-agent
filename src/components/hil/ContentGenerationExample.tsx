/**
 * ContentGenerationExample
 *
 * Reference implementation showing how to integrate the ContentGenerationModal
 * and useContentGeneration hook into a component with content gaps.
 *
 * This example demonstrates:
 * 1. Setting up the useContentGeneration hook
 * 2. Fetching content items with gaps
 * 3. Rendering ContentGapBanner
 * 4. Opening the modal with proper context
 * 5. Handling content updates after generation
 *
 * Copy this pattern to integrate into:
 * - WorkHistoryDetail.tsx (work items and stories)
 * - SavedSections.tsx (cover letter sections)
 * - CoverLetterEditor.tsx (cover letter drafts)
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentGapBanner } from '@/components/shared/ContentGapBanner';
import { ContentGenerationModal } from '@/components/hil/ContentGenerationModal';
import { useContentGeneration } from '@/hooks/useContentGeneration';
import { useContentItemsWithGaps } from '@/hooks/useContentItemsWithGaps';
import type { Gap } from '@/services/gapDetectionService';
import type { JobContext } from '@/prompts/contentGeneration';

interface ContentGenerationExampleProps {
  workItemId: string;
  userId: string;

  // Optional: Pass job context for cover letter flow
  jobContext?: JobContext;
}

export function ContentGenerationExample({
  workItemId,
  userId,
  jobContext
}: ContentGenerationExampleProps) {
  // 1. Fetch content items with their gaps
  const { contentItems, isLoading, refetch } = useContentItemsWithGaps(userId, workItemId);

  // 2. Set up content generation hook
  const {
    isModalOpen,
    modalProps,
    isLoadingContext,
    openModal,
    closeModal
  } = useContentGeneration({
    onContentApplied: () => {
      // Refresh data after content is generated and saved
      refetch();
    }
  });

  // 3. Handler to open modal for a specific gap
  const handleGenerateContent = (gap: Gap, story: any) => {
    // Work History Context: No job context
    openModal(
      gap,                    // The gap to address
      'approved_content',     // Entity type (work_item | approved_content | saved_section)
      story.id,               // Entity ID
      story.content,          // Existing content
      jobContext,             // Optional: Pass for cover letter flow (creates variation)
      undefined               // Section type (only for saved_section entities)
    );
  };

  // 4. Handler for saved sections (cover letter sections)
  const handleGenerateSectionContent = (gap: Gap, section: any) => {
    // Cover Letter Context: Pass job context to auto-create variations
    openModal(
      gap,
      'saved_section',
      section.id,
      section.content,
      jobContext,              // This triggers variation creation
      section.section_type     // 'introduction' | 'closer' | 'signature' | 'custom'
    );
  };

  if (isLoading) {
    return <div className="p-6">Loading content...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Content Generation Integration Example</h2>
        <p className="text-muted-foreground">
          {jobContext
            ? `Generating variations for ${jobContext.jobTitle} at ${jobContext.company}`
            : 'Improving work history content'
          }
        </p>
      </div>

      {/* 5. Render content items with gap banners */}
      {contentItems.map((story) => (
        <Card key={story.id} className="border">
          <CardHeader>
            <CardTitle>{story.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4 whitespace-pre-wrap">
              {story.content}
            </p>

            {/* Display metadata */}
            <div className="text-xs text-muted-foreground mb-4">
              <div>Entity Type: {story.entity_type}</div>
              <div>Gaps Detected: {story.gaps?.length || 0}</div>
              {story.variations && story.variations.length > 0 && (
                <div>Variations: {story.variations.length}</div>
              )}
            </div>

            {/* 6. Gap Banner - Only show if gaps exist */}
            {story.gaps && story.gaps.length > 0 && (
              <ContentGapBanner
                gaps={story.gaps.map(g => ({
                  id: g.id!,
                  description: g.description || ''
                }))}
                onGenerateContent={() => {
                  // Use first gap to trigger generation
                  // Validation will check ALL gaps
                  handleGenerateContent(story.gaps![0], story);
                }}
                onDismiss={() => {
                  // Handle gap dismissal (mark as resolved)
                  console.log('Dismissing gaps for story:', story.id);
                }}
              />
            )}

            {/* Show existing variations if any */}
            {story.variations && story.variations.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-sm mb-2">Variations ({story.variations.length})</h4>
                {story.variations.map((variation: any) => (
                  <div key={variation.id} className="text-xs p-2 bg-muted/30 rounded mb-2">
                    <div className="font-medium">{variation.title}</div>
                    {variation.target_job_title && (
                      <div className="text-muted-foreground">
                        Target: {variation.target_job_title}
                        {variation.target_company && ` at ${variation.target_company}`}
                      </div>
                    )}
                    {variation.gap_tags && variation.gap_tags.length > 0 && (
                      <div className="text-muted-foreground">
                        Tags: {variation.gap_tags.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* 7. Content Generation Modal */}
      {isModalOpen && modalProps && (
        <ContentGenerationModal
          isOpen={isModalOpen}
          onClose={closeModal}
          {...modalProps}
        />
      )}

      {/* 8. Loading indicator for context fetch */}
      {isLoadingContext && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-lg">
          Loading work history context...
        </div>
      )}

      {/* Help text */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <h3 className="font-semibold mb-2">Integration Pattern</h3>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Set up useContentGeneration hook with onContentApplied callback</li>
            <li>Fetch content items with gaps using useContentItemsWithGaps</li>
            <li>Render ContentGapBanner for items with gaps</li>
            <li>Call openModal when user clicks "Generate Content"</li>
            <li>Modal fetches work history context automatically</li>
            <li>User generates, validates, and saves content</li>
            <li>onContentApplied callback refreshes data</li>
          </ol>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded text-sm">
            <div className="font-semibold mb-1">Context-Dependent Behavior:</div>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Work History View</strong> (no jobContext): Shows save mode selection (replace or variation)</li>
              <li>• <strong>Cover Letter View</strong> (with jobContext): Auto-creates variation, no mode selection</li>
              <li>• <strong>work_item entities</strong>: Always replace (role descriptions don't support variations)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Example Usage in Different Contexts
 */

// Work History View (no job context)
export function WorkHistoryExampleUsage() {
  return (
    <ContentGenerationExample
      workItemId="work-item-123"
      userId="user-456"
      // No jobContext = work history flow
    />
  );
}

// Cover Letter View (with job context)
export function CoverLetterExampleUsage() {
  const jobContext: JobContext = {
    jobTitle: 'Senior Product Manager',
    company: 'TechCorp',
    jobDescription: 'Leading product strategy for AI-powered solutions...',
    keywords: ['AI', 'Product Strategy', 'Team Leadership']
  };

  return (
    <ContentGenerationExample
      workItemId="work-item-123"
      userId="user-456"
      jobContext={jobContext}  // Triggers variation creation
    />
  );
}
