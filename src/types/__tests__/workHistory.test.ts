import { describe, it, expect } from 'vitest';
import type { 
  WorkHistoryBlurb, 
  BlurbVariation, 
  WorkHistoryRole, 
  WorkHistoryCompany 
} from '../workHistory';

describe('WorkHistory Types', () => {
  describe('BlurbVariation', () => {
    it('should have required fields', () => {
      const variation: BlurbVariation = {
        id: 'var-1',
        content: 'Test variation content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'AI'
      };

      expect(variation.id).toBe('var-1');
      expect(variation.content).toBe('Test variation content');
      expect(variation.createdAt).toBe('2024-01-01T00:00:00Z');
      expect(variation.createdBy).toBe('AI');
    });

    it('should have optional fields', () => {
      const variation: BlurbVariation = {
        id: 'var-2',
        content: 'Test variation with optional fields',
        developedForJobTitle: 'Senior Product Manager',
        filledGap: 'Team Leadership',
        jdTags: ['Leadership', 'Management'],
        outcomeMetrics: ['Built team of 8', 'Launched MVP'],
        tags: ['Team Building', 'Leadership'],
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user'
      };

      expect(variation.developedForJobTitle).toBe('Senior Product Manager');
      expect(variation.filledGap).toBe('Team Leadership');
      expect(variation.jdTags).toEqual(['Leadership', 'Management']);
      expect(variation.outcomeMetrics).toEqual(['Built team of 8', 'Launched MVP']);
      expect(variation.tags).toEqual(['Team Building', 'Leadership']);
    });

    it('should accept all createdBy values', () => {
      const aiVariation: BlurbVariation = {
        id: 'var-ai',
        content: 'AI generated content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'AI'
      };

      const userVariation: BlurbVariation = {
        id: 'var-user',
        content: 'User created content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user'
      };

      const userEditedAI: BlurbVariation = {
        id: 'var-edited',
        content: 'User edited AI content',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: 'user-edited-AI'
      };

      expect(aiVariation.createdBy).toBe('AI');
      expect(userVariation.createdBy).toBe('user');
      expect(userEditedAI.createdBy).toBe('user-edited-AI');
    });
  });

  describe('WorkHistoryBlurb with variations', () => {
    it('should have optional variations field', () => {
      const blurbWithoutVariations: WorkHistoryBlurb = {
        id: 'blurb-1',
        roleId: 'role-1',
        title: 'Test Story',
        content: 'Test content',
        outcomeMetrics: ['Metric 1'],
        tags: ['Tag 1'],
        source: 'manual',
        status: 'draft',
        confidence: 'medium',
        timesUsed: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      const blurbWithVariations: WorkHistoryBlurb = {
        ...blurbWithoutVariations,
        variations: [
          {
            id: 'var-1',
            content: 'Variation 1',
            createdAt: '2024-01-01T00:00:00Z',
            createdBy: 'AI'
          }
        ]
      };

      expect(blurbWithoutVariations.variations).toBeUndefined();
      expect(blurbWithVariations.variations).toHaveLength(1);
      expect(blurbWithVariations.variations![0].id).toBe('var-1');
    });

    it('should maintain backward compatibility', () => {
      const oldBlurb: WorkHistoryBlurb = {
        id: 'blurb-old',
        roleId: 'role-1',
        title: 'Old Story',
        content: 'Old content',
        outcomeMetrics: ['Old metric'],
        tags: ['Old tag'],
        source: 'manual',
        status: 'draft',
        confidence: 'medium',
        timesUsed: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      // Should work without variations
      expect(oldBlurb.id).toBe('blurb-old');
      expect(oldBlurb.variations).toBeUndefined();
    });
  });

  describe('Type composition', () => {
    it('should allow WorkHistoryRole with blurbs containing variations', () => {
      const role: WorkHistoryRole = {
        id: 'role-1',
        companyId: 'company-1',
        title: 'Product Manager',
        type: 'full-time',
        startDate: '2022-01',
        endDate: '2024-01',
        description: 'Test role',
        inferredLevel: 'Senior',
        tags: ['Product'],
        outcomeMetrics: ['Metric 1'],
        blurbs: [
          {
            id: 'blurb-1',
            roleId: 'role-1',
            title: 'Test Story',
            content: 'Test content',
            outcomeMetrics: ['Metric 1'],
            tags: ['Tag 1'],
            source: 'manual',
            status: 'draft',
            confidence: 'medium',
            timesUsed: 0,
            variations: [
              {
                id: 'var-1',
                content: 'Variation content',
                createdAt: '2024-01-01T00:00:00Z',
                createdBy: 'AI'
              }
            ],
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ],
        externalLinks: [],
        createdAt: '2022-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      expect(role.blurbs[0].variations).toHaveLength(1);
      expect(role.blurbs[0].variations![0].id).toBe('var-1');
    });

    it('should allow WorkHistoryCompany with roles containing blurbs with variations', () => {
      const company: WorkHistoryCompany = {
        id: 'company-1',
        name: 'Test Company',
        tags: ['Tech'],
        source: 'manual',
        createdAt: '2020-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        roles: [
          {
            id: 'role-1',
            companyId: 'company-1',
            title: 'Product Manager',
            type: 'full-time',
            startDate: '2022-01',
            endDate: '2024-01',
            description: 'Test role',
            inferredLevel: 'Senior',
            tags: ['Product'],
            outcomeMetrics: ['Metric 1'],
            blurbs: [
              {
                id: 'blurb-1',
                roleId: 'role-1',
                title: 'Test Story',
                content: 'Test content',
                outcomeMetrics: ['Metric 1'],
                tags: ['Tag 1'],
                source: 'manual',
                status: 'draft',
                confidence: 'medium',
                timesUsed: 0,
                variations: [
                  {
                    id: 'var-1',
                    content: 'Variation content',
                    createdAt: '2024-01-01T00:00:00Z',
                    createdBy: 'AI'
                  }
                ],
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z'
              }
            ],
            externalLinks: [],
            createdAt: '2022-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        ]
      };

      expect(company.roles[0].blurbs[0].variations).toHaveLength(1);
      expect(company.roles[0].blurbs[0].variations![0].id).toBe('var-1');
    });
  });
});
