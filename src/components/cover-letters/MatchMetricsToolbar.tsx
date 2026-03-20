import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { GoalMatchCard } from './GoalMatchCard';
import { CoverLetterRatingInsights } from './CoverLetterRatingTooltip';
import { ATSScoreInsights } from './ATSScoreTooltip';
import { StatusIcon } from './StatusIcon';
import { computeGoNoGoModel, type GoNoGoModel } from './goNoGoModel';
import { getStandardConfig } from '@/config/contentStandards';
import {
  getATSScoreColor,
  getScoreColor,
  useMatchMetricsDetails,
  type CoverLetterCriterion,
  type GoalMatchDisplay,
  type GoNoGoAnalysis,
  type MatchMetricsData,
  type MatchJobDescription,
  type RequirementDisplayItem,
} from './useMatchMetricsDetails';
import type {
  DraftReadinessAvailability,
  DraftReadinessEvaluation,
  EnhancedMatchData,
  PhaseBRecord,
} from '@/types/coverLetters';
import type { ContentStandardsAnalysis } from '@/types/coverLetters';
import type { APhaseInsights } from '@/types/jobs';
import { isDraftReadinessEnabled } from '@/lib/flags';
import { logReadinessEvent } from '@/lib/telemetry';
import { useDraftReadiness } from '@/hooks/useDraftReadiness';
import { supabase } from '@/lib/supabase';

type MetricKey = 'goNoGo' | 'gaps' | 'goals' | 'strengths' | 'core' | 'preferred' | 'rating' | 'readiness';

