// Content Generation Service
// Human-in-the-Loop Content Creation Feature
// Handles AI-powered content generation with gap validation

import { supabase } from '@/lib/supabase';
import { GapDetectionService, type Gap } from './gapDetectionService';
import {
  buildStoryGenerationPrompt,
  buildRoleDescriptionPrompt,
  buildSavedSectionPrompt,
  CONTENT_GENERATION_SYSTEM_PROMPT,
  type WorkHistoryContext,
  type JobContext
} from '@/prompts/contentGeneration';
import type { ContentVariationInsert } from '@/types/variations';

/**
 * Content generation request parameters
 */
export interface ContentGenerationRequest {
  gap: Gap;
  existingContent: string;
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  workHistoryContext: WorkHistoryContext;
  jobContext?: JobContext;
  sectionType?: 'introduction' | 'closer' | 'signature' | 'custom'; // For saved_section
}

/**
 * Validation result after gap detection
 */
export interface ValidationResult {
  status: 'pass' | 'partial' | 'fail';
  addressedGaps: Gap[];
  remainingGaps: Gap[];
  newGaps: Gap[];
  confidence: number;
  suggestions: string[];
}

/**
 * Content save request parameters
 */
export interface ContentSaveRequest {
  mode: 'replace' | 'variation';
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  content: string;
  userId: string;
  gapId: string;

  // For variations only
  variationData?: {
    title: string;
    gapTags: string[];
    targetJobTitle?: string;
    targetCompany?: string;
    jobDescriptionId?: string;
  };
}

/**
 * OpenAI API response wrapper
 */
interface OpenAIResponse {
  success: boolean;
  data?: string;
  error?: string;
  retryable?: boolean;
}

