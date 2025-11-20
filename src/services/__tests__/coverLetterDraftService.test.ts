import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  CoverLetterDraftSection,
  ParsedJobDescription,
  RequirementInsight,
} from '@/types/coverLetters';

let jobDescriptionResponse: ParsedJobDescription;
const jobDescriptionServiceStub = {
  getJobDescription: vi.fn(async () => ({ ...jobDescriptionResponse })),
};

vi.mock('../userPreferencesService', () => ({
  UserPreferencesService: {
    loadGoals: vi.fn(() => Promise.resolve(null)),
  },
}));

vi.mock('../jobDescriptionService', () => ({
  JobDescriptionService: vi.fn(() => jobDescriptionServiceStub),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      throw new Error('Supabase mock not injected for this test');
    }),
  },
}));

const streamTextMock = vi.fn();
vi.mock('ai', () => ({
  streamText: streamTextMock,
}));

const BASE_RESPONSE = {
  company: 'LaunchCo',
  role: 'Product Manager',
  summary: 'Lead flagship launches',
  standardRequirements: [
    createRequirement('std-1', 'roadmap ownership', 'standard', ['roadmap']),
  ],
  preferredRequirements: [],
  differentiatorRequirements: [
    createRequirement('diff-1', '0-to-1 launch execution', 'differentiator', ['launch', '0-to-1']),
  ],
  boilerplateSignals: ['roadmapping'],
  differentiatorSignals: ['0-to-1 launches'],
  keywords: ['roadmap', 'launch'],
  structuredInsights: {},
  structuredData: {
    responsibilities: [],
    qualifications: [],
    tools: [],
    teams: [],
    location: null,
    employmentType: null,
    compensation: null,
  },
  analysis: {},
  differentiatorNotes: 'Highlight 0-to-1 launches',
  rawSections: [],
} satisfies ParsedJobDescription;

jobDescriptionResponse = BASE_RESPONSE;

const metricsResult = {
  metrics: [
    {
      key: 'ats',
      label: 'ATS Score',
      tooltip: '',
      type: 'score' as const,
      value: 88,
      summary: 'High ATS match',
    },
    {
      key: 'goals',
      label: 'Match with Goals',
      tooltip: '',
      type: 'strength' as const,
      strength: 'strong',
      summary: 'Goals aligned',
    },
  ],
  atsScore: 88,
  raw: { detail: true },
};

const metricsStreamer = vi.fn(async () => metricsResult);
const now = () => new Date('2025-11-12T00:00:00.000Z');

const jobDescriptionService = {
  getJobDescription: vi.fn(async () => ({ ...BASE_RESPONSE })),
};

const templateRow: Database['public']['Tables']['cover_letter_templates']['Row'] = {
  id: 'template-1',
  user_id: 'user-1',
  name: 'Primary Template',
  sections: [
    { id: 'intro-1', type: 'intro', isStatic: true, staticContent: 'Dear Hiring Manager,', order: 1 },
    {
      id: 'body-1',
      type: 'paragraph',
      contentType: 'saved',
      isStatic: false,
      blurbCriteria: { goals: ['launch'] },
      order: 2,
    },
  ],
  created_at: '2025-11-12T00:00:00.000Z',
  updated_at: '2025-11-12T00:00:00.000Z',
};

const savedSections = [
  {
    id: 'saved-1',
    user_id: 'user-1',
    title: 'Launch Narrative',
    content: 'Led a 0-to-1 launch that grew revenue by 35% within two quarters.',
    tags: ['launch', 'roadmap'],
    created_at: '2025-11-12T00:00:00.000Z',
    updated_at: '2025-11-12T00:00:00.000Z',
  },
];

interface SupabaseMock {
  supabaseClient: SupabaseClient;
  from: ReturnType<typeof createSupabaseMock>['from'];
  getCoverLetterInsert(): Record<string, unknown> | undefined;
  getWorkpadUpsert(): Record<string, unknown> | undefined;
}

interface SupabaseFinalizeMock {
  supabaseClient: SupabaseClient;
  from: ReturnType<typeof createSupabaseMock>['from'];
  getUpdatePayload(): Record<string, unknown> | undefined;
  getWorkpadUpsert(): Record<string, unknown> | undefined;
}

