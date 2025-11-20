import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const streamTextMock = vi.fn();

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => ({
    chat: vi.fn(() => 'mock-model'),
  })),
}));

vi.mock('ai', () => ({
  streamText: streamTextMock,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => {
      throw new Error('Unexpected supabase usage in jobDescriptionService tests');
    }),
  },
}));

const BASE_RESPONSE = {
  company: 'Narrata',
  role: 'Senior Product Manager',
  summary: 'Drive experimentation to grow enterprise adoption.',
  standardRequirements: [
    {
      id: 'std-1',
      label: 'Stakeholder alignment',
      priority: 'high',
      keywords: ['stakeholder', 'communication'],
      signals: ['executive updates'],
    },
  ],
  differentiatorRequirements: [
    {
      id: 'diff-1',
      label: '0-to-1 GTM launch experience',
      priority: 'critical',
      keywords: ['launch', '0-to-1'],
      signals: ['market expansion'],
    },
  ],
  preferredRequirements: [
    {
      id: 'pref-1',
      label: 'Experience with data products',
      priority: 'medium',
      keywords: ['data science'],
      signals: [],
    },
  ],
  boilerplateSignals: ['roadmapping', 'stakeholder alignment'],
  differentiatorSignals: ['0-to-1 launches'],
  keywords: ['roadmap', 'experiments', 'analytics'],
  differentiatorNotes: 'Emphasis on launching a new analytics suite for enterprise customers.',
  structuredData: {
    responsibilities: ['Own end-to-end roadmap', 'Partner with GTM leadership'],
    qualifications: ['7+ years PM experience'],
    tools: ['Amplitude', 'Looker'],
    teams: ['Growth'],
    location: 'Remote (US)',
    employmentType: 'Full-time',
    compensation: '200-230k base',
  },
  rawSections: [
    {
      title: 'About the role',
      content: 'You will lead the enterprise analytics roadmap.',
    },
  ],
};

const buildStreamingResult = (payload: unknown) => ({
  textStream: (async function* stream() {
    yield { text: JSON.stringify(payload) };
  })(),
});

type JobDescriptionRow = Database['public']['Tables']['job_descriptions']['Row'];

const createSupabaseMock = (row: Partial<JobDescriptionRow> = {}) => {
  const baseRow: JobDescriptionRow = {
    id: 'jd-1',
    user_id: 'user-1',
    url: null,
    content: 'JD content',
    company: BASE_RESPONSE.company,
    role: BASE_RESPONSE.role,
    structured_data: BASE_RESPONSE.structuredData,
    standard_requirements: BASE_RESPONSE.standardRequirements,
    differentiator_requirements: BASE_RESPONSE.differentiatorRequirements,
    preferred_requirements: BASE_RESPONSE.preferredRequirements,
    keywords: BASE_RESPONSE.keywords,
    differentiator_notes: BASE_RESPONSE.differentiatorNotes,
    analysis: {},
    created_at: '2025-11-12T00:00:00.000Z',
    updated_at: '2025-11-12T00:00:00.000Z',
    ...row,
  };

  let insertedPayload: Record<string, unknown> | undefined;

  const insertSingle = vi.fn().mockResolvedValue({ data: baseRow, error: null });
  const insertSelect = vi.fn(() => ({ single: insertSingle }));
  const insert = vi.fn((payload: Record<string, unknown>) => {
    insertedPayload = payload;
    return { select: insertSelect };
  });

  const selectChain: Record<string, unknown> = {
    eq: vi.fn().mockImplementation(() => selectChain),
    order: vi.fn().mockImplementation(() => selectChain),
    single: vi.fn().mockResolvedValue({ data: baseRow, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: baseRow, error: null }),
  };

  const select = vi.fn(() => selectChain);

  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({ eq: updateEq }));

  const from = vi.fn(() => ({
    insert,
    select,
    update,
  }));

  return {
    supabaseClient: { from } as unknown as SupabaseClient,
    from,
    insert,
    insertSingle,
    updateEq,
    getInsertedPayload: () => insertedPayload,
  };
};

describe('JobDescriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_OPENAI_KEY = 'test-key';
    streamTextMock.mockResolvedValue(buildStreamingResult(BASE_RESPONSE));
  });

  it('parses job descriptions using streamed LLM output', async () => {
    const { JobDescriptionService } = await import('../jobDescriptionService');
    const service = new JobDescriptionService({ openAIKey: 'test-key' });

    const { parsed, raw } = await service.parseJobDescription(
      'Comprehensive job description content for testing streaming parser.',
    );

    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'mock-model',
        system: expect.stringContaining('expert product hiring strategist'),
      }),
    );

    expect(raw).toEqual(BASE_RESPONSE);
    expect(parsed.company).toBe('Narrata');
    expect(parsed.standardRequirements[0].category).toBe('standard');
    expect(parsed.differentiatorSignals).toContain('0-to-1 launches');
  });

  it('creates job description records in Supabase', async () => {
    const supabaseMock = createSupabaseMock();
    const { JobDescriptionService } = await import('../jobDescriptionService');
    const service = new JobDescriptionService({
      supabaseClient: supabaseMock.supabaseClient,
      openAIKey: 'test-key',
    });

    const record = await service.createJobDescription('user-1', {
      content: 'Job description content',
      company: 'Narrata',
      role: 'Senior Product Manager',
      summary: 'Summary',
      structuredData: {},
      standardRequirements: [],
      differentiatorRequirements: [],
      preferredRequirements: [],
      keywords: [],
    });

    expect(supabaseMock.from).toHaveBeenCalledWith('job_descriptions');
    expect(record.id).toBe('jd-1');
  });

  it('parses and persists job descriptions via parseAndCreate', async () => {
    const supabaseMock = createSupabaseMock();
    const { JobDescriptionService } = await import('../jobDescriptionService');
    const service = new JobDescriptionService({
      supabaseClient: supabaseMock.supabaseClient,
      openAIKey: 'test-key',
    });

    await service.parseAndCreate(
      'user-1',
      'This is a richly detailed job description used to validate parsing and persistence during unit testing.',
      { url: 'https://company.com/jd' },
    );

    expect(streamTextMock).toHaveBeenCalledTimes(1);
    const payload = supabaseMock.getInsertedPayload();
    expect(payload).toEqual(
      expect.objectContaining({
        user_id: 'user-1',
        company: 'Narrata',
        differentiator_requirements: expect.any(Array),
      }),
    );
  });
});