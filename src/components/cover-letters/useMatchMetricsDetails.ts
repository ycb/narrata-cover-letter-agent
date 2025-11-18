import { useMemo } from 'react';
import { GoalsMatchService, type GoalMatch } from '@/services/goalsMatchService';
import { useUserGoals } from '@/contexts/UserGoalsContext';
import type { EnhancedMatchData, GoalMatchDetail } from '@/types/coverLetters';

export interface HILProgressMetrics {
  goalsMatch: string;
  experienceMatch: string;
  coverLetterRating: string;
  atsScore: number;
  coreRequirementsMet: { met: number; total: number };
  preferredRequirementsMet: { met: number; total: number };
}

export interface GoNoGoMismatch {
  type: 'geography' | 'pay' | 'core-requirements' | 'work-history';
  severity: 'high' | 'medium' | 'low';
  description: string;
  userOverride?: boolean;
}

export interface GoNoGoAnalysis {
  decision: 'go' | 'no-go';
  confidence: number;
  mismatches: GoNoGoMismatch[];
}

export interface MatchJobDescription {
  role?: string;
  company?: string;
  location?: string;
  salary?: string;
  workType?: string;
  standardRequirements?: Array<any>;
  preferredRequirements?: Array<any>;
  standard_requirements?: Array<any>;
  preferred_requirements?: Array<any>;
  analysis?: any;
  structuredData?: {
    standardRequirements?: Array<any>;
    preferredRequirements?: Array<any>;
  };
}

export interface RequirementDisplayItem {
  id: string;
  requirement: string;
  demonstrated: boolean;
  evidence?: string;
  section?: string;
}

export interface MatchMetricSummary {
  met: number;
  total: number;
  percentage: number;
}

export interface RequirementsWithSummary {
  list: RequirementDisplayItem[];
  summary: MatchMetricSummary;
}

export interface UseMatchMetricsDetailsArgs {
  jobDescription?: MatchJobDescription;
  enhancedMatchData?: EnhancedMatchData;
  goNoGoAnalysis?: GoNoGoAnalysis;
}

export interface MatchMetricsDetails {
  goalMatches: GoalMatchDisplay[];
  goalsSummary: MatchMetricSummary;
  coreRequirements: RequirementsWithSummary;
  preferredRequirements: RequirementsWithSummary;
}

export type GoalMatchDisplay = (GoalMatch | GoalMatchDetail) & {
  matchState?: 'match' | 'no-match' | 'unknown';
  emptyState?: 'no-goals' | 'goal-not-set' | null;
};

const DEFAULT_TOTAL_GOALS = 7;

export const getRatingColor = (rating: string | undefined) => {
  if (!rating) return 'bg-muted/10 text-muted-foreground border-muted/20';
  switch (rating.toLowerCase()) {
    case 'strong':
      return 'bg-success/10 text-success border-success/20';
    case 'average':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'weak':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted/10 text-muted-foreground border-muted/20';
  }
};

export const getATSScoreColor = (score: number) => {
  if (score >= 80) return 'bg-success/10 text-success border-success/20';
  if (score >= 60) return 'bg-warning/10 text-warning border-warning/20';
  return 'bg-destructive/10 text-destructive border-destructive/20';
};

