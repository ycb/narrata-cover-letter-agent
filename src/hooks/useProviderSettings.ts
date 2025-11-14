/**
 * React hook for managing provider settings
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ProviderService,
  type ProviderSettings,
  type ProviderType,
  type ProviderConfig,
} from '@/services/providerService';
import { toast } from 'sonner';

export function useProviderSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ProviderSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSettings();
    }
  }, [user?.id]);

  const loadSettings = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const providerSettings = await ProviderService.getProviderSettings(user.id);
      setSettings(providerSettings);
    } catch (error) {
      console.error('[useProviderSettings] Error loading settings:', error);
      toast.error('Failed to load provider settings');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (
    providerType: ProviderType,
    config: ProviderConfig,
    modelId?: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      setIsSaving(true);
      const updated = await ProviderService.saveProviderSettings(
        user.id,
        providerType,
        config,
        modelId
      );
      setSettings(updated);
      toast.success('Provider settings saved successfully');
      return true;
    } catch (error: any) {
      console.error('[useProviderSettings] Error saving settings:', error);
      toast.error(error?.message || 'Failed to save provider settings');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const revertToDefault = async (): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      setIsSaving(true);
      await ProviderService.revertToDefault(user.id);
      await loadSettings();
      toast.success('Reverted to Narrata default provider');
      return true;
    } catch (error: any) {
      console.error('[useProviderSettings] Error reverting:', error);
      toast.error(error?.message || 'Failed to revert to default');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const validateProvider = async (
    providerType: ProviderType,
    config: ProviderConfig,
    modelId?: string
  ) => {
    if (!user?.id) return { success: false, error: 'User not authenticated' };

    try {
      setIsValidating(true);
      const result = await ProviderService.validateProvider(
        providerType,
        config,
        modelId
      );
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Validation failed',
      };
    } finally {
      setIsValidating(false);
    }
  };

  return {
    settings,
    isLoading,
    isValidating,
    isSaving,
    loadSettings,
    saveSettings,
    revertToDefault,
    validateProvider,
  };
}

