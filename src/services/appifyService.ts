// Appify API service for LinkedIn data scraping
import type { 
  StructuredResumeData,
  WorkExperience,
  Education,
  Certification
} from '@/types/fileUpload';
import { extractLinkedInUsername } from '@/utils/linkedinUtils';

const APPIFY_API_URL = 'https://api.cloud.appifyhub.com';
const APPIFY_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 2;

export interface AppifyEnrichmentParams {
  linkedinUrl?: string;
  name?: string;
  company?: string;
}

export interface AppifyEnrichmentResult {
  success: boolean;
  data?: StructuredResumeData;
  error?: string;
  retryable: boolean;
}

// Appify LinkedIn data structure (based on actual API response)
export interface AppifyPersonData {
  basic_info?: {
    fullname?: string;
    first_name?: string;
    last_name?: string;
    headline?: string;
    profile_url?: string;
    profile_picture_url?: string;
    about?: string;
    location?: {
      country?: string;
      city?: string;
      full?: string;
      country_code?: string;
    };
    email?: string | null;
    current_company?: string;
    follower_count?: number;
    connection_count?: number;
  };
  experience?: Array<{
    title?: string;
    company?: string;
    description?: string;
    location?: string;
    duration?: string;
    start_date?: {
      year?: number;
      month?: string;
    };
    end_date?: {
      year?: number;
      month?: string;
    };
    is_current?: boolean;
    company_linkedin_url?: string;
    company_logo_url?: string;
    skills?: string[];
    company_id?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    degree_name?: string;
    field_of_study?: string;
    duration?: string;
    start_date?: {
      year?: number;
      month?: string;
    };
    end_date?: {
      year?: number;
      month?: string;
    };
    school_linkedin_url?: string;
    school_logo_url?: string;
    school_id?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    associated_with?: string;
    is_current?: boolean;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
    issued_date?: string;
  }>;
  languages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
  skills?: string[];
}

export class AppifyService {
  private apiKey: string;

  constructor() {
    // Safely access import.meta.env (may be undefined in test environments)
    this.apiKey = (typeof import.meta !== 'undefined' && import.meta.env) 
      ? import.meta.env.VITE_APPIFY_API_KEY || ''
      : '';
    
    if (!this.apiKey) {
      console.warn('Appify API key not found. Set VITE_APPIFY_API_KEY in your environment variables.');
    }
  }

