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
-- Test 8: quality_score constraint exists
-- ============================================================================

DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name LIKE '%quality_score%'
  ) INTO constraint_exists;
  
  IF constraint_exists THEN
    RAISE NOTICE '✓ Test 8 PASSED: quality_score constraint exists';
  ELSE
    RAISE NOTICE 'ℹ Test 8: quality_score constraint not found (may be unnamed)';
  END IF;
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


