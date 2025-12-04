-- Test script for evals_log migrations
-- Purpose: Validate that migrations 029 and 030 work correctly
-- Run this after applying migrations to verify schema

BEGIN;

-- ============================================================================
-- Test 1: Table exists with correct structure
-- ============================================================================

DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'evals_log'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'evals_log table does not exist';
  END IF;

  RAISE NOTICE 'Test 1 PASSED: evals_log table exists';
END $$;

-- ============================================================================
-- Test 2: Required indexes exist
-- ============================================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'evals_log'
    AND indexname IN (
      'idx_evals_log_job_id',
      'idx_evals_log_created_at',
      'idx_evals_log_job_type',
      'idx_evals_log_stage',
      'idx_evals_log_success',
      'idx_evals_log_environment',
      'idx_evals_log_job_type_stage_env',
      'idx_evals_log_user_id'
    );

  IF index_count < 8 THEN
    RAISE EXCEPTION 'Missing indexes on evals_log (expected 8, found %)', index_count;
  END IF;

  RAISE NOTICE 'Test 2 PASSED: All required indexes exist (% found)', index_count;
END $$;

-- ============================================================================
-- Test 3: Insert sample data
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
  test_job_id UUID;
  inserted_id UUID;
BEGIN
  -- Use a test user (assumes auth.users has at least one user)
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'Test 3 SKIPPED: No users in auth.users table';
    RETURN;
  END IF;

  test_job_id := gen_random_uuid();

  -- Insert test eval log
  INSERT INTO public.evals_log (
    job_id,
    job_type,
    stage,
    user_id,
    environment,
    started_at,
    completed_at,
    duration_ms,
    success,
    quality_checks,
    quality_score
  ) VALUES (
    test_job_id,
    'coverLetter',
    'jdAnalysis',
    test_user_id,
    'dev',
    NOW() - INTERVAL '5 seconds',
    NOW(),
    5000,
    true,
    '{"passed": true, "checks": [{"name": "Test Check", "passed": true, "severity": "critical"}]}'::JSONB,
    95
  ) RETURNING id INTO inserted_id;

  IF inserted_id IS NULL THEN
    RAISE EXCEPTION 'Failed to insert test eval log';
  END IF;

  RAISE NOTICE 'Test 3 PASSED: Successfully inserted test eval log (id: %)', inserted_id;

  -- Cleanup
  DELETE FROM public.evals_log WHERE id = inserted_id;
END $$;

-- ============================================================================
-- Test 4: Aggregate functions exist and are callable
-- ============================================================================

DO $$
DECLARE
  func_count INTEGER;
  test_result RECORD;
BEGIN
  -- Check functions exist
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'get_evals_aggregate_by_job_type',
      'get_evals_aggregate_by_stage',
      'get_evals_quality_score_distribution',
      'get_evals_recent_failures'
    );

  IF func_count < 4 THEN
    RAISE EXCEPTION 'Missing aggregate functions (expected 4, found %)', func_count;
  END IF;

  RAISE NOTICE 'Test 4 PASSED: All aggregate functions exist (% found)', func_count;

  -- Test function is callable (should return empty result if no data)
  SELECT * INTO test_result
  FROM public.get_evals_aggregate_by_job_type(NOW() - INTERVAL '7 days')
  LIMIT 1;

  RAISE NOTICE 'Test 4 PASSED: get_evals_aggregate_by_job_type is callable';
END $$;

-- ============================================================================
-- Test 5: Check constraints work
-- ============================================================================

DO $$
DECLARE
  constraint_error BOOLEAN := false;
  test_user_id UUID;
BEGIN
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE 'Test 5 SKIPPED: No users in auth.users table';
    RETURN;
  END IF;

  -- Try to insert invalid job_type (should fail)
  BEGIN
    INSERT INTO public.evals_log (
      job_id,
      job_type,
      stage,
      user_id,
      started_at,
      success
    ) VALUES (
      gen_random_uuid(),
      'invalidJobType', -- Invalid!
      'testStage',
      test_user_id,
      NOW(),
      true
    );
  EXCEPTION WHEN check_violation THEN
    constraint_error := true;
  END;

  IF NOT constraint_error THEN
    RAISE EXCEPTION 'Check constraint on job_type did not work';
  END IF;

  RAISE NOTICE 'Test 5 PASSED: Check constraints are enforced';
END $$;

-- ============================================================================
-- Test 6: RLS policies exist
-- ============================================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'evals_log'
    AND policyname IN (
      'Users can view their own eval logs',
      'System can insert eval logs',
      'System can update eval logs'
    );

  IF policy_count < 3 THEN
    RAISE EXCEPTION 'Missing RLS policies (expected 3, found %)', policy_count;
  END IF;

  RAISE NOTICE 'Test 6 PASSED: RLS policies exist (% found)', policy_count;
END $$;

RAISE NOTICE '
===========================================
ALL TESTS PASSED ✅
===========================================
evals_log table is ready for use.
';

ROLLBACK; -- Don't commit test data