const createSupabaseMock = (): SupabaseMock => {
  let coverLetterInsertPayload: Record<string, unknown> | undefined;
  let workpadUpsertPayload: Record<string, unknown> | undefined;

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'cover_letter_templates':
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: templateRow, error: null })),
              })),
            })),
          })),
        };
      case 'approved_content':
        return {
          select: vi.fn(() => ({
            eq: vi.fn((column: string) => {
              if (column !== 'user_id') throw new Error('Unexpected column for approved_content');
              return {
                eq: vi.fn((statusColumn: string) => {
                  if (statusColumn !== 'status') throw new Error('Unexpected status column');
                  return Promise.resolve({ data: [], error: null });
                }),
              };
            }),
          })),
        };
      case 'saved_sections':
        return {
          select: vi.fn(() => ({
            eq: vi.fn((column: string) => {
              if (column !== 'user_id') throw new Error('Unexpected column for saved_sections');
              return Promise.resolve({ data: savedSections, error: null });
            }),
          })),
        };
      case 'work_items':
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      case 'cover_letters':
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            coverLetterInsertPayload = payload;
            const row = buildCoverLetterRow(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: row, error: null }),
              }),
            };
          }),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            })),
          })),
        };
      case 'cover_letter_workpads':
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn((payload: Record<string, unknown>) => {
            workpadUpsertPayload = payload;
            const row = buildWorkpadRow(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: row, error: null }),
              }),
            };
          }),
          upsert: vi.fn((payload: Record<string, unknown>) => {
            workpadUpsertPayload = payload;
            const row = buildWorkpadRow(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: row, error: null }),
              }),
            };
          }),
        };
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });

  return {
    supabaseClient: { from } as unknown as SupabaseClient,
    from,
    getCoverLetterInsert: () => coverLetterInsertPayload,
    getWorkpadUpsert: () => workpadUpsertPayload,
  };
};

const createFinalizeSupabaseMock = (
  initialRow: ReturnType<typeof buildCoverLetterRow> & {
    sections: CoverLetterDraftSection[];
  },
): SupabaseFinalizeMock => {
  let currentRow = { ...initialRow };
  let updatePayload: Record<string, unknown> | undefined;
  let workpadUpsertPayload: Record<string, unknown> | undefined;

  const from = vi.fn((table: string) => {
    switch (table) {
      case 'work_items':
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        };
      case 'approved_content':
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
            })),
          })),
        };
      case 'cover_letters':
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: currentRow, error: null })),
            })),
          })),
          update: vi.fn((payload: Record<string, unknown>) => {
            updatePayload = payload;
            currentRow = {
              ...currentRow,
              ...payload,
              sections: (payload.sections ?? currentRow.sections) as CoverLetterDraftSection[],
              differentiator_summary:
                payload.differentiator_summary ?? currentRow.differentiator_summary,
              analytics: payload.analytics ?? currentRow.analytics,
              status: (payload.status ?? currentRow.status) as typeof currentRow.status,
              finalized_at:
                'finalized_at' in payload
                  ? (payload.finalized_at as string | null)
                  : currentRow.finalized_at,
              updated_at:
                'updated_at' in payload ? (payload.updated_at as string) : currentRow.updated_at,
            };
            return {
              eq: vi.fn(() => ({
                select: () => ({
                  single: () => Promise.resolve({ data: currentRow, error: null }),
                }),
              })),
            };
          }),
        };
      case 'cover_letter_workpads':
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
            })),
          })),
          insert: vi.fn((payload: Record<string, unknown>) => {
            workpadUpsertPayload = payload;
            const row = buildWorkpadRow(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: row, error: null }),
              }),
            };
          }),
          upsert: vi.fn((payload: Record<string, unknown>) => {
            workpadUpsertPayload = payload;
            const row = buildWorkpadRow(payload);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: row, error: null }),
              }),
            };
          }),
        };
      default:
        throw new Error(`Unexpected table: ${table}`);
    }
  });

  return {
    supabaseClient: { from } as unknown as SupabaseClient,
    from,
    getUpdatePayload: () => updatePayload,
    getWorkpadUpsert: () => workpadUpsertPayload,
  };
};

const buildCoverLetterRow = (payload: Record<string, unknown>) => ({
  id: 'draft-123',
  user_id: payload.user_id as string,
  template_id: payload.template_id as string,
  job_description_id: payload.job_description_id as string,
  sections: payload.sections,
  llm_feedback: payload.llm_feedback,
  metrics: payload.metrics,
  differentiator_summary: payload.differentiator_summary,
  analytics: payload.analytics,
  status: 'draft' as const,
  created_at: '2025-11-12T00:00:00.000Z',
  updated_at: '2025-11-12T00:00:00.000Z',
  finalized_at: null,
});

const buildWorkpadRow = (payload: Record<string, unknown>) => ({
  id: 'workpad-456',
  draft_id: payload.draft_id as string,
  user_id: payload.user_id as string,
  job_description_id: payload.job_description_id as string,
  phase: payload.phase as string,
  payload: payload.payload,
  created_at: '2025-11-12T00:00:00.000Z',
  updated_at: '2025-11-12T00:00:00.000Z',
});

function createRequirement(
  id: string,
  label: string,
  category: RequirementInsight['category'],
  keywords: string[],
): RequirementInsight {
  return {
    id,
    label,
    detail: label,
    category,
    priority: 'high',
    keywords,
    reasoning: undefined,
    signals: [],
  };
}

