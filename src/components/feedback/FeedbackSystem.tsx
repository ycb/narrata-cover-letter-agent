import React, { useState, useEffect } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { FloatingFeedbackButton } from './FloatingFeedbackButton';
import { FeedbackModal } from './FeedbackModal';
import { FeedbackPin } from './FeedbackPin';
import { useInspectMode } from '@/hooks/useInspectMode';
import { useScreenshot } from '@/hooks/useScreenshot';

// Check if device is mobile/touch
const isTouchDevice = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export const FeedbackSystem: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [screenshot, setScreenshot] = useState<string>('');
  const [clickLocation, setClickLocation] = useState<{ x: number; y: number } | null>(null);
  const [currentCategory, setCurrentCategory] = useState<'bug' | 'suggestion' | 'praise'>('suggestion');
  const [formData, setFormData] = useState<{
    category: 'bug' | 'suggestion' | 'praise';
    sentiment: 'positive' | 'neutral' | 'negative';
    message: string;
    email: string;
  }>({
    category: 'suggestion',
    sentiment: 'neutral',
    message: '',
    email: '',
  });

  const { 
    isActive: isInspectModeActive, 
    startInspectMode, 
    stopInspectMode, 
    stopInspectModeKeepPin,
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

  // Handle button click - on mobile, skip inspect mode and open modal directly
  const handleFeedbackButtonClick = () => {
    if (isTouchDevice()) {
      // On mobile/touch devices, open modal directly
      openFeedbackModal();
    } else {
      // On desktop, use inspect mode for element pinning
      startInspectMode();
    }
  };

  const closeFeedbackModal = () => {
    setIsModalOpen(false);
    setScreenshot('');
    setClickLocation(null);
    stopInspectMode(); // Clear pin and stop inspect mode when modal closes
  };

  const handleFormDataChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Update category immediately for pin color
    if (field === 'category') {
      setCurrentCategory(value as 'bug' | 'suggestion' | 'praise');
    }
  };

  // Handle element pinning - open modal with screenshot
  useEffect(() => {
    if (pinnedElement && pinnedLocation) {
      setClickLocation(pinnedLocation);
      openFeedbackModal();
      stopInspectModeKeepPin(); // Stop inspect mode but keep pin visible
    }
  }, [pinnedElement, pinnedLocation, stopInspectModeKeepPin]);

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
        onClick={handleFeedbackButtonClick}
        isOpen={isInspectModeActive || isModalOpen}
      />
      
      {/* Show pin when element is pinned */}
      {pinnedLocation && (
        <FeedbackPin 
          x={pinnedLocation.x} 
          y={pinnedLocation.y} 
          category={currentCategory}
        />
      )}
      
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={closeFeedbackModal}
        initialScreenshot={screenshot}
        initialClickLocation={clickLocation}
        onFormDataChange={handleFormDataChange}
      />
    </>
  );
};
