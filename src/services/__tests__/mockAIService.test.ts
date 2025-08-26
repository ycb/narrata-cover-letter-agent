import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MockAIService } from '../mockAIService';
import type { ImprovementContext } from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';

// Mock data
const mockVariations: BlurbVariation[] = [
  {
    id: 'var-1',
    content: 'Led a team of 8 product professionals while launching MVP in record 6 months.',
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
    developedForJobTitle: 'Product Manager',
    jdTags: ['strategy', 'planning'],
    outcomeMetrics: ['Created roadmaps', 'Strategic planning'],
    tags: ['strategy', 'planning'],
    createdAt: '2024-01-01T00:00:00Z',
    createdBy: 'user'
  }
];

const mockContext: ImprovementContext = {
  variations: mockVariations,
  jobDescription: 'Senior Product Manager with 5+ years experience',
  targetRole: 'Senior PM',
  userLevel: 'Mid-level',
  targetCompetencies: ['product-strategy', 'stakeholder-management', 'data-analysis']
};

describe('MockAIService', () => {
  let service: MockAIService;

  beforeEach(() => {
    service = MockAIService.getInstance();
    vi.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance', () => {
      const instance1 = MockAIService.getInstance();
      const instance2 = MockAIService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateSuggestions', () => {
    it('generates suggestions with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const suggestions = await service.generateSuggestions(content, mockContext);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeGreaterThan(0);

      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('id');
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('content');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion).toHaveProperty('reasoning');
        expect(suggestion).toHaveProperty('relatedVariations');
        expect(typeof suggestion.confidence).toBe('number');
        expect(suggestion.confidence).toBeGreaterThan(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(1);
      });
    });

    it('includes related variations in suggestions', async () => {
      const content = 'Led a team of 8 product professionals.';
      const suggestions = await service.generateSuggestions(content, mockContext);

      const suggestionWithVariations = suggestions.find(s => s.relatedVariations.length > 0);
      expect(suggestionWithVariations).toBeDefined();
      expect(suggestionWithVariations!.relatedVariations).toContain('var-1');
    });
  });

  describe('analyzeGaps', () => {
    it('returns gap analysis with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const jobDescription = 'Senior Product Manager role';
      const analysis = await service.analyzeGaps(content, jobDescription, mockVariations);

      expect(analysis).toHaveProperty('overallScore');
      expect(analysis).toHaveProperty('paragraphGaps');
      expect(analysis).toHaveProperty('suggestions');
      expect(analysis).toHaveProperty('relatedContent');
      expect(analysis).toHaveProperty('variationsCoverage');

      expect(typeof analysis.overallScore).toBe('number');
      expect(analysis.overallScore).toBeGreaterThanOrEqual(70);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);

      expect(Array.isArray(analysis.paragraphGaps)).toBe(true);
      expect(Array.isArray(analysis.suggestions)).toBe(true);
      expect(Array.isArray(analysis.relatedContent)).toBe(true);
    });

    it('includes gaps with impact levels', async () => {
      const content = 'Led a team of 8 product professionals.';
      const jobDescription = 'Senior Product Manager role';
      const analysis = await service.analyzeGaps(content, jobDescription, mockVariations);

      const gaps = analysis.paragraphGaps;
      expect(gaps.length).toBeGreaterThan(0);

      gaps.forEach(gap => {
        expect(gap).toHaveProperty('paragraphId');
        expect(gap).toHaveProperty('gap');
        expect(gap).toHaveProperty('impact');
        expect(gap).toHaveProperty('suggestion');
        expect(gap).toHaveProperty('relatedVariations');
        expect(['high', 'medium', 'low']).toContain(gap.impact);
      });
    });

    it('includes suggestions with priorities', async () => {
      const content = 'Led a team of 8 product professionals.';
      const jobDescription = 'Senior Product Manager role';
      const analysis = await service.analyzeGaps(content, jobDescription, mockVariations);

      const suggestions = analysis.suggestions;
      expect(suggestions.length).toBeGreaterThan(0);

      suggestions.forEach(suggestion => {
        expect(suggestion).toHaveProperty('type');
        expect(suggestion).toHaveProperty('content');
        expect(suggestion).toHaveProperty('priority');
        expect(suggestion).toHaveProperty('relatedVariations');
        expect(['high', 'medium', 'low']).toContain(suggestion.priority);
      });
    });
  });

  describe('scoreATS', () => {
    it('returns ATS score with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const jobKeywords = ['leadership', 'team management', 'product'];
      const score = await service.scoreATS(content, jobKeywords);

      expect(score).toHaveProperty('overall');
      expect(score).toHaveProperty('keywordMatch');
      expect(score).toHaveProperty('formatting');
      expect(score).toHaveProperty('variationsCoverage');
      expect(score).toHaveProperty('suggestions');

      expect(typeof score.overall).toBe('number');
      expect(typeof score.keywordMatch).toBe('number');
      expect(typeof score.formatting).toBe('number');
      expect(typeof score.variationsCoverage).toBe('number');

      expect(score.overall).toBeGreaterThanOrEqual(60);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(Array.isArray(score.suggestions)).toBe(true);
    });
  });

  describe('analyzePMAlignment', () => {
    it('returns PM alignment analysis with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const targetRole = 'Senior PM';
      const userLevel = 'Mid-level';
      const alignment = await service.analyzePMAlignment(content, targetRole, userLevel);

      expect(alignment).toHaveProperty('targetRoleLevel');
      expect(alignment).toHaveProperty('userLevel');
      expect(alignment).toHaveProperty('alignmentScore');
      expect(alignment).toHaveProperty('competencyGaps');
      expect(alignment).toHaveProperty('levelSpecificSuggestions');
      expect(alignment).toHaveProperty('variationsAlignment');

      expect(typeof alignment.alignmentScore).toBe('number');
      expect(alignment.alignmentScore).toBeGreaterThanOrEqual(70);
      expect(alignment.alignmentScore).toBeLessThanOrEqual(100);

      expect(Array.isArray(alignment.competencyGaps)).toBe(true);
      expect(Array.isArray(alignment.levelSpecificSuggestions)).toBe(true);
    });

    it('includes competency gaps with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const targetRole = 'Senior PM';
      const userLevel = 'Mid-level';
      const alignment = await service.analyzePMAlignment(content, targetRole, userLevel);

      const gaps = alignment.competencyGaps;
      expect(gaps.length).toBeGreaterThan(0);

      gaps.forEach(gap => {
        expect(gap).toHaveProperty('competency');
        expect(gap).toHaveProperty('currentStrength');
        expect(gap).toHaveProperty('targetStrength');
        expect(gap).toHaveProperty('gap');
        expect(gap).toHaveProperty('suggestions');

        expect(typeof gap.currentStrength).toBe('number');
        expect(typeof gap.targetStrength).toBe('number');
        expect(typeof gap.gap).toBe('number');
        expect(Array.isArray(gap.suggestions)).toBe(true);
      });
    });
  });

  describe('generateContent', () => {
    it('generates content with metadata', async () => {
      const result = await service.generateContent(mockContext);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('metadata');

      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(0);

      expect(result.metadata).toHaveProperty('confidence');
      expect(result.metadata).toHaveProperty('reasoning');
      expect(result.metadata).toHaveProperty('basedOnVariations');
      expect(result.metadata).toHaveProperty('competencyEnhancements');

      expect(typeof result.metadata.confidence).toBe('number');
      expect(result.metadata.confidence).toBeGreaterThan(0);
      expect(result.metadata.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.metadata.basedOnVariations)).toBe(true);
      expect(Array.isArray(result.metadata.competencyEnhancements)).toBe(true);
    });
  });

  describe('verifyTruth', () => {
    it('returns truth score with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const workHistory = [{ id: '1', title: 'Product Manager' }];
      const score = await service.verifyTruth(content, workHistory);

      expect(score).toHaveProperty('overall');
      expect(score).toHaveProperty('factualAccuracy');
      expect(score).toHaveProperty('consistencyWithHistory');
      expect(score).toHaveProperty('evidenceStrength');
      expect(score).toHaveProperty('suggestions');

      expect(typeof score.overall).toBe('number');
      expect(typeof score.factualAccuracy).toBe('number');
      expect(typeof score.consistencyWithHistory).toBe('number');
      expect(typeof score.evidenceStrength).toBe('number');

      expect(score.overall).toBeGreaterThanOrEqual(75);
      expect(score.overall).toBeLessThanOrEqual(100);
      expect(Array.isArray(score.suggestions)).toBe(true);
    });
  });

  describe('enhanceContent', () => {
    it('enhances content based on enhancement type', async () => {
      const originalContent = 'Led a team of 8 product professionals.';
      
      const enhancedContent = await service.enhanceContent(originalContent, 'add-metrics');
      
      expect(typeof enhancedContent).toBe('string');
      expect(enhancedContent.length).toBeGreaterThan(originalContent.length);
      expect(enhancedContent).toContain('achieving');
    });

    it('handles different enhancement types', async () => {
      const originalContent = 'Led a team of 8 product professionals.';
      
      const types = ['add-metrics', 'clarify-ownership', 'match-keywords', 'improve-tone', 'fill-gap'];
      
      for (const type of types) {
        const enhanced = await service.enhanceContent(originalContent, type);
        expect(typeof enhanced).toBe('string');
        expect(enhanced.length).toBeGreaterThan(0);
      }
    }, 10000); // 10 second timeout

    it('returns original content for unknown enhancement type', async () => {
      const originalContent = 'Led a team of 8 product professionals.';
      const enhanced = await service.enhanceContent(originalContent, 'unknown-type');
      expect(enhanced).toBe(originalContent);
    });
  });

  describe('getContentRecommendations', () => {
    it('returns content recommendations with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const jobDescription = 'Senior Product Manager role';
      const recommendations = await service.getContentRecommendations(content, jobDescription);

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);

      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('id');
        expect(rec).toHaveProperty('title');
        expect(rec).toHaveProperty('relevance');
        expect(rec).toHaveProperty('source');
        expect(rec).toHaveProperty('preview');

        expect(typeof rec.relevance).toBe('number');
        expect(rec.relevance).toBeGreaterThan(0);
        expect(rec.relevance).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('analyzeCompetencies', () => {
    it('returns competency analysis with correct structure', async () => {
      const content = 'Led a team of 8 product professionals.';
      const competencies = await service.analyzeCompetencies(content);

      expect(typeof competencies).toBe('object');
      expect(Object.keys(competencies).length).toBeGreaterThan(0);

      Object.entries(competencies).forEach(([competency, score]) => {
        expect(typeof competency).toBe('string');
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
      });

      // Check for expected competencies
      const expectedCompetencies = [
        'product-strategy', 'user-research', 'data-analysis', 'stakeholder-management',
        'team-leadership', 'technical-understanding', 'business-acumen', 'execution',
        'communication', 'prioritization'
      ];

      expectedCompetencies.forEach(competency => {
        expect(competencies).toHaveProperty(competency);
      });
    });
  });

  describe('Performance', () => {
    it('simulates realistic API delays', async () => {
      const startTime = Date.now();
      
      await service.generateSuggestions('test content', mockContext);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least 800ms (the delay we set)
      expect(duration).toBeGreaterThanOrEqual(800);
    });

    it('handles multiple concurrent requests', async () => {
      const promises = [
        service.generateSuggestions('content 1', mockContext),
        service.analyzeGaps('content 2', 'job desc', mockVariations),
        service.scoreATS('content 3', ['keyword1', 'keyword2'])
      ];

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(3);
      expect(results[0]).toBeInstanceOf(Array);
      expect(results[1]).toHaveProperty('overallScore');
      expect(results[2]).toHaveProperty('overall');
    });
  });
});
