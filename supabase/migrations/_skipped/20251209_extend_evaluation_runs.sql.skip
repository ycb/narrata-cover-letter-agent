-- Evals V1.2: Extend evaluation_runs for Universal LLM Tracking
-- Migration: 20251209_extend_evaluation_runs.sql
-- Date: 2025-12-09
-- Purpose: Add columns for LLM call type, quality checks, and type-specific data to evaluation_runs

BEGIN;

-- ============================================================================
-- Part 1: Add Universal LLM Tracking Columns
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'llm_call_type'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN llm_call_type TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'prompt_name'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN prompt_name TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'prompt_version'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN prompt_version TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'quality_checks'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN quality_checks JSONB;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'quality_score'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100);
  END IF;
END $$;

-- Indexes for filtering and performance (safe if already exist)
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_llm_call_type ON public.evaluation_runs(llm_call_type);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_prompt_name ON public.evaluation_runs(prompt_name);
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_quality_score ON public.evaluation_runs(quality_score);

-- Comments
COMMENT ON COLUMN public.evaluation_runs.llm_call_type IS 
  'Type of LLM call (e.g., jd_analysis, hil_gap_role, draft_cl_generation, company_tags). Used for filtering and type-specific rendering.';

COMMENT ON COLUMN public.evaluation_runs.prompt_name IS 
  'Name of the prompt used (e.g., buildJobDescriptionAnalysisPrompt). Used for prompt performance analysis.';

COMMENT ON COLUMN public.evaluation_runs.prompt_version IS 
  'Optional version/hash of the prompt for A/B testing and tracking prompt changes over time.';

COMMENT ON COLUMN public.evaluation_runs.quality_checks IS 
  'JSONB array of structural quality checks. Format: [{"name": "has_title", "passed": true, "message": "..."}, ...]. Used for detailed quality breakdown.';

COMMENT ON COLUMN public.evaluation_runs.quality_score IS 
  'Overall quality score 0-100. Calculated from quality_checks pass rate. Used for sorting and filtering.';

-- ============================================================================
-- Part 2: Add Type-Specific Data Columns
-- ============================================================================

-- JD Analysis specific data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'jd_analysis_data'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN jd_analysis_data JSONB;
  END IF;
END $$;

COMMENT ON COLUMN public.evaluation_runs.jd_analysis_data IS 
  'Type-specific data for JD analysis. Format: {"title": "...", "company": "...", "requirements": [...], "responsibilities": [...]}. Only populated when llm_call_type = "jd_analysis".';

-- HIL (Human-in-Loop) Gap Resolution specific data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'hil_data'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN hil_data JSONB;
  END IF;
END $$;

COMMENT ON COLUMN public.evaluation_runs.hil_data IS 
  'Type-specific data for HIL gap resolution. Format: {"gap_type": "role|story|metric|saved_section|cl_draft", "original_text": "...", "suggested_text": "...", "was_accepted": true}. Only populated when llm_call_type starts with "hil_".';

-- Draft Generation specific data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'draft_generation_data'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN draft_generation_data JSONB;
  END IF;
END $$;

COMMENT ON COLUMN public.evaluation_runs.draft_generation_data IS 
  'Type-specific data for draft generation. Format: {"draft_type": "cl|metric", "sections": [...], "word_count": 250}. Only populated when llm_call_type = "draft_cl" or "draft_metrics".';

-- Company Tags specific data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'evaluation_runs'
      AND column_name = 'company_tags_data'
  ) THEN
    ALTER TABLE public.evaluation_runs ADD COLUMN company_tags_data JSONB;
  END IF;
END $$;

COMMENT ON COLUMN public.evaluation_runs.company_tags_data IS 
  'Type-specific data for company tags. Format: {"company_name": "...", "tags": ["tag1", "tag2"], "confidence_scores": {...}}. Only populated when llm_call_type = "company_tags".';

-- ============================================================================
-- Part 3: Update Existing Views/Functions (if any)
-- ============================================================================

-- Note: evaluation_runs does not currently have aggregate functions like evals_log.
-- If/when we add them, they should include the new columns.

COMMIT;