export class ContentGenerationService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = (import.meta.env?.VITE_OPENAI_KEY) || '';
    this.baseUrl = 'https://api.openai.com/v1';

    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Content generation will not work.');
    }
  }

  /**
   * Generate enhanced content using LLM
   */
  async generateContent(request: ContentGenerationRequest): Promise<string> {
    try {
      // Build appropriate prompt based on entity type
      let userPrompt: string;

      switch (request.entityType) {
        case 'approved_content':
          userPrompt = buildStoryGenerationPrompt(
            request.gap,
            request.existingContent,
            request.workHistoryContext,
            request.jobContext
          );
          break;

        case 'work_item':
          userPrompt = buildRoleDescriptionPrompt(
            request.gap,
            request.existingContent,
            request.workHistoryContext
          );
          break;

        case 'saved_section':
          userPrompt = buildSavedSectionPrompt(
            request.gap,
            request.existingContent,
            request.sectionType || 'custom',
            request.workHistoryContext,
            request.jobContext
          );
          break;

        default:
          throw new Error(`Unsupported entity type: ${request.entityType}`);
      }

      // Call OpenAI API
      const response = await this.callOpenAI(userPrompt, 1000);

      if (!response.success) {
        throw new Error(response.error || 'Content generation failed');
      }

      if (!response.data || response.data.trim().length === 0) {
        throw new Error('Generated content is empty');
      }

      return response.data.trim();

    } catch (error) {
      console.error('Content generation error:', error);
      throw error;
    }
  }

  /**
   * Validate generated content by running gap detection
   * IMPORTANT: Validates ALL gaps for the content item, not just one
   */
  async validateContent(
    content: string,
    allGaps: Gap[], // Array of ALL gaps for this content item
    entityType: 'work_item' | 'approved_content' | 'saved_section',
    userId: string
  ): Promise<ValidationResult> {
    try {
      // Run lightweight validation checks for each gap
      const detectedGaps: Gap[] = [];

      for (const gap of allGaps) {
        let gapStillExists = false;

        // Quick validation based on gap category
        switch (gap.gap_category) {
          case 'incomplete_story':
            gapStillExists = !this.checkSTARFormat(content);
            break;

          case 'missing_metrics':
            gapStillExists = !this.checkForMetrics(content);
            break;

          case 'generic_role_description':
          case 'generic_content':
            gapStillExists = this.checkForGenericContent(content);
            break;

          default:
            // For unknown gap types, assume addressed (optimistic)
            gapStillExists = false;
        }

        if (gapStillExists) {
          detectedGaps.push(gap);
        }
      }

      // Determine which gaps were addressed
      const gapsAddressed = allGaps.filter(
        gap => !detectedGaps.find(detected => detected.id === gap.id)
      );

      // Determine validation status
      const status: ValidationResult['status'] =
        detectedGaps.length === 0 ? 'pass' :
        detectedGaps.length < allGaps.length ? 'partial' : 'fail';

      return {
        status,
        addressedGaps: gapsAddressed,
        remainingGaps: detectedGaps,
        newGaps: [],
        confidence: detectedGaps.length === 0 ? 0.95 : 0.6,
        suggestions: detectedGaps.map(g => g.description || '')
      };

    } catch (error) {
      console.error('Validation error:', error);
      // On validation error, return pass (optimistic) but with low confidence
      return {
        status: 'pass',
        addressedGaps: allGaps,
        remainingGaps: [],
        newGaps: [],
        confidence: 0.3,
        suggestions: ['Unable to validate - please review content carefully']
      };
    }
  }

  /**
   * Save generated content (replace or create variation)
   * Context-dependent logic:
   * - Work History view: Default to REPLACE (improving base content)
   * - Cover Letter Draft view: ALWAYS VARIATION (JD-specific)
   */
  async saveContent(request: ContentSaveRequest): Promise<{ success: boolean; id: string }> {
    try {
      if (request.mode === 'replace') {
        return await this.replaceContent(request);
      } else {
        return await this.createVariation(request);
      }
    } catch (error) {
      console.error('Save content error:', error);
      throw error;
    }
  }

  /**
   * Fetch work history context for content generation
   */
  async fetchWorkHistoryContext(
    userId: string,
    entityType: 'work_item' | 'approved_content' | 'saved_section',
    entityId: string
  ): Promise<WorkHistoryContext> {
    try {
      let currentRole = undefined;
      let metrics: string[] = [];
      let workItemId: string | undefined = undefined;

      // Fetch entity details based on type
      if (entityType === 'work_item') {
        const { data: workItem } = await supabase
          .from('work_items')
          .select('*, companies(name)')
          .eq('id', entityId)
          .eq('user_id', userId)
          .single();

        if (workItem) {
          currentRole = {
            title: workItem.title,
            company: (workItem.companies as any)?.name || '',
            startDate: workItem.start_date,
            endDate: workItem.end_date || undefined
          };
          metrics = workItem.achievements || [];
          workItemId = workItem.id;
        }
      } else if (entityType === 'approved_content') {
        const { data: content } = await supabase
          .from('approved_content')
          .select('*, work_items(*, companies(name))')
          .eq('id', entityId)
          .eq('user_id', userId)
          .single();

        if (content && content.work_items) {
          const workItem = content.work_items as any;
          currentRole = {
            title: workItem.title,
            company: workItem.companies?.name || '',
            startDate: workItem.start_date,
            endDate: workItem.end_date || undefined
          };
          workItemId = workItem.id;
        }
      }
      // For saved_section, we don't have a specific role context

      // Fetch all stories for context (limit to 5 most recent)
      let allStories: Array<{ title: string; content: string; metrics?: string[] }> = [];

      if (workItemId) {
        const { data: stories } = await supabase
          .from('approved_content')
          .select('title, content')
          .eq('work_item_id', workItemId)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        allStories = (stories || []).map(s => ({
          title: s.title,
          content: s.content,
          metrics: undefined // Could extract metrics from content if needed
        }));
      } else {
        // For saved sections or when no work item, fetch user's top stories
        const { data: stories } = await supabase
          .from('approved_content')
          .select('title, content, work_items(title, companies(name))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        allStories = (stories || []).map(s => ({
          title: s.title,
          content: s.content,
          metrics: undefined
        }));
      }

      return {
        userId,
        currentRole,
        allStories,
        metrics
      };

    } catch (error) {
      console.error('Error fetching work history context:', error);
      throw error;
    }
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  /**
   * Replace existing content
   */
  private async replaceContent(request: ContentSaveRequest): Promise<{ success: boolean; id: string }> {
    const tableName = request.entityType === 'work_item' ? 'work_items' :
                     request.entityType === 'approved_content' ? 'approved_content' : 'saved_sections';

    const contentField = request.entityType === 'work_item' ? 'description' : 'content';

    // Update entity content
    const { error } = await supabase
      .from(tableName)
      .update({
        [contentField]: request.content,
        updated_at: new Date().toISOString(),
        addressed_gap_id: request.gapId
      })
      .eq('id', request.entityId)
      .eq('user_id', request.userId);

    if (error) throw error;

    // Mark gap as resolved
    await GapDetectionService.resolveGap(
      request.gapId,
      request.userId,
      'content_added',
      request.entityId
    );

    return { success: true, id: request.entityId };
  }

  /**
   * Create variation
   */
  private async createVariation(request: ContentSaveRequest): Promise<{ success: boolean; id: string }> {
    if (!request.variationData) {
      throw new Error('Variation data required for variation mode');
    }

    // Validate parent entity type
    if (request.entityType === 'work_item') {
      throw new Error('Variations not supported for work_item - use replace mode');
    }

    const variationInsert: ContentVariationInsert = {
      user_id: request.userId,
      parent_entity_type: request.entityType,
      parent_entity_id: request.entityId,
      title: request.variationData.title,
      content: request.content,
      filled_gap_id: request.gapId,
      gap_tags: request.variationData.gapTags,
      target_job_title: request.variationData.targetJobTitle,
      target_company: request.variationData.targetCompany,
      job_description_id: request.variationData.jobDescriptionId,
      created_by: 'AI'
    };

    const { data: variation, error } = await supabase
      .from('content_variations')
      .insert(variationInsert)
      .select()
      .single();

    if (error) throw error;

    // Mark gap as resolved with variation ID
    await GapDetectionService.resolveGap(
      request.gapId,
      request.userId,
      'content_added',
      variation.id
    );

    return { success: true, id: variation.id };
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(userPrompt: string, maxTokens: number = 1000): Promise<OpenAIResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Use cheaper model for content generation
          messages: [
            {
              role: 'system',
              content: CONTENT_GENERATION_SYSTEM_PROMPT
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          max_tokens: maxTokens,
          temperature: 0.7, // Balanced creativity
          top_p: 0.9,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return {
        success: true,
        data: content
      };

    } catch (error) {
      console.error('OpenAI API call error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OpenAI API call failed',
        retryable: true
      };
    }
  }

  /**
   * Check for STAR format (Situation, Task, Action, Result)
   */
  private checkSTARFormat(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    // STAR format should have at least 3 sentences and reasonable length
    return sentences.length >= 3 && content.length > 100;
  }

  /**
   * Check for specific metrics in content
   */
  private checkForMetrics(content: string): boolean {
    const metricPatterns = [
      /\d+%/,                    // 25%
      /\d+x/i,                   // 3x
      /\$[\d,]+/,                // $100,000
      /\d+\s*(month|year|week|day)s?/i, // 6 months
      /increased.*?\d+/i,        // increased by 30
      /reduced.*?\d+/i,          // reduced costs by 40
      /improved.*?\d+/i,         // improved performance by 20
      /grew.*?\d+/i,             // grew revenue by 50
      /\d+\s*(user|customer|client)s?/i, // 10,000 users
    ];

    return metricPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Check if content is too generic
   */
  private checkForGenericContent(content: string): boolean {
    const genericPhrases = [
      'led the team',
      'managed projects',
      'worked with stakeholders',
      'responsible for',
      'duties included',
    ];

    const hasGenericPhrase = genericPhrases.some(phrase =>
      content.toLowerCase().includes(phrase)
    );

    const hasNoMetrics = !this.checkForMetrics(content);

    // Generic if it has generic phrases AND no metrics
    return hasGenericPhrase && hasNoMetrics;
  }
}
