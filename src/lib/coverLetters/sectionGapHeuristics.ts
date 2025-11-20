/**
 * Section Gap Heuristics Engine
 * 
 * Deterministic fallback for evaluating cover letter section quality
 * when LLM analysis is unavailable or too slow. Uses regex and NLP-lite
 * checks to identify missing elements in introduction, experience, and closing sections.
 */

import type { SectionGapInsight } from '@/types/coverLetters';
import type { ParsedJobDescription } from '@/types/coverLetters';

// ============================================================================
// Types
// ============================================================================

export interface SectionInput {
  slug: string;
  type: 'introduction' | 'experience' | 'closing' | 'signature' | 'custom';
  title?: string;
  content: string;
}

export interface JobDescriptionInput {
  summary: string;
  company?: string;
  role?: string;
  keywords?: string[];
  standardRequirements?: Array<{ label: string; keywords: string[] }>;
  preferredRequirements?: Array<{ label: string; keywords: string[] }>;
  differentiatorRequirements?: Array<{ label: string; keywords: string[] }>;
}

// ============================================================================
// Pattern Definitions
// ============================================================================

const PATTERNS = {
  // Metrics patterns
  percentage: /\d+(?:\.\d+)?%/,
  dollarAmount: /\$[\d,]+(?:\.\d{2})?[KMB]?/i,
  numberWithMetric: /\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:users?|customers?|clients?|projects?|teams?|members?|hours?|days?|weeks?|months?|years?|x|times?|more|less|increase|decrease|growth|reduction))/i,
  explicitNumber: /\b\d+(?:,\d{3})*\b/,
  
  // Seniority markers
  seniorityMarkers: /\b(led|lead|director|principal|head of|senior|managed|oversaw|drove|architected|established|founded|initiated|pioneered)\b/i,
  
  // Company/mission keywords
  missionKeywords: /\b(mission|vision|values?|culture|purpose|goal|impact|contribute|align|resonate|excited about|drawn to|passionate about|admire)\b/i,
  
  // Tools and processes
  toolsProcesses: /\b(SQL|Python|JavaScript|TypeScript|React|Vue|Angular|Figma|Jira|Asana|Tableau|Excel|A\/B test(?:ing)?|experimentation|roadmap|sprint|agile|scrum|analytics|data|metrics|API|cloud|AWS|GCP|Azure)\b/i,
  
  // Collaboration verbs
  collaborationVerbs: /\b(collaborated|partnered|worked with|coordinated|facilitated|aligned|engaged|communicated|presented|influenced|cross-functional|stakeholder|team)\b/i,
  
  // Enthusiasm markers
  enthusiasmMarkers: /\b(excited|thrilled|eager|enthusiastic|look forward|passion(?:ate)?|motivated|inspired|delighted|would love)\b/i,
  
  // Call-to-action
  ctaMarkers: /\b(discuss|talk|speak|conversation|interview|meet|connect|reach out|follow up|next steps?|opportunity|available|schedule)\b/i,
  
  // Sign-off patterns
  signoffPatterns: /\b(sincerely|regards|best|thank you|thanks|respectfully|yours?)\b/i,
  
  // Action verbs (strong)
  strongActionVerbs: /\b(achieved|delivered|implemented|built|created|designed|launched|increased|reduced|improved|optimized|streamlined|transformed|scaled|pioneered|drove|led|managed|executed)\b/i,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Count pattern matches in text
 */
function countMatches(text: string, pattern: RegExp): number {
  const globalPattern = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
  const matches = text.match(globalPattern);
  return matches ? matches.length : 0;
}

/**
 * Check if text contains any of the given keywords (case-insensitive)
 */
function containsKeywords(text: string, keywords: string[]): boolean {
  if (!keywords.length) return false;
  const lowerText = text.toLowerCase();
  return keywords.some(kw => lowerText.includes(kw.toLowerCase()));
}

/**
 * Extract all requirement keywords from job description
 */
function extractAllKeywords(jd: JobDescriptionInput): string[] {
  const allKeywords = new Set<string>();
  
  // Add explicit keywords
  jd.keywords?.forEach(kw => allKeywords.add(kw));
  
  // Add requirement keywords
  const requirementLists = [
    jd.standardRequirements || [],
    jd.preferredRequirements || [],
    jd.differentiatorRequirements || [],
  ];
  
  requirementLists.forEach(reqList => {
    reqList.forEach(req => {
      req.keywords?.forEach(kw => allKeywords.add(kw));
    });
  });
  
  return Array.from(allKeywords);
}

