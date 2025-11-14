-- Migration: Add PM Level evaluation tracking fields to evaluation_runs
-- Adds columns to capture PM Level run status, latency, level details, deltas, and run context

ALTER TABLE IF EXISTS public.evaluation_runs
  ADD COLUMN IF NOT EXISTS pm_levels_status text,
  ADD COLUMN IF NOT EXISTS pm_levels_latency_ms integer,
  ADD COLUMN IF NOT EXISTS pm_levels_inferred_level text,
  ADD COLUMN IF NOT EXISTS pm_levels_confidence numeric,
  ADD COLUMN IF NOT EXISTS pm_levels_previous_level text,
  ADD COLUMN IF NOT EXISTS pm_levels_previous_confidence numeric,
  ADD COLUMN IF NOT EXISTS pm_levels_trigger_reason text,
  ADD COLUMN IF NOT EXISTS pm_levels_run_type text,
  ADD COLUMN IF NOT EXISTS pm_levels_session_id text,
  ADD COLUMN IF NOT EXISTS pm_levels_error text,
  ADD COLUMN IF NOT EXISTS pm_levels_level_changed boolean,
  ADD COLUMN IF NOT EXISTS pm_levels_delta jsonb;

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_pm_levels_status
  ON public.evaluation_runs(pm_levels_status);

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_pm_levels_run_type
  ON public.evaluation_runs(pm_levels_run_type);
