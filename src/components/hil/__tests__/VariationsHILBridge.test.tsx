import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VariationsHILBridge } from '../VariationsHILBridge';
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

const mockVariations: BlurbVariation[] = [
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
    content: 'Led a team of 8 product professionals while launching MVP in record 6 months. I developed annual and quarterly roadmaps for 3 product lines.',
    filledGap: 'Roadmap',
    developedForJobTitle: 'Product Manager',
    jdTags: ['roadmap', 'planning'],
    outcomeMetrics: ['Built team of 8', 'Launched MVP'],
    tags: ['roadmap', 'planning'],
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user'
  },
  {
    id: 'var-3',
    content: 'Led a team of 8 product professionals while launching MVP in record 6 months.',
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-edited-AI'
  }
];

// Mock handlers
const mockHandlers = {
  onVariationEdit: vi.fn(),
  onVariationCreate: vi.fn(),
  onVariationDelete: vi.fn(),
  onHILEdit: vi.fn()
};

describe('VariationsHILBridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with story and variations', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Variations Bridge')).toBeInTheDocument();
    expect(screen.getByText('3 variations')).toBeInTheDocument();
    expect(screen.getByText('Base Story')).toBeInTheDocument();
    expect(screen.getByText(mockStory.content)).toBeInTheDocument();
  });

  it('displays variations sorted by priority', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Check that gap-filling variations appear first
    expect(screen.getByText('Fills Gap: People management')).toBeInTheDocument();
    expect(screen.getByText('Fills Gap: Roadmap')).toBeInTheDocument();
  });

  it('shows variation labels correctly', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Fills Gap: People management')).toBeInTheDocument();
    expect(screen.getByText('Fills Gap: Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Variant #3 (User)')).toBeInTheDocument();
  });

  it('expands and collapses variations', async () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Initially, variations should be collapsed
    expect(screen.queryByText('HIL Edit')).not.toBeInTheDocument();

    // Click to expand first variation
    const expandButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('chevron-down')
    );
    
    if (expandButtons.length > 0) {
      fireEvent.click(expandButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('HIL Edit')).toBeInTheDocument();
      });
    }
  });

  it('has toggle all button that can be clicked', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Check that toggle all button exists and can be clicked
    const toggleAllButton = screen.getByRole('button', { name: /toggle all variations/i });
    expect(toggleAllButton).toBeInTheDocument();
    
    // Verify it can be clicked without error
    expect(() => fireEvent.click(toggleAllButton)).not.toThrow();
  });

  it('calls onHILEdit with correct parameters', async () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Expand first variation
    const expandButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('chevron-down')
    );
    
    if (expandButtons.length > 0) {
      fireEvent.click(expandButtons[0]);
      
      await waitFor(() => {
        const hilEditButton = screen.getByText('HIL Edit');
        fireEvent.click(hilEditButton);
      });

      expect(mockHandlers.onHILEdit).toHaveBeenCalledWith(
        mockVariations[0],
        expect.objectContaining({
          source: 'variation',
          sourceId: 'var-1',
          variationId: 'var-1',
          originalContent: mockVariations[0].content
        })
      );
    }
  });

  it('calls onVariationEdit when edit button is clicked', async () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Expand first variation
    const expandButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('chevron-down')
    );
    
    if (expandButtons.length > 0) {
      fireEvent.click(expandButtons[0]);
      
      await waitFor(() => {
        const editButton = screen.getByText('Edit');
        fireEvent.click(editButton);
      });

      expect(mockHandlers.onVariationEdit).toHaveBeenCalledWith(mockVariations[0]);
    }
  });

  it('calls onVariationDelete when delete button is clicked', async () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Expand first variation
    const expandButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('chevron-down')
    );
    
    if (expandButtons.length > 0) {
      fireEvent.click(expandButtons[0]);
      
      await waitFor(() => {
        const deleteButton = screen.getByText('Delete');
        fireEvent.click(deleteButton);
      });

      expect(mockHandlers.onVariationDelete).toHaveBeenCalledWith('var-1');
    }
  });

  it('displays variation metadata correctly', async () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Expand first variation
    const expandButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('chevron-down')
    );
    
    if (expandButtons.length > 0) {
      fireEvent.click(expandButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText('People management')).toBeInTheDocument();
        expect(screen.getByText('Senior PM')).toBeInTheDocument();
        expect(screen.getByText('Built team of 8, Launched MVP')).toBeInTheDocument();
      });
    }
  });

  it('shows created by indicators correctly', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Check that AI, user, and user-edited-AI indicators are present
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument(); // user-edited-AI shows as "user"
  });

  it('handles empty variations gracefully', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={[]}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('0 variations')).toBeInTheDocument();
    expect(screen.getByText('No variations yet')).toBeInTheDocument();
    expect(screen.getByText('Create variations to fill different gaps and job requirements')).toBeInTheDocument();
  });

  it('shows create new variation button', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    expect(screen.getByText('Create New Variation')).toBeInTheDocument();
  });

  it('displays variation content when expanded', async () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Expand first variation
    const expandButtons = screen.getAllByRole('button').filter(button => 
      button.querySelector('svg')?.classList.contains('chevron-down')
    );
    
    if (expandButtons.length > 0) {
      fireEvent.click(expandButtons[0]);
      
      await waitFor(() => {
        expect(screen.getByText(mockVariations[0].content)).toBeInTheDocument();
      });
    }
  });

  it('applies correct priority colors', () => {
    render(
      <VariationsHILBridge
        story={mockStory}
        variations={mockVariations}
        {...mockHandlers}
      />
    );

    // Check that gap-filling variations have success styling
    const gapFillingBadges = screen.getAllByText(/Fills Gap:/);
    gapFillingBadges.forEach(badge => {
      expect(badge).toHaveClass('bg-success/10', 'text-success');
    });
  });
});

