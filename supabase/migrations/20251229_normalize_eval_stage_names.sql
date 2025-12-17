-- Normalize Stage Names in evals_log
-- Migration: 20251216_normalize_eval_stage_names.sql
-- Purpose: Standardize stage naming convention to camelCase with dot notation for sub-stages

BEGIN;

-- Backup current stage names (for rollback)
-- SELECT DISTINCT stage, COUNT(*) FROM evals_log GROUP BY stage ORDER BY stage;

-- Normalize historical stage names
UPDATE evals_log 
SET stage = CASE
  -- Cover Letter Pipeline
  WHEN stage = 'goalsAndStrengths_mws' THEN 'goalsAndStrengths.mws'
  WHEN stage = 'goalsAndStrengths_company_context' THEN 'goalsAndStrengths.companyContext'
  WHEN stage = 'jd_analysis' THEN 'jdAnalysis'
  WHEN stage = 'company_tags_extraction' THEN 'companyTags'
  WHEN stage = 'structural_checks' AND job_type = 'coverLetter' THEN 'structuralChecks'
  
  -- PM Levels Pipeline
  WHEN stage = 'structural_checks' AND job_type = 'pmLevels' THEN 'structuralChecks'
  
  -- Onboarding Pipeline (future-proofing)
  WHEN stage = 'text_extraction' THEN 'extraction'
  WHEN stage = 'llm_analysis' THEN 'llmAnalysis'
  WHEN stage = 'database_save' THEN 'databaseSave'
  WHEN stage = 'gap_heuristics' THEN 'gapHeuristics'
  WHEN stage = 'skills_normalization' THEN 'skillsNormalization'
  
  ELSE stage
END
WHERE stage IN (
  -- Cover Letter
  'goalsAndStrengths_mws',
  'goalsAndStrengths_company_context',
  'jd_analysis',
  'company_tags_extraction',
  'structural_checks',
  -- Onboarding (if any)
  'text_extraction',
  'llm_analysis',
  'database_save',
  'gap_heuristics',
  'skills_normalization'
);

-- Add comment explaining stage naming convention
COMMENT ON COLUMN public.evals_log.stage IS 
'Stage name in camelCase format. Primary stages (e.g., jdAnalysis, requirementAnalysis) track overall execution. Sub-stages use dot notation (e.g., goalsAndStrengths.mws, goalsAndStrengths.companyContext) for detailed token tracking. Convention: <primaryStage>[.<subStage>]';

-- Log migration result
DO $$
DECLARE
  updated_count INT;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM evals_log 
  WHERE stage LIKE '%.%' OR stage ~ '^[a-z][a-zA-Z]*$';
  
  RAISE NOTICE 'Migration complete. Normalized % rows to camelCase + dot notation.', updated_count;
END $$;

COMMIT;

