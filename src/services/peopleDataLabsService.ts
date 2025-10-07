// People Data Labs API service for person enrichment
import { 
  PDLEnrichmentParams, 
  PDLEnrichmentResponse, 
  PDLEnrichmentResult,
  PDLPersonData,
  PDLWorkExperience,
  PDLEducation,
  PDLCertification
} from '@/types/peopleDataLabs';
import { extractLinkedInUsername } from '@/utils/linkedinUtils';
import type { 
  StructuredResumeData,
  WorkExperience,
  Education,
  Certification,
  Project
} from '@/types/fileUpload';

const PDL_API_URL = 'https://api.peopledatalabs.com/v5/person/enrich';
const PDL_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 2;

export class PeopleDataLabsService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_PDL_API_KEY;
    
    if (!this.apiKey) {
      console.warn('PDL API key not found. Set VITE_PDL_API_KEY in your environment variables.');
    }
  }

  /**
   * Check if PDL service is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Enrich person data using People Data Labs API
   * 
   * @param params - Enrichment parameters (name, company, LinkedIn URL, etc.)
   * @returns Enrichment result with person data
   */
  async enrichPerson(params: PDLEnrichmentParams): Promise<PDLEnrichmentResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'People Data Labs API is not configured. Please add VITE_PDL_API_KEY to your environment.',
        retryable: false
      };
    }

    try {
      console.log('🔍 PDL: Enriching person with params:', this.sanitizeParamsForLog(params));

      // Build query parameters
      const queryParams = this.buildQueryParams(params);
      
      if (Object.keys(queryParams).length === 0) {
        return {
          success: false,
          error: 'No valid enrichment parameters provided',
          retryable: false
        };
      }

      // Make API request with retry logic
      const response = await this.makeRequestWithRetry(queryParams);
      
      return response;
    } catch (error) {
      console.error('PDL enrichment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Person enrichment failed',
        retryable: true
      };
    }
  }

  /**
   * Enrich person using data from resume and auth
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
  ): Promise<PDLEnrichmentResult> {
    const params: PDLEnrichmentParams = {};

    // Add name
    if (fullName) {
      params.name = fullName;
      
      // Split name into first and last for better matching
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length >= 2) {
        params.first_name = nameParts[0];
        params.last_name = nameParts.slice(1).join(' ');
      }
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

    // Add LinkedIn URL
    if (linkedinUrl) {
      const username = extractLinkedInUsername(linkedinUrl);
      if (username) {
        params.linkedin = username;
        params.profile = [`linkedin.com/in/${username}`];
      }
    }

    console.log('🔍 PDL: Enriching from resume data with params:', this.sanitizeParamsForLog(params));
    
    return this.enrichPerson(params);
  }

  /**
   * Convert PDL person data to structured resume format
   * 
   * @param pdlData - PDL person data
   * @returns Structured resume data
   */
  convertToStructuredData(pdlData: PDLPersonData): StructuredResumeData {
    return {
      workHistory: this.convertWorkHistory(pdlData.experience || []),
      education: this.convertEducation(pdlData.education || []),
      skills: pdlData.skills || [],
      achievements: [], // PDL doesn't provide achievements directly
      contactInfo: {
        email: pdlData.email,
        phone: pdlData.phone_numbers?.[0],
        location: pdlData.location_name,
        linkedin: pdlData.linkedin_url,
        website: pdlData.websites?.[0]
      },
      summary: pdlData.summary || pdlData.headline,
      certifications: this.convertCertifications(pdlData.certifications || []),
      projects: [] // PDL doesn't provide projects directly
    };
  }

  /**
   * Build query parameters for PDL API
   */
  private buildQueryParams(params: PDLEnrichmentParams): Record<string, string> {
    const queryParams: Record<string, string> = {};

    if (params.name) {
      queryParams.name = params.name;
    }
    
    if (params.first_name) {
      queryParams.first_name = params.first_name;
    }
    
    if (params.last_name) {
      queryParams.last_name = params.last_name;
    }
    
    if (params.company) {
      queryParams.company = params.company;
    }
    
    if (params.linkedin) {
      queryParams.lid = params.linkedin;
    }
    
    if (params.profile && params.profile.length > 0) {
      queryParams.profile = params.profile[0];
    }

    return queryParams;
  }

  /**
   * Make API request with retry logic
   */
  private async makeRequestWithRetry(
    queryParams: Record<string, string>,
    retryCount = 0
  ): Promise<PDLEnrichmentResult> {
    try {
      const url = new URL(PDL_API_URL);
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PDL_TIMEOUT);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-Api-Key': this.apiKey,
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data: PDLEnrichmentResponse = await response.json();

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429 && retryCount < MAX_RETRIES) {
          console.log(`PDL rate limited, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          await this.delay(1000 * (retryCount + 1)); // Exponential backoff
          return this.makeRequestWithRetry(queryParams, retryCount + 1);
        }

        const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        
        return {
          success: false,
          error: errorMessage,
          retryable: response.status >= 500 || response.status === 429
        };
      }

      // Check if we got data back
      if (!data.data) {
        return {
          success: false,
          error: 'No person data found matching the provided criteria',
          retryable: false
        };
      }

      console.log('✅ PDL: Enrichment successful, likelihood:', data.likelihood);
      
      return {
        success: true,
        data: data.data,
        likelihood: data.likelihood
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timed out',
          retryable: true
        };
      }

      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        console.log(`PDL request failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await this.delay(1000 * (retryCount + 1));
        return this.makeRequestWithRetry(queryParams, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Convert PDL work experience to our format
   */
  private convertWorkHistory(experiences: PDLWorkExperience[]): WorkExperience[] {
    return experiences.map((exp, index) => {
      const company = exp.company?.name || '';
      const title = exp.title?.name || '';
      
      // Build comprehensive location string from available data
      const locationParts = [];
      if (exp.company?.location?.locality) locationParts.push(exp.company.location.locality);
      if (exp.company?.location?.region) locationParts.push(exp.company.location.region);
      if (exp.company?.location?.country) locationParts.push(exp.company.location.country);
      const location = locationParts.join(', ') || '';
      
      // Build a rich description from available PDL data
      const descriptionParts = [];
      if (exp.summary) {
        descriptionParts.push(exp.summary);
      }
      if (exp.title?.role) {
        descriptionParts.push(`Role: ${exp.title.role}`);
      }
      if (exp.title?.sub_role) {
        descriptionParts.push(`Specialty: ${exp.title.sub_role}`);
      }
      if (exp.company?.industry) {
        descriptionParts.push(`Industry: ${exp.company.industry}`);
      }
      if (exp.company?.size) {
        descriptionParts.push(`Company Size: ${exp.company.size}`);
      }
      
      const description = descriptionParts.join(' | ') || `${title} at ${company}`;
      
      // Build achievements from metadata
      const achievements = [];
      if (exp.title?.levels && exp.title.levels.length > 0) {
        achievements.push(`Level: ${exp.title.levels.join(', ')}`);
      }
      if (exp.is_primary) {
        achievements.push('Current/Primary Role');
      }
      
      return {
        id: `pdl_work_${index}`,
        company,
        title,
        startDate: this.normalizeDateString(exp.start_date),
        endDate: exp.end_date ? this.normalizeDateString(exp.end_date) : undefined,
        description,
        achievements,
        location,
        current: !exp.end_date && exp.is_primary === true
      };
    });
  }

  /**
   * Convert PDL education to our format
   */
  private convertEducation(educations: PDLEducation[]): Education[] {
    return educations.map((edu, index) => {
      const institution = edu.school?.name || '';
      const degree = edu.degrees?.[0] || '';
      const fieldOfStudy = edu.majors?.[0] || edu.minors?.[0] || '';
      const location = edu.school?.location?.name || '';
      
      return {
        id: `pdl_edu_${index}`,
        institution,
        degree,
        fieldOfStudy,
        startDate: this.normalizeDateString(edu.start_date),
        endDate: edu.end_date ? this.normalizeDateString(edu.end_date) : undefined,
        gpa: edu.gpa,
        location
      };
    });
  }

  /**
   * Convert PDL certifications to our format
   */
  private convertCertifications(certifications: PDLCertification[]): Certification[] {
    return certifications.map((cert, index) => ({
      id: `pdl_cert_${index}`,
      name: cert.name || '',
      issuer: cert.organization || '',
      issueDate: this.normalizeDateString(cert.start_date),
      expiryDate: cert.end_date ? this.normalizeDateString(cert.end_date) : undefined
    }));
  }

  /**
   * Normalize date string to YYYY-MM-DD format
   */
  private normalizeDateString(dateStr?: string): string {
    if (!dateStr) {
      return '';
    }

    try {
      // If it's just a year (e.g., "2020"), assume January 1st
      if (/^\d{4}$/.test(dateStr)) {
        return `${dateStr}-01-01`;
      }

      // If it's year-month (e.g., "2020-05"), assume 1st of month
      if (/^\d{4}-\d{2}$/.test(dateStr)) {
        return `${dateStr}-01`;
      }

      // If it's already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }

      // Try parsing as date
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }

      return dateStr;
    } catch (error) {
      console.warn('Error normalizing date:', dateStr, error);
      return dateStr;
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
  private sanitizeParamsForLog(params: PDLEnrichmentParams): Record<string, boolean> {
    return {
      hasName: !!params.name,
      hasFirstName: !!params.first_name,
      hasLastName: !!params.last_name,
      hasCompany: !!params.company,
      hasLinkedIn: !!params.linkedin,
      hasProfile: !!params.profile && params.profile.length > 0
    };
  }
}
