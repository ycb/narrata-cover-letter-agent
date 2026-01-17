/**
 * React hook for managing personal data assets
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  PersonalDataService,
  type PersonalDataAsset,
  type SourceType,
  type DeleteAssetResult,
} from '@/services/personalDataService';
import { toast } from 'sonner';

export function usePersonalData() {
  const { user, refreshOnboardingStatus } = useAuth();
  const [assets, setAssets] = useState<PersonalDataAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadAssets();
    }
  }, [user?.id]);

  const loadAssets = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await PersonalDataService.getAssets(user.id);
      setAssets(data);
    } catch (error) {
      console.error('[usePersonalData] Error loading assets:', error);
      toast.error('Failed to load personal data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAssetsByType = async (sourceType: SourceType): Promise<PersonalDataAsset[]> => {
    if (!user?.id) return [];

    try {
      return await PersonalDataService.getAssetsByType(user.id, sourceType);
    } catch (error) {
      console.error('[usePersonalData] Error loading assets by type:', error);
      return [];
    }
  };

  const deleteAsset = async (assetId: string): Promise<DeleteAssetResult> => {
    if (!user?.id) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsDeleting(true);
      const result = await PersonalDataService.deleteAsset(assetId, user.id);
      
      if (result.success) {
        await loadAssets();
        await refreshOnboardingStatus();
        toast.success('Asset deleted successfully');
      } else {
        toast.error(result.error || 'Failed to delete asset');
      }

      return result;
    } catch (error: any) {
      const errorResult = {
        success: false,
        error: error?.message || 'Failed to delete asset',
      };
      toast.error(errorResult.error);
      return errorResult;
    } finally {
      setIsDeleting(false);
    }
  };

  const downloadAsset = async (assetId: string): Promise<Blob | null> => {
    if (!user?.id) return null;

    try {
      return await PersonalDataService.downloadAsset(assetId, user.id);
    } catch (error) {
      console.error('[usePersonalData] Error downloading asset:', error);
      toast.error('Failed to download asset');
      return null;
    }
  };

  const checkDependencies = async (
    assetId: string,
    sourceType: SourceType
  ) => {
    if (!user?.id) {
      return {
        workHistory: false,
        coverLetterTemplates: false,
        savedSections: false,
      };
    }

    return await PersonalDataService.checkDependencies(assetId, user.id, sourceType);
  };

  return {
    assets,
    isLoading,
    isDeleting,
    loadAssets,
    getAssetsByType,
    deleteAsset,
    downloadAsset,
    checkDependencies,
  };
}