const normalizeReqText = (text?: string) =>
  (text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

export function useMatchMetricsDetails({
  jobDescription,
  enhancedMatchData,
  goNoGoAnalysis,
}: UseMatchMetricsDetailsArgs): MatchMetricsDetails {
  const { goals } = useUserGoals();

  const goalMatches = useMemo<GoalMatchDisplay[]>(() => {
    if (!jobDescription) {
      return enhancedMatchData?.goalMatches || [];
    }

    const goalsMatchService = new GoalsMatchService();
    const freshAnalysis = goalsMatchService.analyzeGoalsMatch(goals || null, jobDescription, goNoGoAnalysis);
    return freshAnalysis.matches;
  }, [goals, jobDescription, enhancedMatchData?.goalMatches, goNoGoAnalysis]);

  const { coreRequirementList, preferredRequirementList } = useMemo(() => {
    const analyzedCoreById = new Map(
      (enhancedMatchData?.coreRequirementDetails || []).map((d: any) => [d.id, d]),
    );
    const analyzedPrefById = new Map(
      (enhancedMatchData?.preferredRequirementDetails || []).map((d: any) => [d.id, d]),
    );

    const analyzedCoreByText = new Map(
      (enhancedMatchData?.coreRequirementDetails || []).map((d: any) => [normalizeReqText(d.requirement), d]),
    );
    const analyzedPrefByText = new Map(
      (enhancedMatchData?.preferredRequirementDetails || []).map((d: any) => [normalizeReqText(d.requirement), d]),
    );

    const jdCore =
      jobDescription?.structuredData?.standardRequirements ||
      jobDescription?.standardRequirements ||
      (jobDescription as any)?.standard_requirements ||
      jobDescription?.analysis?.llm?.coreRequirements || // LLM returns coreRequirements, not standardRequirements
      jobDescription?.analysis?.llm?.standardRequirements ||
      [];
    const jdPref =
      jobDescription?.structuredData?.preferredRequirements ||
      jobDescription?.preferredRequirements ||
      (jobDescription as any)?.preferred_requirements ||
      jobDescription?.analysis?.llm?.preferredRequirements ||
      [];

    const buildReq = (
      req: any,
      analyzedById: Map<any, any>,
      analyzedByText: Map<any, any>,
      index: number,
    ): RequirementDisplayItem => {
      // Handle string arrays from LLM (coreRequirements/preferredRequirements are strings)
      const requirementText = typeof req === 'string' 
        ? req 
        : (req.requirement || req.label || req.detail || '');
      
      const id =
        req.id ||
        req.requirementId ||
        req.key ||
        (typeof req === 'string' ? `req-${index}` : normalizeReqText(requirementText));
      
      const analyzed = (id && analyzedById.get(id)) || analyzedByText.get(normalizeReqText(requirementText));

      return {
        id: String(id),
        requirement: requirementText,
        demonstrated: analyzed?.demonstrated ?? false,
        evidence: analyzed?.evidence,
        section: analyzed?.section,
      };
    };

    const fallbackCore =
      (enhancedMatchData?.coreRequirementDetails || []).map((d: any) => ({
        id: String(d.id),
        requirement: d.requirement,
        demonstrated: !!d.demonstrated,
        evidence: d.evidence,
        section: d.section,
      })) || [];

    const fallbackPreferred =
      (enhancedMatchData?.preferredRequirementDetails || []).map((d: any) => ({
        id: String(d.id),
        requirement: d.requirement,
        demonstrated: !!d.demonstrated,
        evidence: d.evidence,
        section: d.section,
      })) || [];

    return {
      coreRequirementList: jdCore.length > 0 ? jdCore.map((r: any, i: number) => buildReq(r, analyzedCoreById, analyzedCoreByText, i)) : fallbackCore,
      preferredRequirementList: jdPref.length > 0 ? jdPref.map((r: any, i: number) => buildReq(r, analyzedPrefById, analyzedPrefByText, i)) : fallbackPreferred,
    };
  }, [jobDescription, enhancedMatchData?.coreRequirementDetails, enhancedMatchData?.preferredRequirementDetails]);

  const goalsSummary = useMemo<MatchMetricSummary>(() => {
    const met = goalMatches.filter((g) => g.met).length;
    const total = goalMatches.length || DEFAULT_TOTAL_GOALS;
    return {
      met,
      total,
      percentage: total > 0 ? (met / total) * 100 : 0,
    };
  }, [goalMatches]);

  const coreSummary = useMemo<MatchMetricSummary>(() => {
    const met = coreRequirementList.filter((r) => r.demonstrated).length;
    const total = coreRequirementList.length;
    return {
      met,
      total,
      percentage: total > 0 ? (met / total) * 100 : 0,
    };
  }, [coreRequirementList]);

  const preferredSummary = useMemo<MatchMetricSummary>(() => {
    const met = preferredRequirementList.filter((r) => r.demonstrated).length;
    const total = preferredRequirementList.length;
    return {
      met,
      total,
      percentage: total > 0 ? (met / total) * 100 : 0,
    };
  }, [preferredRequirementList]);

  return {
    goalMatches,
    goalsSummary,
    coreRequirements: { list: coreRequirementList, summary: coreSummary },
    preferredRequirements: { list: preferredRequirementList, summary: preferredSummary },
  };
}


