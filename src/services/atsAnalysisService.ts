/**
 * ATS Analysis Service
 *
 * From PRD: Analyzes cover letter ATS compatibility
 * Returns detailed scoring and checklist for tooltip display
 */

import { LLMAnalysisService } from './openaiService';
import { ATS_ANALYSIS_SYSTEM_PROMPT, buildATSAnalysisUserPrompt } from '@/prompts/atsAnalysis';

// Types from PRD JSON Schema
export interface ATSCheck {
  id: 'hard_skills' | 'domain_keywords' | 'soft_skills' | 'action_ownership' | 'impact_metrics' |
      'clarity_readability' | 'role_relevance' | 'keyword_density' | 'jd_echoes' | 'overall_coverage';
  label: string;
  subtitle: string;
  status: 'pass' | 'partial' | 'fail';
  weight: number;
  score_contribution: number;
  matched_examples: string[];
  missing_examples: string[];
  suggestions: string[];
}

export interface ATSStats {
  jd_hard_skill_count: number;
  jd_domain_keyword_count: number;
  matched_hard_skills: number;
  matched_domain_keywords: number;
  matched_soft_skills: number;
  matched_action_verbs: number;
  contains_impact_metrics: boolean;
  overall_coverage_ratio: number;
}

export interface ATSEvalResponse {
  overall_score: number;
  score_tier: 'weak' | 'moderate' | 'strong';
  checks: ATSCheck[];
  stats: ATSStats;
}

export class ATSAnalysisService {
  private llmService: LLMAnalysisService;

  constructor() {
    this.llmService = new LLMAnalysisService();
  }

  /**
   * Evaluate cover letter ATS compatibility
   * Returns comprehensive scoring and checklist
   */
  async evaluateATS(
    coverLetter: string,
    jobDescription: string
  ): Promise<ATSEvalResponse> {
    try {
      // Build messages for LLM
      const systemPrompt = ATS_ANALYSIS_SYSTEM_PROMPT;
      const userPrompt = buildATSAnalysisUserPrompt(jobDescription, coverLetter);

      // Call LLM with system + user messages
      const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const response = await this.llmService.callOpenAI(combinedPrompt, 2000);

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to evaluate ATS compatibility');
      }

      // Parse response
      const parsed = response.data as ATSEvalResponse;

      // Validate structure
      if (typeof parsed.overall_score !== 'number' || !parsed.score_tier || !Array.isArray(parsed.checks)) {
        throw new Error('Invalid response structure from LLM');
      }

      // Normalize and validate checks
      const checks = parsed.checks.map(check => ({
        id: check.id,
        label: check.label || '',
        subtitle: check.subtitle || '',
        status: check.status || 'fail',
        weight: typeof check.weight === 'number' ? check.weight : 0,
        score_contribution: typeof check.score_contribution === 'number' ? check.score_contribution : 0,
        matched_examples: Array.isArray(check.matched_examples) ? check.matched_examples : [],
        missing_examples: Array.isArray(check.missing_examples) ? check.missing_examples : [],
        suggestions: Array.isArray(check.suggestions) ? check.suggestions : [],
      }));

      // Normalize stats
      const stats = parsed.stats || this.getDefaultStats();

      return {
        overall_score: Math.round(parsed.overall_score),
        score_tier: parsed.score_tier,
        checks,
        stats,
      };
    } catch (error) {
      console.error('Error in ATS analysis:', error);

      // Return fallback result
      return this.getFallbackResult();
    }
  }

  /**
   * Generate default stats structure
   */
  private getDefaultStats(): ATSStats {
    return {
      jd_hard_skill_count: 0,
      jd_domain_keyword_count: 0,
      matched_hard_skills: 0,
      matched_domain_keywords: 0,
      matched_soft_skills: 0,
      matched_action_verbs: 0,
      contains_impact_metrics: false,
      overall_coverage_ratio: 0,
    };
  }

  /**
   * Generate fallback result if LLM call fails
   */
  private getFallbackResult(): ATSEvalResponse {
    const checkIds: ATSCheck['id'][] = [
      'hard_skills',
      'domain_keywords',
      'soft_skills',
      'action_ownership',
      'impact_metrics',
      'clarity_readability',
      'role_relevance',
      'keyword_density',
      'jd_echoes',
      'overall_coverage',
    ];

    const checks: ATSCheck[] = checkIds.map(id => ({
      id,
      label: this.getCheckLabel(id),
      subtitle: 'Unable to evaluate',
      status: 'fail',
      weight: 0,
      score_contribution: 0,
      matched_examples: [],
      missing_examples: [],
      suggestions: ['Analysis failed - please try again'],
    }));

    return {
      overall_score: 0,
      score_tier: 'weak',
      checks,
      stats: this.getDefaultStats(),
    };
  }

  /**
   * Get human-readable label for check ID
   */
  private getCheckLabel(id: ATSCheck['id']): string {
    const labels: Record<ATSCheck['id'], string> = {
      hard_skills: 'Hard Skills',
      domain_keywords: 'Domain Keywords',
      soft_skills: 'Soft Skills',
      action_ownership: 'Action & Ownership',
      impact_metrics: 'Impact Metrics',
      clarity_readability: 'Clarity & Readability',
      role_relevance: 'Role Relevance',
      keyword_density: 'Keyword Density',
      jd_echoes: 'JD Language Echoes',
      overall_coverage: 'Overall Coverage',
    };

    return labels[id] || id;
  }
}