  /**
   * Check if Appify service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Enrich person data using Appify API
   * 
   * @param params - Enrichment parameters (LinkedIn URL, name, company)
   * @returns Enrichment result with person data
   */
  async enrichPerson(params: AppifyEnrichmentParams): Promise<AppifyEnrichmentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Appify API is not configured. Please add VITE_APPIFY_API_KEY to your environment.',
        retryable: false
      };
    }

    try {
      console.log('🔍 Appify: Enriching person with params:', this.sanitizeParamsForLog(params));

      if (!params.linkedinUrl && !params.name) {
        return {
          success: false,
          error: 'LinkedIn URL or name is required for Appify enrichment',
          retryable: false
        };
      }

      // Make API request with retry logic
      const response = await this.makeRequestWithRetry(params);
      
      return response;
    } catch (error) {
      console.error('Appify enrichment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Person enrichment failed',
        retryable: true
      };
    }
  }

  /**
   * Enrich person using data from resume
   * 
   * @param fullName - Person's full name from auth
   * @param resumeData - Structured resume data
   * @param linkedinUrl - LinkedIn URL (if available)
   * @returns Enrichment result
   */
  async enrichFromResumeData(
    fullName: string | null,
    resumeData: StructuredResumeData | null,
    linkedinUrl?: string
  ): Promise<AppifyEnrichmentResult> {
    const params: AppifyEnrichmentParams = {};

    // Add LinkedIn URL (primary identifier)
    if (linkedinUrl) {
      params.linkedinUrl = linkedinUrl;
    } else if (resumeData?.contactInfo?.linkedin) {
      params.linkedinUrl = resumeData.contactInfo.linkedin;
    }

    // Add name
    if (fullName) {
      params.name = fullName;
    }

    // Add most recent company from resume
    if (resumeData?.workHistory && resumeData.workHistory.length > 0) {
      // Sort by start date to get most recent
      const sortedWork = [...resumeData.workHistory].sort((a, b) => {
        if (a.current) return -1;
        if (b.current) return 1;
        return (b.startDate || '').localeCompare(a.startDate || '');
      });
      
      const latestJob = sortedWork[0];
      if (latestJob?.company) {
        params.company = latestJob.company;
      }
    }

    console.log('🔍 Appify: Enriching from resume data with params:', this.sanitizeParamsForLog(params));
    
    return this.enrichPerson(params);
  }

  /**
   * Convert Appify person data to structured resume format
   * 
   * @param appifyData - Appify person data
   * @returns Structured resume data
   */
  convertToStructuredData(appifyData: AppifyPersonData): StructuredResumeData {
    const basicInfo = appifyData.basic_info || {};
    const location = basicInfo.location?.full || basicInfo.location?.city || '';
    
    // Extract skills from experience entries if not at top level
    const allSkills: string[] = [...(appifyData.skills || [])];
    appifyData.experience?.forEach(exp => {
      if (exp.skills && Array.isArray(exp.skills)) {
        allSkills.push(...exp.skills);
      }
    });
    const uniqueSkills = Array.from(new Set(allSkills));

    return {
      workHistory: this.convertWorkHistory(appifyData.experience || []),
      education: this.convertEducation(appifyData.education || []),
      skills: uniqueSkills,
      achievements: [], // Appify doesn't provide achievements directly
      contactInfo: {
        email: basicInfo.email || undefined,
        phone: undefined, // Appify doesn't provide phone
        location: location,
        linkedin: basicInfo.profile_url || undefined,
        website: undefined // Appify doesn't provide website
      },
      summary: basicInfo.about || basicInfo.headline || '',
      certifications: this.convertCertifications(appifyData.certifications || []),
      projects: (appifyData.projects || []).map(proj => ({
        name: proj.name || '',
        description: proj.description || '',
        url: undefined,
        startDate: undefined,
        endDate: undefined
      }))
    };
  }

  /**
   * Convert Appify work experience to structured format
   */
  private convertWorkHistory(experience: AppifyPersonData['experience']): WorkExperience[] {
    if (!Array.isArray(experience)) return [];

    return experience.map((exp) => {
      const startDate = exp.start_date 
        ? this.formatDateFromObject(exp.start_date.year, exp.start_date.month)
        : '';
      
      const endDate = exp.end_date && !exp.is_current
        ? this.formatDateFromObject(exp.end_date.year, exp.end_date.month)
        : undefined;

      return {
        company: exp.company || '',
        position: exp.title || '',
        startDate: startDate,
        endDate: endDate,
        current: exp.is_current || false,
        description: exp.description || '',
        location: exp.location || ''
      };
    });
  }

  /**
   * Convert Appify education to structured format
   */
  private convertEducation(education: AppifyPersonData['education']): Education[] {
    if (!Array.isArray(education)) return [];

    return education.map((edu) => {
      const startDate = edu.start_date
        ? this.formatDateFromObject(edu.start_date.year, edu.start_date.month)
        : '';
      
      const endDate = edu.end_date
        ? this.formatDateFromObject(edu.end_date.year, edu.end_date.month)
        : undefined;

      return {
        institution: edu.school || '',
        degree: edu.degree || edu.degree_name || '',
        fieldOfStudy: edu.field_of_study || '',
        startDate: startDate,
        endDate: endDate,
        description: undefined // Appify doesn't provide education description
      };
    });
  }

  /**
   * Convert Appify certifications to structured format
   */
  private convertCertifications(certifications: AppifyPersonData['certifications']): Certification[] {
    if (!Array.isArray(certifications)) return [];

    return certifications.map((cert) => ({
      name: cert.name || '',
      issuer: cert.issuer || '',
      issueDate: cert.issued_date || '',
      expiryDate: undefined // Appify doesn't provide expiry date
    }));
  }

  /**
   * Format date object (year/month) to YYYY-MM-DD format
   */
  private formatDateFromObject(year?: number, month?: string): string {
    if (!year) return '';
    
    // Map month string to number (e.g., "Jan" -> 1, "Sep" -> 9)
    const monthMap: Record<string, number> = {
      'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
      'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
    };
    
    let monthNum = month ? monthMap[month.toLowerCase().slice(0, 3)] : undefined;
    if (!monthNum) monthNum = 1; // Default to January if can't parse
    
    // Return YYYY-MM-DD (default to first day of month)
    return `${year}-${String(monthNum).padStart(2, '0')}-01`;
  }

  /**
   * Parse date string to YYYY-MM-DD format (for backward compatibility)
   */
  private parseDate(dateStr?: string): string {
    if (!dateStr) return '';
    
    // Try to parse various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // Return original if can't parse
    
    return date.toISOString().split('T')[0];
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequestWithRetry(
    params: AppifyEnrichmentParams,
    retryCount = 0
  ): Promise<AppifyEnrichmentResult> {
    try {
      // Build request body for Appify API
      const requestBody: any = {};
      
      if (params.linkedinUrl) {
        const username = extractLinkedInUsername(params.linkedinUrl);
        if (username) {
          requestBody.linkedin_url = `https://www.linkedin.com/in/${username}`;
        }
      }
      
      if (params.name) {
        requestBody.name = params.name;
      }
      
      if (params.company) {
        requestBody.company = params.company;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), APPIFY_TIMEOUT);

      // TODO: Update endpoint based on Appify API documentation
      // This is a placeholder - need actual Appify API endpoint
      const endpoint = `${APPIFY_API_URL}/v1/scrape/linkedin`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          console.log(`Appify rate limited, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          await this.delay(1000 * (retryCount + 1)); // Exponential backoff
          return this.makeRequestWithRetry(params, retryCount + 1);
        }

        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        
        return {
          success: false,
          error: errorMessage,
          retryable: response.status >= 500 || response.status === 429
        };
      }

      const data: AppifyPersonData = await response.json();
      
      // Convert to structured format
      const structuredData = this.convertToStructuredData(data);
      
      return {
        success: true,
        data: structuredData
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          retryable: true
        };
      }

      console.error('Appify API request error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Appify API request failed',
        retryable: true
      };
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sanitize params for logging (remove sensitive data)
   */
  private sanitizeParamsForLog(params: AppifyEnrichmentParams): AppifyEnrichmentParams {
    return {
      ...params,
      // Keep params as-is for now, but could sanitize if needed
    };
  }
}

