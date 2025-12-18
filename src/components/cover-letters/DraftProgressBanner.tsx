import React, { useMemo } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE STEP DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type StepStatus = 'pending' | 'active' | 'done' | 'skipped';

interface PipelineStep {
  key: string;
  label: string;
  headlineLabel: string;
  status: StepStatus;
  result?: string;
}

// Step keys - simplified model
// Phase A: Analyze JD → Extract reqs → Match goals
// Phase B: Draft → Gaps
// Note: Readiness is async (post-draft) and shown in toolbar only
const STEP_KEYS = {
  // Phase A
  ANALYZE_JD: 'analyze_jd',
  EXTRACT_REQUIREMENTS: 'extract_requirements',
  MATCH_GOALS_STRENGTHS: 'match_goals_strengths',
  // Phase B
  DRAFT: 'draft',
  GAPS: 'gaps',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════

interface DraftProgressBannerProps {
  // A-phase stage flags
  aPhaseStageFlags?: {
    hasJdAnalysis?: boolean;
    hasRequirementAnalysis?: boolean;
    hasGoalsAndStrengths?: boolean;
    hasJdRequirementSummary?: boolean;
    hasMws?: boolean;
  };
  // A-phase data for results
  aPhaseData?: {
    jdRequirementSummary?: {
      coreTotal?: number;
      preferredTotal?: number;
    };
    mws?: {
      summaryScore?: number;
    };
  };
  // B-phase state
  hasDraftSections?: boolean;
  sectionCount?: number;
  hasMetrics?: boolean; // gaps + score computed (enhancedMatchData present)
  coreRequirementsMet?: number;
  coreRequirementsTotal?: number;
  overallScore?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// STEP STATE DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

function deriveStepStates(props: DraftProgressBannerProps): PipelineStep[] {
  const {
    aPhaseStageFlags,
    aPhaseData,
    hasDraftSections,
    sectionCount,
    hasMetrics,
    coreRequirementsMet,
    coreRequirementsTotal,
    overallScore,
  } = props;

  const flags = aPhaseStageFlags || {};
  const data = aPhaseData || {};

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE A STEPS (streaming)
  // ─────────────────────────────────────────────────────────────────────────

  // Step 1: ANALYZE_JD
  const step1Done = !!flags.hasJdAnalysis;
  const step1Result = step1Done && data.jdRequirementSummary
    ? `${(data.jdRequirementSummary.coreTotal || 0) + (data.jdRequirementSummary.preferredTotal || 0)} requirements found`
    : undefined;

  // Step 2: EXTRACT_REQUIREMENTS
  const step2Done = !!flags.hasRequirementAnalysis;
  const step2Result = step2Done && data.jdRequirementSummary
    ? `Core: ${data.jdRequirementSummary.coreTotal || 0}, Preferred: ${data.jdRequirementSummary.preferredTotal || 0}`
    : undefined;

  // Step 3: MATCH_GOALS_STRENGTHS
  const step3Done = !!flags.hasGoalsAndStrengths;
  const step3Result = step3Done && data.mws?.summaryScore !== undefined
    ? `Strengths match: ${data.mws.summaryScore}/3`
    : undefined;

  // Phase A complete flag
  const aPhaseComplete = step1Done && step2Done && step3Done;

  // ─────────────────────────────────────────────────────────────────────────
  // PHASE B STEPS (draft generation, not streaming)
  // ─────────────────────────────────────────────────────────────────────────

  // Step 4: DRAFT - when draft sections arrive
  const draftDone = !!hasDraftSections;
  const draftResult = draftDone && sectionCount ? `${sectionCount} sections drafted` : undefined;

  // Step 5: GAPS - when gaps & score are computed (hasMetrics = enhancedMatchData present)
  // This includes both gaps and overall score computation
  const gapsDone = !!hasMetrics && overallScore !== undefined;
  const gapsResult = gapsDone && coreRequirementsTotal
    ? `${coreRequirementsMet || 0}/${coreRequirementsTotal} covered, ${overallScore}% score`
    : undefined;

  // Step 6: READINESS (conditional)
  // Note: Readiness is evaluated AFTER draft generation completes, fetched separately
  // Skip showing in banner since it's async and happens post-draft
  const readinessSkipped = true; // Always skip in progress banner

  // ─────────────────────────────────────────────────────────────────────────
  // BUILD STEP ARRAY
  // ─────────────────────────────────────────────────────────────────────────

  const steps: PipelineStep[] = [];

  // Phase A steps
  steps.push({
    key: STEP_KEYS.ANALYZE_JD,
    label: 'Analyze JD',
    headlineLabel: 'Analyzing job description',
    status: step1Done ? 'done' : 'active', // First step starts active
    result: step1Result,
  });

  steps.push({
    key: STEP_KEYS.EXTRACT_REQUIREMENTS,
    label: 'Extract reqs',
    headlineLabel: 'Extracting requirements',
    status: step2Done ? 'done' : step1Done ? 'active' : 'pending',
    result: step2Result,
  });

  steps.push({
    key: STEP_KEYS.MATCH_GOALS_STRENGTHS,
    label: 'Match goals',
    headlineLabel: 'Matching with goals and strengths',
    status: step3Done ? 'done' : step2Done ? 'active' : 'pending',
    result: step3Result,
  });

  // Phase B steps - only active/done when A-phase is complete
  steps.push({
    key: STEP_KEYS.DRAFT,
    label: 'Draft',
    headlineLabel: 'Generating draft sections',
    status: draftDone ? 'done' : aPhaseComplete ? 'active' : 'pending',
    result: draftResult,
  });

  steps.push({
    key: STEP_KEYS.GAPS,
    label: 'Gaps',
    headlineLabel: 'Computing gaps and score',
    status: gapsDone ? 'done' : draftDone ? 'active' : 'pending',
    result: gapsResult,
  });

  // Readiness step removed from progress banner
  // Readiness is evaluated async after draft generation and shown in toolbar only

  return steps;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRESS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════

function calculateProgress(steps: PipelineStep[]): number {
  const completedCount = steps.filter(s => s.status === 'done').length;
  const hasActive = steps.some(s => s.status === 'active');
  const totalSteps = steps.length;

  if (totalSteps === 0) return 0;

  // Base progress from completed steps
  let progress = completedCount / totalSteps;

  // Give half-credit for active step
  if (hasActive) {
    progress = Math.min(1, progress + 0.5 / totalSteps);
  }

  return Math.round(progress * 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// CURRENT STEP DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

function getCurrentStep(steps: PipelineStep[]): PipelineStep | null {
  // Find first active step
  const activeStep = steps.find(s => s.status === 'active');
  if (activeStep) return activeStep;

  // If no active step, find the last done step (for showing result)
  const doneSteps = steps.filter(s => s.status === 'done');
  return doneSteps.length > 0 ? doneSteps[doneSteps.length - 1] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function DraftProgressBanner(props: DraftProgressBannerProps) {
  const steps = useMemo(() => deriveStepStates(props), [props]);
  const progress = useMemo(() => calculateProgress(steps), [steps]);
  const currentStep = useMemo(() => getCurrentStep(steps), [steps]);

  // Check if all steps complete
  const allComplete = steps.every(s => s.status === 'done');

  return (
    <Alert className="border-primary/20 bg-primary/5">
      <AlertDescription>
        <div className="space-y-3">
          {/* Compact header: Icon + Message + Progress % */}
          <div className="flex items-center gap-3">
            {allComplete ? (
              <Check className="h-5 w-5 text-success flex-shrink-0" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {allComplete 
                  ? 'Cover letter ready!' 
                  : (currentStep?.headlineLabel || 'Drafting your cover letter…')}
              </p>
            </div>
            <span className="text-sm font-medium text-muted-foreground tabular-nums">
              {progress}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-500",
                allComplete ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step indicators with visual status */}
          <div className="flex gap-2 flex-wrap text-xs">
            {steps.map((step) => (
              <span
                key={step.key}
                className={cn(
                  'flex items-center gap-1',
                  step.status === 'done' && 'text-primary',
                  step.status === 'active' && 'text-foreground font-medium',
                  step.status === 'pending' && 'text-muted-foreground'
                )}
              >
                {step.status === 'done' && <Check className="h-3 w-3" />}
                {step.status === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                {step.label}
              </span>
            ))}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
