export interface FeedbackData {
  screenshot: string; // base64 image
  clickLocation: { x: number; y: number };
  sentiment: 'positive' | 'neutral' | 'negative';
  category: 'bug' | 'suggestion' | 'praise';
  message: string;
  email?: string;
  pageUrl: string;
  timestamp: string;
  userAgent: string;
}

export interface FeedbackFormState {
  screenshot: string;
  clickLocation: { x: number; y: number };
  sentiment: 'positive' | 'neutral' | 'negative';
  category: 'bug' | 'suggestion' | 'praise';
  message: string;
  email: string;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export type SentimentType = 'positive' | 'neutral' | 'negative';
export type CategoryType = 'bug' | 'suggestion' | 'praise';
