/**
 * Gap Detection Service
 * Phase 3: Gap Detection Service Implementation
 * 
 * Detects three types of gaps:
 * 1. Story Completeness - Missing STAR format or metrics
 * 2. Missing Metrics - Stories without quantified metrics
 * 3. Generic Content - LLM-as-judge for "too generic" descriptions
 * 
 * Future Enhancement: Context-Aware Gap Tracking
 * - See docs/implementation/GAP_DETECTION_CONTEXT_TRACKING.md
 * - Will add context_hash to track detection context (target role, goals, etc.)
 * - Allows same content to be flagged again when context changes
 */

import { supabase } from '@/lib/supabase';
import { EvalsLogger } from './evalsLogger';
import { UserPreferencesService } from './userPreferencesService';
import type { PMLevelInference } from '@/types/content';

interface ContentQualityProgressDetail {
  stage: string;
  message?: string;
  progress?: number;
  tone?: 'info' | 'success' | 'warning' | 'error';
}

const emitContentQualityProgress = (detail: ContentQualityProgressDetail) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new CustomEvent('content-quality:progress', { detail }));
};

export interface Gap {
  id?: string;
  user_id: string;
  entity_type: 'work_item' | 'approved_content' | 'saved_section';
  entity_id: string;
  gap_type: 'data_quality' | 'best_practice' | 'role_expectation';
  gap_category: string;
  severity: 'high' | 'medium' | 'low';
  description?: string;
  suggestions?: any[];
  resolved?: boolean;
  resolved_at?: string;
  resolved_reason?: 'user_override' | 'content_added' | 'manual_resolve' | 'no_longer_applicable';
  addressing_content_ids?: string[];
}

export interface StoryCompletenessGap {
  storyId: string;
  storyTitle: string;
  hasSTAR: boolean;
  hasMetrics: boolean;
  hasAccomplishedFormat: boolean;
  missingComponents: string[];
}

export interface MetricGap {
  storyId: string;
  storyTitle: string;
  hasMetrics: boolean;
  metricCount: number;
}

function extractMetricText(metric: unknown): string {
  if (typeof metric === 'string') return metric;
  if (!metric || typeof metric !== 'object') return '';
  const value = (metric as any).value;
  const context = (metric as any).context;
  if (typeof value === 'string' && typeof context === 'string') return `${value} ${context}`.trim();
  if (typeof value === 'string') return value.trim();
  return '';
}

function countNonEmptyMetrics(metrics: unknown[]): number {
  return (metrics || []).map(extractMetricText).filter((text) => text.trim().length > 0).length;
}

function hasQuantifiedMetricInText(content: string): boolean {
  const text = (content || '').trim();
  if (!text) return false;
  // Prefer "metric-like" patterns over just any digit to avoid counting things like "5 pods" as a metric.
  const patterns: RegExp[] = [
    /\$\s*\d[\d,]*(\.\d+)?\s*(k|m|b|mm|bn)?/i, // $120k, $1.2M
    /\b\d+(\.\d+)?\s*%/i, // 20%
    /\b\d+(\.\d+)?\s*x\b/i, // 10x
    /\b\d[\d,]*(\.\d+)?\s*(k|m|b)\b/i, // 120k, 2.5m
    /\b(million|billion)\b/i,
    /\b(arr|mrr|dau|mau|wau|nps)\b/i,
    /\b\d[\d,]*\s*(users?|customers?|accounts?|leads?|signups?|installs?|downloads?)\b/i,
    /\b\d+(\.\d+)?\s*(days?|weeks?|months?|quarters?|years?)\b/i,
  ];
  return patterns.some((p) => p.test(text));
}

function storyHasMetrics(content: string, metrics: unknown[]): boolean {
  return countNonEmptyMetrics(metrics || []) > 0 || hasQuantifiedMetricInText(content || '');
}

export interface GenericContentGap {
  entityId: string;
  entityType: 'work_item' | 'approved_content';
  content: string;
  isGeneric: boolean;
  reasoning?: string;
  confidence?: number;
}

export interface ContentStandardsResult {
  needsSpecifics: boolean;
  reasoning?: string;
  confidence?: number;
}

/**
 * Gap Summary Interface
 * Aggregated view of gaps by content type and severity
 */
export interface GapSummary {
  total: number;
  byContentType: {
    stories: number;
    savedSections: number;
    roleDescriptions: number;
    outcomeMetrics: number;
    coverLetterSections: number;
  };
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
  // Detailed breakdown for ranked list
  bySeverityAndType: {
    high: {
      stories: number;
      savedSections: number;
      roleDescriptions: number;
      outcomeMetrics: number;
      coverLetterSections: number;
    };
    medium: {
      stories: number;
      savedSections: number;
      roleDescriptions: number;
      outcomeMetrics: number;
      coverLetterSections: number;
    };
    low: {
      stories: number;
      savedSections: number;
      roleDescriptions: number;
      outcomeMetrics: number;
      coverLetterSections: number;
    };
  };
}

export interface ContentItemWithGaps {
  // Content identification
  entity_id: string;
  entity_type: 'approved_content' | 'work_item' | 'saved_section';
  
  // Content metadata
  display_title: string; // Formatted title: "PM @ Acme: Role Summary" or "Cover Letter - Introduction"
  role_title?: string; // For work items: "PM"
  company_name?: string; // For work items: "Acme"
  item_type?: 'role_summary' | 'role_metrics' | 'story' | 'cover_letter_section';
  story_title?: string; // For story items: "Improved Sales Messaging"
  section_title?: string; // For saved sections: "Introduction"
  preview_text?: string; // Short content preview for role summary/metrics
  
  // Gap information
  max_severity: 'high' | 'medium' | 'low'; // Highest severity gap (used for tab filtering)
  gap_categories: string[]; // List of gap categories for this item
  
  // Navigation
  content_type_label: 'Work History' | 'Cover Letter Saved Sections';
  navigation_path: string; // Route to this item's detail view
  navigation_params: Record<string, string>; // Query params (storyId, roleId, sectionId, etc.)
}

export interface GapSummaryByItem {
  total: number;
  byContentType: {
    workHistory: ContentItemWithGaps[];
    coverLetterSavedSections: ContentItemWithGaps[];
  };
}

export class GapDetectionService {
  private static readonly TAG_METADATA_GAP_CATEGORIES = new Set([
    'missing_tags',
    'tag_industry_misalignment',
    'tag_business_model_misalignment',
  ]);
  static storyHasMetrics(params: { content: string; metrics: unknown[] }): boolean {
    return storyHasMetrics(params.content, params.metrics);
  }

  static storyMeetsSpecificity(content: string): boolean {
    return !this.checkContentStandards(content || '').needsSpecifics;
  }

  /**
   * Re-analyze all gaps for a user when goals/target titles change
   * 
   * TODO: Implement when PM Levels feature is integrated
   * 
   * This method depends on:
   * 1. PMLevelsService to map target job titles to PM level codes (L3-L6, M1-M2)
   * 2. Updated gap detection prompts that consider target level requirements
   * 3. Role expectation gap detection based on level-specific expectations
   * 
   * Implementation plan:
   * - Use PMLevelsService.getLevelFromJobTitle() to map target titles to levels
   * - Pass target level to gap detection methods
   * - Update detectRoleDescriptionGaps() to check against level expectations
   * - Update detectStoryGaps() to assess story quality against target level
   * - Broadcast job status via Supabase realtime channel
   * 
   * @param userId - User ID to re-analyze gaps for
   * @param accessToken - Optional access token for authenticated requests
   */
  static async reanalyzeAllUserGaps(userId: string, accessToken?: string): Promise<void> {
    console.log('[GapDetectionService] Gap re-analysis stub - will be implemented with PM Levels integration');
    // TODO: Implement when PM Levels Service is available
    // This will:
    // 1. Get target job titles from UserPreferencesService
    // 2. Map titles to PM levels using PMLevelsService
    // 3. Re-run gap detection on all content with target level context
    // 4. Update role expectation gaps based on level requirements
    // 5. Broadcast job status updates
  }

  /**
   * Detect gaps by comparing Job Description (JD) against user goals and profile
   * 
   * TODO: Implement in cover letter draft phase
   * 
   * This method will be used when drafting cover letters to identify:
   * - Missing qualifications (JD requirements not in user profile)
   * - Goal mismatches (JD doesn't align with user preferences)
   * - Skill gaps (JD skills not demonstrated in user content)
   * - Level mismatches (JD level vs user's current/target level)
   * 
   * Dependencies:
   * 1. Job Description parsing/extraction service
   * 2. User goals from UserPreferencesService
   * 3. User profile content (work history, skills, stories)
   * 4. PM Levels Service for level comparison
   * 
   * Implementation plan:
   * - Parse JD to extract: required skills, experience level, responsibilities, qualifications
   * - Compare JD requirements against user profile content
   * - Compare JD level against user's current PM level (from PMLevelsService)
   * - Compare JD details against user goals (salary, work type, company maturity, etc.)
   * - Generate gap categories:
   *   * 'missing_qualification' - JD requirement not found in profile
   *   * 'skill_gap' - JD skill not demonstrated in stories/work history
   *   * 'level_mismatch' - JD level higher/lower than user's level
   *   * 'goal_mismatch' - JD doesn't align with user preferences
   * - Return actionable gaps with suggestions for cover letter customization
   * 
   * @param userId - User ID
   * @param jobDescription - Full text of the job description
   * @param accessToken - Optional access token for authenticated requests
   * @returns Array of gaps comparing JD against user profile/goals
   */
  static async detectJDGaps(
    userId: string,
    jobDescription: string,
    accessToken?: string
  ): Promise<Gap[]> {
    console.log('[GapDetectionService] JD gap detection stub - will be implemented in cover letter draft phase');
    // TODO: Implement when cover letter draft feature is ready
    // This will:
    // 1. Parse JD to extract requirements, skills, level, responsibilities
    // 2. Load user goals from UserPreferencesService
    // 3. Load user profile content (work history, skills, stories)
    // 4. Get user's current PM level from PMLevelsService
    // 5. Compare JD against profile and goals
    // 6. Generate gap categories with actionable suggestions
    // 7. Return gaps for cover letter customization guidance
    return [];
  }

