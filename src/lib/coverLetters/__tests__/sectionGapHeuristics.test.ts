/**
 * Tests for Section Gap Heuristics Engine
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateSectionGap,
  evaluateAllSections,
  getGapSummary,
  type SectionInput,
  type JobDescriptionInput,
} from '../sectionGapHeuristics';

// ============================================================================
// Test Fixtures
// ============================================================================

const mockJobDescription: JobDescriptionInput = {
  summary: 'Senior Product Manager role at TechCorp, leading data-driven product strategy.',
  company: 'TechCorp',
  role: 'Senior Product Manager',
  keywords: ['product management', 'data analytics', 'A/B testing', 'SQL', 'roadmap'],
  standardRequirements: [
    { label: 'Product strategy', keywords: ['strategy', 'vision', 'roadmap'] },
    { label: 'Data analysis', keywords: ['SQL', 'analytics', 'metrics'] },
  ],
  preferredRequirements: [
    { label: 'Team leadership', keywords: ['led', 'managed', 'team'] },
  ],
  differentiatorRequirements: [
    { label: 'Growth experience', keywords: ['growth', 'scale', 'revenue'] },
  ],
};

// ============================================================================
// Introduction Section Tests
// ============================================================================

describe('evaluateSectionGap - Introduction', () => {
  it('should pass with strong introduction containing all elements', () => {
    const section: SectionInput = {
      slug: 'intro-1',
      type: 'introduction',
      content: `I am excited to apply for the Senior PM role at TechCorp. As a product leader who has led teams of 12+ engineers and increased revenue by 45% through data-driven experimentation, I deeply align with TechCorp's mission to democratize data.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    expect(result.requirementGaps).toHaveLength(0);
    expect(result.sectionSlug).toBe('intro-1');
    expect(result.sectionType).toBe('introduction');
  });

  it('should flag missing metrics in introduction', () => {
    const section: SectionInput = {
      slug: 'intro-2',
      type: 'introduction',
      content: `I am a product manager with extensive experience in the tech industry. I have worked on various projects and am excited about TechCorp's mission.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const metricsGap = result.requirementGaps.find(g => g.label.includes('quantified impact'));
    expect(metricsGap).toBeDefined();
    expect(metricsGap?.severity).toBe('high');
    expect(metricsGap?.requirementType).toBe('core');
  });

  it('should flag missing company/mission alignment', () => {
    const section: SectionInput = {
      slug: 'intro-3',
      type: 'introduction',
      content: `I am a senior product manager who led 15 engineers and increased revenue by $2M through strategic initiatives.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const missionGap = result.requirementGaps.find(g => g.label.includes('mission'));
    expect(missionGap).toBeDefined();
    expect(missionGap?.severity).toBe('medium');
  });

  it('should flag missing seniority markers', () => {
    const section: SectionInput = {
      slug: 'intro-4',
      type: 'introduction',
      content: `I worked on projects that increased user engagement by 30% and am passionate about TechCorp's mission.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const seniorityGap = result.requirementGaps.find(g => g.label.includes('seniority'));
    expect(seniorityGap).toBeDefined();
    expect(seniorityGap?.severity).toBe('medium');
  });

  it('should recognize various metric formats', () => {
    const metricsExamples = [
      `Led team of 12 engineers and increased revenue by 45%`,
      `Managed $2.5M budget and delivered 3x ROI`,
      `Improved performance by 2.5x with 10,000 users`,
      `Reduced costs by $500K annually`,
    ];

    metricsExamples.forEach((content, idx) => {
      const section: SectionInput = {
        slug: `intro-metrics-${idx}`,
        type: 'introduction',
        content: `${content}. I led efforts at TechCorp to align with their mission.`,
      };

      const result = evaluateSectionGap(section, mockJobDescription);
      const metricsGap = result.requirementGaps.find(g => g.label.includes('quantified impact'));
      expect(metricsGap).toBeUndefined();
    });
  });
});

// ============================================================================
// Experience Section Tests
// ============================================================================

describe('evaluateSectionGap - Experience', () => {
  it('should pass with comprehensive experience content', () => {
    const section: SectionInput = {
      slug: 'exp-1',
      type: 'experience',
      content: `At my previous company, I led the product analytics initiative using SQL and Python. I collaborated with cross-functional teams to implement A/B testing that increased conversion by 25% and generated $1.2M in additional revenue. I built scalable data pipelines and delivered insights that transformed our product roadmap.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    expect(result.requirementGaps).toHaveLength(0);
  });

  it('should flag missing metrics in experience', () => {
    const section: SectionInput = {
      slug: 'exp-2',
      type: 'experience',
      content: `I worked on product analytics using SQL and collaborated with engineers to improve our testing framework. I built data pipelines and delivered insights.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const metricsGap = result.requirementGaps.find(g => g.label.includes('quantified results'));
    expect(metricsGap).toBeDefined();
    expect(metricsGap?.severity).toBe('high');
  });

  it('should flag missing tools/processes', () => {
    const section: SectionInput = {
      slug: 'exp-3',
      type: 'experience',
      content: `I collaborated with the engineering team and increased user satisfaction by 40%. I led quarterly planning sessions and delivered key initiatives.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const toolsGap = result.requirementGaps.find(g => g.label.includes('tools/processes'));
    expect(toolsGap).toBeDefined();
    expect(toolsGap?.severity).toBe('high');
  });

  it('should flag missing collaboration indicators', () => {
    const section: SectionInput = {
      slug: 'exp-4',
      type: 'experience',
      content: `I used SQL to analyze user behavior and increased retention by 30%. I built dashboards in Tableau and optimized our experimentation process.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const collabGap = result.requirementGaps.find(g => g.label.includes('collaboration'));
    expect(collabGap).toBeDefined();
    expect(collabGap?.severity).toBe('medium');
  });

  it('should flag weak action verbs', () => {
    const section: SectionInput = {
      slug: 'exp-5',
      type: 'experience',
      content: `I was responsible for analytics at my company. I worked with SQL and talked to stakeholders about metrics. User growth was 25%.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const verbGap = result.requirementGaps.find(g => g.label.includes('action verbs'));
    expect(verbGap).toBeDefined();
    expect(verbGap?.severity).toBe('low');
  });

  it('should recognize JD keywords in experience', () => {
    const section: SectionInput = {
      slug: 'exp-6',
      type: 'experience',
      content: `I led roadmap planning using data analytics and A/B testing, increasing conversion by 35%. I collaborated with engineers to build SQL-based metrics dashboards that informed product strategy.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const toolsGap = result.requirementGaps.find(g => g.label.includes('tools/processes'));
    expect(toolsGap).toBeUndefined();
  });
});

// ============================================================================
// Closing Section Tests
// ============================================================================

describe('evaluateSectionGap - Closing', () => {
  it('should pass with complete closing', () => {
    const section: SectionInput = {
      slug: 'closing-1',
      type: 'closing',
      content: `I'm excited about the opportunity to bring my product leadership to TechCorp. I'd love to discuss how my experience can contribute to your mission. I'm available for a conversation at your convenience. Thank you for your consideration.\n\nBest regards,`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    expect(result.requirementGaps).toHaveLength(0);
  });

  it('should flag missing enthusiasm', () => {
    const section: SectionInput = {
      slug: 'closing-2',
      type: 'closing',
      content: `I believe I would be a good fit for this role. I am available to discuss further. Thank you.\n\nRegards,`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const enthusiasmGap = result.requirementGaps.find(g => g.label.includes('enthusiasm'));
    expect(enthusiasmGap).toBeDefined();
    expect(enthusiasmGap?.severity).toBe('medium');
  });

  it('should flag missing call-to-action', () => {
    const section: SectionInput = {
      slug: 'closing-3',
      type: 'closing',
      content: `I'm thrilled about this opportunity and passionate about TechCorp's mission.\n\nSincerely,`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const ctaGap = result.requirementGaps.find(g => g.label.includes('call-to-action'));
    expect(ctaGap).toBeDefined();
    expect(ctaGap?.severity).toBe('high');
  });

  it('should flag missing sign-off', () => {
    const section: SectionInput = {
      slug: 'closing-4',
      type: 'closing',
      content: `I'm excited to discuss how I can contribute. I look forward to speaking with you.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const signoffGap = result.requirementGaps.find(g => g.label.includes('sign-off'));
    expect(signoffGap).toBeDefined();
    expect(signoffGap?.severity).toBe('low');
  });

  it('should recognize various enthusiasm markers', () => {
    const enthusiasmExamples = [
      `I'm excited about joining TechCorp. I'd love to discuss further. Best regards,`,
      `I'm thrilled by this opportunity. Let's talk soon. Sincerely,`,
      `I'm eager to contribute to your mission. I look forward to our conversation. Thanks,`,
      `I'm passionate about your work. I'm available to meet. Regards,`,
    ];

    enthusiasmExamples.forEach((content, idx) => {
      const section: SectionInput = {
        slug: `closing-enthusiasm-${idx}`,
        type: 'closing',
        content,
      };

      const result = evaluateSectionGap(section, mockJobDescription);
      const enthusiasmGap = result.requirementGaps.find(g => g.label.includes('enthusiasm'));
      expect(enthusiasmGap).toBeUndefined();
    });
  });

  it('should recognize various CTA markers', () => {
    const ctaExamples = [
      `I'd love to discuss this further. Excited to connect! Best,`,
      `Let's schedule a conversation. I'm available next week. Regards,`,
      `I look forward to our interview. Please reach out anytime. Thanks,`,
      `I'm available to talk about next steps. Let me know! Sincerely,`,
    ];

    ctaExamples.forEach((content, idx) => {
      const section: SectionInput = {
        slug: `closing-cta-${idx}`,
        type: 'closing',
        content,
      };

      const result = evaluateSectionGap(section, mockJobDescription);
      const ctaGap = result.requirementGaps.find(g => g.label.includes('call-to-action'));
      expect(ctaGap).toBeUndefined();
    });
  });
});

// ============================================================================
// Signature Section Tests
// ============================================================================

describe('evaluateSectionGap - Signature', () => {
  it('should pass with non-empty signature', () => {
    const section: SectionInput = {
      slug: 'sig-1',
      type: 'signature',
      content: `John Doe\njohn@example.com\n(555) 123-4567`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    expect(result.requirementGaps).toHaveLength(0);
  });

  it('should flag empty signature', () => {
    const section: SectionInput = {
      slug: 'sig-2',
      type: 'signature',
      content: '',
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const emptyGap = result.requirementGaps.find(g => g.label.includes('Empty signature'));
    expect(emptyGap).toBeDefined();
    expect(emptyGap?.severity).toBe('low');
  });

  it('should pass with whitespace-only signature', () => {
    const section: SectionInput = {
      slug: 'sig-3',
      type: 'signature',
      content: '   \n   ',
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    const emptyGap = result.requirementGaps.find(g => g.label.includes('Empty signature'));
    expect(emptyGap).toBeDefined();
  });
});

// ============================================================================
// Custom Section Tests
// ============================================================================

describe('evaluateSectionGap - Custom', () => {
  it('should apply experience-like checks to custom sections', () => {
    const section: SectionInput = {
      slug: 'custom-1',
      type: 'custom',
      title: 'Additional Context',
      content: `I have experience in various areas but prefer not to go into details.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    // Should have gaps similar to experience section
    expect(result.requirementGaps.length).toBeGreaterThan(0);
    const metricsGap = result.requirementGaps.find(g => g.label.includes('quantified'));
    expect(metricsGap).toBeDefined();
  });
});

// ============================================================================
// Batch Evaluation Tests
// ============================================================================

describe('evaluateAllSections', () => {
  it('should evaluate multiple sections', () => {
    const sections: SectionInput[] = [
      {
        slug: 'intro',
        type: 'introduction',
        content: `I led 10 engineers and increased revenue by 40% at TechCorp, aligning with their mission.`,
      },
      {
        slug: 'exp',
        type: 'experience',
        content: `I used SQL and collaborated with teams to deliver 25% growth.`,
      },
      {
        slug: 'close',
        type: 'closing',
        content: `I'm excited to discuss further! Best regards,`,
      },
    ];

    const results = evaluateAllSections(sections, mockJobDescription);

    expect(results).toHaveLength(3);
    expect(results[0].sectionSlug).toBe('intro');
    expect(results[1].sectionSlug).toBe('exp');
    expect(results[2].sectionSlug).toBe('close');
  });

  it('should handle empty sections array', () => {
    const results = evaluateAllSections([], mockJobDescription);
    expect(results).toHaveLength(0);
  });
});

// ============================================================================
// Gap Summary Tests
// ============================================================================

describe('getGapSummary', () => {
  it('should calculate summary statistics correctly', () => {
    const insights = [
      {
        sectionSlug: 'intro',
        sectionType: 'introduction' as const,
        promptSummary: 'Test',
        requirementGaps: [
          {
            id: '1',
            label: 'Gap 1',
            severity: 'high' as const,
            rationale: 'Test',
            recommendation: 'Test',
          },
          {
            id: '2',
            label: 'Gap 2',
            severity: 'medium' as const,
            rationale: 'Test',
            recommendation: 'Test',
          },
        ],
        recommendedMoves: [],
      },
      {
        sectionSlug: 'exp',
        sectionType: 'experience' as const,
        promptSummary: 'Test',
        requirementGaps: [
          {
            id: '3',
            label: 'Gap 3',
            severity: 'high' as const,
            rationale: 'Test',
            recommendation: 'Test',
          },
          {
            id: '4',
            label: 'Gap 4',
            severity: 'low' as const,
            rationale: 'Test',
            recommendation: 'Test',
          },
        ],
        recommendedMoves: [],
      },
      {
        sectionSlug: 'close',
        sectionType: 'closing' as const,
        promptSummary: 'Test',
        requirementGaps: [],
        recommendedMoves: [],
      },
    ];

    const summary = getGapSummary(insights);

    expect(summary.totalGaps).toBe(4);
    expect(summary.highSeverity).toBe(2);
    expect(summary.mediumSeverity).toBe(1);
    expect(summary.lowSeverity).toBe(1);
    expect(summary.sectionsWithGaps).toBe(2);
  });

  it('should handle empty insights', () => {
    const summary = getGapSummary([]);

    expect(summary.totalGaps).toBe(0);
    expect(summary.highSeverity).toBe(0);
    expect(summary.mediumSeverity).toBe(0);
    expect(summary.lowSeverity).toBe(0);
    expect(summary.sectionsWithGaps).toBe(0);
  });
});

// ============================================================================
// Edge Cases Tests
// ============================================================================

describe('Edge Cases', () => {
  it('should handle sections with minimal content', () => {
    const section: SectionInput = {
      slug: 'edge-1',
      type: 'introduction',
      content: 'Hi.',
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    expect(result.requirementGaps.length).toBeGreaterThan(0);
  });

  it('should handle very long sections', () => {
    const longContent = 'I led a team of 10 engineers. '.repeat(100) + 'I increased revenue by 50% using SQL and data analytics. I collaborated with cross-functional teams.';
    
    const section: SectionInput = {
      slug: 'edge-2',
      type: 'experience',
      content: longContent,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    // Should still find all elements despite length
    expect(result.requirementGaps).toHaveLength(0);
  });

  it('should handle JD with missing optional fields', () => {
    const minimalJD: JobDescriptionInput = {
      summary: 'Product Manager role.',
    };

    const section: SectionInput = {
      slug: 'edge-3',
      type: 'introduction',
      content: 'I am a product manager who led 5 people and increased metrics by 20%. I am passionate about the company mission.',
    };

    const result = evaluateSectionGap(section, minimalJD);

    // Should still evaluate without errors
    expect(result).toBeDefined();
    expect(result.requirementGaps).toBeDefined();
  });

  it('should handle special characters and formatting', () => {
    const section: SectionInput = {
      slug: 'edge-4',
      type: 'experience',
      content: `At Company™, I led 10+ engineers & increased revenue by $1.5M (50% growth). I collaborated w/ cross-functional teams using SQL/Python to deliver A/B testing @ scale.`,
    };

    const result = evaluateSectionGap(section, mockJobDescription);

    // Should recognize metrics and keywords despite special characters
    expect(result.requirementGaps).toHaveLength(0);
  });

  it('should generate unique gap IDs', () => {
    const section: SectionInput = {
      slug: 'edge-5',
      type: 'introduction',
      content: 'Basic content.',
    };

    const result1 = evaluateSectionGap(section, mockJobDescription);
    const result2 = evaluateSectionGap(section, mockJobDescription);

    // Gap IDs should be unique even for same input
    const ids1 = result1.requirementGaps.map(g => g.id);
    const ids2 = result2.requirementGaps.map(g => g.id);
    
    const allIds = [...ids1, ...ids2];
    const uniqueIds = new Set(allIds);
    
    expect(uniqueIds.size).toBe(allIds.length);
  });

  it('should handle ParsedJobDescription format', () => {
    const parsedJD = {
      ...mockJobDescription,
      company: 'TechCorp',
      role: 'Senior PM',
      boilerplateSignals: [],
      differentiatorSignals: [],
      structuredInsights: {},
      analysis: {},
    };

    const section: SectionInput = {
      slug: 'edge-6',
      type: 'introduction',
      content: 'I led 10 engineers at TechCorp and increased revenue by 40%.',
    };

    const result = evaluateSectionGap(section, parsedJD);

    expect(result).toBeDefined();
    expect(result.requirementGaps).toHaveLength(0);
  });
});

