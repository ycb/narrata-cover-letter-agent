import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDraftReadiness } from '../useDraftReadiness';
import { isDraftReadinessEnabled } from '@/lib/flags';

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

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

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

const mockResponse = (status: number, jsonBody?: any) => ({
  status,
  ok: status >= 200 && status < 300,
  json: vi.fn().mockResolvedValue(jsonBody),
});

describe('useDraftReadiness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (isDraftReadinessEnabled as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  it('returns readiness data on success', async () => {
    mockFetch.mockResolvedValue(
      mockResponse(200, {
        rating: 'strong',
        scoreBreakdown: { opening: 'strong' },
        feedback: { summary: 'Good', improvements: [] },
        evaluatedAt: '2024-01-01T00:00:00.000Z',
        ttlExpiresAt: '2024-01-01T00:10:00.000Z',
        fromCache: false,
      }),
    );

    const { result } = renderHook(
      () => useDraftReadiness({ draftId: 'draft-1', enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data?.rating).toBe('strong');
    expect(result.current.featureDisabled).toBe(false);
  });

  it('handles 204 responses as no readiness', async () => {
    mockFetch.mockResolvedValue({
      status: 204,
      ok: false,
      json: vi.fn(),
    });

    const { result } = renderHook(
      () => useDraftReadiness({ draftId: 'draft-1', enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.featureDisabled).toBe(false);
  });

  it('flags featureDisabled on 503 responses', async () => {
    mockFetch.mockResolvedValue(mockResponse(503, { error: 'disabled' }));

    const { result } = renderHook(
      () => useDraftReadiness({ draftId: 'draft-1', enabled: true }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.featureDisabled).toBe(true));
    expect(result.current.data).toBeNull();
  });
});


