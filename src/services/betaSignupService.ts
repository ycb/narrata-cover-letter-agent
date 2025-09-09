export interface BetaSignupData {
  email: string;
  source: 'welcome-modal' | 'feedback-form' | 'manual';
  pageUrl?: string;
  userAgent?: string;
  timestamp?: string;
}

export class BetaSignupService {
  private static instance: BetaSignupService;
  private scriptUrl: string | null = null;

  private constructor() {
    // Get Google Apps Script URL from environment variables
    this.scriptUrl = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL || null;
  }

  static getInstance(): BetaSignupService {
    if (!BetaSignupService.instance) {
      BetaSignupService.instance = new BetaSignupService();
    }
    return BetaSignupService.instance;
  }

  /**
   * Check if Google Apps Script is configured
   */
  isConfigured(): boolean {
    return !!this.scriptUrl;
  }

  /**
   * Submit beta signup via Google Apps Script
   */
  async submitBetaSignup(data: BetaSignupData): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Google Apps Script URL not configured. Using fallback storage.');
      return this.fallbackStorage(data);
    }

    try {
      // Prepare data for Apps Script
      const submissionData = {
        timestamp: data.timestamp || new Date().toISOString(),
        email: data.email,
        source: data.source,
        pageUrl: data.pageUrl || window.location.href,
        userAgent: data.userAgent || navigator.userAgent,
        submissionType: 'beta-signup'
      };

      // Submit via Google Apps Script using form submission
      return new Promise((resolve) => {
        // Create a hidden iframe to receive the response
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.name = 'beta-signup-frame';
        document.body.appendChild(iframe);

        // Create a hidden form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = this.scriptUrl!;
        form.target = 'beta-signup-frame';
        form.style.display = 'none';

        // Add data as hidden inputs
        Object.entries(submissionData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = String(value);
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
      console.error('❌ Error submitting beta signup via Apps Script:', error);
      console.log('🔄 Falling back to localStorage storage');
      
      return this.fallbackStorage(data);
    }
  }

  /**
   * Fallback storage when Google Apps Script is not available
   */
  private async fallbackStorage(data: BetaSignupData): Promise<boolean> {
    try {
      // Store in localStorage as fallback
      const existingData = JSON.parse(localStorage.getItem('beta_signups') || '[]');
      existingData.push(data);
      localStorage.setItem('beta_signups', JSON.stringify(existingData));
      
      console.log('💾 Beta signup stored in localStorage as fallback');
      console.log('📊 Total beta signups in localStorage:', existingData.length);
      return true;
    } catch (error) {
      console.error('❌ Fallback storage failed:', error);
      return false;
    }
  }

  /**
   * Get stored beta signups from localStorage (fallback)
   */
  getStoredBetaSignups(): BetaSignupData[] {
    try {
      return JSON.parse(localStorage.getItem('beta_signups') || '[]');
    } catch (error) {
      console.error('Error retrieving stored beta signups:', error);
      return [];
    }
  }

  /**
   * Clear stored beta signups from localStorage
   */
  clearStoredBetaSignups(): void {
    localStorage.removeItem('beta_signups');
  }
}

export const betaSignupService = BetaSignupService.getInstance();
