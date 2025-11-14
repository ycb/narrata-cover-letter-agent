import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { PMLevelsService } from '@/services/pmLevelsService';
import { SyntheticUserService } from '@/services/syntheticUserService';
import type { PMLevelInference, PMLevelCode, RoleType } from '@/types/content';
import { toast } from 'sonner';

interface PMLevelEventDetail {
  userId: string;
  syntheticProfileId?: string;
  reason?: string;
  error?: string;
}

export function usePMLevel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pmLevelsService = new PMLevelsService();
  const [syntheticProfileId, setSyntheticProfileId] = useState<string | undefined | null>(null);
  const [isDeterminingProfile, setIsDeterminingProfile] = useState(true);
  const profileIdRef = useRef<string | undefined | null>(null);
  const [isBackgroundAnalyzing, setIsBackgroundAnalyzing] = useState(false);
  const [backgroundError, setBackgroundError] = useState<string | null>(null);

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

        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Synthetic profile check timeout')), 3000);
        });

        const context = (await Promise.race([
          syntheticService.getSyntheticUserContext(),
          timeoutPromise,
        ])) as any;

        const newProfileId =
          context?.isSyntheticTestingEnabled && context?.currentUser
            ? context.currentUser.profileId
            : undefined;

        setSyntheticProfileId(newProfileId);
        profileIdRef.current = newProfileId;
      } catch (err) {
        console.warn('[usePMLevel] Error getting synthetic profile (non-blocking):', err);
        setSyntheticProfileId(undefined);
        profileIdRef.current = undefined;
      } finally {
        setIsDeterminingProfile(false);
      }
    };

    setIsDeterminingProfile(true);
    getSyntheticProfile();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'synthetic_active_profile_id' && user) {
        getSyntheticProfile();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    const pollInterval = setInterval(() => {
      if (!user) return;
      try {
        const stored = localStorage.getItem('synthetic_active_profile_id');
        const storedProfileId = stored || undefined;
        if (storedProfileId !== profileIdRef.current) {
          getSyntheticProfile();
        }
      } catch {
        // ignore
      }
    }, 5000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(pollInterval);
    };
  }, [user?.id]);

  const stableProfileId = syntheticProfileId ?? undefined;

  const {
    data: levelData,
    isLoading,
    error,
    refetch,
  } = useQuery<PMLevelInference | null, Error>({
    queryKey: ['pmLevel', user?.id, stableProfileId],
    enabled: !!user && !isDeterminingProfile,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      if (!user) return null;
      try {
        if (syntheticProfileId) {
          return await pmLevelsService.analyzeUserLevel(
            user.id,
            undefined,
            undefined,
            {
              sessionId: `pm-level-ui-${Date.now()}-${syntheticProfileId}`,
              triggerReason: 'initial-load',
              syntheticProfileId,
            },
            syntheticProfileId,
          );
        }

        return await pmLevelsService.getUserLevel(user.id);
      } catch (err) {
        console.error('Error fetching PM level:', err);
        throw err;
      }
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !user) {
      return;
    }

    const matchesDetail = (detail: PMLevelEventDetail | undefined) => {
      if (!detail) return false;
      const eventProfileId = detail.syntheticProfileId ?? undefined;
      return detail.userId === user.id && eventProfileId === stableProfileId;
    };

    const handleScheduled = (event: Event) => {
      const customEvent = event as CustomEvent<PMLevelEventDetail>;
      if (!matchesDetail(customEvent.detail)) return;

      setIsBackgroundAnalyzing(true);
      setBackgroundError(null);

      if (customEvent.detail?.reason) {
        console.log('[usePMLevel] Background analysis scheduled:', customEvent.detail.reason);
      }
    };

    const handleUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<PMLevelEventDetail>;
      if (!matchesDetail(customEvent.detail)) return;

      setIsBackgroundAnalyzing(false);
      setBackgroundError(null);

      queryClient.invalidateQueries({
        queryKey: ['pmLevel', user.id, stableProfileId],
      });

      if (!isDeterminingProfile) {
        refetch();
      }
    };

    const handleError = (event: Event) => {
      const customEvent = event as CustomEvent<PMLevelEventDetail>;
      if (!matchesDetail(customEvent.detail)) return;

      setIsBackgroundAnalyzing(false);
      setBackgroundError(customEvent.detail?.error || 'Analysis failed. Please try again.');
    };

    window.addEventListener('pm-levels:scheduled', handleScheduled as EventListener);
    window.addEventListener('pm-levels:updated', handleUpdated as EventListener);
    window.addEventListener('pm-levels:error', handleError as EventListener);

    return () => {
      window.removeEventListener('pm-levels:scheduled', handleScheduled as EventListener);
      window.removeEventListener('pm-levels:updated', handleUpdated as EventListener);
      window.removeEventListener('pm-levels:error', handleError as EventListener);
    };
  }, [user?.id, stableProfileId, queryClient, refetch, isDeterminingProfile]);

  const { mutate: recalculate, isPending: isRecalculating } = useMutation({
    mutationFn: async (params?: { targetLevel?: PMLevelCode; roleType?: RoleType[] }) => {
      if (!user) throw new Error('User not authenticated');
      return pmLevelsService.analyzeUserLevel(
        user.id,
        params?.targetLevel,
        params?.roleType,
        {
          sessionId: `pm-level-recalc-${Date.now()}${syntheticProfileId ? `-${syntheticProfileId}` : ''}`,
          triggerReason: 'manual-recalc',
          syntheticProfileId,
        },
        syntheticProfileId,
      );
    },
    onMutate: () => {
      setIsBackgroundAnalyzing(true);
      setBackgroundError(null);

      if (user && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<PMLevelEventDetail>('pm-levels:scheduled', {
            detail: {
              userId: user.id,
              syntheticProfileId: syntheticProfileId ?? undefined,
              reason: 'User initiated manual recalc',
            },
          }),
        );
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['pmLevel', user?.id, syntheticProfileId], data);
      toast.success('Analysis completed successfully');
      setIsBackgroundAnalyzing(false);
      setBackgroundError(null);

      if (user && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<PMLevelEventDetail>('pm-levels:updated', {
            detail: {
              userId: user.id,
              syntheticProfileId: syntheticProfileId ?? undefined,
              reason: 'Manual recalc complete',
            },
          }),
        );
      }
    },
    onError: (err) => {
      console.error('Error recalculating PM level:', err);
      toast.error('Failed to run analysis. Please try again.');
      setIsBackgroundAnalyzing(false);
      setBackgroundError(err instanceof Error ? err.message : 'Failed to run analysis');

      if (user && typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<PMLevelEventDetail>('pm-levels:error', {
            detail: {
              userId: user.id,
              syntheticProfileId: syntheticProfileId ?? undefined,
              error: err instanceof Error ? err.message : String(err),
              reason: 'Manual recalc failed',
            },
          }),
        );
      }
    },
  });

  useEffect(() => {
    if (levelData && !isRecalculating) {
      setIsBackgroundAnalyzing(false);
      setBackgroundError(null);
    }
  }, [levelData, isRecalculating]);

  return {
    levelData,
    isLoading: isLoading || isDeterminingProfile,
    error: error || null,
    isRecalculating,
    refetch,
    recalculate: (targetLevel?: PMLevelCode, roleType?: RoleType[]) => recalculate({ targetLevel, roleType }),
    isBackgroundAnalyzing,
    backgroundError,
    activeProfileId: stableProfileId,
  };
}
