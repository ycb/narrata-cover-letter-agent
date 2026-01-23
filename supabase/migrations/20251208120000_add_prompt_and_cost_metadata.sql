-- Evals V1.2: Add Prompt Metadata and Cost Tracking
-- Migration: 20251208_add_prompt_and_cost_metadata.sql
-- Date: 2025-12-08
-- Purpose: Extend evals_log with prompt name, model, and token usage for cost tracking

BEGIN;

-- ============================================================================
-- Part 1: Extend evals_log table
-- ============================================================================

ALTER TABLE public.evals_log 
  ADD COLUMN prompt_name TEXT,
  ADD COLUMN prompt_version TEXT,
  ADD COLUMN model TEXT,
  ADD COLUMN prompt_tokens INTEGER,
  ADD COLUMN completion_tokens INTEGER,
  ADD COLUMN total_tokens INTEGER;

-- Indexes for filtering and performance
CREATE INDEX idx_evals_log_prompt_name ON public.evals_log(prompt_name);
CREATE INDEX idx_evals_log_model ON public.evals_log(model);
CREATE INDEX idx_evals_log_prompt_version ON public.evals_log(prompt_version);

-- Comments
COMMENT ON COLUMN public.evals_log.prompt_name IS 
  'Name of the prompt used (e.g., buildJobDescriptionAnalysisPrompt). Used for prompt performance analysis.';
COMMENT ON COLUMN public.evals_log.prompt_version IS 
  'Optional version/hash of the prompt for A/B testing and tracking prompt changes over time.';
COMMENT ON COLUMN public.evals_log.model IS 
  'LLM model used (e.g., gpt-4o, gpt-4o-mini, gpt-4-turbo). Used for cost calculation and model comparison.';
COMMENT ON COLUMN public.evals_log.prompt_tokens IS 
  'Number of tokens in the prompt (input). Used for cost calculation.';
COMMENT ON COLUMN public.evals_log.completion_tokens IS 
  'Number of tokens in the completion (output). Used for cost calculation.';
COMMENT ON COLUMN public.evals_log.total_tokens IS 
  'Total tokens used (prompt_tokens + completion_tokens). Convenience field for sorting/filtering.';

