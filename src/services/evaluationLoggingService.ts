import { supabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/supabase';

type SupabaseClient = typeof supabase;

export interface CreateEvaluationRunOptions {
  userId: string;
  sessionId: string;
  fileType: string;
  sourceId?: string | null;
  rawText?: string | null;
  metadata?: Record<string, unknown>;
  syntheticProfileId?: string | null;
}

export interface UpdateEvaluationRunOptions {
  structuredData?: Record<string, unknown>;
  totalLatencyMs?: number;
  llmAnalysisLatencyMs?: number;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  evaluationRationale?: string;
  goNogoDecision?: string;
  accuracyScore?: string;
  relevanceScore?: string;
  personalizationScore?: string;
  clarityToneScore?: string;
  frameworkScore?: string;
  heuristics?: Json;
}

export interface EvaluationLoggingServiceOptions {
  supabaseClient?: SupabaseClient;
  now?: () => Date;
}

/**
 * Centralized service for logging evaluation runs to the evaluations dashboard.
 * Follows composition pattern - can be injected into services for testability.
 */
export class EvaluationLoggingService {
  private readonly supabaseClient: SupabaseClient;
  private readonly now: () => Date;

  constructor(options: EvaluationLoggingServiceOptions = {}) {
    this.supabaseClient = options.supabaseClient ?? supabase;
    this.now = options.now ?? (() => new Date());
  }

  /**
   * Create a new evaluation run record.
   * Returns the run ID for subsequent updates.
   */
  async createRun(options: CreateEvaluationRunOptions): Promise<string> {
    const { userId, sessionId, fileType, sourceId, rawText, metadata, syntheticProfileId } = options;

    const userType = syntheticProfileId ? 'synthetic' : 'real';

    const insertPayload: Database['public']['Tables']['evaluation_runs']['Insert'] = {
      user_id: userId,
      session_id: sessionId,
      source_id: sourceId ?? null,
      file_type: fileType,
      user_type: userType,
      synthetic_profile_id: syntheticProfileId ?? null,
      raw_text: rawText ?? null,
      structured_data: {
        stage: 'started',
        metadata: metadata ?? {},
        tokenSamples: [],
      } as unknown as Json,
      created_at: this.now().toISOString(),
      updated_at: this.now().toISOString(),
    };

    const { data, error } = await this.supabaseClient
      .from('evaluation_runs')
      .insert(insertPayload)
      .select('id')
      .single();

    if (error || !data) {
      console.error('[EvaluationLoggingService] Failed to create evaluation run:', error);
      throw new Error(`Failed to create evaluation run: ${error?.message ?? 'Unknown error'}`);
    }

    return data.id;
  }

  /**
   * Update an existing evaluation run with new data.
   * Performs deep merge on structured_data to preserve existing fields.
   */
  async updateRun(runId: string, options: UpdateEvaluationRunOptions): Promise<void> {
    const existing = await this.getRun(runId);
    if (!existing) {
      console.warn(`[EvaluationLoggingService] Run ${runId} not found for update`);
      return;
    }

    const existingStructuredData =
      existing.structured_data && typeof existing.structured_data === 'object'
        ? (existing.structured_data as Record<string, unknown>)
        : {};

    const mergedStructuredData = {
      ...existingStructuredData,
      ...(options.structuredData ?? {}),
      // Deep merge metadata if both exist
      metadata:
        existingStructuredData.metadata && options.structuredData?.metadata
          ? {
              ...(existingStructuredData.metadata as Record<string, unknown>),
              ...(options.structuredData.metadata as Record<string, unknown>),
            }
          : options.structuredData?.metadata ?? existingStructuredData.metadata,
      // Preserve tokenSamples array
      tokenSamples: existingStructuredData.tokenSamples ?? [],
    };

    const updatePayload: Database['public']['Tables']['evaluation_runs']['Update'] = {
      updated_at: this.now().toISOString(),
      ...(options.totalLatencyMs !== undefined && { total_latency_ms: options.totalLatencyMs }),
      ...(options.llmAnalysisLatencyMs !== undefined && {
        llm_analysis_latency_ms: options.llmAnalysisLatencyMs,
      }),
      ...(options.model && { model: options.model }),
      ...(options.inputTokens !== undefined && { input_tokens: options.inputTokens }),
      ...(options.outputTokens !== undefined && { output_tokens: options.outputTokens }),
      ...(options.evaluationRationale && { evaluation_rationale: options.evaluationRationale }),
      ...(options.goNogoDecision && { go_nogo_decision: options.goNogoDecision }),
      ...(options.accuracyScore && { accuracy_score: options.accuracyScore }),
      ...(options.relevanceScore && { relevance_score: options.relevanceScore }),
      ...(options.personalizationScore && { personalization_score: options.personalizationScore }),
      ...(options.clarityToneScore && { clarity_tone_score: options.clarityToneScore }),
      ...(options.frameworkScore && { framework_score: options.frameworkScore }),
      ...(options.heuristics && { heuristics: options.heuristics }),
      structured_data: mergedStructuredData as unknown as Json,
    };

    const { error } = await this.supabaseClient
      .from('evaluation_runs')
      .update(updatePayload)
      .eq('id', runId);

    if (error) {
      console.error(`[EvaluationLoggingService] Failed to update run ${runId}:`, error);
      throw new Error(`Failed to update evaluation run: ${error.message}`);
    }
  }

  /**
   * Append a token sample to the evaluation run.
   * Samples: first token, every 10th token, and last token.
   */
  async appendTokenSample(
    runId: string,
    token: string,
    sequence: number,
  ): Promise<void> {
    const existing = await this.getRun(runId);
    if (!existing) {
      console.warn(`[EvaluationLoggingService] Run ${runId} not found for token sample`);
      return;
    }

    const existingStructuredData =
      existing.structured_data && typeof existing.structured_data === 'object'
        ? (existing.structured_data as Record<string, unknown>)
        : {};

    const tokenSamples = Array.isArray(existingStructuredData.tokenSamples)
      ? (existingStructuredData.tokenSamples as Array<{ token: string; sequence: number }>)
      : [];

    // Sample strategy: first token, every 10th token, or if this is likely the last (we'll update on finalize)
    const shouldSample = sequence === 0 || sequence % 10 === 0;

    if (shouldSample) {
      // Remove any existing sample at this sequence to avoid duplicates
      const filtered = tokenSamples.filter(s => s.sequence !== sequence);
      filtered.push({ token, sequence });
      filtered.sort((a, b) => a.sequence - b.sequence);

      await this.updateRun(runId, {
        structuredData: {
          ...existingStructuredData,
          tokenSamples: filtered,
        },
      });
    }
  }

  /**
   * Mark an evaluation run as failed with error details.
   */
  async markFailure(runId: string, error: { error: string; stage: string }): Promise<void> {
    const existing = await this.getRun(runId);
    if (!existing) {
      console.warn(`[EvaluationLoggingService] Run ${runId} not found for failure marking`);
      return;
    }

    const existingStructuredData =
      existing.structured_data && typeof existing.structured_data === 'object'
        ? (existing.structured_data as Record<string, unknown>)
        : {};

    await this.updateRun(runId, {
      structuredData: {
        ...existingStructuredData,
        stage: 'failed',
        error: error.error,
        errorStage: error.stage,
      },
      evaluationRationale: `Failed at ${error.stage}: ${error.error}`,
      goNogoDecision: '❌ No-Go',
    });
  }

  /**
   * Get an evaluation run by ID (internal helper).
   */
  private async getRun(runId: string): Promise<Database['public']['Tables']['evaluation_runs']['Row'] | null> {
    const { data, error } = await this.supabaseClient
      .from('evaluation_runs')
      .select('*')
      .eq('id', runId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }
}


