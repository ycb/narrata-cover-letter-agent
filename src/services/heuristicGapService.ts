/**
 * Heuristic Gap Service (Agent D)
 *
 * Generates instant gap insights using keyword matching and templates (no LLM calls).
 * Provides fast, actionable feedback in ~2 seconds while waiting for full LLM analysis.
 *
 * Detection methods:
 * - Metrics Detection: Regex patterns for numbers, percentages, currency
 * - STAR Format: Action verb detection, narrative structure
 * - Requirement Coverage: Keyword matching against job requirements
 * - Section-Specific Rules: Custom logic per section type (intro, experience, closing)
 */

import type {
  CoverLetterDraftSection,
  ParsedJobDescription,
  SectionGapInsight,
  RequirementGap
} from '@/types/coverLetters';
import { SECTION_GUIDANCE } from '@/prompts/enhancedMetricsAnalysis';

/**
 * Action verbs indicating strong narrative (STAR format)
 */
const ACTION_VERBS = [
  'led', 'managed', 'achieved', 'delivered', 'increased', 'decreased',
  'improved', 'reduced', 'launched', 'created', 'developed', 'implemented',
  'designed', 'built', 'established', 'initiated', 'drove', 'spearheaded',
  'optimized', 'streamlined', 'transformed', 'scaled', 'grew'
];

/**
 * Keywords indicating enthusiasm/interest (for closing sections)
 */
const ENTHUSIASM_KEYWORDS = [
  'excited', 'eager', 'passionate', 'enthusiastic', 'motivated',
  'thrilled', 'inspired', 'committed', 'dedicated', 'confident'
];

/**
 * Keywords indicating call-to-action (for closing sections)
 */
const CTA_KEYWORDS = [
  'discuss', 'conversation', 'meeting', 'interview', 'connect',
  'opportunity', 'next steps', 'follow up', 'speak with', 'hear from'
];

export class HeuristicGapService {
  /**
   * Generate gaps for all sections in a draft
   */
  generateGapsForDraft(
    sections: CoverLetterDraftSection[],
    jobDescription: ParsedJobDescription
  ): Record<string, SectionGapInsight> {
    const insights: Record<string, SectionGapInsight> = {};

    for (const section of sections) {
      const sectionType = this.normalizeSectionType(section.slug);
      insights[section.id] = this.generateSectionGaps(
        section,
        jobDescription,
        sectionType
      );
    }

    return insights;
  }

  /**
   * Generate gap insights for a single section
   */
  generateSectionGaps(
    section: CoverLetterDraftSection,
    jobDescription: ParsedJobDescription,
    sectionType: string
  ): SectionGapInsight {
    const content = section.content || '';
    const gaps: RequirementGap[] = [];

    // 1. Check for quantifiable metrics
    const hasMetrics = this.hasQuantifiableMetrics(content);
    if (!hasMetrics && (sectionType === 'experience' || sectionType === 'introduction')) {
      gaps.push({
        id: `${section.id}-metrics`,
        label: 'Add quantifiable achievements',
        severity: 'high',
        requirementType: 'narrative',
        rationale: 'No metrics or measurable outcomes detected (e.g., %, $, numbers)',
        recommendation: 'Include specific numbers, percentages, or dollar amounts to demonstrate impact'
      });
    }

    // 2. Check for action verbs (STAR format)
    const actionVerbCount = this.countActionVerbs(content);
    if (actionVerbCount < 2 && sectionType === 'experience') {
      gaps.push({
        id: `${section.id}-action-verbs`,
        label: 'Use stronger action verbs',
        severity: 'medium',
        requirementType: 'narrative',
        rationale: `Only ${actionVerbCount} strong action verb(s) found`,
        recommendation: 'Start sentences with action verbs like "led", "achieved", "delivered" to show ownership'
      });
    }

    // 3. Check requirement coverage
    const unmatchedRequirements = this.getUnmatchedRequirements(
      section,
      jobDescription,
      sectionType
    );

    // Add top 2-3 unmatched requirements as gaps
    unmatchedRequirements.slice(0, 3).forEach(req => {
      gaps.push({
        id: req.id,
        label: req.label,
        severity: req.category === 'core' ? 'high' : 'medium',
        requirementType: req.category as 'core' | 'preferred' | 'differentiator',
        rationale: `Job requirement not addressed: ${req.label}`,
        recommendation: this.generateRecommendation(req.label, sectionType)
      });
    });

    // 4. Section-specific checks
    const sectionSpecificGaps = this.getSectionSpecificGaps(content, sectionType, jobDescription);
    gaps.push(...sectionSpecificGaps);

    // 5. Generate prompt summary from section guidance
    const promptSummary = this.getPromptSummary(sectionType, gaps.length);

    // 6. Generate recommended moves
    const recommendedMoves = this.generateRecommendedMoves(gaps, sectionType);

    // 7. Determine next action
    const nextAction = gaps.length > 0
      ? (gaps.some(g => g.requirementType === 'core' || g.requirementType === 'preferred')
          ? 'add-story'
          : 'add-metrics')
      : null;

    return {
      sectionId: section.id,
      sectionSlug: section.slug,
      sectionType,
      sectionTitle: section.title || this.getTitleForType(sectionType),
      promptSummary,
      requirementGaps: gaps,
      recommendedMoves,
      nextAction
    };
  }