-- ============================================================================
-- Part 2: Add Cost Aggregate Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_evals_cost_by_job_type(
  since_date TIMESTAMPTZ
)
RETURNS TABLE (
  job_type TEXT,
  total_runs BIGINT,
  total_prompt_tokens BIGINT,
  total_completion_tokens BIGINT,
  total_tokens BIGINT,
  estimated_cost_usd DOUBLE PRECISION,
  avg_cost_per_job DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.job_type,
    COUNT(*)::BIGINT AS total_runs,
    COALESCE(SUM(el.prompt_tokens), 0)::BIGINT AS total_prompt_tokens,
    COALESCE(SUM(el.completion_tokens), 0)::BIGINT AS total_completion_tokens,
    COALESCE(SUM(el.prompt_tokens + el.completion_tokens), 0)::BIGINT AS total_tokens,
    -- Cost calculation (model-specific pricing as of Dec 2024)
    -- gpt-4o: $2.50 per 1M input, $10.00 per 1M output
    -- gpt-4o-mini: $0.15 per 1M input, $0.60 per 1M output
    -- gpt-4-turbo: $10.00 per 1M input, $30.00 per 1M output
    COALESCE(SUM(
      CASE el.model
        WHEN 'gpt-4o' THEN 
          (el.prompt_tokens * 2.5 / 1000000.0) + (el.completion_tokens * 10.0 / 1000000.0)
        WHEN 'gpt-4o-mini' THEN 
          (el.prompt_tokens * 0.15 / 1000000.0) + (el.completion_tokens * 0.60 / 1000000.0)
        WHEN 'gpt-4-turbo' THEN 
          (el.prompt_tokens * 10.0 / 1000000.0) + (el.completion_tokens * 30.0 / 1000000.0)
        WHEN 'gpt-4' THEN 
          (el.prompt_tokens * 30.0 / 1000000.0) + (el.completion_tokens * 60.0 / 1000000.0)
        ELSE 0
      END
    ), 0)::DOUBLE PRECISION AS estimated_cost_usd,
    -- Avg cost per job
    (COALESCE(SUM(
      CASE el.model
        WHEN 'gpt-4o' THEN 
          (el.prompt_tokens * 2.5 / 1000000.0) + (el.completion_tokens * 10.0 / 1000000.0)
        WHEN 'gpt-4o-mini' THEN 
          (el.prompt_tokens * 0.15 / 1000000.0) + (el.completion_tokens * 0.60 / 1000000.0)
        WHEN 'gpt-4-turbo' THEN 
          (el.prompt_tokens * 10.0 / 1000000.0) + (el.completion_tokens * 30.0 / 1000000.0)
        WHEN 'gpt-4' THEN 
          (el.prompt_tokens * 30.0 / 1000000.0) + (el.completion_tokens * 60.0 / 1000000.0)
        ELSE 0
      END
    ), 0) / NULLIF(COUNT(*), 0))::DOUBLE PRECISION AS avg_cost_per_job
  FROM public.evals_log el
  WHERE el.created_at >= since_date
    AND el.prompt_tokens IS NOT NULL
    AND el.completion_tokens IS NOT NULL
  GROUP BY el.job_type
  ORDER BY estimated_cost_usd DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_evals_cost_by_job_type IS 
  'Returns cost analysis by job type (coverLetter, pmLevels, resume). Calculates estimated cost based on model-specific pricing (as of Dec 2024). Used by /evals dashboard for budget monitoring.';

-- ============================================================================
-- Part 3: Add Cost by Prompt Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_evals_cost_by_prompt(
  since_date TIMESTAMPTZ,
  filter_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  prompt_name TEXT,
  job_type TEXT,
  total_runs BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate DOUBLE PRECISION,
  total_tokens BIGINT,
  estimated_cost_usd DOUBLE PRECISION,
  avg_cost_per_call DOUBLE PRECISION,
  avg_duration_ms DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.prompt_name,
    el.job_type,
    COUNT(*)::BIGINT AS total_runs,
    COUNT(*) FILTER (WHERE el.success = true)::BIGINT AS success_count,
    COUNT(*) FILTER (WHERE el.success = false)::BIGINT AS failure_count,
    (COUNT(*) FILTER (WHERE el.success = true)::DOUBLE PRECISION / NULLIF(COUNT(*), 0)::DOUBLE PRECISION * 100) AS success_rate,
    COALESCE(SUM(el.prompt_tokens + el.completion_tokens), 0)::BIGINT AS total_tokens,
    COALESCE(SUM(
      CASE el.model
        WHEN 'gpt-4o' THEN 
          (el.prompt_tokens * 2.5 / 1000000.0) + (el.completion_tokens * 10.0 / 1000000.0)
        WHEN 'gpt-4o-mini' THEN 
          (el.prompt_tokens * 0.15 / 1000000.0) + (el.completion_tokens * 0.60 / 1000000.0)
        WHEN 'gpt-4-turbo' THEN 
          (el.prompt_tokens * 10.0 / 1000000.0) + (el.completion_tokens * 30.0 / 1000000.0)
        WHEN 'gpt-4' THEN 
          (el.prompt_tokens * 30.0 / 1000000.0) + (el.completion_tokens * 60.0 / 1000000.0)
        ELSE 0
      END
    ), 0)::DOUBLE PRECISION AS estimated_cost_usd,
    (COALESCE(SUM(
      CASE el.model
        WHEN 'gpt-4o' THEN 
          (el.prompt_tokens * 2.5 / 1000000.0) + (el.completion_tokens * 10.0 / 1000000.0)
        WHEN 'gpt-4o-mini' THEN 
          (el.prompt_tokens * 0.15 / 1000000.0) + (el.completion_tokens * 0.60 / 1000000.0)
        WHEN 'gpt-4-turbo' THEN 
          (el.prompt_tokens * 10.0 / 1000000.0) + (el.completion_tokens * 30.0 / 1000000.0)
        WHEN 'gpt-4' THEN 
          (el.prompt_tokens * 30.0 / 1000000.0) + (el.completion_tokens * 60.0 / 1000000.0)
        ELSE 0
      END
    ), 0) / NULLIF(COUNT(*), 0))::DOUBLE PRECISION AS avg_cost_per_call,
    AVG(el.duration_ms)::DOUBLE PRECISION AS avg_duration_ms
  FROM public.evals_log el
  WHERE el.created_at >= since_date
    AND el.prompt_name IS NOT NULL
    AND el.prompt_tokens IS NOT NULL
    AND el.completion_tokens IS NOT NULL
    AND (filter_job_type IS NULL OR el.job_type = filter_job_type)
  GROUP BY el.prompt_name, el.job_type
  ORDER BY estimated_cost_usd DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_evals_cost_by_prompt IS 
  'Returns cost analysis by prompt name. Shows success rate, token usage, and cost per prompt. Used by /evaluation-dashboard for prompt performance analysis and optimization.';

COMMIT;
