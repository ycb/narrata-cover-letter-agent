/**
 * Gap Transform Service
 * 
 * Transforms detailed analysis results into actionable gaps for HIL gap resolution.
 * Generates gaps from requirements match, experience match, and content quality analysis.
 */

import type { DetailedMatchAnalysis } from './coverLetterDraftService';
import type { CoverLetterSection } from './coverLetterDraftService';

export interface Gap {
  id: string;
  type: 'core-requirement' | 'preferred-requirement' | 'best-practice' | 'content-enhancement';
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion: string;
  paragraphId?: string;
  requirementId?: string;
  origin: 'ai' | 'human' | 'library';
  addresses?: string[];
  existingContent?: string;
  // Requirement gaps (for ContentGapBanner display)
  gaps?: Array<{ id: string; title?: string; description: string }>;
  gapSummary?: string | null;
  // Rating criteria gaps stored separately from requirement gaps
  ratingCriteriaGaps?: Array<{ id: string; title?: string; description: string }>;
}

export class GapTransformService {
  /**
   * Transform detailedAnalysis into actionable gaps
   */
  static transformAnalysisToGaps(
    analysis: DetailedMatchAnalysis,
    sections: CoverLetterSection[]
  ): Gap[] {
    const gaps: Gap[] = [];

    // 1. Generate gaps from unmet core requirements
    gaps.push(...this.generateRequirementGaps(
      analysis.requirementsMatch.coreRequirements.filter(req => !req.demonstrated),
      'core-requirement',
      'high',
      sections
    ));

    // 2. Generate gaps from unmet preferred requirements
    gaps.push(...this.generateRequirementGaps(
      analysis.requirementsMatch.preferredRequirements.filter(req => !req.demonstrated),
      'preferred-requirement',
      'medium',
      sections
    ));

    // 3. Generate gaps from experience match analysis
    gaps.push(...this.generateExperienceGaps(
      analysis.coreExperienceMatch,
      analysis.preferredExperienceMatch,
      sections
    ));

    // 4. Generate gaps from cover letter rating
    gaps.push(...this.generateCoverLetterQualityGaps(
      analysis.coverLetterRating,
      sections
    ));

    // 5. Generate gaps from ATS analysis
    gaps.push(...this.generateATSGaps(
      analysis.atsAnalysis,
      sections
    ));

    return gaps;
  }

  /**
   * Generate gaps from unmet requirements
   */
  private static generateRequirementGaps(
    unmetRequirements: Array<{ id: string; requirement: string; evidence: string; sectionIds: string[] }>,
    type: 'core-requirement' | 'preferred-requirement',
    severity: 'high' | 'medium',
    sections: CoverLetterSection[]
  ): Gap[] {
    return unmetRequirements.map(req => {
      // Try to associate with most relevant section
      const targetSection = this.findBestSectionForRequirement(req.requirement, sections);
      
      return {
        id: `req-gap-${req.id}`,
        type,
        severity,
        description: `Requirement not demonstrated: ${req.requirement}`,
        suggestion: `Add specific examples or evidence that demonstrates your experience with ${req.requirement}. Include metrics and concrete outcomes.`,
        paragraphId: targetSection?.id || 'experience',
        requirementId: req.id,
        origin: 'ai',
        addresses: [req.requirement],
        existingContent: targetSection?.content || '',
      };
    });
  }

