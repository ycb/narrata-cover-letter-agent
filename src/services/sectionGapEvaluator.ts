/**
 * Section Gap Evaluator
 * 
 * Provides heuristic (fast, non-LLM) gap detection for cover letter sections.
 * This runs immediately after section edits to provide instant feedback,
 * while background LLM analysis provides richer insights.
 * 
 * Philosophy:
 * - Fast: No API calls, pure TypeScript heuristics
 * - Defensive: Never throws, always returns valid insights
 * - Pragmatic: Focuses on high-signal gaps (missing keywords, no metrics, generic language)
 */

import type { 
  SectionGapInsight, 
  CoverLetterDraftSection,
  ParsedJobDescription 
} from '@/types/coverLetters';

interface EvaluateSectionGapOptions {
  section: CoverLetterDraftSection;
  jobDescription: ParsedJobDescription;
  allSections: CoverLetterDraftSection[];
}

/**
 * Evaluate a single section for gaps using heuristic rules.
 * Returns insights similar to LLM-generated sectionGapInsights, but based on heuristics.
 * 
 * Heuristic Rules:
 * 1. Keyword matching: Check if section addresses JD requirements via keyword overlap
 * 2. Metrics detection: Flag sections without quantified achievements
 * 3. Length validation: Flag sections that are too short or too long
 * 4. Generic language detection: Flag sections with vague language
 * 
 * @param options - Section, job description, and context
 * @returns SectionGapInsight with heuristic-detected gaps
 */
export function evaluateSectionGap(options: EvaluateSectionGapOptions): SectionGapInsight {
  const { section, jobDescription, allSections } = options;
  
  const sectionType = mapSectionTypeToInsightType(section.type, section.slug);
  const requirementGaps = detectRequirementGaps(section, jobDescription, allSections);
  const recommendedMoves = generateRecommendedMoves(section, requirementGaps, jobDescription);
  const nextAction = generateNextAction(requirementGaps);
  
  return {
    sectionSlug: section.slug,
    sectionType,
    sectionTitle: section.title,
    promptSummary: `Heuristic analysis: ${requirementGaps.length} gap(s) detected`,
    requirementGaps,
    recommendedMoves,
    nextAction,
  };
}

/**
 * Map CoverLetterDraftSection.type to SectionGapInsight.sectionType
 */
function mapSectionTypeToInsightType(
  sectionType: CoverLetterDraftSection['type'],
  slug: string
): SectionGapInsight['sectionType'] {
  // Try to infer from slug first
  const slugLower = slug.toLowerCase();
  if (slugLower.includes('intro') || slugLower.includes('opening')) {
    return 'introduction';
  }
  if (slugLower.includes('closing') || slugLower.includes('closer')) {
    return 'closing';
  }
  if (slugLower.includes('signature') || slugLower.includes('sign')) {
    return 'signature';
  }
  if (slugLower.includes('experience') || slugLower.includes('paragraph')) {
    return 'experience';
  }
  
  // Fallback to type
  if (sectionType === 'closing') return 'closing';
  if (sectionType === 'dynamic-story' || sectionType === 'dynamic-saved') return 'experience';
  
  // Default
  return 'custom';
}

/**
 * Detect requirement gaps using heuristic rules
 */
