import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MatchComponent } from '../MatchComponent';
import type { CoverLetterMatchMetric, DifferentiatorInsight } from '@/types/coverLetters';

describe('MatchComponent', () => {
  const metrics: CoverLetterMatchMetric[] = [
    {
      key: 'goals',
      label: 'Match with Goals',
      type: 'strength',
      strength: 'strong',
      summary: 'Great alignment with career goals.',
      tooltip: 'Mentioned high-priority goals for this job.',
      differentiatorHighlights: ['diff-1'],
    },
    {
      key: 'experience',
      label: 'Match with Experience',
      type: 'strength',
      strength: 'average',
      summary: 'Some experience alignment.',
      tooltip: '',
    },
    {
      key: 'rating',
      label: 'Cover Letter Rating',
      type: 'score',
      value: 82,
      summary: 'Overall quality rating.',
      tooltip: '',
    },
    {
      key: 'ats',
      label: 'ATS Score',
      type: 'score',
      value: 88,
      summary: 'High keyword coverage.',
      tooltip: '',
    },
    {
      key: 'coreRequirements',
      label: 'Core Requirements',
      type: 'requirement',
      met: 3,
      total: 4,
      summary: 'Most core requirements covered.',
      tooltip: '',
      differentiatorHighlights: ['diff-1'],
    },
    {
      key: 'preferredRequirements',
      label: 'Preferred Requirements',
      type: 'requirement',
      met: 1,
      total: 3,
      summary: 'Opportunities to expand preferred coverage.',
      tooltip: '',
    },
  ];

  const differentiators: DifferentiatorInsight[] = [
    {
      requirementId: 'diff-1',
      label: '0-to-1 launch execution',
      status: 'addressed',
      summary: 'The draft highlights the 0-to-1 launch story with quantified impact.',
    },
  ];

  it('renders match metrics for goals, experience, rating, ATS, and requirements', () => {
    render(<MatchComponent metrics={metrics} differentiators={differentiators} />);

    expect(screen.getByText(/match with goals/i)).toBeInTheDocument();
    expect(screen.getByText(/match with experience/i)).toBeInTheDocument();
    expect(screen.getByText(/cover letter rating/i)).toBeInTheDocument();
    expect(screen.getByText(/ats/i)).toBeInTheDocument();
    expect(screen.getByText(/core requirements/i)).toBeInTheDocument();
    expect(screen.getByText(/preferred requirements/i)).toBeInTheDocument();

    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('strong')).toBeInTheDocument();
  });

  it('shows loading state when generating', () => {
    render(<MatchComponent isLoading />);

    expect(screen.getByText(/generating match insights/i)).toBeInTheDocument();
  });

  it('renders placeholder when no metrics available', () => {
    render(<MatchComponent metrics={[]} />);

    expect(screen.getByText(/match insights will appear here/i)).toBeInTheDocument();
  });
});
