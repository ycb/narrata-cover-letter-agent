import { useMemo } from 'react';
import type { JobStreamState, APhaseInsights } from '@/types/jobs';

/**
 * useAPhaseInsights - Pure adapter hook for A-phase streaming insights
 * 
 * Purpose:
 * - Normalize jobState.stages into a read-only APhaseInsights object
 * - For use by banner (progress) and toolbar (accordions)
 * - NEVER modifies draft-based metrics/requirements/gaps
 * 
 * Input: jobState from useJobStream()
 * Output: aPhaseInsights with normalized data + stage flags
 * 
 * Design principles:
 * - Pure transformation (no side effects)
 * - Explicit null/undefined handling
 * - Stage flags computed only from stage presence & completion
 * - Does NOT infer from draft state
 * - Handles A-phase failure gracefully (returns empty insights)
 */
export function useAPhaseInsights(
  jobState: JobStreamState | null
): APhaseInsights | null {
  return useMemo(() => {
    // Guard: no job state
    if (!jobState) {
      return null;
    }

    // Guard: wrong job type (should only be used with coverLetter jobs)
    if (jobState.type !== 'coverLetter') {
      return null;
    }

    const stages = jobState.stages || {};

    // Extract stage data with safe accessors
    const jdAnalysisStage = stages.jdAnalysis;
    const goalsAndStrengthsStage = stages.goalsAndStrengths;

    const jdAnalysisData = jdAnalysisStage?.data;
    const goalsAndStrengthsData = goalsAndStrengthsStage?.data;

    // Compute stage flags (explicit boolean checks)
    const hasJdAnalysis = !!jdAnalysisStage && jdAnalysisStage.status === 'complete';
    const hasRequirementAnalysis = !!stages.requirementAnalysis && stages.requirementAnalysis.status === 'complete';
    const hasGoalsAndStrengths = !!goalsAndStrengthsStage && goalsAndStrengthsStage.status === 'complete';

    // Compute derived flags for specific insights
    const hasRoleInsights = hasJdAnalysis && !!jdAnalysisData?.roleInsights;
    const hasJdRequirementSummary =
      hasJdAnalysis &&
      !!jdAnalysisData?.jdRequirementSummary &&
      (typeof jdAnalysisData.jdRequirementSummary.coreTotal === 'number' ||
       typeof jdAnalysisData.jdRequirementSummary.preferredTotal === 'number');
    const hasMws = hasGoalsAndStrengths && !!goalsAndStrengthsData?.mws;
    const hasCompanyContext = hasGoalsAndStrengths && !!goalsAndStrengthsData?.companyContext;

    // Phase is complete when all three A-phase stages are complete
    // Note: Does NOT check draft state
    const phaseComplete = hasJdAnalysis && hasRequirementAnalysis && hasGoalsAndStrengths;

    // Build insights object
    const insights: APhaseInsights = {
      // Role insights (from jdAnalysis stage)
      roleInsights: jdAnalysisData?.roleInsights
        ? {
            inferredRoleLevel: jdAnalysisData.roleInsights.inferredRoleLevel,
            inferredRoleScope: jdAnalysisData.roleInsights.inferredRoleScope,
            titleMatch: jdAnalysisData.roleInsights.titleMatch,
            scopeMatch: jdAnalysisData.roleInsights.scopeMatch,
            goalAlignment: jdAnalysisData.roleInsights.goalAlignment,
          }
        : undefined,

      // JD requirement summary (from jdAnalysis stage)
      jdRequirementSummary: jdAnalysisData?.jdRequirementSummary
        ? {
            coreTotal: jdAnalysisData.jdRequirementSummary.coreTotal ?? 0,
            preferredTotal: jdAnalysisData.jdRequirementSummary.preferredTotal ?? 0,
          }
        : undefined,

      // Match with Strengths (from goalsAndStrengths stage)
      mws: goalsAndStrengthsData?.mws,

      // Company context (from goalsAndStrengths stage)
      companyContext: goalsAndStrengthsData?.companyContext,

      // Stage flags
      stageFlags: {
        hasJdAnalysis,
        hasRequirementAnalysis,
        hasGoalsAndStrengths,
        hasRoleInsights,
        hasJdRequirementSummary,
        hasMws,
        hasCompanyContext,
        phaseComplete,
      },
    };

    return insights;
  }, [jobState]);
}

