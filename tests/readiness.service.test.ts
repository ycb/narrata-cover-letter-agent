import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoverLetterDraftService } from '@/services/coverLetterDraftService';
import type { DraftReadinessEvaluation } from '@/types/coverLetters';

// Minimal stub of Supabase client pieces we touch
function createSupabaseStub({
  row,
  refreshedRow,
  invokeData,
  track = {},
}: {
  row?: any;
  refreshedRow?: any;
  invokeData?: any;
  track?: any;
}) {
  const selects: any[] = [];
  const updates: any[] = [];
  const invokes: any[] = [];

  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: row }),
        single: vi.fn().mockResolvedValue({ data: row }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: refreshedRow }),
        }),
      }),
    }),
    upsert: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: refreshedRow }),
    }),
  });

  const functions = {
    invoke: vi.fn().mockResolvedValue({ data: invokeData || null, error: null }),
  };

  const stub = {
    from,
    functions,
  };
  Object.assign(track, { selects, updates, invokes, stub });
  return stub as any;
}

// Helper to force flag on/off
function withFlag(enabled: boolean, cb: () => Promise<void>) {
  const prev = process.env.ENABLE_DRAFT_READINESS;
  process.env.ENABLE_DRAFT_READINESS = enabled ? 'true' : 'false';
  return cb().finally(() => {
    if (prev === undefined) delete process.env.ENABLE_DRAFT_READINESS;
    else process.env.ENABLE_DRAFT_READINESS = prev;
  });
}

describe('CoverLetterDraftService.getReadinessEvaluation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when flag disabled (no DB or function calls)', async () => {
    await withFlag(false, async () => {
      const supabaseClient = createSupabaseStub({});
      const service = new CoverLetterDraftService({ supabaseClient });
      const result = await service.getReadinessEvaluation('draft-1');
      expect(result).toBeNull();
      expect(supabaseClient.from).not.toHaveBeenCalled();
      expect(supabaseClient.functions.invoke).not.toHaveBeenCalled();
    });
  });

  it('uses cached result when TTL fresh (no function invoke)', async () => {
    await withFlag(true, async () => {
      const freshTtl = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const row = {
        rating: 'strong',
        score_breakdown: { opening: 'strong', clarityStructure: 'sufficient' },
        feedback_summary: 'Looks good.',
        improvements: ['Tighten closing'],
        evaluated_at: new Date().toISOString(),
        ttl_expires_at: freshTtl,
        metadata: {},
      };
      const supabaseClient = createSupabaseStub({ row });
      const service = new CoverLetterDraftService({ supabaseClient });
      const result = await service.getReadinessEvaluation('draft-2');
      expect(result?.rating).toBe('strong');
      expect(supabaseClient.functions.invoke).not.toHaveBeenCalled();
    });
  });

  it('triggers recompute when TTL expired and returns refreshed DB row', async () => {
    await withFlag(true, async () => {
      const expired = new Date(Date.now() - 1000).toISOString();
      const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const row = { ttl_expires_at: expired };
      const refreshed = {
        rating: 'adequate',
        score_breakdown: { opening: 'sufficient', clarityStructure: 'sufficient' },
        feedback_summary: 'Solid but uneven.',
        improvements: ['Add quant metrics'],
        evaluated_at: new Date().toISOString(),
        ttl_expires_at: future,
        metadata: {},
      };
      const supabaseClient = createSupabaseStub({ row, refreshedRow: refreshed, invokeData: null });
      // Patch the second read (refreshed) behavior
      (supabaseClient.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: row }),
          }),
        }),
      });
      (supabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: refreshed }),
          }),
        }),
      });

      const service = new CoverLetterDraftService({ supabaseClient });
      const result = await service.getReadinessEvaluation('draft-3');
      expect(result?.rating).toBe('adequate');
      expect(supabaseClient.functions.invoke).toHaveBeenCalled();
    });
  });

  it('handles invalid function payload by sanitizing', async () => {
    await withFlag(true, async () => {
      const expired = new Date(Date.now() - 1000).toISOString();
      const row = { ttl_expires_at: expired };
      // invalid payload (missing fields), should sanitize to defaults
      const invokeData = { rating: 'weak', feedback: { summary: 'x', improvements: [] } };
      const supabaseClient = createSupabaseStub({ row, invokeData });
      // First DB read returns expired
      (supabaseClient.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: row }),
          }),
        }),
      });
      // Second DB read returns null; service falls back to function response
      (supabaseClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });
      const service = new CoverLetterDraftService({ supabaseClient });
      const result = await service.getReadinessEvaluation('draft-4');
      expect(result?.rating).toBe('weak');
      expect(result?.feedback.summary).toBe('x');
    });
  });
});


