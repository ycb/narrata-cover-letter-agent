-- Migration: Add description column to cover_letter_templates
-- Date: 2025-12-06

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letter_templates'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.cover_letter_templates
      ADD COLUMN description TEXT;
    COMMENT ON COLUMN public.cover_letter_templates.description IS 'Optional description for the template';
  END IF;
END $$;

COMMIT;
