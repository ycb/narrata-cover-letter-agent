import { FeedbackData } from '@/types/feedback';

interface GoogleSheetsConfig {
  spreadsheetId: string;
  range: string;
  apiKey: string;
}

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private config: GoogleSheetsConfig | null = null;

  private constructor() {
    // Initialize config from environment variables
    this.config = {
      spreadsheetId: import.meta.env.VITE_GOOGLE_SHEETS_ID || '',
      range: import.meta.env.VITE_GOOGLE_SHEETS_RANGE || 'Sheet1!A:H',
      apiKey: import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '',
    };
  }

  static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  /**
   * Submit feedback data to Google Sheets
   */
  async submitFeedback(feedback: FeedbackData): Promise<boolean> {
    if (!this.config?.spreadsheetId || !this.config?.apiKey) {
      console.warn('Google Sheets not configured. Using fallback storage.');
      return this.fallbackStorage(feedback);
    }

    try {
      const values = this.formatFeedbackForSheets(feedback);
      const response = await this.appendToSheet(values);
      
      if (response.ok) {
        console.log('Feedback submitted to Google Sheets successfully');
        return true;
      } else {
        console.error('Failed to submit to Google Sheets:', response.statusText);
        return this.fallbackStorage(feedback);
      }
    } catch (error) {
      console.error('Error submitting to Google Sheets:', error);
      return this.fallbackStorage(feedback);
    }
  }

  /**
   * Format feedback data for Google Sheets
   */
  private formatFeedbackForSheets(feedback: FeedbackData): string[][] {
    return [[
      new Date(feedback.timestamp).toLocaleString(),
      feedback.pageUrl,
      feedback.category,
      feedback.sentiment,
      feedback.message,
      feedback.email || 'No email provided',
      `${feedback.clickLocation.x}, ${feedback.clickLocation.y}`,
      feedback.userAgent
    ]];
  }

  /**
   * Append data to Google Sheet using Google Sheets API
   */
  private async appendToSheet(values: string[][]): Promise<Response> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config!.spreadsheetId}/values/${this.config!.range}:append?valueInputOption=USER_ENTERED&key=${this.config!.apiKey}`;
    
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values
      })
    });
  }

  /**
   * Fallback storage when Google Sheets is not available
   */
  private async fallbackStorage(feedback: FeedbackData): Promise<boolean> {
    try {
      // Store in localStorage as fallback
      const existingData = JSON.parse(localStorage.getItem('feedback_submissions') || '[]');
      existingData.push(feedback);
      localStorage.setItem('feedback_submissions', JSON.stringify(existingData));
      
      console.log('Feedback stored in localStorage as fallback');
      return true;
    } catch (error) {
      console.error('Fallback storage failed:', error);
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

  /**
   * Check if Google Sheets is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config?.spreadsheetId && this.config?.apiKey);
  }
}

export const googleSheetsService = GoogleSheetsService.getInstance();
