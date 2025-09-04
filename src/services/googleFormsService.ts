import { FeedbackData } from '@/types/feedback';

export class GoogleFormsService {
  private static instance: GoogleFormsService;
  private formUrl: string | null = null;

  private constructor() {
    // Get Google Form URL from environment variables
    // Default to the correct form URL if not configured
    this.formUrl = import.meta.env.VITE_GOOGLE_FORMS_URL || 'https://docs.google.com/forms/d/e/1FAIpQLSfJe8zE3orRepl8iu7OrMIROdAaV3vFci2AbBVbSiOEtcSbWQ/formResponse';
  }

  static getInstance(): GoogleFormsService {
    if (!GoogleFormsService.instance) {
      GoogleFormsService.instance = new GoogleFormsService();
    }
    return GoogleFormsService.instance;
  }

  /**
   * Check if Google Forms is configured
   */
  isConfigured(): boolean {
    return !!this.formUrl;
  }

  /**
   * Submit feedback to Google Form
   */
  async submitFeedback(feedback: FeedbackData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Google Form URL not configured. Using fallback storage.');
      return this.fallbackStorage(feedback);
    }

    try {
      // Map sentiment to match Google Form options (Positive, Neutral, Negative)
      const sentimentMap = {
        'positive': 'Positive',
        'neutral': 'Neutral', 
        'negative': 'Negative'
      };

      // Create URL-encoded data for Google Forms submission
      const urlEncodedData = new URLSearchParams();
      urlEncodedData.append('entry.638918608', feedback.timestamp);
      urlEncodedData.append('entry.1865964081', feedback.pageUrl);
      urlEncodedData.append('entry.1282507941', feedback.category);
      urlEncodedData.append('entry.1641611400', sentimentMap[feedback.sentiment] || feedback.sentiment);
      urlEncodedData.append('entry.1916748410', feedback.message);
      urlEncodedData.append('entry.619009191', feedback.email || 'No email provided');
      urlEncodedData.append('entry.1941192234', `${feedback.clickLocation.x}, ${feedback.clickLocation.y}`);
      urlEncodedData.append('entry.373119231', feedback.userAgent);

      console.log('Submitting feedback to Google Form:', {
        url: this.formUrl,
        formData: Array.from(urlEncodedData.entries()),
        originalData: feedback
      });

      // Submit with all form data
      const response = await fetch(this.formUrl!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: urlEncodedData, // Use full form data
        mode: 'no-cors', // Required for Google Forms
      });

      // With no-cors mode, we can't check the response status
      // But if no error is thrown, we assume it worked
      console.log('Feedback submitted to Google Form successfully');
      return true;
    } catch (error) {
      console.error('❌ Error submitting feedback to Google Form:', error);
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
