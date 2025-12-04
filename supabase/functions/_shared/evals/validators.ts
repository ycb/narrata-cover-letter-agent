/**
 * Evals V1.1: Structural Validators
 * 
 * Deterministic validation rules for pipeline results.
 * NO LLM calls — pure TypeScript logic checking result structure and values.
 * 
 * Used after pipeline completes to assess structural quality.
 */

import type {
  EvalCheck,
  StructuralEvalResult,
  SEVERITY_WEIGHTS,
} from './types.ts';

// Import severity weights
const SEVERITY_WEIGHTS_LOCAL: typeof SEVERITY_WEIGHTS = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

// ============================================================================
// COVER LETTER VALIDATORS
// ============================================================================

/**
 * Validates cover letter pipeline result structure and content.
 * 
 * Checks 8 aspects across all stages:
 * - 4 critical: Role insights, core requirements, requirement analysis, MWS score
 * - 2 high: Company context, section gaps
 * - 2 medium: Total requirements count, goal alignment
 * 
 * @param result - Complete cover letter pipeline result
 * @returns Structural evaluation result with pass/fail and detailed checks
 */
// deno-lint-ignore no-explicit-any
export function validateCoverLetterResult(result: any): StructuralEvalResult {
  const checks: EvalCheck[] = [];

  // -------------------------------------------------------------------------
  // CRITICAL CHECKS (must pass for overall success)
  // -------------------------------------------------------------------------

  // Check 1: Role Insights Present (from jdAnalysis stage)
  const hasRoleInsights = result?.roleInsights?.inferredRoleLevel != null;
  checks.push({
    name: 'Role Insights Present',
    passed: hasRoleInsights,
    severity: 'critical',
    expected: 'roleInsights.inferredRoleLevel should exist',
    actual: hasRoleInsights ? 'present' : 'missing',
  });

  // Check 2: Core Requirements Extracted (from jdAnalysis stage)
  const coreTotal = result?.jdRequirementSummary?.coreTotal ?? 0;
  const hasCoreReqs = coreTotal >= 1;
  checks.push({
    name: 'Core Requirements Extracted',
    passed: hasCoreReqs,
    severity: 'critical',
    expected: 'jdRequirementSummary.coreTotal >= 1',
    actual: `${coreTotal}`,
  });

  // Check 3: Requirement Analysis Complete (from requirementAnalysis stage)
  const coreReqsArray = result?.requirements?.coreRequirements ?? [];
  const hasReqAnalysis = Array.isArray(coreReqsArray) && coreReqsArray.length >= 1;
  checks.push({
    name: 'Requirement Analysis Complete',
    passed: hasReqAnalysis,
    severity: 'critical',
    expected: 'requirements.coreRequirements.length >= 1',
    actual: `${coreReqsArray.length} requirements`,
  });

  // Check 4: MWS Score Valid (from goalsAndStrengths stage)
  const mwsScore = result?.mws?.summaryScore;
  const validMwsScore = typeof mwsScore === 'number' && mwsScore >= 0 && mwsScore <= 3;
  checks.push({
    name: 'MWS Score Valid',
    passed: validMwsScore,
    severity: 'critical',
    expected: 'mws.summaryScore in [0,1,2,3]',
    actual: validMwsScore ? `${mwsScore}` : 'invalid or missing',
  });

  // -------------------------------------------------------------------------
  // HIGH CHECKS (should pass, flagged if fails)
  // -------------------------------------------------------------------------

  // Check 5: Company Context Present (from goalsAndStrengths stage)
  const hasCompanyContext = result?.companyContext?.industry != null;
  checks.push({
    name: 'Company Context Present',
    passed: hasCompanyContext,
    severity: 'high',
    expected: 'companyContext.industry should exist',
    actual: hasCompanyContext ? 'present' : 'missing',
  });

  // Check 6: Section Gaps Identified (from sectionGaps stage)
  const gapCount = result?.gapCount ?? -1;
  const hasGapCount = gapCount >= 0;
  checks.push({
    name: 'Section Gaps Identified',
    passed: hasGapCount,
    severity: 'high',
    expected: 'gapCount >= 0',
    actual: hasGapCount ? `${gapCount} gaps` : 'missing',
  });

  // -------------------------------------------------------------------------
  // MEDIUM CHECKS (nice-to-have)
  // -------------------------------------------------------------------------

  // Check 7: Total Requirements Count (from requirementAnalysis stage)
  const totalReqs = result?.requirements?.totalRequirements ?? 0;
  const hasTotalReqs = totalReqs >= 3;
  checks.push({
    name: 'Total Requirements Count',
    passed: hasTotalReqs,
    severity: 'medium',
    expected: 'totalRequirements >= 3',
    actual: `${totalReqs}`,
  });

  // Check 8: Goal Alignment Present (from goalsAndStrengths stage)
  const hasGoalAlignment = result?.mws?.goalAlignment != null;
  checks.push({
    name: 'Goal Alignment Present',
    passed: hasGoalAlignment,
    severity: 'medium',
    expected: 'mws.goalAlignment should exist',
    actual: hasGoalAlignment ? 'present' : 'missing',
  });

  // -------------------------------------------------------------------------
  // OVERALL PASS/FAIL
  // -------------------------------------------------------------------------

  // Overall passes only if ALL critical checks pass
  const criticalChecks = checks.filter(c => c.severity === 'critical');
  const allCriticalPass = criticalChecks.every(c => c.passed);

  return {
    passed: allCriticalPass,
    checks,
  };
}

