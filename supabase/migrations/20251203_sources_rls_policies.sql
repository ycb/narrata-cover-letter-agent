-- RLS policies for sources table to allow authenticated users to manage their own rows
-- Safe to run repeatedly

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='insert_own_sources'
  ) THEN
    EXECUTE $SQL$
      CREATE POLICY insert_own_sources
      ON public.sources
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
    $SQL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='update_own_sources'
  ) THEN
    EXECUTE $SQL$
      CREATE POLICY update_own_sources
      ON public.sources
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid());
    $SQL$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='sources' AND policyname='select_own_sources'
  ) THEN
    EXECUTE $SQL$
      CREATE POLICY select_own_sources
      ON public.sources
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
    $SQL$;
  END IF;
END $$;


