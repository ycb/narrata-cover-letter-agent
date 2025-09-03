import { useState, useCallback } from 'react';
import { FeedbackData, FeedbackFormState } from '@/types/feedback';

export const useFeedbackSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitFeedback = useCallback(async (formData: FeedbackFormState): Promise<boolean> => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Prepare feedback data
      const feedbackData: FeedbackData = {
        screenshot: formData.screenshot,
        clickLocation: formData.clickLocation,
        sentiment: formData.sentiment,
        category: formData.category,
        message: formData.message,
        email: formData.email || undefined,
        pageUrl: window.location.href,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      };

      // TODO: Replace with actual Google Forms API integration
      // For now, simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Log feedback data (remove in production)
      console.log('Feedback submitted:', feedbackData);
      
      setSuccess(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit feedback';
      setError(errorMessage);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    submitFeedback,
    isSubmitting,
    error,
    success,
    reset,
  };
};