  /**
   * Generate gaps from experience match analysis
   */
  private static generateExperienceGaps(
    coreExperience: any,
    preferredExperience: any,
    sections: CoverLetterSection[]
  ): Gap[] {
    const gaps: Gap[] = [];

    // Find low confidence matches in core requirements
    const lowConfidenceCore = coreExperience.matches.filter(
      (m: any) => m.confidence === 'low' || m.confidence === 'medium'
    );

    for (const match of lowConfidenceCore) {
      const experienceSection = sections.find(s => s.type === 'experience');
      
      gaps.push({
        id: `exp-gap-core-${match.requirement.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'core-requirement',
        severity: match.confidence === 'low' ? 'high' : 'medium',
        description: `Weak evidence for requirement: ${match.requirement}`,
        suggestion: match.missingDetails || `Strengthen your evidence for "${match.requirement}" by adding specific achievements, metrics, and concrete examples from your work history.`,
        paragraphId: 'experience',
        origin: 'ai',
        addresses: [match.requirement],
        existingContent: experienceSection?.content || '',
      });
    }

    // Find low confidence matches in preferred requirements
    const lowConfidencePreferred = preferredExperience.matches.filter(
      (m: any) => m.confidence === 'low'
    );

    for (const match of lowConfidencePreferred) {
      const experienceSection = sections.find(s => s.type === 'experience');
      
      gaps.push({
        id: `exp-gap-preferred-${match.requirement.toLowerCase().replace(/\s+/g, '-')}`,
        type: 'preferred-requirement',
        severity: 'medium',
        description: `Could strengthen: ${match.requirement}`,
        suggestion: match.missingDetails || `Consider adding evidence for "${match.requirement}" if you have relevant experience.`,
        paragraphId: 'experience',
        origin: 'ai',
        addresses: [match.requirement],
        existingContent: experienceSection?.content || '',
      });
    }

    return gaps;
  }

  /**
   * Generate gaps from cover letter quality rating
   */
  private static generateCoverLetterQualityGaps(
    rating: any,
    sections: CoverLetterSection[]
  ): Gap[] {
    const gaps: Gap[] = [];

    // Check each dimension of cover letter quality
    if (rating.dimensions) {
      // Brevity & Tone
      if (rating.dimensions.brevityAndTone && rating.dimensions.brevityAndTone.score < 70) {
        const suggestion = rating.dimensions.brevityAndTone.feedback || 'Improve brevity and professional tone';
        const targetSection = sections.find(s => s.content.length > 300) || sections[0];
        
        gaps.push({
          id: 'quality-brevity-tone',
          type: 'best-practice',
          severity: rating.dimensions.brevityAndTone.score < 50 ? 'high' : 'medium',
          description: 'Brevity and tone could be improved',
          suggestion,
          paragraphId: targetSection?.id || 'intro',
          origin: 'ai',
          addresses: ['Writing quality', 'Professional tone'],
          existingContent: targetSection?.content || '',
        });
      }

      // Mission Alignment
      if (rating.dimensions.missionAlignment && rating.dimensions.missionAlignment.score < 70) {
        const suggestion = rating.dimensions.missionAlignment.feedback || 'Add stronger connection to company mission and values';
        const closingSection = sections.find(s => s.type === 'closing') || sections[sections.length - 2];
        
        gaps.push({
          id: 'quality-mission-alignment',
          type: 'content-enhancement',
          severity: 'medium',
          description: 'Mission alignment could be strengthened',
          suggestion,
          paragraphId: closingSection?.id || 'closing',
          origin: 'ai',
          addresses: ['Company alignment', 'Cultural fit'],
          existingContent: closingSection?.content || '',
        });
      }

      // Metrics & Impact
      if (rating.dimensions.metricsAndImpact && rating.dimensions.metricsAndImpact.score < 70) {
        const suggestion = rating.dimensions.metricsAndImpact.feedback || 'Add more quantifiable metrics and concrete business impact';
        const experienceSection = sections.find(s => s.type === 'experience');
        
        gaps.push({
          id: 'quality-metrics-impact',
          type: 'best-practice',
          severity: 'high',
          description: 'Needs more quantifiable achievements',
          suggestion,
          paragraphId: 'experience',
          origin: 'ai',
          addresses: ['Quantifiable impact', 'Metrics'],
          existingContent: experienceSection?.content || '',
        });
      }
    }

    return gaps;
  }

  /**
   * Generate gaps from ATS analysis
   */
  private static generateATSGaps(
    atsAnalysis: any,
    sections: CoverLetterSection[]
  ): Gap[] {
    const gaps: Gap[] = [];

    // Missing keywords
    if (atsAnalysis.missing_keywords && atsAnalysis.missing_keywords.length > 0) {
      const highPriorityMissing = atsAnalysis.missing_keywords.slice(0, 5); // Top 5 missing keywords
      const experienceSection = sections.find(s => s.type === 'experience');
      
      gaps.push({
        id: 'ats-missing-keywords',
        type: 'content-enhancement',
        severity: 'medium',
        description: `Missing important keywords: ${highPriorityMissing.join(', ')}`,
        suggestion: `Incorporate these keywords naturally into your cover letter: ${highPriorityMissing.join(', ')}. Reference specific projects or experiences where you used these skills.`,
        paragraphId: 'experience',
        origin: 'ai',
        addresses: highPriorityMissing,
        existingContent: experienceSection?.content || '',
      });
    }

    // Low overall ATS score
    if (atsAnalysis.overall_score < 70) {
      const improvementAreas = atsAnalysis.improvement_areas || [];
      const introSection = sections.find(s => s.type === 'intro');
      
      if (improvementAreas.length > 0) {
        gaps.push({
          id: 'ats-overall-score',
          type: 'content-enhancement',
          severity: atsAnalysis.overall_score < 50 ? 'high' : 'medium',
          description: `ATS optimization needed (score: ${atsAnalysis.overall_score}/100)`,
          suggestion: `Improve ATS compatibility by: ${improvementAreas.join('; ')}`,
          paragraphId: 'intro',
          origin: 'ai',
          addresses: ['ATS compatibility', 'Keyword optimization'],
          existingContent: introSection?.content || '',
        });
      }
    }

    return gaps;
  }

  /**
   * Find the best section to address a requirement
   */
  private static findBestSectionForRequirement(
    requirement: string,
    sections: CoverLetterSection[]
  ): CoverLetterSection | undefined {
    // Technical requirements usually go in experience
    const technicalKeywords = ['experience', 'skill', 'tool', 'technology', 'platform', 'language', 'framework'];
    if (technicalKeywords.some(keyword => requirement.toLowerCase().includes(keyword))) {
      return sections.find(s => s.type === 'experience');
    }

    // Soft skills or leadership often in intro or closing
    const softSkillKeywords = ['leadership', 'communication', 'collaboration', 'team', 'culture'];
    if (softSkillKeywords.some(keyword => requirement.toLowerCase().includes(keyword))) {
      return sections.find(s => s.type === 'closing');
    }

    // Default to experience section
    return sections.find(s => s.type === 'experience');
  }

  /**
   * Filter gaps by section
   */
  static filterGapsBySection(gaps: Gap[], sectionId: string): Gap[] {
    return gaps.filter(gap => gap.paragraphId === sectionId);
  }

  /**
   * Get gap summary statistics
   */
  static getGapSummary(gaps: Gap[]): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  } {
    return {
      total: gaps.length,
      byType: {
        'core-requirement': gaps.filter(g => g.type === 'core-requirement').length,
        'preferred-requirement': gaps.filter(g => g.type === 'preferred-requirement').length,
        'best-practice': gaps.filter(g => g.type === 'best-practice').length,
        'content-enhancement': gaps.filter(g => g.type === 'content-enhancement').length,
      },
      bySeverity: {
        high: gaps.filter(g => g.severity === 'high').length,
        medium: gaps.filter(g => g.severity === 'medium').length,
        low: gaps.filter(g => g.severity === 'low').length,
      },
    };
  }
}

