import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { PMLevelsService } from '@/services/pmLevelsService';
import { SyntheticUserService } from '@/services/syntheticUserService';
import type { PMLevelInference, PMLevelCode, RoleType } from '@/types/content';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';

export function usePMLevel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pmLevelsService = new PMLevelsService();
  const [syntheticProfileId, setSyntheticProfileId] = useState<string | undefined | null>(null); // null = not determined yet, undefined = no profile
  const [isDeterminingProfile, setIsDeterminingProfile] = useState(true);
  const profileIdRef = useRef<string | undefined | null>(null);

  // Get active synthetic profile ID
  useEffect(() => {
    const getSyntheticProfile = async () => {
      if (!user) {
        setSyntheticProfileId(undefined);
        profileIdRef.current = undefined;
        setIsDeterminingProfile(false);
        return;
      }
      
      try {
        const syntheticService = new SyntheticUserService();
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Synthetic profile check timeout')), 3000);
        });
        
        const context = await Promise.race([
          syntheticService.getSyntheticUserContext(),
          timeoutPromise
        ]) as any;
        
        const newProfileId = context?.isSyntheticTestingEnabled && context?.currentUser
          ? context.currentUser.profileId
          : undefined;
        
        setSyntheticProfileId(newProfileId);
        profileIdRef.current = newProfileId;
      } catch (error) {
        console.warn('[usePMLevel] Error getting synthetic profile (non-blocking):', error);
        // Default to undefined (no synthetic profile) on error
        setSyntheticProfileId(undefined);
        profileIdRef.current = undefined;
      } finally {
        setIsDeterminingProfile(false);
      }
    };
    
    setIsDeterminingProfile(true);
    getSyntheticProfile();
    
    // Listen for storage changes (when user switches synthetic profiles)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'synthetic_active_profile_id' && user) {
        getSyntheticProfile();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll for changes (in case storage event doesn't fire for same-window changes)
    // Check localStorage directly for changes (lighter weight than full context check)
    const pollInterval = setInterval(() => {
      if (user) {
        try {
          const stored = localStorage.getItem('synthetic_active_profile_id');
          const storedProfileId = stored || undefined;
          // Only trigger full check if localStorage value differs from current ref value
          // This prevents unnecessary API calls and avoids stale closure issues
          if (storedProfileId !== profileIdRef.current) {
            getSyntheticProfile();
          }
        } catch (e) {
          // Ignore localStorage errors
        }
      }
    }, 5000); // Check every 5 seconds (less aggressive than before)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  // Fetch user level
  // For synthetic profiles, check cache first, then run fresh analysis if needed
  // For regular users, fetch from database
  // Use a stable query key that doesn't change when syntheticProfileId goes from null to undefined
  const stableProfileId = syntheticProfileId ?? undefined; // null becomes undefined for stable key
  const {
    data: levelData,
    isLoading,
    error,
    refetch,
  } = useQuery<PMLevelInference | null, Error>({
    queryKey: ['pmLevel', user?.id, stableProfileId],
    queryFn: async () => {
      if (!user) return null;
      try {
        // If synthetic profile is active, run fresh analysis with profile filtering
        if (syntheticProfileId) {
          console.log(`[usePMLevel] Running analysis for synthetic profile ${syntheticProfileId}...`);
          const data = await pmLevelsService.analyzeUserLevel(
            user.id,
            undefined, // targetLevel
            undefined, // roleType
            undefined, // evaluationTracking
            syntheticProfileId
          );
          return data;
        }
        // Otherwise, fetch from database
        const data = await pmLevelsService.getUserLevel(user.id);
        return data;
      } catch (error) {
        console.error('Error fetching PM level:', error);
        throw error;
      }
    },
    // Wait until we've determined the synthetic profile status before running the query
    // This prevents the query key from changing mid-execution
    enabled: !!user && !isDeterminingProfile,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch when component mounts if data is fresh
    refetchOnReconnect: false, // Don't refetch on reconnect if data is fresh
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
    // Only refetch if the query key actually changes (e.g., switching synthetic profiles)
    // This prevents refetching when syntheticProfileId goes from null to undefined (same key)
    placeholderData: (previousData) => previousData, // Keep previous data while key changes
  });

  // Recalculate level mutation
  const { mutate: recalculate, isPending: isRecalculating } = useMutation({
    mutationFn: async (params?: { targetLevel?: PMLevelCode; roleType?: RoleType[] }) => {
      if (!user) throw new Error('User not authenticated');
      return await pmLevelsService.analyzeUserLevel(
        user.id,
        params?.targetLevel,
        params?.roleType,
        undefined, // evaluationTracking
        syntheticProfileId // Pass synthetic profile ID
      );
    },
    onSuccess: (data) => {
      // Update the query cache with the new data (include synthetic profile ID in key)
      queryClient.setQueryData(['pmLevel', user?.id, syntheticProfileId], data);
      // Show success toast only after analysis actually completes
      toast.success('Analysis completed successfully');
    },
    onError: (error) => {
      console.error('Error recalculating PM level:', error);
      toast.error('Failed to run analysis. Please try again.');
    },
  });

  return {
    levelData,
    isLoading: isLoading || isDeterminingProfile, // Include profile determination in loading state
    error: error || null,
    isRecalculating,
    refetch,
    recalculate: (targetLevel?: PMLevelCode, roleType?: RoleType[]) => 
      recalculate({ targetLevel, roleType }),
  };
}

