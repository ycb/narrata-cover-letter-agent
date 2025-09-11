// OpenAI service for LLM analysis
import { OPENAI_CONFIG } from '@/lib/config/fileUpload';
import type { 
  LLMAnalysisResult, 
  StructuredResumeData, 
  WorkExperience, 
  Education, 
  ContactInfo,
  Certification,
  Project
} from '@/types/fileUpload';

export class LLMAnalysisService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_KEY;
    this.baseUrl = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_KEY in your environment variables.');
    }
  }

  /**
   * Analyze resume text and extract structured data
   */
  async analyzeResume(text: string): Promise<LLMAnalysisResult> {
    try {
      const prompt = this.buildResumeAnalysisPrompt(text);
      const response = await this.callOpenAI(prompt);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error,
          retryable: response.retryable
        };
      }

      // Parse and validate the response
      const structuredData = this.parseStructuredData(response.data);
      
      return {
        success: true,
        data: structuredData
      };
    } catch (error) {
      console.error('LLM analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'LLM analysis failed',
        retryable: true
      };
    }
  }

  /**
   * Analyze cover letter text and extract structured data
   */
  async analyzeCoverLetter(text: string): Promise<LLMAnalysisResult> {
    try {
      const prompt = this.buildCoverLetterAnalysisPrompt(text);
      const response = await this.callOpenAI(prompt);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error,
          retryable: response.retryable
        };
      }

      // Parse and validate the response
      const structuredData = this.parseStructuredData(response.data);
      
      return {
        success: true,
        data: structuredData
      };
    } catch (error) {
      console.error('Cover letter LLM analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cover letter LLM analysis failed',
        retryable: true
      };
    }
  }

  /**
   * Analyze case study text and extract structured data
   */
  async analyzeCaseStudy(text: string): Promise<LLMAnalysisResult> {
    try {
      const prompt = this.buildCaseStudyAnalysisPrompt(text);
      const response = await this.callOpenAI(prompt);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error,
          retryable: response.retryable
        };
      }

      // Parse and validate the response
      const structuredData = this.parseStructuredData(response.data);
      
      return {
        success: true,
        data: structuredData
      };
    } catch (error) {
      console.error('Case study LLM analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Case study LLM analysis failed',
        retryable: true
      };
    }
  }

  /**
   * Build prompt for resume analysis
   */
  private buildResumeAnalysisPrompt(text: string): string {
    return `
Analyze this resume text and extract structured data. Return ONLY valid JSON with no additional text.

Resume Text:
${text}

Extract the following information and return as JSON:

{
  "workHistory": [
    {
      "id": "unique_id",
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Job description",
      "achievements": ["achievement1", "achievement2"],
      "location": "City, State",
      "current": true/false
    }
  ],
  "education": [
    {
      "id": "unique_id",
      "institution": "University Name",
      "degree": "Degree Type",
      "fieldOfStudy": "Field of Study",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "GPA if mentioned",
      "location": "City, State"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "achievements": ["achievement1", "achievement2"],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "phone number",
    "location": "City, State",
    "website": "website URL",
    "linkedin": "LinkedIn URL"
  },
  "summary": "Professional summary if present",
  "certifications": [
    {
      "id": "unique_id",
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "issueDate": "YYYY-MM-DD",
      "expiryDate": "YYYY-MM-DD or null if no expiry",
      "credentialId": "Credential ID if mentioned"
    }
  ],
  "projects": [
    {
      "id": "unique_id",
      "name": "Project Name",
      "description": "Project description",
      "technologies": ["tech1", "tech2"],
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if ongoing",
      "url": "Project URL if mentioned"
    }
  ]
}

Rules:
- Use realistic dates (convert relative dates like "2020-2022" to "2020-01-01" and "2022-12-31")
- Extract only information explicitly mentioned in the text
- If information is not available, use null or empty array
- Ensure all dates are in YYYY-MM-DD format
- Generate unique IDs for each item
- Be conservative with achievements - only include clear accomplishments
- Skills should be specific and technical when possible
- Return valid JSON only, no markdown formatting
`;
  }

  /**
   * Build prompt for cover letter analysis
   */
  private buildCoverLetterAnalysisPrompt(text: string): string {
    return `
Analyze this cover letter text and extract structured data. Return ONLY valid JSON with no additional text.

Cover Letter Text:
${text}

Extract the following information and return as JSON:

{
  "workHistory": [
    {
      "id": "unique_id",
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Job description",
      "achievements": ["achievement1", "achievement2"],
      "location": "City, State",
      "current": true/false
    }
  ],
  "education": [
    {
      "id": "unique_id",
      "institution": "University Name",
      "degree": "Degree Type",
      "fieldOfStudy": "Field of Study",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD",
      "gpa": "GPA if mentioned",
      "location": "City, State"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"],
  "achievements": ["achievement1", "achievement2"],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "phone number if mentioned",
    "location": "City, State",
    "website": "website if mentioned",
    "linkedin": "linkedin if mentioned"
  },
  "summary": "Brief professional summary"
}

Instructions:
- Extract work experience, education, skills, and achievements mentioned in the cover letter
- Focus on accomplishments and achievements that demonstrate value
- Include any specific metrics or results mentioned
- Extract contact information if present
- Create a professional summary based on the content
- Ensure all dates are in YYYY-MM-DD format
- Generate unique IDs for each item
- Return valid JSON only, no markdown formatting
`;
  }

  /**
   * Build prompt for case study analysis
   */
  private buildCaseStudyAnalysisPrompt(text: string): string {
    return `
Analyze this case study text and extract structured data. Return ONLY valid JSON with no additional text.

Case Study Text:
${text}

Extract the following information and return as JSON:

{
  "workHistory": [
    {
      "id": "unique_id",
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM-DD",
      "endDate": "YYYY-MM-DD or null if current",
      "description": "Project/case study description",
      "achievements": ["achievement1", "achievement2"],
      "location": "City, State",
      "current": true/false
    }
  ],
  "education": [],
  "skills": ["skill1", "skill2", "skill3"],
  "achievements": ["achievement1", "achievement2"],
  "contactInfo": {
    "email": "email@example.com",
    "phone": "phone number if mentioned",
    "location": "City, State",
    "website": "website if mentioned",
    "linkedin": "linkedin if mentioned"
  },
  "summary": "Brief summary of the case study and its outcomes"
}

Instructions:
- Extract project details, methodologies, and outcomes from the case study
- Focus on technical skills, problem-solving approaches, and measurable results
- Include any specific metrics, tools, or technologies mentioned
- Extract any work experience or project context
- Create a summary highlighting the key outcomes and learnings
- Ensure all dates are in YYYY-MM-DD format
- Generate unique IDs for each item
- Return valid JSON only, no markdown formatting
`;
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    retryable?: boolean;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert at parsing resume data and extracting structured information. You must return ONLY valid JSON with no additional text, no markdown formatting, no code blocks, and no explanations. The response must be parseable by JSON.parse().'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: OPENAI_CONFIG.MAX_TOKENS,
          temperature: OPENAI_CONFIG.TEMPERATURE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        
        return {
          success: false,
          error: errorMessage,
          retryable: response.status >= 500 || response.status === 429
        };
      }

      const data = await response.json() as Record<string, unknown>;
      const choices = data.choices as Record<string, unknown>[] | undefined;
      const firstChoice = choices?.[0];
      const message = firstChoice?.message as Record<string, unknown> | undefined;
      const content = message?.content as string | undefined;

      if (!content) {
        return {
          success: false,
          error: 'No content in response',
          retryable: true
        };
      }

      // Parse JSON response with improved error handling
      try {
        const parsedData = this.parseJSONResponse(content);
        return {
          success: true,
          data: parsedData
        };
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        console.error('Raw content:', content);
        
        // Try one more time with a simpler prompt
        try {
          console.log('Retrying with simplified prompt...');
          const retryResponse = await this.callOpenAIWithRetry(prompt);
          if (retryResponse.success) {
            return retryResponse;
          }
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
        }
        
        return {
          success: false,
          error: 'Invalid JSON response from OpenAI',
          retryable: true
        };
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OpenAI API call failed',
        retryable: true
      };
    }
  }

  /**
   * Retry OpenAI call with a simplified prompt
   */
  private async callOpenAIWithRetry(originalPrompt: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    retryable?: boolean;
  }> {
    const simplifiedPrompt = `
Extract the following information from this text and return ONLY valid JSON:

${originalPrompt.split('Resume Text:')[1] || originalPrompt.split('Cover Letter Text:')[1] || originalPrompt.split('Case Study Text:')[1] || originalPrompt}

Return this exact JSON structure:
{
  "workHistory": [],
  "education": [],
  "skills": [],
  "achievements": [],
  "contactInfo": {},
  "summary": ""
}

IMPORTANT: Return ONLY the JSON object, no other text, no markdown, no explanations.`;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a JSON extraction tool. Return ONLY valid JSON with no additional text.'
            },
            {
              role: 'user',
              content: simplifiedPrompt
            }
          ],
          max_tokens: OPENAI_CONFIG.MAX_TOKENS,
          temperature: 0.1, // Lower temperature for more consistent output
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          retryable: false
        };
      }

      const data = await response.json() as Record<string, unknown>;
      const choices = data.choices as Record<string, unknown>[] | undefined;
      const firstChoice = choices?.[0];
      const message = firstChoice?.message as Record<string, unknown> | undefined;
      const content = message?.content as string | undefined;

      if (!content) {
        return {
          success: false,
          error: 'No content in retry response',
          retryable: false
        };
      }

      const parsedData = this.parseJSONResponse(content);
      return {
        success: true,
        data: parsedData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Retry failed',
        retryable: false
      };
    }
  }

  /**
   * Parse JSON response with improved error handling for common OpenAI response formats
   */
  private parseJSONResponse(content: string): Record<string, unknown> {
    // Remove markdown code blocks if present
    let cleanedContent = content.trim();
    
    // Remove ```json and ``` markers
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing text that's not JSON
    const jsonStart = cleanedContent.indexOf('{');
    const jsonEnd = cleanedContent.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
    }
    
    // Try to parse the cleaned content
    try {
      return JSON.parse(cleanedContent);
    } catch (error) {
      // If still failing, try to fix common JSON issues
      try {
        // Fix common issues like trailing commas, missing quotes, etc.
        const fixedContent = cleanedContent
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Add quotes to unquoted keys
          .replace(/:\s*([^",{\s][^,}\]]*?)(\s*[,}])/g, ': "$1"$2'); // Add quotes to unquoted string values
        
        return JSON.parse(fixedContent);
      } catch (secondError) {
        console.error('Failed to parse JSON even after cleaning:', secondError);
        console.error('Original content:', content);
        console.error('Cleaned content:', cleanedContent);
        throw new Error(`Invalid JSON response: ${secondError instanceof Error ? secondError.message : 'Unknown error'}`);
      }
    }
  }

  /**
   * Parse and validate structured data from OpenAI response
   */
  private parseStructuredData(data: Record<string, unknown>): StructuredResumeData {
    return {
      workHistory: this.parseWorkHistory(Array.isArray(data.workHistory) ? data.workHistory : []),
      education: this.parseEducation(Array.isArray(data.education) ? data.education : []),
      skills: Array.isArray(data.skills) ? data.skills as string[] : [],
      achievements: Array.isArray(data.achievements) ? data.achievements as string[] : [],
      contactInfo: this.parseContactInfo(data.contactInfo as Record<string, unknown> || {}),
      summary: (data.summary as string) || undefined,
      certifications: this.parseCertifications(Array.isArray(data.certifications) ? data.certifications : []),
      projects: this.parseProjects(Array.isArray(data.projects) ? data.projects : [])
    };
  }

  /**
   * Parse work history array
   */
  private parseWorkHistory(workHistory: unknown[]): WorkExperience[] {
    return workHistory.map((item, index) => {
      const workItem = item as Record<string, unknown>;
      return {
        id: (workItem.id as string) || `work_${index}`,
        company: (workItem.company as string) || '',
        title: (workItem.title as string) || '',
        startDate: (workItem.startDate as string) || '',
        endDate: (workItem.endDate as string) || undefined,
        description: (workItem.description as string) || '',
        achievements: Array.isArray(workItem.achievements) ? workItem.achievements as string[] : [],
        location: (workItem.location as string) || undefined,
        current: Boolean(workItem.current)
      };
    });
  }

  /**
   * Parse education array
   */
  private parseEducation(education: unknown[]): Education[] {
    return education.map((item, index) => {
      const eduItem = item as Record<string, unknown>;
      return {
        id: (eduItem.id as string) || `edu_${index}`,
        institution: (eduItem.institution as string) || '',
        degree: (eduItem.degree as string) || '',
        fieldOfStudy: (eduItem.fieldOfStudy as string) || undefined,
        startDate: (eduItem.startDate as string) || '',
        endDate: (eduItem.endDate as string) || undefined,
        gpa: (eduItem.gpa as string) || undefined,
        location: (eduItem.location as string) || undefined
      };
    });
  }

  /**
   * Parse contact info object
   */
  private parseContactInfo(contactInfo: Record<string, unknown>): ContactInfo {
    return {
      email: (contactInfo.email as string) || undefined,
      phone: (contactInfo.phone as string) || undefined,
      location: (contactInfo.location as string) || undefined,
      website: (contactInfo.website as string) || undefined,
      linkedin: (contactInfo.linkedin as string) || undefined
    };
  }

  /**
   * Parse certifications array
   */
  private parseCertifications(certifications: unknown[]): Certification[] {
    return certifications.map((item, index) => {
      const certItem = item as Record<string, unknown>;
      return {
        id: (certItem.id as string) || `cert_${index}`,
        name: (certItem.name as string) || '',
        issuer: (certItem.issuer as string) || '',
        issueDate: (certItem.issueDate as string) || '',
        expiryDate: (certItem.expiryDate as string) || undefined,
        credentialId: (certItem.credentialId as string) || undefined
      };
    });
  }

  /**
   * Parse projects array
   */
  private parseProjects(projects: unknown[]): Project[] {
    return projects.map((item, index) => {
      const projectItem = item as Record<string, unknown>;
      return {
        id: (projectItem.id as string) || `project_${index}`,
        name: (projectItem.name as string) || '',
        description: (projectItem.description as string) || '',
        technologies: Array.isArray(projectItem.technologies) ? projectItem.technologies as string[] : [],
        startDate: (projectItem.startDate as string) || '',
        endDate: (projectItem.endDate as string) || undefined,
        url: (projectItem.url as string) || undefined
      };
    });
  }

}
