-- Evals V1.1: Aggregate functions for dashboard queries
-- Migration: 030_add_evals_aggregate_functions.sql
-- Date: 2025-12-04
-- Purpose: Create DB functions for efficient dashboard data aggregation

BEGIN;

-- ============================================================================
-- Function: get_evals_aggregate_by_job_type
-- Purpose: Aggregate evaluation metrics by job type over a time window
-- Returns: Success rate, latency percentiles, quality scores by job type
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_evals_aggregate_by_job_type(
  since_date TIMESTAMPTZ
)
RETURNS TABLE (
  job_type TEXT,
  total_runs BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  p50_duration_ms NUMERIC,
  p90_duration_ms NUMERIC,
  p99_duration_ms NUMERIC,
  avg_quality_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH job_level_stats AS (
    -- Aggregate at job level (not stage level) to avoid double-counting
    SELECT 
      el.job_id,
      el.job_type,
      -- Job succeeds only if all stages succeed
      BOOL_AND(el.success) AS job_success,
      -- Sum durations across all stages for total job duration
      SUM(el.duration_ms) AS total_duration_ms,
      -- Average quality score across all stages (excluding NULL)
      AVG(el.quality_score) FILTER (WHERE el.quality_score IS NOT NULL) AS avg_quality
    FROM public.evals_log el
    WHERE el.created_at >= since_date
      AND el.completed_at IS NOT NULL
      AND el.duration_ms IS NOT NULL
    GROUP BY el.job_id, el.job_type
  )
  SELECT
    jls.job_type,
    COUNT(*)::BIGINT AS total_runs,
    COUNT(*) FILTER (WHERE jls.job_success = true)::BIGINT AS success_count,
    COUNT(*) FILTER (WHERE jls.job_success = false)::BIGINT AS failure_count,
    ROUND(
      (COUNT(*) FILTER (WHERE jls.job_success = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    ROUND(AVG(jls.total_duration_ms)) AS avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY jls.total_duration_ms) AS p50_duration_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY jls.total_duration_ms) AS p90_duration_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY jls.total_duration_ms) AS p99_duration_ms,
    ROUND(AVG(jls.avg_quality)) AS avg_quality_score
  FROM job_level_stats jls
  GROUP BY jls.job_type
  ORDER BY jls.job_type;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_evals_aggregate_by_job_type IS 
  'Returns aggregated evaluation metrics by job type for dashboard overview. Aggregates at job level (not stage level) to show overall job success rate and total duration. Calculates P50/P90/P99 latency and average quality score.';

-- ============================================================================
-- Function: get_evals_aggregate_by_stage
-- Purpose: Aggregate evaluation metrics by stage (within a job type)
-- Returns: Stage-level success rate, latency, for detailed analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_evals_aggregate_by_stage(
  since_date TIMESTAMPTZ,
  filter_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  job_type TEXT,
  stage TEXT,
  total_runs BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  p50_duration_ms NUMERIC,
  p90_duration_ms NUMERIC,
  avg_ttfu_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.job_type,
    el.stage,
    COUNT(*)::BIGINT AS total_runs,
    COUNT(*) FILTER (WHERE el.success = true)::BIGINT AS success_count,
    COUNT(*) FILTER (WHERE el.success = false)::BIGINT AS failure_count,
    ROUND(
      (COUNT(*) FILTER (WHERE el.success = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
      2
    ) AS success_rate,
    ROUND(AVG(el.duration_ms)) AS avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY el.duration_ms) AS p50_duration_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY el.duration_ms) AS p90_duration_ms,
    ROUND(AVG(el.ttfu_ms) FILTER (WHERE el.ttfu_ms IS NOT NULL)) AS avg_ttfu_ms
  FROM public.evals_log el
  WHERE el.created_at >= since_date
    AND el.completed_at IS NOT NULL
    AND el.duration_ms IS NOT NULL
    AND (filter_job_type IS NULL OR el.job_type = filter_job_type)
  GROUP BY el.job_type, el.stage
  ORDER BY el.job_type, el.stage;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_evals_aggregate_by_stage IS 
  'Returns aggregated evaluation metrics by stage for detailed performance analysis. Optionally filters by job_type. Includes TTFU (time to first update) for streaming stages. Used for stage-level latency breakdown in dashboard.';

-- ============================================================================
-- Function: get_evals_quality_score_distribution
-- Purpose: Get distribution of quality scores for histogram/distribution chart
-- Returns: Buckets of quality scores (0-20, 21-40, etc.) with counts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_evals_quality_score_distribution(
  since_date TIMESTAMPTZ,
  filter_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  job_type TEXT,
  score_bucket TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.job_type,
    CASE
      WHEN el.quality_score IS NULL THEN 'No Score'
      WHEN el.quality_score <= 20 THEN '0-20 (Poor)'
      WHEN el.quality_score <= 40 THEN '21-40 (Weak)'
      WHEN el.quality_score <= 60 THEN '41-60 (Fair)'
      WHEN el.quality_score <= 80 THEN '61-80 (Good)'
      ELSE '81-100 (Excellent)'
    END AS score_bucket,
    COUNT(*)::BIGINT AS count
  FROM public.evals_log el
  WHERE el.created_at >= since_date
    AND el.stage = 'structural_checks' -- Only count final structural validation
    AND (filter_job_type IS NULL OR el.job_type = filter_job_type)
  GROUP BY el.job_type, score_bucket
  ORDER BY el.job_type, score_bucket;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_evals_quality_score_distribution IS 
  'Returns quality score distribution grouped into buckets (0-20, 21-40, etc.) for dashboard histogram. Only includes structural_checks stage to avoid counting intermediate stages.';

-- ============================================================================
-- Function: get_evals_recent_failures
-- Purpose: Get recent job failures with error details for debugging
-- Returns: Most recent failures with error type, message, and stage
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_evals_recent_failures(
  filter_job_type TEXT DEFAULT NULL,
  result_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  job_id UUID,
  job_type TEXT,
  stage TEXT,
  error_type TEXT,
  error_message TEXT,
  quality_checks JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.id,
    el.job_id,
    el.job_type,
    el.stage,
    el.error_type,
    el.error_message,
    el.quality_checks,
    el.created_at
  FROM public.evals_log el
  WHERE el.success = false
    AND (filter_job_type IS NULL OR el.job_type = filter_job_type)
  ORDER BY el.created_at DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_evals_recent_failures IS 
  'Returns recent evaluation failures ordered by time (most recent first). Optionally filters by job_type. Used for error table in dashboard to help debug issues.';

COMMIT;

