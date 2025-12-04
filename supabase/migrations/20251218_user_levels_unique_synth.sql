-- Migration: Add unique constraint on (user_id, synthetic_profile_id) for user_levels
-- Date: 2025-12-06

BEGIN;

-- Drop legacy unique constraint if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_levels'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'user_levels_user_id_unique'
  ) THEN
    ALTER TABLE public.user_levels DROP CONSTRAINT user_levels_user_id_unique;
  END IF;
END $$;

-- Add unique constraint on user_id + synthetic_profile_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_levels'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'user_levels_user_synth_key'
  ) THEN
    ALTER TABLE public.user_levels
      ADD CONSTRAINT user_levels_user_synth_key UNIQUE (user_id, synthetic_profile_id);
  END IF;
END $$;

COMMIT;
