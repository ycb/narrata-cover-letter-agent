import { describe, it, expect } from 'vitest';
import type { BlurbVariation } from '@/types/workHistory';

// Utility functions for variations (these would be extracted from components)
export const getVariationLabel = (variation: BlurbVariation, index: number): string => {
  if (variation.filledGap) {
    return `Fills Gap: ${variation.filledGap}`;
  }
  if (variation.developedForJobTitle) {
    return `For ${variation.developedForJobTitle}`;
  }
  return `Variant #${index + 1} (${variation.createdBy === 'AI' ? 'AI' : 'User'})`;
};

export const getVariationPriority = (variation: BlurbVariation): number => {
  if (variation.filledGap) return 1; // Highest priority
  if (variation.developedForJobTitle) return 2; // Medium priority
  return 3; // Lowest priority (fallback)
};

export const sortVariationsByPriority = (variations: BlurbVariation[]): BlurbVariation[] => {
  return [...variations].sort((a, b) => getVariationPriority(a) - getVariationPriority(b));
};

export const filterVariationsByGap = (variations: BlurbVariation[], gap: string): BlurbVariation[] => {
  return variations.filter(v => v.filledGap === gap);
};

export const filterVariationsByJobTitle = (variations: BlurbVariation[], jobTitle: string): BlurbVariation[] => {
  return variations.filter(v => v.developedForJobTitle === jobTitle);
};

