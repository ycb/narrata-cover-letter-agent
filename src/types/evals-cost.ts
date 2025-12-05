/**
 * Type definitions for Evals Cost Tracking (V1.2)
 * 
 * Extends existing evals types with prompt metadata and cost tracking.
 * Used by both /evals and /evaluation-dashboard.
 */

// ============================================================================
// Prompt Metadata
// ============================================================================

/**
 * Prompt metadata attached to evals_log entries
 */
export interface PromptMetadata {
  /** Name of the prompt function (e.g., "buildJobDescriptionAnalysisPrompt") */
  promptName: string;
  
  /** Optional version/hash for A/B testing and tracking changes */
  promptVersion?: string;
  
  /** LLM model used (e.g., "gpt-4o", "gpt-4o-mini") */
  model: string;
  
  /** Number of tokens in the prompt (input) */
  promptTokens: number;
  
  /** Number of tokens in the completion (output) */
  completionTokens: number;
  
  /** Total tokens used (prompt + completion) */
  totalTokens: number;
}

// ============================================================================
// Cost Tracking (DB Function Return Types)
// ============================================================================

/**
 * Return type for get_evals_cost_by_job_type()
 * Used by /evals CostOverviewCard
 */
export interface CostByJobType {
  job_type: string;
  total_runs: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  avg_cost_per_job: number;
}

/**
 * Return type for get_evals_cost_by_prompt()
 * Used by /evaluation-dashboard Prompt Performance View
 */
export interface CostByPrompt {
  prompt_name: string;
  job_type: string;
  total_runs: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  total_tokens: number;
  estimated_cost_usd: number;
  avg_cost_per_call: number;
  avg_duration_ms: number;
}

// ============================================================================
// Universal LLM Call Types
// ============================================================================

/**
 * LLM call type enum (for evaluation_runs.llm_call_type)
 */
export type LLMCallType =
  // Foundational
  | 'jd_analysis'
  | 'resume_parse'
  | 'cover_letter_parse'
  | 'pm_level_assess'
  // HIL Gap Resolution
  | 'hil_gap_role'
  | 'hil_gap_story'
  | 'hil_gap_metric'
  | 'hil_gap_saved_section'
  | 'hil_gap_cl_draft'
  // Draft Generation
  | 'draft_cl'
  | 'draft_metrics'
  // Quality & Evaluation
  | 'cl_ready'
  | 'judge'
  // Content & Discovery
  | 'my_voice'
  | 'company_tags';

/**
 * Quality check result (stored in evaluation_runs.quality_checks)
 */
export interface QualityCheck {
  /** Name of the check (e.g., "has_title", "paragraph_count") */
  name: string;
  
  /** Whether the check passed */
  passed: boolean;
  
  /** Human-readable message */
  message: string;
  
  /** Optional actual vs expected values for debugging */
  actual?: unknown;
  expected?: unknown;
}

// ============================================================================
// Type-Specific Data Shapes
// ============================================================================

/**
 * JD Analysis specific data (evaluation_runs.jd_analysis_data)
 */
export interface JDAnalysisData {
  title?: string;
  company?: string;
  requirements?: string[];
  responsibilities?: string[];
  qualifications?: string[];
  benefits?: string[];
  detected_level?: string;
  remote_type?: 'remote' | 'hybrid' | 'onsite' | 'unknown';
}

/**
 * HIL Gap Resolution specific data (evaluation_runs.hil_data)
 */
export interface HILData {
  gap_type: 'role' | 'story' | 'metric' | 'saved_section' | 'cl_draft';
  original_text: string;
  suggested_text: string;
  was_accepted: boolean;
  user_edit?: string;
}

/**
 * Draft Generation specific data (evaluation_runs.draft_generation_data)
 */
export interface DraftGenerationData {
  draft_type: 'cl' | 'metric';
  sections?: Array<{
    type: string;
    content: string;
    word_count: number;
  }>;
  total_word_count?: number;
  target_word_count?: number;
}

/**
 * Company Tags specific data (evaluation_runs.company_tags_data)
 */
export interface CompanyTagsData {
  company_name: string;
  tags: string[];
  confidence_scores?: Record<string, number>;
  source_url?: string;
}

// ============================================================================
// Extended Database Row Types
// ============================================================================

/**
 * Extended evals_log row with prompt metadata
 */
export interface EvalsLogWithPrompt {
  // Existing fields
  id: string;
  job_id: string;
  job_type: string;
  stage_name: string;
  success: boolean;
  duration_ms: number | null;
  quality_score: number | null;
  structural_checks: QualityCheck[] | null;
  error_message: string | null;
  created_at: string;
  environment: 'production' | 'development';
  
  // New prompt metadata fields
  prompt_name: string | null;
  prompt_version: string | null;
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
}

/**
 * Extended evaluation_runs row with LLM call tracking
 */
export interface EvaluationRunWithLLM {
  // Existing fields
  id: string;
  user_id: string;
  source_type: string;
  source_id: string;
  result: unknown;
  error: string | null;
  duration_ms: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  
  // New universal fields
  llm_call_type: LLMCallType | null;
  prompt_name: string | null;
  prompt_version: string | null;
  quality_checks: QualityCheck[] | null;
  quality_score: number | null;
  
  // New type-specific fields
  jd_analysis_data: JDAnalysisData | null;
  hil_data: HILData | null;
  draft_generation_data: DraftGenerationData | null;
  company_tags_data: CompanyTagsData | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate estimated cost for a single run
 */
export function calculateCost(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  // Pricing as of Dec 2024 (per 1M tokens)
  const pricing: Record<string, { input: number; output: number }> = {
    'gpt-4o': { input: 2.5, output: 10.0 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.0, output: 30.0 },
    'gpt-4': { input: 30.0, output: 60.0 },
  };
  
  const rates = pricing[model];
  if (!rates) return 0;
  
  const inputCost = (promptTokens * rates.input) / 1_000_000;
  const outputCost = (completionTokens * rates.output) / 1_000_000;
  
  return inputCost + outputCost;
}

/**
 * Format cost as USD string
 */
export function formatCost(costUsd: number): string {
  if (costUsd < 0.01) {
    return `$${costUsd.toFixed(4)}`;
  }
  return `$${costUsd.toFixed(2)}`;
}

/**
 * Format token count with K/M suffixes
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`;
  }
  return tokens.toString();
}


