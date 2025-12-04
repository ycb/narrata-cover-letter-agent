-- Evals V1.1: Pipeline evaluation tracking
-- Migration: 029_create_evals_log.sql
-- Date: 2025-12-04
-- Purpose: Create evals_log table for tracking pipeline evaluation metrics

BEGIN;

-- Create evals_log table
CREATE TABLE IF NOT EXISTS public.evals_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Job Context
  job_id UUID NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('coverLetter', 'pmLevels', 'onboarding')),
  stage TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment TEXT CHECK (environment IN ('dev', 'staging', 'prod')),
  
  -- Timing Metrics
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  ttfu_ms INTEGER, -- time to first update (for streaming stages)
  
  -- Reliability Metrics
  success BOOLEAN NOT NULL,
  error_type TEXT,
  error_message TEXT,
  
  -- Quality Metrics
  quality_checks JSONB, -- StructuralEvalResult: { passed: boolean, checks: EvalCheck[] }
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  
  -- Optional Semantic Checks (Future: Evals 1.2+)
  semantic_checks JSONB,
  
  -- Result Snapshot (safe subset for debugging, no PII)
  result_subset JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Primary indexes for dashboard queries
CREATE INDEX idx_evals_log_job_id ON public.evals_log(job_id);
CREATE INDEX idx_evals_log_created_at ON public.evals_log(created_at DESC);

-- Filtering indexes
CREATE INDEX idx_evals_log_job_type ON public.evals_log(job_type);
CREATE INDEX idx_evals_log_stage ON public.evals_log(stage);
CREATE INDEX idx_evals_log_success ON public.evals_log(success);
CREATE INDEX idx_evals_log_environment ON public.evals_log(environment) 
  WHERE environment IS NOT NULL;

-- Composite index for dashboard aggregations (job_type, stage, environment, time-series)
CREATE INDEX idx_evals_log_job_type_stage_env 
  ON public.evals_log(job_type, stage, environment, created_at DESC);

-- User-scoped queries (for RLS)
CREATE INDEX idx_evals_log_user_id ON public.evals_log(user_id);

-- Enable Row Level Security
ALTER TABLE public.evals_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own eval logs
CREATE POLICY "Users can view their own eval logs"
  ON public.evals_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: System (service role) can insert eval logs
-- Edge functions run as service role and need insert access
CREATE POLICY "System can insert eval logs"
  ON public.evals_log
  FOR INSERT
  WITH CHECK (true);

-- RLS Policy: System can update eval logs (for stage completion)
CREATE POLICY "System can update eval logs"
  ON public.evals_log
  FOR UPDATE
  USING (true);

-- Comments for documentation
COMMENT ON TABLE public.evals_log IS 
  'Pipeline evaluation tracking for cover letter, PM levels, and onboarding jobs. Stores latency, success/failure, and structural quality checks for each pipeline stage.';

COMMENT ON COLUMN public.evals_log.job_id IS 
  'Reference to jobs.id (foreign key relationship exists in jobs table)';

COMMENT ON COLUMN public.evals_log.job_type IS 
  'Type of job: coverLetter, pmLevels, or onboarding';

COMMENT ON COLUMN public.evals_log.stage IS 
  'Pipeline stage name (must match JOB_STAGES_REFERENCE.md). Examples: jdAnalysis, requirementAnalysis, baselineAssessment, structural_checks';

COMMENT ON COLUMN public.evals_log.user_id IS 
  'User who owns this job (for RLS and analytics)';

COMMENT ON COLUMN public.evals_log.environment IS 
  'Deployment environment: dev, staging, or prod. Optional field for filtering production metrics.';

COMMENT ON COLUMN public.evals_log.started_at IS 
  'Stage execution start timestamp (UTC)';

COMMENT ON COLUMN public.evals_log.completed_at IS 
  'Stage execution completion timestamp (UTC). NULL if stage is still running or failed early.';

COMMENT ON COLUMN public.evals_log.duration_ms IS 
  'Stage execution duration in milliseconds. Calculated as: completed_at - started_at.';

COMMENT ON COLUMN public.evals_log.ttfu_ms IS 
  'Time to first update (ms) for streaming stages. Measures latency until first SSE event. NULL for non-streaming stages.';

COMMENT ON COLUMN public.evals_log.success IS 
  'Whether the stage completed successfully. Critical for reliability metrics.';

COMMENT ON COLUMN public.evals_log.error_type IS 
  'Error type/class if stage failed. Examples: TimeoutError, ValidationError, LLMError.';

COMMENT ON COLUMN public.evals_log.error_message IS 
  'Human-readable error message if stage failed. Truncated to avoid storing sensitive data.';

COMMENT ON COLUMN public.evals_log.quality_checks IS 
  'Structural evaluation result as JSONB: { passed: boolean, checks: EvalCheck[] }. Each EvalCheck contains: { name, passed, severity, expected?, actual? }.';

COMMENT ON COLUMN public.evals_log.quality_score IS 
  'Aggregated quality score (0-100) derived from quality_checks. Weighted by severity: critical=3x, high=2x, medium=1x.';

COMMENT ON COLUMN public.evals_log.semantic_checks IS 
  'Optional LLM-as-judge output (Evals 1.2+). Reserved for future semantic quality evaluation.';

COMMENT ON COLUMN public.evals_log.result_subset IS 
  'Safe subset of stage result for debugging. Should NOT contain PII or large objects. Examples: { hasRoleInsights: true, requirementCount: 5 }.';

COMMENT ON COLUMN public.evals_log.created_at IS 
  'Row creation timestamp (UTC). Defaults to NOW().';

COMMIT;

