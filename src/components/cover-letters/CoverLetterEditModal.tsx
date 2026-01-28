/**
 * CoverLetterEditModal - THIN WRAPPER
 * 
 * ⚠️ IMPORTANT: DO NOT ADD LOGIC HERE
 * 
 * This component is a thin wrapper around CoverLetterModal.
 * All real behavior lives in CoverLetterModal.tsx.
 * 
 * This wrapper exists to:
 * 1. Preserve the public API (keep call sites unchanged)
 * 2. Pass mode='edit' to the unified modal
 * 3. Make it easy to rollback if needed (just restore old implementation)
 * 
 * If you need to change cover letter edit behavior, edit CoverLetterModal.tsx instead.
 */

import { CoverLetterModal } from './CoverLetterModal';
import type { CoverLetterDraft } from '@/types/coverLetters';

interface CoverLetterEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  coverLetter: CoverLetterDraft;
  startInPreview?: boolean;
  onSave?: () => void;
  onEditGoals?: () => void;
  onAddStory?: (requirement?: string, severity?: string) => void;
  onEnhanceSection?: (
    sectionId: string,
    requirement?: string,
    gapData?: { gaps?: Array<{ id: string; title?: string; description: string }>; gapSummary?: string | null }
  ) => void;
  onAddMetrics?: (sectionId?: string) => void;
}

export const CoverLetterEditModal = ({
  isOpen,
  onClose,
  coverLetter,
  startInPreview = false,
  onSave,
  onEditGoals,
  onAddStory,
  onEnhanceSection,
  onAddMetrics,
}: CoverLetterEditModalProps) => {
  return (
    <CoverLetterModal
      isOpen={isOpen}
      onClose={onClose}
      mode="edit"
      startInPreview={startInPreview}
      initialDraft={coverLetter}
      onCoverLetterCreated={onSave ? () => {
        // In edit mode, onCoverLetterCreated is used as onSave callback
        onSave();
      } : undefined}
      // TODO: Wire these Agent C callbacks into CoverLetterModal when needed
      // onEditGoals={onEditGoals}
      // onAddStory={onAddStory}
      // onEnhanceSection={onEnhanceSection}
      // onAddMetrics={onAddMetrics}
                  />
                );
};
