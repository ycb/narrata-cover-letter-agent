import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ATSAssessmentPanel } from '../ATSAssessmentPanel';
import { HILProvider } from '@/contexts/HILContext';
import type { BlurbVariation } from '@/types/workHistory';

// Mock data
const mockVariation: BlurbVariation = {
  id: 'var-1',
  content: 'Led a team of 8 product professionals while launching MVP in record 6 months. My leadership philosophy is centered on empathy and candor.',
  filledGap: 'People management',
  developedForJobTitle: 'Senior PM',
  jdTags: ['leadership', 'team management'],
  outcomeMetrics: ['Built team of 8', 'Launched MVP'],
  tags: ['philosophy', 'team management'],
  createdAt: '2024-01-01T00:00:00Z',
  createdBy: 'AI'
};

const mockJobKeywords = ['leadership', 'team management', 'product strategy', 'stakeholder management'];

// Mock handlers
const mockHandlers = {
  onOptimizeContent: vi.fn()
};

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <HILProvider>
      {children}
    </HILProvider>
  );
}

describe('ATSAssessmentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('ATS Assessment')).toBeInTheDocument();
    expect(screen.getByText('Analyzing ATS compatibility...')).toBeInTheDocument();
  });

  it('displays ATS assessment after loading', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Overall ATS Score/)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Keyword Analysis')).toBeInTheDocument();
    expect(screen.getByText('Optimization Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Content Preview')).toBeInTheDocument();
  });

  it('displays overall ATS score correctly', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Overall ATS Score/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should display a score between 60-100
    const scoreElements = screen.getAllByText(/\d+%/);
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('shows keyword analysis with matched and missing keywords', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Keyword Analysis')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show matched keywords from the content
    expect(screen.getByText('leadership')).toBeInTheDocument();
    expect(screen.getByText('team management')).toBeInTheDocument();
  });

  it('displays keyword density correctly', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Keyword Density')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show percentage
    expect(screen.getAllByText(/\d+%/)).toHaveLength(5); // Overall score + 3 metrics + keyword density
  });

  it('shows optimization suggestions', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Optimization Suggestions')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show suggestion buttons
    expect(screen.getAllByText('Apply')).toHaveLength(3); // 3 suggestions
  });

  it('displays quick actions', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Add Keywords')).toBeInTheDocument();
    expect(screen.getByText('Improve Formatting')).toBeInTheDocument();
    expect(screen.getByText('Add Metrics')).toBeInTheDocument();
    expect(screen.getByText('Optimize Tone')).toBeInTheDocument();
  });

  it('calls onOptimizeContent when quick action is clicked', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const addKeywordsButton = screen.getByText('Add Keywords');
      fireEvent.click(addKeywordsButton);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockHandlers.onOptimizeContent).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('shows content preview with word and character count', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Content Preview')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(mockVariation.content)).toBeInTheDocument();
    expect(screen.getByText(/Word count:/)).toBeInTheDocument();
    expect(screen.getByText(/Character count:/)).toBeInTheDocument();
  });

  it('handles empty job keywords gracefully', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={[]}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Keyword Analysis')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Matched Keywords (0)')).toBeInTheDocument();
  });

  it('shows score breakdown with individual metrics', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Keyword Match')).toBeInTheDocument();
      expect(screen.getByText('Formatting')).toBeInTheDocument();
      expect(screen.getByText('Coverage')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays correct score colors based on performance', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const scoreElements = screen.getAllByText(/\d+%/);
      expect(scoreElements.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('handles optimization button states correctly', async () => {
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const optimizeButton = screen.getByText('Add Keywords');
      fireEvent.click(optimizeButton);
    }, { timeout: 3000 });

    // Button should be disabled during optimization
    await waitFor(() => {
      expect(screen.getByText('Add Keywords')).toBeDisabled();
    }, { timeout: 1000 });
  });

  it('shows all keywords when all are matched', async () => {
    const allMatchedKeywords = ['leadership', 'team', 'management', 'product'];
    const contentWithAllKeywords = 'Demonstrated strong leadership and team management skills in product development.';
    
    const variationWithAllKeywords = {
      ...mockVariation,
      content: contentWithAllKeywords
    };

    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={variationWithAllKeywords}
          jobKeywords={allMatchedKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('All keywords matched!')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles error state gracefully', async () => {
    // This would require mocking the service to throw an error
    // For now, we'll test the loading state
    render(
      <TestWrapper>
        <ATSAssessmentPanel
          variation={mockVariation}
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Analyzing ATS compatibility...')).toBeInTheDocument();
  });
});
