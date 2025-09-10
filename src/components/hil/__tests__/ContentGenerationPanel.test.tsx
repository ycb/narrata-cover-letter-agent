import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContentGenerationPanel } from '../ContentGenerationPanel';
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
  onContentGenerated: vi.fn()
};

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <HILProvider>
      {children}
    </HILProvider>
  );
}

describe('ContentGenerationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders generation controls', () => {
    render(
      <TestWrapper>
        <ContentGenerationPanel
          variation={mockVariation}
          targetRole="Senior PM"
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Content Generation')).toBeInTheDocument();
    expect(screen.getByText('Generation Type')).toBeInTheDocument();
    expect(screen.getByText('Enhance')).toBeInTheDocument();
    expect(screen.getByText('Expand')).toBeInTheDocument();
    expect(screen.getByText('Rewrite')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByText('Generate Content')).toBeInTheDocument();
  });

  it('shows custom prompt textarea when custom type is selected', () => {
    render(
      <TestWrapper>
        <ContentGenerationPanel
          variation={mockVariation}
          targetRole="Senior PM"
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);

    expect(screen.getByText('Custom Prompt')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your custom generation prompt...')).toBeInTheDocument();
  });





  it('shows quick actions', () => {
    render(
      <TestWrapper>
        <ContentGenerationPanel
          variation={mockVariation}
          targetRole="Senior PM"
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Quick Enhance')).toBeInTheDocument();
    expect(screen.getByText('Add Details')).toBeInTheDocument();
    expect(screen.getByText('Verify Truth')).toBeInTheDocument();
    expect(screen.getByText('Apply Content')).toBeInTheDocument();
  });

  it('handles custom prompt input', () => {
    render(
      <TestWrapper>
        <ContentGenerationPanel
          variation={mockVariation}
          targetRole="Senior PM"
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);

    const textarea = screen.getByPlaceholderText('Enter your custom generation prompt...');
    fireEvent.change(textarea, { target: { value: 'Custom prompt test' } });

    expect(textarea).toHaveValue('Custom prompt test');
  });

  it('disables buttons during generation', async () => {
    render(
      <TestWrapper>
        <ContentGenerationPanel
          variation={mockVariation}
          targetRole="Senior PM"
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const enhanceButton = screen.getByText('Enhance');
    fireEvent.click(enhanceButton);

    // Button should be disabled during generation
    expect(enhanceButton).toBeDisabled();
  });

  it('shows generation type selection state', () => {
    render(
      <TestWrapper>
        <ContentGenerationPanel
          variation={mockVariation}
          targetRole="Senior PM"
          jobKeywords={mockJobKeywords}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Enhance should be selected by default
    const enhanceButton = screen.getByText('Enhance');
    expect(enhanceButton).toHaveClass('bg-primary');

    // Click custom to change selection
    const customButton = screen.getByText('Custom');
    fireEvent.click(customButton);
    expect(customButton).toHaveClass('bg-primary');
  });
});
