/**
 * Content Standards Configuration
 *
 * Defines all 11 content quality standards for cover letters with:
 * - Evaluation scope (section vs letter)
 * - Aggregation rules (any_section, all_sections, global)
 * - Applicability rules (which section types)
 *
 * Used by content standards evaluation service for section-level attribution
 */

import type { ContentStandardConfig } from '@/types/coverLetters';

export const CONTENT_STANDARDS: ContentStandardConfig[] = [
  // ============================================================================
  // Section-Scoped Standards (evaluated per-section)
  // ============================================================================

  {
    id: 'compelling_opening',
    label: 'Compelling Opening',
    description: 'Clear credibility and relevance early; hook is optional.',
    scope: 'section',
    aggregation: 'any_section', // Met if intro section meets it
    applicability: 'intro_only',
  },

  {
    id: 'business_understanding',
    label: 'Understanding of Business/Users',
    description: 'Demonstrates knowledge of company products, users, or market.',
    scope: 'section',
    aggregation: 'any_section', // Met if ANY section demonstrates this
    applicability: 'all_sections',
  },

  {
    id: 'quantified_impact',
    label: 'Quantified Impact',
    description: 'Contains specific metrics or concrete scope markers.',
    scope: 'section',
    aggregation: 'any_section', // Met if ANY section has metrics
    applicability: 'all_sections',
  },

  {
    id: 'action_verbs',
    label: 'Action Verbs & Ownership',
    description: 'Uses strong action verbs and shows clear ownership.',
    scope: 'section',
    aggregation: 'all_sections', // ALL sections should use action verbs
    applicability: 'all_sections',
  },

  {
    id: 'star_format',
    label: 'STAR Format',
    description: 'Stories follow Situation-Task-Action-Result structure.',
    scope: 'section',
    aggregation: 'any_section', // Met if ANY section uses STAR
    applicability: 'body_only', // Only body paragraphs tell stories
  },

  {
    id: 'personalized',
    label: 'Personalized to Role',
    description: 'Clearly tailored to this specific job (not generic).',
    scope: 'section',
    aggregation: 'all_sections', // ALL sections should be personalized
    applicability: 'all_sections',
  },

  {
    id: 'specific_examples',
    label: 'Specific Examples',
    description: 'Concrete examples from work history (not vague claims).',
    scope: 'section',
    aggregation: 'any_section', // Met if ANY section has specific examples
    applicability: 'body_only', // Body paragraphs contain examples
  },

  {
    id: 'company_research',
    label: 'Company Research',
    description: 'Shows understanding of company culture, mission, or challenges.',
    scope: 'section',
    aggregation: 'any_section', // Met if ANY section shows research
    applicability: 'all_sections',
  },

  // ============================================================================
  // Letter-Scoped Standards (evaluated globally)
  // ============================================================================

  {
    id: 'concise_length',
    label: 'Concise Length',
    description: '3-4 paragraphs, under 400 words, no unnecessary fluff.',
    scope: 'letter',
    aggregation: 'global', // Evaluated on entire letter
    applicability: 'all_sections', // Not applicable (letter-level)
  },

  {
    id: 'error_free',
    label: 'Error-Free Writing',
    description: 'No spelling or grammar errors, professional language throughout.',
    scope: 'letter',
    aggregation: 'global', // Evaluated on entire letter
    applicability: 'all_sections', // Not applicable (letter-level)
  },

  {
    id: 'professional_tone',
    label: 'Professional Tone',
    description: 'Appropriate formality level, confident but not arrogant.',
    scope: 'letter',
    aggregation: 'global', // Evaluated on entire letter
    applicability: 'all_sections', // Not applicable (letter-level)
  },
];

/**
 * Normalize legacy standard IDs to current format
 * Maps old snake_case IDs (from legacy LLM responses) to current IDs
 */
function normalizeStandardId(standardId: string): string {
  const legacyMapping: Record<string, string> = {
    'action_verbs_ownership': 'action_verbs',
    'personalized_to_role': 'personalized',
    // Add other legacy mappings as discovered
  };

  return legacyMapping[standardId] || standardId;
}

/**
 * Get standard configuration by ID
 * Handles both current and legacy ID formats for backward compatibility
 */
export function getStandardConfig(standardId: string): ContentStandardConfig | undefined {
  const normalizedId = normalizeStandardId(standardId);
  return CONTENT_STANDARDS.find((s) => s.id === normalizedId);
}

/**
 * Get all section-scoped standards
 */
export function getSectionScopedStandards(): ContentStandardConfig[] {
  return CONTENT_STANDARDS.filter((s) => s.scope === 'section');
}

/**
 * Get all letter-scoped standards
 */
export function getLetterScopedStandards(): ContentStandardConfig[] {
  return CONTENT_STANDARDS.filter((s) => s.scope === 'letter');
}

/**
 * Get standards applicable to a specific section type
 */
export function getApplicableStandards(
  sectionType: 'intro' | 'body' | 'closing'
): ContentStandardConfig[] {
  return CONTENT_STANDARDS.filter((standard) => {
    if (standard.scope === 'letter') return false; // Letter-scoped not shown per-section

    const { applicability } = standard;
    if (applicability === 'all_sections') return true;
    if (applicability === 'intro_only') return sectionType === 'intro';
    if (applicability === 'body_only') return sectionType === 'body';
    if (applicability === 'closing_only') return sectionType === 'closing';
    return false;
  });
}
