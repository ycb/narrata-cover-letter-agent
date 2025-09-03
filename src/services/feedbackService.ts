import { FeedbackData } from '@/types/feedback';

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
      // Store locally for now (replace with Google Forms API)
      this.submissions.push(feedback);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return true;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      return false;
    }
  }

  getSubmissions(): FeedbackData[] {
    return [...this.submissions];
  }

  clearSubmissions(): void {
    this.submissions = [];
  }

  // TODO: Implement Google Forms API integration
  private async submitToGoogleForms(feedback: FeedbackData): Promise<boolean> {
    // This will be implemented when we set up Google Forms API
    throw new Error('Google Forms API not yet implemented');
  }
}

export const feedbackService = FeedbackService.getInstance();
