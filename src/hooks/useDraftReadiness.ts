import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { isDraftReadinessEnabled } from '@/lib/flags';
import { supabase } from '@/lib/supabase';
import type {
  DraftReadinessAvailability,
  DraftReadinessEvaluation,
} from '@/types/coverLetters';

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
    retry: 0,
    queryFn: async () => {
      if (!normalizedDraftId) {
        throw new Error('Draft ID is required for readiness queries.');
      }
      if (!accessToken) {
        throw new Error('Missing access token for readiness queries.');
      }
      
      // Use Supabase Edge Function directly (not Next.js-style API route)
      // The /api/drafts/... route doesn't exist in Vite - it was returning HTML
      console.log('[useDraftReadiness] Invoking edge function for draftId:', normalizedDraftId);
      
      const { data, error } = await supabase.functions.invoke('evaluate-draft-readiness', {
        body: { draftId: normalizedDraftId },
      });

      console.log('[useDraftReadiness] Edge function response:', { 
        hasData: !!data, 
        hasError: !!error,
        errorMessage: error?.message,
        errorName: error?.name,
        errorContext: error?.context,
        dataKeys: data ? Object.keys(data) : [],
        dataError: data?.error,
        fullData: data,
      });

      // Handle FunctionsHttpError - the actual response body is in error.context
      // Supabase client puts non-2xx responses in error, not data
      if (error) {
        // Try to get the actual error response from context
        let errorBody: any = null;
        if (error.context && typeof error.context.json === 'function') {
          try {
            errorBody = await error.context.json();
            console.log('[useDraftReadiness] Error response body:', errorBody);
          } catch (e) {
            console.log('[useDraftReadiness] Could not parse error body as JSON');
          }
        }
        
        // Check for feature disabled
        if (errorBody?.error === 'FEATURE_DISABLED' || 
            error.message?.includes('FEATURE_DISABLED') || 
            error.message?.includes('403')) {
          console.log('[useDraftReadiness] Feature disabled (server-side)');
          return { readiness: null, featureDisabled: true };
        }
        
        // Check for auth errors (401) - these are expected if token expired
        if (errorBody?.error?.includes('auth') || 
            errorBody?.error?.includes('token') ||
            error.message?.includes('401')) {
          console.error('[useDraftReadiness] Auth error:', errorBody?.error || error.message);
          throw new Error('Authentication error - please refresh the page');
        }
        
        console.error('[useDraftReadiness] Edge function error:', error, errorBody);
        throw new Error(errorBody?.error || error.message || 'Failed to load draft readiness');
      }

      // Edge function returns { error: 'FEATURE_DISABLED' } with 403 when disabled
      // This may come as `data.error` not `error` depending on Supabase client behavior
      if (data?.error === 'FEATURE_DISABLED') {
        console.log('[useDraftReadiness] Feature disabled (server-side)');
        return { readiness: null, featureDisabled: true };
      }

      // No data returned (evaluation not yet available)
      if (!data) {
        console.log('[useDraftReadiness] No data returned');
        return { readiness: null, featureDisabled: false };
      }

      // Check for any error field in data
      if (data.error) {
        console.error('[useDraftReadiness] Server returned error:', data.error);
        throw new Error(data.error);
      }

      console.log('[useDraftReadiness] Success! Rating:', data.rating);
      const readiness: DraftReadinessEvaluation = {
        rating: data.rating,
        scoreBreakdown: data.scoreBreakdown,
        feedback: data.feedback,
        evaluatedAt: data.evaluatedAt ?? undefined,
        ttlExpiresAt: data.ttlExpiresAt ?? undefined,
        fromCache: Boolean(data.fromCache),
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
  const status: DraftReadinessAvailability =
    featureDisabled
      ? 'disabled'
      : query.isError || Boolean(query.error)
      ? 'error'
      : readinessData
      ? 'ready'
      : isLoading || shouldFetch
      ? 'pending'
      : 'pending';

  return {
    data: readinessData,
    status,
    isLoading,
    isError: query.isError,
    error: query.error,
    featureDisabled,
    refetch: query.refetch,
  };
};
