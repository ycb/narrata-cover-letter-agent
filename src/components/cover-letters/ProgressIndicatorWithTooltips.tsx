import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CoverLetterRatingTooltip } from './CoverLetterRatingTooltip';
import { ATSScoreTooltip } from './ATSScoreTooltip';
import { RequirementsTooltip } from './RequirementsTooltip';
import { MatchGoalsTooltip } from './MatchGoalsTooltip';
import { useUserGoals } from '@/contexts/UserGoalsContext';
import { GoalsMatchService } from '@/services/goalsMatchService';
import { useMemo } from 'react';
import type { EnhancedMatchData } from '@/types/coverLetters';

interface HILProgressMetrics {
  goalsMatch: string;
  experienceMatch: string;
  coverLetterRating: string;
  atsScore: number;
  coreRequirementsMet: { met: number; total: number };
  preferredRequirementsMet: { met: number; total: number };
}

interface GoNoGoMismatch {
  type: 'geography' | 'pay' | 'core-requirements' | 'work-history';
  severity: 'high' | 'medium' | 'low';
  description: string;
  userOverride?: boolean;
}

interface GoNoGoAnalysis {
  decision: 'go' | 'no-go';
  confidence: number;
  mismatches: GoNoGoMismatch[];
}

interface ProgressIndicatorWithTooltipsProps {
  metrics: HILProgressMetrics;
  className?: string;
  isPostHIL?: boolean;
  goNoGoAnalysis?: GoNoGoAnalysis;
  jobDescription?: {
    role?: string;
    company?: string;
    location?: string;
    salary?: string;
    workType?: string;
    // Allow multiple shapes coming from JD storage
    standardRequirements?: Array<any>;
    preferredRequirements?: Array<any>;
    standard_requirements?: Array<any>;
    preferred_requirements?: Array<any>;
    analysis?: any;
    structuredData?: {
      standardRequirements?: Array<any>;
      preferredRequirements?: Array<any>;
    };
  };
  enhancedMatchData?: EnhancedMatchData; // Agent C: detailed match data
  onEditGoals?: () => void; // Callback to open goals modal
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
  onEnhanceSection?: (sectionId: string, requirement?: string) => void; // Agent C: enhance section CTA
  onAddMetrics?: (sectionId?: string) => void; // Agent C: add metrics CTA
}