/**
 * Generate a unique gap ID
 */
function generateGapId(sectionSlug: string, gapType: string): string {
  return `${sectionSlug}-${gapType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Section-Specific Evaluators
// ============================================================================

/**
 * Evaluate introduction section
 * Requirements:
 * - At least one quantified metric
 * - Company/mission keyword
 * - Seniority marker
 */
function evaluateIntroduction(
  section: SectionInput,
  jd: JobDescriptionInput
): SectionGapInsight['requirementGaps'] {
  const gaps: SectionGapInsight['requirementGaps'] = [];
  const content = section.content;
  
  // Check for metrics
  const hasPercentage = PATTERNS.percentage.test(content);
  const hasDollar = PATTERNS.dollarAmount.test(content);
  const hasNumberMetric = PATTERNS.numberWithMetric.test(content);
  const hasExplicitNumber = PATTERNS.explicitNumber.test(content);
  
  const hasAnyMetric = hasPercentage || hasDollar || hasNumberMetric || hasExplicitNumber;
  
  if (!hasAnyMetric) {
    gaps.push({
      id: generateGapId(section.slug, 'intro-metrics'),
      label: 'Missing quantified impact',
      severity: 'high',
      requirementType: 'core',
      rationale: 'Introduction lacks specific metrics (percentages, dollar amounts, or quantified achievements) to establish credibility.',
      recommendation: 'Add at least one concrete metric from your experience (e.g., "increased revenue by 25%", "led team of 12", "$2M budget").',
    });
  }
  
  // Check for company/mission alignment
  const hasMissionKeyword = PATTERNS.missionKeywords.test(content);
  const mentionsCompany = jd.company && content.toLowerCase().includes(jd.company.toLowerCase());
  
  if (!hasMissionKeyword && !mentionsCompany) {
    gaps.push({
      id: generateGapId(section.slug, 'intro-mission'),
      label: 'Missing company/mission alignment',
      severity: 'medium',
      requirementType: 'preferred',
      rationale: 'Introduction doesn\'t demonstrate understanding of or alignment with company mission, values, or culture.',
      recommendation: `Reference ${jd.company || 'the company'}\'s mission or explain why you're drawn to their work.`,
    });
  }
  
  // Check for seniority markers
  const hasSeniorityMarker = PATTERNS.seniorityMarkers.test(content);
  
  if (!hasSeniorityMarker) {
    gaps.push({
      id: generateGapId(section.slug, 'intro-seniority'),
      label: 'Missing leadership/seniority indicators',
      severity: 'medium',
      requirementType: 'preferred',
      rationale: 'Introduction lacks strong action verbs that establish seniority level (led, managed, architected, etc.).',
      recommendation: 'Include verbs that demonstrate your level: "led", "architected", "drove", "managed", "established".',
    });
  }
  
  return gaps;
}

/**
 * Evaluate experience section
 * Requirements:
 * - Quantified metric
 * - Explicit tool/process keywords
 * - Collaboration verb
 */
function evaluateExperience(
  section: SectionInput,
  jd: JobDescriptionInput
): SectionGapInsight['requirementGaps'] {
  const gaps: SectionGapInsight['requirementGaps'] = [];
  const content = section.content;
  
  // Check for metrics
  const metricCount = 
    countMatches(content, PATTERNS.percentage) +
    countMatches(content, PATTERNS.dollarAmount) +
    countMatches(content, PATTERNS.numberWithMetric);
  
  if (metricCount === 0) {
    gaps.push({
      id: generateGapId(section.slug, 'exp-metrics'),
      label: 'No quantified results',
      severity: 'high',
      requirementType: 'core',
      rationale: 'Experience section must include specific, measurable outcomes to demonstrate impact.',
      recommendation: 'Add metrics showing impact: growth percentages, revenue figures, time saved, scale of projects, team size, etc.',
    });
  }
  
  // Check for tool/process keywords from JD
  const jdKeywords = extractAllKeywords(jd);
  const hasToolProcess = PATTERNS.toolsProcesses.test(content) || containsKeywords(content, jdKeywords);
  
  if (!hasToolProcess) {
    gaps.push({
      id: generateGapId(section.slug, 'exp-tools'),
      label: 'Missing relevant tools/processes',
      severity: 'high',
      requirementType: 'core',
      rationale: `Experience doesn't mention key tools, technologies, or processes relevant to the role.`,
      recommendation: `Include specific tools or methodologies mentioned in the job description${jdKeywords.length > 0 ? ` (e.g., ${jdKeywords.slice(0, 3).join(', ')})` : ''}.`,
    });
  }
  
  // Check for collaboration verbs
  const hasCollaboration = PATTERNS.collaborationVerbs.test(content);
  
  if (!hasCollaboration) {
    gaps.push({
      id: generateGapId(section.slug, 'exp-collaboration'),
      label: 'No collaboration indicators',
      severity: 'medium',
      requirementType: 'preferred',
      rationale: 'Experience doesn\'t demonstrate cross-functional collaboration or stakeholder engagement.',
      recommendation: 'Add phrases showing teamwork: "collaborated with", "partnered with engineers", "aligned stakeholders", etc.',
    });
  }
  
  // Check for strong action verbs
  const strongVerbCount = countMatches(content, PATTERNS.strongActionVerbs);
  
  if (strongVerbCount < 2) {
    gaps.push({
      id: generateGapId(section.slug, 'exp-action-verbs'),
      label: 'Weak action verbs',
      severity: 'low',
      requirementType: 'narrative',
      rationale: 'Experience section uses few strong action verbs, making impact less compelling.',
      recommendation: 'Start sentences with powerful verbs: achieved, delivered, launched, transformed, optimized, etc.',
    });
  }
  
  return gaps;
}

