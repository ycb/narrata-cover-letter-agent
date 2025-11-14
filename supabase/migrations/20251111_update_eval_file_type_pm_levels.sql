-- Migration: Allow pm_level file type in evaluation_runs
-- Drops existing file_type check constraint and adds pm_level to allowed values

ALTER TABLE IF EXISTS public.evaluation_runs
  DROP CONSTRAINT IF EXISTS evaluation_runs_file_type_check;

ALTER TABLE IF EXISTS public.evaluation_runs
  ADD CONSTRAINT evaluation_runs_file_type_check
  CHECK (file_type = ANY (ARRAY['resume', 'coverLetter', 'linkedin', 'pm_level']));
