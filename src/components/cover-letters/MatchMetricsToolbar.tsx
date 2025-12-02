import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HelpCircle, AlertTriangle } from 'lucide-react';
import { GoalMatchCard } from './GoalMatchCard';
import { CoverLetterRatingInsights } from './CoverLetterRatingTooltip';
import { ATSScoreInsights } from './ATSScoreTooltip';
import { StatusIcon } from './StatusIcon';
import {
  getATSScoreColor,
  getScoreColor,
  useMatchMetricsDetails,
  type GoalMatchDisplay,
  type GoNoGoAnalysis,
  type MatchMetricsData,
  type MatchJobDescription,
  type RequirementDisplayItem,
} from './useMatchMetricsDetails';
import type { EnhancedMatchData, DraftReadinessEvaluation } from '@/types/coverLetters';
import type { APhaseInsights } from '@/types/jobs';
import { isDraftReadinessEnabled } from '@/lib/flags';
import { logReadinessEvent } from '@/lib/telemetry';
import { useDraftReadiness } from '@/hooks/useDraftReadiness';

type MetricKey = 'gaps' | 'goals' | 'strengths' | 'core' | 'preferred' | 'rating' | 'readiness';

interface MatchMetricsToolbarProps {
  metrics: MatchMetricsData;
  className?: string;
  isPostHIL?: boolean;
  isLoading?: boolean;
  goNoGoAnalysis?: GoNoGoAnalysis;
  jobDescription?: MatchJobDescription;
  enhancedMatchData?: EnhancedMatchData;
  sections?: Array<{ id: string; type: string; title?: string }>;
  aPhaseInsights?: APhaseInsights; // Task 7: A-phase streaming insights
  draftId?: string;
  draftUpdatedAt?: string;
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
}

interface ToolbarItem {
  key: MetricKey;
  label: string;
  value: string | null; // null = show skeleton animation
  badgeClass: string;
  disabled?: boolean;
}