/**
 * Evaluate closing section
 * Requirements:
 * - Enthusiasm marker
 * - Call-to-action
 * - Proper sign-off
 */
function evaluateClosing(
  section: SectionInput,
  jd: JobDescriptionInput
): SectionGapInsight['requirementGaps'] {
  const gaps: SectionGapInsight['requirementGaps'] = [];
  const content = section.content;
  
  // Check for enthusiasm
  const hasEnthusiasm = PATTERNS.enthusiasmMarkers.test(content);
  
  if (!hasEnthusiasm) {
    gaps.push({
      id: generateGapId(section.slug, 'closing-enthusiasm'),
      label: 'Missing enthusiasm',
      severity: 'medium',
      requirementType: 'narrative',
      rationale: 'Closing lacks enthusiastic language that conveys genuine interest in the role.',
      recommendation: 'Express excitement: "I\'m excited about", "I look forward to", "I\'m eager to contribute", etc.',
    });
  }
  
  // Check for call-to-action
  const hasCTA = PATTERNS.ctaMarkers.test(content);
  
  if (!hasCTA) {
    gaps.push({
      id: generateGapId(section.slug, 'closing-cta'),
      label: 'No call-to-action',
      severity: 'high',
      requirementType: 'core',
      rationale: 'Closing must include a clear call-to-action that invites next steps.',
      recommendation: 'Add a CTA: "I\'d love to discuss", "I\'m available to talk", "Let\'s schedule a conversation", etc.',
    });
  }
  
  // Check for sign-off
  const hasSignoff = PATTERNS.signoffPatterns.test(content);
  
  if (!hasSignoff) {
    gaps.push({
      id: generateGapId(section.slug, 'closing-signoff'),
      label: 'Missing professional sign-off',
      severity: 'low',
      requirementType: 'narrative',
      rationale: 'Closing lacks a professional sign-off phrase.',
      recommendation: 'End with: "Best regards", "Sincerely", "Thank you for your consideration", etc.',
    });
  }
  
  return gaps;
}

/**
 * Evaluate signature section (minimal checks)
 */
function evaluateSignature(
  section: SectionInput,
  _jd: JobDescriptionInput
): SectionGapInsight['requirementGaps'] {
  const gaps: SectionGapInsight['requirementGaps'] = [];
  const content = section.content.trim();
  
  // Just check that it's not empty
  if (!content) {
    gaps.push({
      id: generateGapId(section.slug, 'signature-empty'),
      label: 'Empty signature',
      severity: 'low',
      requirementType: 'narrative',
      rationale: 'Signature section is empty.',
      recommendation: 'Add your name and optional contact information.',
    });
  }
  
  return gaps;
}

