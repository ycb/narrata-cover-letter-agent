import { useState, useEffect, useRef } from 'react';
import { GapDetectionService, type GapSummaryByItem } from '@/services/gapDetectionService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

// Simple cache with TTL (Time To Live)
interface CacheEntry {
  data: GapSummaryByItem;
  timestamp: number;
}

// Module-level cache (shared across all hook instances)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // in-memory
const PERSIST_TTL = 15 * 60 * 1000; // 15 minutes persisted cache

export function useContentItemsWithGaps() {
  const [data, setData] = useState<GapSummaryByItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchItems = async (forceRefresh = false, background = false) => {
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
        if (!background) setIsLoading(false);
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
      // Avoid over-filtering: fetch all items for user
      const items = await GapDetectionService.getContentItemsWithGaps(user.id, undefined);

      // Update caches
      cache.set(cacheKey, {
        data: items,
        timestamp: Date.now(),
      });
      try {
        const persistKey = `contentItemsWithGaps:${cacheKey}`;
        localStorage.setItem(persistKey, JSON.stringify({ data: items, timestamp: Date.now() }));
      } catch {}

      setData(items);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Error fetching content items with gaps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content items');
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
      const persistKey = `contentItemsWithGaps:${cacheKey}`;
      const raw = localStorage.getItem(persistKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: GapSummaryByItem; timestamp: number };
        if (parsed && parsed.data && Date.now() - parsed.timestamp < PERSIST_TTL) {
          setData(parsed.data);
          setIsLoading(false);
          // background refresh
          fetchItems(false, true);
          return;
        }
      }
    } catch {}
    const onGapsChanged = (event: Event) => {
      const detail = (event as CustomEvent)?.detail as { userId?: string } | undefined;
      if (detail?.userId && detail.userId !== user.id) return;
      cache.delete(cacheKey);
      try { localStorage.removeItem(`contentItemsWithGaps:${cacheKey}`); } catch {}
      fetchItems(true, true);
    };
    window.addEventListener('gaps:changed', onGapsChanged as any);

    // Fallback to normal fetch
    fetchItems(false, false);

    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      window.removeEventListener('gaps:changed', onGapsChanged as any);
    };
  }, [user?.id, ((): string | null => { try { return localStorage.getItem('synthetic_active_profile_id'); } catch { return null; } })()]);

  // Listen to gap job status and background refetch on success
  useEffect(() => {
    if (!user) return;
    let profileId: string | null = null;
    try { profileId = localStorage.getItem('synthetic_active_profile_id'); } catch {}
    const cacheKey = profileId ? `${user.id}:${profileId}` : `${user.id}`;
    const channel = supabase
      .channel(`gaps_jobs:user:${user.id}`)
      .on('broadcast', { event: 'job_status' }, (payload: any) => {
        const status = payload?.payload?.status;
        if (status === 'succeeded') {
          cache.delete(cacheKey);
          fetchItems(true, true);
        }
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user?.id, ((): string | null => { try { return localStorage.getItem('synthetic_active_profile_id'); } catch { return null; } })()]);

  // When profile changes at runtime, invalidate caches and refetch
  useEffect(() => {
    if (!user) return;
    let profileId: string | null = null;
    try { profileId = localStorage.getItem('synthetic_active_profile_id'); } catch {}
    const cacheKey = profileId ? `${user.id}:${profileId}` : `${user.id}`;
    cache.delete(cacheKey);
    try { localStorage.removeItem(`contentItemsWithGaps:${cacheKey}`); } catch {}
    fetchItems(true, false);
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
    await fetchItems(forceRefresh);
  };

  return {
    data,
    isLoading,
    error,
    refetch,
    invalidateCache,
  };
}

