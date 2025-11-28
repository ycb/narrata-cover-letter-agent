import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { isDraftReadinessEnabled } from '@/lib/flags';
import type { DraftReadinessEvaluation } from '@/types/coverLetters';

interface UseDraftReadinessOptions {
  draftId?: string | null;
  draftUpdatedAt?: string | null;
  enabled?: boolean;
}

interface ReadinessQueryResult {
  readiness: DraftReadinessEvaluation | null;
  featureDisabled: boolean;
}

export const useDraftReadiness = ({
  draftId,
  draftUpdatedAt,
  enabled = true,
}: UseDraftReadinessOptions) => {
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const featureFlagEnabled = isDraftReadinessEnabled();
  const normalizedDraftId =
    typeof draftId === 'string' && draftId.trim().length > 0 ? draftId.trim() : null;

  const shouldFetch = Boolean(featureFlagEnabled && enabled && normalizedDraftId && accessToken);

  const queryKey = useMemo(
    () => ['draft-readiness', normalizedDraftId, draftUpdatedAt ?? null],
    [normalizedDraftId, draftUpdatedAt],
  );

  const query = useQuery<ReadinessQueryResult>({
    queryKey,
    enabled: shouldFetch,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
    retry: 1,
    queryFn: async () => {
      if (!normalizedDraftId) {
        throw new Error('Draft ID is required for readiness queries.');
      }
      if (!accessToken) {
        throw new Error('Missing access token for readiness queries.');
      }
      const response = await fetch(`/api/drafts/${normalizedDraftId}/readiness`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.status === 204) {
        return { readiness: null, featureDisabled: false };
      }

      if (response.status === 503) {
        return { readiness: null, featureDisabled: true };
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message =
          typeof payload?.error === 'string'
            ? payload.error
            : 'Failed to load draft readiness';
        throw new Error(message);
      }

      const payload = await response.json();
      const readiness: DraftReadinessEvaluation = {
        rating: payload.rating,
        scoreBreakdown: payload.scoreBreakdown,
        feedback: payload.feedback,
        evaluatedAt: payload.evaluatedAt ?? undefined,
        ttlExpiresAt: payload.ttlExpiresAt ?? undefined,
        fromCache: Boolean(payload.fromCache),
      };

      return { readiness, featureDisabled: false };
    },
  });

  useEffect(() => {
    if (!shouldFetch) return;
    if (typeof window === 'undefined') return;
    const ttl = query.data?.readiness?.ttlExpiresAt;
    if (!ttl) return;
    const expiryMs = new Date(ttl).getTime() - Date.now();
    if (expiryMs <= 0) {
      query.refetch();
      return;
    }

    const timer = window.setTimeout(() => {
      query.refetch();
    }, expiryMs);

    return () => window.clearTimeout(timer);
  }, [query.data?.readiness?.ttlExpiresAt, shouldFetch, query.refetch]);

  const featureDisabled =
    !featureFlagEnabled || query.data?.featureDisabled === true;

  const readinessData = shouldFetch ? query.data?.readiness ?? null : null;
  const isLoading = shouldFetch ? query.isLoading || query.isFetching : false;

  return {
    data: readinessData,
    isLoading,
    isError: query.isError,
    error: query.error,
    featureDisabled,
    refetch: query.refetch,
  };
};


