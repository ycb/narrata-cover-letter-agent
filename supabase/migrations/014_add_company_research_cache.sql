-- Migration: 014_add_company_research_cache.sql
-- Purpose: Add research cache columns to companies table for browser search results
-- Created: 2025-01-31
-- Epic: Auto-Suggest Tags Feature

-- Add research cache columns to companies table
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS research_cache JSONB,
  ADD COLUMN IF NOT EXISTS research_cached_at TIMESTAMP WITH TIME ZONE;

-- Add index for faster lookups (optional, but helpful if we query by cached_at)
CREATE INDEX IF NOT EXISTS idx_companies_research_cached_at 
  ON companies(research_cached_at) 
  WHERE research_cached_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN companies.research_cache IS 'Cached company research data from browser search (industry, business model, stage, size, etc.)';
COMMENT ON COLUMN companies.research_cached_at IS 'Timestamp when research data was cached';

