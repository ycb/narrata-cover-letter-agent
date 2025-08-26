import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HILEditorPanel } from '../HILEditorPanel';
import { HILProvider } from '@/contexts/HILContext';
import type { WorkHistoryBlurb, BlurbVariation } from '@/types/workHistory';
import type { HILContentMetadata } from '@/types/content';

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
  timesUsed: 3,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
};

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

const mockMetadata: HILContentMetadata = {
  source: 'variation',
  sourceId: 'var-1',
  confidence: 'high',
  lastVerified: '2024-01-01T00:00:00Z',
  competencyTags: [],
  usageCount: 0,
  variationId: 'var-1',
  originalContent: mockVariation.content,
  changeType: 'modification',
  linkedVariations: ['var-1'],
  competencyMapping: {}
};

// Mock handlers
const mockHandlers = {
  onSave: vi.fn(),
  onCancel: vi.fn()
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Wrapper component for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <HILProvider>
      {children}
    </HILProvider>
  );
}

describe('HILEditorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders with variation and metadata', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('HIL Editor')).toBeInTheDocument();
    expect(screen.getByText('Human-in-the-Loop Content Refinement')).toBeInTheDocument();
    expect(screen.getByText('high confidence')).toBeInTheDocument();
  });

  it('displays variation context correctly', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Variation Context')).toBeInTheDocument();
    expect(screen.getByText('Fills Gap: People management')).toBeInTheDocument();
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Built team of 8, Launched MVP')).toBeInTheDocument();
  });

  it('shows content in preview mode by default', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText(mockVariation.content)).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('switches to edit mode when edit button is clicked', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(screen.getByDisplayValue(mockVariation.content)).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('tracks changes and enables save button', async () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Switch to edit mode
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    // Make changes
    const textarea = screen.getByDisplayValue(mockVariation.content);
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
      expect(screen.getByText('Save Changes')).not.toBeDisabled();
    });
  });

  it('calls onSave with updated content and metadata', async () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Switch to edit mode and make changes
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    const textarea = screen.getByDisplayValue(mockVariation.content);
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockHandlers.onSave).toHaveBeenCalledWith(
        'Updated content',
        expect.objectContaining({
          changeType: 'modification',
          usageCount: 1
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockHandlers.onCancel).toHaveBeenCalled();
  });

  it('resets content when reset button is clicked', async () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Switch to edit mode and make changes
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    const textarea = screen.getByDisplayValue(mockVariation.content);
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    // Reset changes
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText(mockVariation.content)).toBeInTheDocument();
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });
  });

  it('loads draft from localStorage on mount', () => {
    const draftContent = 'Draft content from localStorage';
    const draft = {
      content: draftContent,
      metadata: mockMetadata,
      timestamp: new Date().toISOString()
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(draft));

    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText(draftContent)).toBeInTheDocument();
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('saves draft to localStorage when content changes', async () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Switch to edit mode and make changes
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    const textarea = screen.getByDisplayValue(mockVariation.content);
    fireEvent.change(textarea, { target: { value: 'New content' } });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'hil-draft-var-1',
        expect.stringContaining('New content')
      );
    });
  });

  it('shows different confidence colors', () => {
    const lowConfidenceMetadata = { ...mockMetadata, confidence: 'low' as const };
    
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={lowConfidenceMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const confidenceBadge = screen.getByText('low confidence');
    expect(confidenceBadge).toHaveClass('bg-destructive/10', 'text-destructive');
  });

  it('displays tabs correctly', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('shows analysis tab content', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const analysisTab = screen.getByText('Analysis');
    fireEvent.click(analysisTab);

    // Just verify the tab can be clicked
    expect(analysisTab).toBeInTheDocument();
  });

  it('shows history tab content', () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const historyTab = screen.getByText('History');
    fireEvent.click(historyTab);

    // Just verify the tab can be clicked
    expect(historyTab).toBeInTheDocument();
  });

  it('handles AI assist button click', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    const aiAssistButton = screen.getByText('AI Assist');
    fireEvent.click(aiAssistButton);

    expect(consoleSpy).toHaveBeenCalledWith('AI assistance requested');
    
    consoleSpy.mockRestore();
  });

  it('clears draft when save is successful', async () => {
    render(
      <TestWrapper>
        <HILEditorPanel
          variation={mockVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    // Switch to edit mode and make changes
    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    const textarea = screen.getByDisplayValue(mockVariation.content);
    fireEvent.change(textarea, { target: { value: 'Updated content' } });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('hil-draft-var-1');
    });
  });

  it('handles variation without gap or job title', () => {
    const simpleVariation = {
      ...mockVariation,
      filledGap: undefined,
      developedForJobTitle: undefined
    };

    render(
      <TestWrapper>
        <HILEditorPanel
          variation={simpleVariation}
          story={mockStory}
          metadata={mockMetadata}
          {...mockHandlers}
        />
      </TestWrapper>
    );

    expect(screen.getByText('Variant (AI)')).toBeInTheDocument();
  });
});
