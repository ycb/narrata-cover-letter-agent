import React, { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { FloatingFeedbackButton } from './FloatingFeedbackButton';
import { FeedbackModal } from './FeedbackModal';

export const FeedbackSystem: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Keyboard shortcut: Ctrl+Shift+F (or Cmd+Shift+F on Mac)
  useHotkeys('ctrl+shift+f, cmd+shift+f', (e) => {
    e.preventDefault();
    openFeedbackModal();
  });

  // Keyboard shortcut: Escape to close modal
  useHotkeys('escape', () => {
    if (isModalOpen) {
      closeFeedbackModal();
    }
  }, { enableOnFormTags: true });

  const openFeedbackModal = () => {
    setIsModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setIsModalOpen(false);
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  return (
    <>
      <FloatingFeedbackButton
        onClick={openFeedbackModal}
        isOpen={isModalOpen}
      />
      
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={closeFeedbackModal}
      />
    </>
  );
};
