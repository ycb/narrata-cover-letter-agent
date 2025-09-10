import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CoverLetterRatingTooltip } from './CoverLetterRatingTooltip';
import { ATSScoreTooltip } from './ATSScoreTooltip';
import { RequirementsTooltip, createMockRequirements } from './RequirementsTooltip';
import { MatchExperienceTooltip, createMockExperienceMatches } from './MatchExperienceTooltip';
import { MatchGoalsTooltip, createMockGoalMatches } from './MatchGoalsTooltip';

interface HILProgressMetrics {
  goalsMatch: string;
  experienceMatch: string;
  coverLetterRating: string;
  atsScore: number;
  coreRequirementsMet: { met: number; total: number };
  preferredRequirementsMet: { met: number; total: number };
}

interface ProgressIndicatorWithTooltipsProps {
  metrics: HILProgressMetrics;
  className?: string;
  isPostHIL?: boolean; // New prop to determine which mock data to use
}

export function ProgressIndicatorWithTooltips({ 
  metrics, 
  className,
  isPostHIL = false
}: ProgressIndicatorWithTooltipsProps) {
  const getRatingColor = (rating: string) => {
    switch (rating.toLowerCase()) {
      case 'strong': return 'bg-success/10 text-success border-success/20';
      case 'average': return 'bg-warning/10 text-warning border-warning/20';
      case 'weak': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-muted/10 text-muted-foreground border-muted/20';
    }
  };

  const getATSScoreColor = (score: number) => {
    if (score >= 80) return 'bg-success/10 text-success border-success/20';
    if (score >= 60) return 'bg-warning/10 text-warning border-warning/20';
    return 'bg-destructive/10 text-destructive border-destructive/20';
  };

  // Use different mock data based on HIL state
  const coreReqs = isPostHIL ? createPostHILRequirements('core') : createMockRequirements('core');
  const preferredReqs = isPostHIL ? createPostHILRequirements('preferred') : createMockRequirements('preferred');
  const experienceMatches = isPostHIL ? createPostHILExperienceMatches() : createMockExperienceMatches();

  return (
    <div className={`w-full bg-card border rounded-lg p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
        {/* Match with Goals */}
        <MatchGoalsTooltip goalMatches={createMockGoalMatches()} isPostHIL={isPostHIL}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">MATCH WITH GOALS</div>
            <Badge variant="outline" className={getRatingColor(metrics.goalsMatch)}>
              {metrics.goalsMatch}
            </Badge>
          </div>
        </MatchGoalsTooltip>

        {/* Match with Experience */}
        <MatchExperienceTooltip matches={experienceMatches}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">MATCH WITH EXPERIENCE</div>
            <Badge variant="outline" className={getRatingColor(metrics.experienceMatch)}>
              {metrics.experienceMatch}
            </Badge>
          </div>
        </MatchExperienceTooltip>

        {/* Cover Letter Rating */}
        <CoverLetterRatingTooltip isPostHIL={isPostHIL}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">COVER LETTER RATING</div>
            <Badge variant="outline" className={getRatingColor(metrics.coverLetterRating)}>
              {metrics.coverLetterRating}
            </Badge>
          </div>
        </CoverLetterRatingTooltip>

        {/* ATS Score */}
        <ATSScoreTooltip atsScore={metrics.atsScore} isPostHIL={isPostHIL}>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">ATS</div>
            <Badge variant="outline" className={getATSScoreColor(metrics.atsScore)}>
              {metrics.atsScore}%
            </Badge>
          </div>
        </ATSScoreTooltip>

        {/* Core Requirements */}
        <RequirementsTooltip
          title={`Core Reqs: ${metrics.coreRequirementsMet.met}/${metrics.coreRequirementsMet.total}`}
          requirements={coreReqs}
          description="Essential requirements for this role"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">CORE REQS</div>
            <Badge variant="outline" className={getATSScoreColor((metrics.coreRequirementsMet.met / metrics.coreRequirementsMet.total) * 100)}>
              {metrics.coreRequirementsMet.met}/{metrics.coreRequirementsMet.total}
            </Badge>
          </div>
        </RequirementsTooltip>

        {/* Preferred Requirements */}
        <RequirementsTooltip
          title={`Preferred Reqs: ${metrics.preferredRequirementsMet.met}/${metrics.preferredRequirementsMet.total}`}
          requirements={preferredReqs}
          description="Nice-to-have requirements for this role"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">PREFERRED REQS</div>
            <Badge variant="outline" className={getATSScoreColor((metrics.preferredRequirementsMet.met / metrics.preferredRequirementsMet.total) * 100)}>
              {metrics.preferredRequirementsMet.met}/{metrics.preferredRequirementsMet.total}
            </Badge>
          </div>
        </RequirementsTooltip>
      </div>
    </div>
  );
}

// Post-HIL mock data functions (gaps addressed)
function createPostHILRequirements(type: 'core' | 'preferred'): any[] {
  if (type === 'core') {
    return [
      {
        id: 'core-1',
        text: 'JavaScript proficiency',
        demonstrated: true,
        evidence: 'HIL generated content highlighting 5+ years of JavaScript experience'
      },
      {
        id: 'core-2',
        text: 'React development experience',
        demonstrated: true,
        evidence: 'Added detailed React project descriptions with technical achievements'
      },
      {
        id: 'core-3',
        text: 'Node.js backend development',
        demonstrated: true,
        evidence: 'HIL generated content now includes Node.js project examples'
      },
      {
        id: 'core-4',
        text: 'API design and integration',
        demonstrated: true,
        evidence: 'HIL content now includes API development and integration examples'
      }
    ];
  } else {
    return [
      {
        id: 'pref-1',
        text: 'Python programming experience',
        demonstrated: false,
        evidence: 'Python experience not yet highlighted in current draft'
      },
      {
        id: 'pref-2',
        text: 'Leadership and team management',
        demonstrated: true,
        evidence: 'HIL generated content now includes team leadership examples'
      },
      {
        id: 'pref-3',
        text: 'Metrics and KPI tracking',
        demonstrated: false,
        evidence: 'Quantifiable achievements need more emphasis'
      },
      {
        id: 'pref-4',
        text: 'Agile methodology experience',
        demonstrated: true,
        evidence: 'Added specific agile project management examples'
      }
    ];
  }
}

function createPostHILExperienceMatches(): any[] {
  return [
    {
      id: 'exp-1',
      requirement: 'JavaScript and frontend development',
      match: '5+ years JavaScript experience with React projects',
      confidence: 'high'
    },
    {
      id: 'exp-2',
      requirement: 'React and modern frontend frameworks',
      match: 'HIL generated content now includes advanced React patterns and state management',
      confidence: 'high'
    },
    {
      id: 'exp-3',
      requirement: 'API integration and backend communication',
      match: 'HIL generated content now includes API development and integration examples',
      confidence: 'high'
    },
    {
      id: 'exp-4',
      requirement: 'Node.js server-side development',
      match: 'HIL generated content now includes Node.js project examples',
      confidence: 'high'
    },
    {
      id: 'exp-5',
      requirement: 'Team collaboration and agile practices',
      match: 'Added specific agile project management examples',
      confidence: 'high'
    },
    {
      id: 'exp-6',
      requirement: 'Leadership and mentoring experience',
      match: 'HIL generated content now includes team leadership examples',
      confidence: 'high'
    }
  ];
}