describe('CoverLetterDraftService', () => {
  it('generates draft sections and persists cover letter and workpad', async () => {
    const supabaseMock = createSupabaseMock();
    const { CoverLetterDraftService } = await import('../coverLetterDraftService');

    const service = new CoverLetterDraftService({
      supabaseClient: supabaseMock.supabaseClient,
      jobDescriptionService: jobDescriptionServiceStub as any,
      metricsStreamer,
      now,
    });

    const result = await service.generateDraft({
      userId: 'user-1',
      templateId: 'template-1',
      jobDescriptionId: 'jd-1',
    });

    expect(result.draft.sections).toHaveLength(2);
    expect(result.draft.sections[1].metadata.requirementsMatched).toContain('diff-1');
    expect(result.draft.analytics?.atsScore).toBe(88);

    const insertPayload = supabaseMock.getCoverLetterInsert();
    expect(insertPayload).toMatchObject({
      user_id: 'user-1',
      template_id: 'template-1',
      job_description_id: 'jd-1',
    });

    const workpadPayload = supabaseMock.getWorkpadUpsert();
    expect(workpadPayload).toMatchObject({
      draft_id: 'draft-123',
      user_id: 'user-1',
      job_description_id: 'jd-1',
      phase: 'metrics',
    });
  });

  it('finalizes draft and updates analytics snapshot', async () => {
    const finalSectionsBase: CoverLetterDraftSection[] = [
      {
        id: 'sec-intro',
        templateSectionId: 'intro-1',
        slug: 'introduction',
        title: 'Introduction',
        type: 'static',
        order: 1,
        content: 'Dear Hiring Manager,',
        source: { kind: 'template_static', entityId: 'intro-1' },
        metadata: {
          requirementsMatched: [],
          tags: [],
          wordCount: 3,
        },
        status: {
          hasGaps: false,
          gapIds: [],
          isModified: false,
          lastUpdatedAt: now().toISOString(),
        },
        analytics: {},
      },
      {
        id: 'sec-body',
        templateSectionId: 'body-1',
        slug: 'body',
        title: 'Impact',
        type: 'dynamic-story',
        order: 2,
        content: 'I led a launch initiative with measurable impact.',
        source: { kind: 'work_story', entityId: 'story-1' },
        metadata: {
          requirementsMatched: [],
          tags: ['launch'],
          wordCount: 8,
        },
        status: {
          hasGaps: true,
          gapIds: ['gap-1'],
          isModified: false,
          lastUpdatedAt: now().toISOString(),
        },
        analytics: {},
      },
    ];

    const basePayload = {
      user_id: 'user-1',
      template_id: 'template-1',
      job_description_id: 'jd-1',
      sections: finalSectionsBase,
      llm_feedback: {},
      metrics: metricsResult.metrics,
      differentiator_summary: [],
      analytics: { atsScore: 82 },
    };

    const supabaseMock = createFinalizeSupabaseMock({
      ...buildCoverLetterRow(basePayload),
      sections: finalSectionsBase,
    });

    const { CoverLetterDraftService } = await import('../coverLetterDraftService');
    const service = new CoverLetterDraftService({
      supabaseClient: supabaseMock.supabaseClient,
      jobDescriptionService: jobDescriptionServiceStub as any,
      metricsStreamer,
      now,
    });

    const updatedSections: CoverLetterDraftSection[] = finalSectionsBase.map(section => ({
      ...section,
      metadata: { ...section.metadata },
      status: { ...section.status },
      content:
        section.id === 'sec-body'
          ? 'I spearheaded a 0-to-1 launch that increased adoption by 120% across the platform.'
          : section.content,
    }));

    const { draft: finalizedDraft, workpad } = await service.finalizeDraft({
      draftId: 'draft-123',
      sections: updatedSections,
    });

    expect(finalizedDraft.status).toBe('finalized');
    expect(finalizedDraft.finalizedAt).toBe(now().toISOString());
    expect(finalizedDraft.sections[1].metadata.requirementsMatched).toContain('diff-1');
    expect(finalizedDraft.differentiatorSummary[0].status).toBe('addressed');
    expect(finalizedDraft.analytics?.wordCount).toBeGreaterThan(0);
    expect(workpad?.lastPhase).toBe('finalized');

    const updatePayload = supabaseMock.getUpdatePayload();
    expect(updatePayload?.status).toBe('finalized');
    expect(updatePayload?.finalized_at).toBe(now().toISOString());
    expect(
      (updatePayload?.analytics as Record<string, unknown> | undefined)?.differentiatorCoverage,
    ).toMatchObject({ addressed: 1, missing: 0 });

    const workpadPayload = supabaseMock.getWorkpadUpsert();
    expect(workpadPayload).toMatchObject({
      draft_id: 'draft-123',
      phase: 'finalized',
    });
  });
});

