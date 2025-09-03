import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackFormState } from '@/types/feedback';
import { useScreenshot } from '@/hooks/useScreenshot';
import { useClickLocation } from '@/hooks/useClickLocation';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM_STATE: FeedbackFormState = {
  screenshot: '',
  clickLocation: { x: 0, y: 0 },
  sentiment: 'neutral',
  category: 'suggestion',
  message: '',
  email: '',
  isSubmitting: false,
  errors: {},
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [formState, setFormState] = useState<FeedbackFormState>(INITIAL_FORM_STATE);
  const [currentStep, setCurrentStep] = useState<'form' | 'success' | 'error'>('form');
  const [isTrackingClick, setIsTrackingClick] = useState(false);
  
  const { captureScreenshot, isCapturing, error: screenshotError } = useScreenshot();
  const { clickLocation, startTracking, stopTracking } = useClickLocation();
  const { submitFeedback, isSubmitting, error: submissionError, success, reset } = useFeedbackSubmission();

  // Don't auto-capture screenshot - let user control the flow
  // useEffect(() => {
  //   if (isOpen) {
  //     handleScreenshotCapture();
  //   }
  // }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormState(INITIAL_FORM_STATE);
      setCurrentStep('form'); // Start with form, not capturing
      reset();
      stopTracking();
    }
  }, [isOpen, reset, stopTracking]);

  // Update form state when click location is captured
  useEffect(() => {
    if (clickLocation) {
      setFormState(prev => ({
        ...prev,
        clickLocation,
      }));
      setIsTrackingClick(false);
    }
  }, [clickLocation]);

  const handleScreenshotCapture = async () => {
    const screenshot = await captureScreenshot();
    
    if (screenshot) {
      setFormState(prev => ({
        ...prev,
        screenshot,
      }));
    }
  };

  const handleFormSubmit = async (data: FeedbackFormState) => {
    const success = await submitFeedback(data);
    if (success) {
      setCurrentStep('success');
    } else {
      setCurrentStep('error');
    }
  };

  const handleClose = () => {
    stopTracking();
    setIsTrackingClick(false);
    onClose();
  };

  const handleStartClickTracking = () => {
    setIsTrackingClick(true);
    startTracking();
  };

  const handleRetry = () => {
    setCurrentStep('form');
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'form':
        return (
          <FeedbackForm
            formState={formState}
            onSubmit={handleFormSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
            onCaptureScreenshot={handleScreenshotCapture}
            onStartClickTracking={handleStartClickTracking}
            isCapturingScreenshot={isCapturing}
            isTrackingClick={isTrackingClick}
          />
        );

      case 'success':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold">Thank you for your feedback!</h3>
            <p className="text-muted-foreground text-center">
              We've received your feedback and will review it carefully.
            </p>
            <Button onClick={handleClose} className="mt-4">
              Close
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
            <h3 className="text-xl font-semibold">Something went wrong</h3>
            <p className="text-muted-foreground text-center">
              {screenshotError || submissionError || 'Failed to process your feedback. Please try again.'}
            </p>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={handleRetry}>
                Try Again
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-feedback-modal
      >
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            {currentStep === 'form' && 'Share Your Feedback'}
            {currentStep === 'success' && 'Feedback Submitted'}
            {currentStep === 'error' && 'Error Occurred'}
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="mt-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
