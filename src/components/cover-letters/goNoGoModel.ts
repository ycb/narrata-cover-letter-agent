import type { GoalMatchDisplay, RequirementDisplayItem } from './useMatchMetricsDetails';

export type GoNoGoDecision = 'go' | 'no-go';

export interface GoNoGoModel {
  decision: GoNoGoDecision;
  confidence: number; // 0-100
  reasons: Array<{
    label: string;
    severity: 'high' | 'medium' | 'low';
    detail: string;
  }>;
}

interface ComputeGoNoGoModelArgs {
  goalsComparisonReady: boolean;
  goalsSummaryPercentage: number; // 0..100
  goalMatches: GoalMatchDisplay[];
  hasAPhaseRequirementAnalysis: boolean;
  mwsAvailable: boolean;
  mwsSummaryScore: number; // 0..3 (0 if unavailable)
  effectiveCoreRequirements: RequirementDisplayItem[];
  effectivePreferredRequirements: RequirementDisplayItem[];
}

export function computeGoNoGoModel({
  goalsComparisonReady,
  goalsSummaryPercentage,
  goalMatches,
  hasAPhaseRequirementAnalysis,
  mwsAvailable,
  mwsSummaryScore,
  effectiveCoreRequirements,
  effectivePreferredRequirements,
}: ComputeGoNoGoModelArgs): GoNoGoModel | null {
  if (!goalsComparisonReady) return null;
  if (!hasAPhaseRequirementAnalysis) return null;

  const reasons: GoNoGoModel['reasons'] = [];
  if (!mwsAvailable) {
    reasons.push({
      label: 'Strengths analysis pending',
      severity: 'low',
      detail: 'We’re still extracting your strongest matches from your profile.',
    });
  }

  const salaryMatch = goalMatches.find((m) => m.id === 'goal-salary' || m.goalType === 'Minimum Salary');
  if (salaryMatch?.matchState === 'no-match') {
    reasons.push({
      label: 'Salary mismatch',
      severity: 'high',
      detail: salaryMatch.evidence || 'Salary appears below your minimum.',
    });
  } else if (salaryMatch?.matchState === 'unknown') {
    reasons.push({
      label: 'Salary unknown',
      severity: 'low',
      detail: salaryMatch.evidence || 'Salary not specified in JD.',
    });
  }

  const workTypeMatch = goalMatches.find((m) => m.id === 'goal-worktype' || m.goalType === 'Work Type');
  if (workTypeMatch?.matchState === 'no-match') {
    const isDealBreaker = Boolean(workTypeMatch.userValue && workTypeMatch.userValue.includes('(Deal-breaker)'));
    reasons.push({
      label: 'Work type mismatch',
      severity: isDealBreaker ? 'high' : 'medium',
      detail: workTypeMatch.evidence || 'Work type differs from your preferences.',
    });
  }

  const locationMatch = goalMatches.find((m) => m.id === 'goal-cities' || m.goalType === 'Preferred Location');
  if (locationMatch?.matchState === 'no-match') {
    reasons.push({
      label: 'Location mismatch',
      severity: 'medium',
      detail: locationMatch.evidence || 'Location differs from your preferences.',
    });
  } else if (locationMatch?.matchState === 'unknown') {
    reasons.push({
      label: 'Location unknown',
      severity: 'low',
      detail: locationMatch.evidence || 'Location not specified in JD.',
    });
  }

  const hasHighBlocker = reasons.some((r) => r.severity === 'high');
  const decision: GoNoGoDecision = hasHighBlocker ? 'no-go' : 'go';

  // Phase A metrics (normalized 0..1)
  const goalsPct = Math.max(0, Math.min(1, (goalsSummaryPercentage ?? 0) / 100));

  const coreMet = effectiveCoreRequirements.filter((r) => r.demonstrated).length;
  const coreTot = effectiveCoreRequirements.length;
  const corePct = coreTot > 0 ? coreMet / coreTot : 0;

  const prefMet = effectivePreferredRequirements.filter((r) => r.demonstrated).length;
  const prefTot = effectivePreferredRequirements.length;
  const prefPct = prefTot > 0 ? prefMet / prefTot : 0.5; // neutral if no pref reqs

  const mwsPct = Math.max(0, Math.min(1, (mwsSummaryScore ?? 0) / 3));

  // Weighted "overall fit" (0..100). Core requirements are the strongest signal.
  const fitScore = Math.round((goalsPct * 0.30 + corePct * 0.45 + prefPct * 0.10 + mwsPct * 0.15) * 100);

  // Confidence starts from fitScore and is penalized by mismatches (goal blockers).
  let confidence = fitScore;
  confidence -= reasons.filter((r) => r.severity === 'high').length * 12;
  confidence -= reasons.filter((r) => r.severity === 'medium').length * 6;
  confidence = Math.min(99, Math.max(5, confidence));

  return { decision, confidence, reasons };
}
