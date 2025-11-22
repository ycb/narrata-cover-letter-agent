import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeSectionAttribution } from './useSectionAttribution';
import type { EnhancedMatchData } from '@/types/coverLetters';
import type { CoverLetterCriterion } from './useSectionAttribution';

// Mock console methods for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  // Silence console output during tests
  console.log = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
  vi.clearAllMocks();
});

describe('computeSectionAttribution', () => {
  describe('UUID Matching (Preferred Path)', () => {
    it('should match core requirements using exact UUID match', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: '5+ years PM experience',
            demonstrated: true,
            evidence: 'Mentioned in experience section',
            sectionIds: ['section-2-2'], // UUID format
            severity: 'critical',
          },
          {
            id: 'core-1',
            requirement: 'SQL proficiency',
            demonstrated: false,
            evidence: 'Not mentioned',
            sectionIds: [],
            severity: 'important',
          },
        ],
        preferredRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-2-2',
        sectionType: 'experience',
        enhancedMatchData,
        ratingCriteria: [],
      });

      expect(result.attribution.coreReqs.met).toHaveLength(1);
      expect(result.attribution.coreReqs.met[0].label).toBe('5+ years PM experience');
      expect(result.attribution.coreReqs.met[0].evidence).toBe('Mentioned in experience section');
      expect(result.attribution.coreReqs.unmet).toHaveLength(1);
      expect(result.summary.coreMetCount).toBe(1);
    });

    it('should match preferred requirements using exact UUID match', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [],
        preferredRequirementDetails: [
          {
            id: 'pref-0',
            requirement: 'AI/ML experience',
            demonstrated: true,
            evidence: 'Led ML product at previous company',
            sectionIds: ['section-1-1'],
            severity: 'nice-to-have',
          },
        ],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria: [],
      });

      expect(result.attribution.prefReqs.met).toHaveLength(1);
      expect(result.attribution.prefReqs.met[0].label).toBe('AI/ML experience');
      expect(result.summary.prefMetCount).toBe(1);
    });

    it('should handle multiple section IDs for a single requirement', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Cross-functional leadership',
            demonstrated: true,
            evidence: 'Mentioned in multiple sections',
            sectionIds: ['section-1-1', 'section-2-2', 'section-3-3'], // Multiple sections
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      // Should match in section 1
      const result1 = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria: [],
      });
      expect(result1.summary.coreMetCount).toBe(1);

      // Should match in section 2
      const result2 = computeSectionAttribution({
        sectionId: 'section-2-2',
        sectionType: 'experience',
        enhancedMatchData,
        ratingCriteria: [],
      });
      expect(result2.summary.coreMetCount).toBe(1);

      // Should NOT match in section 4
      const result3 = computeSectionAttribution({
        sectionId: 'section-4-4',
        sectionType: 'closing',
        enhancedMatchData,
        ratingCriteria: [],
      });
      expect(result3.summary.coreMetCount).toBe(0);
    });
  });

  describe('Semantic Type Matching (Legacy/Fallback Path)', () => {
    it('should match using semantic type when UUID not available', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Product strategy',
            demonstrated: true,
            evidence: 'In introduction',
            sectionIds: ['introduction'], // Semantic format (legacy)
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria: [],
      });

      expect(result.attribution.coreReqs.met).toHaveLength(1);
      expect(result.summary.coreMetCount).toBe(1);
    });

    it('should match semantic aliases (intro -> introduction)', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Executive presence',
            demonstrated: true,
            evidence: 'In intro',
            sectionIds: ['intro'], // Alias
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria: [],
      });

      expect(result.summary.coreMetCount).toBe(1);
    });

    it('should match semantic aliases (paragraph -> experience)', () => {
      const enhancedMatchData: EnhancedMatchData = {
        preferredRequirementDetails: [
          {
            id: 'pref-0',
            requirement: 'Data analysis',
            demonstrated: true,
            evidence: 'In body paragraph',
            sectionIds: ['paragraph'], // Alias for experience
            severity: 'nice-to-have',
          },
        ],
        coreRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-2-2',
        sectionType: 'experience',
        enhancedMatchData,
        ratingCriteria: [],
      });

      expect(result.summary.prefMetCount).toBe(1);
    });

    it('should match dynamic section types to experience', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'PM experience',
            demonstrated: true,
            evidence: 'In experience section',
            sectionIds: ['experience'],
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      // Should match dynamic-story type
      const result1 = computeSectionAttribution({
        sectionId: 'section-2-1',
        sectionType: 'dynamic-story',
        enhancedMatchData,
        ratingCriteria: [],
      });
      expect(result1.summary.coreMetCount).toBe(1);

      // Should match dynamic-saved type
      const result2 = computeSectionAttribution({
        sectionId: 'section-2-2',
        sectionType: 'dynamic-saved',
        enhancedMatchData,
        ratingCriteria: [],
      });
      expect(result2.summary.coreMetCount).toBe(1);
    });
  });

  describe('Priority: UUID over Semantic', () => {
    it('should prefer UUID match over semantic match when both present', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Leadership',
            demonstrated: true,
            evidence: 'Evidence',
            sectionIds: ['section-1-1'], // UUID should match section-1-1
            severity: 'critical',
          },
          {
            id: 'core-1',
            requirement: 'Strategy',
            demonstrated: true,
            evidence: 'Evidence',
            sectionIds: ['introduction'], // Semantic should match section-1-1
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria: [],
      });

      // Both should match (one via UUID, one via semantic)
      expect(result.summary.coreMetCount).toBe(2);
    });
  });

  describe('Rating Criteria (Standards)', () => {
    it('should include met and unmet standards', () => {
      const ratingCriteria: CoverLetterCriterion[] = [
        {
          id: 'compelling_opening',
          label: 'Compelling Opening',
          met: true,
          evidence: 'Strong hook in first paragraph',
        },
        {
          id: 'quantified_achievements',
          label: 'Quantified Achievements',
          met: false,
          evidence: 'No metrics mentioned',
          suggestion: 'Add specific numbers and percentages',
        },
      ];

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData: {
          coreRequirementDetails: [],
          preferredRequirementDetails: [],
        },
        ratingCriteria,
      });

      expect(result.attribution.standards.met).toHaveLength(1);
      expect(result.attribution.standards.met[0].label).toBe('Compelling Opening');
      expect(result.attribution.standards.unmet).toHaveLength(1);
      expect(result.attribution.standards.unmet[0].label).toBe('Quantified Achievements');
      expect(result.attribution.standards.unmet[0].suggestion).toBe('Add specific numbers and percentages');
      expect(result.summary.standardsMetCount).toBe(1);
    });

    it('should handle empty ratingCriteria gracefully', () => {
      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData: {
          coreRequirementDetails: [],
          preferredRequirementDetails: [],
        },
        ratingCriteria: [],
      });

      expect(result.attribution.standards.met).toHaveLength(0);
      expect(result.attribution.standards.unmet).toHaveLength(0);
      expect(result.summary.standardsMetCount).toBe(0);
    });

    it('should handle undefined ratingCriteria gracefully', () => {
      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData: {
          coreRequirementDetails: [],
          preferredRequirementDetails: [],
        },
        ratingCriteria: undefined,
      });

      expect(result.attribution.standards.met).toHaveLength(0);
      expect(result.attribution.standards.unmet).toHaveLength(0);
      expect(result.summary.standardsMetCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty enhancedMatchData', () => {
      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData: {
          coreRequirementDetails: [],
          preferredRequirementDetails: [],
        },
        ratingCriteria: [],
      });

      expect(result.attribution.coreReqs.met).toHaveLength(0);
      expect(result.attribution.coreReqs.unmet).toHaveLength(0);
      expect(result.attribution.prefReqs.met).toHaveLength(0);
      expect(result.attribution.prefReqs.unmet).toHaveLength(0);
      expect(result.summary.coreMetCount).toBe(0);
      expect(result.summary.prefMetCount).toBe(0);
    });

    it('should handle null/undefined enhancedMatchData', () => {
      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData: null,
        ratingCriteria: [],
      });

      expect(result.attribution.coreReqs.met).toHaveLength(0);
      expect(result.attribution.coreReqs.unmet).toHaveLength(0);
      expect(result.summary.coreMetCount).toBe(0);
    });

    it('should handle requirements with empty sectionIds arrays', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Not demonstrated',
            demonstrated: false,
            evidence: 'Missing',
            sectionIds: [], // Empty array
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria: [],
      });

      expect(result.summary.coreMetCount).toBe(0);
      expect(result.attribution.coreReqs.unmet).toHaveLength(1);
    });

    it('should handle requirements with missing sectionIds field', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Missing sectionIds',
            demonstrated: true,
            evidence: 'Evidence',
            // @ts-expect-error - Testing runtime behavior with missing field
            sectionIds: undefined,
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria: [],
      });

      // Should treat undefined sectionIds as empty array
      expect(result.summary.coreMetCount).toBe(0);
    });

    it('should handle case-insensitive semantic matching', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Test',
            demonstrated: true,
            evidence: 'Evidence',
            sectionIds: ['INTRODUCTION'], // Uppercase
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [],
      };

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction', // Lowercase
        enhancedMatchData,
        ratingCriteria: [],
      });

      expect(result.summary.coreMetCount).toBe(1);
    });
  });

  describe('Summary Counts', () => {
    it('should correctly aggregate summary counts across all types', () => {
      const enhancedMatchData: EnhancedMatchData = {
        coreRequirementDetails: [
          {
            id: 'core-0',
            requirement: 'Core 1',
            demonstrated: true,
            evidence: 'E1',
            sectionIds: ['section-1-1'],
            severity: 'critical',
          },
          {
            id: 'core-1',
            requirement: 'Core 2',
            demonstrated: true,
            evidence: 'E2',
            sectionIds: ['section-1-1'],
            severity: 'critical',
          },
        ],
        preferredRequirementDetails: [
          {
            id: 'pref-0',
            requirement: 'Pref 1',
            demonstrated: true,
            evidence: 'E3',
            sectionIds: ['section-1-1'],
            severity: 'nice-to-have',
          },
        ],
      };

      const ratingCriteria: CoverLetterCriterion[] = [
        {
          id: 'std-1',
          label: 'Standard 1',
          met: true,
          evidence: 'Met',
        },
        {
          id: 'std-2',
          label: 'Standard 2',
          met: true,
          evidence: 'Met',
        },
        {
          id: 'std-3',
          label: 'Standard 3',
          met: true,
          evidence: 'Met',
        },
      ];

      const result = computeSectionAttribution({
        sectionId: 'section-1-1',
        sectionType: 'introduction',
        enhancedMatchData,
        ratingCriteria,
      });

      expect(result.summary).toEqual({
        coreMetCount: 2,
        prefMetCount: 1,
        standardsMetCount: 3,
      });
    });
  });
});
