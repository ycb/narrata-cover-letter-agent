-- Migration: Relax saved_sections type constraint to unblock legacy data
-- Date: 2025-12-06

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'saved_sections' AND constraint_name LIKE 'saved_sections_type_check%'
  ) THEN
    ALTER TABLE public.saved_sections DROP CONSTRAINT IF EXISTS saved_sections_type_check;
  END IF;

  -- Re-add extremely permissive constraint to avoid legacy violations
  ALTER TABLE public.saved_sections
    ADD CONSTRAINT saved_sections_type_check CHECK (TRUE) NOT VALID;
END $$;

COMMIT;