export function ProgressIndicatorWithTooltips({
  metrics,
  className,
  isPostHIL = false,
  goNoGoAnalysis,
  jobDescription,
  enhancedMatchData,
  onEditGoals,
  onAddStory,
  onEnhanceSection,
  onAddMetrics
}: ProgressIndicatorWithTooltipsProps) {
  // Get current goals from context
  const { goals } = useUserGoals();

  const getRatingColor = (rating: string | undefined) => {
    if (!rating) return 'bg-muted/10 text-muted-foreground border-muted/20';
    switch (rating.toLowerCase()) {
      case 'strong': return 'bg-success/10 text-success border-success/20';
      case 'average': return 'bg-warning/10 text-warning border-warning/20';
      case 'weak': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getATSScoreColor = (score: number) => {
    if (score >= 80) return 'bg-success/10 text-success border-success/20';
    if (score >= 60) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  // Agent C: Recalculate goal matches using current goals from context
  // This ensures the tooltip shows up-to-date information even if goals changed after draft creation
  const goalMatches = useMemo(() => {
    // Debug: Log what goals we're receiving
    console.log('[ProgressIndicatorWithTooltips] Recalculating goalMatches with:', {
      goals: goals,
      jobDescription: jobDescription,
      hasGoNoGoAnalysis: !!goNoGoAnalysis
    });

    if (!jobDescription) {
      // Fallback to cached data if no job description available
      return enhancedMatchData?.goalMatches || [];
    }

    // Recalculate using current goals from context
    const goalsMatchService = new GoalsMatchService();
    const freshAnalysis = goalsMatchService.analyzeGoalsMatch(
      goals || null,
      jobDescription,
      goNoGoAnalysis
    );
    
    console.log('[ProgressIndicatorWithTooltips] Fresh goal matches:', freshAnalysis.matches);
    
    return freshAnalysis.matches;
  }, [goals, jobDescription, enhancedMatchData?.goalMatches, goNoGoAnalysis]);
  const coreReqs = enhancedMatchData?.coreRequirementDetails || [];
  const preferredReqs = enhancedMatchData?.preferredRequirementDetails || [];
  
  // Build requirement lists from JD parse and overlay "demonstrated" from analysis so tooltips never go blank
  const normalizeReqText = (text?: string) =>
    (text || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

  const analyzedCoreById = new Map(
    (enhancedMatchData?.coreRequirementDetails || []).map((d: any) => [d.id, d])
  );
  const analyzedPrefById = new Map(
    (enhancedMatchData?.preferredRequirementDetails || []).map((d: any) => [d.id, d])
  );

  const analyzedCoreByText = new Map(
    (enhancedMatchData?.coreRequirementDetails || []).map((d: any) => [normalizeReqText(d.requirement), d])
  );
  const analyzedPrefByText = new Map(
    (enhancedMatchData?.preferredRequirementDetails || []).map((d: any) => [normalizeReqText(d.requirement), d])
  );

  const jdCore =
    jobDescription?.structuredData?.standardRequirements ||
    jobDescription?.standardRequirements ||
    (jobDescription as any)?.standard_requirements ||
    jobDescription?.analysis?.llm?.standardRequirements ||
    [];
  const jdPref =
    jobDescription?.structuredData?.preferredRequirements ||
    jobDescription?.preferredRequirements ||
    (jobDescription as any)?.preferred_requirements ||
    jobDescription?.analysis?.llm?.preferredRequirements ||
    [];

  const buildReq = (req: any, analyzedById: Map<any, any>, analyzedByText: Map<any, any>) => {
    const id = req.id || req.requirementId || req.key || normalizeReqText(req.requirement || req.label || req.detail);
    const requirementText = req.requirement || req.label || req.detail || '';
    const analyzed =
      (id && analyzedById.get(id)) ||
      analyzedByText.get(normalizeReqText(requirementText));
    return {
      id: String(id),
      requirement: requirementText,
      demonstrated: analyzed?.demonstrated ?? false,
      evidence: analyzed?.evidence,
      section: analyzed?.section,
    };
  };

  const coreReqList =
    jdCore.length > 0
      ? jdCore.map((r: any) => buildReq(r, analyzedCoreById, analyzedCoreByText))
      : (enhancedMatchData?.coreRequirementDetails || []).map((d: any) => ({
          id: String(d.id),
          requirement: d.requirement,
          demonstrated: !!d.demonstrated,
          evidence: d.evidence,
          section: d.section,
        }));

  const preferredReqList =
    jdPref.length > 0
      ? jdPref.map((r: any) => buildReq(r, analyzedPrefById, analyzedPrefByText))
      : (enhancedMatchData?.preferredRequirementDetails || []).map((d: any) => ({
          id: String(d.id),
          requirement: d.requirement,
          demonstrated: !!d.demonstrated,
          evidence: d.evidence,
          section: d.section,
        }));

  // Compute badge counts directly from the lists to avoid drift
  const coreMet = coreReqList.filter(r => r.demonstrated).length;
  const coreTotal = coreReqList.length;
  const prefMet = preferredReqList.filter(r => r.demonstrated).length;
  const prefTotal = preferredReqList.length;

  // For tooltips that still expect old format, we pass the data directly
  // TODO: Update these tooltips to use the new enhanced data structure
  const coverLetterRating = null; // No longer in enhanced data, use metrics instead
  const atsAnalysis = null; // No longer in enhanced data, use metrics instead

  return (
    <div className={`w-full bg-card border rounded-lg p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
        {/* Match with Goals */}
        <MatchGoalsTooltip goalMatches={goalMatches} isPostHIL={isPostHIL} onEditGoals={onEditGoals}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">MATCH WITH GOALS</div>
            <Badge variant="outline" className={getATSScoreColor(goalMatches.length > 0 ? (goalMatches.filter(g => g.met).length / goalMatches.length) * 100 : 0)}>
              {goalMatches.filter(g => g.met).length}/{goalMatches.length || 7}
            </Badge>
          </div>
        </MatchGoalsTooltip>

        {/* Core Requirements - Shows what's addressed in the DRAFT */}
        <RequirementsTooltip
          title={`Core Reqs: ${coreMet}/${coreTotal}`}
          requirements={coreReqList}
          description="Essential requirements addressed in your draft"
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">CORE REQS</div>
            <Badge variant="outline" className={getATSScoreColor(coreTotal > 0 ? (coreMet / coreTotal) * 100 : 0)}>
              {coreMet}/{coreTotal}
            </Badge>
          </div>
        </RequirementsTooltip>

        {/* Preferred Requirements - Shows what's addressed in the DRAFT */}
        <RequirementsTooltip
          title={`Preferred Reqs: ${prefMet}/${prefTotal}`}
          requirements={preferredReqList}
          description="Nice-to-have requirements addressed in your draft"
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">PREFERRED REQS</div>
            <Badge variant="outline" className={getATSScoreColor(prefTotal > 0 ? (prefMet / prefTotal) * 100 : 0)}>
              {prefMet}/{prefTotal}
            </Badge>
          </div>
        </RequirementsTooltip>

        {/* Cover Letter Rating */}
        <CoverLetterRatingTooltip>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">COVER LETTER RATING</div>
            <Badge variant="outline" className={getRatingColor(metrics.coverLetterRating)}>
              {metrics.coverLetterRating || 'N/A'}
            </Badge>
          </div>
        </CoverLetterRatingTooltip>

        {/* ATS Score */}
        <ATSScoreTooltip>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">ATS</div>
            <Badge variant="outline" className={getATSScoreColor(metrics.atsScore ?? 0)}>
              {metrics.atsScore ?? 0}%
            </Badge>
          </div>
        </ATSScoreTooltip>
      </div>
    </div>
  );
}
