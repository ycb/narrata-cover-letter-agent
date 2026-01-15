-- Migration: Add cover letter outcome tracking
-- Date: 2026-01-09

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cover_letter_outcome'
  ) THEN
    CREATE TYPE cover_letter_outcome AS ENUM ('interview', 'no_response', 'not_selected');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letters'
      AND column_name = 'applied_at'
  ) THEN
    ALTER TABLE public.cover_letters
      ADD COLUMN applied_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN public.cover_letters.applied_at IS 'Timestamp when the finalized cover letter was applied.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letters'
      AND column_name = 'outcome_status'
  ) THEN
    ALTER TABLE public.cover_letters
      ADD COLUMN outcome_status cover_letter_outcome;
    COMMENT ON COLUMN public.cover_letters.outcome_status IS 'Outcome of the application (interview, no response, not selected).';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cover_letters'
      AND column_name = 'outcome_updated_at'
  ) THEN
    ALTER TABLE public.cover_letters
      ADD COLUMN outcome_updated_at TIMESTAMP WITH TIME ZONE;
    COMMENT ON COLUMN public.cover_letters.outcome_updated_at IS 'Last time the outcome status was updated.';
  END IF;
END $$;

UPDATE public.cover_letters
SET applied_at = COALESCE(updated_at, created_at)
WHERE status = 'finalized'
  AND applied_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cover_letters_outcome_status
  ON public.cover_letters(outcome_status);

CREATE INDEX IF NOT EXISTS idx_cover_letters_applied_at
  ON public.cover_letters(applied_at);

COMMIT;
