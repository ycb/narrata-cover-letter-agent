import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GapAnalysisPanel } from '../GapAnalysisPanel';
import { HILProvider } from '@/contexts/HILContext';
import type { BlurbVariation } from '@/types/workHistory';
import type { ImprovementSuggestion, ContentRecommendation, GapAnalysis } from '@/types/content';
import { useHilGapAnalysis } from '@/hooks/useHilGapAnalysis';

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
      {
        paragraphId: 'body',
        gap: 'Leadership context unclear',
        impact: 'medium',
        suggestion: 'Clarify team size and reporting structure',
        relatedVariations: ['var-1'],
      },
      {
        paragraphId: 'closing',
        gap: 'Technical depth insufficient',
        impact: 'low',
        suggestion: 'Include specific technologies or methodologies used',
        relatedVariations: ['var-2'],
      },
    ],
    suggestions: [
      {
        type: 'add-metrics',
        content: 'Include specific KPIs and outcomes achieved',
        priority: 'high',
        relatedVariations: ['var-1'],
      },
      {
        type: 'clarify-ownership',
        content: 'Clarify team size and reporting structure',
        priority: 'medium',
        relatedVariations: ['var-1'],
      },
      {
        type: 'match-keywords',
        content: 'Reference leadership keywords directly in the summary',
        priority: 'medium',
        relatedVariations: ['var-2'],
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
      {
        id: 'content-2',
        title: 'Team Management Example',
        relevance: 0.72,
        source: 'reusable',
        variations: [],
      },
    ],
    variationsCoverage: {
      'var-1': {
        gapsCovered: ['intro'],
        gapsUncovered: ['closing'],
        relevance: 0.81,
      },
      'var-2': {
        gapsCovered: ['closing'],
        gapsUncovered: ['intro'],
        relevance: 0.73,
      },
    },
    autoTags: ['leadership', 'metrics', 'team management'],
    summary: {
      targetRole: 'Senior PM',
      keywordEmphasis: ['leadership', 'team'],
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

const useHilGapAnalysisMock = vi.mocked(useHilGapAnalysis);

const mockVariation: BlurbVariation = {
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
};

const defaultTargetRole = 'Senior PM';
const defaultJobKeywords = ['leadership', 'metrics'];

const renderPanel = (options: Partial<{ variation: BlurbVariation | null; targetRole: string; jobKeywords: string[] }> = {}) => {
  const onApplyMock = vi.fn<[ImprovementSuggestion], void>();
  const onViewMock = vi.fn<[ContentRecommendation], void>();

  const variation = options.variation !== undefined ? options.variation : mockVariation;
  const targetRole = options.targetRole ?? defaultTargetRole;
  const jobKeywords = options.jobKeywords ?? defaultJobKeywords;

  const props = {
    variation,
    targetRole,
    jobKeywords,
    onApplySuggestion: (suggestion: ImprovementSuggestion) => onApplyMock(suggestion),
    onViewRelatedContent: (content: ContentRecommendation) => onViewMock(content),
  };

  render(
    <TestWrapper>
      <GapAnalysisPanel {...props} />
    </TestWrapper>,
  );

  return { onApplyMock, onViewMock };
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => <HILProvider>{children}</HILProvider>;

describe('GapAnalysisPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    useHilGapAnalysisMock.mockImplementationOnce(() => ({
      status: 'loading',
      analysis: null,
      streamingMessages: ['Analyzing core differentiators'],
      error: null,
      retry: vi.fn(),
    }));

    renderPanel();

    expect(screen.getAllByText(/Gap Analysis/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Analyzing content gaps...')).toBeInTheDocument();
  });

  it('displays gap analysis after loading', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Content Match Score')).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
      expect(screen.getByText('Improvement Suggestions')).toBeInTheDocument();
      expect(screen.getByText('Related Content')).toBeInTheDocument();
    });
  });

  it('displays overall score correctly', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('78%')).toBeInTheDocument();
    });
  });

  it('shows gap statistics', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('High Impact Gaps')).toBeInTheDocument();
      expect(screen.getByText('Medium Impact Gaps')).toBeInTheDocument();
      expect(screen.getByText('Low Impact Gaps')).toBeInTheDocument();
    });
  });

  it('displays content gaps with correct impact levels', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Missing specific metrics')).toBeInTheDocument();
      expect(screen.getByText('Leadership context unclear')).toBeInTheDocument();
      expect(screen.getByText('Technical depth insufficient')).toBeInTheDocument();
    });

    expect(screen.getByText('high impact')).toBeInTheDocument();
    expect(screen.getByText('medium impact')).toBeInTheDocument();
    expect(screen.getByText('low impact')).toBeInTheDocument();
  });

  it('shows gap suggestions', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Add quantifiable outcomes like "increased conversion by 25%"')).toBeInTheDocument();
      expect(screen.getAllByText('Clarify team size and reporting structure').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Reference leadership keywords directly in the summary').length).toBeGreaterThan(0);
    });
  });

  it('displays improvement suggestions with priorities', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('add metrics')).toBeInTheDocument();
      expect(screen.getByText('clarify ownership')).toBeInTheDocument();
      expect(screen.getByText('match keywords')).toBeInTheDocument();
    });

    const highPriorityBadges = await screen.findAllByText('high priority');
    const mediumPriorityBadges = await screen.findAllByText('medium priority');

    expect(highPriorityBadges[0]).toHaveClass('bg-destructive/10', 'text-destructive');
    expect(mediumPriorityBadges[0]).toHaveClass('bg-warning/10', 'text-warning');
  });

  it('shows related content with relevance scores', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('Leadership Metrics Story')).toBeInTheDocument();
      expect(screen.getByText('Team Management Example')).toBeInTheDocument();
      expect(screen.getByText('85% match')).toBeInTheDocument();
      expect(screen.getByText('72% match')).toBeInTheDocument();
    });
  });

  it('calls onApplySuggestion when apply button is clicked', async () => {
    const { onApplyMock } = renderPanel();

    const applyButton = await screen.findAllByText('Apply');
    fireEvent.click(applyButton[0]);

    expect(onApplyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'add-metrics',
        content: 'Include specific KPIs and outcomes achieved',
        priority: 'high',
      }),
    );
  });

  it('calls onApplySuggestion for gap fixes', async () => {
    const { onApplyMock } = renderPanel();

    const applyFixButtons = await screen.findAllByText('Apply Fix');
    fireEvent.click(applyFixButtons[0]);

    expect(onApplyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'fill-gap',
        content: 'Add quantifiable outcomes like "increased conversion by 25%"',
        priority: 'high',
      }),
    );
  });

  it('calls onViewRelatedContent when view button is clicked', async () => {
    const { onViewMock } = renderPanel();

    const viewButtons = await screen.findAllByText('View');
    fireEvent.click(viewButtons[0]);

    expect(onViewMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'content-1',
        title: 'Leadership Metrics Story',
        relevance: 0.85,
      }),
    );
  });

  it('shows related variations count for gaps', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('2 related variations')).toBeInTheDocument();
      expect(screen.getAllByText(/1\s+related variation/i).length).toBeGreaterThan(0);
    });
  });

  it('displays correct impact colors', async () => {
    renderPanel();

    const highImpactBadge = await screen.findByText('high impact');
    const mediumImpactBadge = await screen.findByText('medium impact');
    const lowImpactBadge = await screen.findByText('low impact');

    expect(highImpactBadge).toHaveClass('bg-destructive/10', 'text-destructive');
    expect(mediumImpactBadge).toHaveClass('bg-warning/10', 'text-warning');
    expect(lowImpactBadge).toHaveClass('bg-muted', 'text-muted-foreground');
  });

  it('displays correct priority colors', async () => {
    renderPanel();

    const highPriorityBadges = await screen.findAllByText('high priority');
    const mediumPriorityBadges = await screen.findAllByText('medium priority');

    expect(highPriorityBadges[0]).toHaveClass('bg-destructive/10', 'text-destructive');
    expect(mediumPriorityBadges[0]).toHaveClass('bg-warning/10', 'text-warning');
  });

  it('shows suggestion types as labels', async () => {
    renderPanel();

    await waitFor(() => {
      expect(screen.getByText('add metrics')).toBeInTheDocument();
      expect(screen.getByText('clarify ownership')).toBeInTheDocument();
      expect(screen.getByText('match keywords')).toBeInTheDocument();
    });
  });

  it('shows placeholder when no variation is selected', () => {
    renderPanel({ variation: null });

    expect(screen.getByText('Select a variation to begin gap analysis.')).toBeInTheDocument();
  });
});
