-- Migration: Allow authenticated users to insert their own evals_log entries
-- Purpose: Enable frontend services to log LLM performance metrics directly
-- Context: Phase 6A HIL instrumentation (Option 2: RPC approach)

BEGIN;

DO $$
BEGIN
  -- Create policy for authenticated users to insert their own evals_log rows
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'evals_log' 
      AND policyname = 'Users can insert own evals_log entries'
  ) THEN
    CREATE POLICY "Users can insert own evals_log entries"
      ON public.evals_log
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Add comment explaining the policy (safe if already exists)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'evals_log' 
      AND policyname = 'Users can insert own evals_log entries'
  ) THEN
    COMMENT ON POLICY "Users can insert own evals_log entries" ON public.evals_log IS
      'Allows authenticated users to log LLM performance metrics for their own operations. Used by frontend services (HIL, draft generation, etc.) to instrument LLM calls without requiring edge function wrappers.';
    RAISE NOTICE 'Policy "Users can insert own evals_log entries" present';
  END IF;
END $$;

COMMIT;
