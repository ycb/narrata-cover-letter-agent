import { useMemo } from 'react';
import type { JobStreamState, APhaseInsights } from '@/types/jobs';

// Dev-only logging (Task 5: A-phase streaming diagnostics)
const IS_DEV = process.env.NODE_ENV !== 'production';
const devLog = (...args: unknown[]) => {
  if (IS_DEV) {
    console.log(...args);
  }
};

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
    // Task 5: Dev-only input logging
    devLog('[A-PHASE] useAPhaseInsights input', {
      hasJobState: !!jobState,
      jobType: jobState?.type,
      jobStatus: jobState?.status,
      stageKeys: jobState?.stages ? Object.keys(jobState.stages) : [],
    });

    // Guard: no job state
    if (!jobState) {
      devLog('[A-PHASE] Guard: no jobState');
      return null;
    }

    // Guard: wrong job type (should only be used with coverLetter jobs)
    if (jobState.type !== 'coverLetter') {
      devLog('[A-PHASE] Guard: wrong jobType', jobState.type);
      return null;
    }

    const stages = jobState.stages || {};

    const unwrapStageData = <T,>(raw: T): any => {
      if (!raw || typeof raw !== 'object') return raw;
      const inner = (raw as any).data;
      if (!inner || typeof inner !== 'object' || Array.isArray(inner)) return raw;
      const expectedKeys = [
        'roleInsights',
        'jdRequirementSummary',
        'coreRequirements',
        'preferredRequirements',
        'requirementsMet',
        'totalRequirements',
        'mws',
        'companyContext',
      ];
      const hasExpectedKey = expectedKeys.some((key) => key in inner);
      return hasExpectedKey ? inner : raw;
    };

    // Extract stage data with safe accessors
    const jdAnalysisStage = stages.jdAnalysis;
    const goalsAndStrengthsStage = stages.goalsAndStrengths;
    const companyContextStage = (stages as any).companyContext;
    const requirementAnalysisStage = stages.requirementAnalysis;

    const jdAnalysisData = unwrapStageData(jdAnalysisStage?.data);
    const goalsAndStrengthsData = unwrapStageData(goalsAndStrengthsStage?.data);
    const companyContextData = unwrapStageData(companyContextStage?.data);
    const requirementAnalysisData = unwrapStageData(requirementAnalysisStage?.data);

    // Compute stage flags (explicit boolean checks)
    const hasJdAnalysis = !!jdAnalysisStage && jdAnalysisStage.status === 'complete';
    const hasRequirementAnalysis =
      !!stages.requirementAnalysis && stages.requirementAnalysis.status === 'complete';
    const hasGoalsAndStrengths =
      !!goalsAndStrengthsStage && goalsAndStrengthsStage.status === 'complete';

    // Compute derived flags for specific insights
    const hasRoleInsights = hasJdAnalysis && !!jdAnalysisData?.roleInsights;
    const hasJdRequirementSummary =
      hasJdAnalysis &&
      !!jdAnalysisData?.jdRequirementSummary &&
      (typeof jdAnalysisData.jdRequirementSummary.coreTotal === 'number' ||
       typeof jdAnalysisData.jdRequirementSummary.preferredTotal === 'number');
    // IMPORTANT: MwS and company context can arrive as partial stage data before stage completion.
    // Treat presence of the fields as readiness, independent of stage status, so UI can update early.
    const hasMws = !!goalsAndStrengthsData?.mws;
    const hasCompanyContext = !!goalsAndStrengthsData?.companyContext || !!companyContextData?.companyContext;
    const hasRequirementAnalysisData =
      hasRequirementAnalysis &&
      Array.isArray(requirementAnalysisData?.coreRequirements) &&
      Array.isArray(requirementAnalysisData?.preferredRequirements) &&
      typeof requirementAnalysisData?.requirementsMet === 'number' &&
      typeof requirementAnalysisData?.totalRequirements === 'number';

    // Phase is complete when all three A-phase stages are complete
    // Note: Does NOT check draft state
    const phaseComplete = hasJdAnalysis && hasRequirementAnalysis && hasGoalsAndStrengths;

    // Task 5: Dev-only stage flags logging
    devLog('[A-PHASE] Stage statuses', {
      jdAnalysis: { exists: !!jdAnalysisStage, status: jdAnalysisStage?.status },
      requirementAnalysis: { exists: !!stages.requirementAnalysis, status: stages.requirementAnalysis?.status },
      goalsAndStrengths: { exists: !!goalsAndStrengthsStage, status: goalsAndStrengthsStage?.status },
    });
    
    // Task 5: Dev-only data structure logging
    devLog('[A-PHASE] Raw stage data', {
      jdAnalysisDataKeys: jdAnalysisData ? Object.keys(jdAnalysisData) : [],
      jdAnalysisHasRoleInsights: !!jdAnalysisData?.roleInsights,
      jdAnalysisHasJdRequirementSummary: !!jdAnalysisData?.jdRequirementSummary,
      requirementAnalysisDataKeys: requirementAnalysisData ? Object.keys(requirementAnalysisData) : [],
      requirementAnalysisHasRequirements: Array.isArray(requirementAnalysisData?.coreRequirements),
      goalsAndStrengthsDataKeys: goalsAndStrengthsData ? Object.keys(goalsAndStrengthsData) : [],
      goalsAndStrengthsHasMws: !!goalsAndStrengthsData?.mws,
      goalsAndStrengthsHasCompanyContext: !!goalsAndStrengthsData?.companyContext,
      // Detailed MwS data for debugging
      mwsData: goalsAndStrengthsData?.mws,
      mwsSummaryScore: goalsAndStrengthsData?.mws?.summaryScore,
    });

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
      // May be available before stage completion.
      mws: goalsAndStrengthsData?.mws,

      // Company context may arrive in a dedicated stage (companyContext) so it doesn't block Phase A.
      companyContext: goalsAndStrengthsData?.companyContext ?? companyContextData?.companyContext,

      requirementAnalysis: hasRequirementAnalysisData
        ? {
            coreRequirements: requirementAnalysisData.coreRequirements ?? [],
            preferredRequirements: requirementAnalysisData.preferredRequirements ?? [],
            requirementsMet: requirementAnalysisData.requirementsMet ?? 0,
            totalRequirements: requirementAnalysisData.totalRequirements ?? 0,
          }
        : undefined,

      // Stage flags
      stageFlags: {
        hasJdAnalysis,
        hasRequirementAnalysis,
        hasGoalsAndStrengths,
        hasRoleInsights,
        hasJdRequirementSummary,
        hasMws,
        hasCompanyContext,
        hasRequirementAnalysisData,
        phaseComplete,
      },
    };

    // Task 5: Dev-only final insights logging
    devLog('[A-PHASE] insights update', {
      roleInsights: insights.roleInsights,
      jdRequirementSummary: insights.jdRequirementSummary,
      mws: insights.mws,
      companyContext: insights.companyContext,
      stageFlags: insights.stageFlags,
    });

    return insights;
  }, [jobState]);
}
