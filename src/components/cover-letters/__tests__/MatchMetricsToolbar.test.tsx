import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchMetricsToolbar } from '../MatchMetricsToolbar';

const analyzeGoalsMatchMock = vi.fn();

vi.mock('@/contexts/UserGoalsContext', () => ({
  useUserGoals: () => ({ goals: null }),
}));

vi.mock('@/services/goalsMatchService', () => ({
  GoalsMatchService: vi.fn(() => ({
    analyzeGoalsMatch: analyzeGoalsMatchMock,
  })),
}));

const baseMetrics = {
  goalsMatch: '3/7',
  experienceMatch: 'N/A',
  coverLetterRating: 'Strong',
  atsScore: 82,
  coreRequirementsMet: { met: 3, total: 5 },
  preferredRequirementsMet: { met: 2, total: 4 },
};

const enhancedMatchData = {
  coreRequirementDetails: [
    {
      id: 'core-1',
      requirement: 'Define product strategy',
      demonstrated: true,
      evidence: 'Opening paragraph references strategy',
      section: 'intro',
    },
  ],
  preferredRequirementDetails: [
    {
      id: 'pref-1',
      requirement: 'AI experimentation',
      demonstrated: false,
      evidence: 'No explicit AI example',
      section: null,
    },
  ],
};

describe('MatchMetricsToolbar', () => {
  beforeEach(() => {
    analyzeGoalsMatchMock.mockReturnValue({
      matches: [
        {
          id: 'goal-1',
          goalType: 'Target Title',
          userValue: 'Principal PM',
          jobValue: 'Senior Product Manager',
          met: true,
          evidence: 'Title aligns',
          matchState: 'match',
        },
      ],
    });
  });

  it('renders toolbar items and shows goals drawer by default', () => {
    render(
      <MatchMetricsToolbar
        metrics={baseMetrics}
        jobDescription={{ role: 'Senior Product Manager' }}
        enhancedMatchData={enhancedMatchData as any}
      />,
    );

    expect(screen.getByText(/Match with Goals/i)).toBeInTheDocument();
    expect(screen.getByText(/Target Title/i)).toBeInTheDocument();
  });

  it('allows switching to requirement drawers', () => {
    render(
      <MatchMetricsToolbar
        metrics={baseMetrics}
        jobDescription={{ role: 'Senior Product Manager' }}
        enhancedMatchData={enhancedMatchData as any}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Core Requirements/i }));

    expect(screen.getByText('Define product strategy')).toBeInTheDocument();
  });

  it('shows ATS insights when ATS toolbar item is selected', () => {
    render(
      <MatchMetricsToolbar
        metrics={baseMetrics}
        jobDescription={{ role: 'Senior Product Manager' }}
        enhancedMatchData={enhancedMatchData as any}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /ATS/i }));

    expect(screen.getByText(/ATS Score/i)).toBeInTheDocument();
    expect(screen.getByText(/82%/i)).toBeInTheDocument();
  });
});

