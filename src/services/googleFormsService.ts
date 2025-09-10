import { FeedbackData } from '@/types/feedback';

export class GoogleFormsService {
  private static instance: GoogleFormsService;
  private formUrl: string | null = null;

  private constructor() {
    // Get Google Apps Script URL from environment variables
    this.formUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || null;
  }

  static getInstance(): GoogleFormsService {
    if (!GoogleFormsService.instance) {
      GoogleFormsService.instance = new GoogleFormsService();
    }
    return GoogleFormsService.instance;
  }

  /**
   * Check if Google Apps Script is configured
   */
  isConfigured(): boolean {
    return !!this.formUrl;
  }

  /**
   * Submit feedback via Google Apps Script
   */
  async submitFeedback(feedback: FeedbackData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Google Apps Script URL not configured. Using fallback storage.');
      return this.fallbackStorage(feedback);
    }

    try {
      // Map sentiment to match Google Form options (Positive, Neutral, Negative)
      const sentimentMap = {
        'positive': 'Positive',
        'neutral': 'Neutral', 
        'negative': 'Negative'
      };

      // Prepare data for Apps Script
      const submissionData = {
        timestamp: feedback.timestamp,
        pageUrl: feedback.pageUrl,
        message: feedback.message,
        email: feedback.email || 'No email provided',
        clickLocation: feedback.clickLocation,
        userAgent: feedback.userAgent,
        category: feedback.category,
        sentiment: sentimentMap[feedback.sentiment] || feedback.sentiment
      };

      // Submit feedback via Google Apps Script

      // Use a form submission approach to bypass CORS
      return new Promise((resolve) => {
        // Create a hidden iframe to receive the response
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'feedback-submission-frame';
        document.body.appendChild(iframe);

        // Create a hidden form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.formUrl!;
        form.target = 'feedback-submission-frame'; // Submit to hidden iframe
        form.style.display = 'none';

        // Add data as hidden inputs
        Object.entries(submissionData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = typeof value === 'object' ? JSON.stringify(value) : String(value);
          form.appendChild(input);
        });

        // Add form to DOM, submit, and clean up
        document.body.appendChild(form);
        form.submit();
        
        // Clean up after a short delay
        setTimeout(() => {
          try {
            document.body.removeChild(form);
            document.body.removeChild(iframe);
          } catch (error) {
            // Expected error - elements may have been removed already
          }
        }, 2000);

        resolve(true);
      });
    } catch (error) {
      console.error('❌ Error submitting feedback via Apps Script:', error);
      console.log('🔄 Falling back to localStorage storage');
      
      // Log the error details for debugging
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      
      return this.fallbackStorage(feedback);
    }
  }

  /**
   * Fallback storage when Google Forms is not available
   */
  private async fallbackStorage(feedback: FeedbackData): Promise<boolean> {
    try {
      // Store in localStorage as fallback
      const existingData = JSON.parse(localStorage.getItem('feedback_submissions') || '[]');
      existingData.push(feedback);
      localStorage.setItem('feedback_submissions', JSON.stringify(existingData));
      
      console.log('💾 Feedback stored in localStorage as fallback');
      console.log('📊 Total submissions in localStorage:', existingData.length);
      return true;
    } catch (error) {
      console.error('❌ Fallback storage failed:', error);
      return false;
    }
  }

  /**
   * Get stored feedback from localStorage (fallback)
   */
  getStoredFeedback(): FeedbackData[] {
    try {
      return JSON.parse(localStorage.getItem('feedback_submissions') || '[]');
    } catch (error) {
      console.error('Error retrieving stored feedback:', error);
      return [];
    }
  }

  /**
   * Clear stored feedback from localStorage
   */
  clearStoredFeedback(): void {
    localStorage.removeItem('feedback_submissions');
  }
}

export const googleFormsService = GoogleFormsService.getInstance();
