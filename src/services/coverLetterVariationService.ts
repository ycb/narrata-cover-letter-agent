/**
 * Cover Letter Variation Service
 * 
 * Manages persistence of cover letter section variations to Supabase.
 * Tracks gap resolution metadata and variation provenance.
 */

import { supabase } from '@/lib/supabase';
import type { Gap } from './gapTransformService';

export interface VariationMetadata {
  gapId?: string;
  gapType?: string;
  targetSection: string;
  requirementsAddressed: string[];
  createdBy: 'user' | 'AI' | 'user-edited-AI';
  targetJobTitle?: string;
  targetCompany?: string;
  jobDescriptionId?: string;
}

export interface CoverLetterVariation {
  id: string;
  user_id: string;
  parent_entity_type: 'saved_section';
  parent_entity_id: string; // section ID from cover letter
  title: string;
  content: string;
  filled_gap_id?: string;
  gap_tags: string[];
  target_job_title?: string;
  target_company?: string;
  job_description_id?: string;
  times_used: number;
  last_used?: string;
  created_by: 'user' | 'AI' | 'user-edited-AI';
  created_at: string;
  updated_at: string;
}

export class CoverLetterVariationService {
  /**
   * Save a variation for a cover letter section
   */
  static async saveVariation(
    userId: string,
    sectionId: string,
    content: string,
    metadata: VariationMetadata
  ): Promise<CoverLetterVariation> {
    try {
      const { data, error } = await supabase
        .from('content_variations')
        .insert({
          user_id: userId,
          parent_entity_type: 'saved_section',
          parent_entity_id: sectionId,
          title: `Variation for ${metadata.targetSection}`,
          content,
          filled_gap_id: metadata.gapId || null,
          gap_tags: metadata.requirementsAddressed || [],
          target_job_title: metadata.targetJobTitle || null,
          target_company: metadata.targetCompany || null,
          job_description_id: metadata.jobDescriptionId || null,
          created_by: metadata.createdBy,
          times_used: 0,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save variation: ${error.message}`);
      }

      return data as CoverLetterVariation;
    } catch (error) {
      console.error('[CoverLetterVariationService] Error saving variation:', error);
      throw error;
    }
  }

  /**
   * Get all variations for a specific section
   */
  static async getVariationsForSection(
    userId: string,
    sectionId: string
  ): Promise<CoverLetterVariation[]> {
    try {
      const { data, error } = await supabase
        .from('content_variations')
        .select('*')
        .eq('user_id', userId)
        .eq('parent_entity_id', sectionId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch variations: ${error.message}`);
      }

      return (data || []) as CoverLetterVariation[];
    } catch (error) {
      console.error('[CoverLetterVariationService] Error fetching variations:', error);
      return [];
    }
  }

  /**
   * Get variations that address a specific gap
   */
  static async getVariationsForGap(
    userId: string,
    gapId: string
  ): Promise<CoverLetterVariation[]> {
    try {
      const { data, error } = await supabase
        .from('content_variations')
        .select('*')
        .eq('user_id', userId)
        .eq('filled_gap_id', gapId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch gap variations: ${error.message}`);
      }

      return (data || []) as CoverLetterVariation[];
    } catch (error) {
      console.error('[CoverLetterVariationService] Error fetching gap variations:', error);
      return [];
    }
  }

  /**
   * Update a variation
   */
  static async updateVariation(
    variationId: string,
    updates: {
      content?: string;
      title?: string;
      gap_tags?: string[];
      created_by?: 'user' | 'AI' | 'user-edited-AI';
    }
  ): Promise<CoverLetterVariation> {
    try {
      const { data, error } = await supabase
        .from('content_variations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variationId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update variation: ${error.message}`);
      }

      return data as CoverLetterVariation;
    } catch (error) {
      console.error('[CoverLetterVariationService] Error updating variation:', error);
      throw error;
    }
  }

  /**
   * Delete a variation
   */
  static async deleteVariation(variationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_variations')
        .delete()
        .eq('id', variationId);

      if (error) {
        throw new Error(`Failed to delete variation: ${error.message}`);
      }
    } catch (error) {
      console.error('[CoverLetterVariationService] Error deleting variation:', error);
      throw error;
    }
  }

  /**
   * Increment usage count for a variation
   */
  static async incrementUsage(variationId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc('increment_variation_usage', {
        variation_id: variationId,
      });

      if (error) {
        // Fallback if RPC doesn't exist
        const { data: current } = await supabase
          .from('content_variations')
          .select('times_used')
          .eq('id', variationId)
          .single();

        if (current) {
          await supabase
            .from('content_variations')
            .update({
              times_used: (current.times_used || 0) + 1,
              last_used: new Date().toISOString(),
            })
            .eq('id', variationId);
        }
      }
    } catch (error) {
      console.error('[CoverLetterVariationService] Error incrementing usage:', error);
    }
  }

  /**
   * Get variation statistics
   */
  static async getVariationStats(userId: string): Promise<{
    total: number;
    byGap: number;
    byJob: number;
    mostUsed: CoverLetterVariation[];
  }> {
    try {
      const { data: all, error } = await supabase
        .from('content_variations')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to fetch variation stats: ${error.message}`);
      }

      const variations = (all || []) as CoverLetterVariation[];

      // Sort by usage
      const mostUsed = [...variations]
        .sort((a, b) => b.times_used - a.times_used)
        .slice(0, 5);

      return {
        total: variations.length,
        byGap: variations.filter(v => v.filled_gap_id).length,
        byJob: variations.filter(v => v.job_description_id).length,
        mostUsed,
      };
    } catch (error) {
      console.error('[CoverLetterVariationService] Error fetching variation stats:', error);
      return {
        total: 0,
        byGap: 0,
        byJob: 0,
        mostUsed: [],
      };
    }
  }

  /**
   * Mark a gap as resolved by a variation
   */
  static async linkVariationToGap(
    variationId: string,
    gapId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('content_variations')
        .update({
          filled_gap_id: gapId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variationId);

      if (error) {
        throw new Error(`Failed to link variation to gap: ${error.message}`);
      }
    } catch (error) {
      console.error('[CoverLetterVariationService] Error linking variation to gap:', error);
      throw error;
    }
  }
}

