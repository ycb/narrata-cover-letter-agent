/**
 * Content Standards Service
 *
 * Aggregates section-level and letter-level content standards into unified analysis
 * Handles applicability rules and aggregation logic (any_section, all_sections, global)
 */

import type {
  ApplicabilityRule,
  SectionStandardResult,
  LetterStandardResult,
  AggregatedStandardResult,
  ContentStandardsAnalysis,
} from '@/types/coverLetters';
import { CONTENT_STANDARDS, getStandardConfig } from '@/config/contentStandards';

/**
 * Section metadata for applicability checks
 */
export interface SectionMeta {
  sectionId: string;
  sectionType: 'intro' | 'body' | 'closing';
  sectionTitle?: string;
}

/**
 * Check if a standard applies to a given section type
 *
 * @param applicability - Applicability rule from standard config
 * @param sectionType - Section type (intro, body, closing)
 * @returns True if standard applies to this section type
 */
export function isSectionApplicable(
  applicability: ApplicabilityRule,
  sectionType: 'intro' | 'body' | 'closing'
): boolean {
  if (applicability === 'all_sections') return true;
  if (applicability === 'intro_only') return sectionType === 'intro';
  if (applicability === 'body_only') return sectionType === 'body';
  if (applicability === 'closing_only') return sectionType === 'closing';
  return true;
}

/**
 * Aggregate section-level and letter-level standards into letter-level view
 *
 * @param sectionsMeta - Metadata about sections in the letter
 * @param perSection - Per-section evaluation results
 * @param perLetter - Letter-level evaluation results
 * @returns Aggregated analysis with overall score
 */
export function aggregateContentStandards(
  sectionsMeta: SectionMeta[],
  perSection: SectionStandardResult[],
  perLetter: LetterStandardResult[]
): ContentStandardsAnalysis {
  const aggregated: AggregatedStandardResult[] = [];

  const normalizeStandardResultId = (standardId: string) =>
    getStandardConfig(standardId)?.id ?? standardId;

  // Process each standard
  for (const standardConfig of CONTENT_STANDARDS) {
    if (standardConfig.scope === 'letter') {
      // Letter-scoped standards: use letter-level result directly
      const letterResult = perLetter.find(
        (r) => normalizeStandardResultId(r.standardId) === standardConfig.id
      );
      if (letterResult) {
        aggregated.push({
          standardId: standardConfig.id,
          status: letterResult.status,
          contributingSections: [], // Letter-level standards don't have contributing sections
          evidence: letterResult.evidence,
        });
      }
    } else {
      // Section-scoped standards: aggregate based on aggregation rule
      const { aggregation, applicability } = standardConfig;

      // Find all applicable sections for this standard
      const applicableSections = sectionsMeta.filter((meta) =>
        isSectionApplicable(applicability, meta.sectionType)
      );

      // Get results for applicable sections
      const sectionResults = applicableSections.map((meta) => {
        const sectionResult = perSection.find((r) => r.sectionId === meta.sectionId);
        const standardResult = sectionResult?.standards.find(
          (s) => normalizeStandardResultId(s.standardId) === standardConfig.id
        );
        return {
          sectionId: meta.sectionId,
          sectionTitle: meta.sectionTitle,
          status: standardResult?.status || 'not_applicable',
          evidence: standardResult?.evidence || '',
        };
      });

      // Aggregate based on rule
      let status: 'met' | 'not_met' = 'not_met';
      let contributingSections: string[] = [];
      let evidence = '';

      if (aggregation === 'any_section') {
        // Met if ANY applicable section meets it
        const metSections = sectionResults.filter((r) => r.status === 'met');
        status = metSections.length > 0 ? 'met' : 'not_met';
        contributingSections = metSections.map((r) => r.sectionId);
        evidence = metSections.length > 0
          ? metSections.map((r) => r.evidence).join(' | ')
          : sectionResults[0]?.evidence || 'Not demonstrated in any section.';
      } else if (aggregation === 'all_sections') {
        // Met only if ALL applicable sections meet it
        const metSections = sectionResults.filter((r) => r.status === 'met');
        const unmetSections = sectionResults.filter((r) => r.status !== 'met');
        status = unmetSections.length === 0 && metSections.length > 0 ? 'met' : 'not_met';
        contributingSections = status === 'met' ? metSections.map((r) => r.sectionId) : [];
        const unmetLabels = unmetSections.map((r) => r.sectionTitle || r.sectionId);
        evidence = status === 'met'
          ? 'All sections meet this standard.'
          : `${unmetSections.length} section(s) do not meet this standard: ${unmetLabels.join(', ')}.`;
      }

      aggregated.push({
        standardId: standardConfig.id,
        status,
        contributingSections,
        evidence,
      });
    }
  }

  // Calculate overall score (percentage of standards met)
  const totalStandards = aggregated.length;
  const metStandards = aggregated.filter((r) => r.status === 'met').length;
  const overallScore = totalStandards > 0 ? Math.round((metStandards / totalStandards) * 100) : 0;

  return {
    perSection,
    perLetter,
    aggregated: {
      standards: aggregated,
      overallScore,
    },
  };
}

/**
 * Map DraftSectionType to simplified section type for applicability checks
 *
 * @param draftSectionType - Section type from CoverLetterDraftSection
 * @returns Simplified section type (intro, body, closing)
 */
export function mapDraftSectionType(
  draftSectionType: 'static' | 'dynamic-story' | 'dynamic-saved' | 'closing'
): 'intro' | 'body' | 'closing' {
  if (draftSectionType === 'static') return 'intro';
  if (draftSectionType === 'closing') return 'closing';
  // dynamic-story and dynamic-saved both map to body
  return 'body';
}

/**
 * Extract section metadata from cover letter sections
 *
 * @param sections - Cover letter draft sections
 * @returns Array of section metadata for applicability checks
 */
export function extractSectionsMeta(
  sections: Array<{ id: string; type: 'static' | 'dynamic-story' | 'dynamic-saved' | 'closing'; title?: string }>
): SectionMeta[] {
  return sections.map((section) => ({
    sectionId: section.id,
    sectionType: mapDraftSectionType(section.type),
    sectionTitle: section.title,
  }));
}
