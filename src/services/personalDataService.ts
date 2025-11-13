/**
 * Personal Data Service
 * Manages user's personal data assets (resume, cover letters)
 * Handles soft delete with 30-day retention
 */

import { supabase } from '@/lib/supabase';
import { syntheticStorage } from '@/utils/storage';
import { SyntheticUserService } from './syntheticUserService';

export type SourceType = 'resume' | 'cover_letter';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface PersonalDataAsset {
  id: string;
  userId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  sourceType: SourceType;
  processingStatus: ProcessingStatus;
  storagePath: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  isDeleted: boolean;
}

export interface DeleteAssetResult {
  success: boolean;
  error?: string;
  dependencies?: {
    workHistory: boolean;
    coverLetterTemplates: boolean;
    savedSections: boolean;
  };
}

export class PersonalDataService {
  /**
   * Get active synthetic profile ID if synthetic mode is enabled
   */
  private static async getActiveSyntheticProfileId(userId: string): Promise<string | null> {
    try {
      const syntheticService = new SyntheticUserService();
      const context = await syntheticService.getSyntheticUserContext();
      
      if (context.isSyntheticTestingEnabled && context.currentUser) {
        return context.currentUser.profileId;
      }
      
      return null;
    } catch (error) {
      console.warn('[PersonalDataService] Error checking synthetic mode:', error);
      return null;
    }
  }

  /**
   * Get all personal data assets for a user (excluding soft-deleted)
   * Filters by synthetic profile if synthetic mode is enabled
   */
  static async getAssets(userId: string): Promise<PersonalDataAsset[]> {
    try {
      // Check if synthetic mode is enabled and get active profile
      const activeProfileId = await this.getActiveSyntheticProfileId(userId);
      
      // Build query
      let query = supabase
        .from('sources')
        .select('*')
        .eq('user_id', userId)
        .in('source_type', ['resume', 'cover_letter'])
        .order('created_at', { ascending: false });

      // If synthetic mode enabled, filter by active profile (file names start with profile ID)
      if (activeProfileId) {
        query = query.like('file_name', `${activeProfileId}_%`);
      }

      // Try to filter by is_deleted if column exists
      // If column doesn't exist, the query will still work without the filter
      const { data, error } = await query;

      if (error) {
        // If error is about missing column, retry without is_deleted filter
        if (error.message?.includes('is_deleted') || error.code === '42703') {
          let retryQuery = supabase
            .from('sources')
            .select('*')
            .eq('user_id', userId)
            .in('source_type', ['resume', 'cover_letter'])
            .order('created_at', { ascending: false });

          // Apply synthetic profile filter if enabled
          if (activeProfileId) {
            retryQuery = retryQuery.like('file_name', `${activeProfileId}_%`);
          }

          const { data: retryData, error: retryError } = await retryQuery;

          if (retryError) {
            console.error('[PersonalDataService] Error fetching assets:', retryError);
            throw retryError;
          }

          return (retryData || []).map(this.mapDbToAsset);
        }

        console.error('[PersonalDataService] Error fetching assets:', error);
        throw error;
      }

      // Filter out soft-deleted items if is_deleted column exists
      const filteredData = (data || []).filter((item: any) => {
        // If is_deleted column exists and is true, exclude it
        return item.is_deleted === undefined || item.is_deleted === false;
      });

      return filteredData.map(this.mapDbToAsset);
    } catch (error) {
      console.error('[PersonalDataService] Error in getAssets:', error);
      throw error;
    }
  }

  /**
   * Get assets by type (resume or cover_letter)
   */
  static async getAssetsByType(
    userId: string,
    sourceType: SourceType
  ): Promise<PersonalDataAsset[]> {
    try {
      // Check if synthetic mode is enabled and get active profile
      const activeProfileId = await this.getActiveSyntheticProfileId(userId);
      
      // Build query
      let query = supabase
        .from('sources')
        .select('*')
        .eq('user_id', userId)
        .eq('source_type', sourceType)
        .order('created_at', { ascending: false });

      // If synthetic mode enabled, filter by active profile (file names start with profile ID)
      if (activeProfileId) {
        query = query.like('file_name', `${activeProfileId}_%`);
      }

      const { data, error } = await query;

      if (error) {
        // If error is about missing column, retry without is_deleted filter
        if (error.message?.includes('is_deleted') || error.code === '42703') {
          let retryQuery = supabase
            .from('sources')
            .select('*')
            .eq('user_id', userId)
            .eq('source_type', sourceType)
            .order('created_at', { ascending: false });

          // Apply synthetic profile filter if enabled
          if (activeProfileId) {
            retryQuery = retryQuery.like('file_name', `${activeProfileId}_%`);
          }

          const { data: retryData, error: retryError } = await retryQuery;

          if (retryError) {
            console.error('[PersonalDataService] Error fetching assets by type:', retryError);
            throw retryError;
          }

          return (retryData || []).map(this.mapDbToAsset);
        }

        console.error('[PersonalDataService] Error fetching assets by type:', error);
        throw error;
      }

      // Filter out soft-deleted items if is_deleted column exists
      const filteredData = (data || []).filter((item: any) => {
        return item.is_deleted === undefined || item.is_deleted === false;
      });

      return filteredData.map(this.mapDbToAsset);
    } catch (error) {
      console.error('[PersonalDataService] Error in getAssetsByType:', error);
      throw error;
    }
  }

