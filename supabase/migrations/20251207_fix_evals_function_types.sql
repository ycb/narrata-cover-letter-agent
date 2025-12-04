-- Fix: Update aggregate functions to properly cast numeric types
-- Issue: Frontend expects numbers, but NUMERIC and BIGINT can cause type mismatches

BEGIN;

-- Drop and recreate with proper type casting
DROP FUNCTION IF EXISTS public.get_evals_aggregate_by_job_type(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.get_evals_aggregate_by_stage(TIMESTAMPTZ, TEXT);

-- ============================================================================
-- Function: get_evals_aggregate_by_job_type (FIXED)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_evals_aggregate_by_job_type(
  since_date TIMESTAMPTZ
)
RETURNS TABLE (
  job_type TEXT,
  total_runs BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate DOUBLE PRECISION,
  avg_duration_ms DOUBLE PRECISION,
  p50_duration_ms DOUBLE PRECISION,
  p90_duration_ms DOUBLE PRECISION,
  p99_duration_ms DOUBLE PRECISION,
  avg_quality_score DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  WITH job_level_stats AS (
    SELECT 
      el.job_id,
      el.job_type,
      BOOL_AND(el.success) AS job_success,
      SUM(el.duration_ms) AS total_duration_ms,
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
    (COUNT(*) FILTER (WHERE jls.job_success = true)::DOUBLE PRECISION / NULLIF(COUNT(*), 0)::DOUBLE PRECISION * 100) AS success_rate,
    AVG(jls.total_duration_ms)::DOUBLE PRECISION AS avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY jls.total_duration_ms)::DOUBLE PRECISION AS p50_duration_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY jls.total_duration_ms)::DOUBLE PRECISION AS p90_duration_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY jls.total_duration_ms)::DOUBLE PRECISION AS p99_duration_ms,
    AVG(jls.avg_quality)::DOUBLE PRECISION AS avg_quality_score
  FROM job_level_stats jls
  GROUP BY jls.job_type
  ORDER BY jls.job_type;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Function: get_evals_aggregate_by_stage (FIXED)
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
  success_rate DOUBLE PRECISION,
  avg_duration_ms DOUBLE PRECISION,
  p50_duration_ms DOUBLE PRECISION,
  p90_duration_ms DOUBLE PRECISION,
  avg_ttfu_ms DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.job_type,
    el.stage,
    COUNT(*)::BIGINT AS total_runs,
    COUNT(*) FILTER (WHERE el.success = true)::BIGINT AS success_count,
    COUNT(*) FILTER (WHERE el.success = false)::BIGINT AS failure_count,
    (COUNT(*) FILTER (WHERE el.success = true)::DOUBLE PRECISION / NULLIF(COUNT(*), 0)::DOUBLE PRECISION * 100) AS success_rate,
    AVG(el.duration_ms)::DOUBLE PRECISION AS avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY el.duration_ms)::DOUBLE PRECISION AS p50_duration_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY el.duration_ms)::DOUBLE PRECISION AS p90_duration_ms,
    AVG(el.ttfu_ms) FILTER (WHERE el.ttfu_ms IS NOT NULL)::DOUBLE PRECISION AS avg_ttfu_ms
  FROM public.evals_log el
  WHERE el.created_at >= since_date
    AND el.completed_at IS NOT NULL
    AND el.duration_ms IS NOT NULL
    AND (filter_job_type IS NULL OR el.job_type = filter_job_type)
  GROUP BY el.job_type, el.stage
  ORDER BY el.job_type, el.stage;
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