function detectRequirementGaps(
  section: CoverLetterDraftSection,
  jobDescription: ParsedJobDescription,
  allSections: CoverLetterDraftSection[]
): SectionGapInsight['requirementGaps'] {
  const gaps: SectionGapInsight['requirementGaps'] = [];
  
  // 1. Check for missing metrics (high priority for experience sections)
  if (section.type === 'dynamic-story' || section.type === 'dynamic-saved') {
    const hasMetrics = detectMetrics(section.content);
    if (!hasMetrics) {
      gaps.push({
        id: `${section.slug}-missing-metrics`,
        label: 'Missing quantified achievements',
        severity: 'medium',
        requirementType: 'narrative',
        rationale: 'Experience sections should include specific metrics (%, $, #) to demonstrate impact',
        recommendation: 'Add metrics like "increased sales by 25%" or "managed $2M budget"',
      });
    }
  }
  
  // 2. Check for generic language (all sections)
  const genericScore = detectGenericLanguage(section.content);
  if (genericScore > 0.6) { // High generic score
    gaps.push({
      id: `${section.slug}-generic-language`,
      label: 'Generic language detected',
      severity: 'low',
      requirementType: 'narrative',
      rationale: 'Section uses vague language without specific details',
      recommendation: 'Replace generic phrases with concrete examples and specific technologies/methods',
    });
  }
  
  // 3. Check for unmatched core requirements (medium priority)
  const unmatchedCoreReqs = findUnmatchedRequirements(
    section,
    jobDescription.standardRequirements,
    allSections
  );
  
  unmatchedCoreReqs.slice(0, 2).forEach(req => {
    gaps.push({
      id: req.id,
      label: req.label,
      severity: 'high',
      requirementType: 'core',
      rationale: `Core requirement "${req.label}" not addressed in this section`,
      recommendation: `Add specific example demonstrating ${req.label}`,
    });
  });
  
  // 4. Check for unmatched differentiator requirements (lower priority)
  const unmatchedDiffReqs = findUnmatchedRequirements(
    section,
    jobDescription.differentiatorRequirements,
    allSections
  );
  
  unmatchedDiffReqs.slice(0, 1).forEach(req => {
    gaps.push({
      id: req.id,
      label: req.label,
      severity: 'medium',
      requirementType: 'differentiator',
      rationale: `Differentiator "${req.label}" not highlighted in this section`,
      recommendation: `Consider mentioning ${req.label} to stand out from other candidates`,
    });
  });
  
  // 5. Check section length (too short or too long)
  const wordCount = section.metadata.wordCount || countWords(section.content);
  if (wordCount < 30 && section.type !== 'static') {
    gaps.push({
      id: `${section.slug}-too-short`,
      label: 'Section too brief',
      severity: 'low',
      requirementType: 'narrative',
      rationale: `Section has only ${wordCount} words; may lack sufficient detail`,
      recommendation: 'Expand with specific examples, metrics, or context',
    });
  } else if (wordCount > 150 && section.type !== 'static') {
    gaps.push({
      id: `${section.slug}-too-long`,
      label: 'Section may be too long',
      severity: 'low',
      requirementType: 'narrative',
      rationale: `Section has ${wordCount} words; may lose reader attention`,
      recommendation: 'Consider splitting into two paragraphs or condensing',
    });
  }
  
  return gaps;
}

/**
 * Detect if content contains quantified metrics
 */
function detectMetrics(content: string): boolean {
  // Look for common metric patterns
  const metricPatterns = [
    /\d+%/,                                    // Percentages: 25%
    /\$\d[\d,]*(\.\d+)?[KMB]?/,                // Currency: $100K, $1.5M
    /\d+[xX]/,                                 // Multipliers: 10x
    /\d+\s*(increase|decrease|improvement|growth|reduction)/i,  // Growth terms
    /\d+\s*(users|customers|clients|sales|revenue)/i,           // Count terms
  ];
  
  return metricPatterns.some(pattern => pattern.test(content));
}

/**
 * Detect generic language using heuristic scoring
 * Returns 0-1 score (higher = more generic)
 */
function detectGenericLanguage(content: string): number {
  const contentLower = content.toLowerCase();
  
  // Generic phrases that indicate weak content
  const genericPhrases = [
    'worked on',
    'contributed to',
    'helped with',
    'participated in',
    'was responsible for',
    'involved in',
    'assisted with',
    'supported',
  ];
  
  // Strong action verbs that indicate good content
  const strongVerbs = [
    'led',
    'built',
    'designed',
    'launched',
    'achieved',
    'delivered',
    'created',
    'implemented',
    'drove',
    'increased',
    'reduced',
    'optimized',
  ];
  
  let genericCount = 0;
  let strongCount = 0;
  
  genericPhrases.forEach(phrase => {
    if (contentLower.includes(phrase)) genericCount++;
  });
  
  strongVerbs.forEach(verb => {
    const regex = new RegExp(`\\b${verb}\\b`, 'i');
    if (regex.test(contentLower)) strongCount++;
  });
  
  // Score: more generic phrases and fewer strong verbs = higher score
  const baseScore = genericCount / genericPhrases.length;
  const strongBonus = strongCount / strongVerbs.length;
  
  return Math.max(0, Math.min(1, baseScore - strongBonus * 0.5));
}

