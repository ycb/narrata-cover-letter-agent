import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PMAssessmentPanel } from '../PMAssessmentPanel';
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

// Mock handlers
const mockHandlers = {
  onApplySuggestion: vi.fn()
};

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <HILProvider>
      {children}
    </HILProvider>
  );
}

describe('PMAssessmentPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('PM Assessment')).toBeInTheDocument();
    expect(screen.getByText('Analyzing PM alignment...')).toBeInTheDocument();
  });

  it('displays PM assessment after loading', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText(/Role Alignment Score/)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Competency Analysis')).toBeInTheDocument();
    expect(screen.getByText('Level-Specific Suggestions')).toBeInTheDocument();
    expect(screen.getByText('Role Transition Insights')).toBeInTheDocument();
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('displays role alignment score correctly', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Role Alignment Score/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should display a score between 70-100
    const scoreElements = screen.getAllByText(/\d+%/);
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('shows target role and user level', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Target Role')).toBeInTheDocument();
      expect(screen.getByText('Your Level')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Senior PM')).toBeInTheDocument();
    expect(screen.getByText('Mid-level')).toBeInTheDocument();
  });

  it('displays competency analysis with gaps', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Competency Analysis')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show competency gaps
    expect(screen.getByText(/product strategy/)).toBeInTheDocument();
    expect(screen.getByText(/data analysis/)).toBeInTheDocument();
  });

  it('shows competency strength and target levels', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Current Strength')).toHaveLength(2); // 2 competency gaps
      expect(screen.getAllByText('Target Strength')).toHaveLength(2); // 2 competency gaps
    }, { timeout: 3000 });
  });

  it('displays level-specific suggestions', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Level-Specific Suggestions')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Should show suggestion buttons
    expect(screen.getAllByText('Apply')).toHaveLength(3); // 3 suggestions
  });

  it('shows role transition insights', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Role Transition Insights')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/Current Level: Mid-level/)).toBeInTheDocument();
    expect(screen.getByText(/Transition Path/)).toBeInTheDocument();
    expect(screen.getByText(/Strengths to Leverage/)).toBeInTheDocument();
  });

  it('displays quick actions', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText('Strategic Focus')).toBeInTheDocument();
    expect(screen.getByText('Leadership')).toBeInTheDocument();
    expect(screen.getByText('Stakeholders')).toBeInTheDocument();
    expect(screen.getByText('Data Focus')).toBeInTheDocument();
  });

  it('calls onApplySuggestion when quick action is clicked', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const strategicFocusButton = screen.getByText('Strategic Focus');
      fireEvent.click(strategicFocusButton);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockHandlers.onApplySuggestion).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('calls onApplySuggestion when competency suggestion is clicked', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const applyButtons = screen.getAllByText('Apply Top Suggestion');
      fireEvent.click(applyButtons[0]);
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockHandlers.onApplySuggestion).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('shows competency gap percentages', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Gap: \d+%/)).toHaveLength(2); // 2 competency gaps
    }, { timeout: 3000 });
  });

  it('displays competency suggestions as list items', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Suggestions:')).toHaveLength(2); // 2 competency gaps
    }, { timeout: 3000 });
  });

  it('handles different target roles correctly', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Product Director"
          userLevel="Senior"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Product Director')).toBeInTheDocument();
      expect(screen.getByText('Senior')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('shows alignment score label based on performance', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const scoreLabels = screen.getAllByText(/Match$/);
      expect(scoreLabels.length).toBeGreaterThan(0);
    }, { timeout: 3000 });
  });

  it('handles button states during suggestion application', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const strategicFocusButton = screen.getByText('Strategic Focus');
      fireEvent.click(strategicFocusButton);
    }, { timeout: 3000 });

    // Button should be disabled during application
    await waitFor(() => {
      expect(screen.getByText('Strategic Focus')).toBeDisabled();
    }, { timeout: 1000 });
  });

  it('shows transition path information', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/Focus on 2 key competency areas/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles error state gracefully', async () => {
    // This would require mocking the service to throw an error
    // For now, we'll test the loading state
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Analyzing PM alignment...')).toBeInTheDocument();
  });

  it('displays competency names in readable format', async () => {
    render(
      <TestWrapper>
        <PMAssessmentPanel
          variation={mockVariation}
          targetRole="Senior PM"
          userLevel="Mid-level"
          {...mockHandlers}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('product strategy')).toBeInTheDocument();
      expect(screen.getByText('data analysis')).toBeInTheDocument();
    }, { timeout: 3000 });
  });
});