  /**
   * Get a single asset by ID
   */
  static async getAsset(assetId: string, userId: string): Promise<PersonalDataAsset | null> {
    try {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('id', assetId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('[PersonalDataService] Error fetching asset:', error);
        throw error;
      }

      return this.mapDbToAsset(data);
    } catch (error) {
      console.error('[PersonalDataService] Error in getAsset:', error);
      throw error;
    }
  }

  /**
   * Check dependencies before deletion
   */
  static async checkDependencies(
    assetId: string,
    userId: string,
    sourceType: SourceType
  ): Promise<DeleteAssetResult['dependencies']> {
    try {
      const dependencies = {
        workHistory: false,
        coverLetterTemplates: false,
        savedSections: false,
      };

      if (sourceType === 'resume') {
        // Check if work history references this source
        const { data: workItems } = await supabase
          .from('work_items')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (workItems && workItems.length > 0) {
          dependencies.workHistory = true;
        }
      }

      if (sourceType === 'cover_letter') {
        // Check if cover letter templates reference this source
        const { data: templates } = await supabase
          .from('cover_letter_templates')
          .select('id')
          .eq('user_id', userId)
          .limit(1);

        if (templates && templates.length > 0) {
          dependencies.coverLetterTemplates = true;
        }

        // Check if saved sections reference this source
        const { data: savedSections } = await supabase
          .from('saved_sections')
          .select('id')
          .eq('user_id', userId)
          .eq('source_file_id', assetId)
          .limit(1);

        if (savedSections && savedSections.length > 0) {
          dependencies.savedSections = true;
        }
      }

      return dependencies;
    } catch (error) {
      console.error('[PersonalDataService] Error checking dependencies:', error);
      // Return safe defaults on error
      return {
        workHistory: false,
        coverLetterTemplates: false,
        savedSections: false,
      };
    }
  }

  /**
   * Soft delete an asset (30-day retention)
   */
  static async deleteAsset(
    assetId: string,
    userId: string
  ): Promise<DeleteAssetResult> {
    try {
      // Verify asset exists and belongs to user
      const asset = await this.getAsset(assetId, userId);
      if (!asset) {
        return {
          success: false,
          error: 'Asset not found',
        };
      }

      // Check dependencies
      const dependencies = await this.checkDependencies(
        assetId,
        userId,
        asset.sourceType
      );

      // Soft delete the asset
      const { error } = await supabase
        .from('sources')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', assetId)
        .eq('user_id', userId);

      if (error) {
        console.error('[PersonalDataService] Error deleting asset:', error);
        throw error;
      }

      return {
        success: true,
        dependencies,
      };
    } catch (error: any) {
      console.error('[PersonalDataService] Error in deleteAsset:', error);
      return {
        success: false,
        error: error?.message || 'Failed to delete asset',
      };
    }
  }

  /**
   * Download asset file from storage
   */
  static async downloadAsset(assetId: string, userId: string): Promise<Blob | null> {
    try {
      const asset = await this.getAsset(assetId, userId);
      if (!asset || asset.isDeleted) {
        return null;
      }

      const { data, error } = await supabase.storage
        .from('user-files')
        .download(asset.storagePath);

      if (error) {
        console.error('[PersonalDataService] Error downloading asset:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('[PersonalDataService] Error in downloadAsset:', error);
      return null;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format date for display
   */
  static formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  /**
   * Map database row to PersonalDataAsset interface
   */
  private static mapDbToAsset(data: any): PersonalDataAsset {
    return {
      id: data.id,
      userId: data.user_id,
      fileName: data.file_name,
      fileType: data.file_type,
      fileSize: data.file_size,
      sourceType: data.source_type,
      processingStatus: data.processing_status,
      storagePath: data.storage_path,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
      isDeleted: data.is_deleted || false,
    };
  }
}

