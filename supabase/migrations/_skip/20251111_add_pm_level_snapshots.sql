-- Migration: Add PM Level snapshot columns to evaluation_runs
-- Stores current and previous PM Level evidence payloads for dashboard review

ALTER TABLE IF EXISTS public.evaluation_runs
  ADD COLUMN IF NOT EXISTS pm_levels_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS pm_levels_prev_snapshot jsonb;
