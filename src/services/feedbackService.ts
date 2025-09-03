import { FeedbackData } from '@/types/feedback';
import { googleSheetsService } from './googleSheetsService';

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
      
      // Submit to Google Sheets
      const success = await googleSheetsService.submitFeedback(feedback);
      
      if (success) {
        console.log('Feedback submitted successfully');
        return true;
      } else {
        console.warn('Feedback stored locally but failed to submit to Google Sheets');
        return true; // Still return true since we have local storage
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  }

  getSubmissions(): FeedbackData[] {
    // Combine local submissions with stored feedback
    const storedFeedback = googleSheetsService.getStoredFeedback();
    return [...this.submissions, ...storedFeedback];
  }

  clearSubmissions(): void {
    this.submissions = [];
    googleSheetsService.clearStoredFeedback();
  }

  /**
   * Check if Google Sheets integration is configured
   */
  isGoogleSheetsConfigured(): boolean {
    return googleSheetsService.isConfigured();
  }
}

export const feedbackService = FeedbackService.getInstance();
