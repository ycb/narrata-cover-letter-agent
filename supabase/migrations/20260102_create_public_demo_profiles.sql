-- Public demo profiles (indexable, no-login demo)
-- Enables public read-only access to a curated demo profile dataset via RLS,
-- while keeping write access limited to admins (or the owning user as usual).

-- ============================================================================
-- 1. Demo profile registry
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.public_demo_profiles (
  slug TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.public_demo_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_demo_profiles'
      AND policyname = 'Anyone can view demo profiles'
  ) THEN
    CREATE POLICY "Anyone can view demo profiles"
      ON public.public_demo_profiles
      FOR SELECT
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'public_demo_profiles'
      AND policyname = 'Admins can manage demo profiles'
  ) THEN
    CREATE POLICY "Admins can manage demo profiles"
      ON public.public_demo_profiles
      FOR ALL
      USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'admin'
        )
      );
  END IF;
END
$$;

-- ============================================================================
-- 2. Helper: is this user a registered demo profile?
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_demo_profile(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.public_demo_profiles dp
    WHERE dp.user_id = target_user_id
  );
$$;

-- ============================================================================
-- 3. Public read-only policies for demo datasets + admin edit rights
-- ============================================================================

-- Profiles: allow public read for demo profile rows; allow admins to edit demo profile rows
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='profiles' AND policyname='Anyone can view demo profiles'
    ) THEN
      CREATE POLICY "Anyone can view demo profiles"
        ON public.profiles
        FOR SELECT
        USING (public.is_demo_profile(id));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='profiles' AND policyname='Admins can update demo profiles'
    ) THEN
      CREATE POLICY "Admins can update demo profiles"
        ON public.profiles
        FOR UPDATE
        USING (
          public.is_demo_profile(id)
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
        WITH CHECK (
          public.is_demo_profile(id)
          AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        );
    END IF;
  END IF;
END
$$;

-- Helper macro-like predicate for demo-owned rows (tables with user_id)
-- NOTE: kept inline in policies for clarity and portability.

-- Companies
DO $$
BEGIN
  IF to_regclass('public.companies') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='companies' AND policyname='Anyone can view demo companies'
    ) THEN
      CREATE POLICY "Anyone can view demo companies"
        ON public.companies
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='companies' AND policyname='Admins can manage demo companies'
    ) THEN
      CREATE POLICY "Admins can manage demo companies"
        ON public.companies
        FOR ALL
        USING (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
        WITH CHECK (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        );
    END IF;
  END IF;
END
$$;

-- Work items (work history)
DO $$
BEGIN
  IF to_regclass('public.work_items') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='work_items' AND policyname='Anyone can view demo work items'
    ) THEN
      CREATE POLICY "Anyone can view demo work items"
        ON public.work_items
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='work_items' AND policyname='Admins can manage demo work items'
    ) THEN
      CREATE POLICY "Admins can manage demo work items"
        ON public.work_items
        FOR ALL
        USING (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
        WITH CHECK (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        );
    END IF;
  END IF;
END
$$;

-- Stories
DO $$
BEGIN
  IF to_regclass('public.stories') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='stories' AND policyname='Anyone can view demo stories'
    ) THEN
      CREATE POLICY "Anyone can view demo stories"
        ON public.stories
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='stories' AND policyname='Admins can manage demo stories'
    ) THEN
      CREATE POLICY "Admins can manage demo stories"
        ON public.stories
        FOR ALL
        USING (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
        WITH CHECK (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        );
    END IF;
  END IF;
END
$$;

-- External links
DO $$
BEGIN
  IF to_regclass('public.external_links') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='external_links' AND policyname='Anyone can view demo external links'
    ) THEN
      CREATE POLICY "Anyone can view demo external links"
        ON public.external_links
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='external_links' AND policyname='Admins can manage demo external links'
    ) THEN
      CREATE POLICY "Admins can manage demo external links"
        ON public.external_links
        FOR ALL
        USING (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
        WITH CHECK (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        );
    END IF;
  END IF;
END
$$;

-- Keep job_descriptions / cover_letters non-public to avoid leaking pasted JDs or generated content.
-- Allow admins to manage demo-owned rows for cleanup.
DO $$
BEGIN
  IF to_regclass('public.job_descriptions') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='job_descriptions' AND policyname='Admins can manage demo job descriptions'
    ) THEN
      CREATE POLICY "Admins can manage demo job descriptions"
        ON public.job_descriptions
        FOR ALL
        USING (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
        WITH CHECK (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        );
    END IF;
  END IF;

  IF to_regclass('public.cover_letters') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='cover_letters' AND policyname='Admins can manage demo cover letters'
    ) THEN
      CREATE POLICY "Admins can manage demo cover letters"
        ON public.cover_letters
        FOR ALL
        USING (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        )
        WITH CHECK (
          public.is_demo_profile(user_id)
          AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
        );
    END IF;
  END IF;
END
$$;