export function MatchMetricsToolbar({
  metrics,
  className,
  isPostHIL = false,
  isLoading = false,
  goNoGoAnalysis,
  jobDescription,
  enhancedMatchData,
  sections = [],
  aPhaseInsights,
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
  draftId,
  draftUpdatedAt,
  draftMws,
}: MatchMetricsToolbarProps) {
  // Task 5: Dev-only A-phase props logging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[A-PHASE] MatchMetricsToolbar received', {
      hasAPhaseInsights: !!aPhaseInsights,
      aPhaseStageFlags: aPhaseInsights?.stageFlags,
      isLoading,
    });
  }
  
  const ENABLE_DRAFT_READINESS = isDraftReadinessEnabled();
  // Readiness fetch: enabled when feature flag is on AND draft is fully saved (!isLoading) AND draftId exists
  // The draft must be saved to the database before we can evaluate its readiness
  // Without !isLoading, the edge function returns 404 because the draft row doesn't exist yet
  const readinessFetchEnabled = ENABLE_DRAFT_READINESS && !isLoading && Boolean(draftId);
  
  const {
    data: readiness,
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
      readinessLoading,
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
  const viewedEventForDraftRef = useRef<string | null>(null);

  // Telemetry: readiness card viewed when it first appears
  useEffect(() => {
    if (!ENABLE_DRAFT_READINESS || !draftId) return;
    const isVisible = Boolean(readiness || isReadinessLoading);
    const alreadySentForDraft = viewedEventForDraftRef.current === draftId;
    if (isVisible && !alreadySentForDraft) {
      logReadinessEvent('ui_readiness_card_viewed', {
        draftId,
        rating: readiness?.rating,
      });
      viewedEventForDraftRef.current = draftId;
    }
  }, [ENABLE_DRAFT_READINESS, draftId, readiness, isReadinessLoading]);

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
  const { goalMatches, goalsSummary, coreRequirements, preferredRequirements } = useMatchMetricsDetails({
    jobDescription,
    enhancedMatchData,
    goNoGoAnalysis,
  });

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
      console.log('[Gaps] Building allGaps:', {
        hasSectionGapInsights: !!enhancedMatchData?.sectionGapInsights,
        sectionGapInsightsLength: enhancedMatchData?.sectionGapInsights?.length,
        sectionsLength: sections?.length,
        sectionGapInsights: enhancedMatchData?.sectionGapInsights?.map(i => ({
          sectionId: i.sectionId,
          sectionSlug: i.sectionSlug,
          gapCount: i.requirementGaps?.length,
        })),
      });
    }
    
    if (!enhancedMatchData?.sectionGapInsights) return [];
    
    const gaps: Array<{ sectionId: string; sectionTitle: string; gap: any }> = [];
    
    // Iterate directly over sectionGapInsights - no matching required
    enhancedMatchData.sectionGapInsights.forEach((insight, idx) => {
      if (!insight.requirementGaps || insight.requirementGaps.length === 0) return;
      
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
      insight.requirementGaps.forEach((gap: any) => {
          gaps.push({
          sectionId: insight.sectionId || `insight-${idx}`,
            sectionTitle,
            gap,
          });
        });
    });
    
    return gaps;
  }, [enhancedMatchData?.sectionGapInsights, sections]);

  // Count sections with gaps - directly from sectionGapInsights (don't depend on sections array)
  const gapsCount = useMemo(() => {
    if (!enhancedMatchData?.sectionGapInsights) return 0;
    
    // Count sections that have at least one gap
    return enhancedMatchData.sectionGapInsights.filter(
      (insight) => insight.requirementGaps && insight.requirementGaps.length > 0
    ).length;
  }, [enhancedMatchData?.sectionGapInsights]);

  // ═══════════════════════════════════════════════════════════════════════════
  // A-PHASE AVAILABILITY - check data directly (not just stageFlags)
  // ═══════════════════════════════════════════════════════════════════════════
  // MwS: Use streaming data first, then fall back to persisted draft data
  // This ensures no flicker - streaming populates during generation, draft data persists after
  const effectiveMws = aPhaseInsights?.mws || draftMws;
  const hasMwsData = effectiveMws?.summaryScore !== undefined;
  // Requirements: check if JD counts exist
  const hasJdCounts = aPhaseInsights?.jdRequirementSummary?.coreTotal !== undefined || 
                      aPhaseInsights?.jdRequirementSummary?.preferredTotal !== undefined;

  // Dev-only: log A-phase data availability
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Toolbar] A-phase data check', {
      hasMwsData,
      mwsSummaryScore: effectiveMws?.summaryScore,
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
    
    // 1) GAPS (Phase B) - shows count when gap data is available
    // gapsCount comes from enhancedMatchData which is B-phase, so check if it exists
    const hasGapData = enhancedMatchData?.sectionGapInsights !== undefined;
    items.push({
      key: 'gaps',
      label: 'Gaps',
      value: hasGapData ? String(gapsCount) : null,
      badgeClass: gapsCount > 0 ? 'border-warning bg-warning/10 text-warning' : 'border-muted bg-muted/10 text-muted-foreground',
      disabled: false,
    });
    
    // 2) MATCH WITH GOALS (Phase A - shows as soon as goal data available)
    // Shows skeleton until goalsSummary has real data, regardless of isLoading
    const hasGoalData = goalsSummary.total > 0;
    const goalsValue = hasGoalData
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
    if (hasMwsData && effectiveMws) {
      const mwsScore = effectiveMws.summaryScore;
      items.push({
        key: 'strengths',
        label: 'Match with Strengths',
        value: `${mwsScore}/3`,
        badgeClass: mwsScore !== undefined && mwsScore >= 2 
          ? 'border-success bg-success/10 text-success'
          : mwsScore === 1
          ? 'border-warning bg-warning/10 text-warning'
          : 'border-muted bg-muted/10 text-muted-foreground',
        disabled: false,
      });
    }
    
    // 4) CORE REQUIREMENTS (A-phase totals → B-phase mapping)
    const coreTotal = hasJdCounts && aPhaseCoreTot !== undefined ? aPhaseCoreTot : coreRequirements.summary.total;
    const coreMet = coreRequirements.summary.met;
    const coreValue = hasJdCounts 
      ? (isLoading ? String(coreTotal) : `${coreMet}/${coreTotal}`)
      : (isLoading ? null : `${coreMet}/${coreTotal || 0}`);
    items.push({
        key: 'core',
        label: 'Core Requirements',
      value: coreValue,
        badgeClass: getATSScoreColor(coreRequirements.summary.percentage),
      disabled: false,
    });
    
    // 5) PREFERRED REQUIREMENTS (A-phase totals → B-phase mapping)
    const prefTotal = hasJdCounts && aPhasePrefTot !== undefined ? aPhasePrefTot : preferredRequirements.summary.total;
    const prefMet = preferredRequirements.summary.met;
    const prefValue = hasJdCounts 
      ? (isLoading ? String(prefTotal) : `${prefMet}/${prefTotal}`)
      : (isLoading ? null : `${prefMet}/${prefTotal || 0}`);
    items.push({
        key: 'preferred',
        label: 'Pref Requirements',
      value: prefValue,
        badgeClass: getATSScoreColor(preferredRequirements.summary.percentage),
      disabled: false,
    });
    
    // 6) OVERALL SCORE (Phase B ONLY) - shows ONLY after draft generation complete
    // Must be !isLoading AND have real score - skeleton during all of Phase A
    const hasRealScore = !isLoading && metrics.overallScore !== undefined;
        items.push({
      key: 'rating',
      label: 'Overall Score',
      value: hasRealScore ? `${metrics.overallScore}%` : null, // Skeleton until Phase B complete
      badgeClass: hasRealScore ? getScoreColor(metrics.overallScore!) : 'border-muted bg-muted/10 text-muted-foreground',
          disabled: false,
        });
    
    // 7) DRAFT READINESS (Phase B) - only if feature enabled
    // Shows skeleton until readiness data arrives (independent of isLoading)
    // Uses unified labels: Exceptional | Strong | Adequate | Needs Work
    if (ENABLE_DRAFT_READINESS) {
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
      const ratingLabel = getUnifiedLabel(readiness?.rating);
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
    coreRequirements.summary, goalsSummary, gapsCount, isLoading, 
    metrics.overallScore, metrics.goalsMatchScore, preferredRequirements.summary, 
    isPostHIL, readiness, isReadinessLoading, ENABLE_DRAFT_READINESS, 
    aPhaseInsights, hasMwsData, hasJdCounts, aPhaseCoreTot, aPhasePrefTot,
    effectiveMws, draftMws, // MwS persistence: use streaming OR draft data
  ]);

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
    
    // A-phase accordions to auto-open when data arrives
    const streamingAccordions: MetricKey[] = ['core', 'preferred', 'strengths', 'goals'];
    
    for (const key of streamingAccordions) {
      const item = toolbarItems.find(i => i.key === key);
      // Auto-open when data arrives and not already open
      if (item && item.value !== null && !autoOpenedSectionsRef.current.has(key)) {
        setOpenAccordions(prev => new Set([...prev, key]));
        autoOpenedSectionsRef.current.add(key);
      }
    }
  }, [isLoading, toolbarItems]);

  // When loading completes: collapse all accordions back to single mode
  useEffect(() => {
    if (prevLoadingRef.current && !isLoading) {
      // Transition from loading → not loading: collapse all
      setOpenAccordions(new Set());
      setActiveMetric(null);
      autoOpenedSectionsRef.current.clear();
    }
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  // Check if an accordion is open (handles both streaming and single modes)
  const isAccordionOpen = (key: MetricKey) => {
    if (isLoading) {
      return openAccordions.has(key);
    }
    return activeMetric === key;
  };

  // Toggle accordion (respects streaming vs single mode)
  const toggleAccordion = (key: MetricKey) => {
    if (isLoading) {
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

  const hasExpandedItem = isLoading ? openAccordions.size > 0 : activeMetric !== null;

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
                  <span className={`text-[11px] uppercase tracking-wide ${isOpen ? 'text-white dark:text-black' : 'text-muted-foreground'}`}>
                        {item.label}
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
                          goalMatches={goalMatches}
                          coreRequirements={coreRequirements.list}
                          preferredRequirements={preferredRequirements.list}
                          isPostHIL={isPostHIL}
                      isLoading={isLoading}
                          metrics={metrics}
                          allGaps={allGaps}
                          aPhaseInsights={aPhaseInsights}
                          readiness={readiness ?? undefined}
                      draftMws={draftMws}
                          onEditGoals={onEditGoals}
                          onEnhanceSection={onEnhanceSection}
                          onAddMetrics={onAddMetrics}
                          sections={sections}
                        />
                      </div>
                    )}
                  </div>
            </div>
          );
        })}
      </div>
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
  metrics: MatchMetricsData;
  allGaps: Array<{ sectionId: string; sectionTitle: string; gap: any }>;
  aPhaseInsights?: APhaseInsights;
  readiness?: DraftReadinessEvaluation;
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
}

