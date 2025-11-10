/**
 * Tag Service
 * Handles persistence of tags to database for companies, work items, and saved sections
 */

import { supabase } from '@/lib/supabase';

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

