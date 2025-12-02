/**
 * Tag Inheritance Service
 * 
 * Implements tag inheritance strategy where child entities (stories, roles)
 * inherit tags from parent entities (companies) automatically.
 * 
 * Principle: Companies have industry/business model tags. Roles and stories
 * should NOT duplicate these tags. Instead, we concatenate tags when displaying
 * or searching.
 * 
 * Tag Hierarchy:
 * - Company: Industry, business model, company stage
 * - Role (Work Item): Competencies, function, level, role-specific skills
 * - Story (Approved Content): Story-specific themes, demonstrated skills
 * 
 * Example:
 * Company: ["B2B", "SaaS", "Fintech"]
 * Role: ["product-management", "growth", "startup"]  // NO company tags
 * Story: ["onboarding", "activation"]  // NO company OR role tags
 * 
 * Display: ["B2B", "SaaS", "Fintech", "product-management", "growth", "startup", "onboarding", "activation"]
 */

import { supabase } from '@/lib/supabase';

export interface TaggedEntity {
  id: string;
  tags: string[];
  company_id?: string;
  work_item_id?: string;
}

export interface CompanyTags {
  id: string;
  tags: string[];
}

export interface WorkItemTags {
  id: string;
  tags: string[];
  company_id: string;
}

export interface StoryTags {
  id: string;
  tags: string[];
  work_item_id: string;
}

export class TagInheritanceService {
  /**
   * Get all tags for a story, including inherited company and role tags
   * @param storyId - Story (approved_content) ID
   * @param userId - User ID for security
   * @returns All tags: company + role + story
   */
  static async getFullStoryTags(storyId: string, userId: string): Promise<string[]> {
    const { data: story, error: storyError } = await supabase
      .from('stories')
      .select('tags, work_item_id, work_item:work_items!work_item_id(tags, company_id, company:companies!company_id(tags))')
      .eq('id', storyId)
      .eq('user_id', userId)
      .single();

    if (storyError || !story) {
      console.error('[TagInheritance] Error loading story tags:', storyError);
      return [];
    }

    const storyTags = story.tags || [];
    const roleTags = (story as any).work_item?.tags || [];
    const companyTags = (story as any).work_item?.company?.tags || [];

    return this.mergeTags([companyTags, roleTags, storyTags]);
  }

  /**
   * Get all tags for a work item (role), including inherited company tags
   * @param workItemId - Work item ID
   * @param userId - User ID for security
   * @returns All tags: company + role
   */
  static async getFullWorkItemTags(workItemId: string, userId: string): Promise<string[]> {
    const { data: workItem, error: workItemError } = await supabase
      .from('work_items')
      .select('tags, company_id, company:companies!company_id(tags)')
      .eq('id', workItemId)
      .eq('user_id', userId)
      .single();

    if (workItemError || !workItem) {
      console.error('[TagInheritance] Error loading work item tags:', workItemError);
      return [];
    }

    const roleTags = workItem.tags || [];
    const companyTags = (workItem as any).company?.tags || [];

    return this.mergeTags([companyTags, roleTags]);
  }

  /**
   * Get company tags for a given company ID
   * @param companyId - Company ID
   * @param userId - User ID for security
   * @returns Company tags
   */
  static async getCompanyTags(companyId: string, userId: string): Promise<string[]> {
    const { data: company, error } = await supabase
      .from('companies')
      .select('tags')
      .eq('id', companyId)
      .eq('user_id', userId)
      .single();

    if (error || !company) {
      console.error('[TagInheritance] Error loading company tags:', error);
      return [];
    }

    return company.tags || [];
  }

  /**
   * Merge tag arrays and deduplicate
   * Preserves order: company tags first, then role, then story
   * @param tagArrays - Arrays of tags to merge
   * @returns Merged and deduplicated tags
   */
  private static mergeTags(tagArrays: string[][]): string[] {
    const merged: string[] = [];
    const seen = new Set<string>();

    for (const tagArray of tagArrays) {
      for (const tag of tagArray) {
        const normalized = tag.trim().toLowerCase();
        if (!seen.has(normalized) && tag.trim().length > 0) {
          seen.add(normalized);
          merged.push(tag.trim());
        }
      }
    }

    return merged;
  }

