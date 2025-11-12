-- Migration: Allow NULL source_id for PM Level evaluation runs
-- Context: PM Levels logs create evaluation_runs entries without a specific source.
-- The existing NOT NULL constraint on source_id prevented inserts, so PM Level runs
-- never appeared on the evaluations dashboard. This migration drops that constraint
-- to allow PM Level runs (and other future evaluations) to be logged without tying
-- them to a particular source document.

ALTER TABLE IF EXISTS public.evaluation_runs
  ALTER COLUMN source_id DROP NOT NULL;

