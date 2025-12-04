-- Add PM Levels tracking to evaluation_runs table
-- Migration: 004_add_pm_levels_to_evaluation_runs.sql

-- Add PM Levels fields to evaluation_runs
ALTER TABLE public.evaluation_runs
  ADD COLUMN IF NOT EXISTS pm_levels_inferred_level TEXT,
  ADD COLUMN IF NOT EXISTS pm_levels_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS pm_levels_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS pm_levels_status TEXT CHECK (pm_levels_status IN ('success', 'failed', 'skipped', NULL)),
  ADD COLUMN IF NOT EXISTS pm_levels_error TEXT;

-- Add index for filtering by PM Levels status
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_pm_levels_status 
  ON public.evaluation_runs(pm_levels_status) 
  WHERE pm_levels_status IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.evaluation_runs.pm_levels_inferred_level IS 'PM level code inferred (e.g., L4, L5, L6)';
COMMENT ON COLUMN public.evaluation_runs.pm_levels_confidence IS 'Confidence score 0-1 for PM level inference';
COMMENT ON COLUMN public.evaluation_runs.pm_levels_latency_ms IS 'PM levels analysis latency in milliseconds';
COMMENT ON COLUMN public.evaluation_runs.pm_levels_status IS 'Status of PM levels analysis: success, failed, or skipped';
COMMENT ON COLUMN public.evaluation_runs.pm_levels_error IS 'Error message if PM levels analysis failed';

