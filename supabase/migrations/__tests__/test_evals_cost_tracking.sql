-- Test Suite: Cost Tracking Schema Extensions
-- Purpose: Validate 20251208_add_prompt_and_cost_metadata.sql and 20251209_extend_evaluation_runs.sql
-- Run with: psql -f supabase/migrations/__tests__/test_evals_cost_tracking.sql

BEGIN;

-- ============================================================================
-- Test 1: evals_log has new columns
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'evals_log'
    AND column_name IN ('prompt_name', 'prompt_version', 'model', 'prompt_tokens', 'completion_tokens', 'total_tokens');
  
  IF col_count = 6 THEN
    RAISE NOTICE '✓ Test 1 PASSED: evals_log has all 6 new columns';
  ELSE
    RAISE EXCEPTION '✗ Test 1 FAILED: Expected 6 new columns, found %', col_count;
  END IF;
END $$;

-- ============================================================================
-- Test 2: evals_log has correct indexes
-- ============================================================================

DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'evals_log'
    AND indexname IN ('idx_evals_log_prompt_name', 'idx_evals_log_model', 'idx_evals_log_prompt_version');
  
  IF idx_count = 3 THEN
    RAISE NOTICE '✓ Test 2 PASSED: evals_log has all 3 new indexes';
  ELSE
    RAISE EXCEPTION '✗ Test 2 FAILED: Expected 3 new indexes, found %', idx_count;
  END IF;
END $$;

-- ============================================================================
-- Test 3: get_evals_cost_by_job_type function exists and returns correct structure
-- ============================================================================

DO $$
DECLARE
  func_exists BOOLEAN;
  test_result RECORD;
BEGIN
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_evals_cost_by_job_type'
      AND pronargs = 1
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE EXCEPTION '✗ Test 3 FAILED: get_evals_cost_by_job_type function does not exist';
  END IF;
  
  -- Test function execution (should return empty result, but valid structure)
  SELECT * INTO test_result FROM get_evals_cost_by_job_type(NOW() - INTERVAL '30 days') LIMIT 1;
  
  RAISE NOTICE '✓ Test 3 PASSED: get_evals_cost_by_job_type function exists and executes';
END $$;

-- ============================================================================
-- Test 4: get_evals_cost_by_prompt function exists and returns correct structure
-- ============================================================================

DO $$
DECLARE
  func_exists BOOLEAN;
  test_result RECORD;
BEGIN
  -- Check function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_evals_cost_by_prompt'
  ) INTO func_exists;
  
  IF NOT func_exists THEN
    RAISE EXCEPTION '✗ Test 4 FAILED: get_evals_cost_by_prompt function does not exist';
  END IF;
  
  -- Test function execution
  SELECT * INTO test_result FROM get_evals_cost_by_prompt(NOW() - INTERVAL '30 days') LIMIT 1;
  
  RAISE NOTICE '✓ Test 4 PASSED: get_evals_cost_by_prompt function exists and executes';
END $$;

-- ============================================================================
-- Test 5: evaluation_runs has new universal columns
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'evaluation_runs'
    AND column_name IN ('llm_call_type', 'prompt_name', 'prompt_version', 'quality_checks', 'quality_score');
  
  IF col_count = 5 THEN
    RAISE NOTICE '✓ Test 5 PASSED: evaluation_runs has all 5 new universal columns';
  ELSE
    RAISE EXCEPTION '✗ Test 5 FAILED: Expected 5 new universal columns, found %', col_count;
  END IF;
END $$;

-- ============================================================================
-- Test 6: evaluation_runs has new type-specific columns
-- ============================================================================

DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'evaluation_runs'
    AND column_name IN ('jd_analysis_data', 'hil_data', 'draft_generation_data', 'company_tags_data');
  
  IF col_count = 4 THEN
    RAISE NOTICE '✓ Test 6 PASSED: evaluation_runs has all 4 type-specific columns';
  ELSE
    RAISE EXCEPTION '✗ Test 6 FAILED: Expected 4 type-specific columns, found %', col_count;
  END IF;
END $$;

-- ============================================================================
-- Test 7: evaluation_runs has correct indexes
-- ============================================================================

