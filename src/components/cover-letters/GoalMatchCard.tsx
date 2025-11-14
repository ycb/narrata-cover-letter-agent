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
}

/**
 * Modular card component for displaying goal matches
 * Supports three states:
 * 1. Match found (met=true) - Green card with checkmark
 * 2. Match not found (met=false) - Red card with X
 * 3. Empty states:
 *    - 'no-goals': User hasn't set any goals yet
 *    - 'goal-not-set': Specific goal field is empty
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
}: GoalMatchCardProps) {
  // Empty state: No goals configured at all
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
                variant="outline"
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

  // Empty state: Specific goal not set
  if (emptyState === 'goal-not-set' || !userValue) {
    return (
      <div className="border rounded-lg p-3 bg-muted/10 border-muted/40">
        <div className="flex items-start gap-2">
          <div className="flex-shrink-0 mt-0.5">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-muted-foreground">
              {goalType}
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Not specified in your career goals
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Normal state: Show match result
  const isMatch = met === true;
  const cardBgClass = isMatch
    ? 'bg-success/10 border-success/20'
    : 'bg-destructive/10 border-destructive/20';

  return (
    <div className={`border rounded-lg p-3 ${cardBgClass}`}>
      {/* Goal type and match indicator */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-shrink-0 mt-0.5">
          {isMatch ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <X className="h-4 w-4 text-destructive" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground">
            {goalType}
          </h4>
        </div>
      </div>

      {/* User's goal value */}
      <div className="ml-6 space-y-2">
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-0.5">
            Your preference:
          </div>
          <div className="text-xs text-foreground/90">
            {userValue}
          </div>
        </div>

        {/* Job's value (if available) */}
        {jobValue && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-0.5">
              Job offers:
            </div>
            <div className="text-xs text-foreground/90">
              {jobValue}
            </div>
          </div>
        )}

        {/* Evidence/explanation */}
        {evidence && (
          <div className={`text-xs ${isMatch ? 'text-foreground/80' : 'text-muted-foreground'} pt-1 border-t border-current/10`}>
            {evidence}
          </div>
        )}

        {/* Manual verification flag */}
        {requiresManualVerification && (
          <div className="text-xs text-muted-foreground italic pt-1">
            ℹ️ Requires manual verification from job description
          </div>
        )}
      </div>
    </div>
  );
}
