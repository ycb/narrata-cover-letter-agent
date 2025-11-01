/**
 * Gap Detection Service
 * Phase 3: Gap Detection Service Implementation
 * 
 * Detects three types of gaps:
 * 1. Story Completeness - Missing STAR format or metrics
 * 2. Missing Metrics - Stories without quantified metrics
 * 3. Generic Content - LLM-as-judge for "too generic" descriptions
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
    },
    stories?: Array<{
      id: string;
      title: string;
      content: string;
      metrics?: any[];
    }>
  ): Promise<Gap[]> {
    const gaps: Gap[] = [];

    // Detect gaps in stories (if any)
    if (stories && stories.length > 0) {
      for (const story of stories) {
        const storyGaps = await this.detectStoryGaps(userId, story, workItemId);
        gaps.push(...storyGaps);
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

    // 1. Story Completeness Gap
    const completenessGap = this.checkStoryCompleteness(story);
    if (completenessGap) {
      gaps.push({
        user_id: userId,
        entity_type: 'approved_content',
        entity_id: story.id,
        gap_type: 'data_quality',
        gap_category: 'incomplete_story',
        severity: completenessGap.missingComponents.length > 1 ? 'high' : 'medium',
        description: `Story "${story.title}" is missing: ${completenessGap.missingComponents.join(', ')}`,
        suggestions: this.generateCompletenessSuggestions(completenessGap)
      });
    }

    // 2. Missing Metrics Gap
    const metricGap = this.checkMissingMetrics(story);
    if (metricGap) {
      gaps.push({
        user_id: userId,
        entity_type: 'approved_content',
        entity_id: story.id,
        gap_type: 'best_practice',
        gap_category: 'missing_metrics',
        severity: 'medium',
        description: `Story "${story.title}" has no quantified metrics. Add metrics to demonstrate impact.`,
        suggestions: [
          {
            type: 'add_metric',
            description: 'Add quantified metrics (percentages, dollar amounts, timeframes, etc.)'
          }
        ]
      });
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
        description: `Story "${story.title}" may be too generic: ${genericGap.reasoning || 'Lacks specific details and measurable outcomes'}`,
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
   */
  static async saveGaps(gaps: Gap[]): Promise<void> {
    if (gaps.length === 0) return;

    try {
      // Filter out gaps that already exist (to avoid duplicates)
      const existingGaps = await this.getExistingGaps(
        gaps[0].user_id,
        gaps.map(g => ({ type: g.entity_type, id: g.entity_id }))
      );

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

      const { error } = await supabase
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
   * Get existing gaps for entities
   */
  private static async getExistingGaps(
    userId: string,
    entities: Array<{ type: 'work_item' | 'approved_content'; id: string }>
  ): Promise<Gap[]> {
    try {
      const conditions = entities.map(e => 
        `(entity_type = '${e.type}' AND entity_id = '${e.id}')`
      ).join(' OR ');

      const { data, error } = await supabase
        .from('gaps')
        .select('*')
        .eq('user_id', userId)
        .or(conditions)
        .eq('resolved', false);

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
   * Resolve a gap
   */
  static async resolveGap(
    gapId: string,
    userId: string,
    reason: 'user_override' | 'content_added' | 'manual_resolve' | 'no_longer_applicable'
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('gaps')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_reason: reason,
          updated_at: new Date().toISOString()
        })
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
}

