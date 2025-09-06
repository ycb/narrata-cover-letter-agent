import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CoverLetterRatingTooltip } from './CoverLetterRatingTooltip';
import { ATSScoreTooltip } from './ATSScoreTooltip';
import { RequirementsTooltip, createMockRequirements } from './RequirementsTooltip';
import { MatchExperienceTooltip, createMockExperienceMatches } from './MatchExperienceTooltip';
import { MatchGoalsTooltip } from './MatchGoalsTooltip';

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
      case 'strong': return 'bg-green-100 text-green-800 border-green-200';
      case 'average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'weak': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getATSScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  // Use different mock data based on HIL state
  const coreReqs = isPostHIL ? createPostHILRequirements('core') : createMockRequirements('core');
  const preferredReqs = isPostHIL ? createPostHILRequirements('preferred') : createMockRequirements('preferred');
  const experienceMatches = isPostHIL ? createPostHILExperienceMatches() : createMockExperienceMatches();

  return (
    <div className={`w-full bg-card border rounded-lg p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-center">
        {/* Match with Goals */}
        <MatchGoalsTooltip>
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
        <CoverLetterRatingTooltip>
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs text-muted-foreground mb-2 underline underline-offset-2">COVER LETTER RATING</div>
            <Badge variant="outline" className={getRatingColor(metrics.coverLetterRating)}>
              {metrics.coverLetterRating}
            </Badge>
          </div>
        </CoverLetterRatingTooltip>

        {/* ATS Score */}
        <ATSScoreTooltip atsScore={metrics.atsScore}>
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
        text: '5+ years of software development experience',
        demonstrated: true,
        evidence: 'HIL generated content highlighting 6 years of experience with specific project examples'
      },
      {
        id: 'core-2',
        text: 'Proficiency in React and TypeScript',
        demonstrated: true,
        evidence: 'Added detailed React/TypeScript project descriptions with technical achievements'
      },
      {
        id: 'core-3',
        text: 'Experience with cloud platforms (AWS/Azure)',
        demonstrated: true,
        evidence: 'HIL content now includes AWS deployment experience and cloud architecture knowledge'
      },
      {
        id: 'core-4',
        text: 'Bachelor\'s degree in Computer Science or related field',
        demonstrated: true,
        evidence: 'Education section enhanced with relevant coursework and academic projects'
      }
    ];
  } else {
    return [
      {
        id: 'pref-1',
        text: 'Experience with microservices architecture',
        demonstrated: true,
        evidence: 'Added microservices implementation details from previous role'
      },
      {
        id: 'pref-2',
        text: 'Leadership experience managing a team',
        demonstrated: true,
        evidence: 'HIL generated content now includes team leadership examples and management achievements'
      },
      {
        id: 'pref-3',
        text: 'Open source contributions',
        demonstrated: true,
        evidence: 'Enhanced with specific open source projects and contributions'
      },
      {
        id: 'pref-4',
        text: 'Certifications in cloud technologies',
        demonstrated: true,
        evidence: 'Added AWS certification details and cloud training experience'
      }
    ];
  }
}

function createPostHILExperienceMatches(): any[] {
  return [
    {
      id: 'exp-1',
      requirement: 'Senior-level software development (5+ years)',
      match: '6 years as Senior Software Engineer at TechCorp with HIL-enhanced project details',
      confidence: 'high'
    },
    {
      id: 'exp-2',
      requirement: 'React and TypeScript expertise',
      match: 'Built 3 React applications with TypeScript, now with detailed technical specifications',
      confidence: 'high'
    },
    {
      id: 'exp-3',
      requirement: 'Cloud platform experience (AWS/Azure)',
      match: 'Deployed applications on AWS using EC2, S3, and Lambda with HIL-generated examples',
      confidence: 'high'
    },
    {
      id: 'exp-4',
      requirement: 'Team leadership and mentoring',
      match: 'Led team of 3 junior developers for 2 years with enhanced leadership examples',
      confidence: 'high'
    },
    {
      id: 'exp-5',
      requirement: 'Fintech or financial services experience',
      match: 'HIL generated content now includes payment processing and financial API experience',
      confidence: 'high'
    },
    {
      id: 'exp-6',
      requirement: 'Machine learning or AI experience',
      match: 'Implemented ML recommendation system with detailed technical implementation',
      confidence: 'high'
    }
  ];
}
