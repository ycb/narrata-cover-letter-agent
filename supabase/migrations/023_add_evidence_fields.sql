-- Migration: Add evidence fields to user_levels table
-- Migration: 014_add_evidence_fields.sql
--
-- Adds JSONB columns to store evidence collected for PM level assessment
-- This includes competency evidence, level evidence, and role archetype evidence

-- Add evidence columns to user_levels table
ALTER TABLE public.user_levels
  ADD COLUMN IF NOT EXISTS evidence_by_competency JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS level_evidence JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS role_archetype_evidence JSONB DEFAULT '{}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN public.user_levels.evidence_by_competency IS 'JSONB object mapping each competency dimension to supporting stories and evidence';
COMMENT ON COLUMN public.user_levels.level_evidence IS 'JSONB object with resume evidence, story evidence, and leveling framework analysis';
COMMENT ON COLUMN public.user_levels.role_archetype_evidence IS 'JSONB object mapping role types to evidence of specialization match';

-- Create GIN indexes for JSONB columns to enable efficient querying
CREATE INDEX IF NOT EXISTS idx_user_levels_evidence_competency ON public.user_levels USING GIN (evidence_by_competency);
CREATE INDEX IF NOT EXISTS idx_user_levels_evidence_level ON public.user_levels USING GIN (level_evidence);
CREATE INDEX IF NOT EXISTS idx_user_levels_evidence_role ON public.user_levels USING GIN (role_archetype_evidence);