// ============================================================================
// PM LEVELS VALIDATORS
// ============================================================================

/**
 * Validates PM levels pipeline result structure and content.
 * 
 * Checks 5 aspects across all stages:
 * - 3 critical: IC level valid, 4 competencies present, competency values in range
 * - 1 high: Assessment ID generated
 * - 1 medium: Specializations array present
 * 
 * @param result - Complete PM levels pipeline result
 * @returns Structural evaluation result with pass/fail and detailed checks
 */
// deno-lint-ignore no-explicit-any
export function validatePMLevelsResult(result: any): StructuralEvalResult {
  const checks: EvalCheck[] = [];

  // -------------------------------------------------------------------------
  // CRITICAL CHECKS (must pass for overall success)
  // -------------------------------------------------------------------------

  // Check 1: IC Level Valid (from baselineAssessment stage)
  const icLevel = result?.icLevel;
  const validIcLevel = typeof icLevel === 'number' && icLevel >= 3 && icLevel <= 9;
  checks.push({
    name: 'IC Level Valid',
    passed: validIcLevel,
    severity: 'critical',
    expected: 'icLevel in [3-9]',
    actual: validIcLevel ? `IC${icLevel}` : 'invalid or missing',
  });

  // Check 2: Four Competencies Present (from competencyBreakdown stage)
  const competencies = result?.competencies ?? {};
  const competencyKeys = [
    'executionDelivery',
    'leadershipInfluence',
    'productStrategy',
    'technicalDepth',
  ];
  const hasFourCompetencies = competencyKeys.every(key => key in competencies);
  checks.push({
    name: 'Four Competencies Present',
    passed: hasFourCompetencies,
    severity: 'critical',
    expected: 'All 4 competencies: executionDelivery, leadershipInfluence, productStrategy, technicalDepth',
    actual: hasFourCompetencies
      ? 'all present'
      : `missing: ${competencyKeys.filter(k => !(k in competencies)).join(', ')}`,
  });

  // Check 3: Competency Values in Range (from competencyBreakdown stage)
  const competencyValues = Object.values(competencies);
  const allInRange = competencyValues.every(
    val => typeof val === 'number' && val >= 0 && val <= 10
  );
  checks.push({
    name: 'Competency Values in Range',
    passed: allInRange,
    severity: 'critical',
    expected: 'All competency values in [0-10]',
    actual: allInRange
      ? 'all in range'
      : `invalid values: ${competencyValues.filter(v => typeof v !== 'number' || v < 0 || v > 10).join(', ')}`,
  });

  // -------------------------------------------------------------------------
  // HIGH CHECKS (should pass, flagged if fails)
  // -------------------------------------------------------------------------

  // Check 4: Assessment ID Generated (from baselineAssessment stage)
  const assessmentId = result?.assessmentId;
  const hasAssessmentId = typeof assessmentId === 'string' && assessmentId.length > 0;
  checks.push({
    name: 'Assessment ID Generated',
    passed: hasAssessmentId,
    severity: 'high',
    expected: 'assessmentId should be non-empty string',
    actual: hasAssessmentId ? 'present' : 'missing',
  });

  // -------------------------------------------------------------------------
  // MEDIUM CHECKS (nice-to-have)
  // -------------------------------------------------------------------------

  // Check 5: Specializations Present (from specializationAssessment stage)
  const specializations = result?.specializations;
  const hasSpecializations = Array.isArray(specializations);
  checks.push({
    name: 'Specializations Present',
    passed: hasSpecializations,
    severity: 'medium',
    expected: 'specializations should be array',
    actual: hasSpecializations ? `array with ${specializations.length} items` : 'missing or not array',
  });

  // -------------------------------------------------------------------------
  // OVERALL PASS/FAIL
  // -------------------------------------------------------------------------

  // Overall passes only if ALL critical checks pass
  const criticalChecks = checks.filter(c => c.severity === 'critical');
  const allCriticalPass = criticalChecks.every(c => c.passed);

  return {
    passed: allCriticalPass,
    checks,
  };
}

// ============================================================================
// QUALITY SCORE CALCULATION
// ============================================================================

/**
 * Calculates weighted quality score from structural evaluation result.
 * 
 * Weights by severity:
 * - critical: 3x
 * - high: 2x
 * - medium: 1x
 * - low: 0.5x
 * 
 * Formula: (sum of passed weights / sum of total weights) * 100
 * 
 * @param result - Structural evaluation result with checks
 * @returns Quality score from 0-100
 * 
 * @example
 * // 4 critical checks (3x weight each) = 12 points
 * // 2 high checks (2x weight each) = 4 points
 * // If 3 critical + 2 high pass:
 * // (9 + 4) / 16 * 100 = 81.25 → 81
 */
export function calculateQualityScore(result: StructuralEvalResult): number {
  if (!result.checks || result.checks.length === 0) {
    return 0;
  }

  let totalWeight = 0;
  let passedWeight = 0;

  for (const check of result.checks) {
    const weight = SEVERITY_WEIGHTS_LOCAL[check.severity];
    totalWeight += weight;
    
    if (check.passed) {
      passedWeight += weight;
    }
  }

  if (totalWeight === 0) {
    return 0;
  }

  const score = (passedWeight / totalWeight) * 100;
  return Math.round(score);
}

