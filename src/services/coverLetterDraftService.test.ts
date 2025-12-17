import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
}));

import { CoverLetterDraftService } from './coverLetterDraftService';

describe('CoverLetterDraftService story selection', () => {
  it('diversifies selected stories across dynamic sections', () => {
    const service = new CoverLetterDraftService({ supabaseClient: {} as any, jobDescriptionService: {} as any });

    const templateSections: any[] = [
      {
        id: 'sec-1',
        type: 'paragraph',
        title: 'Body Paragraph 1',
        contentType: 'work-history',
        isStatic: false,
        blurbCriteria: { goals: [] },
        order: 1,
      },
      {
        id: 'sec-2',
        type: 'paragraph',
        title: 'Body Paragraph 2',
        contentType: 'work-history',
        isStatic: false,
        blurbCriteria: { goals: [] },
        order: 2,
      },
    ];

    const stories: any[] = [
      {
        id: 'story-a',
        title: 'Generic PM',
        content: 'Led product strategy and stakeholder management across teams. Built roadmaps.',
        tags: [],
        times_used: 0,
      },
      {
        id: 'story-b',
        title: 'Second Best',
        content: 'Drove product strategy with cross-functional execution and stakeholder management.',
        tags: [],
        times_used: 0,
      },
    ];

    const jobDescription: any = {
      company: 'Acme',
      role: 'Senior Product Manager',
      summary: '',
      standardRequirements: [
        {
          id: 'req-strategy',
          label: 'product strategy',
          category: 'standard',
          priority: 'high',
          keywords: ['product strategy'],
        },
        {
          id: 'req-stakeholders',
          label: 'stakeholder management',
          category: 'standard',
          priority: 'high',
          keywords: ['stakeholder management'],
        },
      ],
      preferredRequirements: [],
      differentiatorRequirements: [],
      boilerplateSignals: [],
      differentiatorSignals: [],
      keywords: [],
      structuredInsights: {},
      analysis: {},
    };

    const { sections } = (service as any).buildSections({
      templateSections,
      stories,
      savedSections: [],
      jobDescription,
      userGoals: null,
    });

    const dynamicSections = sections.filter((s: any) => s.source?.kind === 'work_story');
    expect(dynamicSections).toHaveLength(2);
    expect(dynamicSections[0].source.entityId).not.toBe(dynamicSections[1].source.entityId);
  });

  it('prefers domain-keyword stories when requirements are generic', () => {
    const service = new CoverLetterDraftService({ supabaseClient: {} as any, jobDescriptionService: {} as any });

    const templateSections: any[] = [
      {
        id: 'sec-1',
        type: 'paragraph',
        title: 'Body Paragraph 1',
        contentType: 'work-history',
        isStatic: false,
        blurbCriteria: { goals: [] },
        order: 1,
      },
    ];

    const stories: any[] = [
      {
        id: 'generic-pm',
        title: 'Generic PM',
        content: 'Led product strategy and stakeholder management across teams. Built roadmaps.',
        tags: ['b2b saas'],
        times_used: 0,
      },
      {
        id: 'clean-energy',
        title: 'Clean Energy PM',
        content: 'Owned product strategy for a clean energy platform supporting demand response programs.',
        tags: ['clean energy', 'demand response'],
        times_used: 0,
      },
    ];

    const jobDescription: any = {
      company: 'GridCo',
      role: 'Product Manager, Clean Energy',
      summary: '',
      standardRequirements: [
        {
          id: 'req-strategy',
          label: 'product strategy',
          category: 'standard',
          priority: 'high',
          keywords: ['product strategy'],
        },
        {
          id: 'req-stakeholders',
          label: 'stakeholder management',
          category: 'standard',
          priority: 'high',
          keywords: ['stakeholder management'],
        },
      ],
      preferredRequirements: [],
      differentiatorRequirements: [],
      boilerplateSignals: [],
      differentiatorSignals: [],
      keywords: ['clean energy', 'demand response', 'grid'],
      structuredInsights: {},
      analysis: {},
    };

    const { sections } = (service as any).buildSections({
      templateSections,
      stories,
      savedSections: [],
      jobDescription,
      userGoals: null,
    });

    expect(sections[0].source.kind).toBe('work_story');
    expect(sections[0].source.entityId).toBe('clean-energy');
  });
});

