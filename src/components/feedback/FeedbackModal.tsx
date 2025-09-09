import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { FeedbackForm } from './FeedbackForm';
import { FeedbackFormState } from '@/types/feedback';
import { useFeedbackSubmission } from '@/hooks/useFeedbackSubmission';
import { cn } from '@/lib/utils';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialScreenshot?: string;
  initialClickLocation?: { x: number; y: number } | null;
  onFormDataChange?: (field: string, value: string) => void;
}

const getInitialFormState = (): FeedbackFormState => {
  // Check if user provided email in welcome modal
  const storedEmail = localStorage.getItem('narrata-feedback-email') || '';
  
  return {
    screenshot: '',
    clickLocation: { x: 0, y: 0 },
    sentiment: 'neutral',
    category: 'suggestion',
    message: '',
    email: storedEmail,
    isSubmitting: false,
    errors: {},
  };
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  initialScreenshot = '',
  initialClickLocation = null,
  onFormDataChange,
}) => {
  const [formState, setFormState] = useState<FeedbackFormState>(getInitialFormState());
  const [currentStep, setCurrentStep] = useState<'form' | 'success' | 'error'>('form');
  
  const { submitFeedback, isSubmitting, error: submissionError, success, reset } = useFeedbackSubmission();



  // Initialize form with provided data
  useEffect(() => {
    if (isOpen) {
      setFormState(prev => ({
        ...prev,
        screenshot: initialScreenshot,
        clickLocation: initialClickLocation || { x: 0, y: 0 },
      }));
    }
  }, [isOpen, initialScreenshot, initialClickLocation]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormState(INITIAL_FORM_STATE);
      setCurrentStep('form');
      reset();
    }
  }, [isOpen, reset]);

  const handleFormSubmit = async (data: FeedbackFormState) => {
    const success = await submitFeedback(data);
    if (success) {
      setCurrentStep('success');
    } else {
      setCurrentStep('error');
    }
  };

  const handleClose = () => {
    onClose();
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
            onFormDataChange={onFormDataChange}
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
              {submissionError || 'Failed to process your feedback. Please try again.'}
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
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {currentStep === 'form' && 'Share Your Feedback'}
            {currentStep === 'success' && 'Feedback Submitted'}
            {currentStep === 'error' && 'Error Occurred'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-6">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};