// ============================================================================
// Main Evaluation Function
// ============================================================================

/**
 * Evaluate a single section for gaps using deterministic heuristics
 * 
 * @param section - The section to evaluate
 * @param jobDescription - The job description context
 * @returns SectionGapInsight with identified gaps and recommendations
 */
export function evaluateSectionGap(
  section: SectionInput,
  jobDescription: JobDescriptionInput | ParsedJobDescription
): SectionGapInsight {
  // Normalize JD input
  const jdInput: JobDescriptionInput = {
    summary: jobDescription.summary || '',
    company: 'company' in jobDescription ? jobDescription.company : undefined,
    role: 'role' in jobDescription ? jobDescription.role : undefined,
    keywords: jobDescription.keywords || [],
    standardRequirements: jobDescription.standardRequirements || [],
    preferredRequirements: jobDescription.preferredRequirements || [],
    differentiatorRequirements: jobDescription.differentiatorRequirements || [],
  };
  
  // Evaluate based on section type
  let gaps: SectionGapInsight['requirementGaps'] = [];
  
  switch (section.type) {
    case 'introduction':
      gaps = evaluateIntroduction(section, jdInput);
      break;
    case 'experience':
      gaps = evaluateExperience(section, jdInput);
      break;
    case 'closing':
      gaps = evaluateClosing(section, jdInput);
      break;
    case 'signature':
      gaps = evaluateSignature(section, jdInput);
      break;
    case 'custom':
      // For custom sections, apply general experience-like checks
      gaps = evaluateExperience(section, jdInput);
      break;
    default:
      gaps = [];
  }
  
  // Generate recommended moves based on gaps
  const recommendedMoves: string[] = [];
  
  gaps.forEach(gap => {
    if (gap.severity === 'high') {
      recommendedMoves.push(gap.recommendation);
    }
  });
  
  // Determine next action
  let nextAction: string | undefined;
  
  if (gaps.length === 0) {
    nextAction = `${section.type} section looks solid! Consider getting LLM feedback for deeper insights.`;
  } else {
    const highSeverityGaps = gaps.filter(g => g.severity === 'high');
    if (highSeverityGaps.length > 0) {
      nextAction = `Address ${highSeverityGaps.length} high-priority gap${highSeverityGaps.length > 1 ? 's' : ''} first.`;
    } else {
      nextAction = 'Address medium and low priority gaps to polish this section.';
    }
  }
  
  return {
    sectionSlug: section.slug,
    sectionType: section.type,
    sectionTitle: section.title,
    promptSummary: `Heuristic analysis found ${gaps.length} potential gap${gaps.length !== 1 ? 's' : ''} in ${section.type} section.`,
    requirementGaps: gaps,
    recommendedMoves,
    nextAction,
  };
}

/**
 * Batch evaluate all sections
 * 
 * @param sections - Array of sections to evaluate
 * @param jobDescription - The job description context
 * @returns Array of SectionGapInsight, one per section
 */
export function evaluateAllSections(
  sections: SectionInput[],
  jobDescription: JobDescriptionInput | ParsedJobDescription
): SectionGapInsight[] {
  return sections.map(section => evaluateSectionGap(section, jobDescription));
}

/**
 * Get gap summary statistics
 */
export function getGapSummary(insights: SectionGapInsight[]): {
  totalGaps: number;
  highSeverity: number;
  mediumSeverity: number;
  lowSeverity: number;
  sectionsWithGaps: number;
} {
  const totalGaps = insights.reduce((sum, insight) => sum + insight.requirementGaps.length, 0);
  const highSeverity = insights.reduce((sum, insight) => 
    sum + insight.requirementGaps.filter(g => g.severity === 'high').length, 0
  );
  const mediumSeverity = insights.reduce((sum, insight) => 
    sum + insight.requirementGaps.filter(g => g.severity === 'medium').length, 0
  );
  const lowSeverity = insights.reduce((sum, insight) => 
    sum + insight.requirementGaps.filter(g => g.severity === 'low').length, 0
  );
  const sectionsWithGaps = insights.filter(insight => insight.requirementGaps.length > 0).length;
  
  return {
    totalGaps,
    highSeverity,
    mediumSeverity,
    lowSeverity,
    sectionsWithGaps,
  };
}

