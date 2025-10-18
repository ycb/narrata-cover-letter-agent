// Human review service for evaluation validation
import { supabase } from '../lib/supabase';

export interface HumanReview {
  id: string;
  evaluationRunId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  
  // Human evaluation scores (matching LLM criteria)
  humanAccuracy: '✅ Accurate' | '⚠ Partially Accurate' | '❌ Inaccurate';
  humanRelevance: '✅ Relevant' | '⚠ Somewhat Relevant' | '❌ Not Relevant';
  humanPersonalization: '✅ Personalized' | '⚠ Weak Personalization' | '❌ Generic';
  humanClarityTone: '✅ Clear & Professional' | '⚠ Minor Issues' | '❌ Unclear or Fluffy';
  humanFramework: '✅ Structured' | '⚠ Partial' | '❌ Not Structured';
  humanGoNogo: '✅ Go' | '❌ No-Go';
  
  // Enhanced criteria
  humanWorkHistoryDeduplication: '✅ Merged' | '⚠ Partial' | '❌ Duplicates';
  humanMetricsExtraction: '✅ Complete' | '⚠ Limited' | '❌ Missing';
  humanStoryStructure: '✅ Clear' | '⚠ Weak' | '❌ Unclear';
  humanTemplateQuality: '✅ Excellent' | '⚠ Good' | '❌ Poor';
  humanTemplateReusability: '✅ Highly Reusable' | '⚠ Somewhat Reusable' | '❌ Not Reusable';
  humanTemplateCompleteness: '✅ Complete' | '⚠ Partial' | '❌ Incomplete';
  
  // Human-specific feedback
  humanNotes: string;
  humanRationale: string;
  humanConfidence: 'high' | 'medium' | 'low';
  humanRecommendations: string[];
  
  // Comparison with LLM
  llmHumanAgreement: '✅ Agree' | '⚠ Partial' | '❌ Disagree';
  disagreementAreas: string[];
  overallAssessment: '✅ LLM Correct' | '⚠ Mixed' | '❌ LLM Incorrect';
  
  createdAt: string;
  updatedAt: string;
}

export interface HumanReviewSummary {
  totalReviews: number;
  averageAgreement: number;
  llmAccuracy: number;
  humanAccuracy: number;
  disagreementRate: number;
  commonDisagreementAreas: string[];
  reviewerConsensus: 'high' | 'medium' | 'low';
}

export class HumanReviewService {
  /**
   * Submit an evaluation for human review
   */
  async submitForHumanReview(
    evaluationRunId: string,
    reviewerId: string,
    reviewerName: string,
    reviewerEmail: string
  ): Promise<{ success: boolean; reviewId?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('human_reviews')
        .insert({
          evaluation_run_id: evaluationRunId,
          reviewer_id: reviewerId,
          reviewer_name: reviewerName,
          reviewer_email: reviewerEmail,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to submit for human review: ${error.message}`);
      }

      return {
        success: true,
        reviewId: data.id
      };
    } catch (error) {
      console.error('Failed to submit for human review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit for human review'
      };
    }
  }

  /**
   * Submit human review results
   */
  async submitHumanReview(
    reviewId: string,
    review: Omit<HumanReview, 'id' | 'evaluationRunId' | 'createdAt' | 'updatedAt'>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('human_reviews')
        .update({
          human_accuracy: review.humanAccuracy,
          human_relevance: review.humanRelevance,
          human_personalization: review.humanPersonalization,
          human_clarity_tone: review.humanClarityTone,
          human_framework: review.humanFramework,
          human_go_nogo: review.humanGoNogo,
          human_work_history_deduplication: review.humanWorkHistoryDeduplication,
          human_metrics_extraction: review.humanMetricsExtraction,
          human_story_structure: review.humanStoryStructure,
          human_template_quality: review.humanTemplateQuality,
          human_template_reusability: review.humanTemplateReusability,
          human_template_completeness: review.humanTemplateCompleteness,
          human_notes: review.humanNotes,
          human_rationale: review.humanRationale,
          human_confidence: review.humanConfidence,
          human_recommendations: review.humanRecommendations,
          llm_human_agreement: review.llmHumanAgreement,
          disagreement_areas: review.disagreementAreas,
          overall_assessment: review.overallAssessment,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', reviewId);

      if (error) {
        throw new Error(`Failed to submit human review: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to submit human review:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit human review'
      };
    }
  }

