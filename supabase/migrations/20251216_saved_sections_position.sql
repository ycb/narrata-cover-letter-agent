-- Migration: Add position column to saved_sections and relax type check
-- Date: 2025-12-06

BEGIN;

DO $$
BEGIN
  -- Add position column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saved_sections' AND column_name = 'position'
  ) THEN
    ALTER TABLE public.saved_sections
      ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
    COMMENT ON COLUMN public.saved_sections.position IS 'Ordering of paragraph/section within the source cover letter';
  END IF;

  -- Refresh type check to allow legacy + new values (intro/body/closing/closer/signature/other)
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'saved_sections' AND constraint_name LIKE 'saved_sections_type_check%'
  ) THEN
    ALTER TABLE public.saved_sections DROP CONSTRAINT IF EXISTS saved_sections_type_check;
  END IF;

  ALTER TABLE public.saved_sections
    ADD CONSTRAINT saved_sections_type_check CHECK (
      type IS NULL OR type IN ('intro', 'body', 'closing', 'closer', 'signature', 'other')
    ) NOT VALID;
END $$;

COMMIT;
