import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { PMLevelsService } from '@/services/pmLevelsService';
import type { PMLevelInference, PMLevelCode, RoleType } from '@/types/content';

export function usePMLevel() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const pmLevelsService = new PMLevelsService();

  // Fetch user level
  const {
    data: levelData,
    isLoading,
    error,
    refetch,
  } = useQuery<PMLevelInference | null, Error>({
    queryKey: ['pmLevel', user?.id],
    queryFn: async () => {
      if (!user) return null;
      try {
        const data = await pmLevelsService.getUserLevel(user.id);
        return data;
      } catch (error) {
        console.error('Error fetching PM level:', error);
        throw error;
      }
    },
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  // Recalculate level mutation
  const { mutate: recalculate, isPending: isRecalculating } = useMutation({
    mutationFn: async (params?: { targetLevel?: PMLevelCode; roleType?: RoleType[] }) => {
      if (!user) throw new Error('User not authenticated');
      return await pmLevelsService.analyzeUserLevel(
        user.id,
        params?.targetLevel,
        params?.roleType
      );
    },
    onSuccess: (data) => {
      // Update the query cache with the new data
      queryClient.setQueryData(['pmLevel', user?.id], data);
    },
    onError: (error) => {
      console.error('Error recalculating PM level:', error);
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

