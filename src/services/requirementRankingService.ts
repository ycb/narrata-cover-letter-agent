/**
 * Requirement Ranking Service
 * 
 * Intelligently ranks job requirements based on:
 * 1. Keywords indicating importance ("must", "required", "essential", etc.)
 * 2. Repetition (mentioned multiple times)
 * 3. Position in list (earlier = higher priority)
 * 4. Uniqueness (what makes this JD different from standard role)
 */

import type { RequirementInsight } from '@/types/coverLetters';

export interface RequirementRankingFactors {
  keywordScore: number; // 0-100: Based on "must", "required", "essential", etc.
  positionScore: number; // 0-100: Earlier in list = higher score
  repetitionScore: number; // 0-100: Mentioned multiple times = higher score
  uniquenessScore: number; // 0-100: How different from standard role requirements
  totalScore: number; // Weighted sum of all factors
}

export interface RankedRequirement extends RequirementInsight {
  ranking: RequirementRankingFactors;
  rank: number; // 1-based rank (1 = highest priority)
}

// Keywords that indicate high priority (ordered by strength)
const CRITICAL_KEYWORDS = ['must', 'required', 'essential', 'critical', 'mandatory', 'non-negotiable'];
const HIGH_KEYWORDS = ['need', 'expect', 'should have', 'important', 'key', 'primary'];
const MEDIUM_KEYWORDS = ['preferred', 'nice to have', 'bonus', 'plus', 'ideal', 'strong preference'];
const LOW_KEYWORDS = ['optional', 'would be great', 'helpful'];

// Standard/common requirements that appear in most JDs for the same role
const STANDARD_REQUIREMENTS_PATTERNS = [
  /bachelor'?s degree/i,
  /years? of experience/i,
  /strong communication/i,
  /cross-functional/i,
  /team player/i,
  /problem solving/i,
  /analytical/i,
  /detail.?oriented/i,
];

/**
 * Calculate keyword-based priority score
 */
function calculateKeywordScore(text: string): number {
  const lowerText = text.toLowerCase();
  
  // Check for critical keywords
  for (const keyword of CRITICAL_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return 100; // Maximum score
    }
  }
  
  // Check for high priority keywords
  for (const keyword of HIGH_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return 80;
    }
  }
  
  // Check for medium priority keywords
  for (const keyword of MEDIUM_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return 50;
    }
  }
  
  // Check for low priority keywords
  for (const keyword of LOW_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return 20;
    }
  }
  
  // Default: assume medium priority if no keywords found
  return 60;
}

/**
 * Calculate position-based score (earlier = slightly higher)
 * Conservative scoring - position is a weak signal that only provides small boost
 */
function calculatePositionScore(index: number, total: number): number {
  if (total === 0) return 50;
  
  // First item gets small boost (60), last item gets small penalty (40)
  // Much narrower range - position is a weak signal
  const positionRatio = index / (total - 1);
  return 60 - (positionRatio * 20); // Range: 60 (first) to 40 (last)
}

/**
 * Calculate repetition score based on how many times requirement appears
 */
function calculateRepetitionScore(
  requirement: RequirementInsight,
  allRequirements: RequirementInsight[]
): number {
  const requirementText = (requirement.detail || requirement.label).toLowerCase();
  let count = 0;
  
  // Count how many other requirements mention similar concepts
  for (const other of allRequirements) {
    if (other.id === requirement.id) continue;
    
    const otherText = (other.detail || other.label).toLowerCase();
    
    // Simple keyword overlap check
    const requirementWords = requirementText.split(/\s+/).filter(w => w.length > 3);
    const otherWords = otherText.split(/\s+/).filter(w => w.length > 3);
    const overlap = requirementWords.filter(w => otherWords.includes(w));
    
    // If significant overlap, count as repetition
    if (overlap.length >= 2) {
      count++;
    }
  }
  
  // More repetitions = higher score (up to 100)
  return Math.min(100, 50 + (count * 15));
}

/**
 * Calculate uniqueness score (how different from standard role requirements)
 */
