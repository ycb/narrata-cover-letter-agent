import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ContentGenerationService } from '@/services/contentGenerationService';
import type { Gap } from '@/services/gapDetectionService';
import type { WorkHistoryContext, JobContext } from '@/prompts/contentGeneration';

export interface UseContentGenerationProps {
  onContentApplied?: () => void;
}

export interface ContentGenerationModalProps {
  gap: Gap;
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  existingContent: string;
  workHistoryContext: WorkHistoryContext;
  jobContext?: JobContext;
  sectionType?: 'introduction' | 'closer' | 'signature' | 'custom';
  onContentApplied?: () => void;
}

/**
 * Hook for managing content generation modal state and context fetching
 *
 * @param onContentApplied - Callback invoked after content is successfully applied
 * @returns Modal state and control functions
 *
 * @example
 * ```tsx
 * const { isModalOpen, modalProps, isLoadingContext, openModal, closeModal } = useContentGeneration({
 *   onContentApplied: () => refetch()
 * });
 *
 * // Open modal with gap and entity context
 * const handleGenerate = (gap: Gap, story: ApprovedContent) => {
 *   openModal(gap, 'approved_content', story.id, story.content);
 * };
 *
 * // Render modal
 * {isModalOpen && modalProps && (
 *   <ContentGenerationModal
 *     isOpen={isModalOpen}
 *     onClose={closeModal}
 *     {...modalProps}
 *   />
 * )}
 * ```
 */
export function useContentGeneration({ onContentApplied }: UseContentGenerationProps = {}) {
  const { toast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState<ContentGenerationModalProps | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  // Service instance
  const [service] = useState(() => new ContentGenerationService());

  /**
   * Open content generation modal with context fetching
   *
   * @param gap - The gap to address
   * @param entityType - Type of content entity
   * @param entityId - ID of the entity
   * @param existingContent - Current content text
   * @param jobContext - Optional job context for variations
   * @param sectionType - Optional section type for saved sections
   */
  const openModal = async (
    gap: Gap,
    entityType: 'work_item' | 'approved_content' | 'saved_section',
    entityId: string,
    existingContent: string,
    jobContext?: JobContext,
    sectionType?: 'introduction' | 'closer' | 'signature' | 'custom'
  ) => {
    try {
      setIsLoadingContext(true);

      // Fetch work history context for LLM
      const workHistoryContext = await service.fetchWorkHistoryContext(
        gap.user_id,
        entityType,
        entityId
      );

      // Set modal props with all required data
      setModalProps({
        gap,
        entityType,
        entityId,
        existingContent,
        workHistoryContext,
        jobContext,
        sectionType,
        onContentApplied: () => {
          // Call parent callback
          onContentApplied?.();
          // Close modal
          setIsModalOpen(false);
        }
      });

      // Open modal
      setIsModalOpen(true);

    } catch (error) {
      console.error('Error loading content generation context:', error);
      toast({
        title: 'Failed to Load Context',
        description: error instanceof Error ? error.message : 'Could not fetch work history context. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingContext(false);
    }
  };

  /**
   * Close content generation modal and reset state
   */
  const closeModal = () => {
    setIsModalOpen(false);
    setModalProps(null);
  };

  return {
    /** Whether the modal is currently open */
    isModalOpen,
    /** Props to pass to ContentGenerationModal */
    modalProps,
    /** Whether context is currently loading */
    isLoadingContext,
    /** Open modal with gap and entity context */
    openModal,
    /** Close modal and reset state */
    closeModal
  };
}
