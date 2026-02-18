/**
 * Evidence-based confidence calculation for PM Levels
 * 
 * Calculates confidence percentage based on:
 * - Competency score (0-3 scale)
 * - Evidence quantity (number of stories)
 * - Evidence quality (metrics, tags, level assessment)
 * - Criteria met status
 */

import type { EvidenceStory } from '@/types/content';

interface ConfidenceCalculationParams {
  competencyScore?: number; // 0-3 scale
  evidence?: EvidenceStory[];
  matchedTags?: string[];
  overallConfidence?: 'high' | 'medium' | 'low';
}

/**
 * Calculate evidence-based confidence percentage
 */
export function calculateEvidenceBasedConfidence({
  competencyScore,
  evidence = [],
  matchedTags = [],
  overallConfidence
}: ConfidenceCalculationParams): number {
  // Start with base confidence from competency score
  let baseConfidence: number;
  if (competencyScore !== undefined) {
    baseConfidence = Math.round((competencyScore / 3) * 100);
  } else {
    // Fallback to text-based confidence
    switch (overallConfidence) {
      case 'high': baseConfidence = 85; break;
      case 'medium': baseConfidence = 65; break;
      case 'low': baseConfidence = 45; break;
      default: baseConfidence = 50;
    }
  }

  // Criteria are met ONLY if BOTH score >= 2.5 AND evidence exists
  // Without evidence, criteria cannot be met regardless of score
  const hasEvidence = (evidence?.length || 0) > 0 || (matchedTags?.length || 0) > 0;
  const hasSufficientScore = competencyScore !== undefined && competencyScore >= 2.5;
  const criteriaMet = hasSufficientScore && hasEvidence;
  
  const evidenceCount = evidence?.length || 0;
  const tagCount = matchedTags?.length || 0;
  
  // Count stories with metrics (stronger evidence)
  const storiesWithMetrics = evidence?.filter(story => 
    story.outcomeMetrics && story.outcomeMetrics.length > 0
  ).length || 0;
  
  // Count stories meeting/exceeding level (quality indicator)
  const storiesMeetingOrExceeding = evidence?.filter(story => 
    story.levelAssessment === 'meets' || story.levelAssessment === 'exceeds'
  ).length || 0;

  // EVIDENCE-BASED ADJUSTMENTS
  
  // 1. Evidence quantity adjustments
  let evidenceAdjustment = 0;
  if (evidenceCount === 0) {
    evidenceAdjustment = -20; // Heavy penalty for no evidence
  } else if (evidenceCount === 1) {
    evidenceAdjustment = -10; // Penalty for minimal evidence
  } else if (evidenceCount >= 5) {
    evidenceAdjustment = +5; // Bonus for substantial evidence
  } else if (evidenceCount >= 3) {
    evidenceAdjustment = +2; // Small bonus for moderate evidence
  }

  // 2. Tag relevance adjustments (more relevant tags = stronger evidence)
  let tagAdjustment = 0;
  if (tagCount === 0) {
    tagAdjustment = -5; // Penalty for no matched tags
  } else if (tagCount >= 5) {
    tagAdjustment = +5; // Bonus for many relevant tags
  } else if (tagCount >= 3) {
    tagAdjustment = +2; // Small bonus for moderate tags
  }

  // 3. Metrics quality adjustments (stories with metrics = stronger evidence)
  let metricsAdjustment = 0;
  const metricsRatio = evidenceCount > 0 ? storiesWithMetrics / evidenceCount : 0;
  if (metricsRatio >= 0.8) {
    metricsAdjustment = +8; // Strong bonus if most stories have metrics
  } else if (metricsRatio >= 0.5) {
    metricsAdjustment = +4; // Moderate bonus if half have metrics
  } else if (metricsRatio === 0 && evidenceCount > 0) {
    metricsAdjustment = -5; // Penalty if no stories have metrics
  }

  // 4. Story quality adjustments (stories meeting/exceeding level = quality indicator)
  let qualityAdjustment = 0;
  const qualityRatio = evidenceCount > 0 ? storiesMeetingOrExceeding / evidenceCount : 0;
  if (qualityRatio >= 0.8) {
    qualityAdjustment = +5; // Bonus if most stories meet/exceed level
  } else if (qualityRatio >= 0.5) {
    qualityAdjustment = +2; // Small bonus if half meet/exceed
  } else if (qualityRatio === 0 && evidenceCount > 0) {
    qualityAdjustment = -5; // Penalty if no stories meet level
  }

  // 5. Criteria met status (primary factor)
  // If criteria NOT met, apply additional penalty based on evidence quality
  if (!criteriaMet) {
    // If we have good evidence but still don't meet criteria, reduce confidence more
    if (evidenceCount >= 3 && storiesWithMetrics >= 2) {
      // Good evidence but criteria not met = significant uncertainty
      baseConfidence = Math.min(baseConfidence, 55);
    } else if (evidenceCount === 0 && tagCount === 0) {
      // No evidence AND no tags AND criteria not met = very low confidence
      // Cap at 25% maximum (will be further reduced by adjustments)
      baseConfidence = Math.min(baseConfidence, 25);
    } else if (evidenceCount === 0) {
      // No evidence but has tags = still very low confidence
      baseConfidence = Math.min(baseConfidence, 30);
    } else {
      // Some evidence but criteria not met = moderate penalty
      baseConfidence = Math.min(baseConfidence, 50);
    }
  } else {
    // Criteria met: evidence quality can boost confidence
    // Already at good base, evidence adjustments will add to it
  }

  // Apply all adjustments
  let finalConfidence = baseConfidence + evidenceAdjustment + tagAdjustment + metricsAdjustment + qualityAdjustment;

  // CAP CONFIDENCE BASED ON EVIDENCE QUANTITY
  // With minimal evidence, cap confidence regardless of quality
  if (evidenceCount === 0) {
    // No evidence: cap at 30% maximum
    finalConfidence = Math.min(finalConfidence, 30);
  } else if (evidenceCount === 1) {
    // Single story: cap at 70% maximum (even if perfect quality)
    finalConfidence = Math.min(finalConfidence, 70);
  } else if (evidenceCount === 2) {
    // Two stories: cap at 85% maximum
    finalConfidence = Math.min(finalConfidence, 85);
  }
  // 3+ stories: no cap (can reach 100% with strong evidence)

  // Preserve low-but-nonzero confidence when model sees signal but evidence is sparse.
  if (evidenceCount === 0 && tagCount === 0 && competencyScore !== undefined && competencyScore > 0) {
    const sparseEvidenceFloor =
      competencyScore >= 2.5 ? 20 :
      competencyScore >= 1.5 ? 15 :
      10;
    finalConfidence = Math.max(finalConfidence, sparseEvidenceFloor);
  }

  // Clamp between 0 and 100
  finalConfidence = Math.max(0, Math.min(100, finalConfidence));

  return Math.round(finalConfidence);
}
