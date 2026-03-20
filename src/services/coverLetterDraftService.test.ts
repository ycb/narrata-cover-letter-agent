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

  it('never reuses a story once all unused stories are exhausted', () => {
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
      {
        id: 'sec-3',
        type: 'paragraph',
        title: 'Body Paragraph 3',
        contentType: 'work-history',
        isStatic: false,
        blurbCriteria: { goals: [] },
        order: 3,
      },
    ];

    const stories: any[] = [
      {
        id: 'story-a',
        title: 'Story A',
        content: 'Led strategy and roadmap execution with measurable delivery outcomes.',
        tags: [],
        times_used: 0,
      },
      {
        id: 'story-b',
        title: 'Story B',
        content: 'Owned stakeholder alignment and cross-functional execution for a product launch.',
        tags: [],
        times_used: 0,
      },
    ];

    const jobDescription: any = {
      company: 'Acme',
      role: 'Senior Product Manager',
      summary: '',
      standardRequirements: [],
      preferredRequirements: [],
      differentiatorRequirements: [],
      boilerplateSignals: [],
      differentiatorSignals: [],
      keywords: ['strategy', 'execution'],
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

    expect(sections[0].source.entityId).toBe('story-a');
    expect(sections[1].source.entityId).toBe('story-b');
    expect(sections[2].source.kind).toBe('template_static');
    expect(sections[2].metadata.storySelection?.selectionMode).toBe('no-unused-stories');
    expect(sections[2].metadata.storySelection?.selectedStoryId).toBeNull();
  });

  it('never repeats the same story content across sections when duplicate records exist', () => {
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

    const duplicatedContent =
      'Led product strategy and stakeholder management across teams while driving roadmap execution.';

    const stories: any[] = [
      {
        id: 'story-a',
        title: 'Story A',
        content: duplicatedContent,
        tags: [],
        times_used: 0,
      },
      {
        id: 'story-b',
        title: 'Story B duplicate',
        content: duplicatedContent,
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
      ],
      preferredRequirements: [],
      differentiatorRequirements: [],
      boilerplateSignals: [],
      differentiatorSignals: [],
      keywords: ['strategy', 'roadmap'],
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

    expect(sections[0].source.entityId).toBe('story-a');
    expect(sections[1].source.kind).toBe('template_static');
    expect(sections[1].metadata.storySelection?.selectionMode).toBe('no-unused-stories');
    expect(sections[1].metadata.storySelection?.selectedStoryId).toBeNull();
  });
});

describe('CoverLetterDraftService template normalization', () => {
  it('drops template sections appended after the first closing boundary', () => {
    const service = new CoverLetterDraftService({ supabaseClient: {} as any, jobDescriptionService: {} as any });

    const normalized = (service as any).normaliseTemplateSections([
      {
        id: 'intro-1',
        type: 'intro',
        title: 'Introduction',
        contentType: 'saved',
        isStatic: true,
        savedSectionId: 'saved-intro',
        staticContent: 'Intro',
        order: 1,
      },
      {
        id: 'body-1',
        type: 'paragraph',
        title: 'Body Paragraph 1',
        contentType: 'saved',
        isStatic: true,
        savedSectionId: 'saved-body-1',
        staticContent: 'Body one',
        order: 2,
      },
      {
        id: 'body-2',
        type: 'paragraph',
        title: 'Body Paragraph 2',
        contentType: 'work-history',
        isStatic: false,
        blurbCriteria: { goals: [] },
        order: 3,
      },
      {
        id: 'closing-1',
        type: 'closer',
        title: 'Closing',
        contentType: 'saved',
        isStatic: true,
        savedSectionId: 'saved-closing',
        staticContent: 'Closing',
        order: 4,
      },
      {
        id: 'tail-1',
        type: 'paragraph',
        title: 'Section 6',
        contentType: 'saved',
        isStatic: true,
        savedSectionId: 'saved-tail',
        staticContent: 'Corrupted tail section',
        order: 5,
      },
      {
        id: 'tail-2',
        type: 'paragraph',
        title: 'Section 7',
        isStatic: true,
        savedSectionId: 'saved-tail',
        staticContent: 'Another corrupted tail section',
        order: 6,
      },
    ]);

    expect(normalized.map((section: any) => section.id)).toEqual([
      'intro-1',
      'body-1',
      'body-2',
      'closing-1',
    ]);
    expect(normalized.map((section: any) => section.order)).toEqual([1, 2, 3, 4]);
    expect(normalized[1].contentType).toBe('saved');
    expect(normalized[2].contentType).toBe('work-history');
  });
});

describe('CoverLetterDraftService Phase B invocation', () => {
  it('invokes the server-side phase B function instead of relying on a browser OpenAI key', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null });
    const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
    const supabaseClient = {
      functions: { invoke },
      from: vi.fn(() => ({ update })),
    } as any;

    const service = new CoverLetterDraftService({ supabaseClient, jobDescriptionService: {} as any });
    vi.spyOn(service, 'getDraft').mockResolvedValue({
      enhancedMatchData: { coreRequirementDetails: [] },
    } as any);

    const result = await service.calculateMetricsForDraft('draft-1', 'user-1', 'job-1');

    expect(invoke).toHaveBeenCalledWith('cover-letter-phase-b', {
      body: { draftId: 'draft-1', mode: 'full' },
    });
    expect(result).toEqual({ coreRequirementDetails: [] });
  });
});