  /**
   * Check if content contains quantifiable metrics
   */
  private hasQuantifiableMetrics(content: string): boolean {
    // Patterns for metrics: percentages, currency, multipliers, large numbers
    const metricPatterns = [
      /\d+%/,                    // 25%, 100%
      /\$[\d,]+/,                // $50,000, $1M
      /\d+[xX]/,                 // 2x, 10X
      /\d+(?:k|K|m|M|b|B)/,      // 50k, 1M, 2B
      /\d{1,3}(?:,\d{3})+/,      // 1,000 or 1,000,000
      /\d+(?:\.\d+)?(?:million|billion|thousand)/i  // 1.5 million
    ];

    return metricPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Count strong action verbs at sentence starts
   */
  private countActionVerbs(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    let count = 0;

    for (const sentence of sentences) {
      const trimmed = sentence.trim().toLowerCase();
      const firstWord = trimmed.split(/\s+/)[0];

      if (ACTION_VERBS.includes(firstWord)) {
        count++;
      }
    }

    return count;
  }

  /**
   * Get requirements not matched in this section
   */
  private getUnmatchedRequirements(
    section: CoverLetterDraftSection,
    jobDescription: ParsedJobDescription,
    sectionType: string
  ): Array<{ id: string; label: string; category: string }> {
    const matchedIds = new Set(section.metadata?.requirementsMatched || []);
    const allRequirements = [
      ...jobDescription.standardRequirements.map(r => ({ ...r, category: 'core' })),
      ...jobDescription.preferredRequirements.map(r => ({ ...r, category: 'preferred' })),
      ...jobDescription.differentiatorRequirements.map(r => ({ ...r, category: 'differentiator' }))
    ];

    // Filter to requirements relevant for this section type
    const relevantRequirements = allRequirements.filter(req => {
      // All requirements relevant for experience sections
      if (sectionType === 'experience') return true;

      // Core requirements relevant for intro
      if (sectionType === 'introduction' && req.category === 'core') return true;

      // Differentiators relevant for closing
      if (sectionType === 'closing' && req.category === 'differentiator') return true;

      return false;
    });

    return relevantRequirements
      .filter(req => !matchedIds.has(req.id))
      .map(req => ({
        id: req.id,
        label: req.label,
        category: req.category
      }));
  }

  /**
   * Get section-specific gap checks
   */
  private getSectionSpecificGaps(
    content: string,
    sectionType: string,
    jobDescription: ParsedJobDescription
  ): RequirementGap[] {
    const gaps: RequirementGap[] = [];
    const lowerContent = content.toLowerCase();

    switch (sectionType) {
      case 'introduction':
        // Check for company name
        const hasCompanyName = jobDescription.company &&
          lowerContent.includes(jobDescription.company.toLowerCase());
        if (!hasCompanyName && jobDescription.company) {
          gaps.push({
            id: 'intro-company',
            label: 'Mention company name',
            severity: 'medium',
            requirementType: 'narrative',
            rationale: 'Company name not mentioned in introduction',
            recommendation: `Reference ${jobDescription.company} to show personalization`
          });
        }

        // Check for role-specific keywords
        const hasRoleKeywords = jobDescription.role &&
          lowerContent.includes(jobDescription.role.toLowerCase());
        if (!hasRoleKeywords && jobDescription.role) {
          gaps.push({
            id: 'intro-role',
            label: 'Reference specific role',
            severity: 'low',
            requirementType: 'narrative',
            rationale: 'Role title not mentioned in introduction',
            recommendation: `Mention "${jobDescription.role}" to show clear understanding of position`
          });
        }
        break;

      case 'experience':
        // Already handled by metrics and action verb checks
        break;

      case 'closing':
        // Check for enthusiasm indicators
        const hasEnthusiasm = ENTHUSIASM_KEYWORDS.some(keyword =>
          lowerContent.includes(keyword)
        );
        if (!hasEnthusiasm) {
          gaps.push({
            id: 'closing-enthusiasm',
            label: 'Express enthusiasm',
            severity: 'medium',
            requirementType: 'narrative',
            rationale: 'No enthusiasm or excitement indicators found',
            recommendation: 'Add language showing genuine interest (e.g., "excited", "eager", "passionate")'
          });
        }

        // Check for call-to-action
        const hasCTA = CTA_KEYWORDS.some(keyword =>
          lowerContent.includes(keyword)
        );
        if (!hasCTA) {
          gaps.push({
            id: 'closing-cta',
            label: 'Include call-to-action',
            severity: 'high',
            requirementType: 'narrative',
            rationale: 'No clear call-to-action found',
            recommendation: 'Add next steps language (e.g., "discuss further", "schedule a conversation")'
          });
        }
        break;

      case 'signature':
        // Signature is typically static, no gaps
        break;
    }

    return gaps;
  }

  /**
   * Generate recommendation text for a requirement
   */
  private generateRecommendation(requirementLabel: string, sectionType: string): string {
    const action = sectionType === 'introduction'
      ? 'Highlight'
      : sectionType === 'closing'
        ? 'Reinforce'
        : 'Demonstrate';

    return `${action} your experience with ${requirementLabel} using specific examples`;
  }

  /**
   * Get prompt summary from section guidance
   */
  private getPromptSummary(sectionType: string, gapCount: number): string {
    const guidance = SECTION_GUIDANCE[sectionType as keyof typeof SECTION_GUIDANCE];

    if (!guidance) {
      return gapCount > 0
        ? 'Quick analysis (AI insights loading...)'
        : 'Section looks good';
    }

    // Use guidance summary, add note that AI is refining
    return gapCount > 0
      ? `${guidance.summary} (AI refining...)`
      : guidance.summary;
  }

  /**
   * Generate recommended moves based on gaps
   */
  private generateRecommendedMoves(gaps: RequirementGap[], sectionType: string): string[] {
    const moves: string[] = [];

    // Group gaps by type
    const hasMetricGaps = gaps.some(g => g.id.includes('metrics'));
    const hasActionVerbGaps = gaps.some(g => g.id.includes('action-verbs'));
    const hasRequirementGaps = gaps.some(g => g.requirementType !== 'narrative');
    const hasCTAGaps = gaps.some(g => g.id.includes('cta'));
    const hasEnthusiasmGaps = gaps.some(g => g.id.includes('enthusiasm'));

    if (hasMetricGaps) {
      moves.push('Add specific metrics (%, $, numbers) to quantify impact');
    }

    if (hasActionVerbGaps) {
      moves.push('Start sentences with strong action verbs (led, achieved, delivered)');
    }

    if (hasRequirementGaps) {
      const reqGaps = gaps.filter(g => g.requirementType !== 'narrative');
      const topReq = reqGaps[0];
      if (topReq) {
        moves.push(`Address key requirement: ${topReq.label}`);
      }
    }

    if (hasCTAGaps) {
      moves.push('Add clear call-to-action about next steps');
    }

    if (hasEnthusiasmGaps) {
      moves.push('Express enthusiasm and genuine interest in the role');
    }

    // Limit to top 3 moves
    return moves.slice(0, 3);
  }

  /**
   * Normalize section type to canonical form
   */
  private normalizeSectionType(sectionSlug: string): string {
    const mapping: Record<string, string> = {
      'intro': 'introduction',
      'paragraph': 'experience',
      'closer': 'closing',
      'signature': 'signature'
    };

    return mapping[sectionSlug] || sectionSlug;
  }

  /**
   * Get human-readable title for section type
   */
  private getTitleForType(sectionType: string): string {
    const titles: Record<string, string> = {
      'introduction': 'Introduction',
      'experience': 'Experience',
      'closing': 'Closing',
      'signature': 'Signature'
    };

    return titles[sectionType] || sectionType;
  }
}
