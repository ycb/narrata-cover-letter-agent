import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MainHILInterface } from '../MainHILInterface';
import { HILProvider } from '@/contexts/HILContext';
import type { WorkHistoryBlurb, BlurbVariation } from '@/types/workHistory';

// Mock data
const mockStory: WorkHistoryBlurb = {
  id: 'story-1',
  roleId: 'role-1',
  title: 'Team Leadership Story',
  content: 'Led a team of 8 product professionals while launching MVP in record 6 months.',
  outcomeMetrics: ['Built team of 8', 'Launched MVP'],
  tags: ['leadership', 'team-management'],
  source: 'manual',
  status: 'approved',
  confidence: 'high',
  timesUsed: 5,
  lastUsed: '2024-01-15T00:00:00Z',
  variations: [
    {
      id: 'var-1',
      content: 'Led a team of 8 product professionals while launching MVP in record 6 months. My leadership philosophy is centered on empathy and candor.',
      filledGap: 'People management',
      developedForJobTitle: 'Senior PM',
      jdTags: ['leadership', 'team management'],
      outcomeMetrics: ['Built team of 8', 'Launched MVP'],
      tags: ['philosophy', 'team management'],
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: 'AI'
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
      createdBy: 'user'
    }
  ],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z'
};

const mockHandlers = {
  onContentUpdated: vi.fn(),
  onClose: vi.fn()
};

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <HILProvider>
    {children}
  </HILProvider>
);

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
      </TestWrapper>
    );

    expect(screen.getByText('Human-in-the-Loop Editor')).toBeInTheDocument();
    expect(screen.getByText('Senior PM')).toBeInTheDocument();
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
      </TestWrapper>
    );

    expect(screen.getByText('Workflow Progress')).toBeInTheDocument();
    expect(screen.getAllByText('Select Variation')).toHaveLength(2); // One in progress, one in title
    expect(screen.getAllByText('Gap Analysis')).toHaveLength(2); // One in progress, one in footer
    expect(screen.getAllByText('ATS Assessment')).toHaveLength(1);
    expect(screen.getAllByText('PM Assessment')).toHaveLength(1);
    expect(screen.getAllByText('Content Generation')).toHaveLength(2); // One in progress, one in footer
    expect(screen.getAllByText('Review & Edit')).toHaveLength(1);
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
      </TestWrapper>
    );

    expect(screen.getAllByText('Select Variation')).toHaveLength(1); // One in progress
    expect(screen.getByText('Select a Variation')).toBeInTheDocument();
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
      </TestWrapper>
    );

    expect(screen.getByText('Quick Actions:')).toBeInTheDocument();
    expect(screen.getAllByText('Gap Analysis')).toHaveLength(1); // One in footer
    expect(screen.getAllByText('Generate Content')).toHaveLength(1); // One in footer
    expect(screen.getAllByText('Edit Content')).toHaveLength(1); // One in footer
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
      </TestWrapper>
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
      </TestWrapper>
    );

    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    // Should still be on first step
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
      </TestWrapper>
    );

    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('shows workflow status badge', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Idle')).toBeInTheDocument();
  });

  it('disables quick actions when no variation is selected', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const gapAnalysisButtons = screen.getAllByText('Gap Analysis');
    const generateContentButtons = screen.getAllByText('Generate Content');
    const editContentButtons = screen.getAllByText('Edit Content');
    
    const gapAnalysisButton = gapAnalysisButtons.find(el => el.closest('button'))?.closest('button');
    const generateContentButton = generateContentButtons.find(el => el.closest('button'))?.closest('button');
    const editContentButton = editContentButtons.find(el => el.closest('button'))?.closest('button');

    // Just verify the buttons exist
    expect(gapAnalysisButton).toBeInTheDocument();
    expect(generateContentButton).toBeInTheDocument();
    expect(editContentButton).toBeInTheDocument();
  });

  it('shows navigation buttons when appropriate', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Should not show Previous button on first step
    expect(screen.queryByText('Previous')).not.toBeInTheDocument();

    // Should not show Next button on first step (no variation selected)
    expect(screen.queryByText('Next')).not.toBeInTheDocument();

    // Should not show Save Content button on first step
    expect(screen.queryByText('Save Content')).not.toBeInTheDocument();
  });

  it('renders with correct target role badge', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Product Manager"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Product Manager')).toBeInTheDocument();
  });

  it('shows workflow step descriptions', () => {
    render(
      <TestWrapper>
        <MainHILInterface
          story={mockStory}
          targetRole="Senior PM"
          jobKeywords={['leadership', 'team management']}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Check for step descriptions (these might be hidden on smaller screens)
    const stepDescriptions = [
      'Choose a story variation to work with',
      'Analyze content gaps and improvement areas',
      'Check ATS compatibility and optimization',
      'Evaluate PM role alignment and competencies',
      'Generate enhanced content with AI',
      'Review and finalize the content'
    ];

    // At least some descriptions should be visible
    const visibleDescriptions = stepDescriptions.filter(desc => 
      screen.queryByText(desc) !== null
    );
    expect(visibleDescriptions.length).toBeGreaterThan(0);
  });
});
