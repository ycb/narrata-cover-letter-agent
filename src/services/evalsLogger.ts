/**
 * Frontend Evals Logger
 * 
 * Provides utilities for frontend services to log LLM performance metrics
 * directly to the evals_log table via authenticated RPC.
 * 
 * Usage:
 * ```typescript
 * const logger = new EvalsLogger({ userId, jobId, jobType, stage });
 * logger.start();
 * try {
 *   const result = await llmCall();
 *   logger.success({ tokens: result.usage });
 * } catch (error) {
 *   logger.failure(error);
 * }
 * ```
 */

import { supabase } from '@/lib/supabase';

export interface EvalsLoggerConfig {
  userId: string;
  jobId?: string | null;
  jobType?: 'coverLetter' | 'pmLevels' | 'onboarding' | null;
  stage: string;
  environment?: string | null;
}

export interface LLMTokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface EvalsLogEntry {
  job_id?: string | null;
  job_type?: 'coverLetter' | 'pmLevels' | 'onboarding' | null;
  stage: string;
  user_id: string;
  environment?: string | null;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  ttfu_ms?: number | null;
  success: boolean;
  error_type?: string | null;
  error_message?: string | null;
  model?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  result_subset?: Record<string, unknown> | null;
}

/**
 * Frontend Evals Logger for LLM performance tracking
 */
export class EvalsLogger {
  private config: EvalsLoggerConfig;
  private startTime: number | null = null;
  private startedAt: string | null = null;

  constructor(config: EvalsLoggerConfig) {
    this.config = config;
  }

  /**
   * Mark the start of an LLM operation
   */
  start(): void {
    this.startTime = Date.now();
    this.startedAt = new Date().toISOString();
  }

  /**
   * Log successful LLM completion
   */
  async success(options?: {
    tokens?: LLMTokenUsage;
    model?: string;
    ttfu_ms?: number;
    result_subset?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.startTime || !this.startedAt) {
      console.warn('[EvalsLogger] success() called before start()');
      return;
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - this.startTime;

    const entry: EvalsLogEntry = {
      job_id: this.config.jobId ?? null,
      job_type: this.config.jobType ?? null,
      stage: this.config.stage,
      user_id: this.config.userId,
      environment: this.config.environment ?? null,
      started_at: this.startedAt,
      completed_at: completedAt,
      duration_ms: durationMs,
      ttfu_ms: options?.ttfu_ms ?? null,
      success: true,
      error_type: null,
      error_message: null,
      model: options?.model ?? null,
      prompt_tokens: options?.tokens?.promptTokens ?? null,
      completion_tokens: options?.tokens?.completionTokens ?? null,
      total_tokens: options?.tokens?.totalTokens ?? null,
      result_subset: options?.result_subset ?? null,
    };

    await this.insertLog(entry);
  }

  /**
   * Log failed LLM operation
   */
  async failure(error: Error | unknown, options?: {
    model?: string;
    result_subset?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.startTime || !this.startedAt) {
      console.warn('[EvalsLogger] failure() called before start()');
      return;
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - this.startTime;

    const err = error instanceof Error ? error : new Error(String(error));

    const entry: EvalsLogEntry = {
      job_id: this.config.jobId ?? null,
      job_type: this.config.jobType ?? null,
      stage: this.config.stage,
      user_id: this.config.userId,
      environment: this.config.environment ?? null,
      started_at: this.startedAt,
      completed_at: completedAt,
      duration_ms: durationMs,
      ttfu_ms: null,
      success: false,
      error_type: err.name || 'Error',
      error_message: err.message ? String(err.message).slice(0, 500) : null,
      model: options?.model ?? null,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
      result_subset: options?.result_subset ?? null,
    };

    await this.insertLog(entry);
  }

  /**
   * Insert log entry to evals_log table
   */
  private async insertLog(entry: EvalsLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('evals_log')
        .insert(entry);

      if (error) {
        console.error('[EvalsLogger] Failed to insert evals_log entry:', error);
        console.error('[EvalsLogger] Entry:', entry);
      } else {
        console.log(`[EvalsLogger] ✅ Logged ${entry.stage} (${entry.duration_ms}ms, success=${entry.success})`);
      }
    } catch (err) {
      console.error('[EvalsLogger] Exception inserting evals_log entry:', err);
    }
  }
}

/**
 * Convenience function for one-shot logging (when you already have timing data)
 */
export async function logEval(entry: Omit<EvalsLogEntry, 'duration_ms'> & { duration_ms?: number }): Promise<void> {
  try {
    // Calculate duration if not provided
    const finalEntry: EvalsLogEntry = {
      ...entry,
      duration_ms: entry.duration_ms ?? (
        entry.completed_at && entry.started_at
          ? new Date(entry.completed_at).getTime() - new Date(entry.started_at).getTime()
          : undefined
      ),
    };

    const { error } = await supabase
      .from('evals_log')
      .insert(finalEntry);

    if (error) {
      console.error('[logEval] Failed to insert evals_log entry:', error);
      console.error('[logEval] Entry:', finalEntry);
    } else {
      console.log(`[logEval] ✅ Logged ${finalEntry.stage} (${finalEntry.duration_ms}ms, success=${finalEntry.success})`);
    }
  } catch (err) {
    console.error('[logEval] Exception inserting evals_log entry:', err);
  }
}

