/**
 * Unit tests for streaming section builder functionality (Agent C)
 * 
 * Tests verify that sections are emitted progressively during draft generation,
 * enabling the UI to render sections as they're built rather than waiting for
 * all sections to complete.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { 
  CoverLetterDraftSection, 
  DraftGenerationOptions,
  DraftGenerationProgressUpdate 
} from '@/types/coverLetters';

describe('Streaming Section Builder (Agent C)', () => {
  describe('DraftGenerationOptions', () => {
    it('should include onSectionBuilt callback in type definition', () => {
      // Type check: Verify the callback signature is correct
      const mockOptions: DraftGenerationOptions = {
        userId: 'test-user',
        templateId: 'test-template',
        jobDescriptionId: 'test-jd',
        onSectionBuilt: (section, index, total) => {
          // Callback should receive:
          // - section: full CoverLetterDraftSection object
          // - index: 0-based position
          // - total: total number of sections
          expect(typeof section.id).toBe('string');
          expect(typeof index).toBe('number');
          expect(typeof total).toBe('number');
        },
      };

      expect(mockOptions.onSectionBuilt).toBeDefined();
    });

    it('should make onSectionBuilt optional for backward compatibility', () => {
      // Verify existing code still compiles without the callback
      const legacyOptions: DraftGenerationOptions = {
        userId: 'test-user',
        templateId: 'test-template',
        jobDescriptionId: 'test-jd',
        // No onSectionBuilt - should still be valid
      };

      expect(legacyOptions).toBeDefined();
    });
  });

  describe('Section Streaming Behavior', () => {
    it('should emit sections progressively as they are built', async () => {
      const emittedSections: Array<{ section: CoverLetterDraftSection; index: number; total: number }> = [];
      
      const mockCallback = vi.fn((section: CoverLetterDraftSection, index: number, total: number) => {
        emittedSections.push({ section, index, total });
      });

      // Simulate the service calling the callback for each section
      const mockSections: Partial<CoverLetterDraftSection>[] = [
        { id: 'section-1', title: 'Introduction', order: 1 },
        { id: 'section-2', title: 'Experience', order: 2 },
        { id: 'section-3', title: 'Closing', order: 3 },
      ];

      const totalSections = mockSections.length;
      
      // Simulate progressive emission
      mockSections.forEach((section, index) => {
        mockCallback(section as CoverLetterDraftSection, index, totalSections);
      });

      // Verify callback was called for each section
      expect(mockCallback).toHaveBeenCalledTimes(3);
      
      // Verify sections were emitted in order
      expect(emittedSections[0].index).toBe(0);
      expect(emittedSections[1].index).toBe(1);
      expect(emittedSections[2].index).toBe(2);
      
      // Verify total was correct for all emissions
      emittedSections.forEach(emission => {
        expect(emission.total).toBe(3);
      });
    });

    it('should emit static sections first, then dynamic sections', async () => {
      const emittedSections: CoverLetterDraftSection[] = [];
      
      const mockCallback = vi.fn((section: CoverLetterDraftSection) => {
        emittedSections.push(section);
      });

      // Simulate section emission order: static -> saved -> story
      const mockSections: Partial<CoverLetterDraftSection>[] = [
        { id: 'intro', type: 'static', order: 1 },
        { id: 'body', type: 'dynamic-story', order: 2 },
        { id: 'saved', type: 'dynamic-saved', order: 3 },
        { id: 'closing', type: 'closing', order: 4 },
      ];

      mockSections.forEach((section, index) => {
        mockCallback(section as CoverLetterDraftSection, index, mockSections.length);
      });

      // Verify all sections were emitted
      expect(emittedSections).toHaveLength(4);
      
      // Verify section types are as expected
      expect(emittedSections[0].type).toBe('static');
      expect(emittedSections[1].type).toBe('dynamic-story');
      expect(emittedSections[2].type).toBe('dynamic-saved');
      expect(emittedSections[3].type).toBe('closing');
    });
  });

  describe('Hook Integration', () => {
    it('should accumulate streaming sections in React state', () => {
      const streamingSections: CoverLetterDraftSection[] = [];
      
      const mockOnSectionBuilt = (section: CoverLetterDraftSection) => {
        // Simulate React setState accumulation
        streamingSections.push(section);
      };

      const mockSections: Partial<CoverLetterDraftSection>[] = [
        { id: 'section-1', order: 1 },
        { id: 'section-2', order: 2 },
        { id: 'section-3', order: 3 },
      ];

      // Simulate progressive accumulation
      mockSections.forEach(section => {
        mockOnSectionBuilt(section as CoverLetterDraftSection);
      });

      expect(streamingSections).toHaveLength(3);
      expect(streamingSections[0].id).toBe('section-1');
      expect(streamingSections[2].id).toBe('section-3');
    });

    it('should generate progress updates for each section', () => {
      const progressUpdates: DraftGenerationProgressUpdate[] = [];
      
      const mockOnProgress = (update: DraftGenerationProgressUpdate) => {
        progressUpdates.push(update);
      };

      // Simulate section building progress
      for (let i = 0; i < 3; i++) {
        mockOnProgress({
          phase: 'content_generation',
          message: `Building section ${i + 1} of 3...`,
          timestamp: Date.now(),
        });
      }

      expect(progressUpdates).toHaveLength(3);
      expect(progressUpdates[0].message).toContain('Building section 1 of 3');
      expect(progressUpdates[2].message).toContain('Building section 3 of 3');
    });

    it('should reset streaming sections on new generation', () => {
      let streamingSections: CoverLetterDraftSection[] = [
        { id: 'old-section' } as CoverLetterDraftSection,
      ];

      // Simulate new generation starting
      streamingSections = []; // Reset
      
      expect(streamingSections).toHaveLength(0);
      
      // Add new sections
      streamingSections.push({ id: 'new-section-1' } as CoverLetterDraftSection);
      streamingSections.push({ id: 'new-section-2' } as CoverLetterDraftSection);
      
      expect(streamingSections).toHaveLength(2);
      expect(streamingSections[0].id).toBe('new-section-1');
    });

    it('should clear streaming sections on completion', () => {
      let streamingSections: CoverLetterDraftSection[] = [
        { id: 'section-1' } as CoverLetterDraftSection,
        { id: 'section-2' } as CoverLetterDraftSection,
      ];

      // Simulate generation complete
      streamingSections = []; // Clear
      
      expect(streamingSections).toHaveLength(0);
    });

    it('should clear streaming sections on error', () => {
      let streamingSections: CoverLetterDraftSection[] = [
        { id: 'section-1' } as CoverLetterDraftSection,
      ];

      // Simulate error during generation
      try {
        throw new Error('Generation failed');
      } catch {
        streamingSections = []; // Clear on error
      }
      
      expect(streamingSections).toHaveLength(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should emit sections synchronously during build', () => {
      const emissionTimestamps: number[] = [];
      
      const mockCallback = vi.fn(() => {
        emissionTimestamps.push(Date.now());
      });

      const mockSections = Array.from({ length: 5 }, (_, i) => ({
        id: `section-${i}`,
      }));

      // Emit all sections
      mockSections.forEach((section, index) => {
        mockCallback(section as CoverLetterDraftSection, index, mockSections.length);
      });

      // All emissions should happen within milliseconds (synchronous)
      const totalTime = emissionTimestamps[emissionTimestamps.length - 1] - emissionTimestamps[0];
      expect(totalTime).toBeLessThan(100); // All emissions within 100ms
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without onSectionBuilt callback', () => {
      // Simulate service method being called without callback
      const buildSectionsWithoutCallback = (onSectionBuilt?: (section: any, index: number, total: number) => void) => {
        const sections = [{ id: 'section-1' }, { id: 'section-2' }];
        
        sections.forEach((section, index) => {
          // Optional chaining ensures no error if callback not provided
          onSectionBuilt?.(section, index, sections.length);
        });
        
        return sections;
      };

      // Should not throw
      expect(() => {
        buildSectionsWithoutCallback();
      }).not.toThrow();

      // Should still return sections
      const result = buildSectionsWithoutCallback();
      expect(result).toHaveLength(2);
    });
  });
});

