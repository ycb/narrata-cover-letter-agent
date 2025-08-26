import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StoryCard } from '../StoryCard';
import type { WorkHistoryBlurb, ExternalLink } from '@/types/workHistory';

// Mock data for testing
const mockStory: WorkHistoryBlurb = {
  id: 'story-1',
  roleId: 'role-1',
  title: 'Product Strategy Leadership',
  content: 'As Product Lead at TechCorp I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months.',
  outcomeMetrics: [
    'Launched MVP in 6 months',
    'Hired 8 product professionals'
  ],
  tags: ['Product Management', 'Strategy', 'Results'],
  source: 'manual',
  status: 'draft',
  confidence: 'medium',
  timesUsed: 8,
  lastUsed: '2024-01-15',
  linkedExternalLinks: ['link-1'],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-15T00:00:00Z'
};

const mockStoryWithVariations: WorkHistoryBlurb = {
  ...mockStory,
  variations: [
    {
      id: 'var-1',
      content: 'As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months. My leadership philosophy is centered on empathy and candor. I implemented annual reviews and PM levelling.',
      filledGap: 'People management',
      tags: ['philosophy', 'team management'],
      createdAt: '2024-01-20T00:00:00Z',
      createdBy: 'AI'
    },
    {
      id: 'var-2',
      content: 'As Product Lead at [TechCorp] I built a high-performing product team from ground up, hiring and managing 8 product professionals while launching MVP in record 6 months. I developed annual and quarterly roadmaps for 3 product lines and two pods.',
      filledGap: 'Roadmap',
      tags: ['roadmap', 'dependencies'],
      createdAt: '2024-01-22T00:00:00Z',
      createdBy: 'user'
    }
  ]
};