describe('Variations Utilities', () => {
  describe('getVariationLabel', () => {
    it('prioritizes filledGap over developedForJobTitle', () => {
      const variation: BlurbVariation = {
        id: 'var-1',
        content: 'Test content',
        filledGap: 'Leadership Skills',
        developedForJobTitle: 'Product Manager',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'AI'
      };

      const label = getVariationLabel(variation, 0);
      expect(label).toBe('Fills Gap: Leadership Skills');
    });

    it('shows job title when no gap is filled', () => {
      const variation: BlurbVariation = {
        id: 'var-2',
        content: 'Test content',
        developedForJobTitle: 'Senior Product Manager',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user'
      };

      const label = getVariationLabel(variation, 0);
      expect(label).toBe('For Senior Product Manager');
    });

    it('shows fallback label when no metadata available', () => {
      const variation: BlurbVariation = {
        id: 'var-3',
        content: 'Test content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'AI'
      };

      const label = getVariationLabel(variation, 2);
      expect(label).toBe('Variant #3 (AI)');
    });

    it('handles user-created variations correctly', () => {
      const variation: BlurbVariation = {
        id: 'var-4',
        content: 'Test content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user'
      };

      const label = getVariationLabel(variation, 0);
      expect(label).toBe('Variant #1 (User)');
    });

    it('handles user-edited-AI variations correctly', () => {
      const variation: BlurbVariation = {
        id: 'var-5',
        content: 'Test content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-edited-AI'
      };

      const label = getVariationLabel(variation, 0);
      expect(label).toBe('Variant #1 (User)');
    });
  });

  describe('getVariationPriority', () => {
    it('assigns highest priority to gap-filling variations', () => {
      const variation: BlurbVariation = {
        id: 'var-1',
        content: 'Test content',
        filledGap: 'Leadership Skills',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'AI'
      };

      const priority = getVariationPriority(variation);
      expect(priority).toBe(1);
    });

    it('assigns medium priority to job-title-specific variations', () => {
      const variation: BlurbVariation = {
        id: 'var-2',
        content: 'Test content',
        developedForJobTitle: 'Product Manager',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user'
      };

      const priority = getVariationPriority(variation);
      expect(priority).toBe(2);
    });

    it('assigns lowest priority to fallback variations', () => {
      const variation: BlurbVariation = {
        id: 'var-3',
        content: 'Test content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'AI'
      };

      const priority = getVariationPriority(variation);
      expect(priority).toBe(3);
    });
  });

  describe('sortVariationsByPriority', () => {
    it('sorts variations by priority correctly', () => {
      const variations: BlurbVariation[] = [
        {
          id: 'var-3',
          content: 'Fallback variation',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        },
        {
          id: 'var-1',
          content: 'Gap-filling variation',
          filledGap: 'Leadership Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        },
        {
          id: 'var-2',
          content: 'Job-specific variation',
          developedForJobTitle: 'Product Manager',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'user'
        }
      ];

      const sorted = sortVariationsByPriority(variations);
      
      expect(sorted[0].id).toBe('var-1'); // Gap-filling (priority 1)
      expect(sorted[1].id).toBe('var-2'); // Job-specific (priority 2)
      expect(sorted[2].id).toBe('var-3'); // Fallback (priority 3)
    });

    it('maintains stable sorting for same priority', () => {
      const variations: BlurbVariation[] = [
        {
          id: 'var-1',
          content: 'First gap variation',
          filledGap: 'Leadership Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        },
        {
          id: 'var-2',
          content: 'Second gap variation',
          filledGap: 'Technical Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        }
      ];

      const sorted = sortVariationsByPriority(variations);
      
      // Both have priority 1, should maintain original order
      expect(sorted[0].id).toBe('var-1');
      expect(sorted[1].id).toBe('var-2');
    });
  });

  describe('filterVariationsByGap', () => {
    it('filters variations by specific gap', () => {
      const variations: BlurbVariation[] = [
        {
          id: 'var-1',
          content: 'Leadership variation',
          filledGap: 'Leadership Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        },
        {
          id: 'var-2',
          content: 'Technical variation',
          filledGap: 'Technical Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        },
        {
          id: 'var-3',
          content: 'Another leadership variation',
          filledGap: 'Leadership Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'user'
        }
      ];

      const leadershipVariations = filterVariationsByGap(variations, 'Leadership Skills');
      
      expect(leadershipVariations).toHaveLength(2);
      expect(leadershipVariations[0].id).toBe('var-1');
      expect(leadershipVariations[1].id).toBe('var-3');
    });

    it('returns empty array when no variations match gap', () => {
      const variations: BlurbVariation[] = [
        {
          id: 'var-1',
          content: 'Leadership variation',
          filledGap: 'Leadership Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        }
      ];

      const technicalVariations = filterVariationsByGap(variations, 'Technical Skills');
      
      expect(technicalVariations).toHaveLength(0);
    });
  });

  describe('filterVariationsByJobTitle', () => {
    it('filters variations by specific job title', () => {
      const variations: BlurbVariation[] = [
        {
          id: 'var-1',
          content: 'PM variation',
          developedForJobTitle: 'Product Manager',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        },
        {
          id: 'var-2',
          content: 'Director variation',
          developedForJobTitle: 'Product Director',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'user'
        },
        {
          id: 'var-3',
          content: 'Another PM variation',
          developedForJobTitle: 'Product Manager',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        }
      ];

      const pmVariations = filterVariationsByJobTitle(variations, 'Product Manager');
      
      expect(pmVariations).toHaveLength(2);
      expect(pmVariations[0].id).toBe('var-1');
      expect(pmVariations[1].id).toBe('var-3');
    });

    it('returns empty array when no variations match job title', () => {
      const variations: BlurbVariation[] = [
        {
          id: 'var-1',
          content: 'PM variation',
          developedForJobTitle: 'Product Manager',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        }
      ];

      const directorVariations = filterVariationsByJobTitle(variations, 'Product Director');
      
      expect(directorVariations).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty variations array', () => {
      const variations: BlurbVariation[] = [];
      
      expect(sortVariationsByPriority(variations)).toEqual([]);
      expect(filterVariationsByGap(variations, 'Leadership')).toEqual([]);
      expect(filterVariationsByJobTitle(variations, 'Product Manager')).toEqual([]);
    });

    it('handles variations with undefined optional fields', () => {
      const variation: BlurbVariation = {
        id: 'var-1',
        content: 'Test content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'AI'
      };

      const label = getVariationLabel(variation, 0);
      const priority = getVariationPriority(variation);

      expect(label).toBe('Variant #1 (AI)');
      expect(priority).toBe(3);
    });

    it('handles case-sensitive gap and job title matching', () => {
      const variations: BlurbVariation[] = [
        {
          id: 'var-1',
          content: 'Leadership variation',
          filledGap: 'Leadership Skills',
          createdAt: '2024-01-01T00:00:00Z',
          createdBy: 'AI'
        }
      ];

      const leadershipVariations = filterVariationsByGap(variations, 'leadership skills');
      
      // Should be case-sensitive
      expect(leadershipVariations).toHaveLength(0);
    });
  });
});

