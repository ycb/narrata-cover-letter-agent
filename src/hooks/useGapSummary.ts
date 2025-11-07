import { useState, useEffect, useRef } from 'react';
import { GapDetectionService, type GapSummary } from '@/services/gapDetectionService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Simple cache with TTL (Time To Live)
interface CacheEntry {
  data: GapSummary;
  timestamp: number;
}

// Module-level cache (shared across all hook instances)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 1000; // in-memory
const PERSIST_TTL = 15 * 60 * 1000; // 15 minutes persisted cache

export function useGapSummary() {
  const [data, setData] = useState<GapSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchGapSummary = async (forceRefresh = false, background = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    let profileId: string | null = null;
    try { profileId = localStorage.getItem('synthetic_active_profile_id'); } catch {}
    const cacheKey = profileId ? `${user.id}:${profileId}` : `${user.id}`;

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        return;
      }
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      if (!background) setIsLoading(true);
      setError(null);

      // Read current synthetic profile id (if any)
      let profileId: string | null = null;
      try { profileId = localStorage.getItem('synthetic_active_profile_id'); } catch {}
      const summary = await GapDetectionService.getGapSummary(user.id, profileId || undefined);

      // Update caches
      cache.set(cacheKey, {
        data: summary,
        timestamp: Date.now(),
      });
      try {
        const persistKey = `gapSummary:${cacheKey}`;
        localStorage.setItem(persistKey, JSON.stringify({ data: summary, timestamp: Date.now() }));
      } catch {}

      setData(summary);
      if (!background) setIsLoading(false);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Error fetching gap summary:', err);
      setError(err instanceof Error ? err.message : 'Failed to load gap summary');
    } finally {
      if (!background) setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    if (!user) return;
    let profileId: string | null = null;
    try { profileId = localStorage.getItem('synthetic_active_profile_id'); } catch {}
    const cacheKey = profileId ? `${user.id}:${profileId}` : `${user.id}`;
    // Try persisted cache first for instant paint
    try {
      const persistKey = `gapSummary:${cacheKey}`;
      const raw = localStorage.getItem(persistKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: GapSummary; timestamp: number };
        if (parsed && parsed.data && Date.now() - parsed.timestamp < PERSIST_TTL) {
          setData(parsed.data);
          // background refresh
          fetchGapSummary(false, true);
          return;
        }
      }
    } catch {}
    // Listen to gap job status and refetch on success
    const channel = supabase
      .channel(`gaps_jobs:user:${user.id}`)
      .on('broadcast', { event: 'job_status' }, (payload: any) => {
        const status = payload?.payload?.status;
        if (status === 'succeeded') {
          // Invalidate cache and force refresh
          cache.delete(cacheKey);
          fetchGapSummary(true, true);
        }
      })
      .subscribe();
    // Fallback to normal fetch
    fetchGapSummary(false, false);

    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id, ((): string | null => { try { return localStorage.getItem('synthetic_active_profile_id'); } catch { return null; } })()]);

  // When profile changes at runtime, invalidate caches and refetch
  useEffect(() => {
    if (!user) return;
    let profileId: string | null = null;
    try { profileId = localStorage.getItem('synthetic_active_profile_id'); } catch {}
    const cacheKey = profileId ? `${user.id}:${profileId}` : `${user.id}`;
    cache.delete(cacheKey);
    fetchGapSummary(true, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, ((): string | null => { try { return localStorage.getItem('synthetic_active_profile_id'); } catch { return null; } })()]);

  // Clear cache entry for this user (useful when gaps are resolved)
  const invalidateCache = () => {
    if (user) {
      cache.delete(user.id);
    }
  };

  // Refetch with optional force refresh
  const refetch = async (forceRefresh = false) => {
    await fetchGapSummary(forceRefresh);
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidateCache,
  };
}



