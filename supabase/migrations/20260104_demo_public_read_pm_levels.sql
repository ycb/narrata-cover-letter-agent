-- Public demo: allow public read access to PM level assessments for demo profiles

DO $$
BEGIN
  IF to_regclass('public.user_levels') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='user_levels' AND policyname='Anyone can view demo PM level assessments'
    ) THEN
      CREATE POLICY "Anyone can view demo PM level assessments"
        ON public.user_levels
        FOR SELECT
        USING (public.is_demo_profile(user_id));
    END IF;
  END IF;
END
$$;

