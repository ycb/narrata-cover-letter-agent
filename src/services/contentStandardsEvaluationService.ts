/**
 * Content Standards Evaluation Service
 *
 * LLM-based evaluation of cover letter sections and entire letters
 * against content quality standards. Uses OpenAI to assess standards
 * and returns structured results.
 */

import { OPENAI_CONFIG } from '@/lib/config/fileUpload';
import {
  buildSectionStandardsPrompt,
} from '@/prompts/sectionContentStandards';
import {
  buildLetterStandardsPrompt,
} from '@/prompts/letterContentStandards';
import {
  getApplicableStandards,
  getLetterScopedStandards,
} from '@/config/contentStandards';
import type {
  SectionStandardResult,
  LetterStandardResult,
  SectionStandardStatus,
} from '@/types/coverLetters';

interface EvaluationResponse {
  success: boolean;
  data?: {
    standards: Array<{
      standardId: string;
      status: string;
      evidence: string;
    }>;
  };
  error?: string;
  retryable?: boolean;
}

export class ContentStandardsEvaluationService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey =
      import.meta.env?.VITE_OPENAI_KEY ||
      (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined) ||
      '';
    this.baseUrl = 'https://api.openai.com/v1';

    if (!this.apiKey) {
      console.warn('[ContentStandardsEvaluationService] No OpenAI API key found');
    }
  }

  /**
   * Evaluate a single section against applicable content standards
   *
   * @param sectionId - Unique section identifier
   * @param sectionContent - Section text to evaluate
   * @param sectionType - Type of section (intro, body, closing)
   * @param jobDescription - Optional job description for context
   * @returns Per-section evaluation result
   */
  async evaluateSection(
    sectionId: string,
    sectionContent: string,
    sectionType: 'intro' | 'body' | 'closing',
    jobDescription?: string
  ): Promise<SectionStandardResult | null> {
    try {
      // Get applicable standards for this section type
      const applicableStandards = getApplicableStandards(sectionType);

      if (applicableStandards.length === 0) {
        console.log(`[ContentStandardsEvaluationService] No standards applicable to ${sectionType} section`);
        return {
          sectionId,
          standards: [],
        };
      }

      // Build prompt
      const prompt = buildSectionStandardsPrompt(
        sectionContent,
        sectionType,
        applicableStandards,
        jobDescription
      );

      // Call OpenAI
      const response = await this.callOpenAI(prompt, 1500); // Section eval: ~1500 tokens

      if (!response.success || !response.data) {
        console.error('[ContentStandardsEvaluationService] Section evaluation failed:', response.error);
        return null;
      }

      // Validate and transform response
      const standards = response.data.standards.map((s) => ({
        standardId: s.standardId,
        status: this.validateSectionStatus(s.status),
        evidence: s.evidence || '',
      }));

      return {
        sectionId,
        standards,
      };
    } catch (error) {
      console.error('[ContentStandardsEvaluationService] Section evaluation error:', error);
      return null;
    }
  }

  /**
   * Evaluate entire letter against letter-scoped standards
   *
   * @param fullLetterText - Complete cover letter text
   * @param wordCount - Word count of the letter
   * @param paragraphCount - Number of paragraphs
   * @returns Letter-level evaluation results
   */
  async evaluateLetter(
    fullLetterText: string,
    wordCount?: number,
    paragraphCount?: number
  ): Promise<LetterStandardResult[]> {
    try {
      // Get letter-scoped standards
      const letterStandards = getLetterScopedStandards();

      if (letterStandards.length === 0) {
        console.log('[ContentStandardsEvaluationService] No letter-scoped standards defined');
        return [];
      }

      // Build prompt
      const prompt = buildLetterStandardsPrompt(
        fullLetterText,
        letterStandards,
        wordCount,
        paragraphCount
      );

      // Call OpenAI
      const response = await this.callOpenAI(prompt, 1000); // Letter eval: ~1000 tokens

      if (!response.success || !response.data) {
        console.error('[ContentStandardsEvaluationService] Letter evaluation failed:', response.error);
        return [];
      }

      // Validate and transform response
      const standards = response.data.standards.map((s) => ({
        standardId: s.standardId,
        status: this.validateLetterStatus(s.status),
        evidence: s.evidence || '',
      }));

      return standards;
    } catch (error) {
      console.error('[ContentStandardsEvaluationService] Letter evaluation error:', error);
      return [];
    }
  }

  /**
   * Call OpenAI API with prompt and parse JSON response
   */
  private async callOpenAI(
    prompt: string,
    maxTokens: number
  ): Promise<EvaluationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_CONFIG.MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are an expert cover letter evaluator. Return only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: maxTokens,
          temperature: 0.3, // Low temperature for consistent evaluation
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
          retryable: response.status >= 500,
        };
      }

      const data = (await response.json()) as Record<string, unknown>;
      const choices = data.choices as Record<string, unknown>[] | undefined;
      const firstChoice = choices?.[0];
      const message = firstChoice?.message as Record<string, unknown> | undefined;
      const content = message?.content as string | undefined;
      const finishReason = firstChoice?.finish_reason as string | undefined;

      // Check for truncation
      if (finishReason === 'length') {
        console.warn('[ContentStandardsEvaluationService] Response truncated, retrying with more tokens');
        const newTokenLimit = Math.floor(maxTokens * 1.5);
        return this.callOpenAI(prompt, newTokenLimit);
      }

      if (!content) {
        return {
          success: false,
          error: 'No content in response',
          retryable: true,
        };
      }

      // Parse JSON response
      try {
        const parsedData = this.parseJSONResponse(content);
        return {
          success: true,
          data: parsedData as {
            standards: Array<{
              standardId: string;
              status: string;
              evidence: string;
            }>;
          },
        };
      } catch (parseError) {
        console.error('[ContentStandardsEvaluationService] JSON parsing error:', parseError);
        console.error('Raw content:', content);
        return {
          success: false,
          error: 'Invalid JSON response from OpenAI',
          retryable: true,
        };
      }
    } catch (error) {
      console.error('[ContentStandardsEvaluationService] OpenAI API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OpenAI API call failed',
        retryable: true,
      };
    }
  }

  /**
   * Parse JSON response from LLM (handles markdown code blocks)
   */
  private parseJSONResponse(content: string): Record<string, unknown> {
    let jsonString = content.trim();

    // Remove markdown code blocks if present
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(jsonString) as Record<string, unknown>;
  }

  /**
   * Validate and normalize section standard status
   */
  private validateSectionStatus(status: string): SectionStandardStatus {
    const normalized = status.toLowerCase();
    if (normalized === 'met') return 'met';
    if (normalized === 'not_met') return 'not_met';
    if (normalized === 'not_applicable') return 'not_applicable';

    console.warn(`[ContentStandardsEvaluationService] Invalid section status: ${status}, defaulting to not_met`);
    return 'not_met';
  }

  /**
   * Validate and normalize letter standard status
   */
  private validateLetterStatus(status: string): 'met' | 'not_met' {
    const normalized = status.toLowerCase();
    if (normalized === 'met') return 'met';

    console.warn(`[ContentStandardsEvaluationService] Invalid letter status: ${status}, defaulting to not_met`);
    return 'not_met';
  }

  /**
   * Check if API key is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}
