/**
 * Metrics Update Service
 * 
 * Handles incremental updates to HIL progress metrics after gap resolution.
 * Recalculates only affected metrics instead of full regenerate.
 */

import type { DetailedMatchAnalysis, CoverLetterSection } from './coverLetterDraftService';
import type { MatchMetricsData } from '@/components/cover-letters/useMatchMetricsDetails';
import type { Gap } from './gapTransformService';
import { RequirementsMatchService } from './requirementsMatchService';

export interface MetricsDelta {
  before: MatchMetricsData;
  after: MatchMetricsData;
  changes: {
    metric: keyof MatchMetricsData;
    before: any;
    after: any;
    improved: boolean;
  }[];
}

export class MetricsUpdateService {
  private requirementsMatchService: RequirementsMatchService;

  constructor() {
    this.requirementsMatchService = new RequirementsMatchService();
  }

  /**
   * Update metrics after a gap is resolved
   * Performs incremental update instead of full recalculation
   */
  async updateMetricsAfterGapResolution(
    currentMetrics: MatchMetricsData,
    currentAnalysis: DetailedMatchAnalysis,
    resolvedGap: Gap,
    updatedSections: CoverLetterSection[],
    coreRequirements: string[],
    preferredRequirements: string[]
  ): Promise<{ metrics: MatchMetricsData; delta: MetricsDelta }> {
    const before = { ...currentMetrics };
    const after = { ...currentMetrics };

    // Track what changed
    const changes: MetricsDelta['changes'] = [];

    // 1. Update requirements match if gap was related to requirements
    if (resolvedGap.type === 'core-requirement' || resolvedGap.type === 'preferred-requirement') {
      const newRequirementsMatch = this.requirementsMatchService.analyzeRequirementsMatch(
        coreRequirements,
        preferredRequirements,
        updatedSections
      );

      // Update core requirements count
      if (resolvedGap.type === 'core-requirement') {
        const oldCoreMet = before.coreRequirementsMet.met;
        after.coreRequirementsMet = {
          met: newRequirementsMatch.coreMetCount,
          total: newRequirementsMatch.coreTotalCount,
        };

        if (after.coreRequirementsMet.met !== oldCoreMet) {
          changes.push({
            metric: 'coreRequirementsMet',
            before: oldCoreMet,
            after: after.coreRequirementsMet.met,
            improved: after.coreRequirementsMet.met > oldCoreMet,
          });
        }
      }

      // Update preferred requirements count
      if (resolvedGap.type === 'preferred-requirement') {
        const oldPreferredMet = before.preferredRequirementsMet.met;
        after.preferredRequirementsMet = {
          met: newRequirementsMatch.preferredMetCount,
          total: newRequirementsMatch.preferredTotalCount,
        };

        if (after.preferredRequirementsMet.met !== oldPreferredMet) {
          changes.push({
            metric: 'preferredRequirementsMet',
            before: oldPreferredMet,
            after: after.preferredRequirementsMet.met,
            improved: after.preferredRequirementsMet.met > oldPreferredMet,
          });
        }
      }
    }

    // 2. Update experience match if content improved
    if (resolvedGap.paragraphId === 'experience') {
      // Estimate improvement based on gap severity
      const oldExperience = before.experienceMatch;
      after.experienceMatch = this.estimateExperienceImprovement(
        oldExperience,
        resolvedGap.severity
      );

      if (after.experienceMatch !== oldExperience) {
        changes.push({
          metric: 'experienceMatch',
          before: oldExperience,
          after: after.experienceMatch,
          improved: this.isRatingBetter(after.experienceMatch, oldExperience),
        });
      }
    }

    // 3. Update cover letter rating if best-practice gap resolved
    if (resolvedGap.type === 'best-practice' || resolvedGap.type === 'content-enhancement') {
      const oldRating = before.coverLetterRating;
      after.coverLetterRating = this.estimateCoverLetterRatingImprovement(
        oldRating,
        resolvedGap.severity
      );

      if (after.coverLetterRating !== oldRating) {
        changes.push({
          metric: 'coverLetterRating',
          before: oldRating,
          after: after.coverLetterRating,
          improved: this.isRatingBetter(after.coverLetterRating, oldRating),
        });
      }
    }

    // 4. Update ATS score if keywords were added
    if (resolvedGap.addresses && resolvedGap.addresses.length > 0) {
      const oldATS = before.atsScore;
      after.atsScore = this.estimateATSImprovement(
        oldATS,
        resolvedGap.addresses.length,
        resolvedGap.severity
      );

      if (after.atsScore !== oldATS) {
        changes.push({
          metric: 'atsScore',
          before: oldATS,
          after: after.atsScore,
          improved: after.atsScore > oldATS,
        });
      }
    }

    return {
      metrics: after,
      delta: {
        before,
        after,
        changes,
      },
    };
  }

