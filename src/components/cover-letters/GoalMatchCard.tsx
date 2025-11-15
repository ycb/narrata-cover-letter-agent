import React from 'react';
import { Check, X, HelpCircle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface GoalMatchCardProps {
  goalType: string;
  userValue?: string | null;
  jobValue?: string | null;
  met?: boolean;
  evidence?: string;
  requiresManualVerification?: boolean;
  onEditGoals?: () => void;
  emptyState?: 'no-goals' | 'goal-not-set' | null;
  matchState?: 'match' | 'no-match' | 'unknown'; // Explicit match state for better UX
}

/**
 * Modular card component for displaying goal matches
 * Supports three visual states:
 * 1. Match found (matchState='match') - Green card with checkmark
 * 2. No match (matchState='no-match') - Red card with X
 * 3. Unknown (matchState='unknown') - Gray card with question mark
 *    - Used when user hasn't set goal OR JD doesn't have data
 * 
 * Legacy 'emptyState' prop is still supported for backward compatibility
 */
export function GoalMatchCard({
  goalType,
  userValue,
  jobValue,
  met,
  evidence,
  requiresManualVerification = false,
  onEditGoals,
  emptyState = null,
  matchState,
}: GoalMatchCardProps) {
  // Empty state: No goals configured at all (special case for entire goals system)
  if (emptyState === 'no-goals') {
    return (
      <div className="border rounded-lg p-4 bg-muted/30 border-muted">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <Settings className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground mb-1">
              No Career Goals Set
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Configure your career goals to see how well this job matches your preferences
            </p>
            {onEditGoals && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onEditGoals}
                className="h-7 text-xs"
              >
                <Settings className="h-3 w-3 mr-1.5" />
                Set Career Goals
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Normal state: Show match result
  // Determine match state from explicit prop or fallback to met boolean
  const effectiveMatchState = matchState || (met === true ? 'match' : 'no-match');
  
  const isMatch = effectiveMatchState === 'match';
  const isUnknown = effectiveMatchState === 'unknown';
  
  const cardBgClass = isMatch
    ? 'bg-success/10 border-success/20'
    : isUnknown
    ? 'bg-muted/10 border-muted/40'
    : 'bg-destructive/10 border-destructive/20';

  return (
    <div className={`border rounded-lg p-3 ${cardBgClass}`}>
      {/* Goal type with user value in heading */}
      <div className="flex items-start gap-2 mb-1.5">
        <div className="flex-shrink-0 mt-0.5">
          {isMatch ? (
            <Check className="h-4 w-4 text-success" />
          ) : isUnknown ? (
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          {userValue ? (
            <h4 className="text-sm font-medium text-foreground">
              {goalType}: <span className="font-normal text-foreground/80">{userValue}</span>
            </h4>
          ) : onEditGoals ? (
            <button
              onClick={onEditGoals}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors underline decoration-dotted underline-offset-2 cursor-pointer text-left"
            >
              {goalType}: Not set
            </button>
          ) : (
            <h4 className="text-sm font-medium text-muted-foreground">
              {goalType}: Not set
            </h4>
          )}
        </div>
      </div>

      {/* Show what the job offers */}
      <div className="ml-6 text-xs">
        <div>
          <span className="font-medium text-foreground/90">This job:</span>{' '}
          <span className="text-foreground/80">
            {jobValue || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
}