function MetricDrawerContent({
  activeMetric,
  goalMatches,
  coreRequirements,
  preferredRequirements,
  isPostHIL,
  isLoading,
  metrics,
  allGaps,
  aPhaseInsights,
  readiness,
  draftMws,
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
  sections = [],
}: MetricDrawerContentProps) {
  // Compute effectiveMws: streaming data first, then draft fallback
  const effectiveMws = aPhaseInsights?.mws || draftMws;
  switch (activeMetric) {
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
      // Phase A: simple list, Phase B: full status (when draft exists)
      return (
        <RequirementsDrawerContent
          requirements={coreRequirements}
          showStatus={!isLoading} // Show status when draft generation complete
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'preferred':
      // Phase A: simple list, Phase B: full status (when draft exists)
      return (
        <RequirementsDrawerContent
          requirements={preferredRequirements}
          showStatus={!isLoading} // Show status when draft generation complete
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'rating':
      // Phase B only - Overall Score only meaningful with draft context
      if (isLoading) {
        return (
          <div className="p-4 text-sm text-muted-foreground">
            Score criteria will be evaluated once the draft is complete.
          </div>
        );
      }
      const displayScore = metrics.overallScore ?? (isPostHIL ? 91 : 27);
      return (
        <CoverLetterRatingInsights 
          isPostHIL={isPostHIL} 
          overallScore={displayScore} 
          criteria={metrics.ratingCriteria}
          showStatus={true} // Always show status in Phase B (draft exists)
        />
      );
    case 'readiness':
      return readiness ? <ReadinessDrawerContent readiness={readiness} /> : (
        <div className="p-2 text-xs text-muted-foreground">Readiness verdict unavailable.</div>
      );
    case 'ats':
    default:
      return <ATSScoreInsights isPostHIL={isPostHIL} score={metrics.atsScore ?? 0} />;
  }
}

interface RequirementsDrawerContentProps {
  requirements: RequirementDisplayItem[];
  showStatus?: boolean; // Phase A = false (simple list), Phase B = true (with status)
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
  onAddMetrics?: (sectionId?: string) => void;
}

function RequirementsDrawerContent({
  requirements,
  showStatus = true,
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
                  {req.evidence || (req.demonstrated ? 'Mentioned in draft' : 'Not mentioned in draft')}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 p-2 flex items-center gap-2">
            <StatusIcon met={req.demonstrated} />
            {req.demonstrated && (
              <>
                {onEnhanceSection && req.section && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => onEnhanceSection(req.section!, req.requirement)}
                  >
                    Enhance
                  </Button>
                )}
                {onAddMetrics && req.section && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 text-xs"
                    onClick={() => onAddMetrics(req.section)}
                  >
                    Add Metrics
                  </Button>
                )}
              </>
            )}
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
                      {item.gap.label || item.gap.title || 'Missing requirement'}:
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
}

