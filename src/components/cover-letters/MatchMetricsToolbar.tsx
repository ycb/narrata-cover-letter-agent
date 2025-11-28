import React, { useEffect, useMemo, useState } from 'react';
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
import { CoverLetterDraftService } from '@/services/coverLetterDraftService';
import { isDraftReadinessEnabled } from '@/lib/flags';

type MetricKey = 'gaps' | 'goals' | 'core' | 'preferred' | 'rating' | 'ats' | 'a-phase' | 'readiness';

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
  value: string;
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
}: MatchMetricsToolbarProps) {
  const ENABLE_DRAFT_READINESS = isDraftReadinessEnabled();
  const [readiness, setReadiness] = useState<DraftReadinessEvaluation | null>(null);
  const [isReadinessLoading, setIsReadinessLoading] = useState(false);
  const [ttlTimerId, setTtlTimerId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadReadiness() {
      if (!ENABLE_DRAFT_READINESS) return;
      if (!draftId) return;
      if (!isPostHIL) return;
      setIsReadinessLoading(true);
      try {
        const service = new CoverLetterDraftService();
        const result = await service.getReadinessEvaluation(draftId);
        if (!cancelled) {
          setReadiness(result);
        }
      } catch {
        if (!cancelled) setReadiness(null);
      } finally {
        if (!cancelled) setIsReadinessLoading(false);
      }
    }
    loadReadiness();
    return () => {
      cancelled = true;
    };
  }, [draftId, isPostHIL, ENABLE_DRAFT_READINESS, draftUpdatedAt]);

  // Schedule auto-refresh on TTL expiry
  useEffect(() => {
    // Clear previous timer
    if (ttlTimerId) {
      clearTimeout(ttlTimerId);
      setTtlTimerId(null);
    }
    if (!ENABLE_DRAFT_READINESS || !readiness?.ttlExpiresAt || !draftId || !isPostHIL) {
      return;
    }
    const now = Date.now();
    const ttlMs = new Date(readiness.ttlExpiresAt).getTime() - now;
    const delay = Math.max(1000, ttlMs); // at least 1s
    const id = window.setTimeout(() => {
      // trigger by updating a local state to re-run the fetch effect via draftUpdatedAt fallback
      setIsReadinessLoading(true);
      const service = new CoverLetterDraftService();
      service.getReadinessEvaluation(draftId).then(setReadiness).finally(() => {
        setIsReadinessLoading(false);
      });
    }, delay);
    setTtlTimerId(id);
    return () => {
      clearTimeout(id);
    };
  }, [readiness?.ttlExpiresAt, draftId, isPostHIL, ENABLE_DRAFT_READINESS]);
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

  // Collect gaps: count sections with gaps (not individual gap items)
  // Each section that has at least one gap counts as 1 gap
  const allGaps = useMemo(() => {
    if (!enhancedMatchData?.sectionGapInsights || !sections.length) return [];
    
    const gaps: Array<{ sectionId: string; sectionTitle: string; gap: any }> = [];
    
    // Track paragraph index for unique titles
    let paragraphIndex = 0;
    
    // For each section in the draft, check if it has gaps
    sections.forEach((section) => {
      // Try exact sectionId match first (for cover letters with multiple sections of same type)
      let sectionInsight = enhancedMatchData.sectionGapInsights?.find((insight) => {
        return insight.sectionId === section.id;
      });

      // Fall back to semantic type matching (for other content types or legacy data)
      if (!sectionInsight) {
        const normalizedTypes = normalizeSectionType(section.type);
        sectionInsight = enhancedMatchData.sectionGapInsights?.find((insight) => {
          const normalizedSlug = insight.sectionSlug.toLowerCase();
          return normalizedTypes.includes(normalizedSlug) || normalizedSlug.includes(normalizedTypes[0]);
        });
      }
      
      // If this section has gaps, add all its gaps
      if (sectionInsight && sectionInsight.requirementGaps.length > 0) {
        // Use actual section title from draft (e.g., "Body Paragraph 1" from template)
        // Fall back to generating title from type if not available
        const sectionTitle = section.title || (() => {
          const lowerType = section.type.toLowerCase();
          if (lowerType === 'intro' || lowerType === 'introduction') return 'Introduction';
          if (lowerType === 'paragraph' || lowerType === 'experience') {
            paragraphIndex++;
            return `Paragraph ${paragraphIndex}`;
          }
          if (lowerType === 'closer' || lowerType === 'closing') return 'Closing';
          if (lowerType === 'signature') return 'Signature';
          // Format slug into sentence case (e.g., "launched-fleet-health" → "Launched fleet health")
          return formatSectionTitle(sectionInsight.sectionSlug || section.type);
        })();
        
        // Add all gaps for this section
        sectionInsight.requirementGaps.forEach((gap: any) => {
          gaps.push({
            sectionId: section.id,
            sectionTitle,
            gap,
          });
        });
      } else {
        // Still increment paragraph index even if no gaps (for correct numbering)
        const lowerType = section.type.toLowerCase();
        if (lowerType === 'paragraph' || lowerType === 'experience') {
          paragraphIndex++;
        }
      }
    });
    
    return gaps;
  }, [enhancedMatchData?.sectionGapInsights, sections]);

  // Count sections with gaps (not individual gap items)
  const gapsCount = useMemo(() => {
    if (!enhancedMatchData?.sectionGapInsights || !sections.length) return 0;
    
    let count = 0;
    
    sections.forEach((section) => {
      // Try exact sectionId match first
      let sectionInsight = enhancedMatchData.sectionGapInsights?.find((insight) => {
        return insight.sectionId === section.id;
      });

      // Fall back to semantic type matching
      if (!sectionInsight) {
        const normalizedTypes = normalizeSectionType(section.type);
        sectionInsight = enhancedMatchData.sectionGapInsights?.find((insight) => {
          const normalizedSlug = insight.sectionSlug.toLowerCase();
          return normalizedTypes.includes(normalizedSlug) || normalizedSlug.includes(normalizedTypes[0]);
        });
      }
      
      // Count this section as 1 gap if it has any gaps
      if (sectionInsight && sectionInsight.requirementGaps.length > 0) {
        count++;
      }
    });
    
    return count;
  }, [enhancedMatchData?.sectionGapInsights, sections]);

  const toolbarItems = useMemo<ToolbarItem[]>(() => {
    const items: ToolbarItem[] = [];
    
    // Add Gaps item at the top if there are gaps
    if (gapsCount > 0) {
      items.push({
        key: 'gaps',
        label: 'Gaps',
        value: isLoading ? '' : String(gapsCount),
        badgeClass: 'border-warning bg-warning/10 text-warning',
        disabled: isLoading,
      });
    }
    
    // Add other items
    items.push(
      {
        key: 'goals',
        label: 'Match with Goals',
        value: isLoading ? '' : (metrics.goalsMatchScore !== undefined ? `${metrics.goalsMatchScore}%` : `${goalsSummary.met}/${goalsSummary.total}`),
        badgeClass: metrics.goalsMatchScore !== undefined ? getScoreColor(metrics.goalsMatchScore) : getATSScoreColor(goalsSummary.percentage),
        disabled: isLoading,
      },
      {
        key: 'core',
        label: 'Core Requirements',
        value: isLoading ? '' : `${coreRequirements.summary.met}/${coreRequirements.summary.total || 0}`,
        badgeClass: getATSScoreColor(coreRequirements.summary.percentage),
        disabled: isLoading,
      },
      {
        key: 'preferred',
        label: 'Pref Requirements',
        value: isLoading ? '' : `${preferredRequirements.summary.met}/${preferredRequirements.summary.total || 0}`,
        badgeClass: getATSScoreColor(preferredRequirements.summary.percentage),
        disabled: isLoading,
      },
      {
        key: 'rating',
        label: 'Overall Score',
        value: isLoading ? '' : (() => {
          // Calculate score if undefined but we have isPostHIL context
          // This matches the hardcoded criteria logic in CoverLetterRatingInsights
          // When isPostHIL=false: 3/11 criteria met (hardcoded true) = 27%
          // When isPostHIL=true: 10/11 criteria met (7 from isPostHIL + 3 hardcoded) = 91%
          if (metrics.overallScore !== undefined) {
            return `${metrics.overallScore}%`;
          }
          // Fallback calculation based on isPostHIL (matches CoverLetterRatingInsights logic)
          const calculatedScore = isPostHIL ? 91 : 27; // 10/11 or 3/11
          return `${calculatedScore}%`;
        })(),
        badgeClass: getScoreColor(metrics.overallScore ?? (isPostHIL ? 91 : 27)),
        disabled: isLoading,
      }
      // MVP: ATS Score hidden until properly implemented
      // {
      //   key: 'ats',
      //   label: 'ATS',
      //   value: isLoading ? '' : `${metrics.atsScore ?? 0}%`,
      //   badgeClass: getATSScoreColor(metrics.atsScore ?? 0),
      //   disabled: isLoading,
      // }
    );
    
    // Add A-phase insights accordion if data is present
    if (aPhaseInsights && !isLoading) {
      const { stageFlags } = aPhaseInsights;
      const hasAnyInsights = stageFlags.hasRoleInsights || 
                              stageFlags.hasMws || 
                              stageFlags.hasCompanyContext || 
                              stageFlags.hasJdRequirementSummary;
      
      if (hasAnyInsights) {
        items.push({
          key: 'a-phase',
          label: 'Analysis Insights',
          value: '⋮', // Three dots to indicate expandable content
          badgeClass: 'border-muted bg-muted/10 text-muted-foreground',
          disabled: false,
        });
      }
    }
    
    // W10: Readiness accordion
    if (ENABLE_DRAFT_READINESS && isPostHIL && (readiness || isReadinessLoading)) {
      const label = readiness?.rating
        ? readiness.rating.charAt(0).toUpperCase() + readiness.rating.slice(1)
        : '—';
      const badgeClass =
        readiness?.rating === 'exceptional'
          ? 'border-success bg-success/10 text-success'
          : readiness?.rating === 'strong'
          ? 'border-primary bg-primary/10 text-primary'
          : readiness?.rating === 'adequate'
          ? 'border-warning bg-warning/10 text-warning'
          : 'border-muted bg-muted/10 text-muted-foreground';
      items.push({
        key: 'readiness',
        label: 'Readiness',
        value: isReadinessLoading ? '' : label,
        badgeClass,
        disabled: isReadinessLoading,
      });
    }

    return items;
  }, [coreRequirements.summary, goalsSummary, gapsCount, isLoading, metrics.atsScore, metrics.overallScore, metrics.goalsMatchScore, preferredRequirements.summary, isPostHIL, readiness, isReadinessLoading, ENABLE_DRAFT_READINESS]);

  const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);

  const hasExpandedItem = activeMetric !== null;

  return (
    <div className={`w-full h-full bg-card border flex flex-col ${className || ''}`}>
      <div
        className={`flex flex-col border-b md:border-b-0 transition-all duration-300 ease-in-out overflow-y-auto flex-1 min-h-0 ${
          hasExpandedItem ? 'md:w-96' : 'md:w-48'
        }`}
      >
        {toolbarItems.map((item, index) => {
          const isActive = activeMetric === item.key;
          const isLast = index === toolbarItems.length - 1;
          return (
            <div key={item.key} className={`flex flex-col ${index > 0 ? 'border-t border-border/30' : ''} ${isLast ? 'border-b border-border/30' : ''}`}>
              {isLoading ? (
                <div className="h-14 w-full bg-muted animate-pulse" aria-hidden="true" />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveMetric(isActive ? null : item.key)}
                    className={`w-full border px-3 py-2 text-left transition ${
                      isActive
                        ? 'bg-black dark:bg-white border-black dark:border-white text-white dark:text-black'
                        : 'bg-transparent border-transparent hover:bg-muted/40 text-muted-foreground'
                    }`}
                    aria-pressed={isActive}
                    aria-expanded={isActive}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-[11px] uppercase tracking-wide ${isActive ? 'text-white dark:text-black' : 'text-muted-foreground'}`}>
                        {item.label}
                      </span>
                      {item.key === 'gaps' ? (
                        <Badge
                          variant="outline"
                          className={`${item.badgeClass} cursor-pointer hover:opacity-80 transition-opacity`}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {item.value}
                        </Badge>
                      ) : (
                        <span className={`text-base font-semibold ${isActive ? 'text-white dark:text-black' : 'text-foreground'}`}>
                          {item.value}
                        </span>
                      )}
                    </div>
                  </button>
                  <div
                    className={`overflow-hidden transition-[max-height,opacity] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                      isActive && activeMetric ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    {isActive && activeMetric && (
                      <div className="border-t border-b pl-6" id="match-metrics-drawer">
                        <MetricDrawerContent
                          activeMetric={activeMetric}
                          goalMatches={goalMatches}
                          coreRequirements={coreRequirements.list}
                          preferredRequirements={preferredRequirements.list}
                          isPostHIL={isPostHIL}
                          metrics={metrics}
                          allGaps={allGaps}
                          aPhaseInsights={aPhaseInsights}
                          readiness={readiness ?? undefined}
                          onEditGoals={onEditGoals}
                          onEnhanceSection={onEnhanceSection}
                          onAddMetrics={onAddMetrics}
                          sections={sections}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
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
  metrics: MatchMetricsData;
  allGaps: Array<{ sectionId: string; sectionTitle: string; gap: any }>;
  aPhaseInsights?: APhaseInsights;
  readiness?: DraftReadinessEvaluation;
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
  metrics,
  allGaps,
  aPhaseInsights,
  readiness,
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
  sections = [],
}: MetricDrawerContentProps) {
  switch (activeMetric) {
    case 'gaps':
      return <GapsDrawerContent allGaps={allGaps} onEnhanceSection={onEnhanceSection} />;
    case 'goals':
      return (
        <GoalsDrawerContent
          goalMatches={goalMatches}
          onEditGoals={onEditGoals}
        />
      );
    case 'core':
      return (
        <RequirementsDrawerContent
          requirements={coreRequirements}
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'preferred':
      return (
        <RequirementsDrawerContent
          requirements={preferredRequirements}
          onEnhanceSection={onEnhanceSection}
          onAddMetrics={onAddMetrics}
        />
      );
    case 'rating':
      // Calculate score if undefined (matches hardcoded criteria logic)
      const displayScore = metrics.overallScore ?? (isPostHIL ? 91 : 27);
      return (
        <CoverLetterRatingInsights 
          isPostHIL={isPostHIL} 
          overallScore={displayScore} 
          criteria={metrics.ratingCriteria}
        />
      );
    case 'a-phase':
      return aPhaseInsights ? <APhaseDrawerContent insights={aPhaseInsights} /> : null;
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
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
  onAddMetrics?: (sectionId?: string) => void;
}

function RequirementsDrawerContent({
  requirements,
  onEnhanceSection,
  onAddMetrics,
}: RequirementsDrawerContentProps) {
  if (!requirements.length) {
    return (
      <div className="p-2 flex items-center gap-2">
        <div className="flex-shrink-0 p-2 flex items-center">
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <h4 className="text-sm font-medium text-foreground">No requirements</h4>
          </div>
          <div className="text-xs">
            <div>
              <span className="text-muted-foreground">No requirements to display</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

interface APhaseDrawerContentProps {
  insights: APhaseInsights;
}

/**
 * Task 7: A-phase streaming insights accordion
 * 
 * Displays preliminary analysis data as it arrives during drafting:
 * - PM Level role alignment
 * - Goals alignment
 * - JD requirement counts (preliminary)
 * - Match with Strengths
 * - Company context
 * 
 * Design principles:
 * - Shows streaming data ONLY (never draft-based metrics)
 * - Labeled as "preliminary" / "from JD" where appropriate
 * - Does NOT auto-open/close on updates
 * - Does NOT replace draft-based badges once draft exists
 */
function APhaseDrawerContent({ insights }: APhaseDrawerContentProps) {
  const { stageFlags } = insights;

  return (
    <div className="space-y-3">
      {/* Role Insights */}
      {stageFlags.hasRoleInsights && insights.roleInsights && (
        <div className="p-2">
          <h4 className="text-sm font-medium text-foreground mb-2">Role Alignment</h4>
          <div className="space-y-2 text-xs">
            {insights.roleInsights.inferredRoleLevel && (
              <div>
                <span className="font-medium text-foreground/90">Level:</span>{' '}
                <span className="text-foreground/80">{insights.roleInsights.inferredRoleLevel}</span>
              </div>
            )}
            {insights.roleInsights.inferredRoleScope && (
              <div>
                <span className="font-medium text-foreground/90">Scope:</span>{' '}
                <span className="text-foreground/80">
                  {insights.roleInsights.inferredRoleScope.replace(/_/g, ' ')}
                </span>
              </div>
            )}
            {insights.roleInsights.titleMatch && (
              <div>
                <span className="font-medium text-foreground/90">Title Match:</span>{' '}
                <span className="text-foreground/80">
                  {insights.roleInsights.titleMatch.exactTitleMatch
                    ? 'Exact'
                    : insights.roleInsights.titleMatch.adjacentTitleMatch
                    ? 'Adjacent'
                    : 'No match'}
                </span>
              </div>
            )}
            {insights.roleInsights.scopeMatch && (
              <div>
                <span className="font-medium text-foreground/90">Fit:</span>{' '}
                <span className="text-foreground/80">
                  {insights.roleInsights.scopeMatch.scopeRelation === 'goodFit'
                    ? 'Good fit'
                    : insights.roleInsights.scopeMatch.scopeRelation === 'stretch'
                    ? 'Stretch'
                    : insights.roleInsights.scopeMatch.scopeRelation === 'bigStretch'
                    ? 'Big stretch'
                    : 'Below experience'}
                </span>
              </div>
            )}
            {insights.roleInsights.goalAlignment && (
              <div>
                <span className="font-medium text-foreground/90">Goal Alignment:</span>{' '}
                <span className="text-foreground/80">
                  {insights.roleInsights.goalAlignment.alignsWithTargetTitles && 
                   insights.roleInsights.goalAlignment.alignsWithTargetLevelBand
                    ? 'Aligns with goals'
                    : insights.roleInsights.goalAlignment.alignsWithTargetTitles
                    ? 'Title aligns'
                    : insights.roleInsights.goalAlignment.alignsWithTargetLevelBand
                    ? 'Level aligns'
                    : 'Outside target'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* JD Requirement Summary (preliminary) */}
      {stageFlags.hasJdRequirementSummary && insights.jdRequirementSummary && (
        <div className="p-2 border-t border-border/30">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Requirements from JD <span className="text-muted-foreground">(preliminary)</span>
          </h4>
          <div className="space-y-2 text-xs">
            <div>
              <span className="font-medium text-foreground/90">Core:</span>{' '}
              <span className="text-foreground/80">{insights.jdRequirementSummary.coreTotal}</span>
            </div>
            <div>
              <span className="font-medium text-foreground/90">Preferred:</span>{' '}
              <span className="text-foreground/80">{insights.jdRequirementSummary.preferredTotal}</span>
            </div>
          </div>
        </div>
      )}

      {/* Match with Strengths */}
      {stageFlags.hasMws && insights.mws && (
        <div className="p-2 border-t border-border/30">
          <h4 className="text-sm font-medium text-foreground mb-2">Match with Strengths</h4>
          <div className="space-y-2 text-xs">
            <div className="mb-2">
              <span className="font-medium text-foreground/90">Score:</span>{' '}
              <Badge variant="outline" className={
                insights.mws.summaryScore === 3 ? 'border-success bg-success/10 text-success' :
                insights.mws.summaryScore === 2 ? 'border-warning bg-warning/10 text-warning' :
                'border-muted bg-muted/10 text-muted-foreground'
              }>
                {insights.mws.summaryScore}/3
              </Badge>
            </div>
            {insights.mws.details.map((item, idx) => (
              <div key={idx}>
                <span className="font-medium text-foreground/90">{item.label}:</span>{' '}
                <Badge 
                  variant="outline" 
                  className={
                    item.strengthLevel === 'strong' 
                      ? 'border-success bg-success/10 text-success mr-1' 
                      : item.strengthLevel === 'moderate'
                      ? 'border-warning bg-warning/10 text-warning mr-1'
                      : 'border-muted bg-muted/10 text-muted-foreground mr-1'
                  }
                >
                  {item.strengthLevel}
                </Badge>
                <span className="text-foreground/80">{item.explanation}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Company Context */}
      {stageFlags.hasCompanyContext && insights.companyContext && (
        <div className="p-2 border-t border-border/30">
          <h4 className="text-sm font-medium text-foreground mb-2">Company Context</h4>
          <div className="space-y-2 text-xs">
            {insights.companyContext.industry && (
              <div>
                <span className="font-medium text-foreground/90">Industry:</span>{' '}
                <span className="text-foreground/80">{insights.companyContext.industry}</span>
              </div>
            )}
            {insights.companyContext.maturity && (
              <div>
                <span className="font-medium text-foreground/90">Stage:</span>{' '}
                <span className="text-foreground/80">
                  {insights.companyContext.maturity.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
              </div>
            )}
            {insights.companyContext.businessModels && insights.companyContext.businessModels.length > 0 && (
              <div>
                <span className="font-medium text-foreground/90">Business Models:</span>{' '}
                <span className="text-foreground/80">
                  {insights.companyContext.businessModels.join(', ')}
                </span>
              </div>
            )}
            {insights.companyContext.source && (
              <div className="text-muted-foreground mt-1">
                Source: {insights.companyContext.source === 'jd' ? 'Job description' : 
                         insights.companyContext.source === 'web' ? 'Web research' : 
                         'Mixed sources'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ReadinessDrawerContentProps {
  readiness: DraftReadinessEvaluation;
}

function ReadinessDrawerContent({ readiness }: ReadinessDrawerContentProps) {
  const ratingLabel = readiness.rating.charAt(0).toUpperCase() + readiness.rating.slice(1);
  const ratingBadgeClass =
    readiness.rating === 'exceptional'
      ? 'border-success bg-success/10 text-success'
      : readiness.rating === 'strong'
      ? 'border-primary bg-primary/10 text-primary'
      : readiness.rating === 'adequate'
      ? 'border-warning bg-warning/10 text-warning'
      : 'border-muted bg-muted/10 text-muted-foreground';

  const toBadgeClass = (v: 'strong' | 'sufficient' | 'insufficient') =>
    v === 'strong'
      ? 'border-success bg-success/10 text-success'
      : v === 'sufficient'
      ? 'border-warning bg-warning/10 text-warning'
      : 'border-muted bg-muted/10 text-muted-foreground';

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
        <Badge variant="outline" className={ratingBadgeClass}>
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
            return (
              <div key={row.key} className={idx > 0 ? 'pt-1 border-t border-border/20' : ''}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground/90">{row.label}</span>
                  <Badge variant="outline" className={toBadgeClass(value)}>{value}</Badge>
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
            {readiness.feedback.improvements.slice(0, 3).map((item, i) => (
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

