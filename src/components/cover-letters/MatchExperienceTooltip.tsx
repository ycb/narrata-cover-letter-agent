import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface ExperienceMatch {
  requirement: string;
  confidence: 'high' | 'medium' | 'low';
  matchedWorkItemIds: string[];
  matchedStoryIds: string[];
  evidence: string;
  missingDetails?: string;
}

interface MatchExperienceTooltipProps {
  children: React.ReactNode;
  className?: string;
  matches: ExperienceMatch[];
}

export function MatchExperienceTooltip({
  children,
  className,
  matches
}: MatchExperienceTooltipProps) {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const content = (
    <div className="space-y-3">
      {matches.map((match, idx) => {
        const hasMatch = match.confidence === 'high' || (match.matchedWorkItemIds.length > 0 || match.matchedStoryIds.length > 0);
        return (
          <div
            key={idx}
            className={`border rounded-lg p-3 ${hasMatch ? 'bg-success/10 border-success/20' : 'bg-destructive/10 border-destructive/20'}`}
          >
            {/* Requirement as title */}
            <div className="flex items-start gap-2 mb-2">
              <div className="flex-shrink-0 mt-0.5">
                {hasMatch ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
              </div>
              <h4 className="text-sm font-medium text-foreground flex-1">
                {match.requirement}
              </h4>
            </div>

            {/* Evidence as body */}
            <div className="ml-6">
              <p className={`text-xs ${hasMatch ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                {match.evidence || 'No matching experience found'}
              </p>
            </div>
          </div>
        );
      })}
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
