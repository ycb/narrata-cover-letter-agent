import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Button } from '@/components/ui/button';
import { Check, X, Plus } from 'lucide-react';

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
  onAddStory?: (requirement?: string, severity?: string) => void; // Agent C: add story CTA
}

export function MatchExperienceTooltip({
  children,
  className,
  matches,
  onAddStory
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
            <div className="ml-6 space-y-2">
              <p className={`text-xs ${hasMatch ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                {match.evidence || 'No matching experience found'}
              </p>
              
              {/* Add Story CTA for low confidence matches */}
              {match.confidence === 'low' && onAddStory && (
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => onAddStory(match.requirement, 'medium')}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Story Covering This
                </Button>
              )}
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
