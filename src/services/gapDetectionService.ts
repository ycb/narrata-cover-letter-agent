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
import { UserPreferencesService } from './userPreferencesService';

export interface Gap {
  id?: string;
  user_id: string;
  entity_type: 'work_item' | 'approved_content';
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

export interface GenericContentGap {
  entityId: string;
  entityType: 'work_item' | 'approved_content';
  content: string;
  isGeneric: boolean;
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
    roleMetrics: number;
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
      roleMetrics: number;
      coverLetterSections: number;
    };
    medium: {
      stories: number;
      savedSections: number;
      roleDescriptions: number;
      roleMetrics: number;
      coverLetterSections: number;
    };
    low: {
      stories: number;
      savedSections: number;
      roleDescriptions: number;
      roleMetrics: number;
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
    },
    stories?: Array<{
      id: string;
      title: string;
      content: string;
      metrics?: any[];
    }>
  ): Promise<Gap[]> {
    const gaps: Gap[] = [];

    // 1. Detect role-level description gaps
    const roleDescriptionGaps = await this.detectRoleDescriptionGaps(
      userId,
      workItemId,
      workItemData.description || '',
      workItemData.title
    );
    gaps.push(...roleDescriptionGaps);

    // 2. Detect role-level metrics gaps
    const roleMetricsGaps = this.detectRoleMetricsGaps(
      userId,
      workItemId,
      workItemData.metrics || [],
      workItemData.startDate,
      workItemData.endDate,
      stories?.length || 0
    );
    gaps.push(...roleMetricsGaps);

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
   * Detect gaps in role-level metrics
   * Flags missing or insufficient metrics at the role level
   */
  private static detectRoleMetricsGaps(
    userId: string,
    workItemId: string,
    roleMetrics: any[],
    startDate?: string,
    endDate?: string | null,
    storyCount: number = 0
  ): Gap[] {
    const gaps: Gap[] = [];

    // Count valid metrics (with value)
    const validMetrics = roleMetrics?.filter(m => m?.value && m.value.trim()) || [];
    const metricCount = validMetrics.length;

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

    // 2. Check for generic description (LLM-as-judge)
    const genericGap = await this.checkGenericContent(description);
    if (genericGap.isGeneric) {
      gaps.push({
        user_id: userId,
        entity_type: 'work_item',
        entity_id: workItemId,
        gap_type: 'best_practice',
        gap_category: 'generic_role_description',
        severity: genericGap.confidence && genericGap.confidence > 0.8 ? 'high' : 'medium',
        description: 'May be too generic',
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

    // Check for generic content (reuse existing prompt)
    const genericGap = await this.checkGenericContent(section.content);
    if (genericGap.isGeneric) {
      gaps.push({
        user_id: userId,
        entity_type: 'saved_section', // Cover letter sections are saved sections
        entity_id: section.id,
        gap_type: 'best_practice',
        gap_category: 'generic_cover_letter_section',
        severity: genericGap.confidence && genericGap.confidence > 0.8 ? 'high' : 'medium',
        description: 'Section may be too generic',
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

      // Check if metrics are present
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

    // 3. Generic Content Gap (LLM-as-judge)
    const genericGap = await this.checkGenericContent(story.content);
    if (genericGap.isGeneric) {
      gaps.push({
        user_id: userId,
        entity_type: 'approved_content',
        entity_id: story.id,
        gap_type: 'best_practice',
        gap_category: 'too_generic',
        severity: genericGap.confidence && genericGap.confidence > 0.8 ? 'high' : 'medium',
        description: 'May be too generic',
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
    title: string;
    content: string;
    metrics?: any[];
  }): StoryCompletenessGap | null {
    const content = story.content.toLowerCase();
    const hasMetrics = story.metrics && story.metrics.length > 0;

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
    metrics?: any[];
  }): MetricGap | null {
    const hasMetrics = story.metrics && story.metrics.length > 0;
    const metricCount = story.metrics?.length || 0;

    if (hasMetrics && metricCount > 0) {
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
   * Check if content is too generic using LLM-as-judge
   */
  private static async checkGenericContent(content: string): Promise<GenericContentGap> {
    try {
      const apiKey = (import.meta.env?.VITE_OPENAI_KEY) || (typeof process !== 'undefined' ? process.env.VITE_OPENAI_KEY : undefined) || '';
      
      if (!apiKey) {
        console.warn('[GapDetection] OpenAI API key not found, using fallback heuristic check');
        return this.fallbackGenericCheck(content);
      }

      const prompt = `Analyze this professional story/description and determine if it's too generic or lacks specific details.

Story:
"${content}"

Evaluate if this content:
1. Contains specific details (technologies, processes, methodologies, numbers)
2. Uses measurable outcomes (metrics, percentages, dollar amounts, timeframes)
3. Avoids vague language like "worked on", "contributed to", "helped with" without specifics
4. Demonstrates clear impact and outcomes

Respond in JSON format:
{
  "isGeneric": boolean,
  "reasoning": "brief explanation",
  "confidence": number (0-1)
}

If the content is specific, has metrics, and demonstrates clear impact, set isGeneric to false.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 200,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const contentText = data.choices[0]?.message?.content;

      if (!contentText) {
        throw new Error('No content in OpenAI response');
      }

      try {
        const result = typeof contentText === 'string' ? JSON.parse(contentText) : contentText;
        return {
          entityId: '',
          entityType: 'approved_content',
          content,
          isGeneric: result.isGeneric || false,
          reasoning: result.reasoning || '',
          confidence: result.confidence || 0.5
        };
      } catch (parseError) {
        console.error('Error parsing LLM response:', parseError);
        // Fallback: basic heuristic check
        return this.fallbackGenericCheck(content);
      }
    } catch (error) {
      console.error('Error in LLM generic content check:', error);
      // Fallback: basic heuristic check
      return this.fallbackGenericCheck(content);
    }
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

      // Create map of existing gaps by entity + category
      // This prevents re-creating the same gap category for the same entity
      // even if it was previously dismissed (unless context changed and category differs)
      const existingMap = new Map(
        existingGaps.map(g => [`${g.entity_type}:${g.entity_id}:${g.gap_category}`, true])
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

  /**
   * Get authenticated Supabase client for Node.js environments
   */
  private static async getAuthenticatedClient(accessToken: string) {
    const { createClient } = await import('@supabase/supabase-js');
    
    // Get config from environment (same as supabase.ts)
    const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL) || 
                       (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined) || '';
    const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY) || 
                           (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined) || '';
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });
  }

  /**
   * Get existing gaps for entities
   * @param includeResolved - If true, includes resolved gaps (for deduplication)
   *                          If false, only returns unresolved gaps (for display)
   */
  private static async getExistingGaps(
    userId: string,
    entities: Array<{ type: 'work_item' | 'approved_content'; id: string }>,
    accessToken?: string,
    includeResolved: boolean = false
  ): Promise<Gap[]> {
    try {
      if (entities.length === 0) return [];

      // Use authenticated client if accessToken provided
      const dbClient = accessToken 
        ? await this.getAuthenticatedClient(accessToken)
        : supabase;

      // Build query - include resolved gaps if requested (for deduplication)
      let query = dbClient
        .from('gaps')
        .select('*')
        .eq('user_id', userId);

      if (!includeResolved) {
        query = query.eq('resolved', false);
      }

      // For multiple entities, we need to use or() with proper syntax
      if (entities.length === 1) {
        query = query
          .eq('entity_type', entities[0].type)
          .eq('entity_id', entities[0].id);
      } else {
        // Supabase doesn't support OR easily, so we'll fetch all and filter
        let fetchQuery = dbClient
          .from('gaps')
          .select('*')
          .eq('user_id', userId);
        
        if (!includeResolved) {
          fetchQuery = fetchQuery.eq('resolved', false);
        }

        const { data, error } = await fetchQuery;

        if (error) {
          console.error('Error fetching existing gaps:', error);
          return [];
        }

        // Filter in JavaScript
        const entityMap = new Set(entities.map(e => `${e.type}:${e.id}`));
        const filtered = (data || []).filter((g: any) => 
          entityMap.has(`${g.entity_type}:${g.entity_id}`)
        );

        return filtered as Gap[];
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching existing gaps:', error);
        return [];
      }

      return (data || []) as Gap[];
    } catch (error) {
      console.error('Error in getExistingGaps:', error);
      return [];
    }
  }

  /**
   * Get all unresolved gaps for a user
   */
  static async getUserGaps(userId: string): Promise<Gap[]> {
    try {
      const { data, error } = await supabase
        .from('gaps')
        .select('*')
        .eq('user_id', userId)
        .eq('resolved', false)
        .order('severity', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user gaps:', error);
        return [];
      }

      return (data || []) as Gap[];
    } catch (error) {
      console.error('Error in getUserGaps:', error);
      return [];
    }
  }

  /**
   * Get gap summary for a user
   * Aggregates gaps by content type and severity for dashboard display
   * 
   * Content Type Mapping:
   * - approved_content + gap_category (incomplete_story, missing_metrics, too_generic) → Stories
   * - approved_content + gap_category (saved_section gaps) → Saved Sections (future)
   * - work_item + gap_category (missing_role_description, generic_role_description) → Role Descriptions
   * - work_item + gap_category (missing_role_metrics, insufficient_role_metrics) → Role Metrics
   * - cover_letter_section (future) → Cover Letter Sections
   */
  static async getGapSummary(userId: string): Promise<GapSummary> {
    try {
      // Build the same item list used by the Content Quality widget
      const itemsByType = await this.getContentItemsWithGaps(userId);
      const workHistoryItems = itemsByType.byContentType.workHistory || [];
      const coverLetterItems = itemsByType.byContentType.coverLetterSavedSections || [];
      const allItems = [...workHistoryItems, ...coverLetterItems];

      const summary: GapSummary = {
        total: allItems.length,
        byContentType: {
          stories: 0,
          savedSections: 0,
          roleDescriptions: 0,
          roleMetrics: 0,
          coverLetterSections: 0,
        },
        bySeverity: { high: 0, medium: 0, low: 0 },
        bySeverityAndType: {
          high: { stories: 0, savedSections: 0, roleDescriptions: 0, roleMetrics: 0, coverLetterSections: 0 },
          medium: { stories: 0, savedSections: 0, roleDescriptions: 0, roleMetrics: 0, coverLetterSections: 0 },
          low: { stories: 0, savedSections: 0, roleDescriptions: 0, roleMetrics: 0, coverLetterSections: 0 },
        },
      };

      const mapItemToType = (item: any): 'stories' | 'savedSections' | 'roleDescriptions' | 'roleMetrics' | 'coverLetterSections' => {
        if (item.item_type === 'story') return 'stories';
        if (item.item_type === 'role_summary') return 'roleDescriptions';
        if (item.item_type === 'role_metrics') return 'roleMetrics';
        if (item.item_type === 'cover_letter_section') return 'coverLetterSections';
        // default bucket by source list
        return workHistoryItems.includes(item) ? 'roleDescriptions' : 'coverLetterSections';
      };

      for (const item of allItems) {
        const t = mapItemToType(item);
        const sev = item.max_severity as 'high' | 'medium' | 'low';
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
          roleMetrics: 0,
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
            roleMetrics: 0,
            coverLetterSections: 0,
          },
          medium: {
            stories: 0,
            savedSections: 0,
            roleDescriptions: 0,
            roleMetrics: 0,
            coverLetterSections: 0,
          },
          low: {
            stories: 0,
            savedSections: 0,
            roleDescriptions: 0,
            roleMetrics: 0,
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
          .from('approved_content')
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
    } catch (error) {
      console.error('Error in resolveGap:', error);
      throw error;
    }
  }

  /**
   * Get content items with gaps, formatted for dashboard widgets
   * Returns ranked list of individual items grouped by content type
   */
  static async getContentItemsWithGaps(userId: string): Promise<GapSummaryByItem> {
    try {
      const { data: gaps, error } = await supabase
        .from('gaps')
        .select('*')
        .eq('user_id', userId)
        .eq('resolved', false);

      if (error) throw error;

      const items: ContentItemWithGaps[] = [];

      // Process gaps and group by entity
      const entityMap = new Map<string, {
        gaps: typeof gaps;
        entity_type: string;
        entity_id: string;
      }>();

      gaps?.forEach((gap: any) => {
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

      // Fetch content metadata for each entity
      for (const [key, entityData] of entityMap.entries()) {
        const [entityType, entityId] = key.split(':');
        const entityGaps = entityData.gaps;
        const maxSeverity = entityGaps.reduce((max, gap) => {
          const severityOrder = { high: 3, medium: 2, low: 1 };
          return severityOrder[gap.severity as keyof typeof severityOrder] > 
                 severityOrder[max as keyof typeof severityOrder] ? gap.severity : max;
        }, entityGaps[0].severity) as 'high' | 'medium' | 'low';

        const gapCategories = [...new Set(entityGaps.map((g: any) => g.gap_category))];

        if (entityType === 'work_item') {
          // Fetch work item with company
          const { data: workItem, error: wiError } = await supabase
            .from('work_items')
            .select('title, description, metrics, company:companies(name)')
            .eq('id', entityId)
            .single();

          if (wiError || !workItem) continue;

          const companyName = (workItem.company as any)?.name || 'Unknown Company';
          const roleTitle = workItem.title;

          // Check if this is role description or metrics gap
          const isRoleDescription = gapCategories.some(cat => 
            cat === 'missing_role_description' || cat === 'generic_role_description'
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
          // Fetch story with work item and company
          const { data: story, error: storyError } = await supabase
            .from('approved_content')
            .select('title, work_item:work_items!work_item_id(id, title, company:companies(name))')
            .eq('id', entityId)
            .single();

          if (storyError || !story) continue;

          const workItem = story.work_item as any;
          const roleTitle = workItem?.title || 'Unknown Role';
          const companyName = workItem?.company?.name || 'Unknown Company';
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
            navigation_params: { roleId: workItem?.id || '', storyId: entityId },
          });
        } else if (entityType === 'saved_section') {
          // Fetch saved section
          const { data: section, error: sectionError } = await supabase
            .from('saved_sections')
            .select('title, type')
            .eq('id', entityId)
            .single();

          if (sectionError || !section) continue;

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
            navigation_path: '/cover-letter-template',
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

      return {
        total: items.length,
        byContentType: {
          workHistory,
          coverLetterSavedSections,
        },
      };
    } catch (error) {
      console.error('Error in getContentItemsWithGaps:', error);
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