  /**
   * Estimate experience match improvement based on gap severity
   */
  private estimateExperienceImprovement(
    current: 'strong' | 'average' | 'weak',
    gapSeverity: 'high' | 'medium' | 'low'
  ): 'strong' | 'average' | 'weak' {
    if (current === 'weak') {
      return gapSeverity === 'high' ? 'average' : 'average';
    }
    if (current === 'average') {
      return gapSeverity === 'high' ? 'strong' : 'strong';
    }
    return current; // Already strong
  }

  /**
   * Estimate cover letter rating improvement based on gap severity
   */
  private estimateCoverLetterRatingImprovement(
    current: 'strong' | 'average' | 'weak',
    gapSeverity: 'high' | 'medium' | 'low'
  ): 'strong' | 'average' | 'weak' {
    if (current === 'weak') {
      return gapSeverity === 'high' ? 'average' : 'average';
    }
    if (current === 'average') {
      return gapSeverity === 'high' ? 'strong' : 'strong';
    }
    return current; // Already strong
  }

  /**
   * Estimate ATS score improvement based on keywords added
   */
  private estimateATSImprovement(
    currentScore: number,
    keywordsAdded: number,
    gapSeverity: 'high' | 'medium' | 'low'
  ): number {
    // Calculate improvement based on keywords and gap severity
    const baseImprovement = keywordsAdded * 2; // 2 points per keyword
    const severityMultiplier = gapSeverity === 'high' ? 1.5 : gapSeverity === 'medium' ? 1.2 : 1.0;
    const improvement = Math.round(baseImprovement * severityMultiplier);
    
    // Cap at 100
    return Math.min(100, currentScore + improvement);
  }

  /**
   * Check if a rating improved
   */
  private isRatingBetter(
    newRating: 'strong' | 'average' | 'weak',
    oldRating: 'strong' | 'average' | 'weak'
  ): boolean {
    const ratingValues = { weak: 1, average: 2, strong: 3 };
    return ratingValues[newRating] > ratingValues[oldRating];
  }

  /**
   * Calculate full metrics from updated sections
   * Used when multiple gaps are resolved or major changes occur
   */
  calculateFullMetrics(
    sections: CoverLetterSection[],
    coreRequirements: string[],
    preferredRequirements: string[]
  ): Partial<MatchMetricsData> {
    const requirementsMatch = this.requirementsMatchService.analyzeRequirementsMatch(
      coreRequirements,
      preferredRequirements,
      sections
    );

    return {
      coreRequirementsMet: {
        met: requirementsMatch.coreMetCount,
        total: requirementsMatch.coreTotalCount,
      },
      preferredRequirementsMet: {
        met: requirementsMatch.preferredMetCount,
        total: requirementsMatch.preferredTotalCount,
      },
    };
  }

  /**
   * Format delta for display
   */
  formatDelta(delta: MetricsDelta): string[] {
    return delta.changes.map(change => {
      const arrow = change.improved ? '↑' : '↓';
      const metric = this.formatMetricName(change.metric);
      const before = this.formatMetricValue(change.before);
      const after = this.formatMetricValue(change.after);
      
      return `${arrow} ${metric}: ${before} → ${after}`;
    });
  }

  /**
   * Format metric name for display
   */
  private formatMetricName(metric: string): string {
    const names: Record<string, string> = {
      goalsMatch: 'Goals Match',
      experienceMatch: 'Experience Match',
      coverLetterRating: 'Cover Letter Rating',
      atsScore: 'ATS Score',
      coreRequirementsMet: 'Core Requirements',
      preferredRequirementsMet: 'Preferred Requirements',
    };
    return names[metric] || metric;
  }

  /**
   * Format metric value for display
   */
  private formatMetricValue(value: any): string {
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'object' && 'met' in value && 'total' in value) {
      return `${value.met}/${value.total}`;
    }
    return String(value);
  }
}

