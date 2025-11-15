import React, { useState } from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { GoalMatchCard } from './GoalMatchCard';
import type { GoalMatch } from '@/services/goalsMatchService';

interface MatchGoalsTooltipProps {
  children: React.ReactNode;
  className?: string;
  goalMatches?: GoalMatch[];
  isPostHIL?: boolean; // For consistency with other tooltips, but not used since goals don't change
  onEditGoals?: () => void; // Callback to open goals modal
}

export function MatchGoalsTooltip({
  children,
  className,
  goalMatches = [],
  isPostHIL = false, // Not used since goals don't change, but for consistency
  onEditGoals
}: MatchGoalsTooltipProps) {
  // Check if user has ANY goals configured
  const hasAnyGoals = goalMatches.some(match => match.userValue !== null && match.userValue !== undefined && match.emptyState !== 'goal-not-set');

  // Sort goals: matched first, then unmatched, then not-set last
  const sortedMatches = [...goalMatches].sort((a, b) => {
    // Not-set goals go to the bottom
    if (a.emptyState === 'goal-not-set' && b.emptyState !== 'goal-not-set') return 1;
    if (b.emptyState === 'goal-not-set' && a.emptyState !== 'goal-not-set') return -1;
    
    // Among set goals, matched ones come first
    if (a.met && !b.met) return -1;
    if (!a.met && b.met) return 1;
    
    return 0; // Maintain relative order otherwise
  });

  const content = (
    <div className="space-y-3">
      {!hasAnyGoals ? (
        // Show "no goals" empty state
        <GoalMatchCard
          goalType="Career Goals"
          emptyState="no-goals"
          onEditGoals={onEditGoals}
        />
      ) : (
        // Show all goal matches sorted (matched → unmatched → not-set)
        sortedMatches.map((match) => (
          <GoalMatchCard
            key={match.id}
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
        ))
      )}
    </div>
  );

  return (
    <FullWidthTooltip
      content={content}
      className={className}
    >
      {children}
    </FullWidthTooltip>
  );
}

