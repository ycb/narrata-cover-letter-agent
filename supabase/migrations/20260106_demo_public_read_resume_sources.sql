-- Public demo: allow public read access to resume sources for demo profiles.
-- The Work History "Resume" panel reads from public.sources (raw_text, file metadata).
-- We scope this to resume uploads only (source_type = 'resume') to avoid exposing other uploads.

DO $$
BEGIN
  IF to_regclass('public.sources') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename='sources' AND policyname='Anyone can view demo resume sources'
    ) THEN
      CREATE POLICY "Anyone can view demo resume sources"
        ON public.sources
        FOR SELECT
        USING (
          source_type = 'resume'
          AND public.is_demo_profile(user_id)
        );
    END IF;
  END IF;
END
$$;

