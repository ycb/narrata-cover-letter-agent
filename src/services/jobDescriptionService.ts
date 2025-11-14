/**
 * Job Description Service
 * 
 * Handles parsing and creation of job descriptions with evaluation logging.
 * Integrates with EvaluationEventLogger to track parsing quality and performance.
 */

import { supabase } from '@/lib/supabase';
import { LLMAnalysisService } from './openaiService';
import { EvaluationEventLogger } from './evaluationEventLogger';
import type { Database } from '@/types/supabase';

type JobDescription = Database['public']['Tables']['job_descriptions']['Row'];
type JobDescriptionInsert = Database['public']['Tables']['job_descriptions']['Insert'];

/**
 * Input for creating a job description
 * NOTE: URL-based scraping has been removed - only text-based input is supported
 * This ensures consistent processing and avoids scraping/rate-limit issues
 */
export interface CreateJobDescriptionInput {
  userId: string;
  content: string; // Pasted JD text (required)
  url?: string; // Optional URL for reference only (not scraped)
  accessToken?: string;
  syntheticProfileId?: string;
}

export interface ParsedJobDescription {
  company: string;
  role: string;
  coreRequirements: string[];
  preferredRequirements: string[];
  differentiatorSummary: string;
  // Legacy field for backward compatibility
  requirements?: string[];
}

export interface JobDescriptionWithParsed {
  dbRecord: JobDescription;
  parsed: ParsedJobDescription;
}

export class JobDescriptionService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Parse job description content and create database record
   * Emits evaluation logging events for tracking parsing quality
   * Returns both the database record AND the parsed data with core/preferred split
   * 
   * IMPORTANT: This method only processes pasted text content.
   * URL scraping is NOT supported - if a URL is provided, it's stored for reference only.
   */
  async parseAndCreate(
    options: CreateJobDescriptionInput
  ): Promise<JobDescriptionWithParsed> {
    const startTime = Date.now();
    
    // Validate that content is provided (text-only pathway)
    if (!options.content || options.content.trim().length === 0) {
      throw new Error('Job description content is required. Please paste the job description text.');
    }
    
    const rawTextChecksum = this.generateChecksum(options.content);

    try {
      // Parse JD content using LLM (text-only)
      const parsed = await this.parseJobDescription(options.content);

      // Create database record
      // Combine core + preferred requirements for database storage (backward compatibility)
      const allRequirements = [
        ...parsed.coreRequirements,
        ...parsed.preferredRequirements
      ];

      const insertData: JobDescriptionInsert = {
        user_id: options.userId,
        content: options.content,
        url: options.url || null,
        company: parsed.company,
        role: parsed.role,
        extracted_requirements: allRequirements,
      };

      const { data: jd, error: dbError } = await supabase
        .from('job_descriptions')
        .insert(insertData)
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      if (!jd) {
        throw new Error('Failed to create job description record');
      }

      // Log success event
      // Note: Token tracking will be improved in future iteration
      await EvaluationEventLogger.logJDParse({
        userId: options.userId,
        jobDescriptionId: jd.id,
        rawTextChecksum,
        company: parsed.company,
        role: parsed.role,
        requirements: allRequirements,
        differentiatorSummary: parsed.differentiatorSummary,
        inputTokens: 0, // TODO: Track from LLM response
        outputTokens: 0, // TODO: Track from LLM response
        latency: Date.now() - startTime,
        status: 'success',
        sourceUrl: options.url,
        syntheticProfileId: options.syntheticProfileId,
      });

      return {
        dbRecord: jd,
        parsed,
      };
    } catch (error) {
      // Log failure event
      await EvaluationEventLogger.logJDParse({
        userId: options.userId,
        jobDescriptionId: 'pending',
        rawTextChecksum,
        inputTokens: 0,
        outputTokens: 0,
        latency: Date.now() - startTime,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        syntheticProfileId: options.syntheticProfileId,
      });

      throw error;
    }
  }

  /**
   * Parse job description text using LLM
   */
  private async parseJobDescription(
    content: string
  ): Promise<ParsedJobDescription> {
    // Use LLM service to analyze
    const response = await this.llmService.analyzeJobDescription(content);

    if (!response.success || !response.data) {
      throw new Error(
        response.error || 'Failed to parse job description'
      );
    }

    // Validate and extract structured data
    const parsed = response.data as ParsedJobDescription;

    // Validate required fields
    if (!parsed.company || !parsed.role) {
      throw new Error(
        'Invalid parsing result: missing company or role'
      );
    }

    // Ensure coreRequirements is an array
    if (!Array.isArray(parsed.coreRequirements)) {
      parsed.coreRequirements = [];
    }

    // Ensure preferredRequirements is an array
    if (!Array.isArray(parsed.preferredRequirements)) {
      parsed.preferredRequirements = [];
    }

    // Ensure differentiatorSummary exists
    if (!parsed.differentiatorSummary) {
      parsed.differentiatorSummary = '';
    }

    // Validate minimum requirements
    if (parsed.coreRequirements.length < 2) {
      throw new Error(
        'Invalid parsing result: must have at least 2 core requirements'
      );
    }

    return parsed;
  }

  /**
   * Generate checksum for raw text (for deduplication)
   */
  private generateChecksum(text: string): string {
    // Simple hash function for checksum
    // In production, consider using crypto.subtle.digest for SHA-256
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

}