  /**
   * Extract company-level tags from a given list of tags
   * Company-level tags are: industry, business model, company stage
   * @param tags - List of tags to filter
   * @returns Company-level tags only
   */
  static extractCompanyTags(tags: string[]): string[] {
    const companyTagPatterns = [
      // Industries
      /fintech/i,
      /healthcare/i,
      /saas/i,
      /edtech/i,
      /cleantech/i,
      /ecommerce/i,
      /e-commerce/i,
      /gaming/i,
      /media/i,
      /real[\s-]?estate/i,
      /transportation/i,
      /food/i,
      /retail/i,
      /manufacturing/i,
      /consulting/i,
      /banking/i,
      /insurance/i,
      /government/i,
      /non[\s-]?profit/i,
      /telecommunications/i,
      /energy/i,
      /agriculture/i,
      /travel/i,
      /hospitality/i,
      /sports/i,
      /fitness/i,
      /beauty/i,
      /fashion/i,
      /automotive/i,
      /aerospace/i,
      /defense/i,
      /legal/i,
      /marketing/i,
      /advertising/i,
      // Business Models
      /b2b/i,
      /b2c/i,
      /marketplace/i,
      /platform/i,
      /developer[\s-]?tools/i,
      /enterprise/i,
      /consumer/i,
      /subscription/i,
      /freemium/i,
      /api[\s-]?first/i,
      /open[\s-]?source/i,
      /agency/i,
      /content/i,
      /hardware/i,
      /iot/i,
      /blockchain/i,
      /crypto/i,
      // Company Stage
      /startup/i,
      /seed/i,
      /series[\s-]?[a-z]/i,
      /growth[\s-]?stage/i,
      /late[\s-]?stage/i,
      /public/i,
      /fortune[\s-]?\d+/i,
      /unicorn/i,
    ];

    return tags.filter(tag =>
      companyTagPatterns.some(pattern => pattern.test(tag))
    );
  }

  /**
   * Remove company-level tags from a list of tags
   * Used when tagging roles/stories to avoid duplication
   * @param tags - List of tags to filter
   * @returns Non-company tags only
   */
  static removeCompanyTags(tags: string[]): string[] {
    const companyTags = this.extractCompanyTags(tags);
    const companyTagsLower = new Set(companyTags.map(t => t.toLowerCase()));
    
    return tags.filter(tag => !companyTagsLower.has(tag.toLowerCase()));
  }

  /**
   * Build context string for content tagging prompts
   * Includes company tags to help LLM avoid duplication
   * @param companyTags - Company tags
   * @param roleTags - Role tags (optional, for story tagging)
   * @returns Context string for prompts
   */
  static buildTaggingContext(companyTags: string[], roleTags?: string[]): string {
    const parts: string[] = [];

    if (companyTags.length > 0) {
      parts.push(`Company context (DO NOT duplicate these tags): ${companyTags.join(', ')}`);
    }

    if (roleTags && roleTags.length > 0) {
      parts.push(`Role context (DO NOT duplicate these tags): ${roleTags.join(', ')}`);
    }

    return parts.join('\n');
  }

  /**
   * Auto-tag company with industry and business model tags based on user goals
   * @param companyId - Company ID
   * @param userId - User ID
   * @param userGoals - User goals containing industries and business models
   * @returns Updated company tags
   */
  static async autoTagCompanyFromGoals(
    companyId: string,
    userId: string,
    userGoals: { industries?: string[]; businessModels?: string[] }
  ): Promise<string[]> {
    // Get existing company tags
    const existingTags = await this.getCompanyTags(companyId, userId);

    // Extract company-level tags from goals
    const industryTags = userGoals.industries || [];
    const businessModelTags = userGoals.businessModels || [];

    // Merge with existing tags (deduplicate)
    const allTags = this.mergeTags([existingTags, industryTags, businessModelTags]);

    // Update company tags
    const { error } = await supabase
      .from('companies')
      .update({ tags: allTags, updated_at: new Date().toISOString() })
      .eq('id', companyId)
      .eq('user_id', userId);

    if (error) {
      console.error('[TagInheritance] Error auto-tagging company:', error);
      return existingTags;
    }

    console.log(`[TagInheritance] Auto-tagged company ${companyId} with: ${industryTags.concat(businessModelTags).join(', ')}`);
    return allTags;
  }
}

