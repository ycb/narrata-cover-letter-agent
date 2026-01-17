-- Migration: add onboarding_complete to profiles
-- Purpose: derived onboarding completion flag from resume + cover letter sources

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.onboarding_complete IS 'Derived flag: user completed onboarding (resume + cover letter sources completed).';

CREATE OR REPLACE FUNCTION public.update_onboarding_complete_for_user(target_user_id uuid)
RETURNS void AS $$
DECLARE
  has_resume boolean;
  has_cover_letter boolean;
  has_is_deleted boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sources'
      AND column_name = 'is_deleted'
  ) INTO has_is_deleted;

  IF has_is_deleted THEN
    EXECUTE '
      SELECT EXISTS (
        SELECT 1 FROM public.sources
        WHERE user_id = $1
          AND source_type = ''resume''
          AND processing_status = ''completed''
          AND COALESCE(is_deleted, false) = false
      )
    ' INTO has_resume USING target_user_id;

    EXECUTE '
      SELECT EXISTS (
        SELECT 1 FROM public.sources
        WHERE user_id = $1
          AND source_type = ''cover_letter''
          AND processing_status = ''completed''
          AND COALESCE(is_deleted, false) = false
      )
    ' INTO has_cover_letter USING target_user_id;
  ELSE
    EXECUTE '
      SELECT EXISTS (
        SELECT 1 FROM public.sources
        WHERE user_id = $1
          AND source_type = ''resume''
          AND processing_status = ''completed''
      )
    ' INTO has_resume USING target_user_id;

    EXECUTE '
      SELECT EXISTS (
        SELECT 1 FROM public.sources
        WHERE user_id = $1
          AND source_type = ''cover_letter''
          AND processing_status = ''completed''
      )
    ' INTO has_cover_letter USING target_user_id;
  END IF;

  UPDATE public.profiles
  SET onboarding_complete = (has_resume AND has_cover_letter)
  WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_onboarding_complete_from_sources()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.update_onboarding_complete_for_user(COALESCE(NEW.user_id, OLD.user_id));
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_onboarding_complete_on_sources ON public.sources;
CREATE TRIGGER trg_update_onboarding_complete_on_sources
  AFTER INSERT OR UPDATE OR DELETE ON public.sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_onboarding_complete_from_sources();

-- Backfill for existing profiles (handles environments without is_deleted)
DO $$
DECLARE
  has_is_deleted boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sources'
      AND column_name = 'is_deleted'
  ) INTO has_is_deleted;

  IF has_is_deleted THEN
    EXECUTE '
      UPDATE public.profiles p
      SET onboarding_complete = (
        EXISTS (
          SELECT 1 FROM public.sources s
          WHERE s.user_id = p.id
            AND s.source_type = ''resume''
            AND s.processing_status = ''completed''
            AND COALESCE(s.is_deleted, false) = false
        )
        AND EXISTS (
          SELECT 1 FROM public.sources s
          WHERE s.user_id = p.id
            AND s.source_type = ''cover_letter''
            AND s.processing_status = ''completed''
            AND COALESCE(s.is_deleted, false) = false
        )
      )
    ';
  ELSE
    EXECUTE '
      UPDATE public.profiles p
      SET onboarding_complete = (
        EXISTS (
          SELECT 1 FROM public.sources s
          WHERE s.user_id = p.id
            AND s.source_type = ''resume''
            AND s.processing_status = ''completed''
        )
        AND EXISTS (
          SELECT 1 FROM public.sources s
          WHERE s.user_id = p.id
            AND s.source_type = ''cover_letter''
            AND s.processing_status = ''completed''
        )
      )
    ';
  END IF;
END;
$$;

COMMIT;
