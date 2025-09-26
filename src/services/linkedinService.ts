// LinkedIn API service for profile data fetching
import { LINKEDIN_CONFIG } from '@/lib/config/fileUpload';
import type { 
  LinkedInApiResult, 
  LinkedInProfileData, 
  WorkExperience, 
  Education, 
  Certification,
  Project
} from '@/types/fileUpload';

export class LinkedInService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Fetch LinkedIn profile data
   */
  async fetchProfileData(): Promise<LinkedInApiResult> {
    try {
      // Fetch basic profile info
      const profileInfo = await this.fetchBasicProfile();
      if (!profileInfo.success) {
        return profileInfo;
      }

      // Fetch additional data in parallel
      const [experience, education, skills, certifications, projects] = await Promise.all([
        this.fetchExperience(),
        this.fetchEducation(),
        this.fetchSkills(),
        this.fetchCertifications(),
        this.fetchProjects()
      ]);

      const profileData: LinkedInProfileData = {
        linkedinId: profileInfo.data!.id,
        profileUrl: profileInfo.data!.profileUrl,
        about: profileInfo.data!.about,
        experience: experience.success ? experience.data! : [],
        education: education.success ? education.data! : [],
        skills: skills.success ? skills.data! : [],
        certifications: certifications.success ? certifications.data! : [],
        projects: projects.success ? projects.data! : [],
        rawData: {
          profile: profileInfo.data,
          experience: experience.data,
          education: education.data,
          skills: skills.data,
          certifications: certifications.data,
          projects: projects.data
        }
      };

      return {
        success: true,
        data: profileData
      };
    } catch (error) {
      console.error('LinkedIn profile fetch error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LinkedIn profile fetch failed',
        retryable: true
      };
    }
  }

  /**
   * Fetch basic profile information
   */
  private async fetchBasicProfile(): Promise<LinkedInApiResult> {
    try {
      const response = await this.makeLinkedInRequest('/me', {
        fields: 'id,firstName,lastName,headline,summary,profilePicture(displayImage~:playableStreams)'
      });

      if (!response.success) {
        return response;
      }

      const data = response.data!;
      return {
        success: true,
        data: {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          headline: data.headline,
          about: data.summary,
          profileUrl: `https://linkedin.com/in/${data.id}`,
          profilePicture: data.profilePicture?.displayImage?.elements?.[0]?.identifiers?.[0]?.identifier
        }
      };
    } catch (error) {
      console.error('LinkedIn basic profile error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch basic profile',
        retryable: true
      };
    }
  }

  /**
   * Fetch work experience
   */
  private async fetchExperience(): Promise<LinkedInApiResult> {
    try {
      const response = await this.makeLinkedInRequest('/me/positions', {
        fields: 'id,title,summary,startDate,endDate,isCurrent,company,location'
      });

      if (!response.success) {
        return response;
      }

      const experiences = response.data!.elements || [];
      const workHistory: WorkExperience[] = experiences.map((exp: any, index: number) => ({
        id: exp.id || `linkedin_work_${index}`,
        company: exp.company?.name || '',
        title: exp.title || '',
        startDate: this.formatLinkedInDate(exp.startDate),
        endDate: exp.isCurrent ? undefined : this.formatLinkedInDate(exp.endDate),
        description: exp.summary || '',
        achievements: [], // LinkedIn doesn't provide achievements directly
        location: exp.location?.name || undefined,
        current: Boolean(exp.isCurrent)
      }));

      return {
        success: true,
        data: workHistory
      };
    } catch (error) {
      console.error('LinkedIn experience error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch experience',
        retryable: true
      };
    }
  }

  /**
   * Fetch education
   */
  private async fetchEducation(): Promise<LinkedInApiResult> {
    try {
      const response = await this.makeLinkedInRequest('/me/educations', {
        fields: 'id,schoolName,degreeName,fieldOfStudy,startDate,endDate,grade'
      });

      if (!response.success) {
        return response;
      }

      const educations = response.data!.elements || [];
      const education: Education[] = educations.map((edu: any, index: number) => ({
        id: edu.id || `linkedin_edu_${index}`,
        institution: edu.schoolName || '',
        degree: edu.degreeName || '',
        fieldOfStudy: edu.fieldOfStudy || undefined,
        startDate: this.formatLinkedInDate(edu.startDate),
        endDate: this.formatLinkedInDate(edu.endDate),
        gpa: edu.grade || undefined,
        location: undefined // LinkedIn doesn't provide location for education
      }));

      return {
        success: true,
        data: education
      };
    } catch (error) {
      console.error('LinkedIn education error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch education',
        retryable: true
      };
    }
  }

  /**
   * Fetch skills
   */
  private async fetchSkills(): Promise<LinkedInApiResult> {
    try {
      const response = await this.makeLinkedInRequest('/me/skills', {
        fields: 'elements'
      });

      if (!response.success) {
        return response;
      }

      const skills = response.data!.elements || [];
      const skillNames: string[] = skills.map((skill: any) => skill.name).filter(Boolean);

      return {
        success: true,
        data: skillNames
      };
    } catch (error) {
      console.error('LinkedIn skills error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch skills',
        retryable: true
      };
    }
  }

  /**
   * Fetch certifications
   */
  private async fetchCertifications(): Promise<LinkedInApiResult> {
    try {
      const response = await this.makeLinkedInRequest('/me/certifications', {
        fields: 'id,name,authority,number,startDate,endDate'
      });

      if (!response.success) {
        return response;
      }

      const certifications = response.data!.elements || [];
      const certs: Certification[] = certifications.map((cert: any, index: number) => ({
        id: cert.id || `linkedin_cert_${index}`,
        name: cert.name || '',
        issuer: cert.authority || '',
        issueDate: this.formatLinkedInDate(cert.startDate),
        expiryDate: this.formatLinkedInDate(cert.endDate),
        credentialId: cert.number || undefined
      }));

      return {
        success: true,
        data: certs
      };
    } catch (error) {
      console.error('LinkedIn certifications error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch certifications',
        retryable: true
      };
    }
  }

  /**
   * Fetch projects
   */
  private async fetchProjects(): Promise<LinkedInApiResult> {
    try {
      const response = await this.makeLinkedInRequest('/me/projects', {
        fields: 'id,name,description,startDate,endDate,url'
      });

      if (!response.success) {
        return response;
      }

      const projects = response.data!.elements || [];
      const projectList: Project[] = projects.map((proj: any, index: number) => ({
        id: proj.id || `linkedin_project_${index}`,
        name: proj.name || '',
        description: proj.description || '',
        technologies: [], // LinkedIn doesn't provide technologies for projects
        startDate: this.formatLinkedInDate(proj.startDate),
        endDate: this.formatLinkedInDate(proj.endDate),
        url: proj.url || undefined
      }));

      return {
        success: true,
        data: projectList
      };
    } catch (error) {
      console.error('LinkedIn projects error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch projects',
        retryable: true
      };
    }
  }

  /**
   * Make LinkedIn API request with proper error handling and retry logic
   */
  private async makeLinkedInRequest(endpoint: string, params: Record<string, string>): Promise<LinkedInApiResult> {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `https://api.linkedin.com/v2${endpoint}?${queryString}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        signal: AbortSignal.timeout(LINKEDIN_CONFIG.TIMEOUT)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `HTTP ${response.status}`;
        
        return {
          success: false,
          error: errorMessage,
          retryable: response.status >= 500 || response.status === 429
        };
      }

      const data = await response.json() as Record<string, unknown>;
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('LinkedIn API request error:', error);
      
      // Determine if error is retryable
      const isRetryable = error instanceof Error && 
        (error.name === 'TimeoutError' || error.message.includes('network'));
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LinkedIn API request failed',
        retryable: isRetryable
      };
    }
  }

  /**
   * Format LinkedIn date to YYYY-MM-DD format
   */
  private formatLinkedInDate(dateObj: any): string | undefined {
    if (!dateObj) return undefined;
    
    const { year, month } = dateObj;
    if (!year) return undefined;
    
    const formattedMonth = month ? String(month).padStart(2, '0') : '01';
    const formattedDay = '01'; // LinkedIn doesn't provide day, default to 01
    
    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  /**
   * Validate LinkedIn URL
   */
  static validateLinkedInUrl(url: string): boolean {
    const linkedinRegex = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
    return linkedinRegex.test(url);
  }

  /**
   * Extract LinkedIn username from URL
   */
  static extractLinkedInUsername(url: string): string | null {
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9-]+)/);
    return match ? match[1] : null;
  }
}
