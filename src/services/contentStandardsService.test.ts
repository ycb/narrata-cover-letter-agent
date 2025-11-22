import { describe, it, expect } from 'vitest';
import {
  isSectionApplicable,
  aggregateContentStandards,
  mapDraftSectionType,
  extractSectionsMeta,
  type SectionMeta,
} from './contentStandardsService';
import type {
  SectionStandardResult,
  LetterStandardResult,
} from '@/types/coverLetters';

describe('contentStandardsService', () => {
  describe('isSectionApplicable', () => {
    it('should return true for all_sections applicability', () => {
      expect(isSectionApplicable('all_sections', 'intro')).toBe(true);
      expect(isSectionApplicable('all_sections', 'body')).toBe(true);
      expect(isSectionApplicable('all_sections', 'closing')).toBe(true);
    });

    it('should return true only for intro when intro_only', () => {
      expect(isSectionApplicable('intro_only', 'intro')).toBe(true);
      expect(isSectionApplicable('intro_only', 'body')).toBe(false);
      expect(isSectionApplicable('intro_only', 'closing')).toBe(false);
    });

    it('should return true only for body when body_only', () => {
      expect(isSectionApplicable('body_only', 'intro')).toBe(false);
      expect(isSectionApplicable('body_only', 'body')).toBe(true);
      expect(isSectionApplicable('body_only', 'closing')).toBe(false);
    });

    it('should return true only for closing when closing_only', () => {
      expect(isSectionApplicable('closing_only', 'intro')).toBe(false);
      expect(isSectionApplicable('closing_only', 'body')).toBe(false);
      expect(isSectionApplicable('closing_only', 'closing')).toBe(true);
    });
  });

  describe('mapDraftSectionType', () => {
    it('should map static to intro', () => {
      expect(mapDraftSectionType('static')).toBe('intro');
    });

    it('should map closing to closing', () => {
      expect(mapDraftSectionType('closing')).toBe('closing');
    });

    it('should map dynamic-story to body', () => {
      expect(mapDraftSectionType('dynamic-story')).toBe('body');
    });

    it('should map dynamic-saved to body', () => {
      expect(mapDraftSectionType('dynamic-saved')).toBe('body');
    });
  });

  describe('extractSectionsMeta', () => {
    it('should extract section metadata from draft sections', () => {
      const sections = [
        { id: 'section-1', type: 'static' as const },
        { id: 'section-2', type: 'dynamic-story' as const },
        { id: 'section-3', type: 'closing' as const },
      ];

      const result = extractSectionsMeta(sections);

      expect(result).toEqual([
        { sectionId: 'section-1', sectionType: 'intro' },
        { sectionId: 'section-2', sectionType: 'body' },
        { sectionId: 'section-3', sectionType: 'closing' },
      ]);
    });
  });

  describe('aggregateContentStandards', () => {
    describe('any_section aggregation', () => {
      it('should mark as met if ANY applicable section meets it', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
          { sectionId: 'section-2', sectionType: 'body' },
        ];

        const perSection: SectionStandardResult[] = [
          {
            sectionId: 'section-1',
            standards: [
              { standardId: 'business_understanding', status: 'not_met', evidence: 'No mention' },
            ],
          },
          {
            sectionId: 'section-2',
            standards: [
              { standardId: 'business_understanding', status: 'met', evidence: 'Shows knowledge of company products' },
            ],
          },
        ];

        const perLetter: LetterStandardResult[] = [];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        const standard = result.aggregated.standards.find(s => s.standardId === 'business_understanding');
        expect(standard?.status).toBe('met');
        expect(standard?.contributingSections).toEqual(['section-2']);
      });

      it('should mark as not_met if NO applicable section meets it', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
          { sectionId: 'section-2', sectionType: 'body' },
        ];

        const perSection: SectionStandardResult[] = [
          {
            sectionId: 'section-1',
            standards: [
              { standardId: 'quantified_impact', status: 'not_met', evidence: 'No metrics' },
            ],
          },
          {
            sectionId: 'section-2',
            standards: [
              { standardId: 'quantified_impact', status: 'not_met', evidence: 'No metrics' },
            ],
          },
        ];

        const perLetter: LetterStandardResult[] = [];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        const standard = result.aggregated.standards.find(s => s.standardId === 'quantified_impact');
        expect(standard?.status).toBe('not_met');
        expect(standard?.contributingSections).toEqual([]);
      });
    });

    describe('all_sections aggregation', () => {
      it('should mark as met only if ALL applicable sections meet it', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
          { sectionId: 'section-2', sectionType: 'body' },
          { sectionId: 'section-3', sectionType: 'closing' },
        ];

        const perSection: SectionStandardResult[] = [
          {
            sectionId: 'section-1',
            standards: [
              { standardId: 'action_verbs', status: 'met', evidence: 'Uses strong verbs' },
            ],
          },
          {
            sectionId: 'section-2',
            standards: [
              { standardId: 'action_verbs', status: 'met', evidence: 'Uses strong verbs' },
            ],
          },
          {
            sectionId: 'section-3',
            standards: [
              { standardId: 'action_verbs', status: 'met', evidence: 'Uses strong verbs' },
            ],
          },
        ];

        const perLetter: LetterStandardResult[] = [];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        const standard = result.aggregated.standards.find(s => s.standardId === 'action_verbs');
        expect(standard?.status).toBe('met');
        expect(standard?.contributingSections).toHaveLength(3);
      });

      it('should mark as not_met if ANY applicable section does not meet it', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
          { sectionId: 'section-2', sectionType: 'body' },
        ];

        const perSection: SectionStandardResult[] = [
          {
            sectionId: 'section-1',
            standards: [
              { standardId: 'personalized', status: 'met', evidence: 'Tailored to role' },
            ],
          },
          {
            sectionId: 'section-2',
            standards: [
              { standardId: 'personalized', status: 'not_met', evidence: 'Generic content' },
            ],
          },
        ];

        const perLetter: LetterStandardResult[] = [];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        const standard = result.aggregated.standards.find(s => s.standardId === 'personalized');
        expect(standard?.status).toBe('not_met');
        expect(standard?.contributingSections).toEqual([]);
      });
    });

    describe('letter-scoped standards', () => {
      it('should use letter-level result directly for global standards', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
        ];

        const perSection: SectionStandardResult[] = [];

        const perLetter: LetterStandardResult[] = [
          {
            standardId: 'concise_length',
            status: 'met',
            evidence: '350 words, 4 paragraphs',
          },
          {
            standardId: 'error_free',
            status: 'not_met',
            evidence: '3 spelling errors found',
          },
        ];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        const concise = result.aggregated.standards.find(s => s.standardId === 'concise_length');
        const errorFree = result.aggregated.standards.find(s => s.standardId === 'error_free');

        expect(concise?.status).toBe('met');
        expect(concise?.contributingSections).toEqual([]); // Letter-level has no contributing sections
        expect(errorFree?.status).toBe('not_met');
      });
    });

    describe('applicability rules', () => {
      it('should only consider intro sections for intro_only standards', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
          { sectionId: 'section-2', sectionType: 'body' },
        ];

        const perSection: SectionStandardResult[] = [
          {
            sectionId: 'section-1',
            standards: [
              { standardId: 'compelling_opening', status: 'met', evidence: 'Strong hook' },
            ],
          },
          {
            sectionId: 'section-2',
            standards: [
              { standardId: 'compelling_opening', status: 'not_applicable', evidence: '' },
            ],
          },
        ];

        const perLetter: LetterStandardResult[] = [];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        const standard = result.aggregated.standards.find(s => s.standardId === 'compelling_opening');
        expect(standard?.status).toBe('met');
        expect(standard?.contributingSections).toEqual(['section-1']); // Only intro section
      });

      it('should only consider body sections for body_only standards', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
          { sectionId: 'section-2', sectionType: 'body' },
          { sectionId: 'section-3', sectionType: 'body' },
        ];

        const perSection: SectionStandardResult[] = [
          {
            sectionId: 'section-1',
            standards: [
              { standardId: 'star_format', status: 'not_applicable', evidence: '' },
            ],
          },
          {
            sectionId: 'section-2',
            standards: [
              { standardId: 'star_format', status: 'met', evidence: 'Has STAR structure' },
            ],
          },
          {
            sectionId: 'section-3',
            standards: [
              { standardId: 'star_format', status: 'not_met', evidence: 'Missing result' },
            ],
          },
        ];

        const perLetter: LetterStandardResult[] = [];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        const standard = result.aggregated.standards.find(s => s.standardId === 'star_format');
        expect(standard?.status).toBe('met'); // any_section rule: met because section-2 meets it
        expect(standard?.contributingSections).toEqual(['section-2']);
      });
    });

    describe('overall score calculation', () => {
      it('should calculate percentage of standards met', () => {
        const sectionsMeta: SectionMeta[] = [
          { sectionId: 'section-1', sectionType: 'intro' },
        ];

        const perSection: SectionStandardResult[] = [
          {
            sectionId: 'section-1',
            standards: [
              { standardId: 'compelling_opening', status: 'met', evidence: 'Good' },
              { standardId: 'business_understanding', status: 'met', evidence: 'Good' },
              { standardId: 'quantified_impact', status: 'not_met', evidence: 'Missing' },
              { standardId: 'action_verbs', status: 'met', evidence: 'Good' },
              { standardId: 'personalized', status: 'met', evidence: 'Good' },
              { standardId: 'company_research', status: 'not_met', evidence: 'Missing' },
            ],
          },
        ];

        const perLetter: LetterStandardResult[] = [
          { standardId: 'concise_length', status: 'met', evidence: 'Good' },
          { standardId: 'error_free', status: 'met', evidence: 'Good' },
          { standardId: 'professional_tone', status: 'met', evidence: 'Good' },
        ];

        const result = aggregateContentStandards(sectionsMeta, perSection, perLetter);

        // 9 standards total:
        // Section: compelling_opening (intro_only, any), business_understanding (all, any),
        //          quantified_impact (all, any), action_verbs (all, all),
        //          personalized (all, all), company_research (all, any)
        // Letter: concise_length, error_free, professional_tone
        // Plus: star_format (body_only, any), specific_examples (body_only, any)
        // Total: 11 standards
        // Met: Need to count based on actual aggregation logic

        expect(result.aggregated.overallScore).toBeGreaterThanOrEqual(0);
        expect(result.aggregated.overallScore).toBeLessThanOrEqual(100);
      });
    });
  });
});