  /**
   * Detect all gaps for a work item
   */
  static async detectWorkItemGaps(
    userId: string,
    workItemId: string,
    workItemData: {
      title: string;
      description?: string;
      metrics?: any[];
      startDate?: string;
      endDate?: string | null;
      tags?: string[];
    },
    stories?: Array<{
      id: string;
      title: string;
      content: string;
      metrics?: any[];
    }>,
    userGoals?: {
      industries?: string[];
      businessModels?: string[];
    }
  ): Promise<Gap[]> {
    const gaps: Gap[] = [];

    // 1. Detect tag misalignment gaps (if user goals provided)
    if (userGoals && (userGoals.industries?.length > 0 || userGoals.businessModels?.length > 0)) {
      const tagGaps = this.detectTagMisalignmentGaps(
        userId,
        workItemId,
        'work_item',
        workItemData.tags || [],
        userGoals
      );
      gaps.push(...tagGaps);
    }

    // 2. Detect role-level description gaps
    const roleDescriptionGaps = await this.detectRoleDescriptionGaps(
      userId,
      workItemId,
      workItemData.description || '',
      workItemData.title
    );
    gaps.push(...roleDescriptionGaps);

    // 2. Detect role-level metrics gaps
    const outcomeMetricsGaps = this.detectRoleMetricsGaps(
      userId,
      workItemId,
      workItemData.metrics || [],
      workItemData.startDate,
      workItemData.endDate,
      stories?.length || 0
    );
    gaps.push(...outcomeMetricsGaps);

    // 3. Detect gaps in stories (if any)
    if (stories && stories.length > 0) {
      for (const story of stories) {
        const storyGaps = await this.detectStoryGaps(userId, story, workItemId);
        gaps.push(...storyGaps);
      }
    }
    return gaps;
  }

