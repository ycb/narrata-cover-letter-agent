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
import { buildResumeAnalysisPrompt, buildCoverLetterAnalysisPrompt } from '../prompts';

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
      // Calculate optimal token limit based on content analysis
      const optimalTokens = this.calculateOptimalTokens(text, 'resume');
      console.warn(`🚀 Starting resume analysis with ${optimalTokens} tokens (smart calculation)`);
      
      const prompt = this.buildResumeAnalysisPrompt(text);
      const response = await this.callOpenAI(prompt, optimalTokens);
      
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
      // Calculate optimal token limit based on content analysis
      const optimalTokens = this.calculateOptimalTokens(text, 'coverLetter');
      console.warn(`🚀 Starting cover letter analysis with ${optimalTokens} tokens (smart calculation)`);
      
      // Use the dedicated cover letter prompt that extracts STORIES and TEMPLATE signals
      const prompt = buildCoverLetterAnalysisPrompt(text);
      const response = await this.callOpenAI(prompt, optimalTokens);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error,
          retryable: response.retryable
        };
      }

      // For cover letters we want the richer story-centric schema as-is
      const structuredData = response.data as Record<string, unknown>;
      
      return {
        success: true,
        // Keep type compatibility while storing the richer schema in the database
        data: structuredData as unknown as StructuredResumeData
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
   * Analyze resume and cover letter together in a single LLM call
   */
  async analyzeResumeAndCoverLetter(resumeText: string, coverLetterText: string): Promise<{
    resume: LLMAnalysisResult;
    coverLetter: LLMAnalysisResult;
  }> {
    try {
      const combinedText = `RESUME:\n${resumeText}\n\nCOVER LETTER:\n${coverLetterText}`;
      
      // Calculate optimal token limit for combined content
      const optimalTokens = this.calculateOptimalTokens(combinedText, 'resume');
      
      // Check if combined content exceeds safe limit
      if (optimalTokens > 4000) {
        console.warn('🚨 Combined content exceeds 4000 tokens, falling back to separate calls');
        return {
          resume: await this.analyzeResume(resumeText),
          coverLetter: await this.analyzeCoverLetter(coverLetterText)
        };
      }
      
      console.warn(`🚀 Starting combined resume + cover letter analysis with ${optimalTokens} tokens`);
      
      const prompt = this.buildCombinedAnalysisPrompt(resumeText, coverLetterText);
      const response = await this.callOpenAI(prompt, optimalTokens);
      
      if (!response.success) {
        console.warn('🔄 Combined analysis failed, falling back to separate calls');
        return {
          resume: await this.analyzeResume(resumeText),
          coverLetter: await this.analyzeCoverLetter(coverLetterText)
        };
      }
      
      // Parse combined response into separate results
      const combinedData = response.data as any;
      
      return {
        resume: {
          success: true,
          data: combinedData.resume
        },
        coverLetter: {
          success: true,
          data: combinedData.coverLetter
        }
      };
    } catch (error) {
      console.error('Combined analysis error:', error);
      // Fallback to separate calls
      return {
        resume: await this.analyzeResume(resumeText),
        coverLetter: await this.analyzeCoverLetter(coverLetterText)
      };
    }
  }

  /**
   * Analyze case study text and extract structured data
   */
  async analyzeCaseStudy(text: string): Promise<LLMAnalysisResult> {
    try {
      // Calculate optimal token limit based on content analysis
      const optimalTokens = this.calculateOptimalTokens(text, 'caseStudies');
      
      const prompt = this.buildCaseStudyAnalysisPrompt(text);
      const response = await this.callOpenAI(prompt, optimalTokens);
      
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
    return buildResumeAnalysisPrompt(text);
  }

  // Removed legacy cover letter prompt; we rely on prompts/coverLetterAnalysis.ts

  /**
   * Build prompt for combined resume and cover letter analysis
   */
  private buildCombinedAnalysisPrompt(resumeText: string, coverLetterText: string): string {
    // Use the comprehensive prompts from the prompts directory
    const resumePrompt = buildResumeAnalysisPrompt(resumeText);
    const coverLetterPrompt = buildCoverLetterAnalysisPrompt(coverLetterText);
    
    return `Analyze the following resume and cover letter together. Extract structured data for each document and return a JSON object with separate "resume" and "coverLetter" sections.

IMPORTANT: Cross-reference information between documents. If the cover letter mentions work experiences, metrics, or stories not fully detailed in the resume, include them in the resume section's workHistory with appropriate annotations.

RESUME ANALYSIS:
${resumePrompt}

---

COVER LETTER ANALYSIS:
${coverLetterPrompt}

---

Return as JSON with this top-level structure:
{
  "resume": { /* comprehensive resume structured data using the schema above */ },
  "coverLetter": { /* cover letter structured data using the schema above */ }
}

Return ONLY valid JSON with no additional text or markdown formatting. Ensure all dates are in YYYY-MM-DD format and generate unique IDs for each item.`;
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
   * Calculate optimal token limit based on extracted text analysis
   */
  private calculateOptimalTokens(extractedText: string, type: FileType): number {
    // Improved token estimate (more accurate char-to-token ratio)
    const contentTokens = Math.ceil(extractedText.length / 3.5); // Better ratio: ~3.5 chars per token
    
    // Structured output overhead (JSON structure, arrays, nested objects)
    const structureOverhead = type === 'resume' ? 1200 : 800; // More overhead for complex resume structure
    
    // Analyze content complexity
    const complexityMultiplier = this.analyzeContentComplexity(extractedText);
    
    // Get type-specific multiplier
    const typeMultiplier = this.getTypeMultiplier(type);
    
    // Calculate base output tokens needed
    const baseOutputTokens = Math.ceil(contentTokens * complexityMultiplier * typeMultiplier);
    
    // Add structure overhead and safety buffer
    const safetyBuffer = 1.8; // 80% safety buffer to avoid retries (increased from 1.35x based on production testing)
    const fixedOverhead = 500; // Additional fixed overhead for story extraction
    const optimalTokens = Math.ceil((baseOutputTokens + structureOverhead) * safetyBuffer + fixedOverhead);
    
    // Apply bounds: minimum 800, maximum 5000 (increased to handle complex story extraction)
    const finalTokens = Math.max(800, Math.min(optimalTokens, 5000));
    
    console.warn(`📊 Token calculation: ${extractedText.length} chars → ${contentTokens} content tokens + ${structureOverhead} overhead → ${finalTokens} max tokens (${type}, complexity: ${complexityMultiplier.toFixed(2)}, buffer: ${safetyBuffer}x)`);
    
    // Ensure we return an integer
    return Math.floor(finalTokens);
  }

  /**
   * Analyze content complexity to determine token multiplier
   */
  private analyzeContentComplexity(text: string): number {
    const lines = text.split('\n').length;
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    
    // Count structured sections
    const workExperienceCount = (text.match(/experience|employment|work history/gi) || []).length;
    const educationCount = (text.match(/education|degree|university|college/gi) || []).length;
    const skillsCount = (text.match(/skills|technologies|proficiencies/gi) || []).length;
    const projectCount = (text.match(/project|portfolio|achievement/gi) || []).length;
    
    // Calculate complexity score
    let complexityScore = 1.0; // Base multiplier
    
    // Length-based complexity
    if (words > 1000) complexityScore += 0.3;
    if (words > 2000) complexityScore += 0.2;
    
    // Structure-based complexity
    if (workExperienceCount > 3) complexityScore += 0.2;
    if (educationCount > 2) complexityScore += 0.1;
    if (skillsCount > 1) complexityScore += 0.1;
    if (projectCount > 2) complexityScore += 0.2;
    
    // Density-based complexity
    const avgWordsPerLine = words / lines;
    if (avgWordsPerLine > 15) complexityScore += 0.1; // Dense content
    
    return Math.min(complexityScore, 2.0); // Cap at 2.0x
  }

  /**
   * Get type-specific token multiplier
   */
  private getTypeMultiplier(type: FileType): number {
    switch (type) {
      case 'resume': return 1.0; // Standard multiplier
      case 'coverLetter': return 0.7; // Cover letters are typically shorter
      case 'caseStudies': return 1.2; // Case studies can be complex
      case 'linkedin': return 0.5; // LinkedIn data is structured
      default: return 1.0;
    }
  }

  /**
   * Call OpenAI API with intelligent token limit adjustment
   */
  private async callOpenAI(prompt: string, dynamicTokenLimit?: number): Promise<{
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
          max_tokens: dynamicTokenLimit || OPENAI_CONFIG.MAX_TOKENS,
          temperature: OPENAI_CONFIG.TEMPERATURE,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
        
        // Intelligent error handling with auto-healing
        if (errorMessage.includes('maximum context length') || errorMessage.includes('token limit')) {
          console.log('🔄 Auto-healing: Token limit exceeded, retrying with higher limit...');
          
          // Calculate new token limit based on prompt length
          const promptTokens = Math.ceil(prompt.length / 4); // Rough estimate: 1 token ≈ 4 characters
          const newTokenLimit = Math.min(promptTokens * 2, 4000); // 2x input tokens, max 4000
          
          console.log(`📊 Token analysis: Prompt ~${promptTokens} tokens, using ${newTokenLimit} max tokens`);
          
          // Retry with higher token limit
          return this.callOpenAI(prompt, newTokenLimit);
        } else if (errorMessage.includes('rate limit')) {
          console.error('🚨 RATE LIMIT EXCEEDED:', {
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('🚨 OPENAI API ERROR:', {
            error: errorMessage,
            status: response.status,
            timestamp: new Date().toISOString()
          });
        }
        
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
      const finishReason = firstChoice?.finish_reason as string | undefined;

      // Intelligent handling for truncated responses
      if (finishReason === 'length') {
        console.log('🔄 Auto-healing: Response truncated, retrying with higher token limit...');
        
        // Calculate new token limit based on content length
        const contentTokens = Math.ceil((content?.length || 0) / 4); // Rough estimate
        const newTokenLimit = Math.floor(Math.min(contentTokens * 1.5, 4000)); // 1.5x current, max 4000, ensure integer
        
        console.log(`📊 Truncation analysis: Content ~${contentTokens} tokens, retrying with ${newTokenLimit} max tokens`);
        
        // Retry with higher token limit
        return this.callOpenAI(prompt, newTokenLimit);
      }

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
        
        // Monitor successful responses for quality metrics
        console.log('✅ LLM RESPONSE SUCCESS:', {
          contentLength: content.length,
          finishReason,
          maxTokens: OPENAI_CONFIG.MAX_TOKENS,
          model: OPENAI_CONFIG.MODEL,
          timestamp: new Date().toISOString()
        });
        
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