  /**
   * Get human review results for an evaluation
   */
  async getHumanReviewResults(evaluationRunId: string): Promise<HumanReview[]> {
    try {
      const { data, error } = await supabase
        .from('human_reviews')
        .select('*')
        .eq('evaluation_run_id', evaluationRunId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get human review results: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get human review results:', error);
      return [];
    }
  }

  /**
   * Get human review summary statistics
   */
  async getHumanReviewSummary(evaluationRunId: string): Promise<HumanReviewSummary> {
    try {
      const reviews = await this.getHumanReviewResults(evaluationRunId);
      
      if (reviews.length === 0) {
        return {
          totalReviews: 0,
          averageAgreement: 0,
          llmAccuracy: 0,
          humanAccuracy: 0,
          disagreementRate: 0,
          commonDisagreementAreas: [],
          reviewerConsensus: 'low'
        };
      }

      // Calculate agreement rates
      const agreements = reviews.filter(r => r.llmHumanAgreement === '✅ Agree').length;
      const averageAgreement = (agreements / reviews.length) * 100;

      // Calculate accuracy rates
      const llmAccurate = reviews.filter(r => r.humanGoNogo === '✅ Go').length;
      const humanAccurate = reviews.filter(r => r.humanGoNogo === '✅ Go').length;
      
      const llmAccuracy = (llmAccurate / reviews.length) * 100;
      const humanAccuracy = (humanAccurate / reviews.length) * 100;

      // Calculate disagreement rate
      const disagreements = reviews.filter(r => r.llmHumanAgreement === '❌ Disagree').length;
      const disagreementRate = (disagreements / reviews.length) * 100;

      // Find common disagreement areas
      const disagreementAreas = reviews
        .filter(r => r.llmHumanAgreement === '❌ Disagree')
        .flatMap(r => r.disagreementAreas);
      
      const commonDisagreementAreas = [...new Set(disagreementAreas)];

      // Calculate reviewer consensus
      const consensus = this.calculateReviewerConsensus(reviews);

      return {
        totalReviews: reviews.length,
        averageAgreement,
        llmAccuracy,
        humanAccuracy,
        disagreementRate,
        commonDisagreementAreas,
        reviewerConsensus: consensus
      };
    } catch (error) {
      console.error('Failed to get human review summary:', error);
      return {
        totalReviews: 0,
        averageAgreement: 0,
        llmAccuracy: 0,
        humanAccuracy: 0,
        disagreementRate: 0,
        commonDisagreementAreas: [],
        reviewerConsensus: 'low'
      };
    }
  }

  /**
   * Calculate reviewer consensus
   */
  private calculateReviewerConsensus(reviews: HumanReview[]): 'high' | 'medium' | 'low' {
    if (reviews.length < 2) return 'low';

    // Check if reviewers agree on key criteria
    const goNogoAgreement = reviews.every(r => r.humanGoNogo === reviews[0].humanGoNogo);
    const accuracyAgreement = reviews.every(r => r.humanAccuracy === reviews[0].humanAccuracy);
    const relevanceAgreement = reviews.every(r => r.humanRelevance === reviews[0].humanRelevance);

    const agreementCount = [goNogoAgreement, accuracyAgreement, relevanceAgreement].filter(Boolean).length;
    
    if (agreementCount >= 2) return 'high';
    if (agreementCount >= 1) return 'medium';
    return 'low';
  }

  /**
   * Get pending human reviews
   */
  async getPendingReviews(): Promise<HumanReview[]> {
    try {
      const { data, error } = await supabase
        .from('human_reviews')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get pending reviews: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get pending reviews:', error);
      return [];
    }
  }

  /**
   * Generate human review report
   */
  generateHumanReviewReport(reviews: HumanReview[]): string {
    if (reviews.length === 0) {
      return 'No human reviews available.';
    }

    const summary = this.calculateReviewSummary(reviews);
    
    return `# Human Review Report

## Summary Statistics
- **Total Reviews**: ${summary.totalReviews}
- **Average Agreement**: ${summary.averageAgreement.toFixed(1)}%
- **LLM Accuracy**: ${summary.llmAccuracy.toFixed(1)}%
- **Human Accuracy**: ${summary.humanAccuracy.toFixed(1)}%
- **Disagreement Rate**: ${summary.disagreementRate.toFixed(1)}%
- **Reviewer Consensus**: ${summary.reviewerConsensus}

## Common Disagreement Areas
${summary.commonDisagreementAreas.map(area => `- ${area}`).join('\n')}

## Individual Reviews
${reviews.map((review, index) => `
### Review ${index + 1} - ${review.reviewerName}
- **Agreement**: ${review.llmHumanAgreement}
- **Overall Assessment**: ${review.overallAssessment}
- **Confidence**: ${review.humanConfidence}
- **Notes**: ${review.humanNotes}
- **Rationale**: ${review.humanRationale}
- **Recommendations**: ${review.humanRecommendations.join(', ')}
`).join('')}`;
  }

  /**
   * Calculate review summary
   */
  private calculateReviewSummary(reviews: HumanReview[]) {
    const agreements = reviews.filter(r => r.llmHumanAgreement === '✅ Agree').length;
    const averageAgreement = (agreements / reviews.length) * 100;

    const llmAccurate = reviews.filter(r => r.humanGoNogo === '✅ Go').length;
    const humanAccurate = reviews.filter(r => r.humanGoNogo === '✅ Go').length;
    
    const llmAccuracy = (llmAccurate / reviews.length) * 100;
    const humanAccuracy = (humanAccurate / reviews.length) * 100;

    const disagreements = reviews.filter(r => r.llmHumanAgreement === '❌ Disagree').length;
    const disagreementRate = (disagreements / reviews.length) * 100;

    const disagreementAreas = reviews
      .filter(r => r.llmHumanAgreement === '❌ Disagree')
      .flatMap(r => r.disagreementAreas);
    
    const commonDisagreementAreas = [...new Set(disagreementAreas)];

    const consensus = this.calculateReviewerConsensus(reviews);

    return {
      totalReviews: reviews.length,
      averageAgreement,
      llmAccuracy,
      humanAccuracy,
      disagreementRate,
      commonDisagreementAreas,
      reviewerConsensus: consensus
    };
  }
}
