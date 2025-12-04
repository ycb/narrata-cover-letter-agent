-- Migration: Ensure cover_letter_templates.sections has a safe default

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letter_templates'
      AND column_name = 'sections'
  ) THEN
    -- Set a default empty array and keep NOT NULL to avoid null violations on insert
    ALTER TABLE public.cover_letter_templates
      ALTER COLUMN sections SET DEFAULT '[]'::jsonb,
      ALTER COLUMN sections SET NOT NULL;
    COMMENT ON COLUMN public.cover_letter_templates.sections IS 'Legacy sections payload; defaults to empty array for compatibility.';
  END IF;
END $$;

COMMIT;
