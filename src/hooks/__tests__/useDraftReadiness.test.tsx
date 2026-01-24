// TEST STATUS: PASSING - HIGH VALUE
// Tests draft readiness React Query hook
// QueryClient wrapper already implemented correctly

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDraftReadiness } from '../useDraftReadiness';
import { isDraftReadinessEnabled } from '@/lib/flags';

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    session: {
      access_token: 'test-token',
    },
  }),
}));

vi.mock('@/lib/flags', () => ({
  isDraftReadinessEnabled: vi.fn(() => true),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useDraftReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isDraftReadinessEnabled as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  afterEach(() => {
    invokeMock.mockReset();
  });

  it('returns readiness data on success', async () => {
    invokeMock.mockResolvedValue({
      data: {
        rating: 'strong',
        scoreBreakdown: { opening: 'strong' },
        feedback: { summary: 'Good', improvements: [] },
        evaluatedAt: '2024-01-01T00:00:00.000Z',
        ttlExpiresAt: '2024-01-01T00:10:00.000Z',
        fromCache: false,
      },
      error: null,
    });

    const { result } = renderHook(
      () => useDraftReadiness({ draftId: 'draft-1', enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.rating).toBe('strong');
    expect(result.current.featureDisabled).toBe(false);
  });

  it('handles 204 responses as no readiness', async () => {
    invokeMock.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(
      () => useDraftReadiness({ draftId: 'draft-1', enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.featureDisabled).toBe(false);
  });

  it('flags featureDisabled on 503 responses', async () => {
    const contextJson = vi.fn().mockResolvedValue({ error: 'FEATURE_DISABLED' });
    invokeMock.mockResolvedValue({
      data: null,
      error: {
        message: 'FEATURE_DISABLED',
        context: { json: contextJson },
      },
    });

    const { result } = renderHook(
      () => useDraftReadiness({ draftId: 'draft-1', enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.featureDisabled).toBe(true));
    expect(result.current.data).toBeNull();
  });
});
