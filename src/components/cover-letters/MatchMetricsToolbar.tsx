import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, X, HelpCircle, AlertTriangle } from 'lucide-react';
import { GoalMatchCard } from './GoalMatchCard';
import { CoverLetterRatingInsights } from './CoverLetterRatingTooltip';
import { ATSScoreInsights } from './ATSScoreTooltip';
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
import type { EnhancedMatchData } from '@/types/coverLetters';

type MetricKey = 'gaps' | 'goals' | 'core' | 'preferred' | 'rating' | 'ats';

interface MatchMetricsToolbarProps {
  metrics: MatchMetricsData;
  className?: string;
  isPostHIL?: boolean;
  isLoading?: boolean;
  goNoGoAnalysis?: GoNoGoAnalysis;
  jobDescription?: MatchJobDescription;
  enhancedMatchData?: EnhancedMatchData;
  sections?: Array<{ id: string; type: string; title?: string }>;
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
  onEditGoals,
  onEnhanceSection,
  onAddMetrics,
}: MatchMetricsToolbarProps) {
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
          return sectionInsight.sectionSlug || section.type;
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
      },
      {
        key: 'ats',
        label: 'ATS',
        value: isLoading ? '' : `${metrics.atsScore ?? 0}%`,
        badgeClass: getATSScoreColor(metrics.atsScore ?? 0),
        disabled: isLoading,
      }
    );
    
    return items;
  }, [coreRequirements.summary, goalsSummary, gapsCount, isLoading, metrics.atsScore, metrics.overallScore, metrics.goalsMatchScore, preferredRequirements.summary, isPostHIL]);

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
            {req.demonstrated ? (
              <Check className="h-4 w-4 text-success" />
            ) : (
              <X className="h-4 w-4 text-destructive" />
            )}
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
            <div>
              {sectionGaps.map((item, gapIndex) => (
                <div
                  key={item.gap.id || `gap-${gapIndex}`}
                  className={`p-2 flex items-start gap-2 ${gapIndex > 0 ? 'border-t border-border/30' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="mb-1.5">
                      <div className="text-sm font-medium text-foreground flex items-center gap-1">
                        <span>•</span>
                        <span>{item.gap.label || item.gap.title || 'Missing requirement'}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.gap.rationale || item.gap.description || 'Not explicitly mentioned in current draft'}
                    </div>
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

