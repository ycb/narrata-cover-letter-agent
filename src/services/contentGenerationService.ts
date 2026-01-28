// Content Generation Service
// Human-in-the-Loop Content Creation Feature
// Handles AI-powered content generation with gap validation

import { supabase } from '@/lib/supabase';
import { GapDetectionService, type Gap } from './gapDetectionService';
import { EvaluationEventLogger } from './evaluationEventLogger';
import { EvalsLogger } from './evalsLogger';
import { getHilGenerationModelId } from './openaiModel';
import {
  buildStoryGenerationPrompt,
  buildRoleDescriptionPrompt,
  buildSavedSectionPrompt,
  CONTENT_GENERATION_SYSTEM_PROMPT,
  type WorkHistoryContext,
  type JobContext
} from '@/prompts/contentGeneration';
import type { ContentVariationInsert } from '@/types/variations';
import type { HILStoryEvent, HILSavedSectionEvent } from '@/types/evaluationEvents';

/**
 * Content generation request parameters
 */
export interface ContentGenerationRequest {
  gap: Gap;
  existingContent: string;
  entityType: 'work_item' | 'approved_content' | 'saved_section';
  entityId: string;
  workHistoryContext: WorkHistoryContext;
  userVoicePrompt?: string;
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
    this.apiKey = (import.meta.env?.VITE_OPENAI_API_KEY) || '';
    this.baseUrl = 'https://api.openai.com/v1';

    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Content generation will not work.');
    }
  }

  /**
   * Generate enhanced content using LLM
   * Returns content and metadata for evaluation logging
   */
  async generateContent(
    request: ContentGenerationRequest,
    options?: {
      userId?: string;
      startTime?: number;
      syntheticProfileId?: string;
    }
  ): Promise<string> {
    const startTime = options?.startTime || Date.now();
    
    // Determine stage name based on entity type
    const stageName = 
      request.entityType === 'approved_content' ? 'hil.contentGeneration.story' :
      request.entityType === 'work_item' ? 'hil.contentGeneration.roleDesc' :
      'hil.contentGeneration.savedSection';
    
    // Initialize evals logger if userId is available
    const evalsLogger = options?.userId ? new EvalsLogger({
      userId: options.userId,
      stage: stageName,
    }) : null;
    
    evalsLogger?.start();
    
    try {
      // Build appropriate prompt based on entity type
      let userPrompt: string;

      switch (request.entityType) {
        case 'approved_content':
          userPrompt = buildStoryGenerationPrompt(
            request.gap,
            request.existingContent,
            request.workHistoryContext,
            request.jobContext,
            request.userVoicePrompt
          );
          break;

        case 'work_item':
          userPrompt = buildRoleDescriptionPrompt(
            request.gap,
            request.existingContent,
            request.workHistoryContext,
            request.userVoicePrompt
          );
          break;

        case 'saved_section':
          userPrompt = buildSavedSectionPrompt(
            request.gap,
            request.existingContent,
            request.sectionType || 'custom',
            request.workHistoryContext,
            request.jobContext,
            request.userVoicePrompt
          );
          break;

        default:
          throw new Error(`Unsupported entity type: ${request.entityType}`);
      }

      // Call OpenAI API
      const modelId = getHilGenerationModelId();
      const response = await this.callOpenAI(userPrompt, 1000);

      if (!response.success) {
        // Log failure to evals
        await evalsLogger?.failure(new Error(response.error || 'Content generation failed'), {
          model: modelId,
        });
        
        // Log failure for story/saved section generation (existing logging)
        if (options?.userId && (request.entityType === 'approved_content' || request.entityType === 'saved_section')) {
          await this.logGenerationFailure(request, options, startTime, response.error);
        }
        throw new Error(response.error || 'Content generation failed');
      }

      if (!response.data || response.data.trim().length === 0) {
        // Log failure to evals
        await evalsLogger?.failure(new Error('Generated content is empty'), {
          model: modelId,
        });
        
        if (options?.userId && (request.entityType === 'approved_content' || request.entityType === 'saved_section')) {
          await this.logGenerationFailure(request, options, startTime, 'Generated content is empty');
        }
        throw new Error('Generated content is empty');
      }

      // Log success to evals
      await evalsLogger?.success({
        model: modelId,
        tokens: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
      });

      return response.data.trim();

    } catch (error) {
      // Log failure to evals if not already logged
      if (evalsLogger && error instanceof Error) {
        await evalsLogger.failure(error, { model: getHilGenerationModelId() });
      }
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

          // Back-compat: legacy "generic" categories
          case 'generic_role_description':
          case 'too_generic':
          case 'generic_cover_letter_section':
          // New standards-based categories ("needs specifics")
          case 'role_description_needs_specifics':
          case 'story_needs_specifics':
          case 'saved_section_needs_specifics':
          // Legacy catch-all
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
  async saveContent(
    request: ContentSaveRequest,
    options?: {
      initialContent?: string;
      generatedContent?: string;
      startTime?: number;
      syntheticProfileId?: string;
      draftId?: string;
    }
  ): Promise<{ success: boolean; id: string }> {
    const startTime = options?.startTime || Date.now();
    const initialContent = options?.initialContent || '';
    const initialWordCount = this.countWords(initialContent);
    
    try {
      let result: { success: boolean; id: string };
      
      if (request.mode === 'replace') {
        result = await this.replaceContent(request);
      } else {
        result = await this.createVariation(request);
      }

      // Log HIL event after successful save
      if (request.entityType === 'approved_content') {
        await this.logStoryEvent(request, result.id, initialWordCount, options, startTime);
      } else if (request.entityType === 'saved_section') {
        await this.logSavedSectionEvent(request, result.id, initialWordCount, options, startTime);
      }

      return result;
    } catch (error) {
      // Log failure event
      if (request.entityType === 'approved_content') {
        await this.logStoryEvent(request, request.entityId, initialWordCount, options, startTime, error);
      } else if (request.entityType === 'saved_section') {
        await this.logSavedSectionEvent(request, request.entityId, initialWordCount, options, startTime, error);
      }
      
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
          .from('stories')
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
        } else {
          const { data: fragment } = await supabase
            .from('story_fragments')
            .select('work_items(id,title,start_date,end_date,companies(name))')
            .eq('id', entityId)
            .eq('user_id', userId)
            .maybeSingle();

          const workItem = fragment?.work_items as any;
          if (workItem) {
            currentRole = {
              title: workItem.title,
              company: workItem.companies?.name || '',
              startDate: workItem.start_date,
              endDate: workItem.end_date || undefined
            };
            workItemId = workItem.id;
          }
        }
      }
      // For saved_section, we don't have a specific role context

      // Fetch all stories for context (limit to 5 most recent)
      let allStories: Array<{ title: string; content: string; metrics?: string[] }> = [];

      if (workItemId) {
        const { data: stories } = await supabase
          .from('stories')
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
          .from('stories')
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
        metrics,
        unresolvedGaps: await this.fetchUnresolvedGaps(userId, entityType, entityId, workItemId),
      };

    } catch (error) {
      console.error('Error fetching work history context:', error);
      throw error;
    }
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private async fetchUnresolvedGaps(
    userId: string,
    entityType: 'work_item' | 'approved_content' | 'saved_section',
    entityId: string,
    workItemId?: string
  ): Promise<Array<{ id: string; category: string; severity: 'high' | 'medium' | 'low'; description?: string }>> {
    try {
      const gaps = await GapDetectionService.getUserGaps(userId);
      const unresolved = (gaps || []).filter(gap => !gap.resolved);

      const matchingGaps = unresolved.filter(gap => {
        if (gap.entity_id === entityId) return true;
        if (workItemId && gap.entity_id === workItemId) return true;
        return false;
      });

      return matchingGaps.map(gap => ({
        id: gap.id || '',
        category: gap.gap_category,
        severity: gap.severity,
        description: gap.description,
      }));
    } catch (error) {
      console.warn('[ContentGenerationService] Unable to fetch unresolved gaps for context', error);
      return [];
    }
  }

  /**
   * Replace existing content
   */
  private async replaceContent(request: ContentSaveRequest): Promise<{ success: boolean; id: string }> {
    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const gapIdIsUuid = isUuid(String(request.gapId || ''));

    const tableName = request.entityType === 'work_item' ? 'work_items' :
                     request.entityType === 'approved_content' ? 'approved_content' : 'saved_sections';

    const contentField = request.entityType === 'work_item' ? 'description' : 'content';

    // Update entity content
    const { error } = await supabase
      .from(tableName)
      .update({
        [contentField]: request.content,
        updated_at: new Date().toISOString(),
        ...(gapIdIsUuid ? { addressed_gap_id: request.gapId } : {})
      })
      .eq('id', request.entityId)
      .eq('user_id', request.userId);

    if (error) throw error;

    // Mark gap as resolved
    if (gapIdIsUuid) {
      await GapDetectionService.resolveGap(
        request.gapId,
        request.userId,
        'content_added',
        request.entityId
      );
    }

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

    const normalizeVariationContent = (value: string): string =>
      value.replace(/\s+/g, ' ').trim().toLowerCase();
    const cleaned = normalizeVariationContent(request.content || '');
    const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const gapIdIsUuid = isUuid(String(request.gapId || ''));

    const { data: existingVariations, error: existingError } = await supabase
      .from('content_variations')
      .select('id, content, filled_gap_id, gap_tags')
      .eq('user_id', request.userId)
      .eq('parent_entity_type', request.entityType)
      .eq('parent_entity_id', request.entityId);

    if (!existingError && (existingVariations || []).length > 0 && cleaned) {
      const duplicate = (existingVariations || []).find((variation: any) =>
        normalizeVariationContent(String(variation.content || '')) === cleaned,
      );

      if (duplicate?.id) {
        const mergedTags = Array.from(
          new Set([...(duplicate.gap_tags ?? []), ...(request.variationData.gapTags ?? [])]),
        );

        if (gapIdIsUuid && (!duplicate.filled_gap_id || mergedTags.length !== (duplicate.gap_tags ?? []).length)) {
          const updatePayload: { filled_gap_id?: string; gap_tags?: string[] } = {};
          if (!duplicate.filled_gap_id) {
            updatePayload.filled_gap_id = request.gapId;
          }
          if (mergedTags.length !== (duplicate.gap_tags ?? []).length) {
            updatePayload.gap_tags = mergedTags;
          }
          if (Object.keys(updatePayload).length > 0) {
            await supabase.from('content_variations').update(updatePayload).eq('id', duplicate.id);
          }
        }

        if (gapIdIsUuid) {
          await GapDetectionService.resolveGap(
            request.gapId,
            request.userId,
            'content_added',
            duplicate.id,
          );
        }

        return { success: true, id: duplicate.id };
      }
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
      const modelId = getHilGenerationModelId();
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId,
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

  // ==========================================
  // Evaluation Logging Helpers
  // ==========================================

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    if (!content || content.trim().length === 0) return 0;
    return content.trim().split(/\s+/).length;
  }

  /**
   * Calculate gap coverage from validation result
   */
  private calculateGapCoverage(
    addressedGaps: Gap[],
    remainingGaps: Gap[]
  ): { closedGapIds: string[]; remainingGapCount: number; gapCoveragePercentage: number } {
    const closedGapIds = addressedGaps.map(g => g.id);
    const totalGaps = addressedGaps.length + remainingGaps.length;
    const gapCoveragePercentage = totalGaps > 0 
      ? (addressedGaps.length / totalGaps) * 100 
      : 0;

    return {
      closedGapIds,
      remainingGapCount: remainingGaps.length,
      gapCoveragePercentage: Math.round(gapCoveragePercentage),
    };
  }

  /**
   * Log HIL story event
   */
  private async logStoryEvent(
    request: ContentSaveRequest,
    storyId: string,
    initialWordCount: number,
    options: { startTime?: number; syntheticProfileId?: string; draftId?: string } | undefined,
    startTime: number,
    error?: unknown
  ): Promise<void> {
    try {
      // Fetch final content to calculate word count
      const { data: story } = await supabase
        .from('stories')
        .select('content, work_item_id')
        .eq('id', storyId)
        .eq('user_id', request.userId)
        .single();

      const finalContent = story?.content || request.content;
      const finalWordCount = this.countWords(finalContent);
      const wordDelta = finalWordCount - initialWordCount;

      // Determine action type
      const action = request.mode === 'replace' ? 'apply_suggestion' : 'ai_suggest';

      // Get gap coverage if available
      let gapCoverage;
      let gapsAddressed: string[] = [];
      
      if (!error) {
        // Try to get gap information
        const { data: gap } = await supabase
          .from('gaps')
          .select('id')
          .eq('id', request.gapId)
          .single();

        if (gap) {
          gapsAddressed = [request.gapId];
          gapCoverage = {
            closedGapIds: [request.gapId],
            remainingGapCount: 0, // Simplified - would need full gap analysis
            gapCoveragePercentage: 100,
          };
        }
      }

      const event: HILStoryEvent = {
        userId: request.userId,
        storyId,
        workItemId: (story?.work_item_id as string) || request.entityId,
        contentSource: 'story',
        action,
        initialWordCount,
        finalWordCount,
        wordDelta,
        gapCoverage,
        gapsAddressed,
        latency: Date.now() - startTime,
        status: error ? 'failed' : 'success',
        error: error instanceof Error ? error.message : undefined,
        syntheticProfileId: options?.syntheticProfileId,
        draftId: options?.draftId,
      };

      await EvaluationEventLogger.logHILStory(event);
    } catch (logError) {
      console.error('[ContentGenerationService] Failed to log HIL story event:', logError);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Log HIL saved section event
   */
  private async logSavedSectionEvent(
    request: ContentSaveRequest,
    savedSectionId: string,
    initialWordCount: number,
    options: { startTime?: number; syntheticProfileId?: string; draftId?: string } | undefined,
    startTime: number,
    error?: unknown
  ): Promise<void> {
    try {
      // Fetch final content to calculate word count
      const { data: section } = await supabase
        .from('saved_sections')
        .select('content')
        .eq('id', savedSectionId)
        .eq('user_id', request.userId)
        .single();

      const finalContent = section?.content || request.content;
      const finalWordCount = this.countWords(finalContent);
      const wordDelta = finalWordCount - initialWordCount;

      // Determine action type
      const action = request.mode === 'replace' ? 'apply_suggestion' : 'ai_suggest';

      // Get gap coverage
      let gapCoverage;
      let gapsAddressed: string[] = [];
      
      if (!error) {
        const { data: gap } = await supabase
          .from('gaps')
          .select('id')
          .eq('id', request.gapId)
          .single();

        if (gap) {
          gapsAddressed = [request.gapId];
          gapCoverage = {
            closedGapIds: [request.gapId],
            remainingGapCount: 0,
            gapCoveragePercentage: 100,
          };
        }
      }

      const event: HILSavedSectionEvent = {
        userId: request.userId,
        savedSectionId,
        contentSource: 'saved_section',
        action,
        initialWordCount,
        finalWordCount,
        wordDelta,
        gapCoverage,
        gapsAddressed,
        latency: Date.now() - startTime,
        status: error ? 'failed' : 'success',
        error: error instanceof Error ? error.message : undefined,
        syntheticProfileId: options?.syntheticProfileId,
        draftId: options?.draftId,
      };

      await EvaluationEventLogger.logHILSavedSection(event);
    } catch (logError) {
      console.error('[ContentGenerationService] Failed to log HIL saved section event:', logError);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Log generation failure
   */
  private async logGenerationFailure(
    request: ContentGenerationRequest,
    options: { userId?: string; syntheticProfileId?: string } | undefined,
    startTime: number,
    error: string | undefined
  ): Promise<void> {
    if (!options?.userId) return;

    try {
      const initialWordCount = this.countWords(request.existingContent);

      if (request.entityType === 'approved_content') {
        const event: HILStoryEvent = {
          userId: options.userId,
          workItemId: request.entityId,
          contentSource: 'story',
          action: 'ai_suggest',
          initialWordCount,
          finalWordCount: initialWordCount,
          wordDelta: 0,
          latency: Date.now() - startTime,
          status: 'failed',
          error,
          syntheticProfileId: options.syntheticProfileId,
        };
        await EvaluationEventLogger.logHILStory(event);
      } else if (request.entityType === 'saved_section') {
        const event: HILSavedSectionEvent = {
          userId: options.userId,
          contentSource: 'saved_section',
          action: 'ai_suggest',
          initialWordCount,
          finalWordCount: initialWordCount,
          wordDelta: 0,
          latency: Date.now() - startTime,
          status: 'failed',
          error,
          syntheticProfileId: options.syntheticProfileId,
        };
        await EvaluationEventLogger.logHILSavedSection(event);
      }
    } catch (logError) {
      console.error('[ContentGenerationService] Failed to log generation failure:', logError);
    }
  }
}
