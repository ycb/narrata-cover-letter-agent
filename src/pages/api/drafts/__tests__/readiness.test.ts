// TEST STATUS: PASSING - HIGH VALUE
// Tests draft readiness API endpoint (always enabled)
// Fixed: Mock persistence issue resolved (Dec 4, 2025)
// Uses mockReturnValue instead of mockReturnValueOnce for consistent mocking

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import handler from '../[draftId]/readiness';
import { CoverLetterDraftService, DraftReadinessFeatureDisabledError } from '@/services/coverLetterDraftService';

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn(),
  };
});

vi.mock('@/services/coverLetterDraftService', () => {
  class MockDraftReadinessFeatureDisabledError extends Error {
    constructor(message = 'disabled') {
      super(message);
      this.name = 'DraftReadinessFeatureDisabledError';
    }
  }

  const mockConstructor = vi.fn().mockImplementation(() => ({
    getReadinessEvaluation: vi.fn(),
  }));

  return {
    CoverLetterDraftService: mockConstructor,
    DraftReadinessFeatureDisabledError: MockDraftReadinessFeatureDisabledError,
  };
});

const { createClient } = await import('@supabase/supabase-js');

type MockRes = {
  statusCode: number;
  body: any;
  headers: Record<string, string>;
  status: (code: number) => MockRes;
  json: (payload: any) => void;
  end: () => void;
  setHeader: (name: string, value: string) => void;
};

const createResponse = (): MockRes => {
  const res: MockRes = {
    statusCode: 200,
    body: null,
    headers: {},
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: any) {
      res.body = payload;
    },
    end() {
      res.body = null;
    },
    setHeader(name: string, value: string) {
      res.headers[name] = value;
    },
  };
  return res;
};

const mockAdminClient = ({
  userId = 'user-1',
  draftRow = { id: 'draft-1', user_id: 'user-1' },
  authError = null,
  draftError = null,
}: {
  userId?: string | null;
  draftRow?: any;
  authError?: any;
  draftError?: any;
}) => {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
        error: authError,
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: draftRow, error: draftError }),
        }),
      }),
    }),
  };
};

const mockUserClient = () => ({ from: vi.fn() });

describe('API /api/drafts/[draftId]/readiness', () => {
  let mockService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPABASE_URL = 'https://supabase.local';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.SUPABASE_ANON_KEY = 'anon-key';
    
    // Set up default service mock
    mockService = {
      getReadinessEvaluation: vi.fn().mockResolvedValue(null),
    };
    (CoverLetterDraftService as unknown as ReturnType<typeof vi.fn>)
      .mockImplementation(() => mockService);
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('rejects non-GET methods', async () => {
    const req = {
      method: 'POST',
      headers: {},
      query: { draftId: 'draft-1' },
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(405);
    expect(res.headers['Allow']).toBe('GET');
  });

  it('returns 400 when draftId missing', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: {},
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when Authorization header missing', async () => {
    const req = {
      method: 'GET',
      headers: {},
      query: { draftId: 'draft-1' },
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when auth token invalid', async () => {
    const adminClient = mockAdminClient({ userId: null, authError: new Error('bad token') });
    const userClient = mockUserClient();
    (createClient as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValue(adminClient); // Use mockReturnValue for all calls

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { draftId: 'draft-1' },
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(401);
  });

  it('returns 403 when draft does not belong to user', async () => {
    const adminClient = mockAdminClient({
      userId: 'user-1',
      draftRow: { id: 'draft-1', user_id: 'another-user' },
    });
    const userClient = mockUserClient();
    (createClient as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValue(adminClient); // Use mockReturnValue for all calls

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { draftId: 'draft-1' },
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(403);
  });

  it('returns 204 when no readiness data yet', async () => {
    const adminClient = mockAdminClient({});
    const userClient = mockUserClient();
    (createClient as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValue(adminClient); // Use mockReturnValue for all calls

    // Override service mock to return null
    mockService.getReadinessEvaluation.mockResolvedValue(null);

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { draftId: 'draft-1' },
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(204);
  });

  it('returns 503 when service throws feature disabled error', async () => {
    const adminClient = mockAdminClient({});
    const userClient = mockUserClient();
    (createClient as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValue(adminClient); // Use mockReturnValue for all calls

    // Override service mock to throw feature disabled error
    mockService.getReadinessEvaluation.mockRejectedValue(
      new DraftReadinessFeatureDisabledError()
    );

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { draftId: 'draft-1' },
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'disabled' });
  });

  it('returns 200 with readiness payload', async () => {
    const adminClient = mockAdminClient({});
    const userClient = mockUserClient();
    (createClient as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValue(adminClient); // Use mockReturnValue for all calls

    // Override service mock to return readiness data
    mockService.getReadinessEvaluation.mockResolvedValue({
      rating: 'strong',
      scoreBreakdown: { opening: 'strong' },
      feedback: { summary: 'Great', improvements: [] },
      evaluatedAt: '2024-01-01T00:00:00.000Z',
      ttlExpiresAt: '2024-01-01T00:10:00.000Z',
      fromCache: false,
    });

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { draftId: 'draft-1' },
    };
    const res = createResponse();
    await handler(req as any, res as any);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      rating: 'strong',
      fromCache: false,
      ttlExpiresAt: '2024-01-01T00:10:00.000Z',
    });
  });
});