function ReadinessDrawerContent({ readiness }: ReadinessDrawerContentProps) {
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

  const rows: Array<{ key: keyof DraftReadinessEvaluation['scoreBreakdown']; label: string }> = [
    { key: 'clarityStructure', label: 'Clarity & Structure' },
    { key: 'opening', label: 'Compelling Opening' },
    { key: 'companyAlignment', label: 'Company Alignment' },
    { key: 'roleAlignment', label: 'Role Alignment / Level Fit' },
    { key: 'specificExamples', label: 'Specific Examples' },
    { key: 'quantifiedImpact', label: 'Quantified Impact' },
    { key: 'personalization', label: 'Personalization / Voice' },
    { key: 'writingQuality', label: 'Writing Quality' },
    { key: 'lengthEfficiency', label: 'Length & Efficiency' },
    { key: 'executiveMaturity', label: 'Executive Maturity' },
  ];

  return (
    <div className="p-2 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Verdict:</span>
        <Badge variant="outline" className={getBadgeClass(ratingLabel)}>
          {ratingLabel}
        </Badge>
      </div>
      {readiness.feedback?.summary && (
        <div className="text-xs text-foreground/80">{readiness.feedback.summary}</div>
      )}
      <div className="border-t border-border/30 pt-2">
        <h4 className="text-sm font-medium text-foreground mb-2">Score Breakdown</h4>
        <div className="space-y-1">
          {rows.map((row, idx) => {
            const value = readiness.scoreBreakdown[row.key];
            const displayLabel = getDimensionLabel(value);
            return (
              <div key={row.key} className={idx > 0 ? 'pt-1 border-t border-border/20' : ''}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/90">{row.label}</span>
                  <span className={`text-xs font-medium ${
                    displayLabel === 'Strong' ? 'text-success' :
                    displayLabel === 'Adequate' ? 'text-warning' :
                    'text-muted-foreground'
                  }`}>
                    {displayLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {Array.isArray(readiness.feedback?.improvements) && readiness.feedback.improvements.length > 0 && (
        <div className="border-t border-border/30 pt-2">
          <h4 className="text-sm font-medium text-foreground mb-2">Improvements</h4>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            {readiness.feedback.improvements.slice(0, 5).map((item, i) => (
              <li key={i} className="text-foreground/80">{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="text-[11px] text-muted-foreground">
        Advisory only; does not block finalization.
      </div>
    </div>
  );
}

