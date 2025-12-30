-- Public demo: allow public read of cover-letter-related demo content
-- Key idea: only rows owned by a registered demo profile are publicly readable.
-- Visitor-pasted JDs should be written under a non-demo "visitor" user_id to avoid public exposure.

-- Add a dedicated storage owner for visitor-generated demo rows (JDs, jobs, etc.)
ALTER TABLE public.public_demo_profiles
  ADD COLUMN IF NOT EXISTS visitor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.public_demo_profiles.visitor_user_id IS
  'Optional user_id to own visitor-generated demo rows (JDs, jobs). Should NOT be a registered demo profile.';

-- job_descriptions: allow public SELECT for demo-owned rows
DO $$
BEGIN
  IF to_regclass('public.job_descriptions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='job_descriptions' AND policyname='Anyone can view demo job descriptions'
    ) THEN
      CREATE POLICY "Anyone can view demo job descriptions"
        ON public.job_descriptions
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;
  END IF;
END
$$;

-- cover_letter_templates: allow public SELECT for demo-owned rows
DO $$
BEGIN
  IF to_regclass('public.cover_letter_templates') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='cover_letter_templates' AND policyname='Anyone can view demo cover letter templates'
    ) THEN
      CREATE POLICY "Anyone can view demo cover letter templates"
        ON public.cover_letter_templates
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;
  END IF;
END
$$;

-- saved_sections: allow public SELECT for demo-owned rows
DO $$
BEGIN
  IF to_regclass('public.saved_sections') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='saved_sections' AND policyname='Anyone can view demo saved sections'
    ) THEN
      CREATE POLICY "Anyone can view demo saved sections"
        ON public.saved_sections
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;
  END IF;
END
$$;

-- cover_letters: allow public SELECT for demo-owned rows
DO $$
BEGIN
  IF to_regclass('public.cover_letters') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='cover_letters' AND policyname='Anyone can view demo cover letters'
    ) THEN
      CREATE POLICY "Anyone can view demo cover letters"
        ON public.cover_letters
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;
  END IF;
END
$$;

