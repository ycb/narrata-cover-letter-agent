/**
 * Cover Letter Rating Service
 *
 * Evaluates cover letter draft quality using comprehensive rubric
 * Checks: standard quality, STAR format, metrics, voice, level appropriateness
 */

import { LLMAnalysisService } from './openaiService';
import { buildCoverLetterRatingPrompt } from '@/prompts/coverLetterRating';

export interface CoverLetterCriterion {
  id: string;
  label: string;
  met: boolean;
  evidence: string;
  suggestion?: string;
}

export interface CoverLetterRatingResult {
  criteria: CoverLetterCriterion[];
  overallRating: 'strong' | 'average' | 'weak';
  summary: string;
  metCount: number;
  totalCount: number;
}

export class CoverLetterRatingService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Evaluate cover letter draft against quality rubric
   * Includes voice and PM level modifiers if provided
   */
  async evaluateCoverLetter(
    coverLetterDraft: string,
    jobDescription: string,
    userVoicePrompt?: string,
    pmLevel?: string
  ): Promise<CoverLetterRatingResult> {
    try {
      // Build prompt
      const prompt = buildCoverLetterRatingPrompt(
        coverLetterDraft,
        jobDescription,
        userVoicePrompt,
        pmLevel
      );

      // Call LLM
      const response = await this.llmService.callOpenAI(prompt, 1500);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to evaluate cover letter');
      }

      // Parse response
      const parsed = response.data as {
        criteria: CoverLetterCriterion[];
        overallRating: 'strong' | 'average' | 'weak';
        summary: string;
      };

      if (!parsed.criteria || !Array.isArray(parsed.criteria)) {
        throw new Error('Invalid response structure from LLM');
      }

      // Validate and normalize criteria
      const criteria = parsed.criteria.map(c => ({
        id: c.id || '',
        label: c.label || '',
        met: c.met === true,
        evidence: c.evidence || '',
        suggestion: c.suggestion || '',
      }));

      const metCount = criteria.filter(c => c.met).length;
      const totalCount = criteria.length;

      return {
        criteria,
        overallRating: parsed.overallRating || 'weak',
        summary: parsed.summary || 'Unable to generate summary',
        metCount,
        totalCount,
      };
    } catch (error) {
      console.error('Error evaluating cover letter:', error);

      // Return fallback result on error
      const fallbackCriteria = this.generateFallbackCriteria();

      return {
        criteria: fallbackCriteria,
        overallRating: 'weak',
        summary: 'Unable to complete evaluation - analysis failed',
        metCount: 0,
        totalCount: fallbackCriteria.length,
      };
    }
  }

  /**
   * Generate fallback criteria if LLM call fails
   */
  private generateFallbackCriteria(): CoverLetterCriterion[] {
    return [
      {
        id: 'compelling_opening',
        label: 'Compelling Opening',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'business_understanding',
        label: 'Understanding of Business/Users',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'quantified_impact',
        label: 'Quantified Impact',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'action_verbs',
        label: 'Action Verbs & Ownership',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'star_format',
        label: 'STAR Format',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'concise_length',
        label: 'Concise Length',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'error_free',
        label: 'Error-Free Writing',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'personalized',
        label: 'Personalized to Role',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'specific_examples',
        label: 'Specific Examples',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'professional_tone',
        label: 'Professional Tone',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
      {
        id: 'company_research',
        label: 'Company Research',
        met: false,
        evidence: 'Unable to evaluate',
        suggestion: 'Evaluation failed',
      },
    ];
  }
}
