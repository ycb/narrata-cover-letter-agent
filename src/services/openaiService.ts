// OpenAI service for LLM analysis
import { OPENAI_CONFIG } from '@/lib/config/fileUpload';
import type { FileType } from '@/lib/config/fileUpload';
import type { 
  LLMAnalysisResult, 
  StructuredResumeData, 
  WorkExperience, 
  Education, 
  ContactInfo,
  Certification,
  Project,
  FileType
} from '@/types/fileUpload';
import { 
  buildResumeAnalysisPrompt, 
  buildCoverLetterAnalysisPrompt,
  RESUME_COVER_LETTER_ANALYSIS_PROMPT,
  CASE_STUDY_ANALYSIS_PROMPT,
  JSON_EXTRACTION_SYSTEM_PROMPT,
  SIMPLE_JSON_EXTRACTION_PROMPT
} from '../prompts';
import { buildJobDescriptionAnalysisPrompt } from '../prompts/jobDescriptionAnalysis';
import { buildGoNoGoAnalysisPrompt, type UserProfileContext } from '../prompts/goNoGo';

export class LLMAnalysisService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = (import.meta.env?.VITE_OPENAI_KEY) || (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined) || '';
    this.baseUrl = 'https://api.openai.com/v1';
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key not found. Please set VITE_OPENAI_KEY in your environment variables.');
    }
  }

  /**
   * Analyze resume text and extract structured data
   */
  async analyzeResume(text: string, coverLetterText?: string): Promise<LLMAnalysisResult> {
    try {
      // Calculate optimal token limit based on content analysis
      const contentLength = text.length + (coverLetterText?.length || 0);
      const optimalTokens = this.calculateOptimalTokens(text, 'resume');
      console.warn(`🚀 Starting resume${coverLetterText ? ' + cover letter' : ''} analysis with ${optimalTokens} tokens (smart calculation)`);
      
      const prompt = this.buildResumeAnalysisPrompt(text, coverLetterText);
      const response = await this.callOpenAI(prompt, optimalTokens);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error,
          retryable: response.retryable
        };
      }

      // Parse and validate the response
      // Types now match LLM schema, so parsed data includes all fields
      const resumePayload = response.data;
      if (!resumePayload || Array.isArray(resumePayload) || typeof resumePayload !== 'object') {
        throw new Error('Invalid resume data structure returned by LLM');
      }
      const structuredData = this.parseStructuredData(resumePayload as Record<string, unknown>);
      
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
   * STAGED RESUME ANALYSIS - Split into 3 stages for faster perceived performance
   * Stage 1: Work history skeleton (~5-8s)
   * Stage 2: Stories per role (parallelizable, ~3-5s each)
   * Stage 3: Skills + education + contact (~3-5s)
   * 
   * Total time with parallelization: ~15-20s (vs 80-120s for single prompt)
   */
  async analyzeResumeStagedWithEvents(
    text: string,
    onStageComplete?: (stage: string, data: unknown) => void
  ): Promise<LLMAnalysisResult> {
    const startTime = Date.now();
    console.warn('🚀 Starting STAGED resume analysis (3-stage split)');

    try {
      // Import split prompts dynamically to avoid circular deps
      const { 
        buildWorkHistorySkeletonPrompt, 
        buildRoleStoriesPrompt, 
        buildSkillsAndEducationPrompt
      } = await import('../prompts/resumeAnalysisSplit');

      // Type definitions inline (avoid dynamic type import issues)
      type WorkHistorySkeleton = {
        workHistory: Array<{
          id: string;
          company: string;
          companyDescription: string;
          title: string;
          startDate: string;
          endDate: string | null;
          current: boolean;
          location: string | null;
          companyTags: string[];
          roleTags: string[];
          roleSummary: string;
        }>;
      };

      type RoleStoriesResult = {
        roleId: string;
        outcomeMetrics: Array<{
          value: string;
          context: string;
          type: 'increase' | 'decrease' | 'absolute';
          parentType: 'role';
        }>;
        stories: Array<{
          id: string;
          title: string;
          content: string;
          problem?: string;
          action?: string;
          outcome?: string;
          tags: string[];
          linkedToRole: boolean;
          company: string;
          titleRole: string;
          metrics: Array<{
            value: string;
            context: string;
            type: 'increase' | 'decrease' | 'absolute';
            parentType: 'story';
          }>;
        }>;
      };

      type SkillsAndEducationResult = {
        contactInfo: {
          email: string | null;
          phone: string | null;
          linkedin: string | null;
          website: string | null;
          github: string | null;
          substack: string | null;
        };
        location: string | null;
        summary: string;
        education: Array<{
          id: string;
          institution: string;
          degree: string;
          field: string;
          startDate: string;
          endDate: string;
          gpa: string | null;
        }>;
        skills: Array<{
          category: string;
          items: string[];
        }>;
        certifications: Array<{
          id: string;
          name: string;
          issuer: string;
          date: string;
        }>;
        projects: Array<{
          id: string;
          name: string;
          description: string;
          technologies: string[];
          url: string | null;
        }>;
      };

      // STAGE 1: Work history skeleton (fast, ~5-8s)
      console.warn('📋 Stage 1: Extracting work history skeleton...');
      const stage1Start = Date.now();
      const skeletonPrompt = buildWorkHistorySkeletonPrompt(text);
      const skeletonResponse = await this.callOpenAI(skeletonPrompt, 2000); // Small output
      
      if (!skeletonResponse.success || !skeletonResponse.data) {
        throw new Error(`Stage 1 failed: ${skeletonResponse.error}`);
      }
      
      const skeleton = skeletonResponse.data as unknown as WorkHistorySkeleton;
      console.warn(`✅ Stage 1 complete: ${skeleton.workHistory?.length || 0} roles found (${Date.now() - stage1Start}ms)`);
      onStageComplete?.('workHistorySkeleton', skeleton);

      // STAGE 2: Stories per role (PARALLEL)
      console.warn(`📖 Stage 2: Extracting stories for ${skeleton.workHistory?.length || 0} roles (parallel)...`);
      const stage2Start = Date.now();
      
      const storyPromises = (skeleton.workHistory || []).map(async (role) => {
        const prompt = buildRoleStoriesPrompt(text, {
          company: role.company,
          title: role.title,
          id: role.id
        });
        const response = await this.callOpenAI(prompt, 3000); // Medium output per role
        if (!response.success || !response.data) {
          console.warn(`⚠️ Stage 2 failed for role ${role.company}: ${response.error}`);
          return { roleId: role.id, outcomeMetrics: [], stories: [] } as RoleStoriesResult;
        }
        return response.data as unknown as RoleStoriesResult;
      });

      const roleStories = await Promise.all(storyPromises);
      console.warn(`✅ Stage 2 complete: ${roleStories.reduce((acc, r) => acc + (r.stories?.length || 0), 0)} total stories (${Date.now() - stage2Start}ms)`);
      onStageComplete?.('roleStories', roleStories);

      // STAGE 3: Skills + education + contact (fast, ~3-5s)
      console.warn('🎓 Stage 3: Extracting skills, education, contact...');
      const stage3Start = Date.now();
      const skillsPrompt = buildSkillsAndEducationPrompt(text);
      const skillsResponse = await this.callOpenAI(skillsPrompt, 2000); // Small output
      
      if (!skillsResponse.success || !skillsResponse.data) {
        throw new Error(`Stage 3 failed: ${skillsResponse.error}`);
      }
      
      const skillsData = skillsResponse.data as unknown as SkillsAndEducationResult;
      console.warn(`✅ Stage 3 complete: ${skillsData.skills?.length || 0} skill categories, ${skillsData.education?.length || 0} education entries (${Date.now() - stage3Start}ms)`);
      onStageComplete?.('skillsAndEducation', skillsData);

      // MERGE all stages into final structured data
      const mergedWorkHistory = (skeleton.workHistory || []).map(role => {
        const storiesForRole = roleStories.find(r => r.roleId === role.id);
        return {
          ...role,
          outcomeMetrics: storiesForRole?.outcomeMetrics || [],
          stories: storiesForRole?.stories || []
        };
      });

      const structuredData: StructuredResumeData = {
        contactInfo: skillsData.contactInfo || {},
        location: skillsData.location || null,
        summary: skillsData.summary || '',
        workHistory: mergedWorkHistory,
        education: skillsData.education || [],
        skills: skillsData.skills || [],
        certifications: skillsData.certifications || [],
        projects: skillsData.projects || []
      };

      const totalTime = Date.now() - startTime;
      console.warn(`🎉 STAGED analysis complete in ${totalTime}ms (${(totalTime / 1000).toFixed(1)}s)`);

      return {
        success: true,
        data: structuredData
      };
    } catch (error) {
      console.error('Staged LLM analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Staged LLM analysis failed',
        retryable: true
      };
    }
  }

  /**
   * Analyze job description text and extract structured data
   */
  async analyzeJobDescription(text: string): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    retryable?: boolean;
    inputTokens?: number;
    outputTokens?: number;
  }> {
    try {
      const prompt = buildJobDescriptionAnalysisPrompt(text);
      const optimalTokens = this.calculateOptimalTokens(text, 'resume'); // Use resume as proxy for JD complexity
      
      const response = await this.callOpenAI(prompt, optimalTokens);
      
      // Extract token usage from response if available
      // Note: OpenAI API returns usage in response, but we're not capturing it yet
      return {
        ...response,
        inputTokens: 0, // TODO: Extract from response.usage.prompt_tokens
        outputTokens: 0, // TODO: Extract from response.usage.completion_tokens
      };
    } catch (error) {
      console.error('Job description analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Job description analysis failed',
        retryable: true,
      };
    }
  }

  /**
   * Analyze job fit using Go/No-Go criteria
   */
  async analyzeGoNoGo(
    jobDescription: string,
    userProfile: UserProfileContext
  ): Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: string;
    retryable?: boolean;
    inputTokens?: number;
    outputTokens?: number;
  }> {
    try {
      const prompt = buildGoNoGoAnalysisPrompt(jobDescription, userProfile);
      const optimalTokens = 1000; // Go/No-Go analysis is lightweight

      const response = await this.callOpenAI(prompt, optimalTokens);

      // Extract token usage from response if available
      return {
        ...response,
        inputTokens: 0, // TODO: Extract from response.usage.prompt_tokens
        outputTokens: 0, // TODO: Extract from response.usage.completion_tokens
      };
    } catch (error) {
      console.error('Go/No-Go analysis error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Go/No-Go analysis failed',
        retryable: true,
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
    // PERFORMANCE OPTIMIZATION: Use parallel separate calls by default
    // Combined analysis (108s) is 4x slower than parallel separate calls (~27s based on model comparison data)
    // Parallel calls: max(13.8s, 13.8s) ≈ 14s vs Combined: 108s
    // Trade-off: Lose cross-referencing but gain 4x speed improvement
    console.warn('🚀 Starting PARALLEL resume + cover letter analysis (optimized for speed)');
    
    try {
      // Run both analyses in parallel for maximum performance
      const [resumeResult, coverLetterResult] = await Promise.all([
        this.analyzeResume(resumeText),
        this.analyzeCoverLetter(coverLetterText)
      ]);
      
      return {
        resume: resumeResult,
        coverLetter: coverLetterResult
      };
    } catch (error) {
      console.error('Parallel analysis error:', error);
      // If parallel fails, try sequential as last resort
      console.warn('🔄 Parallel analysis failed, falling back to sequential calls');
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
      const caseStudyPayload = response.data;
      if (!caseStudyPayload || Array.isArray(caseStudyPayload) || typeof caseStudyPayload !== 'object') {
        throw new Error('Invalid case study data structure returned by LLM');
      }
      const structuredData = this.parseStructuredData(caseStudyPayload as Record<string, unknown>);
      
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
  private buildResumeAnalysisPrompt(text: string, coverLetterText?: string): string {
    return buildResumeAnalysisPrompt(text, coverLetterText);
  }

  // Removed legacy cover letter prompt; we rely on prompts/coverLetterAnalysis.ts

  /**
   * Build prompt for combined resume and cover letter analysis
   */
  private buildCombinedAnalysisPrompt(resumeText: string, coverLetterText: string): string {
    // Use the centralized prompt for combined analysis
    return RESUME_COVER_LETTER_ANALYSIS_PROMPT
      .replace('{{resumeText}}', resumeText)
      .replace('{{coverLetterText}}', coverLetterText);
  }

  /**
   * Build prompt for case study analysis
   */
  private buildCaseStudyAnalysisPrompt(text: string): string {
    return CASE_STUDY_ANALYSIS_PROMPT.replace('{{text}}', text);
  }

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
    const safetyBuffer = 3.0; // 200% safety buffer for improved prompt (extracts ALL achievements)
    const fixedOverhead = 1500; // Large fixed overhead for comprehensive story extraction
    const optimalTokens = Math.ceil((baseOutputTokens + structureOverhead) * safetyBuffer + fixedOverhead);
    
    // Apply bounds: minimum 2000, maximum 16000 (gpt-4o limit)
    // Improved prompt extracts EVERY achievement as separate story - needs lots of tokens
    const finalTokens = Math.max(2000, Math.min(optimalTokens, 16000));
    
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
   * @param prompt - The prompt to send
   * @param dynamicTokenLimit - Optional token limit override
   * @param retryCount - Current retry count (for truncation/token limit retries)
   */
  private async callOpenAI(prompt: string, dynamicTokenLimit?: number, retryCount: number = 0): Promise<{
    success: boolean;
    data?: Record<string, unknown> | unknown[];
    error?: string;
    retryable?: boolean;
  }> {
    const maxRetries = OPENAI_CONFIG.MAX_TRUNCATION_RETRIES || 2;
    
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
              content: JSON_EXTRACTION_SYSTEM_PROMPT
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
        
        // Intelligent error handling with auto-healing (with retry cap)
        if ((errorMessage.includes('maximum context length') || errorMessage.includes('token limit')) && retryCount < maxRetries) {
          console.log(`🔄 Auto-healing: Token limit exceeded, retrying (${retryCount + 1}/${maxRetries})...`);
          
          // Calculate new token limit based on prompt length
          const promptTokens = Math.ceil(prompt.length / 4); // Rough estimate: 1 token ≈ 4 characters
          const newTokenLimit = Math.min(promptTokens * 2, 8000); // 2x input tokens, max 8000
          
          console.log(`📊 Token analysis: Prompt ~${promptTokens} tokens, using ${newTokenLimit} max tokens`);
          
          // Retry with higher token limit
          return this.callOpenAI(prompt, newTokenLimit, retryCount + 1);
        } else if (errorMessage.includes('rate limit')) {
          console.error('🚨 RATE LIMIT EXCEEDED:', {
            error: errorMessage,
            timestamp: new Date().toISOString()
          });
        } else {
          console.error('🚨 OPENAI API ERROR:', {
            error: errorMessage,
            status: response.status,
            retryCount,
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

      // Intelligent handling for truncated responses (with retry cap)
      if (finishReason === 'length' && retryCount < maxRetries) {
        console.log(`🔄 Auto-healing: Response truncated, retrying (${retryCount + 1}/${maxRetries})...`);
        
        // Calculate new token limit - we need MORE than what was already generated
        const contentTokens = Math.ceil((content?.length || 0) / 4); // Rough estimate
        const currentLimit = dynamicTokenLimit || OPENAI_CONFIG.MAX_TOKENS;
        // Add 50% more tokens than current response size, minimum 2x current limit
        const newTokenLimit = Math.floor(Math.max(contentTokens * 1.5, currentLimit * 2, 8000));
        // Cap at model maximum (gpt-4o-mini supports up to 16k output)
        const cappedLimit = Math.min(newTokenLimit, 16000);
        
        console.log(`📊 Truncation analysis: Generated ${contentTokens} tokens at ${currentLimit} limit, retrying with ${cappedLimit} max tokens`);
        
        // Retry with higher token limit
        return this.callOpenAI(prompt, cappedLimit, retryCount + 1);
      } else if (finishReason === 'length') {
        console.warn(`⚠️ Response truncated after ${maxRetries} retries - proceeding with partial content`);
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
    data?: Record<string, unknown> | unknown[];
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
              content: SIMPLE_JSON_EXTRACTION_PROMPT
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

  private parseJSONResponse(content: string): Record<string, unknown> | unknown[] {
    const normalized = this.normalizeJsonContent(content ?? '');
    const payload = this.extractJsonPayload(normalized);

    if (!payload) {
      console.error('Unable to locate JSON payload in LLM response.', { preview: normalized.slice(0, 200) });
      throw new Error('Invalid JSON response: no JSON object or array detected');
    }

    const parseAttempts: Array<{ label: string; value: string }> = [
      { label: 'raw', value: payload },
      { label: 'repaired-basic', value: this.basicJsonRepairs(payload) }
    ];

    for (const attempt of parseAttempts) {
      try {
        return JSON.parse(attempt.value) as Record<string, unknown> | unknown[];
      } catch (error) {
        this.logParseAttemptFailure(attempt.label, attempt.value, error as Error);
      }
    }

    // Last resort: attempt a second repair pass (e.g. quote single bare words) before giving up
    const secondPass = this.basicJsonRepairs(payload, { includeSingleWordStrings: true });
    try {
      return JSON.parse(secondPass) as Record<string, unknown> | unknown[];
    } catch (finalError) {
      console.error('Failed to parse JSON after multiple repair attempts.');
      console.error('Original content:', content);
      console.error('Final repaired payload:', secondPass.slice(0, 500));
      throw new Error(`Invalid JSON response: ${(finalError as Error).message}`);
    }
  }

  private normalizeJsonContent(content: string): string {
    if (!content) {
      return '';
    }

    let normalized = content
      .replace(/^[\uFEFF]/, '') // Strip BOM
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/\r\n?/g, '\n')
      .trim();

    // Normalize smart quotes, dashes, ellipses, non-breaking spaces
    normalized = normalized
      .replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"')
      .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
      .replace(/[\u2013\u2014\u2212]/g, '-')
      .replace(/[\u2026]/g, '...')
      .replace(/\u00A0/g, ' ')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '');

    return normalized;
  }

  private extractJsonPayload(text: string): string | null {
    const length = text.length;
    let start = -1;
    const stack: string[] = [];
    const matching: Record<string, string> = { '{': '}', '[': ']' };

    for (let i = 0; i < length; i += 1) {
      const char = text[i];

      if (start === -1) {
        if (char === '{' || char === '[') {
          start = i;
          stack.push(char);
        }
        continue;
      }

      if (char === '{' || char === '[') {
        stack.push(char);
        continue;
      }

      if (char === '}' || char === ']') {
        const last = stack.pop();
        if (!last) {
          continue;
        }

        const expected = matching[last];
        if (char !== expected) {
          // mismatched pair; continue scanning but keep state
          continue;
        }

        if (stack.length === 0 && start !== -1) {
          return text.slice(start, i + 1);
        }
      }
    }

    if (start !== -1) {
      return text.slice(start);
    }

    return null;
  }

  private basicJsonRepairs(payload: string, options: { includeSingleWordStrings?: boolean } = {}): string {
    let repaired = payload
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)([A-Za-z0-9_\-]+)(\s*):/g, '$1"$2"$3:'); // Quote bare keys

    if (options.includeSingleWordStrings) {
      repaired = repaired.replace(/:\s*([A-Za-z0-9_\-]+)(\s*[,}])/g, ': "$1"$2');
    }

    // Remove stray text after closing brace/bracket
    const extracted = this.extractJsonPayload(repaired);
    if (extracted) {
      repaired = extracted;
    }

    return repaired.trim();
  }

  private logParseAttemptFailure(label: string, payload: string, error: Error): void {
    console.warn(`JSON parse attempt failed (${label}): ${error.message}`);
    console.warn('Payload preview:', payload.slice(0, 200));
  }

  /**
   * Parse and validate structured data from OpenAI response
   */
  private parseStructuredData(data: Record<string, unknown>): StructuredResumeData {
    return {
      workHistory: this.parseWorkHistory(Array.isArray(data.workHistory) ? data.workHistory : []),
      education: this.parseEducation(Array.isArray(data.education) ? data.education : []),
      skills: Array.isArray(data.skills) ? data.skills as (string[] | any[]) : [],
      achievements: Array.isArray(data.achievements) ? data.achievements as string[] : [],
      contactInfo: this.parseContactInfo(data.contactInfo as Record<string, unknown> || {}),
      location: (data.location as string) || undefined, // Top-level location
      summary: (data.summary as string) || undefined,
      certifications: this.parseCertifications(Array.isArray(data.certifications) ? data.certifications : []),
      projects: this.parseProjects(Array.isArray(data.projects) ? data.projects : [])
    };
  }

  /**
   * Parse work history array - now extracts all rich schema fields
   */
  private parseWorkHistory(workHistory: unknown[]): WorkExperience[] {
    return workHistory.map((item, index) => {
      const workItem = item as Record<string, unknown>;
      
      // Parse outcomeMetrics array
      const outcomeMetrics = Array.isArray(workItem.outcomeMetrics)
        ? workItem.outcomeMetrics.map((m: any) => ({
            value: (m.value as string) || '',
            context: (m.context as string) || '',
            type: (m.type as 'increase' | 'decrease' | 'absolute') || 'absolute',
            parentType: (m.parentType as 'role' | 'story') || 'role'
          }))
        : undefined;
      
      // Parse stories array
      const stories = Array.isArray(workItem.stories)
        ? workItem.stories.map((s: any) => ({
            id: (s.id as string) || `story_${index}`,
            title: (s.title as string) || '',
            content: (s.content as string) || '',
            problem: (s.problem as string) || undefined,
            action: (s.action as string) || undefined,
            outcome: (s.outcome as string) || undefined,
            tags: Array.isArray(s.tags) ? s.tags as string[] : [],
            linkedToRole: Boolean(s.linkedToRole),
            company: (s.company as string) || undefined,
            titleRole: (s.titleRole as string) || undefined,
            metrics: Array.isArray(s.metrics)
              ? s.metrics.map((m: any) => ({
                  value: (m.value as string) || '',
                  context: (m.context as string) || '',
                  type: (m.type as 'increase' | 'decrease' | 'absolute') || 'absolute',
                  parentType: (m.parentType as 'role' | 'story') || 'story'
                }))
              : undefined
          }))
        : undefined;
      
      return {
        id: (workItem.id as string) || `work_${index}`,
        company: (workItem.company as string) || '',
        title: (workItem.title as string) || '',
        startDate: (workItem.startDate as string) || '',
        endDate: (workItem.endDate as string) || undefined,
        description: (workItem.description as string) || (workItem.roleSummary as string) || undefined,
        achievements: Array.isArray(workItem.achievements) ? workItem.achievements as string[] : [],
        location: (workItem.location as string) || undefined,
        current: Boolean(workItem.current),
        // NEW: Extract rich schema fields
        outcomeMetrics,
        stories,
        roleTags: Array.isArray(workItem.roleTags) ? workItem.roleTags as string[] : undefined,
        roleSummary: (workItem.roleSummary as string) || undefined,
        companyTags: Array.isArray(workItem.companyTags) ? workItem.companyTags as string[] : undefined
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
   * Parse contact info object - location removed (now top-level)
   */
  private parseContactInfo(contactInfo: Record<string, unknown>): ContactInfo {
    return {
      email: (contactInfo.email as string) || undefined,
      phone: (contactInfo.phone as string) || undefined,
      linkedin: (contactInfo.linkedin as string) || undefined,
      website: (contactInfo.website as string) || undefined,
      github: (contactInfo.github as string) || undefined,
      substack: (contactInfo.substack as string) || undefined
      // location removed - now top-level in StructuredResumeData
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
