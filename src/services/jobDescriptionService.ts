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

export interface CreateJobDescriptionInput {
  userId: string;
  content: string;
  url?: string;
  accessToken?: string;
  syntheticProfileId?: string;
}

export interface ParsedJobDescription {
  company: string;
  role: string;
  requirements: string[];
  differentiatorSummary: string;
}

export class JobDescriptionService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Parse job description content and create database record
   * Emits evaluation logging events for tracking parsing quality
   */
  async parseAndCreate(
    options: CreateJobDescriptionInput
  ): Promise<JobDescription> {
    const startTime = Date.now();
    const rawTextChecksum = this.generateChecksum(options.content);

    try {
      // Parse JD content using LLM
      const parsed = await this.parseJobDescription(options.content);

      // Create database record
      const insertData: JobDescriptionInsert = {
        user_id: options.userId,
        content: options.content,
        url: options.url || null,
        company: parsed.company,
        role: parsed.role,
        extracted_requirements: parsed.requirements,
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
        requirements: parsed.requirements,
        differentiatorSummary: parsed.differentiatorSummary,
        inputTokens: 0, // TODO: Track from LLM response
        outputTokens: 0, // TODO: Track from LLM response
        latency: Date.now() - startTime,
        status: 'success',
        sourceUrl: options.url,
        syntheticProfileId: options.syntheticProfileId,
      });

      return jd;
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

    // Ensure requirements is an array
    if (!Array.isArray(parsed.requirements)) {
      parsed.requirements = [];
    }

    // Ensure differentiatorSummary exists
    if (!parsed.differentiatorSummary) {
      parsed.differentiatorSummary = '';
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

