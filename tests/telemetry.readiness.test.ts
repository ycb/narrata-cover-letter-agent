import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock flags util to control feature flag behavior
vi.mock('@/lib/flags', () => ({
  isDraftReadinessEnabled: vi.fn(),
}));

// Import after mocking
import { logReadinessEvent, logAStreamEvent } from '@/lib/telemetry';
import { isDraftReadinessEnabled } from '@/lib/flags';

describe('telemetry wrappers', () => {
  const originalEnv = { ...process.env };
  let infoSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('logReadinessEvent: no-op when flag disabled', () => {
    (isDraftReadinessEnabled as unknown as vi.Mock).mockReturnValue(false);
    process.env.NODE_ENV = 'development';
    logReadinessEvent('ui_readiness_card_viewed', { draftId: 'd1' });
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logReadinessEvent: no-op in production even when enabled', () => {
    (isDraftReadinessEnabled as unknown as vi.Mock).mockReturnValue(true);
    process.env.NODE_ENV = 'production';
    logReadinessEvent('ui_readiness_card_expanded', { draftId: 'd2' });
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('logReadinessEvent: logs in dev when enabled', () => {
    (isDraftReadinessEnabled as unknown as vi.Mock).mockReturnValue(true);
    process.env.NODE_ENV = 'development';
    const payload = { draftId: 'd3', fromCache: true };
    logReadinessEvent('ui_readiness_auto_refresh_tick', payload);
    expect(infoSpy).toHaveBeenCalledWith('[telemetry]', 'ui_readiness_auto_refresh_tick', payload);
  });

  it('logAStreamEvent: dev-only behavior', () => {
    process.env.NODE_ENV = 'development';
    const payload = { stage: 'jdAnalysis' };
    logAStreamEvent('stream_cover_letter_stage_completed', payload);
    expect(infoSpy).toHaveBeenCalledWith(
      '[telemetry]',
      'stream_cover_letter_stage_completed',
      payload,
    );

    infoSpy.mockClear();
    process.env.NODE_ENV = 'production';
    logAStreamEvent('stream_cover_letter_insights_rendered', { ok: true });
    expect(infoSpy).not.toHaveBeenCalled();
  });
});