const mockLinkedLinks: ExternalLink[] = [
  {
    id: 'link-1',
    roleId: 'role-1',
    url: 'https://medium.com/@example/product-strategy-guide',
    label: 'Product Strategy Framework - Medium Article',
    type: 'blog',
    tags: ['Product Management', 'Strategy', 'Thought Leadership'],
    timesUsed: 5,
    lastUsed: '2024-01-20',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('StoryCard', () => {
  describe('Basic Story Display', () => {
    it('renders story title and content', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      expect(screen.getByText('Product Strategy Leadership')).toBeInTheDocument();
      expect(screen.getByText(/As Product Lead at TechCorp/)).toBeInTheDocument();
    });

    it('displays outcome metrics', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      expect(screen.getByText('Launched MVP in 6 months')).toBeInTheDocument();
      expect(screen.getByText('Hired 8 product professionals')).toBeInTheDocument();
    });

    it('shows story tags', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      expect(screen.getByText('Product Management')).toBeInTheDocument();
      expect(screen.getByText('Strategy')).toBeInTheDocument();
      expect(screen.getByText('Results')).toBeInTheDocument();
    });

    it('displays usage statistics', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      expect(screen.getByText('Used 8 times')).toBeInTheDocument();
    });

    it('shows usage statistics and last used date', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      expect(screen.getByText('Used 8 times')).toBeInTheDocument();
      expect(screen.getByText(/Last used/)).toBeInTheDocument();
    });
  });

  describe('Variations Display', () => {
    it('shows variations section when variations exist', () => {
      renderWithRouter(<StoryCard story={mockStoryWithVariations} />);

      expect(screen.getByText(/Variations \(/)).toBeInTheDocument();
      expect(screen.getByText('Variations (2)')).toBeInTheDocument();
    });

    it('does not show variations section when no variations exist', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      expect(screen.queryByText('Variations')).not.toBeInTheDocument();
    });

    it('displays variation content correctly', async () => {
      renderWithRouter(<StoryCard story={mockStoryWithVariations} />);

      // Click the Variations header to expand all variations
      const variationsHeader = screen.getByText(/Variations \(/);
      fireEvent.click(variationsHeader);

      // Wait for both variations to expand and show content
      await waitFor(() => {
        // Check that highlighting is working by looking for highlighted spans
        const highlightedSpans = screen.getAllByText(/philosophy|roadmap|dependencies/);
        expect(highlightedSpans.length).toBeGreaterThan(0);
        
        // Check that variation content is visible (even if broken up by highlighting)
        expect(screen.getAllByText(/philosophy/).length).toBeGreaterThan(0);
        expect(screen.getAllByText(/roadmap/).length).toBeGreaterThan(0);
      });
    });

    it('shows variation metadata correctly', async () => {
      renderWithRouter(<StoryCard story={mockStoryWithVariations} />);

      // Click the Variations header to expand all variations
      const variationsHeader = screen.getByText(/Variations \(/);
      fireEvent.click(variationsHeader);

      // Wait for variations to expand and check metadata
      await waitFor(() => {
        expect(screen.getByText('Fills Gap: People management')).toBeInTheDocument();
        expect(screen.getByText('Fills Gap: Roadmap')).toBeInTheDocument();
      });
    });

    it('displays variation tags when available', async () => {
      renderWithRouter(<StoryCard story={mockStoryWithVariations} />);

      // Click the Variations header to expand all variations
      const variationsHeader = screen.getByText(/Variations \(/);
      fireEvent.click(variationsHeader);

      // Wait for the Gap Tags to appear
      await waitFor(() => {
        expect(screen.getAllByText('Gap Tags')).toHaveLength(2);
      });

      // First variation tags - should appear in both the highlighted changes and the tags
      const philosophyElements = screen.getAllByText('philosophy');
      expect(philosophyElements).toHaveLength(2); // One in highlighted changes, one in tags
      expect(screen.getByText('team management')).toBeInTheDocument();

      // Second variation tags
      expect(screen.getByText('roadmap')).toBeInTheDocument();
      expect(screen.getByText('dependencies')).toBeInTheDocument();
    });

    it('shows fallback labeling when no gap or job title metadata', async () => {
      const storyWithFallbackVariation: WorkHistoryBlurb = {
        ...mockStory,
        variations: [
          {
            id: 'var-fallback',
            content: 'Fallback variation content',
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: 'AI'
          }
        ]
      };

      renderWithRouter(<StoryCard story={storyWithFallbackVariation} />);

      // Click the Variations header to expand the variation
      const variationsHeader = screen.getByText(/Variations \(/);
      fireEvent.click(variationsHeader);

      // Wait for the variation to expand and check the label
      await waitFor(() => {
        expect(screen.getByText('Variant #1')).toBeInTheDocument();
      });
    });

    it('prioritizes gap over job title in labeling', async () => {
      const storyWithBothMetadata: WorkHistoryBlurb = {
        ...mockStory,
        variations: [
          {
            id: 'var-both',
            content: 'Variation with both metadata',
            developedForJobTitle: 'Product Manager',
            filledGap: 'Leadership Skills',
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: 'AI'
          }
        ]
      };

      renderWithRouter(<StoryCard story={storyWithBothMetadata} />);

      // Click the Variations header to expand the variation
      const variationsHeader = screen.getByText(/Variations \(/);
      fireEvent.click(variationsHeader);

      // Wait for the variation to expand and check priority
      await waitFor(() => {
        // Should show gap (higher priority) not job title
        expect(screen.getByText('Fills Gap: Leadership Skills')).toBeInTheDocument();
        expect(screen.queryByText('For Product Manager')).not.toBeInTheDocument();
      });
    });
  });

  describe('Linked External Links', () => {
    it('displays linked external links when available', () => {
      renderWithRouter(<StoryCard story={mockStory} linkedLinks={mockLinkedLinks} />);

      expect(screen.getByText('Linked Content')).toBeInTheDocument();
      expect(screen.getByText('1 link')).toBeInTheDocument();
      expect(screen.getByText('Product Strategy Framework - Medium Article')).toBeInTheDocument();
    });

    it('shows link count badge', () => {
      renderWithRouter(<StoryCard story={mockStory} linkedLinks={mockLinkedLinks} />);

      expect(screen.getByText('1 link')).toBeInTheDocument();
    });

    it('displays multiple links with overflow indicator', () => {
      const multipleLinks = [
        ...mockLinkedLinks,
        {
          id: 'link-2',
          roleId: 'role-1',
          url: 'https://github.com/example/product-dashboard',
          label: 'Analytics Dashboard - GitHub',
          type: 'portfolio',
          tags: ['Analytics', 'Dashboard'],
          timesUsed: 3,
          lastUsed: '2024-01-15',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'link-3',
          roleId: 'role-1',
          url: 'https://example.com/case-study',
          label: 'Product Launch Case Study',
          type: 'case-study',
          tags: ['Case Study', 'Product Launch'],
          timesUsed: 2,
          lastUsed: '2024-01-10',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      renderWithRouter(<StoryCard story={mockStory} linkedLinks={multipleLinks} />);

      expect(screen.getByText('3 links')).toBeInTheDocument();
      expect(screen.getByText('+1 more links')).toBeInTheDocument();
    });
  });

  describe('Component Props and Rendering', () => {
    it('renders with custom className', () => {
      renderWithRouter(<StoryCard story={mockStory} className="custom-class" />);

      const card = screen.getByText('Product Strategy Leadership').closest('.custom-class');
      expect(card).toBeInTheDocument();
    });

    it('renders without linked links gracefully', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      expect(screen.queryByText('Linked Content')).not.toBeInTheDocument();
    });

    it('renders without action handlers gracefully', () => {
      renderWithRouter(<StoryCard story={mockStory} />);

      // Should still render the dropdown button
      expect(screen.getByRole('button', { name: /open menu/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles story with no tags gracefully', () => {
      const storyWithoutTags = { ...mockStory, tags: [] };
      renderWithRouter(<StoryCard story={storyWithoutTags} />);

      expect(screen.queryByText('Story Tags')).not.toBeInTheDocument();
    });

    it('handles story with no outcome metrics gracefully', () => {
      const storyWithoutMetrics = { ...mockStory, outcomeMetrics: [] };
      renderWithRouter(<StoryCard story={storyWithoutMetrics} />);

      // Should still render but with no metrics
      expect(screen.getByText('Product Strategy Leadership')).toBeInTheDocument();
    });

    it('handles variation with no tags gracefully', async () => {
      const storyWithVariationNoTags: WorkHistoryBlurb = {
        ...mockStory,
        variations: [
          {
            id: 'var-no-tags',
            content: 'Variation without tags',
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: 'AI'
          }
        ]
      };

      renderWithRouter(<StoryCard story={storyWithVariationNoTags} />);

      expect(screen.getByText(/Variations \(/)).toBeInTheDocument();
      
      // Click to expand and see the variation
      const variationsHeader = screen.getByText(/Variations \(/);
      fireEvent.click(variationsHeader);
      
      await waitFor(() => {
        expect(screen.getByText('Variant #1')).toBeInTheDocument();
      });
    });

    it('handles very long variation content with line-clamp', async () => {
      const storyWithLongVariation: WorkHistoryBlurb = {
        ...mockStory,
        variations: [
          {
            id: 'var-long',
            content: 'This is a very long variation content that should be truncated and not break the layout. It contains many words and should demonstrate the line-clamp functionality that prevents overflow issues in the UI.',
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: 'AI'
          }
        ]
      };

      renderWithRouter(<StoryCard story={storyWithLongVariation} />);

      // Click the Variations header to expand the variation
      const variationsHeader = screen.getByText(/Variations \(/);
      fireEvent.click(variationsHeader);

      // Wait for the variation to expand and check that highlighting is working
      await waitFor(() => {
        const highlightedSpans = screen.getAllByText(/very long|variation|content/);
        expect(highlightedSpans.length).toBeGreaterThan(0);
      });
      // The content should now be fully visible without truncation
    });
  });
});
