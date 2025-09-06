import React from 'react';
import { FullWidthTooltip } from '@/components/ui/full-width-tooltip';
import { Check, AlertCircle } from 'lucide-react';

interface GoalMatch {
  id: string;
  goal: string;
  reflected: boolean;
  evidence?: string;
}

interface MatchGoalsTooltipProps {
  children: React.ReactNode;
  className?: string;
  goalMatches?: GoalMatch[];
}

export function MatchGoalsTooltip({ 
  children, 
  className,
  goalMatches = []
}: MatchGoalsTooltipProps) {
  const content = (
    <div className="space-y-4">
      <div className="space-y-3">
        {goalMatches.length > 0 ? (
          <div className="space-y-3">
              {goalMatches.map((goal) => (
                <div key={goal.id} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {goal.reflected ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="h-4 w-4 border border-gray-300 rounded-sm" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`text-sm ${goal.reflected ? 'text-gray-900' : 'text-gray-500'}`}>
                      {goal.goal}
                    </span>
                    {goal.evidence && (
                      <p className="text-xs text-gray-500 mt-1">
                        {goal.evidence}
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-sm text-yellow-800">User Goals Not Configured</h4>
              <p className="text-xs text-yellow-700 mt-1">
                Complete your career goals setup to see personalized analysis
              </p>
            </div>
          </div>
        )}
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

// Helper function to create mock goal matches based on user goals
export function createMockGoalMatches(): GoalMatch[] {
  return [
    {
      id: 'goal-1',
      goal: 'Target Title: Senior Product Manager',
      reflected: true,
      evidence: 'Cover letter emphasizes product management experience and leadership'
    },
    {
      id: 'goal-2',
      goal: 'Minimum Salary: $180k',
      reflected: false,
      evidence: 'No salary expectations mentioned in cover letter'
    },
    {
      id: 'goal-3',
      goal: 'Company Maturity: Late-stage',
      reflected: true,
      evidence: 'Demonstrates understanding of scaling challenges and growth metrics'
    },
    {
      id: 'goal-4',
      goal: 'Work Type: Remote',
      reflected: true,
      evidence: 'Mentioned remote work experience and distributed team leadership'
    },
    {
      id: 'goal-5',
      goal: 'Industry: Fintech',
      reflected: false,
      evidence: 'No fintech-specific experience or knowledge highlighted'
    },
    {
      id: 'goal-6',
      goal: 'Business Model: B2B SaaS',
      reflected: true,
      evidence: 'Shows understanding of B2B sales cycles and enterprise customers'
    },
    {
      id: 'goal-7',
      goal: 'Preferred City: San Francisco',
      reflected: false,
      evidence: 'No location preferences or local market knowledge mentioned'
    },
    {
      id: 'goal-8',
      goal: 'Open to Relocation: Yes',
      reflected: true,
      evidence: 'Expresses flexibility and willingness to relocate for the right opportunity'
    }
  ];
}
