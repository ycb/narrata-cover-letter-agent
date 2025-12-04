-- Add Readiness tracking to evaluation_runs table
-- Migration: 20251202_add_readiness_to_evaluation_runs.sql

-- Add Readiness fields to evaluation_runs
ALTER TABLE public.evaluation_runs
  ADD COLUMN IF NOT EXISTS readiness_status TEXT CHECK (readiness_status IN ('pass', 'review', 'fail', NULL)),
  ADD COLUMN IF NOT EXISTS readiness_verdict TEXT CHECK (readiness_verdict IN ('exceptional', 'strong', 'adequate', 'needs_work', NULL)),
  ADD COLUMN IF NOT EXISTS readiness_dimensions_populated INTEGER,
  ADD COLUMN IF NOT EXISTS readiness_improvement_count INTEGER,
  ADD COLUMN IF NOT EXISTS readiness_is_short_draft BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS readiness_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS readiness_error TEXT,
  ADD COLUMN IF NOT EXISTS readiness_draft_id UUID;

-- Add index for filtering by Readiness status
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_readiness_status 
  ON public.evaluation_runs(readiness_status) 
  WHERE readiness_status IS NOT NULL;

-- Add index for draft_id lookups
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_readiness_draft_id
  ON public.evaluation_runs(readiness_draft_id)
  WHERE readiness_draft_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.evaluation_runs.readiness_status IS 'Eval status: pass (all good), review (missing data), fail (error)';
COMMENT ON COLUMN public.evaluation_runs.readiness_verdict IS 'LLM verdict: exceptional, strong, adequate, needs_work';
COMMENT ON COLUMN public.evaluation_runs.readiness_dimensions_populated IS 'Number of editorial dimensions populated (0-4)';
COMMENT ON COLUMN public.evaluation_runs.readiness_improvement_count IS 'Number of improvement suggestions (0-2 based on tier)';
COMMENT ON COLUMN public.evaluation_runs.readiness_is_short_draft IS 'True if draft was too short (<150 words) for full evaluation';
COMMENT ON COLUMN public.evaluation_runs.readiness_latency_ms IS 'Readiness LLM analysis latency in milliseconds';
COMMENT ON COLUMN public.evaluation_runs.readiness_error IS 'Error message if readiness evaluation failed';
COMMENT ON COLUMN public.evaluation_runs.readiness_draft_id IS 'Reference to the cover_letters draft that was evaluated';

