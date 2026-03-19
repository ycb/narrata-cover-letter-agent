import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MatchMetricsToolbar } from '../MatchMetricsToolbar';

const analyzeGoalsMatchMock = vi.fn();
const useDraftReadinessMock = vi.fn();

vi.mock('@/contexts/UserGoalsContext', () => ({
  useUserGoals: () => ({ goals: null }),
}));

vi.mock('@/services/goalsMatchService', () => ({
  GoalsMatchService: vi.fn(() => ({
    analyzeGoalsMatch: analyzeGoalsMatchMock,
  })),
}));

vi.mock('@/lib/flags', () => ({
  isDraftReadinessEnabled: () => true,
}));

vi.mock('@/hooks/useDraftReadiness', () => ({
  useDraftReadiness: () => useDraftReadinessMock(),
}));

const baseMetrics = {
  goalsMatchScore: 75,
  experienceMatchScore: 70,
  overallScore: 85,
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
    useDraftReadinessMock.mockReturnValue({
      data: null,
      status: 'pending',
      isLoading: true,
      isError: false,
      error: null,
      featureDisabled: false,
      refetch: vi.fn(),
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
    fireEvent.click(screen.getByRole('button', { name: /Match with Goals/i }));
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

  it('shows overall score insights when Overall Score is selected', () => {
    render(
      <MatchMetricsToolbar
        metrics={baseMetrics}
        jobDescription={{ role: 'Senior Product Manager' }}
        enhancedMatchData={enhancedMatchData as any}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Overall Score/i }));

    expect(screen.getByText(/Compelling Opening/i)).toBeInTheDocument();
    const scoreDisplays = screen.getAllByText(/85%/i);
    expect(scoreDisplays.length).toBeGreaterThan(0);
  });

  it('renders unavailable states when phase B stages fail', () => {
    render(
      <MatchMetricsToolbar
        metrics={baseMetrics}
        draftId="draft-1"
        jobDescription={{ role: 'Senior Product Manager' }}
        enhancedMatchData={enhancedMatchData as any}
        phaseBStatus={{
          status: 'error',
          sectionGaps: { status: 'error' },
          basicMetrics: { status: 'error' },
          contentStandards: { status: 'error' },
        } as any}
      />,
    );

    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  });

  it('renders readiness unavailable when the readiness hook errors', () => {
    useDraftReadinessMock.mockReturnValue({
      data: null,
      status: 'error',
      isLoading: false,
      isError: true,
      error: new Error('boom'),
      featureDisabled: false,
      refetch: vi.fn(),
    });

    render(
      <MatchMetricsToolbar
        metrics={baseMetrics}
        draftId="draft-1"
        jobDescription={{ role: 'Senior Product Manager' }}
        enhancedMatchData={enhancedMatchData as any}
      />,
    );

    expect(screen.getByText('Readiness')).toBeInTheDocument();
    expect(screen.getAllByText('Unavailable').length).toBeGreaterThan(0);
  });
});
