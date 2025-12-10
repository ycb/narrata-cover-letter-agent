-- Add timing_breakdown JSONB column to evaluation_runs for detailed performance metrics
-- Migration: 20251209_add_timing_breakdown_to_evaluation_runs.sql
-- Date: 2025-12-09
-- Purpose: Store granular timing metrics from streaming onboarding instrumentation

BEGIN;

-- Add timing_breakdown column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'timing_breakdown'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN timing_breakdown JSONB;
  END IF;
END $$;

-- Add index for querying timing data
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_timing_breakdown 
  ON public.evaluation_runs USING gin(timing_breakdown) 
  WHERE timing_breakdown IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.evaluation_runs.timing_breakdown IS 
  'Detailed timing breakdown from streaming onboarding instrumentation. Format: {
    "extraction": {"extraction_ms": 1234, "cache_hit": false, "checksum_ms": 45},
    "llm": {"stage1_skeleton_ms": 5678, "stage2_stories_ms": 8901, "stage3_skills_ms": 2345, "total_ms": 16924},
    "database": {
      "save_sections_ms": 123,
      "companies_upsert_ms": 234,
      "work_items_upsert_ms": 1234,
      "stories_insert_ms": 2345,
      "gap_detection_ms": 567,
      "skills_normalization_ms": 234,
      "total_ms": 4737
    }
  }';

COMMIT;

