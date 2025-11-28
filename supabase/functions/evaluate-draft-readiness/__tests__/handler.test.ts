import {
  assertEquals,
  assertRejects,
  assert,
} from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { ZodError } from 'https://esm.sh/zod@3.23.8';
import {
  createEvaluateDraftReadinessHandler,
  evaluateDraftReadinessCore,
} from '../index.ts';
import {
  DRAFT_READINESS_MIN_WORDS,
  type DraftReadinessContext,
  type DraftReadinessResult,
} from '../../_shared/readiness.ts';

type TestDeps = Parameters<typeof evaluateDraftReadinessCore>[1];

const baseScoreBreakdown: DraftReadinessResult['scoreBreakdown'] = {
  clarityStructure: 'sufficient',
  opening: 'sufficient',
  companyAlignment: 'sufficient',
  roleAlignment: 'sufficient',
  specificExamples: 'sufficient',
  quantifiedImpact: 'sufficient',
  personalization: 'sufficient',
  writingQuality: 'sufficient',
  lengthEfficiency: 'sufficient',
  executiveMaturity: 'sufficient',
};

const samplePayload: DraftReadinessResult = {
  rating: 'strong',
  scoreBreakdown: { ...baseScoreBreakdown, clarityStructure: 'strong' },
  feedback: {
    summary: 'Ready to send.',
    improvements: ['Tighten closing paragraph.'],
  },
};

function createContext(overrides: Partial<DraftReadinessContext> = {}): DraftReadinessContext {
  return {
    draftId: 'draft-1',
    userId: 'user-1',
    jobDescriptionId: 'job-1',
    mergedDraft: 'Example draft content',
    promptDraft: 'Example draft content',
    wordCount: 500,
    companyContext: {
      name: 'Acme',
      industry: 'Tech',
      mission: 'Build great products',
      values: ['Customer focus'],
    },
    roleContext: {
      title: 'Senior PM',
      level: 'Senior',
      keyRequirements: ['Drive outcomes'],
    },
    ...overrides,
  };
}

function createDeps(overrides: Partial<TestDeps> = {}): TestDeps {
  const fixed = new Date('2025-01-01T00:00:00.000Z').getTime();
  const base: TestDeps = {
    getEnv: (key) => (key === 'ENABLE_DRAFT_READINESS' ? 'true' : undefined),
    now: () => new Date(fixed),
    loadContext: async () => createContext(),
    fetchEvaluation: async () => null,
    upsertEvaluation: async () => {},
    callJudge: async () => samplePayload,
  };
  return { ...base, ...overrides };
}

Deno.test('returns 403 when feature flag disabled', async () => {
  const handler = createEvaluateDraftReadinessHandler({
    getEnv: (key) => (key === 'ENABLE_DRAFT_READINESS' ? 'false' : undefined),
  });
  const res = await handler(new Request('https://example.com', { method: 'POST' }));
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.error, 'FEATURE_DISABLED');
});

Deno.test('uses cached evaluation when TTL still valid', async () => {
  const fetchSpy = {
    called: 0,
  };
  const deps = createDeps({
    fetchEvaluation: async () => {
      fetchSpy.called += 1;
      return {
        draft_id: 'draft-1',
        rating: 'adequate',
        score_breakdown: baseScoreBreakdown,
        feedback_summary: 'Cached verdict',
        improvements: ['Improve opening'],
        evaluated_at: '2025-01-01T00:00:00.000Z',
        ttl_expires_at: '2025-01-01T00:05:00.000Z',
        metadata: { model: 'gpt-4o-mini' },
      };
    },
    upsertEvaluation: async () => {
      throw new Error('should not upsert when cache is fresh');
    },
  });

  const result = await evaluateDraftReadinessCore(
    {
      draftId: 'draft-1',
      userId: 'user-1',
      supabase: {} as any,
      openAiApiKey: 'test',
    },
    deps,
  );

  assertEquals(fetchSpy.called, 1);
  assertEquals(result.fromCache, true);
  assertEquals(result.rating, 'adequate');
  assertEquals(result.feedback.summary, 'Cached verdict');
});

Deno.test('recomputes when TTL expired', async () => {
  let upsertPayload: DraftReadinessResult | null = null;
  const deps = createDeps({
    fetchEvaluation: async () => ({
      draft_id: 'draft-1',
      rating: 'weak',
      score_breakdown: baseScoreBreakdown,
      feedback_summary: 'Old verdict',
      improvements: [],
      evaluated_at: '2024-12-31T23:00:00.000Z',
      ttl_expires_at: '2024-12-31T23:30:00.000Z',
      metadata: {},
    }),
    upsertEvaluation: async ({ payload }) => {
      upsertPayload = payload;
    },
  });

  const result = await evaluateDraftReadinessCore(
    {
      draftId: 'draft-1',
      userId: 'user-1',
      supabase: {} as any,
      openAiApiKey: 'test',
    },
    deps,
  );

  assertEquals(result.fromCache, false);
  assertEquals(result.rating, samplePayload.rating);
  const upsertAny = upsertPayload as any;
  assertEquals(upsertAny?.rating, samplePayload.rating);
});

Deno.test('short drafts skip LLM and return weak verdict', async () => {
  let llmCalled = false;
  let upsertCalled = false;
  const deps = createDeps({
    loadContext: async () => createContext({ wordCount: DRAFT_READINESS_MIN_WORDS - 10 }),
    callJudge: async () => {
      llmCalled = true;
      return samplePayload;
    },
    upsertEvaluation: async () => {
      upsertCalled = true;
    },
  });

  const result = await evaluateDraftReadinessCore(
    {
      draftId: 'draft-1',
      userId: 'user-1',
      supabase: {} as any,
      openAiApiKey: 'test',
    },
    deps,
  );

  assertEquals(llmCalled, false);
  assertEquals(upsertCalled, true);
  assertEquals(result.rating, 'weak');
  assertEquals(result.fromCache, false);
});

Deno.test('schema failures propagate without DB writes', async () => {
  let upsertCalled = false;
  const deps = createDeps({
    callJudge: async () => {
      throw new ZodError([]);
    },
    upsertEvaluation: async () => {
      upsertCalled = true;
    },
  });

  await assertRejects(
    () =>
      evaluateDraftReadinessCore(
        {
          draftId: 'draft-1',
          userId: 'user-1',
          supabase: {} as any,
          openAiApiKey: 'test',
        },
        deps,
      ),
    ZodError,
  );

  assert(upsertCalled === false);
});

