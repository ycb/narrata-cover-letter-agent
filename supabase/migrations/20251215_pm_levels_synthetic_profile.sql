-- Migration: Add synthetic_profile_id to user_levels and adjust uniqueness
-- Date: 2025-12-06
-- Purpose: allow multiple PM level snapshots per real user keyed by synthetic profile id (instead of synthetic_ prefix)

BEGIN;

-- Add synthetic_profile_id column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_levels' AND column_name = 'synthetic_profile_id'
  ) THEN
    ALTER TABLE public.user_levels
      ADD COLUMN synthetic_profile_id TEXT;
    COMMENT ON COLUMN public.user_levels.synthetic_profile_id IS 'Synthetic profile id (e.g., P01). Allows multiple PM level rows per parent user.';
  END IF;
END $$;

-- Drop existing unique constraint on user_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'user_levels' AND constraint_type = 'UNIQUE'
      AND constraint_name = 'user_levels_user_id_unique'
  ) THEN
    ALTER TABLE public.user_levels DROP CONSTRAINT user_levels_user_id_unique;
  END IF;
END $$;

-- Create expression unique index to ensure one row per (user_id, synthetic_profile_id or empty)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_levels_user_synthetic
  ON public.user_levels (user_id, COALESCE(synthetic_profile_id, ''));

COMMIT;
