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
  const [currentStep, setCurrentStep] = useState<'capturing' | 'form' | 'success' | 'error'>('capturing');
  
  const { captureScreenshot, isCapturing, error: screenshotError } = useScreenshot();
  const { clickLocation, startTracking, stopTracking } = useClickLocation();
  const { submitFeedback, isSubmitting, error: submissionError, success, reset } = useFeedbackSubmission();

  // Capture screenshot when modal opens
  useEffect(() => {
    if (isOpen) {
      handleScreenshotCapture();
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormState(INITIAL_FORM_STATE);
      setCurrentStep('capturing');
      reset();
    }
  }, [isOpen, reset]);

  // Update form state when click location is captured
  useEffect(() => {
    if (clickLocation) {
      setFormState(prev => ({
        ...prev,
        clickLocation,
      }));
      setCurrentStep('form');
    }
  }, [clickLocation]);

  const handleScreenshotCapture = async () => {
    setCurrentStep('capturing');
    const screenshot = await captureScreenshot();
    
    if (screenshot) {
      setFormState(prev => ({
        ...prev,
        screenshot,
      }));
      
      // Start tracking for click location
      startTracking();
    } else {
      setCurrentStep('error');
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
    onClose();
  };

  const handleRetry = () => {
    setCurrentStep('capturing');
    handleScreenshotCapture();
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'capturing':
        return (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-lg font-medium">Capturing screenshot...</p>
            <p className="text-sm text-muted-foreground text-center">
              Click anywhere on the page to highlight the area you want to discuss
            </p>
          </div>
        );

      case 'form':
        return (
          <FeedbackForm
            formState={formState}
            onSubmit={handleFormSubmit}
            onCancel={handleClose}
            isSubmitting={isSubmitting}
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            {currentStep === 'capturing' && 'Preparing Feedback Form'}
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
