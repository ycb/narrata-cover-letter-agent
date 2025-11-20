import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MainHILInterface } from '../MainHILInterface';
import { HILProvider } from '@/contexts/HILContext';
import type { WorkHistoryBlurb } from '@/types/workHistory';
import type { GapAnalysis } from '@/types/content';

vi.mock('@/hooks/useHilGapAnalysis', () => {
  const mockAnalysis: GapAnalysis = {
    variationId: 'var-1',
    generatedAt: '2024-01-01T00:00:00Z',
    overallScore: 78,
    paragraphGaps: [
      {
        paragraphId: 'intro',
        gap: 'Missing specific metrics',
        impact: 'high',
        suggestion: 'Add quantifiable outcomes like "increased conversion by 25%"',
        relatedVariations: ['var-1', 'var-2'],
      },
    ],
    suggestions: [
      {
        type: 'add-metrics',
        content: 'Include specific KPIs and outcomes achieved',
        priority: 'high',
        relatedVariations: ['var-1'],
      },
    ],
    relatedContent: [
      {
        id: 'content-1',
        title: 'Leadership Metrics Story',
        relevance: 0.85,
        source: 'work-history',
        variations: [],
      },
    ],
    variationsCoverage: {
      'var-1': {
        gapsCovered: ['intro'],
        gapsUncovered: [],
        relevance: 0.8,
      },
    },
    autoTags: ['leadership', 'metrics'],
    summary: {
      targetRole: 'Senior PM',
      keywordEmphasis: ['leadership'],
      matchedParagraphs: 2,
      totalParagraphs: 3,
    },
  };

  const useHilGapAnalysis = vi.fn((variation, targetRole, jobKeywords, options) => {
    options?.onComplete?.(mockAnalysis);
    return {
      status: 'ready',
      analysis: mockAnalysis,
      streamingMessages: [],
      error: null,
      retry: vi.fn(),
    };
  });

  return { useHilGapAnalysis };
});

// Mock data
const mockStory: WorkHistoryBlurb = {
  id: 'story-1',
  roleId: 'role-1',
  title: 'Team Leadership Story',
  content: 'Led a team of 8 product professionals while launching MVP in record 6 months.',
  outcomeMetrics: ['Built team of 8', 'Launched MVP'],
  tags: ['leadership', 'team management'],
  source: 'manual',
  status: 'approved',
  confidence: 'high',
  timesUsed: 5,
  lastUsed: '2024-01-15T00:00:00Z',
  variations: [
    {
      id: 'var-1',
      content:
        'Led a team of 8 product professionals while launching MVP in record 6 months. My leadership philosophy is centered on empathy and candor.',
      filledGap: 'People management',
      developedForJobTitle: 'Senior PM',
      jdTags: ['leadership', 'team management'],
      outcomeMetrics: ['Built team of 8', 'Launched MVP'],
      tags: ['philosophy', 'team management'],
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'AI',
    },
    {
      id: 'var-2',
      content: 'Developed annual and quarterly roadmaps for product strategy.',
      filledGap: 'Strategic planning',
      developedForJobTitle: 'Senior PM',
      jdTags: ['strategy', 'planning'],
      outcomeMetrics: ['Created roadmaps'],
      tags: ['strategy', 'planning'],
      createdAt: '2024-01-02T00:00:00Z',
      createdBy: 'user',
    },
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z',
};

const mockHandlers = {
  onContentUpdated: vi.fn(),
  onClose: vi.fn(),
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => <HILProvider>{children}</HILProvider>;

describe('MainHILInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the main HIL interface with header', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Human-in-the-Loop Editor')).toBeInTheDocument();
    expect(screen.getAllByText('Senior PM').length).toBeGreaterThan(0);
    expect(screen.getByText('Reset')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('shows workflow progress steps', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
    expect(screen.getAllByText(/Select Variation/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Gap Analysis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ATS Assessment').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Content Generation').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Review & Edit').length).toBeGreaterThan(0);
  });

  it('shows initial step with variation selection', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    expect(screen.getAllByText(/Select Variation/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Variations Bridge')).toBeInTheDocument();
  });

  it('displays quick actions in footer', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Quick Actions:')).toBeInTheDocument();
    expect(screen.getAllByText('Gap Analysis').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Generate Content').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Edit Content').length).toBeGreaterThan(0);
  });

  it('shows step counter in footer', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
  });

  it('handles reset workflow', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    expect(screen.getByText('Step 1 of 6')).toBeInTheDocument();
  });

  it('handles close action', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('advances to gap analysis when variation is selected', async () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /HIL Edit/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    const hilEditButton = screen.getAllByRole('button', { name: /HIL Edit/i })[0];
    fireEvent.click(hilEditButton);

    await waitFor(() => {
      expect(screen.getAllByText(/Gap Analysis/i).length).toBeGreaterThan(0);
      expect(screen.getByText('78%')).toBeInTheDocument();
    });
  });

  it('displays finalization summary when moving to review step', async () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>,
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /HIL Edit/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    const hilEditButton = screen.getAllByRole('button', { name: /HIL Edit/i })[0];
    fireEvent.click(hilEditButton);

    await waitFor(() => {
      expect(screen.getByText('78%')).toBeInTheDocument();
    });

    const applyButtons = await screen.findAllByText('Apply');
    fireEvent.click(applyButtons[0]);

    const editContentButton = screen.getByRole('button', { name: /Edit Content/i });
    fireEvent.click(editContentButton);

    await waitFor(() => {
      expect(screen.getByText('Finalization Summary')).toBeInTheDocument();
      expect(screen.getByText(/Suggestions applied/)).toBeInTheDocument();
    });
  });
});
