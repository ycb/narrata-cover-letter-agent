import { useState, useEffect, useRef } from 'react';
import { GapDetectionService, type GapSummaryByItem } from '@/services/gapDetectionService';
import { useAuth } from '@/contexts/AuthContext';

// Simple cache with TTL (Time To Live)
interface CacheEntry {
  data: GapSummaryByItem;
  timestamp: number;
}

// Module-level cache (shared across all hook instances)
const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 1000; // 60 seconds

export function useContentItemsWithGaps() {
  const [data, setData] = useState<GapSummaryByItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchItems = async (forceRefresh = false) => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = cache.get(user.id);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setData(cached.data);
        setIsLoading(false);
        return;
      }
    }

    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const items = await GapDetectionService.getContentItemsWithGaps(user.id);

      // Update cache
      cache.set(user.id, {
        data: items,
        timestamp: Date.now(),
      });

      setData(items);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was aborted, ignore
        return;
      }
      console.error('Error fetching content items with gaps:', err);
      setError(err instanceof Error ? err.message : 'Failed to load content items');
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    fetchItems();

    // Cleanup: abort request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user]);

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

