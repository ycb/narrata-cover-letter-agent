/**
 * Evaluation Event Logger Service
 * 
 * Centralized, type-safe event emission for all evaluation tracking.
 * Follows composition pattern: single responsibility = event logging.
 * 
 * Used by:
 * - JobDescriptionService: JD parsing events
 * - HIL handlers: Story, saved section, draft content events
 * 
 * Stores events in evaluation_runs table for dashboard analysis.
 */

import { supabase } from '@/lib/supabase';
import type {
  JDParseEvent,
  HILStoryEvent,
  HILSavedSectionEvent,
  HILDraftEvent,
  HILContentEvent,
  EvaluationEvent,
} from '@/types/evaluationEvents';

interface LogEventOptions {
  accessToken?: string;
}

/**
 * Centralized event logger - single source of truth for all evaluation event emission
 */
export class EvaluationEventLogger {
  /**
   * Log JD parsing event
   */
  static async logJDParse(
    event: JDParseEvent,
    options: LogEventOptions = {}
  ): Promise<{ success: boolean; runId?: string; error?: string }> {
    try {
      const dbClient = options.accessToken ? supabase : supabase;

      const payload = {
        user_id: event.userId,
        session_id: event.syntheticProfileId ? `synthetic-${event.syntheticProfileId}` : undefined,
        source_id: null, // JD parsing is not tied to a file source
        file_type: 'jd_parse',
        user_type: event.syntheticProfileId ? 'synthetic' : 'real',
        synthetic_profile_id: event.syntheticProfileId || null,

        // JD parse specific columns
        jd_parse_event: {
          jobDescriptionId: event.jobDescriptionId,
          company: event.company,
          role: event.role,
          requirements: event.requirements || [],
          differentiatorSummary: event.differentiatorSummary,
          rawTextChecksum: event.rawTextChecksum,
          sourceUrl: event.sourceUrl,
        },
        jd_parse_status: event.status,

        // Performance metrics
        input_tokens: event.inputTokens,
        output_tokens: event.outputTokens,
        llm_analysis_latency_ms: Math.round(event.latency),
        total_latency_ms: Math.round(event.latency),

        // Standard evaluation fields
        model: event.model || 'gpt-4',
        accuracy_score: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        relevance_score: '✅ Relevant',
        personalization_score: '✅ Personalized',
        clarity_tone_score: '✅ Clear',
        framework_score: '✅ Structured',
        go_nogo_decision: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        evaluation_rationale:
          event.status === 'success'
            ? `JD parsed successfully: ${event.company} - ${event.role}`
            : `JD parse failed: ${event.error || 'Unknown error'}`,
      };

      const { data, error } = await dbClient
        .from('evaluation_runs')
        .insert([payload as any])
        .select('id');

      if (error) {
        console.error('[EvaluationEventLogger] JD parse logging failed:', error);
        return { success: false, error: error.message };
      }

      const runId = Array.isArray(data) && data[0] ? (data[0] as any).id : undefined;
      return { success: true, runId };
    } catch (e) {
      console.error('[EvaluationEventLogger] Unexpected error logging JD parse:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  /**
   * Log HIL story content event
   */
  static async logHILStory(
    event: HILStoryEvent,
    options: LogEventOptions = {}
  ): Promise<{ success: boolean; runId?: string; error?: string }> {
    try {
      const dbClient = options.accessToken ? supabase : supabase;

      const payload = {
        user_id: event.userId,
        session_id: event.draftId ? `draft-${event.draftId}` : undefined,
        source_id: event.storyId || null,
        file_type: 'hil_story',
        user_type: event.syntheticProfileId ? 'synthetic' : 'real',
        synthetic_profile_id: event.syntheticProfileId || null,

        // HIL content specific columns
        hil_content_type: 'story',
        hil_action: event.action,
        hil_content_id: event.storyId,
        hil_content_word_delta: event.wordDelta,
        hil_gap_coverage: event.gapCoverage || null,
        hil_gaps_addressed: event.gapsAddressed || [],
        hil_status: event.status,

        // Performance metrics
        llm_analysis_latency_ms: Math.round(event.latency),
        total_latency_ms: Math.round(event.latency),

        // Standard evaluation fields
        model: event.model || 'gpt-4',
        accuracy_score: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        relevance_score: '✅ Relevant',
        personalization_score: event.action === 'ai_suggest' ? '✅ Personalized' : '⚠️ Manual',
        clarity_tone_score: '✅ Clear',
        framework_score: '✅ Structured',
        go_nogo_decision: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        evaluation_rationale:
          event.status === 'success'
            ? `HIL story ${event.action}: +${event.wordDelta} words`
            : `HIL story failed: ${event.error || 'Unknown error'}`,
      };

      const { data, error } = await dbClient
        .from('evaluation_runs')
        .insert([payload as any])
        .select('id');

      if (error) {
        console.error('[EvaluationEventLogger] HIL story logging failed:', error);
        return { success: false, error: error.message };
      }

      const runId = Array.isArray(data) && data[0] ? (data[0] as any).id : undefined;
      return { success: true, runId };
    } catch (e) {
      console.error('[EvaluationEventLogger] Unexpected error logging HIL story:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  /**
   * Log HIL saved section content event
   */
  static async logHILSavedSection(
    event: HILSavedSectionEvent,
    options: LogEventOptions = {}
  ): Promise<{ success: boolean; runId?: string; error?: string }> {
    try {
      const dbClient = options.accessToken ? supabase : supabase;

      const payload = {
        user_id: event.userId,
        session_id: event.draftId ? `draft-${event.draftId}` : undefined,
        source_id: event.savedSectionId || null,
        file_type: 'hil_saved_section',
        user_type: event.syntheticProfileId ? 'synthetic' : 'real',
        synthetic_profile_id: event.syntheticProfileId || null,

        // HIL content specific columns
        hil_content_type: 'saved_section',
        hil_action: event.action,
        hil_content_id: event.savedSectionId,
        hil_content_word_delta: event.wordDelta,
        hil_gap_coverage: event.gapCoverage || null,
        hil_gaps_addressed: event.gapsAddressed || [],
        hil_status: event.status,

        // Performance metrics
        llm_analysis_latency_ms: Math.round(event.latency),
        total_latency_ms: Math.round(event.latency),

        // Standard evaluation fields
        model: event.model || 'gpt-4',
        accuracy_score: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        relevance_score: '✅ Relevant',
        personalization_score: event.action === 'ai_suggest' ? '✅ Personalized' : '⚠️ Manual',
        clarity_tone_score: '✅ Clear',
        framework_score: '✅ Structured',
        go_nogo_decision: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        evaluation_rationale:
          event.status === 'success'
            ? `HIL saved section ${event.action}: +${event.wordDelta} words`
            : `HIL saved section failed: ${event.error || 'Unknown error'}`,
      };

      const { data, error } = await dbClient
        .from('evaluation_runs')
        .insert([payload as any])
        .select('id');

      if (error) {
        console.error('[EvaluationEventLogger] HIL saved section logging failed:', error);
        return { success: false, error: error.message };
      }

      const runId = Array.isArray(data) && data[0] ? (data[0] as any).id : undefined;
      return { success: true, runId };
    } catch (e) {
      console.error('[EvaluationEventLogger] Unexpected error logging HIL saved section:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }

  /**
   * Log HIL draft content event
   */
  static async logHILDraft(
    event: HILDraftEvent,
    options: LogEventOptions = {}
  ): Promise<{ success: boolean; runId?: string; error?: string }> {
    try {
      const dbClient = options.accessToken ? supabase : supabase;

      const payload = {
        user_id: event.userId,
        session_id: `draft-${event.draftId}`,
        source_id: event.draftId,
        file_type: 'hil_draft',
        user_type: event.syntheticProfileId ? 'synthetic' : 'real',
        synthetic_profile_id: event.syntheticProfileId || null,

        // HIL content specific columns
        hil_content_type: 'cover_letter_draft',
        hil_action: event.action,
        hil_content_id: event.draftId,
        hil_content_word_delta: event.wordDelta,
        hil_gap_coverage: event.gapCoverage || null,
        hil_gaps_addressed: event.gapsAddressed || [],
        hil_status: event.status,

        // Performance metrics
        llm_analysis_latency_ms: Math.round(event.latency),
        total_latency_ms: Math.round(event.latency),

        // Standard evaluation fields
        model: event.model || 'gpt-4',
        accuracy_score: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        relevance_score: '✅ Relevant',
        personalization_score: event.action === 'ai_suggest' ? '✅ Personalized' : '⚠️ Manual',
        clarity_tone_score: '✅ Clear',
        framework_score: '✅ Structured',
        go_nogo_decision: event.status === 'success' ? '✅ Go' : '❌ No-Go',
        evaluation_rationale:
          event.status === 'success'
            ? `HIL draft [${event.sectionName}] ${event.action}: +${event.wordDelta} words, gaps: ${event.initialGapCount} → ${event.finalGapCount}`
            : `HIL draft failed: ${event.error || 'Unknown error'}`,
      };

      const { data, error } = await dbClient
        .from('evaluation_runs')
        .insert([payload as any])
        .select('id');

      if (error) {
        console.error('[EvaluationEventLogger] HIL draft logging failed:', error);
        return { success: false, error: error.message };
      }

      const runId = Array.isArray(data) && data[0] ? (data[0] as any).id : undefined;
      return { success: true, runId };
    } catch (e) {
      console.error('[EvaluationEventLogger] Unexpected error logging HIL draft:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  }
}


