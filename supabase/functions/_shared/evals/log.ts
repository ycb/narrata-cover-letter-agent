/**
 * Evals V1.1: Non-blocking Eval Logger
 * 
 * Helper function for logging pipeline evaluation metrics to evals_log table.
 * Uses best-effort, non-blocking semantics to ensure logging failures
 * do not disrupt pipeline execution.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import type { LogEvalPayload } from './types.ts';
import { getEnvironment } from './types.ts';
import { elog } from '../log.ts';

/**
 * Logs evaluation metrics to evals_log table.
 * 
 * **Non-blocking semantics:**
 * - Uses best-effort delivery
 * - Catches and logs errors (does not throw)
 * - Returns void (caller should not await)
 * 
 * **Usage patterns:**
 * 
 * 1. Stage start:
 * ```typescript
 * const stageStart = Date.now();
 * voidLogEval(supabase, {
 *   job_id: job.id,
 *   job_type: 'coverLetter',
 *   stage: 'jdAnalysis',
 *   user_id: job.user_id,
 *   started_at: new Date(stageStart),
 *   success: true, // Placeholder
 * });
 * ```
 * 
 * 2. Stage completion:
 * ```typescript
 * voidLogEval(supabase, {
 *   job_id: job.id,
 *   job_type: 'coverLetter',
 *   stage: 'jdAnalysis',
 *   user_id: job.user_id,
 *   started_at: new Date(stageStart),
 *   completed_at: new Date(),
 *   duration_ms: Date.now() - stageStart,
 *   success: true,
 * });
 * ```
 * 
 * 3. Structural validation:
 * ```typescript
 * const validation = validateCoverLetterResult(finalResult);
 * const score = calculateQualityScore(validation);
 * 
 * voidLogEval(supabase, {
 *   job_id: job.id,
 *   job_type: 'coverLetter',
 *   stage: 'structural_checks',
 *   user_id: job.user_id,
 *   started_at: new Date(),
 *   completed_at: new Date(),
 *   success: validation.passed,
 *   quality_checks: validation,
 *   quality_score: score,
 * });
 * ```
 * 
 * @param supabase - Supabase client (service role)
 * @param payload - Evaluation log payload
 */
export async function logEval(
  supabase: SupabaseClient,
  payload: LogEvalPayload
): Promise<void> {
  try {
    // Auto-detect environment if not provided
    const environment = payload.environment || getEnvironment();

    // Calculate duration if both timestamps provided but duration missing
    const duration_ms = payload.duration_ms ?? (
      payload.started_at && payload.completed_at
        ? payload.completed_at.getTime() - payload.started_at.getTime()
        : undefined
    );

    // Insert into evals_log table
    const { error } = await supabase
      .from('evals_log')
      .insert({
        job_id: payload.job_id,
        job_type: payload.job_type,
        stage: payload.stage,
        user_id: payload.user_id,
        environment,
        started_at: payload.started_at.toISOString(),
        completed_at: payload.completed_at?.toISOString(),
        duration_ms,
        ttfu_ms: payload.ttfu_ms,
        success: payload.success,
        error_type: payload.error_type,
        error_message: payload.error_message,
        quality_checks: payload.quality_checks,
        quality_score: payload.quality_score,
        result_subset: payload.result_subset,
      });

    if (error) {
      // Log error but DO NOT throw
      elog.error('evals_log_insert_error', {
        job_id: payload.job_id,
        stage: payload.stage,
        error: error.message,
      });
    }
  } catch (err) {
    // Catch any unexpected errors and log them
    elog.error('evals_log_unexpected_error', {
      job_id: payload.job_id,
      stage: payload.stage,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Void wrapper for logEval.
 * 
 * Fire-and-forget pattern that ensures logging never blocks pipeline execution.
 * Use this in pipelines instead of awaiting logEval directly.
 * 
 * **Usage:**
 * ```typescript
 * voidLogEval(supabase, {
 *   job_id,
 *   stage: 'jdAnalysis',
 *   started_at: new Date(stageStart),
 *   completed_at: new Date(),
 *   success: true,
 * }).catch(() => {}); // Explicitly ignore errors
 * ```
 * 
 * @param supabase - Supabase client
 * @param payload - Evaluation log payload
 */
export function voidLogEval(
  supabase: SupabaseClient,
  payload: LogEvalPayload
): void {
  // Fire and forget - do not await
  logEval(supabase, payload).catch((err) => {
    // Final safety net - log but never throw
    elog.error('evals_log_void_error', {
      job_id: payload.job_id,
      stage: payload.stage,
      error: err instanceof Error ? err.message : String(err),
    });
  });
}

