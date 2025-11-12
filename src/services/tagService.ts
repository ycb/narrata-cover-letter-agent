/**
 * Tag Service
 * Handles persistence of tags to database for companies, work items, and saved sections
 */

import { supabase } from '@/lib/supabase';
import { schedulePMLevelBackgroundRun } from './pmLevelsService';

const getActiveSyntheticProfileId = () => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  try {
    const profileId = window.localStorage.getItem('synthetic_active_profile_id');
    return profileId || undefined;
  } catch (error) {
    console.warn('[TagService] Failed to read synthetic profile id:', error);
    return undefined;
  }
};

const triggerPMLevelRefresh = (userId: string, reason: string) => {
  schedulePMLevelBackgroundRun({
    userId,
    syntheticProfileId: getActiveSyntheticProfileId(),
    delayMs: 2500,
    reason,
    triggerReason: 'content-update',
  });
};

export class TagService {
  /**
   * Update company tags
   */
  static async updateCompanyTags(
    companyId: string,
    tags: string[],
    userId: string
  ): Promise<void> {
    // Deduplicate and normalize tags
    const normalizedTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];

    const { error } = await supabase
      .from('companies')
      .update({
        tags: normalizedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update company tags: ${error.message}`);
    }

    triggerPMLevelRefresh(userId, 'Company tags updated');
  }

  /**
   * Update work item (role) tags
   */
  static async updateWorkItemTags(
    workItemId: string,
    tags: string[],
    userId: string
  ): Promise<void> {
    const normalizedTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];

    const { error } = await supabase
      .from('work_items')
      .update({
        tags: normalizedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', workItemId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update work item tags: ${error.message}`);
    }

    triggerPMLevelRefresh(userId, 'Work item tags updated');
  }

  /**
   * Update saved section tags
   */
  static async updateSavedSectionTags(
    sectionId: string,
    tags: string[],
    userId: string
  ): Promise<void> {
    const normalizedTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];

    const { error } = await supabase
      .from('saved_sections')
      .update({
        tags: normalizedTags,
        updated_at: new Date().toISOString()
      })
      .eq('id', sectionId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to update saved section tags: ${error.message}`);
    }
  }
}