function calculateUniquenessScore(
  requirement: RequirementInsight,
  role: string
): number {
  const requirementText = (requirement.detail || requirement.label).toLowerCase();
  
  // Check if requirement matches standard patterns
  let matchesStandard = false;
  for (const pattern of STANDARD_REQUIREMENTS_PATTERNS) {
    if (pattern.test(requirementText)) {
      matchesStandard = true;
      break;
    }
  }
  
  // If it matches standard patterns, lower uniqueness score
  if (matchesStandard) {
    return 30;
  }
  
  // Check for domain-specific terms (higher uniqueness)
  const domainTerms = [
    'ai', 'ml', 'machine learning', 'artificial intelligence',
    'legal tech', 'fintech', 'healthcare', 'saas', 'b2b', 'b2c',
    'startup', 'scale', 'growth', 'enterprise',
    'compliance', 'regulatory', 'security', 'privacy',
    'api', 'platform', 'marketplace', 'ecosystem',
  ];
  
  for (const term of domainTerms) {
    if (requirementText.includes(term)) {
      return 80; // Domain-specific = more unique
    }
  }
  
  // Check for specific technologies/tools (very unique)
  const techTerms = [
    'python', 'sql', 'javascript', 'react', 'aws', 'gcp', 'azure',
    'kubernetes', 'docker', 'terraform', 'databricks', 'snowflake',
    'tableau', 'looker', 'amplitude', 'mixpanel', 'segment',
  ];
  
  for (const term of techTerms) {
    if (requirementText.includes(term)) {
      return 90; // Specific tech = very unique
    }
  }
  
  // Default: medium uniqueness
  return 50;
}

/**
 * Rank requirements intelligently
 */
export function rankRequirements(
  requirements: RequirementInsight[],
  role: string = 'Product Manager'
): RankedRequirement[] {
  if (requirements.length === 0) return [];
  
  // Calculate ranking factors for each requirement
  const ranked: RankedRequirement[] = requirements.map((req, index) => {
    const keywordScore = calculateKeywordScore(req.detail || req.label);
    const positionScore = calculatePositionScore(index, requirements.length);
    const repetitionScore = calculateRepetitionScore(req, requirements);
    const uniquenessScore = calculateUniquenessScore(req, role);
    
    // Weighted total score
    // Keyword: 50%, Position: 10%, Repetition: 20%, Uniqueness: 20%
    // Position is a weak signal - only provides small boost/penalty
    const totalScore = (
      keywordScore * 0.5 +
      positionScore * 0.1 +
      repetitionScore * 0.2 +
      uniquenessScore * 0.2
    );
    
    return {
      ...req,
      ranking: {
        keywordScore,
        positionScore,
        repetitionScore,
        uniquenessScore,
        totalScore,
      },
      rank: 0, // Will be set after sorting
    };
  });
  
  // Sort by total score (descending)
  ranked.sort((a, b) => b.ranking.totalScore - a.ranking.totalScore);
  
  // Assign ranks
  ranked.forEach((req, index) => {
    req.rank = index + 1;
  });
  
  return ranked;
}

/**
 * Update requirement priority based on ranking
 */
export function updatePriorityFromRanking(
  requirement: RankedRequirement
): RequirementInsight['priority'] {
  const score = requirement.ranking.totalScore;
  
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'medium';
  if (score >= 30) return 'low';
  return 'optional';
}

/**
 * Identify differentiator requirements (most unique/high-priority)
 */
export function identifyDifferentiators(
  rankedRequirements: RankedRequirement[],
  topN: number = 3
): RankedRequirement[] {
  // Sort by uniqueness score first, then total score
  const sorted = [...rankedRequirements].sort((a, b) => {
    const uniquenessDiff = b.ranking.uniquenessScore - a.ranking.uniquenessScore;
    if (Math.abs(uniquenessDiff) > 10) {
      return uniquenessDiff;
    }
    return b.ranking.totalScore - a.ranking.totalScore;
  });
  
  return sorted.slice(0, topN);
}