  /**
   * Sync PM Level expectation gaps for work history and stories
   * Creates or resolves gaps based on PM Level analysis results
   */
  static async syncPmLevelExpectationGaps(
    userId: string,
    inference: PMLevelInference | null,
    accessToken?: string
  ): Promise<void> {
    if (!userId) return;

    const stories = inference?.levelEvidence?.storyEvidence?.stories || [];

    if (!stories || stories.length === 0) {
      await this.resolveAllPmLevelGaps(userId, accessToken);
      return;
    }

    const currentLevelLabel =
      inference?.levelEvidence?.currentLevel ||
      inference?.displayLevel ||
      inference?.inferredLevel ||
      'your current level';

    const storyIdsAll = stories.map(story => story.id).filter(Boolean) as string[];
    const storyIdsBelow = stories
      .filter(story => story.levelAssessment === 'below')
      .map(story => story.id)
      .filter(Boolean) as string[];

    const workItemIdsAll = Array.from(
      new Set(
        stories
          .map(story => story.workItemId)
          .filter((id): id is string => Boolean(id))
      )
    );

    const workItemBelowMap = new Map<string, typeof stories>();
    for (const story of stories) {
      if (story.levelAssessment !== 'below' || !story.workItemId) continue;
      const existing = workItemBelowMap.get(story.workItemId) || [];
      existing.push(story);
      workItemBelowMap.set(story.workItemId, existing);
    }

    const workItemIdsBelow = Array.from(workItemBelowMap.keys());

    // Resolve story-level gaps that are no longer below expectations
    const storiesToResolve = storyIdsAll.filter(id => !storyIdsBelow.includes(id));
    if (storiesToResolve.length > 0) {
      await this.resolvePmLevelGaps(
        userId,
        'approved_content',
        storiesToResolve,
        'pm_level_expectation_story',
        accessToken
      );
    }

    // Resolve work-item-level gaps that now meet expectations
    const workItemsToResolve = workItemIdsAll.filter(id => !workItemIdsBelow.includes(id));
    if (workItemsToResolve.length > 0) {
      await this.resolvePmLevelGaps(
        userId,
        'work_item',
        workItemsToResolve,
        'pm_level_expectation_work_item',
        accessToken
      );
    }

    if (storyIdsBelow.length === 0 && workItemIdsBelow.length === 0) {
      return;
    }

    const gaps: Gap[] = [];

    for (const story of stories) {
      if (story.levelAssessment !== 'below' || !story.id) continue;
      gaps.push({
        user_id: userId,
        entity_type: 'approved_content',
        entity_id: story.id,
        gap_type: 'role_expectation',
        gap_category: 'pm_level_expectation_story',
        severity: 'medium',
        description: `This story is below expectations for ${currentLevelLabel}.`,
        suggestions: [
          {
            type: 'pm_level_alignment',
            description: 'Expand scope, quantify impact, or highlight higher-level leadership to align with your current level.',
          }
        ],
      });
    }

    for (const [workItemId, storiesForRole] of workItemBelowMap.entries()) {
      if (!workItemId) continue;
      const uniqueTitles = Array.from(
        new Set(storiesForRole.map(story => story.title).filter(Boolean))
      );
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItemId,
        gap_type: 'role_expectation',
        gap_category: 'pm_level_expectation_work_item',
        severity: 'medium',
        description: `Some stories for this role fall below expectations for ${currentLevelLabel}.`,
        suggestions: [
          {
            type: 'pm_level_alignment',
            description: uniqueTitles.length > 0
              ? `Strengthen these stories: ${uniqueTitles.slice(0, 3).join(', ')}${uniqueTitles.length > 3 ? '…' : ''}`
              : 'Strengthen associated stories to showcase higher-scope impact.',
          }
        ],
        addressing_content_ids: storiesForRole
          .map(story => story.id)
          .filter(Boolean),
      });
    }

    if (gaps.length > 0) {
      await this.saveGaps(gaps, accessToken);
    }
  }

  private static async resolvePmLevelGaps(
    userId: string,
    entityType: 'work_item' | 'approved_content',
    entityIds: string[],
    category: 'pm_level_expectation_story' | 'pm_level_expectation_work_item',
    accessToken?: string
  ): Promise<void> {
    if (!userId || entityIds.length === 0) return;

    try {
      const dbClient = accessToken
        ? await this.getAuthenticatedClient(accessToken)
        : supabase;

      await dbClient
        .from('gaps')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_reason: 'content_added',
        })
        .eq('user_id', userId)
        .eq('entity_type', entityType)
        .eq('gap_category', category)
        .in('entity_id', entityIds);
    } catch (error) {
      console.error('[GapDetectionService] Failed to resolve PM level gaps:', error);
    }
  }

  private static async resolveAllPmLevelGaps(userId: string, accessToken?: string): Promise<void> {
    if (!userId) return;

    try {
      const dbClient = accessToken
        ? await this.getAuthenticatedClient(accessToken)
        : supabase;

      const { data, error } = await dbClient
        .from('gaps')
        .select('entity_id, entity_type, gap_category')
        .eq('user_id', userId)
        .in('gap_category', ['pm_level_expectation_story', 'pm_level_expectation_work_item']);

      if (error || !data || data.length === 0) return;

      const storyIds = data
        .filter((gap: any) => gap.gap_category === 'pm_level_expectation_story' && gap.entity_type === 'approved_content')
        .map((gap: any) => gap.entity_id);

      const workItemIds = data
        .filter((gap: any) => gap.gap_category === 'pm_level_expectation_work_item' && gap.entity_type === 'work_item')
        .map((gap: any) => gap.entity_id);

      if (storyIds.length > 0) {
        await this.resolvePmLevelGaps(userId, 'approved_content', storyIds, 'pm_level_expectation_story', accessToken);
      }

      if (workItemIds.length > 0) {
        await this.resolvePmLevelGaps(userId, 'work_item', workItemIds, 'pm_level_expectation_work_item', accessToken);
      }
    } catch (error) {
      console.error('[GapDetectionService] Failed to resolve all PM level gaps:', error);
    }
  }

  /**
   * Return unresolved gaps for a user, optionally filtered by synthetic profile ID (e.g., P00).
   * When profileId is provided, filters gaps to entities originating from sources whose file_name
   * starts with the profile prefix (supports separators: _, -, space, .).
   */
  static async getUserGaps(userId: string, profileId?: string, accessToken?: string): Promise<Gap[]> {
    try {
      const db = accessToken ? await this.getAuthenticatedClient(accessToken) : supabase;
      emitContentQualityProgress({
        stage: 'initialize',
        progress: 0.05,
        message: profileId
          ? `Resolving content quality for profile ${profileId.toUpperCase()}...`
          : 'Resolving content quality context...'
      });
      const { data: gaps, error } = await db
        .from('gaps')
        .select('*')
        .eq('user_id', userId)
        .or('resolved.is.null,resolved.eq.false');

      if (error || !gaps) return [];
      if (!profileId) return gaps as Gap[];

      const pid = profileId.toUpperCase();
      // Find this profile's sources first (prefix matches: Pxx_ | Pxx- | Pxx. | Pxx<space>)
      const { data: profileSources } = await db
        .from('sources')
        .select('id, file_name')
        .eq('user_id', userId)
        .or(
          `file_name.ilike.${pid}_%,` +
          `file_name.ilike.${pid}-%,` +
          `file_name.ilike.${pid}.%,` +
          `file_name.ilike.${pid} %`
        );

      const profileSourceIds = new Set<string>((profileSources || []).map((s: any) => s.id));

      // Preload work_items, approved_content, and saved_sections ids associated with this profile's sources
      let workItemIdsBySource = new Set<string>();
      let storyIdsBySource = new Set<string>();
      let savedSectionIdsBySource = new Set<string>();

      if (profileSourceIds.size > 0) {
        const sourceIdList = Array.from(profileSourceIds);
        const { data: wi } = await db
          .from('work_items')
          .select('id')
          .eq('user_id', userId)
          .in('source_id', sourceIdList);
        workItemIdsBySource = new Set((wi || []).map((r: any) => r.id));

        const { data: acBySource } = await db
          .from('stories')
          .select('id')
          .eq('user_id', userId)
          .in('source_id', sourceIdList);
        storyIdsBySource = new Set((acBySource || []).map((r: any) => r.id));

        // Also include stories whose work_item_id belongs to a profile work item
        if (workItemIdsBySource.size > 0) {
          const workItemIdList = Array.from(workItemIdsBySource);
          const { data: acByWi } = await db
            .from('stories')
            .select('id')
            .eq('user_id', userId)
            .in('work_item_id', workItemIdList);
          (acByWi || []).forEach((r: any) => storyIdsBySource.add(r.id));
        }

        // Get saved_sections for this profile's sources
        const { data: ssBySource } = await db
          .from('saved_sections')
          .select('id')
          .eq('user_id', userId)
          .in('source_id', sourceIdList);
        savedSectionIdsBySource = new Set((ssBySource || []).map((r: any) => r.id));
      }

      // Filter gaps by whether their entity belongs to this profile
      const filtered: Gap[] = [];
      for (const g of gaps as Gap[]) {
        if (g.entity_type === 'work_item') {
          if (workItemIdsBySource.has(g.entity_id)) filtered.push(g);
        } else if (g.entity_type === 'approved_content') {
          if (storyIdsBySource.has(g.entity_id)) filtered.push(g);
        } else if (g.entity_type === 'saved_section') {
          // Filter saved sections by source_id (they're linked via source, not direct profile_id)
          if (savedSectionIdsBySource.has(g.entity_id)) filtered.push(g);
        }
      }

      return filtered;
    } catch (e) {
      console.error('[GapDetectionService.getUserGaps] Error:', e);
      return [];
    }
  }

  /**
   * Detect gaps in role-level metrics
   * Flags missing or insufficient metrics at the role level
   */
  private static detectRoleMetricsGaps(
    userId: string,
    workItemId: string,
    outcomeMetrics: any[],
    startDate?: string,
    endDate?: string | null,
    storyCount: number = 0
  ): Gap[] {
    const gaps: Gap[] = [];

    // Count valid metrics (supports legacy string[] and JSON metrics[{value, context, ...}])
    const metricCount = countNonEmptyMetrics(outcomeMetrics || []);

    // Check for missing metrics
    if (metricCount === 0) {
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItemId,
        gap_type: 'best_practice',
        gap_category: 'missing_role_metrics',
        severity: 'medium',
        description: 'No role-level metrics',
        suggestions: [
          {
            type: 'add_role_metrics',
            description: 'Add quantified metrics at the role level to demonstrate overall impact'
          }
        ]
      });
    } else if (metricCount < 3 && (storyCount > 0 || this.hasSignificantTenure(startDate, endDate))) {
      // Check for insufficient metrics
      // Flag if role has stories or significant tenure but only 1-2 metrics
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItemId,
        gap_type: 'best_practice',
        gap_category: 'insufficient_role_metrics',
        severity: 'low',
        description: 'Less than 3 role-level metrics',
        suggestions: [
          {
            type: 'add_more_role_metrics',
            description: `Consider adding more metrics to capture full impact (currently ${metricCount})`
          }
        ]
      });
    }

    return gaps;
  }

  /**
   * Resolve role-level metrics gaps when the underlying metrics now satisfy the requirement.
   * This is a heuristic (non-LLM) sync to prevent stale gaps from persisting after edits.
   */
  static async resolveSatisfiedRoleMetricsGaps(params: {
    userId: string;
    workItemId: string;
    metrics: unknown[];
  }): Promise<void> {
    const metricCount = countNonEmptyMetrics(params.metrics || []);

    try {
      const { data, error } = await supabase
        .from('gaps')
        .select('id, gap_category')
        .eq('user_id', params.userId)
        .eq('entity_type', 'work_item')
        .eq('entity_id', params.workItemId)
        .in('gap_category', ['missing_role_metrics', 'insufficient_role_metrics'])
        .or('resolved.is.null,resolved.eq.false');

      if (error) throw error;
      const gaps = (data || []) as Array<{ id: string; gap_category: string }>;

      const shouldResolveCategory = (category: string) => {
        if (category === 'missing_role_metrics') return metricCount > 0;
        if (category === 'insufficient_role_metrics') return metricCount >= 3;
        return false;
      };

      for (const gap of gaps) {
        if (!gap?.id) continue;
        if (!shouldResolveCategory(gap.gap_category)) continue;
        await this.resolveGap(gap.id, params.userId, 'no_longer_applicable');
      }
    } catch (e) {
      console.error('[GapDetectionService.resolveSatisfiedRoleMetricsGaps] Error:', e);
    }
  }

  /**
   * Determine if a role has significant tenure (>= 1 year or current role)
   */
  private static hasSignificantTenure(startDate?: string, endDate?: string | null): boolean {
    if (!startDate) return false;
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(); // Use current date if role is current
    const tenureMonths = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return tenureMonths >= 12; // 1 year or more
  }

  /**
   * Detect tag misalignment gaps
   * Compares tags against user goals (industries and business models)
   * Creates gaps when tags don't align with user preferences
   */
  static detectTagMisalignmentGaps(
    userId: string,
    entityId: string,
    entityType: 'work_item' | 'company' | 'saved_section',
    tags: string[],
    userGoals: {
      industries?: string[];
      businessModels?: string[];
    }
  ): Gap[] {
    // Beta UX: Treat tag gaps as metadata-only and do not surface them as "content gaps".
    // Tag suggestions remain available, but gap detection should prioritize writing quality.
    return [];

    const gaps: Gap[] = [];

    if (!tags || tags.length === 0) {
      // No tags at all - suggest adding tags
      gaps.push({
        user_id: userId,
        entity_type: entityType === 'company' ? 'work_item' : entityType,
        entity_id: entityId,
        gap_type: 'data_quality',
        gap_category: 'missing_tags',
        severity: 'medium',
        description: 'No tags found. Add tags to help match your experience to opportunities.',
        suggestions: [
          {
            type: 'add_tags',
            description: 'Use the tag suggestion feature to add relevant tags'
          }
        ]
      });
      return gaps;
    }

    // Normalize tags and goals for comparison
    const normalizedTags = tags.map(t => t.toLowerCase().trim());
    const userIndustries = (userGoals.industries || []).map(i => i.toLowerCase().trim());
    const userBusinessModels = (userGoals.businessModels || []).map(b => b.toLowerCase().trim());

    // Check for industry alignment
    const hasIndustryMatch = userIndustries.some(industry => 
      normalizedTags.some(tag => 
        tag.includes(industry) || industry.includes(tag) ||
        this.areSemanticallySimilar(tag, industry)
      )
    );

    // Check for business model alignment
    const hasBusinessModelMatch = userBusinessModels.some(model => 
      normalizedTags.some(tag => 
        tag.includes(model) || model.includes(tag) ||
        this.areSemanticallySimilar(tag, model)
      )
    );

    // Create gaps for misalignment
    if (userIndustries.length > 0 && !hasIndustryMatch) {
      gaps.push({
        user_id: userId,
        entity_type: entityType === 'company' ? 'work_item' : entityType,
        entity_id: entityId,
        gap_type: 'role_expectation',
        gap_category: 'tag_industry_misalignment',
        severity: 'medium',
        description: `Tags don't align with your target industries (${userGoals.industries?.join(', ')}). Consider adding industry-relevant tags.`,
        suggestions: [
          {
            type: 'update_tags',
            description: `Add tags related to: ${userGoals.industries?.join(', ')}`,
            targetIndustries: userGoals.industries
          }
        ]
      });
    }

    if (userBusinessModels.length > 0 && !hasBusinessModelMatch) {
      gaps.push({
        user_id: userId,
        entity_type: entityType === 'company' ? 'work_item' : entityType,
        entity_id: entityId,
        gap_type: 'role_expectation',
        gap_category: 'tag_business_model_misalignment',
        severity: 'medium',
        description: `Tags don't align with your target business models (${userGoals.businessModels?.join(', ')}). Consider adding business model-relevant tags.`,
        suggestions: [
          {
            type: 'update_tags',
            description: `Add tags related to: ${userGoals.businessModels?.join(', ')}`,
            targetBusinessModels: userGoals.businessModels
          }
        ]
      });
    }

    return gaps;
  }

  /**
   * Simple semantic similarity check
   * Checks if two strings are semantically related (e.g., "fintech" and "financial technology")
   */
  private static areSemanticallySimilar(tag: string, goal: string): boolean {
    // Common semantic mappings
    const mappings: Record<string, string[]> = {
      'fintech': ['financial', 'finance', 'banking', 'fintech'],
      'saas': ['software', 'saas', 'cloud', 'platform'],
      'b2b': ['enterprise', 'b2b', 'business-to-business'],
      'b2c': ['consumer', 'b2c', 'retail', 'ecommerce'],
      'healthcare': ['health', 'medical', 'healthcare', 'pharma'],
      'ecommerce': ['ecommerce', 'e-commerce', 'retail', 'online'],
    };

    // Check direct mappings
    for (const [key, values] of Object.entries(mappings)) {
      if (tag.includes(key) || goal.includes(key)) {
        const other = tag.includes(key) ? goal : tag;
        if (values.some(v => other.includes(v))) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Re-analyze tag misalignment gaps when user goals change
   * Checks all work items, companies, and saved sections for tag misalignment
   */
  static async reanalyzeTagMisalignmentGaps(
    userId: string,
    userGoals: {
      industries?: string[];
      businessModels?: string[];
    }
  ): Promise<void> {
    try {
      console.log('[GapDetectionService] Re-analyzing tag misalignment gaps...');

      // 1. Get all work items with tags
      const { data: workItems, error: workItemsError } = await supabase
        .from('work_items')
        .select('id, tags')
        .eq('user_id', userId);

      if (workItemsError) {
        console.error('Error fetching work items:', workItemsError);
        return;
      }

      // 2. Get all companies with tags
      const { data: companies, error: companiesError } = await supabase
        .from('companies')
        .select('id, tags')
        .eq('user_id', userId);

      if (companiesError) {
        console.error('Error fetching companies:', companiesError);
        return;
      }

      // 3. Get all saved sections with tags
      const { data: savedSections, error: savedSectionsError } = await supabase
        .from('saved_sections')
        .select('id, tags')
        .eq('user_id', userId);

      if (savedSectionsError) {
        console.error('Error fetching saved sections:', savedSectionsError);
        return;
      }

      // 4. Detect gaps for each entity
      const allGaps: Gap[] = [];

      // Work items
      for (const workItem of workItems || []) {
        const gaps = this.detectTagMisalignmentGaps(
          userId,
          workItem.id,
          'work_item',
          workItem.tags || [],
          userGoals
        );
        allGaps.push(...gaps);
      }

      // Companies (map to work_item entity type for gaps table)
      for (const company of companies || []) {
        const gaps = this.detectTagMisalignmentGaps(
          userId,
          company.id,
          'company',
          company.tags || [],
          userGoals
        );
        allGaps.push(...gaps);
      }

      // Saved sections
      for (const section of savedSections || []) {
        const gaps = this.detectTagMisalignmentGaps(
          userId,
          section.id,
          'saved_section',
          section.tags || [],
          userGoals
        );
        allGaps.push(...gaps);
      }

      // 5. Resolve existing tag misalignment gaps before saving new ones
      // This prevents duplicate gaps when goals change
      const { data: existingGaps } = await supabase
        .from('gaps')
        .select('id')
        .eq('user_id', userId)
        .in('gap_category', ['missing_tags', 'tag_industry_misalignment', 'tag_business_model_misalignment'])
        .eq('resolved', false);

      if (existingGaps && existingGaps.length > 0) {
        await supabase
          .from('gaps')
          .update({
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_reason: 'no_longer_applicable'
          })
          .in('id', existingGaps.map(g => g.id));
      }

      // 6. Save new gaps
      if (allGaps.length > 0) {
        await this.saveGaps(allGaps);
        console.log(`[GapDetectionService] Created ${allGaps.length} tag misalignment gap(s)`);
      } else {
        console.log('[GapDetectionService] No tag misalignment gaps found');
      }
    } catch (error) {
      console.error('[GapDetectionService] Error re-analyzing tag misalignment gaps:', error);
      throw error;
    }
  }

  /**
   * Detect gaps in role-level description
   * Flags missing or generic descriptions
   */
  private static async detectRoleDescriptionGaps(
    userId: string,
    workItemId: string,
    description: string,
    roleTitle: string
  ): Promise<Gap[]> {
    const gaps: Gap[] = [];

    // 1. Check for missing description
    if (!description || description.trim().length === 0) {
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItemId,
        gap_type: 'data_quality',
        gap_category: 'missing_role_description',
        severity: 'high',
        description: 'Missing role description',
        suggestions: [
          {
            type: 'add_description',
            description: 'Add a description of your role and key responsibilities'
          }
        ]
      });
      return gaps; // No need to check generic if description is missing
    }

    // 2. Content standards check (MVP heuristic)
    const standards = this.checkContentStandards(description);
    if (standards.needsSpecifics) {
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItemId,
        gap_type: 'best_practice',
        gap_category: 'role_description_needs_specifics',
        severity: standards.confidence && standards.confidence > 0.8 ? 'high' : 'medium',
        description: 'Needs more specific details and impact',
        suggestions: [
          {
            type: 'add_specifics',
            description: 'Add specific projects, technologies, or measurable outcomes'
          }
        ]
      });
    }

    return gaps;
  }

  /**
   * Detect gaps for a cover letter section
   * Evaluates best practices for intro, body, closing, and signature sections
   */
  static async detectCoverLetterSectionGaps(
    userId: string,
    section: {
      id: string;
      type: 'intro' | 'paragraph' | 'closer' | 'signature';
      content: string;
      title?: string;
    },
    jobRequirements?: string[]
  ): Promise<Gap[]> {
    const gaps: Gap[] = [];

    // Content standards check (MVP heuristic)
    const standards = this.checkContentStandards(section.content);
    if (standards.needsSpecifics) {
      gaps.push({
        user_id: userId,
        entity_type: 'saved_section', // Cover letter sections are saved sections
        entity_id: section.id,
        gap_type: 'best_practice',
        gap_category: 'saved_section_needs_specifics',
        severity: standards.confidence && standards.confidence > 0.8 ? 'high' : 'medium',
        description: 'Section needs more specific, personalized content',
        suggestions: [
          {
            type: 'add_specifics',
            description: 'Add specific details about the company, role, or your qualifications'
          }
        ]
      });
    }

    // Section-specific checks
    if (section.type === 'intro') {
      // Intro should have compelling hook and company research
      const hasCompanyMention = /\[Company\]|company|organization|your team/i.test(section.content);
      const hasRoleMention = /\[Position\]|role|position|opportunity/i.test(section.content);
      
      if (!hasCompanyMention || !hasRoleMention) {
        gaps.push({
          user_id: userId,
          entity_type: 'saved_section',
          entity_id: section.id,
          gap_type: 'best_practice',
          gap_category: 'incomplete_intro',
          severity: 'medium',
          description: 'Introduction should mention the company and role specifically',
          suggestions: [
            {
              type: 'add_specifics',
              description: 'Add specific company name and role title to personalize the introduction'
            }
          ]
        });
      }
    } else if (section.type === 'paragraph' || section.type === 'closer') {
      // Body/closing should use STAR format and address job requirements
      const completenessGap = this.checkStoryCompleteness({
        id: section.id,
        title: section.title || section.type,
        content: section.content,
        metrics: [] // Cover letter sections don't have separate metrics
      });

      if (completenessGap && completenessGap.missingComponents.includes('narrative structure (STAR format or Accomplished format)')) {
        gaps.push({
          user_id: userId,
          entity_type: 'saved_section',
          entity_id: section.id,
          gap_type: 'best_practice',
          gap_category: 'incomplete_cover_letter_section',
          severity: 'high',
          description: 'Section should use STAR format to demonstrate impact',
          suggestions: this.generateCompletenessSuggestions(completenessGap)
        });
      }

      // Closing should not require metrics; only body paragraphs get this check
      if (section.type === 'paragraph') {
        const hasMetrics = /\d+%|\d+\$|\d+\s*(users|customers|revenue|growth|increase|decrease|improved|reduced)/i.test(section.content);
        if (!hasMetrics) {
          gaps.push({
            user_id: userId,
            entity_type: 'saved_section',
            entity_id: section.id,
            gap_type: 'best_practice',
            gap_category: 'missing_metrics_cover_letter',
            severity: 'medium',
            description: 'Section would benefit from quantifiable achievements',
            suggestions: [
              {
                type: 'add_metric',
                description: 'Add specific metrics, percentages, or quantifiable results'
              }
            ]
          });
        }
      }
    } else if (section.type === 'signature') {
      // Signature should have contact info
      const hasContactInfo = /\[Your Name\]|\[Your Email\]|\[Your Phone\]|email|phone|contact/i.test(section.content);
      
      if (!hasContactInfo) {
        gaps.push({
          user_id: userId,
          entity_type: 'saved_section',
          entity_id: section.id,
          gap_type: 'best_practice',
          gap_category: 'incomplete_signature',
          severity: 'low',
          description: 'Signature should include contact information',
          suggestions: [
            {
              type: 'add_contact',
              description: 'Add contact information (name, email, phone, LinkedIn)'
            }
          ]
        });
      }
    }

    return gaps;
  }

  /**
   * Detect gaps for a single story (approved_content)
   */
  static async detectStoryGaps(
    userId: string,
    story: {
      id: string;
      title: string;
      content: string;
      metrics?: any[];
    },
    workItemId?: string
  ): Promise<Gap[]> {
    const gaps: Gap[] = [];

    // 1. Story Completeness Gap - create separate gaps for each missing component
    const completenessGap = this.checkStoryCompleteness(story);
    if (completenessGap) {
      // Create separate gap for missing narrative structure
      if (completenessGap.missingComponents.includes('narrative structure (STAR format or Accomplished format)')) {
        gaps.push({
          user_id: userId,
          entity_type: 'approved_content',
          entity_id: story.id,
          gap_type: 'data_quality',
          gap_category: 'incomplete_story',
          severity: 'high',
          description: 'Missing narrative structure (STAR)',
          suggestions: this.generateCompletenessSuggestions(completenessGap)
        });
      }
      
      // Create separate gap for missing metrics (only if not already covered by completeness)
      if (completenessGap.missingComponents.includes('metric')) {
        gaps.push({
          user_id: userId,
          entity_type: 'approved_content',
          entity_id: story.id,
          gap_type: 'best_practice',
          gap_category: 'missing_metrics',
          severity: 'medium',
          description: 'No quantified metrics',
          suggestions: [
            {
              type: 'add_metric',
              description: 'Add quantified metrics (percentages, dollar amounts, timeframes, etc.)'
            }
          ]
        });
      }
    }

    // 2. Missing Metrics Gap - only create if not already detected by completeness check
    if (!completenessGap || !completenessGap.missingComponents.includes('metric')) {
      const metricGap = this.checkMissingMetrics(story);
      if (metricGap) {
        gaps.push({
          user_id: userId,
          entity_type: 'approved_content',
          entity_id: story.id,
          gap_type: 'best_practice',
          gap_category: 'missing_metrics',
          severity: 'medium',
          description: 'No quantified metrics',
          suggestions: [
            {
              type: 'add_metric',
              description: 'Add quantified metrics (percentages, dollar amounts, timeframes, etc.)'
            }
          ]
        });
      }
    }

    // 3. Content standards gap (MVP heuristic)
    const standards = this.checkContentStandards(story.content);
    if (standards.needsSpecifics) {
      gaps.push({
        user_id: userId,
        entity_type: 'approved_content',
        entity_id: story.id,
        gap_type: 'best_practice',
        gap_category: 'story_needs_specifics',
        severity: standards.confidence && standards.confidence > 0.8 ? 'high' : 'medium',
        description: 'Needs more specific details and outcomes',
        suggestions: [
          {
            type: 'add_specifics',
            description: 'Add specific technologies, processes, or measurable outcomes'
          }
        ]
      });
    }

    return gaps;
  }

  /**
   * Check story completeness (STAR format or "Accomplished [X] as measured by [Y], by doing [Z]")
   */
  private static checkStoryCompleteness(story: {
    id?: string;
    title: string;
    content: string;
    metrics?: any[];
  }): StoryCompletenessGap | null {
    const content = story.content.toLowerCase();
    const hasMetrics = storyHasMetrics(story.content, story.metrics || []);

    // Check for STAR format indicators
    const hasSituation = /(situation|context|challenge|problem|opportunity)/i.test(content);
    const hasTask = /(task|goal|objective|mission|purpose)/i.test(content);
    const hasAction = /(action|implemented|developed|created|built|designed|launched)/i.test(content);
    const hasResult = /(result|outcome|impact|improved|increased|decreased|achieved)/i.test(content);
    
    const hasSTAR = hasSituation && hasTask && hasAction && hasResult;

    // Check for "Accomplished [X] as measured by [Y], by doing [Z]" format
    const accomplishedPattern = /accomplished\s+[^,]+\s+as\s+measured\s+by\s+[^,]+\s*,\s*by\s+doing/i;
    const hasAccomplishedFormat = accomplishedPattern.test(content);

    // Determine missing components
    const missingComponents: string[] = [];
    
    if (!hasMetrics) {
      missingComponents.push('metric');
    }

    if (!hasSTAR && !hasAccomplishedFormat) {
      missingComponents.push('narrative structure (STAR format or Accomplished format)');
    }

    if (missingComponents.length === 0) {
      return null; // Story is complete
    }

    return {
      storyId: story.id || '',
      storyTitle: story.title,
      hasSTAR,
      hasMetrics: hasMetrics || false,
      hasAccomplishedFormat,
      missingComponents
    };
  }

  /**
   * Check for missing metrics
   */
  private static checkMissingMetrics(story: {
    id: string;
    title: string;
    content?: string;
    metrics?: any[];
  }): MetricGap | null {
    const metricCount = countNonEmptyMetrics(story.metrics || []);
    const hasMetrics = storyHasMetrics(story.content || '', story.metrics || []);

    if (hasMetrics) {
      return null; // Has metrics
    }

    return {
      storyId: story.id || '',
      storyTitle: story.title,
      hasMetrics: false,
      metricCount: 0
    };
  }

  /**
   * Resolve story-level missing-metrics gaps when the story now contains metrics.
   * This is a heuristic sync to prevent stale gaps from persisting after edits.
   */
  static async resolveSatisfiedStoryMetricsGaps(params: {
    userId: string;
    storyId: string;
    content: string;
    metrics: unknown[];
  }): Promise<void> {
    const hasMetrics = storyHasMetrics(params.content || '', params.metrics || []);
    if (!hasMetrics) return;

    try {
      const { data, error } = await supabase
        .from('gaps')
        .select('id')
        .eq('user_id', params.userId)
        .eq('entity_type', 'approved_content')
        .eq('entity_id', params.storyId)
        .eq('gap_category', 'missing_metrics')
        .or('resolved.is.null,resolved.eq.false');

      if (error) throw error;
      const gaps = (data || []) as Array<{ id: string }>;
      for (const gap of gaps) {
        if (!gap?.id) continue;
        await this.resolveGap(gap.id, params.userId, 'no_longer_applicable');
      }
    } catch (e) {
      console.error('[GapDetectionService.resolveSatisfiedStoryMetricsGaps] Error:', e);
    }
  }

  /**
   * Resolve story-level "needs specifics" gaps when the story now meets the baseline heuristic.
   */
  static async resolveSatisfiedStorySpecificsGaps(params: {
    userId: string;
    storyId: string;
    content: string;
  }): Promise<void> {
    const meetsSpecificity = !this.checkContentStandards(params.content || '').needsSpecifics;
    if (!meetsSpecificity) return;

    try {
      const { data, error } = await supabase
        .from('gaps')
        .select('id')
        .eq('user_id', params.userId)
        .eq('entity_type', 'approved_content')
        .eq('entity_id', params.storyId)
        .eq('gap_category', 'story_needs_specifics')
        .or('resolved.is.null,resolved.eq.false');

      if (error) throw error;
      const gaps = (data || []) as Array<{ id: string }>;
      for (const gap of gaps) {
        if (!gap?.id) continue;
        await this.resolveGap(gap.id, params.userId, 'no_longer_applicable');
      }
    } catch (e) {
      console.error('[GapDetectionService.resolveSatisfiedStorySpecificsGaps] Error:', e);
    }
  }

  /**
   * MVP content standards check (non-LLM).
   * Framed as "needs more specifics / evidence" rather than a "generic" label.
   */
  private static checkContentStandards(content: string): ContentStandardsResult {
    const text = (content || '').trim();
    if (!text) {
      return { needsSpecifics: true, reasoning: 'Content is empty', confidence: 1 };
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 18) {
      return { needsSpecifics: true, reasoning: 'Content is very short and likely fragmentary', confidence: 0.85 };
    }

    const genericSignals = this.fallbackGenericCheck(text);
    if (genericSignals.isGeneric) {
      return {
        needsSpecifics: true,
        reasoning: genericSignals.reasoning || 'Needs more specific details and evidence',
        confidence: genericSignals.confidence ?? 0.7,
      };
    }

    return { needsSpecifics: false, reasoning: 'Meets baseline specificity standards', confidence: 0.3 };
  }

  /**
   * Check if content is too generic
   * 
   * PERFORMANCE: Now checks cache first (populated by batch call).
   * If not in cache, uses heuristics to avoid individual LLM calls.
   * For best results, call checkGenericContentBatch() first with all items.
   */
  private static async checkGenericContent(content: string): Promise<GenericContentGap> {
    // Check cache first (populated by batch call)
    const cached = this.genericContentCache.get(content);
    if (cached) {
      return cached;
    }

    // If not in cache, use heuristics (avoid individual LLM calls)
    // The batch method should have been called first for LLM-quality results
    return this.fallbackGenericCheck(content);
  }

  // Cache for batch generic content results (cleared after each batch call)
  private static genericContentCache: Map<string, GenericContentGap> = new Map();

  /**
   * Check multiple content items for generic content in ONE LLM call
   * 
   * PERFORMANCE: Reduces 43+ individual API calls to 1 batch call
   * - Before: 43 calls × 1-3s = 43-129s latency, ~$0.02-0.05
   * - After: 1 call × 3-5s = 3-5s latency, ~$0.001-0.002
   */
  static async checkGenericContentBatch(
    items: Array<{ id: string; content: string; type: 'work_item' | 'story' | 'section' }>,
    options?: { useLLM?: boolean; userId?: string }
  ): Promise<Map<string, GenericContentGap>> {
    const results = new Map<string, GenericContentGap>();
    
    if (items.length === 0) {
      return results;
    }

    const useLLM = options?.useLLM !== false; // default true

    // Fast path: heuristics only (no LLM)
    if (!useLLM) {
      for (const item of items) {
        const gap = this.fallbackGenericCheck(item.content);
        results.set(item.id, {
          ...gap,
          entityId: item.id,
          entityType: item.type === 'story' ? 'approved_content' : item.type === 'section' ? 'saved_section' : 'work_item',
        });
        this.genericContentCache.set(item.content, gap);
      }
      return results;
    }

    // Initialize evals logger if userId is available
    const evalsLogger = options?.userId ? new EvalsLogger({
      userId: options.userId,
      stage: 'qualityGate.gapDetection.batch',
    }) : null;
    
    evalsLogger?.start();

    try {
      const apiKey = (import.meta.env?.VITE_OPENAI_API_KEY) || (typeof process !== 'undefined' ? process.env.VITE_OPENAI_API_KEY : undefined) || '';
      
      if (!apiKey) {
        console.warn('[GapDetection] OpenAI API key not found, using fallback heuristics for batch');
        for (const item of items) {
          results.set(item.id, this.fallbackGenericCheck(item.content));
        }
        return results;
      }

      // Build numbered list of content for batch evaluation
      const contentList = items.map((item, idx) => 
        `[${idx + 1}] (${item.type}) "${item.content.substring(0, 500)}${item.content.length > 500 ? '...' : ''}"`
      ).join('\n\n');

      const prompt = `Analyze these ${items.length} professional stories/descriptions and determine which are too generic or lack specific details.

${contentList}

For EACH item, evaluate if it:
1. Contains specific details (technologies, processes, methodologies, numbers)
2. Uses measurable outcomes (metrics, percentages, dollar amounts, timeframes)
3. Avoids vague language like "worked on", "contributed to", "helped with" without specifics
4. Demonstrates clear impact and outcomes

Respond in JSON format with an array matching the order above:
{
  "results": [
    { "index": 1, "isGeneric": boolean, "reasoning": "brief explanation", "confidence": number (0-1) },
    ...
  ]
}

If content is specific with metrics and clear impact, set isGeneric to false.`;

      console.log(`[GapDetection] Batch checking ${items.length} items for generic content...`);
      const startTime = performance.now();

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: Math.min(items.length * 100 + 200, 4000), // Scale with item count
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      const latencyMs = performance.now() - startTime;
      console.log(`[GapDetection] Batch LLM call completed in ${latencyMs.toFixed(0)}ms for ${items.length} items`);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const contentText = data.choices[0]?.message?.content;

      if (!contentText) {
        throw new Error('No content in OpenAI response');
      }

      const parsed = typeof contentText === 'string' ? JSON.parse(contentText) : contentText;
      const llmResults = parsed.results || [];

      // Map results back to items
      for (const llmResult of llmResults) {
        const idx = (llmResult.index || llmResult.idx) - 1; // Convert 1-based to 0-based
        if (idx >= 0 && idx < items.length) {
          const item = items[idx];
          const gap: GenericContentGap = {
            entityId: item.id,
            entityType: item.type === 'story' ? 'approved_content' : item.type === 'section' ? 'saved_section' : 'work_item',
            content: item.content,
            isGeneric: llmResult.isGeneric || false,
            reasoning: llmResult.reasoning || '',
            confidence: llmResult.confidence || 0.5
          };
          results.set(item.id, gap);
          // Also cache for single-item lookups
          this.genericContentCache.set(item.content, gap);
        }
      }

      // Fill in any missing results with fallback
      for (const item of items) {
        if (!results.has(item.id)) {
          console.warn(`[GapDetection] Missing result for item ${item.id}, using fallback`);
          results.set(item.id, this.fallbackGenericCheck(item.content));
        }
      }

      // Log success
      const genericCount = Array.from(results.values()).filter(r => r.isGeneric).length;
      await evalsLogger?.success({
        model: 'gpt-4o-mini',
        tokens: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
        result_subset: {
          itemsEvaluated: items.length,
          genericCount,
          specificCount: items.length - genericCount,
        },
      });

      return results;
    } catch (error) {
      console.error('[GapDetection] Batch generic content check failed:', error);
      
      // Log failure
      await evalsLogger?.failure(
        error instanceof Error ? error : new Error(String(error)),
        { model: 'gpt-4o-mini' }
      );
      
      // Fallback: use heuristics for all items
      for (const item of items) {
        results.set(item.id, this.fallbackGenericCheck(item.content));
      }
      return results;
    }
  }

  /**
   * Clear the generic content cache (call after processing a batch)
   */
  static clearGenericContentCache(): void {
    this.genericContentCache.clear();
  }

  /**
   * Fallback heuristic check for generic content
   */
  private static fallbackGenericCheck(content: string): GenericContentGap {
    const genericPatterns = [
      /worked on/i,
      /contributed to/i,
      /helped with/i,
      /assisted in/i,
      /participated in/i,
      /was involved in/i
    ];

    const hasGenericPattern = genericPatterns.some(pattern => pattern.test(content));
    
    // Check for numbers/metrics
    const hasNumbers = /\d+/.test(content);
    
    // Check for specific technologies/tools
    const hasSpecifics = /(api|sdk|framework|library|tool|platform|system)/i.test(content);

    const isGeneric = hasGenericPattern && (!hasNumbers && !hasSpecifics);

    return {
      entityId: '',
      entityType: 'approved_content',
      content,
      isGeneric,
      reasoning: isGeneric 
        ? 'Contains vague language without specific details or metrics'
        : 'Contains specific details or metrics',
      confidence: isGeneric ? 0.7 : 0.3
    };
  }

  /**
   * Generate suggestions for completeness gaps
   */
  private static generateCompletenessSuggestions(gap: StoryCompletenessGap): any[] {
    const suggestions: any[] = [];

    if (!gap.hasSTAR && !gap.hasAccomplishedFormat) {
      suggestions.push({
        type: 'add_narrative_structure',
        description: 'Add STAR format (Situation, Task, Action, Result) or use "Accomplished [X] as measured by [Y], by doing [Z]" format'
      });
    }

    if (!gap.hasMetrics) {
      suggestions.push({
        type: 'add_metric',
        description: 'Add at least one quantified metric (percentage, dollar amount, timeframe, etc.)'
      });
    }

    return suggestions;
  }

  /**
   * Save gaps to database
   * @param gaps - Array of gaps to save
   * @param accessToken - Optional access token for authenticated Supabase client (needed for Node.js scripts)
   */
  static async saveGaps(gaps: Gap[], accessToken?: string): Promise<void> {
    if (gaps.length === 0) return;

    try {
      // Use authenticated client if accessToken provided (Node.js scripts)
      const dbClient = accessToken 
        ? await this.getAuthenticatedClient(accessToken)
        : supabase;

      // Filter out gaps that already exist (to avoid duplicates)
      // Include resolved gaps to prevent re-creating dismissed gaps (unless context changed)
      // Note: Context-aware re-detection (e.g., when target role changes) will be handled
      //       by checking gap_category or adding context metadata in future iteration
      const existingGaps = await this.getExistingGaps(
        gaps[0].user_id,
        gaps.map(g => ({ type: g.entity_type, id: g.entity_id })),
        accessToken,
        true // includeResolved = true: check both resolved and unresolved gaps
      );

      // Create map of existing gaps by entity + category.
      //
      // IMPORTANT: Only "sticky" resolutions (user_override/manual_resolve) should suppress re-creation.
      // For content-driven resolutions (content_added/no_longer_applicable), allow the gap to be re-created
      // if the content later regresses (since we don't yet track content hashes).
      const isStickyResolution = (gap: Gap) => {
        if (!gap.resolved) return true; // unresolved gaps should suppress duplicates
        return gap.resolved_reason === 'user_override' || gap.resolved_reason === 'manual_resolve';
      };
      const existingMap = new Map(
        existingGaps
          .filter(isStickyResolution)
          .map((g) => [`${g.entity_type}:${g.entity_id}:${g.gap_category}`, true]),
      );

      const newGaps = gaps.filter(g => 
        !existingMap.has(`${g.entity_type}:${g.entity_id}:${g.gap_category}`)
      );

      if (newGaps.length === 0) {
        console.log('[GapDetection] All gaps already exist, skipping save');
        return;
      }

      const { error } = await dbClient
        .from('gaps')
        .insert(newGaps);

      if (error) {
        console.error('Error saving gaps to database:', error);
        throw error;
      }

      console.log(`[GapDetection] Saved ${newGaps.length} gaps to database`);
    } catch (error) {
      console.error('Error in saveGaps:', error);
      throw error;
    }
  }

  // Client cache to avoid creating multiple GoTrueClient instances
  private static clientCache: Map<string, { client: any; createdAt: number }> = new Map();
  private static readonly CLIENT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get authenticated Supabase client for Node.js environments
   * OPTIMIZED: Uses caching to avoid creating multiple GoTrueClient instances
   */
  private static async getAuthenticatedClient(accessToken: string) {
    // Check cache first
    const cached = this.clientCache.get(accessToken);
    if (cached && (Date.now() - cached.createdAt) < this.CLIENT_CACHE_TTL) {
      return cached.client;
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    
    // Get config from environment (same as supabase.ts)
    const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL) || 
                       (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) || '';
    const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                           (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) || '';
    
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });
    
    // Cache the client
    this.clientCache.set(accessToken, { client, createdAt: Date.now() });
    
    // Clean up old entries (keep max 5)
    if (this.clientCache.size > 5) {
      const now = Date.now();
      for (const [key, value] of this.clientCache.entries()) {
        if (now - value.createdAt > this.CLIENT_CACHE_TTL) {
          this.clientCache.delete(key);
        }
      }
    }
    
    return client;
  }

  /**
   * Get existing gaps for entities
   * @param includeResolved - If true, includes resolved gaps (for deduplication)
   *                          If false, only returns unresolved gaps (for display)
   */
  

  private static async getExistingGaps(
    userId: string,
    entities: Array<{ type: 'work_item' | 'approved_content' | 'saved_section'; id: string }>,
    accessToken?: string,
    includeResolved: boolean = false
  ): Promise<Gap[]> {
    if (entities.length === 0) return [];
    const dbClient = accessToken ? await this.getAuthenticatedClient(accessToken) : supabase;
    let q = dbClient.from('gaps').select('*').eq('user_id', userId);
    if (!includeResolved) q = q.or('resolved.is.null,resolved.eq.false');
    const { data, error } = await q;
    if (error) { console.error('Error fetching existing gaps:', error); return []; }
    const wanted = new Set(entities.map(e => `${e.type}:${e.id}`));
    return (data || []).filter((g: any) => wanted.has(`${g.entity_type}:${g.entity_id}`)) as Gap[];
  }

  /**
   * Get gap summary for a user
   * Aggregates gaps by content type and severity for dashboard display
   * 
   * Content Type Mapping:
   * - approved_content + gap_category (incomplete_story, missing_metrics, story_needs_specifics) → Stories
   * - approved_content + gap_category (saved_section gaps) → Saved Sections (future)
   * - work_item + gap_category (missing_role_description, role_description_needs_specifics) → Role Descriptions
   * - work_item + gap_category (missing_role_metrics, insufficient_role_metrics) → Role Metrics
   * - cover_letter_section (future) → Cover Letter Sections
   */
  static async getGapSummary(userId: string, profileId?: string, accessToken?: string): Promise<GapSummary> {
    try {
      // IMPORTANT: Gap totals are per-item (distinct content items with >=1 unresolved gap),
      // not per-gap-row. Use getContentItemsWithGaps() which already expands work_item gaps into
      // role_summary vs role_metrics items and dedupes at the entity level.
      const itemsByType = await this.getContentItemsWithGaps(userId, profileId, accessToken);
      const items = [
        ...(itemsByType.byContentType.workHistory || []),
        ...(itemsByType.byContentType.coverLetterSavedSections || []),
      ];
      const summary: GapSummary = {
        total: items.length,
        byContentType: {
          stories: 0,
          savedSections: 0,
          roleDescriptions: 0,
          outcomeMetrics: 0,
          coverLetterSections: 0,
        },
        bySeverity: { high: 0, medium: 0, low: 0 },
        bySeverityAndType: {
          high: { stories: 0, savedSections: 0, roleDescriptions: 0, outcomeMetrics: 0, coverLetterSections: 0 },
          medium: { stories: 0, savedSections: 0, roleDescriptions: 0, outcomeMetrics: 0, coverLetterSections: 0 },
          low: { stories: 0, savedSections: 0, roleDescriptions: 0, outcomeMetrics: 0, coverLetterSections: 0 },
        },
      };

      const mapItemType = (itemType: ContentItemWithGaps['item_type'] | undefined): 'stories' | 'savedSections' | 'roleDescriptions' | 'outcomeMetrics' | 'coverLetterSections' => {
        if (itemType === 'story') return 'stories';
        if (itemType === 'role_summary') return 'roleDescriptions';
        if (itemType === 'role_metrics') return 'outcomeMetrics';
        if (itemType === 'cover_letter_section') return 'coverLetterSections';
        return 'roleDescriptions';
      };

      for (const item of items) {
        const t = mapItemType(item.item_type);
        const sev = item.max_severity;
        summary.byContentType[t]++;
        summary.bySeverity[sev]++;
        summary.bySeverityAndType[sev][t]++;
      }

      return summary;
    } catch (error) {
      console.error('Error in getGapSummary:', error);
      // Return empty summary on error
      return {
        total: 0,
        byContentType: {
          stories: 0,
          savedSections: 0,
          roleDescriptions: 0,
          outcomeMetrics: 0,
          coverLetterSections: 0,
        },
        bySeverity: {
          high: 0,
          medium: 0,
          low: 0,
        },
        bySeverityAndType: {
          high: {
            stories: 0,
            savedSections: 0,
            roleDescriptions: 0,
            outcomeMetrics: 0,
            coverLetterSections: 0,
          },
          medium: {
            stories: 0,
            savedSections: 0,
            roleDescriptions: 0,
            outcomeMetrics: 0,
            coverLetterSections: 0,
          },
          low: {
            stories: 0,
            savedSections: 0,
            roleDescriptions: 0,
            outcomeMetrics: 0,
            coverLetterSections: 0,
          },
        },
      };
    }
  }

  /**
   * Resolve a gap
   * @param gapId - The gap ID to resolve
   * @param userId - The user ID (for security)
   * @param reason - Why the gap is being resolved
   *   - 'content_added': Content was generated/applied that addresses the gap
   *   - 'user_override': User manually dismissed the gap (not a real gap / don't want to fix)
   *   - 'manual_resolve': Manually resolved (admin/system)
   *   - 'no_longer_applicable': Gap no longer applies
   * @param addressingContentId - Optional: ID of content that addresses this gap (for 'content_added' reason)
   */
  static async resolveGap(
    gapId: string,
    userId: string,
    reason: 'user_override' | 'content_added' | 'manual_resolve' | 'no_longer_applicable',
    addressingContentId?: string
  ): Promise<void> {
    try {
      const updateData: any = {
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_reason: reason,
          updated_at: new Date().toISOString()
      };

      // If content was added to address the gap, link it
      if (reason === 'content_added' && addressingContentId) {
        // Get current addressing_content_ids array
        const { data: currentGap } = await supabase
          .from('gaps')
          .select('addressing_content_ids')
        .eq('id', gapId)
          .eq('user_id', userId)
          .single();

        const currentIds = currentGap?.addressing_content_ids || [];
        const updatedIds = [...new Set([...currentIds, addressingContentId])]; // Avoid duplicates
        
        updateData.addressing_content_ids = updatedIds;

        // Also update the content to reference this gap (bidirectional link)
        await supabase
          .from('stories')
          .update({ addressed_gap_id: gapId })
          .eq('id', addressingContentId)
          .eq('user_id', userId);
      }

      const { error } = await supabase
        .from('gaps')
        .update(updateData)
        .eq('id', gapId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error resolving gap:', error);
        throw error;
      }

      // Notify UI caches (dashboard/header) that gaps changed so they can refetch immediately.
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('gaps:changed', { detail: { userId, gapId, reason } }));
      }
    } catch (error) {
      console.error('Error in resolveGap:', error);
      throw error;
    }
  }

  /**
   * Get content items with gaps, formatted for dashboard widgets
   * Returns ranked list of individual items grouped by content type
   */
  static async getContentItemsWithGaps(userId: string, profileId?: string, accessToken?: string): Promise<GapSummaryByItem> {
    try {
      const db = accessToken ? await this.getAuthenticatedClient(accessToken) : supabase;
      
      // Filter gaps by profile_id if provided (similar to getUserGaps)
      let gaps: any[] = [];
      if (profileId) {
        // Use getUserGaps which already handles profile filtering
        gaps = await this.getUserGaps(userId, profileId, accessToken);
      } else {
        const { data, error } = await db
        .from('gaps')
        .select('*')
        .eq('user_id', userId)
        .or('resolved.is.null,resolved.eq.false');
      if (error) throw error;
        gaps = data || [];
      }

      // Ignore metadata-only gaps (e.g., missing tags) for the content quality experience.
      gaps = gaps.filter((gap: any) => !this.TAG_METADATA_GAP_CATEGORIES.has(gap.gap_category));

      const items: ContentItemWithGaps[] = [];

      emitContentQualityProgress({
        stage: 'collect-gaps',
        progress: 0.2,
        message: `Identified ${gaps.length} open gap${gaps.length === 1 ? '' : 's'} to review`
      });

      // Process gaps and group by entity
      const entityMap = new Map<string, {
        gaps: typeof gaps;
        entity_type: string;
        entity_id: string;
      }>();

      gaps.forEach((gap: any) => {
        const key = `${gap.entity_type}:${gap.entity_id}`;
        if (!entityMap.has(key)) {
          entityMap.set(key, {
            gaps: [],
            entity_type: gap.entity_type,
            entity_id: gap.entity_id,
          });
        }
        entityMap.get(key)!.gaps.push(gap);
      });

      const workItemIds = new Set<string>();
      const storyIds = new Set<string>();
      const savedSectionIds = new Set<string>();

      for (const entityData of entityMap.values()) {
        if (entityData.entity_type === 'work_item') {
          workItemIds.add(entityData.entity_id);
        } else if (entityData.entity_type === 'approved_content') {
          storyIds.add(entityData.entity_id);
        } else if (entityData.entity_type === 'saved_section') {
          savedSectionIds.add(entityData.entity_id);
        }
      }

      const workItemMap = new Map<string, any>();
      emitContentQualityProgress({
        stage: 'hydrate-content',
        progress: 0.35,
        message: workItemIds.size > 0
          ? `Enriching ${workItemIds.size} work history record${workItemIds.size === 1 ? '' : 's'}...`
          : 'No work history gaps detected'
      });
      if (workItemIds.size > 0) {
        const { data: workItemsData, error: workItemsError } = await db
          .from('work_items')
          .select('id, title, description, metrics, source_id, company:companies!company_id(name)')
          .in('id', Array.from(workItemIds));

        if (workItemsError) {
          console.error('[GapDetection] Error loading work items for gaps:', workItemsError);
        } else {
          (workItemsData || []).forEach((wi: any) => {
            workItemMap.set(wi.id, wi);
          });
        }
      }

      const storyMap = new Map<string, any>();
      if (storyIds.size > 0) {
        const { data: storiesData, error: storiesError } = await db
          .from('stories')
          .select('id, title, source_id, work_item_id, work_item:work_items!work_item_id(id, title, source_id, company:companies!company_id(name))')
          .in('id', Array.from(storyIds));

        if (storiesError) {
          console.error('[GapDetection] Error loading stories for gaps:', storiesError);
        } else {
          (storiesData || []).forEach((story: any) => {
            storyMap.set(story.id, story);
          });
        }
      }

      emitContentQualityProgress({
        stage: 'hydrate-content',
        progress: storyMap.size > 0 || workItemMap.size > 0 ? 0.5 : 0.45,
        message: [
          storyMap.size > 0 ? `Linked ${storyMap.size} stor${storyMap.size === 1 ? 'y' : 'ies'}` : null,
          workItemMap.size > 0 ? `with detailed roles` : null
        ]
          .filter(Boolean)
          .join(' ')
          || 'No stories with gaps to hydrate'
      });

      const savedSectionMap = new Map<string, any>();
      if (savedSectionIds.size > 0) {
        let savedSectionsData: any[] | null = null;
        let savedSectionsError: any = null;

        // Batch query if too many IDs (Supabase has limits on .in() queries)
        const savedSectionIdArray = Array.from(savedSectionIds);
        const BATCH_SIZE = 100; // Safe batch size for Supabase queries
        
        // Get profile source IDs to filter saved_sections by source_id (not profile_id)
        let profileSourceIds = new Set<string>();
        if (profileId) {
          const pid = profileId.toUpperCase();
          const { data: profileSources } = await db
            .from('sources')
            .select('id')
            .eq('user_id', userId)
            .or(
              `file_name.ilike.${pid}_%,` +
              `file_name.ilike.${pid}-%,` +
              `file_name.ilike.${pid}.%,` +
              `file_name.ilike.${pid} %`
            );
          profileSourceIds = new Set((profileSources || []).map((s: any) => s.id));
        }

        const attemptSelect = async (columns: string, ids: string[]) => {
          let query = db
            .from('saved_sections')
            .select(columns)
            .eq('user_id', userId)
            .in('id', ids);
          
          // Filter by source_id if profileId is provided (saved_sections are linked via source, not profile_id)
          if (profileId && profileSourceIds.size > 0) {
            query = query.in('source_id', Array.from(profileSourceIds));
          }
          
          const { data, error } = await query;
          if (error) {
            savedSectionsError = error;
            return null;
          }
          savedSectionsError = null;
          return data;
        };

        // Process in batches if needed
        if (savedSectionIdArray.length > BATCH_SIZE) {
          const batches: any[] = [];
          for (let i = 0; i < savedSectionIdArray.length; i += BATCH_SIZE) {
            const batch = savedSectionIdArray.slice(i, i + BATCH_SIZE);
            const batchData = await attemptSelect('id, title, type, source_id', batch);
            if (batchData) batches.push(...batchData);
          }
          savedSectionsData = batches;
        } else {
          savedSectionsData = await attemptSelect('id, title, type, source_id', savedSectionIdArray);
        }

        if (savedSectionsError) {
          console.error('[GapDetection] Error loading saved sections for gaps:', savedSectionsError);
        } else if (savedSectionsData) {
          savedSectionsData.forEach((section: any) => {
            savedSectionMap.set(section.id, section);
          });
        }
      }

      emitContentQualityProgress({
        stage: 'hydrate-content',
        progress: savedSectionMap.size > 0 ? 0.65 : 0.6,
        message: savedSectionMap.size > 0
          ? `Merged ${savedSectionMap.size} cover letter section${savedSectionMap.size === 1 ? '' : 's'}`
          : 'No cover letter gaps detected'
      });

      const sourceMap = new Map<string, string>();
      if (profileId) {
        const sourceIdsToFetch = new Set<string>();

        workItemMap.forEach((wi: any) => {
          if (!wi?.profile_id && wi?.source_id) {
            sourceIdsToFetch.add(wi.source_id);
          }
        });

        storyMap.forEach((story: any) => {
          if (story?.source_id) {
            sourceIdsToFetch.add(story.source_id);
          }
          const joinedWorkItem = story?.work_item;
          if (joinedWorkItem?.source_id && !joinedWorkItem?.profile_id) {
            sourceIdsToFetch.add(joinedWorkItem.source_id);
          } else if (!joinedWorkItem && story?.work_item_id) {
            const fallbackWI = workItemMap.get(story.work_item_id);
            if (fallbackWI?.source_id && !fallbackWI?.profile_id) {
              sourceIdsToFetch.add(fallbackWI.source_id);
            }
          }
        });

        savedSectionMap.forEach((section: any) => {
          if (section?.source_id) {
            sourceIdsToFetch.add(section.source_id);
          }
        });

        if (sourceIdsToFetch.size > 0) {
          const { data: sourcesData, error: sourcesError } = await db
            .from('sources')
            .select('id, file_name')
            .in('id', Array.from(sourceIdsToFetch));

          if (sourcesError) {
            console.error('[GapDetection] Error loading source metadata for gaps:', sourcesError);
          } else {
            (sourcesData || []).forEach((src: any) => {
              if (src?.id && src?.file_name) {
                sourceMap.set(src.id, src.file_name.toUpperCase());
              }
            });
          }
        }
      }

      emitContentQualityProgress({
        stage: 'hydrate-content',
        progress: 0.8,
        message: 'Resolved source metadata for profile filtering'
      });

      const matchesProfileByFilename = (sourceId?: string | null) => {
        if (!profileId || !sourceId) return false;
        const fileName = sourceMap.get(sourceId);
        if (!fileName) return false;
        const pid = profileId.toUpperCase();
        return (
          fileName.startsWith(`${pid}_`) ||
          fileName.startsWith(`${pid}-`) ||
          fileName.startsWith(`${pid}.`) ||
          fileName.startsWith(`${pid} `)
        );
      };

      // Fetch content metadata for each entity
      emitContentQualityProgress({
        stage: 'summarize',
        progress: 0.85,
        message: 'Ranking content by severity and priority...'
      });
      for (const [key, entityData] of entityMap.entries()) {
        const [entityType, entityId] = key.split(':');
        const entityGaps: any[] = entityData.gaps as any[];
        const maxSeverity = entityGaps.reduce((max: 'high'|'medium'|'low', gap: any) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[gap.severity as keyof typeof severityOrder] > 
                 severityOrder[max as keyof typeof severityOrder] ? gap.severity : max;
        }, entityGaps[0].severity as 'high'|'medium'|'low');

        const gapCategories = [...new Set(entityGaps.map((g: any) => g.gap_category))];

        if (entityType === 'work_item') {
          const workItem = workItemMap.get(entityId);
          if (!workItem) continue;

          if (profileId) {
            const matchesProfile = workItem.profile_id
              ? workItem.profile_id === profileId
              : matchesProfileByFilename(workItem.source_id);
            if (!matchesProfile) continue;
          }

          const companyName = (workItem.company as any)?.name || 'Unknown Company';
          const roleTitle = workItem.title;

          // Check if this is role description or metrics gap
          const isRoleDescription = gapCategories.some(cat => 
            cat === 'missing_role_description' ||
            // Back-compat: legacy category
            cat === 'generic_role_description' ||
            // New standards-based category
            cat === 'role_description_needs_specifics'
          );
          const isRoleMetrics = gapCategories.some(cat => 
            cat === 'missing_role_metrics' || cat === 'insufficient_role_metrics'
          );

          if (isRoleDescription) {
            const desc: string = (workItem as any)?.description || '';
            const normalized = desc.replace(/\s+/g, ' ').trim();
            const limit = 50;
            const preview = normalized.length > limit 
              ? normalized.slice(0, limit).trimEnd() + '…' 
              : normalized;
            items.push({
              entity_id: entityId,
              entity_type: 'work_item',
              display_title: `${roleTitle} @ ${companyName}: Role Summary`,
              role_title: roleTitle,
              company_name: companyName,
              item_type: 'role_summary',
              preview_text: preview,
              max_severity: maxSeverity,
              gap_categories: gapCategories,
              content_type_label: 'Work History',
              navigation_path: '/work-history',
              navigation_params: { roleId: entityId },
            });
          }

          if (isRoleMetrics) {
            const metricsArr: any[] = Array.isArray((workItem as any)?.metrics) ? (workItem as any).metrics : [];
            const normalizeValue = (val: string) => {
              let s = (val || '').trim();
              // collapse multiple leading '+'
              s = s.replace(/^\++/, '+');
              if (/^\+/.test(s)) return s;
              if (/^-/.test(s)) return s;
              if (/^\d/.test(s)) return `+${s}`;
              return s;
            };
            const formatMetricEntry = (m: any) => {
              // String metric: try to normalize the first numeric token, otherwise keep as-is
              if (typeof m === 'string') {
                const str = m.trim();
                const match = str.match(/([+\-]?\d[\d.,]*%?)/); // first numeric token
                if (match) {
                  const normalized = normalizeValue(match[1]);
                  // replace only first occurrence
                  return str.replace(match[1], normalized);
                }
                return str;
              }
              // Object metric: combine value + best available label
              const rawVal = (
                m?.value ?? m?.amount ?? m?.delta ?? m?.change ?? m?.score ?? m?.pct ?? m?.percent ?? ''
              ).toString();
              const unit = (m?.unit ?? m?.suffix ?? '').toString().trim();
              const labelFields = [
                m?.label,
                m?.labelText,
                m?.name,
                m?.metric,
                m?.title,
                m?.key,
                m?.measure,
                m?.text,
                m?.desc,
                m?.description,
                m?.what,
                m?.kpi,
                m?.category,
                m?.dimension,
                m?.subject,
                m?.context
              ]
                .map((x: any) => (x ?? '').toString().trim())
                .filter((s: string) => s.length > 0);
              // Prefer combining metric/name with label if both exist (e.g. 'NPS' + 'score')
              const primaryMetric = (m?.metric ?? m?.name ?? '').toString().trim();
              let label = labelFields.length > 0 ? labelFields[0] : '';
              if (primaryMetric && label && label.toLowerCase() !== primaryMetric.toLowerCase()) {
                label = `${primaryMetric} ${label}`;
              } else if (!label && primaryMetric) {
                label = primaryMetric;
              }
              // attach unit if not already present in rawVal
              const valWithUnit = unit && !rawVal.endsWith(unit) ? `${rawVal}${unit}` : rawVal;
              const val = normalizeValue(valWithUnit);
              const combined = [val, label].filter(Boolean).join(' ');
              return combined.trim();
            };
            const metricStrings = metricsArr
              .map(formatMetricEntry)
              .filter((s: string) => s && s.trim().length > 0);
            // Build preview from first two entries, but keep words intact
            const limit = 50;
            let joined = metricStrings.slice(0, 2).join(' ');
            if (joined.length > limit) {
              joined = joined.slice(0, limit).trimEnd() + '…';
            }
            const preview = joined;
            items.push({
              entity_id: entityId,
              entity_type: 'work_item',
              display_title: `${roleTitle} @ ${companyName}: Summary Metrics`,
              role_title: roleTitle,
              company_name: companyName,
              item_type: 'role_metrics',
              preview_text: preview,
              max_severity: maxSeverity,
              gap_categories: gapCategories,
              content_type_label: 'Work History',
              navigation_path: '/work-history',
              navigation_params: { roleId: entityId },
            });
          }
        } else if (entityType === 'approved_content') {
          const story = storyMap.get(entityId);
          if (!story) continue;

          const linkedWorkItem = (story.work_item as any) || (story.work_item_id ? workItemMap.get(story.work_item_id) : null);
          if (!linkedWorkItem) continue;

          if (profileId) {
            let matchesProfile = false;
            if (linkedWorkItem.profile_id) {
              matchesProfile = linkedWorkItem.profile_id === profileId;
            } else {
              matchesProfile = matchesProfileByFilename(linkedWorkItem.source_id) || matchesProfileByFilename(story.source_id);
            }
            if (!matchesProfile) continue;
            }

          const roleTitle = linkedWorkItem?.title || 'Unknown Role';
          const companyName = linkedWorkItem?.company?.name || 'Unknown Company';
          const storyTitle = story.title;

          items.push({
            entity_id: entityId,
            entity_type: 'approved_content',
            display_title: `${roleTitle} @ ${companyName}: ${storyTitle}`,
            role_title: roleTitle,
            company_name: companyName,
            story_title: storyTitle,
            item_type: 'story',
            max_severity: maxSeverity,
            gap_categories: gapCategories,
            content_type_label: 'Work History',
            navigation_path: '/work-history',
            navigation_params: { roleId: linkedWorkItem?.id || story.work_item_id || '', storyId: entityId },
          });
        } else if (entityType === 'saved_section') {
          const section = savedSectionMap.get(entityId);
          if (!section) continue;

          if (profileId) {
          const matchesProfile = matchesProfileByFilename(section?.source_id);
            if (!matchesProfile) continue;
          }

          const sectionTitle = section.title || section.type || 'Section';

          items.push({
            entity_id: entityId,
            entity_type: 'saved_section',
            display_title: `Cover Letter - ${sectionTitle}`,
            section_title: sectionTitle,
            item_type: 'cover_letter_section',
            max_severity: maxSeverity,
            gap_categories: gapCategories,
            content_type_label: 'Cover Letter Saved Sections',
            navigation_path: '/saved-sections',
            navigation_params: { sectionId: entityId },
          });
        }
      }

      // Sort by severity (high → medium → low), then by title
      const severityOrder = { high: 3, medium: 2, low: 1 };
      items.sort((a, b) => {
        const severityDiff = severityOrder[b.max_severity] - severityOrder[a.max_severity];
        if (severityDiff !== 0) return severityDiff;
        return a.display_title.localeCompare(b.display_title);
      });

      // Group by content type
      const workHistory = items.filter(item => item.content_type_label === 'Work History');
      const coverLetterSavedSections = items.filter(item => item.content_type_label === 'Cover Letter Saved Sections');

      const result = {
        total: items.length,
        byContentType: {
          workHistory,
          coverLetterSavedSections,
        },
      };

      emitContentQualityProgress({
        stage: 'complete',
        progress: 1,
        message: items.length > 0
          ? `Content quality ready: ${items.length} item${items.length === 1 ? '' : 's'} need attention`
          : 'Content quality ready: no gaps detected',
        tone: 'success'
      });

      return result;
    } catch (error) {
      console.error('Error in getContentItemsWithGaps:', error);
      emitContentQualityProgress({
        stage: 'error',
        progress: 1,
        message: error instanceof Error ? error.message : 'Failed to load content quality',
        tone: 'error'
      });
      return {
        total: 0,
        byContentType: {
          workHistory: [],
          coverLetterSavedSections: [],
        },
      };
    }
  }
}
