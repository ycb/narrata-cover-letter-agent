-- Migration: 015_add_company_stage_maturity.sql
-- Purpose: Add company_stage and maturity columns to companies table for PM Levels calculation
-- Created: 2025-01-31
-- Epic: Auto-Suggest Tags Feature / PM Levels Integration

-- Add company_stage column (stores raw stage from research: startup, growth-stage, established, enterprise)
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS company_stage TEXT;

-- Add maturity column (stores normalized maturity for PM Levels: early, growth, late)
-- This maps to business_maturity enum used in PM Levels
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS maturity TEXT CHECK (maturity IN ('early', 'growth', 'late'));

-- Add index for faster lookups by maturity (useful for PM Levels queries)
CREATE INDEX IF NOT EXISTS idx_companies_maturity 
  ON companies(maturity) 
  WHERE maturity IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN companies.company_stage IS 'Company stage from research: startup, growth-stage, established, enterprise';
COMMENT ON COLUMN companies.maturity IS 'Normalized maturity for PM Levels: early (0.8x), growth (1.0x), late (1.2x)';

-- Backfill maturity from research_cache if available
-- Map companyStage from research_cache to maturity
-- Only run if research_cache column exists (migration 014 may not have run yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'research_cache'
  ) THEN
    UPDATE companies
    SET 
      company_stage = CASE 
        WHEN research_cache->>'companyStage' IS NOT NULL 
        THEN research_cache->>'companyStage'
        ELSE NULL
      END,
      maturity = CASE
        WHEN research_cache->>'companyStage' = 'startup' THEN 'early'
        WHEN research_cache->>'companyStage' = 'growth-stage' THEN 'growth'
        WHEN research_cache->>'companyStage' = 'established' THEN 'late'
        WHEN research_cache->>'companyStage' = 'enterprise' THEN 'late'
        ELSE NULL
      END
    WHERE research_cache IS NOT NULL 
      AND research_cache->>'companyStage' IS NOT NULL
      AND (company_stage IS NULL OR maturity IS NULL);
  END IF;
END $$;