interface MatchMetricsToolbarProps {
  metrics: MatchMetricsData;
  className?: string;
  isPostHIL?: boolean;
  isLoading?: boolean;
  layout?: 'vertical' | 'horizontal';
  mode?: 'full' | 'goNoGo' | 'fitCheck';
  goNoGoAnalysis?: GoNoGoAnalysis;
  jobDescription?: MatchJobDescription;
  enhancedMatchData?: EnhancedMatchData;
  contentStandards?: ContentStandardsAnalysis | null;
  sections?: Array<{ id: string; type: string; title?: string }>;
  dismissedGapSectionIds?: string[] | Set<string>;
  aPhaseInsights?: APhaseInsights; // Task 7: A-phase streaming insights
  jobId?: string; // Debug: correlate UI ↔ job record
  draftId?: string;
  draftUpdatedAt?: string;
  refreshStartedAt?: string | null;
  phaseBStatus?: PhaseBRecord | null;
  // Persisted MwS from draft (fallback when aPhaseInsights not available)
  draftMws?: {
    summaryScore: 0 | 1 | 2 | 3;
    details: Array<{
      label: string;
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
  onEditGoals?: () => void;
  onEnhanceSection?: (sectionId: string, requirement?: string, ratingCriteria?: Array<{
    id: string;
    label: string;
    description: string;
    suggestion: string;
    evidence: string;
  }>) => void;
  onAddMetrics?: (sectionId?: string) => void;
  onRefreshInsights?: () => void;
  isRefreshLoading?: boolean;
  isRefreshDisabled?: boolean;
  onOpenFinalCheck?: () => void;
}

interface ToolbarItem {
  key: MetricKey;
  label: string;
  value: string | null; // null = show skeleton animation
  badgeClass: string;
  disabled?: boolean;
}

interface MatchMetricsToolbarContentProps extends MatchMetricsToolbarProps {
  ENABLE_DRAFT_READINESS: boolean;
  readinessFetchEnabled: boolean;
  readiness: DraftReadinessEvaluation | null;
  readinessStatus: DraftReadinessAvailability;
  isReadinessLoading: boolean;
  readinessError: boolean;
  readinessErrorDetails: unknown;
  readinessFeatureDisabled: boolean;
}

const deriveMwsSummaryScore = (mws?: {
  summaryScore?: number;
  details?: Array<{ strengthLevel: 'strong' | 'moderate' | 'light' }>;
}): number | undefined => {
  if (!mws) return undefined;
  if (Array.isArray(mws.details) && mws.details.length) {
    const metCount = mws.details.reduce(
      (count, detail) =>
        count + (detail.strengthLevel === 'strong' || detail.strengthLevel === 'moderate' ? 1 : 0),
      0,
    );
    return Math.min(3, metCount);
  }
  return typeof mws.summaryScore === 'number' ? mws.summaryScore : undefined;
};

const hasGapSignalText = (gap: any): boolean =>
  [
    gap?.issue,
    gap?.label,
    gap?.recommendation,
    gap?.rationale,
    gap?.description,
    gap?.requirement,
    gap?.evidenceQuote,
    gap?.hiringRisk,
    gap?.whyNow,
  ].some((value) => typeof value === 'string' && value.trim().length > 0);

const isActionableGap = (gap: any): boolean => gap?.status === 'unmet' && hasGapSignalText(gap);

const isStructuredSectionGapInsight = (insight: any): boolean =>
  Boolean(
    insight &&
      typeof insight === 'object' &&
      typeof insight.sectionId === 'string' &&
      typeof insight.sectionSlug === 'string' &&
      typeof insight.sectionType === 'string' &&
      Array.isArray(insight.requirementGaps),
  );

export function MatchMetricsToolbar(props: MatchMetricsToolbarProps) {
  const {
    isLoading = false,
    isRefreshLoading = false,
    draftId,
    draftUpdatedAt,
    mode = 'full',
  } = props;

  const ENABLE_DRAFT_READINESS = isDraftReadinessEnabled();
  const readinessFetchEnabled = ENABLE_DRAFT_READINESS && mode === 'full' && !isLoading && Boolean(draftId);

  if (!readinessFetchEnabled) {
    return (
      <MatchMetricsToolbarContent
        {...props}
        ENABLE_DRAFT_READINESS={ENABLE_DRAFT_READINESS}
        readinessFetchEnabled={readinessFetchEnabled}
        readiness={null}
        readinessStatus={!ENABLE_DRAFT_READINESS ? 'disabled' : 'pending'}
        isReadinessLoading={false}
        readinessError={false}
        readinessErrorDetails={null}
        readinessFeatureDisabled={!ENABLE_DRAFT_READINESS}
      />
    );
  }

  return (
    <MatchMetricsToolbarWithReadiness
      {...props}
      ENABLE_DRAFT_READINESS={ENABLE_DRAFT_READINESS}
      readinessFetchEnabled={readinessFetchEnabled}
      draftUpdatedAt={draftUpdatedAt}
    />
  );
}

function MatchMetricsToolbarWithReadiness(
  props: MatchMetricsToolbarProps & {
    ENABLE_DRAFT_READINESS: boolean;
    readinessFetchEnabled: boolean;
  },
) {
  const { draftId, draftUpdatedAt, readinessFetchEnabled } = props;
  const {
    data: readiness,
    status: readinessStatus,
    isLoading: readinessLoading,
    isError: readinessError,
    error: readinessErrorDetails,
    featureDisabled: readinessFeatureDisabled,
  } = useDraftReadiness({
    draftId: readinessFetchEnabled ? draftId ?? null : null,
    draftUpdatedAt: draftUpdatedAt ?? null,
    enabled: readinessFetchEnabled,
  });

  const isReadinessLoading = readinessFetchEnabled ? readinessLoading : false;

  return (
    <MatchMetricsToolbarContent
      {...props}
      readiness={readiness ?? null}
      readinessStatus={readinessStatus}
      isReadinessLoading={isReadinessLoading}
      readinessError={readinessError}
      readinessErrorDetails={readinessErrorDetails}
      readinessFeatureDisabled={readinessFeatureDisabled}
    />
  );
}

function MatchMetricsToolbarContent({
  metrics,
  className,
  isPostHIL = false,
  isLoading = false,
  layout = 'vertical',
  mode = 'full',
  goNoGoAnalysis,
  jobDescription,
  enhancedMatchData,
  contentStandards,
  sections = [],
  dismissedGapSectionIds,
  aPhaseInsights,
  jobId,
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
  onRefreshInsights,
  isRefreshLoading = false,
  isRefreshDisabled = false,
  onOpenFinalCheck,
  draftId,
  draftUpdatedAt,
  draftMws,
  refreshStartedAt,
  phaseBStatus,
  ENABLE_DRAFT_READINESS,
  readinessFetchEnabled,
  readiness,
  readinessStatus,
  isReadinessLoading,
  readinessError,
  readinessErrorDetails,
  readinessFeatureDisabled,
}: MatchMetricsToolbarContentProps) {
  // Task 5: Dev-only A-phase props logging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[A-PHASE] MatchMetricsToolbar received', {
      hasAPhaseInsights: !!aPhaseInsights,
      aPhaseStageFlags: aPhaseInsights?.stageFlags,
      jobId,
      isLoading,
    });
  }
  
  // Debug: Comprehensive readiness logging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Readiness] FULL DEBUG:', {
      // 1. Feature flag
      ENABLE_DRAFT_READINESS,
      // 2. Draft info
      hasDraftId: Boolean(draftId),
      draftId,
      // 3. Fetch decision
      readinessFetchEnabled,
      // 4. Hook response
      readinessLoading: isReadinessLoading,
      readinessStatus,
      readinessError,
      errorDetails: readinessErrorDetails?.message,
      readinessFeatureDisabled,
      // 5. Data
      hasData: !!readiness,
      rating: readiness?.rating,
      scoreBreakdown: readiness?.scoreBreakdown ? 'present' : 'missing',
      // 6. For reference
      isLoading_prop: isLoading,
    });
  }
  const [ttlTimerId, setTtlTimerId] = useState<number | null>(null);
  const dismissedGapSectionIdSet = useMemo(() => {
    if (!dismissedGapSectionIds) return new Set<string>();
    return dismissedGapSectionIds instanceof Set
      ? new Set(Array.from(dismissedGapSectionIds))
      : new Set(dismissedGapSectionIds);
  }, [dismissedGapSectionIds]);
  const viewedEventForDraftRef = useRef<string | null>(null);
  const readinessPersistedRef = useRef<string | null>(null);

  // Telemetry: readiness card viewed when it first appears
  useEffect(() => {
    if (!ENABLE_DRAFT_READINESS || !draftId) return;
    const isVisible = readinessStatus !== 'disabled' && (Boolean(readiness) || isReadinessLoading || readinessStatus === 'error');
    const alreadySentForDraft = viewedEventForDraftRef.current === draftId;
    if (isVisible && !alreadySentForDraft) {
      logReadinessEvent('ui_readiness_card_viewed', {
        draftId,
        rating: readiness?.rating,
      });
      viewedEventForDraftRef.current = draftId;
    }
  }, [ENABLE_DRAFT_READINESS, draftId, readiness, isReadinessLoading, readinessStatus]);

  useEffect(() => {
    if (!draftId || !readiness?.rating || readinessFeatureDisabled) return;
    const key = `${draftId}:${readiness.rating}:${readiness.evaluatedAt ?? ''}`;
    if (readinessPersistedRef.current === key) return;

    let cancelled = false;

    const persistReadiness = async () => {
      try {
        const { data, error } = await supabase
          .from('cover_letters')
          .select('analytics')
          .eq('id', draftId)
          .maybeSingle();

        if (cancelled || error || !data) {
          return;
        }

        const analytics =
          data.analytics && typeof data.analytics === 'object'
            ? (data.analytics as Record<string, unknown>)
            : {};

        const nextAnalytics = {
          ...analytics,
          readiness: readiness.rating,
          readinessScoreBreakdown: readiness.scoreBreakdown ?? null,
          readinessEvaluatedAt: readiness.evaluatedAt ?? new Date().toISOString(),
        };

        const { error: updateError } = await supabase
          .from('cover_letters')
          .update({
            analytics: nextAnalytics,
            updated_at: new Date().toISOString(),
          })
          .eq('id', draftId);

        if (!cancelled && !updateError) {
          readinessPersistedRef.current = key;
        }
      } catch (error) {
        console.warn('[MatchMetricsToolbar] Failed to persist readiness:', error);
      }
    };

    persistReadiness();

    return () => {
      cancelled = true;
    };
  }, [draftId, readiness?.rating, readiness?.evaluatedAt, readiness?.scoreBreakdown, readinessFeatureDisabled]);

  // Schedule telemetry logging on TTL expiry (data refetch handled by hook)
  useEffect(() => {
    // Clear previous timer
    if (ttlTimerId) {
      clearTimeout(ttlTimerId);
      setTtlTimerId(null);
    }
    if (!ENABLE_DRAFT_READINESS || !readiness?.ttlExpiresAt || !draftId) {
      return;
    }
    const now = Date.now();
    const ttlMs = new Date(readiness.ttlExpiresAt).getTime() - now;
    const delay = Math.max(1000, ttlMs); // at least 1s
    const id = window.setTimeout(() => {
      // Telemetry: TTL-based auto-refresh tick
      logReadinessEvent('ui_readiness_auto_refresh_tick', { draftId });
    }, delay);
    setTtlTimerId(id);
    return () => {
      clearTimeout(id);
    };
  }, [readiness?.ttlExpiresAt, draftId, ENABLE_DRAFT_READINESS]);
  const { goalMatches, goalsSummary, coreRequirements, preferredRequirements, goalsComparisonReady } = useMatchMetricsDetails({
    jobDescription,
    enhancedMatchData,
    goNoGoAnalysis,
  });

  // Prefer A-phase requirement analysis (JD vs user background) during Fit check and while draft metrics are still loading.
  const aPhaseRequirementAnalysis = aPhaseInsights?.requirementAnalysis;
  const hasAPhaseRequirementAnalysis = Boolean(aPhaseRequirementAnalysis);
  const effectiveCoreRequirements = useMemo<RequirementDisplayItem[]>(() => {
    const preferAPhase = mode === 'goNoGo' || mode === 'fitCheck' || isLoading;
    if (preferAPhase && aPhaseRequirementAnalysis?.coreRequirements) {
      return aPhaseRequirementAnalysis.coreRequirements.map((r) => ({
        id: String(r.id),
        requirement: r.text,
        demonstrated: Boolean(r.met),
        evidence: r.evidence,
      }));
    }
    return coreRequirements.list;
  }, [aPhaseRequirementAnalysis?.coreRequirements, coreRequirements.list, isLoading, mode]);

  const effectivePreferredRequirements = useMemo<RequirementDisplayItem[]>(() => {
    const preferAPhase = mode === 'goNoGo' || mode === 'fitCheck' || isLoading;
    if (preferAPhase && aPhaseRequirementAnalysis?.preferredRequirements) {
      return aPhaseRequirementAnalysis.preferredRequirements.map((r) => ({
        id: String(r.id),
        requirement: r.text,
        demonstrated: Boolean(r.met),
        evidence: r.evidence,
      }));
    }
    return preferredRequirements.list;
  }, [aPhaseRequirementAnalysis?.preferredRequirements, preferredRequirements.list, isLoading, mode]);

  const coreMet = effectiveCoreRequirements.filter((r) => r.demonstrated).length;
  const coreTotal = effectiveCoreRequirements.length;
  const prefMet = effectivePreferredRequirements.filter((r) => r.demonstrated).length;
  const prefTotal = effectivePreferredRequirements.length;

  const readinessScore = useMemo(() => {
    if (!readiness?.rating) return null;
    switch (readiness.rating) {
      case 'exceptional':
        return 4;
      case 'strong':
        return 3;
      case 'adequate':
        return 2;
      case 'weak':
      default:
        return 1;
    }
  }, [readiness?.rating]);

  const refreshStartMs = refreshStartedAt ? Date.parse(refreshStartedAt) : null;
  const isStagePending = (completedAt?: string) => {
    if (!isRefreshLoading) return false;
    if (!refreshStartMs || !Number.isFinite(refreshStartMs)) return true;
    if (!completedAt) return true;
    const completedMs = Date.parse(completedAt);
    if (!Number.isFinite(completedMs)) return true;
    return completedMs < refreshStartMs;
  };

  const contentStandardsOverallScore = contentStandards?.aggregated?.overallScore ?? null;
  const overallStageStatus = phaseBStatus?.status;
  const overallPending =
    overallStageStatus === 'pending' ||
    (!overallStageStatus && isStagePending(phaseBStatus?.completedAt ?? undefined));
  const overallError =
    overallStageStatus === 'error' ||
    phaseBStatus?.contentStandards?.status === 'error' ||
    phaseBStatus?.basicMetrics?.status === 'error';
  const overallScoreValue = overallError ? null : contentStandardsOverallScore ?? metrics.overallScore ?? null;

  const hasMalformedGapPayload = useMemo(() => {
    const insights = enhancedMatchData?.sectionGapInsights;
    return Array.isArray(insights) && insights.length > 0 && insights.some((insight) => !isStructuredSectionGapInsight(insight));
  }, [enhancedMatchData?.sectionGapInsights]);

  const contentStandardsCriteria = useMemo(() => {
    if (!contentStandards?.aggregated?.standards) return null;
    return contentStandards.aggregated.standards.map((standard) => {
      const config = getStandardConfig(standard.standardId);
      return {
        id: standard.standardId,
        label: config?.label || standard.standardId,
        met: standard.status === 'met',
        evidence: standard.evidence,
      };
    });
  }, [contentStandards?.aggregated?.standards]);

  const previousSnapshotRef = useRef<{
    draftId: string;
    overallScore: number | null;
    coreMet: number;
    prefMet: number;
    readinessScore: number | null;
    updatedAt?: string | null;
    capturedAt?: string;
  } | null>(null);
  const [metricDeltas, setMetricDeltas] = useState<{
    overallScore?: number;
    coreMet?: number;
    prefMet?: number;
    readiness?: number;
  } | null>(null);

  useEffect(() => {
    if (!draftId) return;
    const storageKey = `coverLetter:metrics-snapshot:${draftId}`;
    if (!previousSnapshotRef.current) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          previousSnapshotRef.current = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('[MatchMetricsToolbar] Failed to restore metric snapshot:', error);
      }
    }
    const current = {
      draftId,
      overallScore: overallScoreValue,
      coreMet,
      prefMet,
      readinessScore,
      updatedAt: draftUpdatedAt ?? null,
      capturedAt: new Date().toISOString(),
    };

    const previous = previousSnapshotRef.current;
    if (previous && previous.draftId === draftId) {
      const deltas: {
        overallScore?: number;
        coreMet?: number;
        prefMet?: number;
        readiness?: number;
      } = {};
      const shouldCompareByUpdatedAt =
        Boolean(previous.updatedAt) &&
        Boolean(current.updatedAt) &&
        previous.updatedAt !== current.updatedAt;

      if (!shouldCompareByUpdatedAt && previous.updatedAt && current.updatedAt) {
        setMetricDeltas(null);
        previousSnapshotRef.current = current;
        try {
          localStorage.setItem(storageKey, JSON.stringify(current));
        } catch (error) {
          console.warn('[MatchMetricsToolbar] Failed to persist metric snapshot:', error);
        }
        return;
      }

      if (previous.overallScore !== null && current.overallScore !== null) {
        const delta = current.overallScore - previous.overallScore;
        if (delta !== 0) deltas.overallScore = delta;
      }

      const coreDelta = current.coreMet - previous.coreMet;
      if (coreDelta !== 0) deltas.coreMet = coreDelta;

      const prefDelta = current.prefMet - previous.prefMet;
      if (prefDelta !== 0) deltas.prefMet = prefDelta;

      if (previous.readinessScore !== null && current.readinessScore !== null) {
        const delta = current.readinessScore - previous.readinessScore;
        if (delta !== 0) deltas.readiness = delta;
      }

      setMetricDeltas(Object.keys(deltas).length > 0 ? deltas : null);
    } else {
      setMetricDeltas(null);
    }

    previousSnapshotRef.current = current;
    try {
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch (error) {
      console.warn('[MatchMetricsToolbar] Failed to persist metric snapshot:', error);
    }
  }, [draftId, draftUpdatedAt, overallScoreValue, coreMet, prefMet, readinessScore]);

  // Normalize section types to handle variations
  const normalizeSectionType = (sectionType: string): string[] => {
    const aliases: Record<string, string[]> = {
      'introduction': ['introduction', 'intro', 'opening'],
      'experience': ['experience', 'exp', 'background', 'body', 'paragraph'],
      'closing': ['closing', 'conclusion', 'closer'],
      'signature': ['signature', 'signoff'],
    };

    const lowerType = sectionType.toLowerCase();
    const typeMapping: Record<string, string> = {
      'intro': 'introduction',
      'paragraph': 'experience',
      'closer': 'closing',
    };

    const mappedType = typeMapping[lowerType] || lowerType;

    for (const [canonical, variations] of Object.entries(aliases)) {
      if (canonical === mappedType || variations.includes(mappedType) || variations.includes(lowerType)) {
        return variations;
      }
    }

    return [mappedType, lowerType];
  };

  // Format slug into sentence case title
  // Examples: "launched-fleet-health-monitoring-system" → "Launched fleet health monitoring system"
  //           "section-3" → "Section 3"
  //           "introduction" → "Introduction"
  const formatSectionTitle = (slug: string): string => {
    if (!slug) return 'Section';

    // Replace dashes and underscores with spaces
    const words = slug.replace(/[-_]/g, ' ').split(' ');

    // Capitalize first word only (sentence case)
    return words.map((word, index) => {
      if (index === 0) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      }
      return word.toLowerCase();
    }).join(' ');
  };

  // Collect gaps: Build directly from sectionGapInsights without requiring section matching
  // This fixes the bug where section IDs didn't match and gaps showed empty
  const allGaps = useMemo(() => {
    // Debug: Log gaps data source
    if (process.env.NODE_ENV !== 'production') {
      console.log('[MatchMetricsToolbar] Gaps debug:', {
        hasEnhancedMatchData: !!enhancedMatchData,
        enhancedMatchDataKeys: enhancedMatchData ? Object.keys(enhancedMatchData) : [],
        hasSectionGapInsights: !!enhancedMatchData?.sectionGapInsights,
        sectionGapInsightsType: typeof enhancedMatchData?.sectionGapInsights,
        sectionGapInsightsLength: enhancedMatchData?.sectionGapInsights?.length,
        sectionsLength: sections?.length,
        sectionGapInsights: enhancedMatchData?.sectionGapInsights?.map(i => ({
          sectionId: i.sectionId,
          sectionSlug: i.sectionSlug,
          gapCount: i.requirementGaps?.filter(isActionableGap).length,
        })),
      });
    }
    
    if (!enhancedMatchData?.sectionGapInsights || hasMalformedGapPayload) return [];
    
    const gaps: Array<{ sectionId: string; sectionTitle: string; gap: any }> = [];
    
    // Iterate directly over sectionGapInsights - no matching required
    enhancedMatchData.sectionGapInsights.forEach((insight, idx) => {
      const filteredGaps = (insight.requirementGaps || []).filter(isActionableGap);
      if (filteredGaps.length === 0) return;
      if (insight.sectionId && dismissedGapSectionIdSet.has(insight.sectionId)) return;
      
      // Try to find matching section for better title, but don't require it
      const matchedSection = sections?.find(s => 
        s.id === insight.sectionId || 
        normalizeSectionType(s.type).includes(insight.sectionSlug?.toLowerCase() || '')
      );
      
      // Generate section title
      const sectionTitle = matchedSection?.title || (() => {
        const slug = insight.sectionSlug?.toLowerCase() || '';
        if (slug.includes('intro')) return 'Introduction';
        if (slug.includes('clos') || slug.includes('conclusion')) return 'Closing';
        if (slug.includes('signature')) return 'Signature';
        // Use section slug formatted nicely, or fallback to "Section N"
        return formatSectionTitle(insight.sectionSlug || `Section ${idx + 1}`);
        })();
        
        // Add all gaps for this section
      filteredGaps.forEach((gap: any) => {
        gaps.push({
          sectionId: insight.sectionId || `insight-${idx}`,
          sectionTitle,
          gap,
        });
        });
    });
    
    return gaps;
  }, [enhancedMatchData?.sectionGapInsights, sections, dismissedGapSectionIdSet, hasMalformedGapPayload]);

  // Count sections with gaps - directly from sectionGapInsights (don't depend on sections array)
  const gapsCount = useMemo(() => {
    if (!enhancedMatchData?.sectionGapInsights || hasMalformedGapPayload) return 0;
    
    // Count sections that have at least one gap
    return enhancedMatchData.sectionGapInsights.filter(
      (insight) =>
        insight.requirementGaps &&
        insight.requirementGaps.filter(isActionableGap).length > 0 &&
        !(insight.sectionId && dismissedGapSectionIdSet.has(insight.sectionId))
    ).length;
  }, [enhancedMatchData?.sectionGapInsights, dismissedGapSectionIdSet, hasMalformedGapPayload]);

  // ═══════════════════════════════════════════════════════════════════════════
  // A-PHASE AVAILABILITY - check data directly (not just stageFlags)
  // ═══════════════════════════════════════════════════════════════════════════
  // MwS: Use streaming data first, then fall back to persisted draft data
  // This ensures no flicker - streaming populates during generation, draft data persists after
  const effectiveMws = aPhaseInsights?.mws || draftMws;
  const derivedMwsScore = deriveMwsSummaryScore(effectiveMws);
  const hasMwsData = derivedMwsScore !== undefined;
  // Requirements: check if JD counts exist
  const hasJdCounts = aPhaseInsights?.jdRequirementSummary?.coreTotal !== undefined || 
                      aPhaseInsights?.jdRequirementSummary?.preferredTotal !== undefined;

  // Dev-only: log A-phase data availability
  if (import.meta.env?.DEV) {
    console.log('[Toolbar] A-phase data check', {
      hasMwsData,
      mwsSummaryScore: derivedMwsScore,
      mwsFromStreaming: !!aPhaseInsights?.mws,
      mwsFromDraft: !!draftMws,
      effectiveMws,
      hasJdCounts,
      jdReqSummary: aPhaseInsights?.jdRequirementSummary,
      readinessRating: readiness?.rating,
      isLoading,
      isReadinessLoading,
    });
  }
  
  // A-phase totals for requirements (authoritative for JD totals)
  const aPhaseCoreTot = aPhaseInsights?.jdRequirementSummary?.coreTotal;
  const aPhasePrefTot = aPhaseInsights?.jdRequirementSummary?.preferredTotal;

	  const goNoGoModel = useMemo<GoNoGoModel | null>(() => {
	    return computeGoNoGoModel({
	      goalsComparisonReady,
	      goalsSummaryPercentage: goalsSummary.percentage ?? 0,
	      goalMatches,
	      hasAPhaseRequirementAnalysis,
	      mwsAvailable: hasMwsData,
	      mwsSummaryScore: hasMwsData ? (derivedMwsScore ?? 0) : 0,
	      effectiveCoreRequirements,
	      effectivePreferredRequirements,
	    });
	  }, [
	    effectiveCoreRequirements,
	    effectivePreferredRequirements,
	    derivedMwsScore,
    goalMatches,
    goalsComparisonReady,
    goalsSummary?.percentage,
    hasAPhaseRequirementAnalysis,
    hasMwsData,
  ]);

  const toolbarItems: ToolbarItem[] = useMemo(() => {
    const items: ToolbarItem[] = [];
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FINAL 7-SECTION ORDER (all titles always visible, values show loading state):
    // 1) Gaps (B-phase)
    // 2) Match with Goals (B-phase)
    // 3) Match with Strengths (A-phase)
    // 4) Core Requirements (A-phase totals → B-phase mapping)
    // 5) Preferred Requirements (A-phase totals → B-phase mapping)
    // 6) Overall Score (B-phase)
    // 7) Readiness (B-phase)
    // ═══════════════════════════════════════════════════════════════════════════
    
    if (mode === 'goNoGo') {
      items.push({
        key: 'goNoGo',
        label: 'Go/No-go',
        value: goNoGoModel ? `${goNoGoModel.decision === 'go' ? 'Go' : 'No-Go'} · ${goNoGoModel.confidence}%` : null,
        badgeClass: goNoGoModel
          ? (goNoGoModel.decision === 'go'
            ? 'border-success bg-success/10 text-success'
            : 'border-destructive bg-destructive/10 text-destructive')
          : 'border-muted bg-muted/10 text-muted-foreground',
        disabled: false,
      });
	    } else if (mode === 'full') {
	      // 1) GAPS (Phase B) - shows count when gap data is available
	      // gapsCount comes from enhancedMatchData which is B-phase, so check if it exists
      const hasGapData = enhancedMatchData?.sectionGapInsights !== undefined;
      const gapStageStatus = phaseBStatus?.sectionGaps?.status;
      const gapsPending =
        gapStageStatus === 'pending' ||
        (!gapStageStatus && isStagePending(phaseBStatus?.sectionGaps?.completedAt ?? undefined));
      const gapsError = gapStageStatus === 'error' || hasMalformedGapPayload;
      items.push({
        key: 'gaps',
        label: 'Gaps',
        value: gapsPending ? null : gapsError ? 'Unavailable' : hasGapData ? String(gapsCount) : (isLoading ? null : '—'),
        badgeClass: gapsError
          ? 'border-muted bg-muted/10 text-muted-foreground'
          : gapsCount > 0
          ? 'border-warning bg-warning/10 text-warning'
          : 'border-muted bg-muted/10 text-muted-foreground',
        disabled: false,
      });
	    }
    
    // 2) MATCH WITH GOALS (Phase A - shows as soon as goal data available)
    // Shows skeleton until goalsSummary has real data, regardless of isLoading
    const goalsValue = goalsComparisonReady
      ? (metrics.goalsMatchScore !== undefined 
        ? `${metrics.goalsMatchScore}%` 
        : `${goalsSummary.met}/${goalsSummary.total}`)
      : null;
    items.push({
      key: 'goals',
      label: 'Match with Goals',
      value: goalsValue,
      badgeClass: metrics.goalsMatchScore !== undefined 
        ? getScoreColor(metrics.goalsMatchScore) 
        : getATSScoreColor(goalsSummary.percentage),
      disabled: false,
    });
    
    // 3) MATCH WITH STRENGTHS (Phase A streaming OR persisted from draft)
    // Uses effectiveMws which prefers streaming data, falls back to persisted draft data
    const mwsScore = hasMwsData ? derivedMwsScore : undefined;
    items.push({
      key: 'strengths',
      label: 'Match with Strengths',
      value: mwsScore !== undefined ? `${mwsScore}/3` : (isLoading ? null : '—'),
      badgeClass: mwsScore !== undefined && mwsScore >= 2 
        ? 'border-success bg-success/10 text-success'
        : mwsScore === 1
        ? 'border-warning bg-warning/10 text-warning'
        : 'border-muted bg-muted/10 text-muted-foreground',
      disabled: false,
    });
    
    // 4) CORE REQUIREMENTS (A-phase totals → B-phase mapping)
    // Fit check: never show "0/12" while requirementAnalysis is still running.
    // Show skeleton until we have A-phase requirement analysis data.
    const requirementStageStatus = phaseBStatus?.requirementAnalysis?.status;
    const requirementPending =
      requirementStageStatus === 'pending' ||
      (!requirementStageStatus && isStagePending(phaseBStatus?.requirementAnalysis?.completedAt ?? undefined));
    const coreValue = requirementPending
      ? null
      : (mode === 'fitCheck' && !hasAPhaseRequirementAnalysis)
      ? null
      : hasAPhaseRequirementAnalysis
      ? `${coreMet}/${coreTotal}`
      : hasJdCounts && aPhaseCoreTot !== undefined
      ? (isLoading ? String(aPhaseCoreTot) : `${coreMet}/${aPhaseCoreTot}`)
      : (isLoading ? null : `${coreMet}/${coreTotal || 0}`);
    items.push({
        key: 'core',
        label: 'Core Requirements',
      value: coreValue,
        badgeClass: getATSScoreColor(coreTotal > 0 ? (coreMet / coreTotal) * 100 : 0),
      disabled: false,
    });
    
    // 5) PREFERRED REQUIREMENTS (A-phase totals → B-phase mapping)
    // Fit check: never show "0/5" while requirementAnalysis is still running.
    const prefValue = requirementPending
      ? null
      : (mode === 'fitCheck' && !hasAPhaseRequirementAnalysis)
      ? null
      : hasAPhaseRequirementAnalysis
      ? `${prefMet}/${prefTotal}`
      : hasJdCounts && aPhasePrefTot !== undefined
      ? (isLoading ? String(aPhasePrefTot) : `${prefMet}/${aPhasePrefTot}`)
      : (isLoading ? null : `${prefMet}/${prefTotal || 0}`);
    items.push({
        key: 'preferred',
        label: 'Pref Requirements',
      value: prefValue,
        badgeClass: getATSScoreColor(prefTotal > 0 ? (prefMet / prefTotal) * 100 : 0),
      disabled: false,
    });
    
    if (mode !== 'full') {
      return items;
    }

    // 6) OVERALL SCORE (Phase B ONLY) - shows ONLY after draft generation complete
    // Must be !isLoading AND have real score - skeleton during all of Phase A
    const hasRealScore = !isLoading && !overallPending && !overallError && overallScoreValue !== null;
        items.push({
      key: 'rating',
      label: 'Overall Score',
      value: overallPending ? null : overallError ? 'Unavailable' : hasRealScore ? `${overallScoreValue}%` : '—',
      badgeClass: hasRealScore ? getScoreColor(overallScoreValue!) : 'border-muted bg-muted/10 text-muted-foreground',
          disabled: false,
        });
    
    // 7) DRAFT READINESS (Phase B) - only if feature enabled
    // Shows skeleton until readiness data arrives (independent of isLoading)
    // Uses unified labels: Exceptional | Strong | Adequate | Needs Work
    if (ENABLE_DRAFT_READINESS && !readinessFeatureDisabled) {
      const getUnifiedLabel = (rating: 'exceptional' | 'strong' | 'adequate' | 'weak' | undefined): string | null => {
        if (!rating) return null;
        switch (rating) {
          case 'exceptional': return 'Exceptional';
          case 'strong': return 'Strong';
          case 'adequate': return 'Adequate';
          case 'weak': return 'Needs Work';
          default: return null;
        }
      };
      const readinessEvaluatedAt = readiness?.evaluatedAt ? Date.parse(readiness.evaluatedAt) : null;
      const readinessPending =
        readinessStatus === 'pending' ||
        isReadinessLoading ||
        (isRefreshLoading &&
          (!refreshStartMs ||
            !Number.isFinite(refreshStartMs) ||
            !readinessEvaluatedAt ||
            readinessEvaluatedAt < refreshStartMs));
      const readinessUnavailable = readinessStatus === 'error';
      const ratingLabel = readinessPending ? null : readinessUnavailable ? 'Unavailable' : getUnifiedLabel(readiness?.rating);
      const badgeClass =
        ratingLabel === 'Exceptional'
          ? 'border-success bg-success/10 text-success'
          : ratingLabel === 'Strong'
          ? 'border-primary bg-primary/10 text-primary'
          : ratingLabel === 'Adequate'
          ? 'border-warning bg-warning/10 text-warning'
          : 'border-muted bg-muted/10 text-muted-foreground';
      items.push({
        key: 'readiness',
        label: 'Readiness',
        value: ratingLabel, // Shows skeleton until readiness data arrives
        badgeClass,
        disabled: false,
      });
    }

    return items;
  }, [
    goalsComparisonReady,
    goalsSummary, gapsCount, isLoading, 
    overallScoreValue, metrics.goalsMatchScore,
    isPostHIL, readiness, isReadinessLoading, ENABLE_DRAFT_READINESS, 
    readinessStatus,
    readinessFeatureDisabled,
    aPhaseInsights, hasMwsData, hasJdCounts, aPhaseCoreTot, aPhasePrefTot,
    effectiveMws, draftMws, // MwS persistence: use streaming OR draft data
    effectiveCoreRequirements,
    effectivePreferredRequirements,
    hasAPhaseRequirementAnalysis,
    mode,
    goNoGoModel,
    isRefreshLoading,
    refreshStartedAt,
    phaseBStatus,
    hasMalformedGapPayload,
  ]);

  const drawerGoalMatches = goalMatches;
  const drawerCoreRequirements = effectiveCoreRequirements;
  const drawerPreferredRequirements = effectivePreferredRequirements;

  // During streaming: multiple accordions can be open (Set)
  // After draft ready: single accordion mode (only one open at a time)
  const [openAccordions, setOpenAccordions] = useState<Set<MetricKey>>(new Set());
  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);

  // Track which sections have been auto-opened during streaming
  const autoOpenedSectionsRef = useRef<Set<MetricKey>>(new Set());
  // Track previous loading state to detect transition
  const prevLoadingRef = useRef(isLoading);

  // During streaming: auto-open accordions as their data arrives (all stay open)
  useEffect(() => {
    if (!isLoading) return;
    // Fit check should be user-controlled (and single-open); don't auto-open drawers.
    if (mode === 'fitCheck') return;
    
    // A-phase accordions to auto-open when data arrives
    const streamingAccordions: MetricKey[] = mode === 'goNoGo'
      ? ['goNoGo', 'core', 'preferred', 'strengths', 'goals']
      : ['core', 'preferred', 'strengths', 'goals'];
    
    for (const key of streamingAccordions) {
      const item = toolbarItems.find(i => i.key === key);
      // Auto-open when data arrives and not already open
      if (item && item.value !== null && !autoOpenedSectionsRef.current.has(key)) {
        setOpenAccordions(prev => new Set([...prev, key]));
        autoOpenedSectionsRef.current.add(key);
      }
    }
  }, [isLoading, mode, toolbarItems]);

  // When loading completes: collapse all accordions back to single mode
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      // Fit check supports multi-expand even after loading completes.
      if (layout === 'horizontal' && mode === 'fitCheck') {
        prevLoadingRef.current = isLoading;
        return;
      }
      // Transition from loading → not loading: collapse all
      setOpenAccordions(new Set());
      setActiveMetric(null);
      autoOpenedSectionsRef.current.clear();
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading, layout, mode]);

  // Check if an accordion is open (handles both streaming and single modes)
  const isAccordionOpen = (key: MetricKey) => {
    if (layout === 'vertical' && isLoading) {
      return openAccordions.has(key);
    }
    return activeMetric === key;
  };

  const formatDelta = (value?: number, suffix = '') => {
    if (!value) return null;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}${suffix}`;
  };

  const deltaByKey: Partial<Record<MetricKey, string>> = {
    rating: formatDelta(metricDeltas?.overallScore, '%') ?? undefined,
    core: formatDelta(metricDeltas?.coreMet) ?? undefined,
    preferred: formatDelta(metricDeltas?.prefMet) ?? undefined,
    readiness: formatDelta(metricDeltas?.readiness) ?? undefined,
  };

  // Toggle accordion (respects streaming vs single mode)
  const toggleAccordion = (key: MetricKey) => {
    if (layout === 'horizontal' && mode === 'fitCheck') {
      setActiveMetric(prev => (prev === key ? null : key));
      return;
    }
    if (layout === 'vertical' && isLoading) {
      // During streaming: toggle individual accordion
      setOpenAccordions(prev => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        return next;
      });
    } else {
      // After draft ready: single accordion mode
      setActiveMetric(prev => prev === key ? null : key);
    }
  };

  const hasExpandedItem =
    (layout === 'horizontal' && mode === 'fitCheck')
      ? activeMetric !== null
      : (isLoading ? openAccordions.size > 0 : activeMetric !== null);

  if (layout === 'horizontal') {
    const fitCheckDropdown = mode === 'fitCheck';
    return (
      <div className={`w-full ${className || ''}`}>
        {fitCheckDropdown ? (
          <div className="grid grid-cols-4 gap-2">
            {toolbarItems.map((item) => {
              const isOpen = isAccordionOpen(item.key);
              const valueIsLoading = item.value === null;
              return (
                <div key={item.key} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (valueIsLoading && !isOpen) return;
                      toggleAccordion(item.key);
                    }}
                    className={`w-full rounded-2xl border px-4 h-14 flex items-center text-left transition ${
                      isOpen
                        ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black'
                        : valueIsLoading
                          ? 'fit-check-loading border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/5'
                          : 'border-border/60 bg-muted/10 hover:bg-muted/20'
                    }`}
                    aria-pressed={isOpen}
                    aria-expanded={isOpen}
                    disabled={valueIsLoading && !isOpen}
                  >
                    <div className="flex items-center justify-between gap-6 w-full">
                      <span className={`inline-flex items-center gap-2 text-xs uppercase tracking-wide ${isOpen ? 'text-white/80 dark:text-black/80' : 'text-muted-foreground'}`}>
                        <span>{item.label}</span>
                        {deltaByKey[item.key] && (
                          <span className={`${isOpen ? 'text-white/70 dark:text-black/70' : 'text-muted-foreground'}`}>
                            {deltaByKey[item.key]}
                          </span>
                        )}
                      </span>
                      {valueIsLoading ? (
                        <div className="h-5 w-16 bg-muted/50 rounded fit-check-loading" />
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className={`text-base font-semibold ${isOpen ? 'text-white dark:text-black' : 'text-foreground'}`}>
                            {item.value}
                          </span>
                          <span className={`${isOpen ? 'text-white/80 dark:text-black/80' : 'text-muted-foreground'}`}>
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </span>
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}

            {activeMetric ? (
              <div className="col-span-4">
                <div className="rounded-xl border border-border/40 bg-card shadow-sm">
                  <MetricDrawerContent
                    activeMetric={activeMetric}
                    goalMatches={drawerGoalMatches}
                    coreRequirements={drawerCoreRequirements}
                    preferredRequirements={drawerPreferredRequirements}
                    isPostHIL={isPostHIL}
                    isLoading={isLoading}
                    mode={mode}
                    metrics={metrics}
                    overallScoreValue={overallScoreValue}
                    contentStandardsCriteria={contentStandardsCriteria}
                    allGaps={allGaps}
                    aPhaseInsights={aPhaseInsights}
                    readiness={readiness ?? undefined}
                    draftMws={draftMws}
                    onEditGoals={onEditGoals}
                    onEnhanceSection={onEnhanceSection}
                    onAddMetrics={onAddMetrics}
                    sections={sections}
                    goNoGoModel={goNoGoModel ?? undefined}
                    onOpenFinalCheck={onOpenFinalCheck}
                  />
                </div>
              </div>
            ) : (
              <div className="col-span-4 text-sm text-muted-foreground py-2">
                Select a metric to see details.
              </div>
            )}
          </div>
        ) : activeMetric ? (
          <div className="mt-3 rounded-xl border border-border/40 bg-card">
            <div className="border-t" id="match-metrics-drawer">
              <MetricDrawerContent
                activeMetric={activeMetric}
                goalMatches={drawerGoalMatches}
                coreRequirements={drawerCoreRequirements}
                preferredRequirements={drawerPreferredRequirements}
                isPostHIL={isPostHIL}
                isLoading={isLoading}
                mode={mode}
                metrics={metrics}
                overallScoreValue={overallScoreValue}
                contentStandardsCriteria={contentStandardsCriteria}
                allGaps={allGaps}
                aPhaseInsights={aPhaseInsights}
                readiness={readiness ?? undefined}
                draftMws={draftMws}
                onEditGoals={onEditGoals}
                onEnhanceSection={onEnhanceSection}
                onAddMetrics={onAddMetrics}
                sections={sections}
                goNoGoModel={goNoGoModel ?? undefined}
                onOpenFinalCheck={onOpenFinalCheck}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`w-full h-full bg-card border flex flex-col ${className || ''}`}>
      <div
        className={`flex flex-col border-b md:border-b-0 transition-all duration-300 ease-in-out overflow-y-auto flex-1 min-h-0 ${
          hasExpandedItem ? 'md:w-96' : 'md:w-[12.5rem]'
        }`}
      >
        {toolbarItems.map((item, index) => {
          const isOpen = isAccordionOpen(item.key);
          const isLast = index === toolbarItems.length - 1;
          // Value is null = show skeleton animation in value position only
          const valueIsLoading = item.value === null;
          return (
            <div key={item.key} className={`flex flex-col ${index > 0 ? 'border-t border-border/30' : ''} ${isLast ? 'border-b border-border/30' : ''}`}>
                  <button
                    type="button"
                    onClick={() => {
                  // Allow closing if already open, but don't allow opening new items while value loading
                  if (valueIsLoading && !isOpen) return;
                  toggleAccordion(item.key);
                      // Telemetry: readiness accordion expanded
                  if (!isOpen && item.key === 'readiness' && draftId) {
                        logReadinessEvent('ui_readiness_card_expanded', { draftId });
                      }
                    }}
                    className={`w-full border px-3 py-2 text-left transition ${
                  isOpen
                        ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                    : valueIsLoading
                    ? 'bg-transparent border-transparent text-muted-foreground cursor-default'
                        : 'bg-transparent border-transparent hover:bg-muted/40 text-muted-foreground'
                    }`}
                aria-pressed={isOpen}
                aria-expanded={isOpen}
                disabled={valueIsLoading && !isOpen}
                  >
                    <div className="flex items-center justify-between w-full">
                  <span className={`inline-flex items-center gap-2 text-[11px] uppercase tracking-wide ${isOpen ? 'text-white dark:text-black' : 'text-muted-foreground'}`}>
                    <span>{item.label}</span>
                    {deltaByKey[item.key] && (
                      <span className={`${isOpen ? 'text-white/70 dark:text-black/70' : 'text-muted-foreground'}`}>
                        {deltaByKey[item.key]}
                      </span>
                    )}
                  </span>
                  {valueIsLoading ? (
                    // Skeleton animation for value only
                    <div className="h-5 w-12 bg-muted/50 rounded animate-pulse" />
                  ) : item.key === 'gaps' ? (
                    // Gaps: same font-size as others (text-base) with warning icon inline
                    <span className={`inline-flex items-center gap-1 text-base font-semibold ${isOpen ? 'text-white dark:text-black' : ''}`}>
                      <AlertTriangle className={`h-4 w-4 ${item.badgeClass?.includes('warning') ? 'text-warning' : 'text-muted-foreground'}`} />
                      <span className={item.badgeClass?.includes('warning') ? 'text-warning' : 'text-foreground'}>{item.value}</span>
                    </span>
                  ) : (
                    <span className={`text-base font-semibold ${isOpen ? 'text-white dark:text-black' : 'text-foreground'}`}>
                      {item.value}
                    </span>
                  )}
                    </div>
                  </button>
                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                {isOpen && (
                  <div className="border-t border-b" id="match-metrics-drawer">
                        <MetricDrawerContent
                      activeMetric={item.key}
                          goalMatches={drawerGoalMatches}
                          coreRequirements={drawerCoreRequirements}
                          preferredRequirements={drawerPreferredRequirements}
                          isPostHIL={isPostHIL}
                      isLoading={isLoading}
                          mode={mode}
                          metrics={metrics}
                          overallScoreValue={overallScoreValue}
                          contentStandardsCriteria={contentStandardsCriteria}
                          allGaps={allGaps}
                          aPhaseInsights={aPhaseInsights}
                          readiness={readiness ?? undefined}
                      draftMws={draftMws}
                          onEditGoals={onEditGoals}
                          onEnhanceSection={onEnhanceSection}
                          onAddMetrics={onAddMetrics}
                          sections={sections}
                          goNoGoModel={goNoGoModel ?? undefined}
                          onOpenFinalCheck={onOpenFinalCheck}
                        />
                      </div>
                    )}
                  </div>
            </div>
          );
        })}
      </div>
      {onRefreshInsights && (
        <div className="border-t border-border/40 p-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onRefreshInsights}
            disabled={isRefreshLoading || isRefreshDisabled}
          >
            {isRefreshLoading ? 'Refreshing…' : 'Refresh insights'}
          </Button>
        </div>
      )}
    </div>
  );
}

interface MetricDrawerContentProps {
  activeMetric: MetricKey;
  goalMatches: GoalMatchDisplay[];
  coreRequirements: RequirementDisplayItem[];
  preferredRequirements: RequirementDisplayItem[];
  isPostHIL: boolean;
  isLoading: boolean;
  mode: 'full' | 'goNoGo' | 'fitCheck';
  metrics: MatchMetricsData;
  overallScoreValue: number | null;
  contentStandardsCriteria: CoverLetterCriterion[] | null;
  allGaps: Array<{ sectionId: string; sectionTitle: string; gap: any }>;
  aPhaseInsights?: APhaseInsights;
  readiness?: DraftReadinessEvaluation;
  goNoGoModel?: GoNoGoModel;
  // Persisted MwS from draft (fallback when streaming not available)
  draftMws?: {
    summaryScore: 0 | 1 | 2 | 3;
    details: Array<{
      label: string;
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
  onEditGoals?: () => void;
  onEnhanceSection?: (sectionId: string, requirement?: string, ratingCriteria?: Array<{
    id: string;
    label: string;
    description: string;
    suggestion: string;
    evidence: string;
  }>) => void;
  onAddMetrics?: (sectionId?: string) => void;
  sections?: Array<{ id: string; type: string; title?: string }>;
  onOpenFinalCheck?: () => void;
}

function MetricDrawerContent({
  activeMetric,
  goalMatches,
  coreRequirements,
  preferredRequirements,
  isPostHIL,
  isLoading,
  mode,
  metrics,
  overallScoreValue,
  contentStandardsCriteria,
  allGaps,
  aPhaseInsights,
  readiness,
  goNoGoModel,
  draftMws,
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
  onOpenFinalCheck,
  sections = [],
}: MetricDrawerContentProps) {
  // Compute effectiveMws: streaming data first, then draft fallback
  const effectiveMws = aPhaseInsights?.mws || draftMws;
  const requirementsStatusContext: 'profile' | 'draft' =
    mode === 'full' && !isLoading ? 'draft' : 'profile';
  switch (activeMetric) {
    case 'goNoGo':
      return goNoGoModel ? <GoNoGoDrawerContent model={goNoGoModel} /> : (
        <div className="p-2 text-xs text-muted-foreground">Go/No-go verdict not yet available.</div>
      );
    case 'gaps':
      return <GapsDrawerContent allGaps={allGaps} onEnhanceSection={onEnhanceSection} />;
    case 'goals':
      // User-defined goals ONLY (no Role/Company - those are in Role Fit)
      return (
        <GoalsDrawerContent
          goalMatches={goalMatches}
          onEditGoals={onEditGoals}
        />
      );
    case 'strengths':
      // Match with Strengths (streaming OR persisted from draft)
      return effectiveMws ? (
        <MatchWithStrengthsDrawerContent mws={effectiveMws} />
      ) : (
        <div className="p-2 text-xs text-muted-foreground">Strengths analysis not yet available.</div>
      );
    case 'core':
      // Phase A (profile) vs Phase B (draft) are driven by mode/isLoading:
      // - Fit check (goNoGo): always profile-based evidence.
      // - Draft view: profile evidence while metrics load; draft attribution once complete.
      return (
        <RequirementsDrawerContent
          requirements={coreRequirements}
          showStatus
          statusContext={requirementsStatusContext}
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'preferred':
      // Phase A (profile) vs Phase B (draft) are driven by mode/isLoading.
      return (
        <RequirementsDrawerContent
          requirements={preferredRequirements}
          showStatus
          statusContext={requirementsStatusContext}
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'rating':
      // Phase B only - Overall Score only meaningful with draft context
      if (isLoading || overallScoreValue === null) {
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Overall score will be calculated once refresh completes.
          </div>
        );
      }
      const displayScore = overallScoreValue;
      const displayCriteria = contentStandardsCriteria ?? metrics.ratingCriteria;
      return (
        <CoverLetterRatingInsights 
          isPostHIL={isPostHIL} 
          overallScore={displayScore} 
          criteria={displayCriteria}
          showStatus={true} // Always show status in Phase B (draft exists)
        />
      );
    case 'readiness':
      return readiness ? (
        <ReadinessDrawerContent
          readiness={readiness}
          onOpenFinalCheck={onOpenFinalCheck}
        />
      ) : (
        <div className="p-2 text-xs text-muted-foreground">Readiness verdict unavailable.</div>
      );
    case 'ats':
    default:
      return <ATSScoreInsights isPostHIL={isPostHIL} score={metrics.atsScore ?? 0} />;
  }
}

function GoNoGoDrawerContent({ model }: { model: GoNoGoModel }) {
  const summaryClass =
    model.decision === 'go'
      ? 'border-success bg-success/10 text-success'
      : 'border-destructive bg-destructive/10 text-destructive';

  const sortedReasons = useMemo(() => {
    const rank = (sev: 'high' | 'medium' | 'low') => (sev === 'high' ? 0 : sev === 'medium' ? 1 : 2);
    return [...model.reasons].sort((a, b) => rank(a.severity) - rank(b.severity));
  }, [model.reasons]);

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${summaryClass}`}>
          <span>{model.decision === 'go' ? 'Go' : 'No-Go'}</span>
          <span className="opacity-80">·</span>
          <span>{model.confidence}%</span>
        </div>
        <span className="text-xs uppercase tracking-wide text-muted-foreground">Phase A</span>
      </div>

      <div className="rounded-lg border border-border/40 bg-background">
        {sortedReasons.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">No blockers detected.</div>
        ) : (
          sortedReasons.map((r, idx) => (
            <div key={`${r.label}-${idx}`} className={`${idx > 0 ? 'border-t border-border/30' : ''} p-3`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">{r.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{r.detail}</div>
                </div>
                <span className={`text-xs font-semibold ${
                  r.severity === 'high'
                    ? 'text-destructive'
                    : r.severity === 'medium'
                    ? 'text-warning'
                    : 'text-muted-foreground'
                }`}>
                  {r.severity.toUpperCase()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface RequirementsDrawerContentProps {
  requirements: RequirementDisplayItem[];
  showStatus?: boolean; // Phase A = false (simple list), Phase B = true (with status)
  statusContext?: 'profile' | 'draft';
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
  onAddMetrics?: (sectionId?: string) => void;
}

function RequirementsDrawerContent({
  requirements,
  showStatus = true,
  statusContext = 'draft',
  onEnhanceSection,
  onAddMetrics,
}: RequirementsDrawerContentProps) {
  if (!requirements.length) {
    return (
      <div className="p-2 text-xs text-muted-foreground">
        No requirements detected yet.
        </div>
    );
  }

  // Phase A: Simple list (like MwS) - just requirement text, NO truncation
  if (!showStatus) {
    // Debug: Check if text is truncated from source
    if (process.env.NODE_ENV !== 'production' && requirements.length > 0) {
      console.log('[Requirements] Phase A text check:', requirements.slice(0, 3).map(r => ({
        id: r.id,
        text: r.requirement,
        length: r.requirement?.length,
        endsWithEllipsis: r.requirement?.endsWith('...'),
      })));
    }
    return (
            <div>
        {requirements.map((req, index) => (
          <div 
            key={req.id} 
            className={`p-2 ${index > 0 ? 'border-t border-border/30' : ''}`}
          >
            <p 
              className="text-sm font-medium text-foreground"
              style={{ 
                wordBreak: 'break-word', 
                overflowWrap: 'anywhere',
                textOverflow: 'clip',
                overflow: 'visible',
                whiteSpace: 'pre-wrap', // Use pre-wrap to preserve whitespace while wrapping
                display: 'block',
                width: '100%',
              }}
            >
              {/* DEBUG: Check if text contains ellipsis */}
              {(() => {
                if (process.env.NODE_ENV !== 'production' && req.requirement?.includes('...')) {
                  console.warn('[TRUNCATION] Text contains "..." from source:', req.requirement);
                }
                return req.requirement;
              })()}
            </p>
            </div>
        ))}
      </div>
    );
  }

  // Phase B: Full list with status and actions
  return (
    <div>
      {requirements.map((req, index) => (
        <div
          key={req.id}
          className={`p-2 flex items-center gap-2 ${index > 0 ? 'border-t border-border/30' : ''}`}
        >
          <div className="flex-1 min-w-0">
            <div className="mb-1.5">
              <h4 className="text-sm font-medium text-foreground">{req.requirement}</h4>
            </div>
            <div className="text-xs">
              <div>
                <span className="font-medium text-foreground/90">Status:</span>{' '}
                <span className={`${req.demonstrated ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                  {req.evidence ||
                    (statusContext === 'profile'
                      ? (req.demonstrated ? 'Supported by your background' : 'Not supported by your background')
                      : (req.demonstrated ? 'Mentioned in draft' : 'Not mentioned in draft'))}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 p-2 flex items-center gap-2">
            <StatusIcon met={req.demonstrated} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GOALS DRAWER (User-defined goals ONLY - no Role/Company)
// ═══════════════════════════════════════════════════════════════════════════
interface GoalsDrawerContentProps {
  goalMatches: GoalMatchDisplay[];
  onEditGoals?: () => void;
}

function GoalsDrawerContent({ goalMatches, onEditGoals }: GoalsDrawerContentProps) {
  const hasAnyGoals = goalMatches.some(
    (match) =>
      match.userValue !== null &&
      match.userValue !== undefined &&
      match.emptyState !== 'goal-not-set',
  );

  const sortedMatches = useMemo(() => {
    return [...goalMatches].sort((a, b) => {
      if (a.emptyState === 'goal-not-set' && b.emptyState !== 'goal-not-set') return 1;
      if (b.emptyState === 'goal-not-set' && a.emptyState !== 'goal-not-set') return -1;
      if (a.met && !b.met) return -1;
      if (!a.met && b.met) return 1;
      return 0;
    });
  }, [goalMatches]);

  if (!hasAnyGoals) {
    return (
      <div className="space-y-3">
        <GoalMatchCard goalType="Career Goals" emptyState="no-goals" onEditGoals={onEditGoals} />
      </div>
    );
  }

  return (
    <div>
      {sortedMatches.map((match, index) => (
        <div key={match.id} className={index > 0 ? 'border-t border-border/30' : ''}>
          <GoalMatchCard
            goalType={match.goalType}
            userValue={match.userValue}
            jobValue={match.jobValue}
            met={match.met}
            matchState={match.matchState}
            evidence={match.evidence}
            requiresManualVerification={match.requiresManualVerification}
            emptyState={match.emptyState}
            onEditGoals={onEditGoals}
          />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Match with Strengths Drawer (Phase A)
// ═══════════════════════════════════════════════════════════════════════════
interface MatchWithStrengthsDrawerContentProps {
  mws: {
    summaryScore: 0 | 1 | 2 | 3;
    details: Array<{
      label: string;
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
}

function MatchWithStrengthsDrawerContent({ mws }: MatchWithStrengthsDrawerContentProps) {
  // EXACT COPY of RequirementsDrawerContent layout (lines 766-787)
  return (
    <div>
      {mws.details && mws.details.length > 0 ? (
        mws.details.map((detail, index) => (
          <div
            key={index}
            className={`p-2 flex items-center gap-2 ${index > 0 ? 'border-t border-border/30' : ''}`}
          >
            <div className="flex-1 min-w-0">
              <div className="mb-1.5">
                <h4 className="text-sm font-medium text-foreground">{detail.label}</h4>
              </div>
              <div className="text-xs">
                <span className="text-foreground/80">
                  {detail.explanation}
                </span>
              </div>
            </div>
            <div className="flex-shrink-0 p-2 flex items-center gap-2">
              <StatusIcon met={detail.strengthLevel === 'strong' || detail.strengthLevel === 'moderate'} />
            </div>
          </div>
        ))
      ) : (
        <div className="p-2 text-xs text-muted-foreground">
          No matching strengths identified yet.
        </div>
      )}
    </div>
  );
}

interface GapsDrawerContentProps {
  allGaps: Array<{ sectionId: string; sectionTitle: string; gap: any }>;
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
}

function GapsDrawerContent({ allGaps, onEnhanceSection }: GapsDrawerContentProps) {
  if (!allGaps.length) {
    return (
      <div className="p-2 flex items-center gap-2">
        <div className="flex-shrink-0 p-2 flex items-center">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <h4 className="text-sm font-medium text-foreground">No gaps</h4>
          </div>
          <div className="text-xs">
            <div>
              <span className="text-muted-foreground">No gaps detected</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Group gaps by section ID (not title) to keep each section separate
  const gapsBySection = useMemo(() => {
    const grouped: Record<string, Array<{ sectionId: string; sectionTitle: string; gap: any }>> = {};
    allGaps.forEach((item) => {
      // Use sectionId as the key to keep each section separate
      if (!grouped[item.sectionId]) {
        grouped[item.sectionId] = [];
      }
      grouped[item.sectionId].push(item);
    });
    return grouped;
  }, [allGaps]);

  const formatGapLabel = (gap: any) => {
    const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
    const toIssueFallback = (value?: string) => {
      const raw = String(value || '').trim();
      if (!raw) return null;
      const cleaned = raw.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
      if (!cleaned) return null;
      const lower = cleaned.toLowerCase();
      if (lower.startsWith('missing ') || lower.startsWith('lacks ') || lower.startsWith('weak ') || lower.startsWith('no ') || lower.startsWith('low ')) {
        return capitalize(cleaned);
      }
      return `Missing ${lower}`;
    };
    const issue = typeof gap?.issue === 'string' ? gap.issue.trim() : '';
    const issueLooksValid = issue.length > 0 && issue.length <= 80 && /^(missing|lacks|weak|no|low)/i.test(issue);
    if (issueLooksValid) return capitalize(issue.replace(/\s+/g, ' ').trim());
    return (
      toIssueFallback(gap?.rubricCriterionId) ||
      toIssueFallback(gap?.label) ||
      toIssueFallback(gap?.requirement) ||
      'Missing requirement'
    );
  };

  return (
    <div>
      {Object.entries(gapsBySection).map(([sectionId, sectionGaps], sectionIndex) => {
        // Get section title from first gap item (all gaps in a group have the same title)
        const sectionTitle = sectionGaps[0]?.sectionTitle || 'Section';
        return (
          <div key={sectionId} className={sectionIndex > 0 ? 'border-t border-border/30' : ''}>
            <div className="p-2">
              <h4 className="text-sm font-medium text-foreground mb-2">{sectionTitle}</h4>
            <div className="space-y-2">
              {sectionGaps.map((item, gapIndex) => (
                <div
                  key={item.gap.id || `gap-${gapIndex}`}
                  className="text-xs"
                >
                  <div>
                    <span className="font-medium text-foreground/90">
                      {formatGapLabel(item.gap)}:
                    </span>{' '}
                    <span className="text-foreground/80">
                      {item.gap.rationale || item.gap.description || 'Not explicitly mentioned in current draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}

interface ReadinessDrawerContentProps {
  readiness: DraftReadinessEvaluation;
  onOpenFinalCheck?: () => void;
}

function ReadinessDrawerContent({ readiness, onOpenFinalCheck }: ReadinessDrawerContentProps) {
  // Convert legacy rating to unified display label
  const getDisplayLabel = (rating: DraftReadinessEvaluation['rating']): string => {
    switch (rating) {
      case 'exceptional': return 'Exceptional';
      case 'strong': return 'Strong';
      case 'adequate': return 'Adequate';
      case 'weak': return 'Needs Work';
    }
  };
  
  // Convert legacy dimension strength to unified display label
  const getDimensionLabel = (strength: 'strong' | 'sufficient' | 'insufficient'): string => {
    switch (strength) {
      case 'strong': return 'Strong';
      case 'sufficient': return 'Adequate';
      case 'insufficient': return 'Needs Work';
    }
  };

  const ratingLabel = getDisplayLabel(readiness.rating);
  
  // Badge colors based on unified labels
  const getBadgeClass = (label: string) => {
    switch (label) {
      case 'Exceptional':
        return 'border-success bg-success/10 text-success';
      case 'Strong':
        return 'border-primary bg-primary/10 text-primary';
      case 'Adequate':
        return 'border-warning bg-warning/10 text-warning';
      case 'Needs Work':
      default:
        return 'border-muted bg-muted/10 text-muted-foreground';
    }
  };

  // 4 editorial dimensions (non-duplicative with Score)
  // Score = writing craft, Readiness = high-level editorial verdict
  const rows: Array<{ key: keyof DraftReadinessEvaluation['scoreBreakdown']; label: string }> = [
    { key: 'narrativeCoherence', label: 'Narrative coherence' },
    { key: 'persuasivenessEvidence', label: 'Persuasiveness & evidence' },
    { key: 'roleRelevance', label: 'Role relevance' },
    { key: 'professionalPolish', label: 'Professional polish' },
  ];

  // Determine if dimension is "passing" (Exceptional/Strong = check, others = X)
  const isDimensionPassing = (value: string) => value === 'strong';
  
  // Detect short draft
  const isShortDraft = readiness.feedback?.summary?.toLowerCase().includes('too short');
  const ratingValue = String(readiness.rating ?? '').toLowerCase();
  const showFinalCheckCta = ratingValue === 'strong';
  const canOpenFinalCheck = typeof onOpenFinalCheck === 'function';

  return (
    <div className="p-2 space-y-3">
      {showFinalCheckCta && (
        <div className="border-b border-border/30 pb-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span className="text-foreground/90">
              <span className="font-semibold text-foreground">Final check</span>: for risk and clarity (2–3 edits max)
            </span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              onClick={onOpenFinalCheck}
              disabled={!canOpenFinalCheck}
            >
              Run Final Check
            </Button>
          </div>
        </div>
      )}
      {isShortDraft && (
        <h4 className="text-sm font-medium text-foreground">
          Draft too short for full evaluation (150 words required)
        </h4>
      )}
      {!isShortDraft && readiness.feedback?.summary && (
        <div className="text-xs text-foreground/80">{readiness.feedback.summary}</div>
      )}
      <div className="border-t border-border/30 pt-2">
        <h4 className="text-sm font-medium text-foreground mb-2">Editorial Dimensions</h4>
        <ul className="list-disc pl-5 space-y-1">
          {rows.map((row) => {
            const value = readiness.scoreBreakdown[row.key];
            const passing = isDimensionPassing(value);
            return (
              <li key={row.key} className="text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/90">{row.label}</span>
                  <StatusIcon met={passing} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      {Array.isArray(readiness.feedback?.improvements) && readiness.feedback.improvements.length > 0 && (
        <div className="border-t border-border/30 pt-2">
          <h4 className="text-sm font-medium text-foreground mb-2">Improvements</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            {readiness.feedback.improvements.slice(0, 2).map((item, i) => (
              <li key={i} className="text-foreground/80">{item}</li>
            ))}
          </ul>
          {/* For short drafts: show note about remaining evaluation */}
          {isShortDraft && (
            <p className="text-[11px] text-muted-foreground mt-2 italic">
              Once the draft meets the minimum length, we'll evaluate the remaining issues.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
