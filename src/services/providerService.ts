/**
 * Provider Service
 * Manages AI provider settings for users (Narrata default or BYOM)
 * Supports OpenAI-compatible and custom providers via AI SDK abstraction
 */

import { supabase } from '@/lib/supabase';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

export type ProviderType = 'narrata_default' | 'openai_compatible' | 'custom';
export type ValidationStatus = 'pending' | 'valid' | 'invalid' | 'error';

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  modelId?: string;
}

export interface ProviderSettings {
  id: string;
  userId: string;
  providerType: ProviderType;
  providerConfig: ProviderConfig;
  modelId?: string;
  baseUrl?: string;
  validationStatus: ValidationStatus;
  validationError?: string;
  validatedAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderValidationResult {
  success: boolean;
  error?: string;
  modelId?: string;
}

export class ProviderService {
  /**
   * Get provider settings for a user
   * Returns Narrata default if no custom provider is configured
   */
  static async getProviderSettings(userId: string): Promise<ProviderSettings | null> {
    try {
      const { data, error } = await supabase
        .from('provider_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[ProviderService] Error fetching provider settings:', error);
        throw error;
      }

      if (!data) {
        // Return Narrata default settings
        return {
          id: 'narrata-default',
          userId,
          providerType: 'narrata_default',
          providerConfig: {
            apiKey: '', // Not exposed to user
          },
          validationStatus: 'valid',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      return this.mapDbToProviderSettings(data);
    } catch (error) {
      console.error('[ProviderService] Error in getProviderSettings:', error);
      throw error;
    }
  }

  /**
   * Create or update provider settings
   */
  static async saveProviderSettings(
    userId: string,
    providerType: ProviderType,
    config: ProviderConfig,
    modelId?: string
  ): Promise<ProviderSettings> {
    try {
      // Validate provider before saving
      const validation = await this.validateProvider(providerType, config, modelId);

      const settingsData = {
        user_id: userId,
        provider_type: providerType,
        provider_config: {
          apiKey: config.apiKey, // TODO: Encrypt in production
          baseUrl: config.baseUrl,
        },
        model_id: modelId || config.modelId,
        base_url: config.baseUrl,
        validation_status: validation.success ? 'valid' : 'invalid',
        validation_error: validation.error,
        validated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Check if settings exist
      const { data: existing } = await supabase
        .from('provider_settings')
        .select('id')
        .eq('user_id', userId)
        .single();

      let result;
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('provider_settings')
          .update(settingsData)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('provider_settings')
          .insert({
            ...settingsData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      return this.mapDbToProviderSettings(result);
    } catch (error) {
      console.error('[ProviderService] Error saving provider settings:', error);
      throw error;
    }
  }

  /**
   * Revert to Narrata default provider
   */
  static async revertToDefault(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_settings')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('[ProviderService] Error reverting to default:', error);
      throw error;
    }
  }

  /**
   * Validate provider credentials by making a test API call
   */
  static async validateProvider(
    providerType: ProviderType,
    config: ProviderConfig,
    modelId?: string
  ): Promise<ProviderValidationResult> {
    try {
      if (providerType === 'narrata_default') {
        return { success: true };
      }

      // For OpenAI-compatible providers
      if (providerType === 'openai_compatible' || providerType === 'custom') {
        const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        const apiKey = config.apiKey;
        const model = modelId || config.modelId || 'gpt-3.5-turbo';

        if (!apiKey) {
          return {
            success: false,
            error: 'API key is required',
          };
        }

        // Create OpenAI client with custom base URL if provided
        const client = createOpenAI({
          apiKey,
          baseURL: baseUrl,
        });

        // Make a minimal test call
        try {
          const result = await generateText({
            model: client.chat(model),
            prompt: 'test',
            maxTokens: 5,
          });

          return {
            success: true,
            modelId: model,
          };
        } catch (validationError: any) {
          return {
            success: false,
            error: validationError?.message || 'Provider validation failed',
          };
        }
      }

      return {
        success: false,
        error: 'Unsupported provider type',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Validation error',
      };
    }
  }

  /**
   * Update last used timestamp
   */
  static async updateLastUsed(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('provider_settings')
        .update({
          last_used_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error && error.code !== 'PGRST116') {
        // Ignore if no settings exist (using default)
        console.warn('[ProviderService] Could not update last_used_at:', error);
      }
    } catch (error) {
      // Non-blocking
      console.warn('[ProviderService] Error updating last_used_at:', error);
    }
  }

  /**
   * Get AI client for a user's provider settings
   * This is used by other services to get the configured provider
   */
  static async getAIClient(userId: string): Promise<{
    client: ReturnType<typeof createOpenAI>;
    modelId: string;
  }> {
    const settings = await this.getProviderSettings(userId);

    if (!settings || settings.providerType === 'narrata_default') {
      // Use Narrata's default OpenAI key
      const apiKey =
        (import.meta.env?.VITE_OPENAI_KEY) ||
        (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined) ||
        (typeof process !== 'undefined' ? process.env.OPENAI_API_KEY : undefined);

      if (!apiKey) {
        throw new Error('OpenAI API key not configured');
      }

      return {
        client: createOpenAI({ apiKey }),
        modelId: (import.meta.env?.VITE_OPENAI_MODEL) || 'gpt-3.5-turbo',
      };
    }

    // Use user's BYOM provider
    const config = settings.providerConfig;
    const baseUrl = settings.baseUrl || config.baseUrl || 'https://api.openai.com/v1';
    const modelId = settings.modelId || config.modelId || 'gpt-3.5-turbo';

    return {
      client: createOpenAI({
        apiKey: config.apiKey,
        baseURL: baseUrl,
      }),
      modelId,
    };
  }

  /**
   * Map database row to ProviderSettings interface
   */
  private static mapDbToProviderSettings(data: any): ProviderSettings {
    return {
      id: data.id,
      userId: data.user_id,
      providerType: data.provider_type,
      providerConfig: data.provider_config || {},
      modelId: data.model_id,
      baseUrl: data.base_url,
      validationStatus: data.validation_status,
      validationError: data.validation_error,
      validatedAt: data.validated_at,
      lastUsedAt: data.last_used_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

