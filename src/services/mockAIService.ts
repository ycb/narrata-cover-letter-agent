import type { 
  MockAISuggestion, 
  GapAnalysis, 
  MockATSScore, 
  PMAlignment,
  ImprovementContext,
  MockAIGeneratedMetadata,
  TruthScore
} from '@/types/content';
import type { BlurbVariation } from '@/types/workHistory';

// Simulate API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class MockAIService {
  private static instance: MockAIService;

  private constructor() {}

  static getInstance(): MockAIService {
    if (!MockAIService.instance) {
      MockAIService.instance = new MockAIService();
    }
    return MockAIService.instance;
  }

  async generateSuggestions(content: string, context: ImprovementContext): Promise<MockAISuggestion[]> {
    await delay(800); // Simulate API call

    const suggestions: MockAISuggestion[] = [
      {
        id: `suggestion-${Date.now()}-1`,
        type: 'improvement',
        content: 'Add specific metrics to quantify your impact. For example: "increased conversion rates by 25%"',
        confidence: 0.85,
        reasoning: 'Content lacks quantifiable outcomes which are crucial for demonstrating impact',
        relatedVariations: context.variations.slice(0, 2).map(v => v.id)
      },
      {
        id: `suggestion-${Date.now()}-2`,
        type: 'gap-fill',
        content: 'Include your leadership philosophy and management style to show your approach',
        confidence: 0.72,
        reasoning: 'Leadership context is mentioned but not elaborated on',
        relatedVariations: context.variations.slice(0, 1).map(v => v.id)
      },
      {
        id: `suggestion-${Date.now()}-3`,
        type: 'competency-enhancement',
        content: 'Emphasize stakeholder management and cross-functional collaboration',
        confidence: 0.68,
        reasoning: 'Target competencies include stakeholder management but content focuses mainly on team leadership',
        relatedVariations: []
      }
    ];

    return suggestions;
  }

  async analyzeGaps(content: string, jobDescription: string, variations: BlurbVariation[]): Promise<GapAnalysis> {
    await delay(1200); // Simulate longer analysis

    const overallScore = Math.floor(Math.random() * 30) + 70; // 70-100 range

    const gapAnalysis: GapAnalysis = {
      overallScore,
      paragraphGaps: [
        {
          paragraphId: 'p1',
          gap: 'Missing specific metrics and KPIs',
          impact: 'high',
          suggestion: 'Include quantifiable outcomes like "increased conversion by 25%" or "reduced churn by 15%"',
          relatedVariations: variations.slice(0, 2).map(v => v.id)
        },
        {
          paragraphId: 'p2',
          gap: 'Leadership context needs clarification',
          impact: 'medium',
          suggestion: 'Specify team size, reporting structure, and your level of responsibility',
          relatedVariations: variations.slice(0, 1).map(v => v.id)
        },
        {
          paragraphId: 'p3',
          gap: 'Technical depth could be enhanced',
          impact: 'low',
          suggestion: 'Mention specific technologies, methodologies, or frameworks used',
          relatedVariations: []
        }
      ],
      suggestions: [
        {
          type: 'add-metrics',
          content: 'Include specific KPIs and outcomes achieved',
          priority: 'high',
          relatedVariations: variations.slice(0, 2).map(v => v.id)
        },
        {
          type: 'clarify-ownership',
          content: 'Specify your role and level of responsibility',
          priority: 'medium',
          relatedVariations: variations.slice(0, 1).map(v => v.id)
        },
        {
          type: 'match-keywords',
          content: 'Align with job description keywords',
          priority: 'medium',
          relatedVariations: []
        }
      ],
      relatedContent: [
        {
          id: 'content-1',
          title: 'Leadership Metrics Story',
          relevance: 0.85,
          source: 'work-history'
        },
        {
          id: 'content-2',
          title: 'Team Management Example',
          relevance: 0.72,
          source: 'reusable'
        }
      ],
      variationsCoverage: variations.reduce((acc, variation) => {
        acc[variation.id] = {
          gapsCovered: ['Leadership context unclear'],
          gapsUncovered: ['Missing specific metrics'],
          relevance: Math.random() * 0.3 + 0.7 // 0.7-1.0 range
        };
        return acc;
      }, {} as Record<string, { gapsCovered: string[]; gapsUncovered: string[]; relevance: number }>)
    };

    return gapAnalysis;
  }

  async scoreATS(content: string, jobKeywords: string[]): Promise<MockATSScore> {
    await delay(600);

    const keywordMatch = Math.floor(Math.random() * 40) + 60; // 60-100 range
    const formatting = Math.floor(Math.random() * 20) + 80; // 80-100 range
    const overall = Math.floor((keywordMatch + formatting) / 2);

    return {
      overall,
      keywordMatch,
      formatting,
      variationsCoverage: Math.floor(Math.random() * 30) + 70,
      suggestions: [
        'Include more job-specific keywords',
        'Use bullet points for better readability',
        'Add quantifiable achievements'
      ]
    };
  }

  async analyzePMAlignment(content: string, targetRole: string, userLevel: string): Promise<PMAlignment> {
    await delay(1000);

    const alignmentScore = Math.floor(Math.random() * 30) + 70; // 70-100 range

    return {
      targetRoleLevel: targetRole as any,
      userLevel: userLevel as any,
      alignmentScore,
      competencyGaps: [
        {
          competency: 'product-strategy',
          currentStrength: 0.7,
          targetStrength: 0.9,
          gap: 0.2,
          suggestions: ['Include strategic thinking examples', 'Show long-term vision']
        },
        {
          competency: 'data-analysis',
          currentStrength: 0.6,
          targetStrength: 0.8,
          gap: 0.2,
          suggestions: ['Add data-driven decision examples', 'Include metrics and KPIs']
        }
      ],
      levelSpecificSuggestions: [
        'Emphasize strategic impact over tactical execution',
        'Show cross-functional leadership experience',
        'Include stakeholder management examples'
      ],
      variationsAlignment: {}
    };
  }

  async generateContent(context: ImprovementContext): Promise<{ content: string; metadata: MockAIGeneratedMetadata }> {
    await delay(1500);

    const generatedContent = `Led a cross-functional team of 8 product professionals while launching MVP in record 6 months, resulting in 25% increase in user engagement and 40% reduction in time-to-market. My leadership philosophy centers on data-driven decision making and stakeholder alignment, which enabled successful delivery across engineering, design, and business teams.`;

    const metadata: MockAIGeneratedMetadata = {
      confidence: 0.82,
      reasoning: 'Generated content addresses key gaps: adds specific metrics, clarifies leadership approach, and emphasizes cross-functional collaboration',
      basedOnVariations: context.variations.slice(0, 2).map(v => v.id),
      competencyEnhancements: ['product-strategy', 'stakeholder-management', 'data-analysis']
    };

    return { content: generatedContent, metadata };
  }

  async verifyTruth(content: string, workHistory: any[]): Promise<TruthScore> {
    await delay(800);

    const factualAccuracy = Math.floor(Math.random() * 20) + 80; // 80-100 range
    const consistencyWithHistory = Math.floor(Math.random() * 15) + 85; // 85-100 range
    const evidenceStrength = Math.floor(Math.random() * 25) + 75; // 75-100 range
    const overall = Math.floor((factualAccuracy + consistencyWithHistory + evidenceStrength) / 3);

    return {
      overall,
      factualAccuracy,
      consistencyWithHistory,
      evidenceStrength,
      suggestions: [
        'Verify specific metrics mentioned',
        'Cross-reference with work history dates',
        'Ensure consistency with previous statements'
      ]
    };
  }

  async enhanceContent(content: string, enhancementType: string): Promise<string> {
    await delay(1000);

    const enhancements: Record<string, string> = {
      'add-metrics': content.replace(
        /(led|managed|built).*?(\d+).*?(professionals|team)/i,
        '$1 a team of $2 $3, achieving 30% improvement in efficiency and 25% increase in productivity'
      ),
      'clarify-ownership': content + ' As the primary decision maker, I was responsible for strategy, execution, and stakeholder management.',
      'match-keywords': content + ' This experience demonstrates strong product strategy, stakeholder management, and data-driven decision making.',
      'improve-tone': content.replace(
        /(led|managed)/gi,
        'successfully led'
      ),
      'fill-gap': content + ' This role required deep technical understanding, strategic thinking, and exceptional communication skills.'
    };

    return enhancements[enhancementType] || content;
  }

  async getContentRecommendations(content: string, jobDescription: string): Promise<any[]> {
    await delay(700);

    return [
      {
        id: 'rec-1',
        title: 'Metrics-Focused Leadership Story',
        relevance: 0.88,
        source: 'work-history',
        preview: 'Led team of 12 engineers, achieving 40% faster delivery...'
      },
      {
        id: 'rec-2',
        title: 'Stakeholder Management Example',
        relevance: 0.75,
        source: 'reusable',
        preview: 'Successfully aligned engineering, design, and business teams...'
      },
      {
        id: 'rec-3',
        title: 'Strategic Product Leadership',
        relevance: 0.82,
        source: 'custom',
        preview: 'Developed product strategy that increased market share by 35%...'
      }
    ];
  }

  async analyzeCompetencies(content: string): Promise<Record<string, number>> {
    await delay(500);

    return {
      'product-strategy': 0.8,
      'user-research': 0.6,
      'data-analysis': 0.7,
      'stakeholder-management': 0.9,
      'team-leadership': 0.85,
      'technical-understanding': 0.7,
      'business-acumen': 0.8,
      'execution': 0.9,
      'communication': 0.85,
      'prioritization': 0.75
    };
  }
}

// Export singleton instance
export const mockAIService = MockAIService.getInstance();
