import React, { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { FloatingFeedbackButton } from './FloatingFeedbackButton';
import { FeedbackModal } from './FeedbackModal';
import { FeedbackPin } from './FeedbackPin';
import { useInspectMode } from '@/hooks/useInspectMode';
import { useScreenshot } from '@/hooks/useScreenshot';

export const FeedbackSystem: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string>('');
  const [clickLocation, setClickLocation] = useState<{ x: number; y: number } | null>(null);

  const { 
    isActive: isInspectModeActive, 
    startInspectMode, 
    stopInspectMode, 
    pinnedElement, 
    pinnedLocation 
  } = useInspectMode();
  
  const { captureScreenshot } = useScreenshot();

  // Keyboard shortcut: Ctrl+Shift+F (or Cmd+Shift+F on Mac)
  useHotkeys('ctrl+shift+f, cmd+shift+f', (e) => {
    e.preventDefault();
    startInspectMode();
  });

  // Keyboard shortcut: Escape to close modal or stop inspect mode
  useHotkeys('escape', () => {
    if (isModalOpen) {
      closeFeedbackModal();
    } else if (isInspectModeActive) {
      stopInspectMode();
    }
  }, { enableOnFormTags: true });

  const openFeedbackModal = async () => {
    // Capture screenshot when opening modal
    const screenshotData = await captureScreenshot();
    if (screenshotData) {
      setScreenshot(screenshotData);
    }
    setIsModalOpen(true);
  };

  const closeFeedbackModal = () => {
    setIsModalOpen(false);
    setScreenshot('');
    setClickLocation(null);
  };

  // Handle element pinning - open modal with screenshot
  useEffect(() => {
    if (pinnedElement && pinnedLocation) {
      setClickLocation(pinnedLocation);
      openFeedbackModal();
    }
  }, [pinnedElement, pinnedLocation]);

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
        onClick={startInspectMode}
        isOpen={isInspectModeActive || isModalOpen}
      />
      
      {/* Show pin when element is pinned */}
      {pinnedLocation && (
        <FeedbackPin x={pinnedLocation.x} y={pinnedLocation.y} />
      )}
      
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={closeFeedbackModal}
        initialScreenshot={screenshot}
        initialClickLocation={clickLocation}
      />
    </>
  );
};
