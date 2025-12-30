-- Public demo: allow public read access to PM Levels job results for demo profiles.
-- The Assessment UI reads PM levels from the jobs table (type = 'pmLevels').

DO $$
BEGIN
  IF to_regclass('public.jobs') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='jobs' AND policyname='Anyone can view demo PM Levels jobs'
    ) THEN
      CREATE POLICY "Anyone can view demo PM Levels jobs"
        ON public.jobs
        FOR SELECT
        USING (
          type = 'pmLevels'
          AND public.is_demo_profile(user_id)
        );
    END IF;
  END IF;
END
$$;