/**
 * Find unmatched requirements that should be addressed in this section
 */
function findUnmatchedRequirements(
  section: CoverLetterDraftSection,
  requirements: ParsedJobDescription['standardRequirements'],
  allSections: CoverLetterDraftSection[]
): ParsedJobDescription['standardRequirements'] {
  // Get all matched requirement IDs across all sections
  const allMatchedIds = new Set(
    allSections.flatMap(s => s.metadata.requirementsMatched || [])
  );
  
  // Filter to unmatched requirements
  const unmatched = requirements.filter(req => !allMatchedIds.has(req.id));
  
  // For experience sections, check if requirement keywords are in content
  // Even if not formally "matched", we should flag if it's relevant
  if (section.type === 'dynamic-story' || section.type === 'dynamic-saved') {
    return unmatched.filter(req => {
      // If requirement keywords overlap with section content, it's relevant
      return isRequirementRelevantToSection(req, section);
    });
  }
  
  return unmatched;
}

/**
 * Check if a requirement is relevant to a section based on keyword overlap
 */
function isRequirementRelevantToSection(
  req: ParsedJobDescription['standardRequirements'][0],
  section: CoverLetterDraftSection
): boolean {
  const contentLower = section.content.toLowerCase();
  
  // Check if any requirement keywords appear in content
  const keywords = req.keywords || [req.label];
  const matchCount = keywords.filter(kw => {
    const kwLower = kw.toLowerCase();
    return contentLower.includes(kwLower);
  }).length;
  
  // Consider relevant if >30% of keywords match
  return matchCount / keywords.length > 0.3;
}

/**
 * Generate recommended moves based on detected gaps
 */
function generateRecommendedMoves(
  section: CoverLetterDraftSection,
  gaps: SectionGapInsight['requirementGaps'],
  jobDescription: ParsedJobDescription
): string[] {
  const moves: string[] = [];
  
  // Priority 1: Address high-severity gaps first
  const highSeverityGaps = gaps.filter(g => g.severity === 'high');
  if (highSeverityGaps.length > 0) {
    moves.push(`Address ${highSeverityGaps.length} core requirement(s): ${highSeverityGaps.map(g => g.label).join(', ')}`);
  }
  
  // Priority 2: Add metrics if missing
  const hasMetricGap = gaps.some(g => g.id.includes('missing-metrics'));
  if (hasMetricGap) {
    moves.push('Add quantified achievements (%, $, or specific numbers)');
  }
  
  // Priority 3: Reduce generic language
  const hasGenericGap = gaps.some(g => g.id.includes('generic-language'));
  if (hasGenericGap) {
    moves.push('Replace vague phrases with specific examples');
  }
  
  // Priority 4: Address differentiators
  const diffGaps = gaps.filter(g => g.requirementType === 'differentiator');
  if (diffGaps.length > 0) {
    moves.push(`Highlight differentiators: ${diffGaps.map(g => g.label).slice(0, 2).join(', ')}`);
  }
  
  return moves.length > 0 ? moves : ['Content looks good! Consider refreshing for detailed AI feedback.'];
}

/**
 * Generate next action prompt based on gaps
 */
function generateNextAction(gaps: SectionGapInsight['requirementGaps']): string | undefined {
  if (gaps.length === 0) {
    return undefined;
  }
  
  // Prioritize high-severity gaps
  const highSeverityGap = gaps.find(g => g.severity === 'high');
  if (highSeverityGap) {
    return `Click "Generate Content" to address: ${highSeverityGap.label}`;
  }
  
  // Otherwise, take first gap
  const firstGap = gaps[0];
  return `Click "Generate Content" to address: ${firstGap.label}`;
}

/**
 * Count words in a string (simple heuristic)
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

