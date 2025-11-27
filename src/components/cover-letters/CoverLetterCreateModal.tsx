/**
 * CoverLetterCreateModal - THIN WRAPPER
 * 
 * ⚠️ IMPORTANT: DO NOT ADD LOGIC HERE
 * 
 * This component is a thin wrapper around CoverLetterModal.
 * All real behavior lives in CoverLetterModal.tsx.
 * 
 * This wrapper exists to:
 * 1. Preserve the public API (keep call sites unchanged)
 * 2. Pass mode='create' to the unified modal
 * 3. Make it easy to rollback if needed (just restore old implementation)
 * 
 * If you need to change cover letter creation behavior, edit CoverLetterModal.tsx instead.
 */

import { CoverLetterModal } from './CoverLetterModal';
import type { CoverLetterDraft } from '@/types/coverLetters';

interface CoverLetterCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCoverLetterCreated?: (draft: CoverLetterDraft) => void;
}

export const CoverLetterCreateModal = ({
  isOpen,
  onClose,
  onCoverLetterCreated,
}: CoverLetterCreateModalProps) => {
    return (
    <CoverLetterModal
      isOpen={isOpen}
      onClose={onClose}
      mode="create"
      initialDraft={null}
      onCoverLetterCreated={onCoverLetterCreated}
    />
  );
};

// Default export for backwards compatibility with existing imports
export default CoverLetterCreateModal;
