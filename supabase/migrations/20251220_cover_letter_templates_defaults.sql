-- Migration: Align cover_letter_templates schema with onboarding usage
-- Adds section_ids array, is_default flag, and source_id reference

BEGIN;

-- Add section_ids column to store ordered saved section IDs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letter_templates'
      AND column_name = 'section_ids'
  ) THEN
    ALTER TABLE public.cover_letter_templates
      ADD COLUMN section_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];
    COMMENT ON COLUMN public.cover_letter_templates.section_ids IS 'Ordered list of saved_section IDs that make up the template.';
  END IF;
END $$;

-- Add is_default flag for onboarding-created templates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letter_templates'
      AND column_name = 'is_default'
  ) THEN
    ALTER TABLE public.cover_letter_templates
      ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT FALSE;
    COMMENT ON COLUMN public.cover_letter_templates.is_default IS 'Marks the user''s default cover letter template.';
  END IF;
END $$;

-- Track originating source (resume/cover letter upload)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letter_templates'
      AND column_name = 'source_id'
  ) THEN
    ALTER TABLE public.cover_letter_templates
      ADD COLUMN source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.cover_letter_templates.source_id IS 'Source record that produced this template.';
  END IF;
END $$;

COMMIT;
