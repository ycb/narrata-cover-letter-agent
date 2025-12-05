/**
 * Evals V1.1: Type Definitions
 * 
 * Type definitions for pipeline evaluation system.
 * Used by validators, logEval helper, and frontend dashboard.
 */

/**
 * Severity level for evaluation checks.
 * Used to weight quality scores and prioritize failures.
 */
export type EvalSeverity = 'critical' | 'high' | 'medium' | 'low';

/**
 * Individual evaluation check result.
 * 
 * UI-friendly structure that maps directly to dashboard display.
 * Each check validates one aspect of the pipeline result.
 * 
 * @example
 * {
 *   name: 'Core Requirements Extracted',
 *   passed: true,
 *   severity: 'critical',
 *   expected: '>= 1 core requirement',
 *   actual: '5 requirements found'
 * }
 */
export interface EvalCheck {
  /** Human-readable name of the check (e.g., "Role Insights Present") */
  name: string;
  
  /** Whether the check passed */
  passed: boolean;
  
  /** Severity level for weighting and prioritization */
  severity: EvalSeverity;
  
  /** Optional: What was expected (for failed checks) */
  expected?: string;
  
  /** Optional: What was actually found (for failed checks) */
  actual?: string;
}

/**
 * Result of structural validation for a pipeline result.
 * 
 * Contains array of individual checks and overall pass/fail status.
 * Overall status is true only if ALL critical checks pass.
 * 
 * @example
 * {
 *   passed: true,
 *   checks: [
 *     { name: 'Role Insights', passed: true, severity: 'critical' },
 *     { name: 'MWS Score Valid', passed: true, severity: 'critical' }
 *   ]
 * }
 */
export interface StructuralEvalResult {
  /** Overall pass/fail. True only if all CRITICAL checks pass. */
  passed: boolean;
  
  /** Array of individual check results */
  checks: EvalCheck[];
}

/**
 * Payload for logEval helper function.
 * 
 * Represents one stage execution in a pipeline.
 * Can represent either:
 * - Stage start (started_at only)
 * - Stage completion (started_at + completed_at + success)
 * - Structural validation (quality_checks + quality_score)
 */
export interface LogEvalPayload {
  // Job Context
  job_id: string;
  job_type: 'coverLetter' | 'pmLevels' | 'onboarding';
  stage: string;
  user_id: string;
  environment?: 'dev' | 'staging' | 'prod';
  
  // Timing
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  ttfu_ms?: number; // Time to first update (streaming stages)
  
  // Reliability
  success: boolean;
  error_type?: string;
  error_message?: string;
  
  // Quality
  quality_checks?: StructuralEvalResult;
  quality_score?: number; // 0-100
  
  // Prompt Metadata (Phase 0: Cost Tracking)
  prompt_name?: string; // e.g., 'buildJdRolePrompt'
  prompt_version?: string; // e.g., hash or version tag
  model?: string; // e.g., 'gpt-4o'
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  
  // Optional result snapshot (safe subset, no PII)
  result_subset?: Record<string, unknown>;
}

/**
 * Severity weights for quality score calculation.
 * Used by calculateQualityScore() function.
 */
export const SEVERITY_WEIGHTS: Record<EvalSeverity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

/**
 * Environment detection helper.
 * Returns current deployment environment based on Deno env vars.
 */
export function getEnvironment(): 'dev' | 'staging' | 'prod' {
  // In Supabase Edge Functions, SUPABASE_URL contains the environment info
  const url = Deno.env.get('SUPABASE_URL') || '';
  
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    return 'dev';
  }
  
  if (url.includes('staging')) {
    return 'staging';
  }
  
  return 'prod';
}

