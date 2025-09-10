import { FeedbackData } from '@/types/feedback';
import { googleFormsService } from './googleFormsService';

export class FeedbackService {
  private static instance: FeedbackService;
  private submissions: FeedbackData[] = [];

  private constructor() {}

  static getInstance(): FeedbackService {
    if (!FeedbackService.instance) {
      FeedbackService.instance = new FeedbackService();
    }
    return FeedbackService.instance;
  }

  async submitFeedback(feedback: FeedbackData): Promise<boolean> {
    try {
      // Store locally for immediate access
      this.submissions.push(feedback);
      
      // Submit to Google Forms
      const success = await googleFormsService.submitFeedback(feedback);

      if (success) {
        return true;
      } else {
        console.warn('Feedback stored locally but failed to submit to Google Forms');
        return true; // Still return true since we have local storage
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  }

  getSubmissions(): FeedbackData[] {
    // Combine local submissions with stored feedback
    const storedFeedback = googleFormsService.getStoredFeedback();
    return [...this.submissions, ...storedFeedback];
  }

  clearSubmissions(): void {
    this.submissions = [];
    googleFormsService.clearStoredFeedback();
  }

  /**
   * Check if Google Forms integration is configured
   */
  isGoogleFormsConfigured(): boolean {
    return googleFormsService.isConfigured();
  }
}

export const feedbackService = FeedbackService.getInstance();
