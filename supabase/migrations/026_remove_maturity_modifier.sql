-- Migration: 016_remove_maturity_modifier.sql
-- Purpose: Remove maturity modifier from PM Levels calculation
-- Maturity is now used for display/evidence only, not as a scoring modifier
-- Created: 2025-01-31

-- Add new maturity_info column (TEXT, stores 'early' | 'growth' | 'late')
ALTER TABLE public.user_levels
  ADD COLUMN IF NOT EXISTS maturity_info TEXT CHECK (maturity_info IN ('early', 'growth', 'late'));

-- Migrate existing data: convert maturity_modifier to maturity_info
-- 0.8 -> 'early', 1.0 -> 'growth', 1.2 -> 'late'
UPDATE public.user_levels
SET maturity_info = CASE
  WHEN maturity_modifier <= 0.85 THEN 'early'
  WHEN maturity_modifier >= 1.15 THEN 'late'
  ELSE 'growth'
END
WHERE maturity_info IS NULL;

-- Drop the old maturity_modifier column (after migration)
-- Note: We'll keep it for now in case of rollback, but mark as deprecated
-- ALTER TABLE public.user_levels DROP COLUMN maturity_modifier;

-- Update comment
COMMENT ON COLUMN public.user_levels.maturity_info IS 'Company maturity for display/evidence only (early/growth/late). Not used as scoring modifier.';

-- Add index for maturity_info
CREATE INDEX IF NOT EXISTS idx_user_levels_maturity_info 
  ON public.user_levels(maturity_info) 
  WHERE maturity_info IS NOT NULL;

