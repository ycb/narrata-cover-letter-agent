-- Migration: 011_add_eval_gap_columns_and_saved_section.sql
-- Adds gap summary fields to evaluation_runs and allows 'saved_section' in gaps.entity_type

-- 1) evaluation_runs: add synthetic_profile_id and gap snapshot fields
ALTER TABLE IF EXISTS public.evaluation_runs
  ADD COLUMN IF NOT EXISTS synthetic_profile_id text,
  ADD COLUMN IF NOT EXISTS gap_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gap_summary jsonb;

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_synthetic_profile_id ON public.evaluation_runs(synthetic_profile_id);

-- 2) gaps: extend entity_type to include saved_section
DO $$
DECLARE
  con_name text;
BEGIN
  -- Drop any existing check constraints on entity_type
  FOR con_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE rel.relname = 'gaps'
      AND nsp.nspname = 'public'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%entity_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.gaps DROP CONSTRAINT %I', con_name);
  END LOOP;

  -- Recreate constraint allowing saved_section
  ALTER TABLE public.gaps
    ADD CONSTRAINT gaps_entity_type_check
    CHECK (entity_type IN ('work_item','approved_content','saved_section'));
END$$;
