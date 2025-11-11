import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { PMLevelsService } from '@/services/pmLevelsService';
import { SyntheticUserService } from '@/services/syntheticUserService';
import type { PMLevelInference, PMLevelCode, RoleType } from '@/types/content';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function usePMLevel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pmLevelsService = new PMLevelsService();
  const [syntheticProfileId, setSyntheticProfileId] = useState<string | undefined>(undefined);

  // Get active synthetic profile ID
  useEffect(() => {
    const getSyntheticProfile = async () => {
      if (!user) {
        setSyntheticProfileId(undefined);
        return;
      }
      
      try {
        const syntheticService = new SyntheticUserService();
        const context = await syntheticService.getSyntheticUserContext();
        if (context.isSyntheticTestingEnabled && context.currentUser) {
          setSyntheticProfileId(context.currentUser.profileId);
        } else {
          setSyntheticProfileId(undefined);
        }
      } catch (error) {
        console.error('[usePMLevel] Error getting synthetic profile:', error);
        setSyntheticProfileId(undefined);
      }
    };
    
    getSyntheticProfile();
    
    // Listen for storage changes (when user switches synthetic profiles)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'synthetic_active_profile_id' && user) {
        getSyntheticProfile();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also poll for changes (in case storage event doesn't fire for same-window changes)
    const interval = setInterval(() => {
      if (user) {
        getSyntheticProfile();
      }
    }, 1000); // Check every second
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user?.id]);

  // Fetch user level
  // For synthetic profiles, check cache first, then run fresh analysis if needed
  // For regular users, fetch from database
  const {
    data: levelData,
    isLoading,
    error,
    refetch,
  } = useQuery<PMLevelInference | null, Error>({
    queryKey: ['pmLevel', user?.id, syntheticProfileId],
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
    enabled: !!user,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes (formerly cacheTime)
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
    isLoading,
    error: error || null,
    isRecalculating,
    refetch,
    recalculate: (targetLevel?: PMLevelCode, roleType?: RoleType[]) => 
      recalculate({ targetLevel, roleType }),
  };
}

