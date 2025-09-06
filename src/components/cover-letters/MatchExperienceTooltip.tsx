import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, X } from 'lucide-react';

interface ExperienceMatch {
  id: string;
  requirement: string;
  match: string | null;
  confidence: 'high' | 'medium' | 'low';
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left side - Job Requirements */}
          <div className="space-y-2">
            {matches.map((match) => (
              <div key={match.id} className={`flex items-center gap-2 p-2 rounded ${match.match ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex-shrink-0">
                  {match.match ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-gray-900">
                    {match.requirement}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Right side - Work History Matches */}
          <div className="space-y-2">
            {matches.map((match) => (
              <div key={match.id} className={`flex items-center gap-2 p-2 rounded ${match.match ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex-shrink-0">
                  {match.match ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <X className="h-3 w-3 text-red-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  {match.match ? (
                    <span className="text-sm text-gray-700">
                      {match.match}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-500">
                      No matching experience found
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
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

// Helper function to create mock experience matches
export function createMockExperienceMatches(): ExperienceMatch[] {
  return [
    {
      id: 'exp-1',
      requirement: 'JavaScript and frontend development',
      match: '5+ years JavaScript experience with various projects',
      confidence: 'high'
    },
    {
      id: 'exp-2',
      requirement: 'React and modern frontend frameworks',
      match: null,
      confidence: 'low'
    },
    {
      id: 'exp-3',
      requirement: 'API integration and backend communication',
      match: 'Basic API integration experience with REST endpoints',
      confidence: 'medium'
    },
    {
      id: 'exp-4',
      requirement: 'Node.js server-side development',
      match: null,
      confidence: 'low'
    },
    {
      id: 'exp-5',
      requirement: 'Team collaboration and agile practices',
      match: 'Worked in agile teams with standard practices',
      confidence: 'medium'
    },
    {
      id: 'exp-6',
      requirement: 'Leadership and mentoring experience',
      match: null,
      confidence: 'low'
    }
  ];
}
