import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { PMLevelsService } from '@/services/pmLevelsService';
import type { PMLevelInference } from '@/types/content';

export function usePMLevel() {
  const { user } = useAuth();
  const [levelData, setLevelData] = useState<PMLevelInference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const pmLevelsService = new PMLevelsService();

  const fetchLevel = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const level = await pmLevelsService.getUserLevel(user.id);
      setLevelData(level);
    } catch (err) {
      console.error('[usePMLevel] Error fetching level:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch PM level');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const recalculateLevel = useCallback(async (targetLevel?: string, roleType?: string[]) => {
    if (!user) return;

    try {
      setIsRecalculating(true);
      setError(null);
      const level = await pmLevelsService.analyzeUserLevel(
        user.id,
        targetLevel as any,
        roleType as any
      );
      setLevelData(level);
    } catch (err) {
      console.error('[usePMLevel] Error recalculating level:', err);
      setError(err instanceof Error ? err.message : 'Failed to recalculate PM level');
    } finally {
      setIsRecalculating(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLevel();
  }, [fetchLevel]);

  return {
    levelData,
    isLoading,
    error,
    isRecalculating,
    refetch: fetchLevel,
    recalculate: recalculateLevel
  };
}

