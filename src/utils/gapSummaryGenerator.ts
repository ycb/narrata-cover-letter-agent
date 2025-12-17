/**
 * Gap Summary Generator
 * 
 * Generates contextual gap summaries from gap categories using template-based mapping.
 * No LLM calls required - pure template logic for fast, consistent summaries.
 */

export type GapSummaryContentType = 'role_description' | 'role_metrics' | 'story' | 'saved_section';

/**
 * Generate a contextual gap summary from gap categories
 * 
 * @param gapCategories - Array of gap category strings (e.g., ['missing_metrics', 'story_needs_specifics'])
 * @param contentType - Type of content being analyzed
 * @returns Human-readable summary string for the gap banner title
 */
export function generateGapSummary(
  gapCategories: string[],
  contentType: GapSummaryContentType
): string {
  if (!gapCategories || gapCategories.length === 0) {
    return 'Gaps Detected';
  }

  // Map categories to priority (higher number = higher priority)
  const categoryPriority: Record<string, number> = {
    // Role Description
    'missing_role_description': 10,
    // Back-compat: legacy category name
    'generic_role_description': 9,
    // New standards-based category name
    'role_description_needs_specifics': 9,
    
    // Role Metrics
    'missing_role_metrics': 8,
    'insufficient_role_metrics': 7,
    
    // Story
    'incomplete_story': 10,
    'missing_metrics': 8,
    // Back-compat: legacy category name
    'too_generic': 7,
    // New standards-based category name
    'story_needs_specifics': 7,
    
    // Saved Section
    // Back-compat: legacy category name
    'generic_cover_letter_section': 8,
    // New standards-based category name
    'saved_section_needs_specifics': 8,
    'incomplete_intro': 7,
    'incomplete_cover_letter_section': 9,
    'missing_metrics_cover_letter': 6,
    'incomplete_signature': 5,
    
    // Tags
    'missing_tags': 5,
    'tag_industry_misalignment': 4,
    'tag_business_model_misalignment': 4,
  };

  // Sort categories by priority (highest first)
  const sortedCategories = [...gapCategories].sort((a, b) => {
    const priorityA = categoryPriority[a] || 0;
    const priorityB = categoryPriority[b] || 0;
    return priorityB - priorityA;
  });

  const primaryCategory = sortedCategories[0];
  const hasMultiple = sortedCategories.length > 1;

  // Template mappings by content type
  const templates: Record<GapSummaryContentType, Record<string, string>> = {
    role_description: {
      'missing_role_description': 'Add role description',
      'generic_role_description': 'Add more specific details and quantifiable achievements',
      'role_description_needs_specifics': 'Add more specific details and quantifiable achievements',
      // Fallback
      'default': 'Add role description details',
    },
    role_metrics: {
      'missing_role_metrics': 'Add quantifiable metrics to demonstrate impact',
      'insufficient_role_metrics': 'Add more quantifiable metrics to demonstrate impact',
      // Fallback
      'default': 'Add quantifiable metrics to demonstrate impact',
    },
    story: {
      'incomplete_story': 'Add narrative structure (STAR format)',
      'missing_metrics': 'Add quantifiable metrics',
      'too_generic': 'Add more specific details and measurable outcomes',
      'story_needs_specifics': 'Add more specific details and measurable outcomes',
      // Multiple gaps
      'multiple': 'Add structure, metrics, and specific details',
      // Fallback
      'default': 'Add story details',
    },
    saved_section: {
      'generic_cover_letter_section': 'Add more specific content aligned with job requirements',
      'saved_section_needs_specifics': 'Add more specific content aligned with job requirements',
      'incomplete_intro': 'Add company and role-specific details',
      'incomplete_cover_letter_section': 'Add narrative structure (STAR format)',
      'missing_metrics_cover_letter': 'Add quantifiable achievements',
      'incomplete_signature': 'Add contact information',
      // Multiple gaps
      'multiple': 'Add structure, metrics, and specific content',
      // Fallback
      'default': 'Add section details',
    },
  };

  const typeTemplates = templates[contentType];
  
  // If multiple gaps, use combined template if available
  if (hasMultiple && typeTemplates.multiple) {
    return typeTemplates.multiple;
  }

  // Use primary category template or fallback
  return typeTemplates[primaryCategory] || typeTemplates.default || 'Gaps Detected';
}