DO $$
DECLARE
  idx_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO idx_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'evaluation_runs'
    AND indexname IN ('idx_evaluation_runs_llm_call_type', 'idx_evaluation_runs_prompt_name', 'idx_evaluation_runs_quality_score');
  
  IF idx_count = 3 THEN
    RAISE NOTICE '✓ Test 7 PASSED: evaluation_runs has all 3 new indexes';
  ELSE
    RAISE EXCEPTION '✗ Test 7 FAILED: Expected 3 new indexes, found %', idx_count;
  END IF;
END $$;

-- ============================================================================
-- Test 8: quality_score constraint works correctly
-- ============================================================================

DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a valid user_id for testing
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_user_id IS NULL THEN
    -- Create a test user if none exist
    test_user_id := gen_random_uuid();
  END IF;
  
  -- Test valid quality_score (should succeed)
  BEGIN
    INSERT INTO evaluation_runs (user_id, source_type, source_id, quality_score)
    VALUES (test_user_id, 'test', 'test-constraint-1', 75);
    
    DELETE FROM evaluation_runs WHERE source_id = 'test-constraint-1';
    RAISE NOTICE '✓ Test 8a PASSED: quality_score accepts valid value (75)';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION '✗ Test 8a FAILED: quality_score rejected valid value: %', SQLERRM;
  END;
  
  -- Test invalid quality_score (should fail)
  BEGIN
    INSERT INTO evaluation_runs (user_id, source_type, source_id, quality_score)
    VALUES (test_user_id, 'test', 'test-constraint-2', 150);
    
    DELETE FROM evaluation_runs WHERE source_id = 'test-constraint-2';
    RAISE EXCEPTION '✗ Test 8b FAILED: quality_score accepted invalid value (150)';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE '✓ Test 8b PASSED: quality_score rejected invalid value (150)';
  END;
END $$;

-- ============================================================================
-- Test 9: Cost calculation is correct for known token counts
-- ============================================================================

DO $$
DECLARE
  test_job_id UUID := gen_random_uuid();
  cost_result RECORD;
  expected_cost DOUBLE PRECISION;
BEGIN
  -- Insert test data with known token counts
  -- gpt-4o: 1000 prompt tokens = $0.0025, 2000 completion tokens = $0.02
  -- Expected total: $0.0225
  INSERT INTO evals_log (
    job_id, job_type, stage_name, 
    prompt_name, model, 
    prompt_tokens, completion_tokens, total_tokens,
    success, duration_ms
  ) VALUES (
    test_job_id, 'test_job', 'test_stage',
    'test_prompt', 'gpt-4o',
    1000, 2000, 3000,
    true, 1000
  );
  
  -- Query cost function
  SELECT * INTO cost_result 
  FROM get_evals_cost_by_job_type(NOW() - INTERVAL '1 hour')
  WHERE job_type = 'test_job';
  
  expected_cost := (1000 * 2.5 / 1000000.0) + (2000 * 10.0 / 1000000.0);
  
  IF ABS(cost_result.estimated_cost_usd - expected_cost) < 0.0001 THEN
    RAISE NOTICE '✓ Test 9 PASSED: Cost calculation correct (expected: $%, got: $%)', 
      expected_cost, cost_result.estimated_cost_usd;
  ELSE
    RAISE EXCEPTION '✗ Test 9 FAILED: Cost calculation incorrect (expected: $%, got: $%)', 
      expected_cost, cost_result.estimated_cost_usd;
  END IF;
  
  -- Cleanup
  DELETE FROM evals_log WHERE job_id = test_job_id;
END $$;

-- ============================================================================
-- Test Summary
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✓ ALL TESTS PASSED: Cost Tracking Schema';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'evals_log: 6 new columns, 3 indexes';
  RAISE NOTICE 'evaluation_runs: 9 new columns, 3 indexes';
  RAISE NOTICE 'Functions: get_evals_cost_by_job_type, get_evals_cost_by_prompt';
  RAISE NOTICE 'Constraints: quality_score [0-100], cost calculation verified';
  RAISE NOTICE '';
END $$;

ROLLBACK;

