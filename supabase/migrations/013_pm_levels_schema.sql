-- Migration: Create PM Levels schema
-- Migration: 013_pm_levels_schema.sql
--
-- Creates user_levels table to store PM level assessments
-- Includes dispute mechanism for user feedback

-- Create PM Level related enum types
CREATE TYPE pm_level_code AS ENUM ('L3', 'L4', 'L5', 'L6', 'M1', 'M2');
CREATE TYPE role_type AS ENUM ('growth', 'platform', 'ai_ml', 'founding', 'technical', 'general');
CREATE TYPE business_maturity AS ENUM ('early', 'growth', 'late');

-- Table to store PM level assessments for users
CREATE TABLE public.user_levels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  inferred_level pm_level_code NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  scope_score FLOAT NOT NULL CHECK (scope_score >= 0 AND scope_score <= 1),
  maturity_modifier FLOAT NOT NULL CHECK (maturity_modifier >= 0.8 AND maturity_modifier <= 1.2),
  role_type role_type[] DEFAULT '{}',
  delta_summary TEXT,
  recommendations JSONB DEFAULT '{}',
  competency_scores JSONB DEFAULT '{}',
  signals JSONB DEFAULT '{}',
  last_run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Dispute mechanism fields
  disputed_at TIMESTAMP WITH TIME ZONE,
  dispute_reason TEXT,
  expected_level pm_level_code,
  dispute_resolved BOOLEAN DEFAULT false,
  
  -- Ensure one assessment per user (can be updated)
  CONSTRAINT user_levels_user_id_unique UNIQUE (user_id)
);

-- Indexes for performance
CREATE INDEX idx_user_levels_user_id ON public.user_levels(user_id);
CREATE INDEX idx_user_levels_last_run_timestamp ON public.user_levels(last_run_timestamp);
CREATE INDEX idx_user_levels_inferred_level ON public.user_levels(inferred_level);
CREATE INDEX idx_user_levels_disputed ON public.user_levels(disputed_at) WHERE disputed_at IS NOT NULL;

-- RLS policies for user_levels table
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own level assessments" ON public.user_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level assessments" ON public.user_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level assessments" ON public.user_levels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own level assessments" ON public.user_levels
  FOR DELETE USING (auth.uid() = user_id);

-- Add trigger to update updated_at timestamp
-- Check if update_updated_at_column function exists, create if not
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_levels_updated_at
  BEFORE UPDATE ON public.user_levels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.user_levels IS 'Stores PM level assessments inferred from user content (resume, cover letter, LinkedIn, stories)';
COMMENT ON COLUMN public.user_levels.inferred_level IS 'PM level code: L3 (Associate), L4 (PM), L5 (Senior PM), L6 (Staff/Principal PM), M1 (Manager), M2 (Senior Manager)';
COMMENT ON COLUMN public.user_levels.confidence IS 'Confidence score 0-1 for the level inference';
COMMENT ON COLUMN public.user_levels.scope_score IS 'Scope score 0-1 based on team size, revenue impact, users impact';
COMMENT ON COLUMN public.user_levels.maturity_modifier IS 'Business maturity modifier 0.8-1.2 based on company stage';
COMMENT ON COLUMN public.user_levels.role_type IS 'Array of PM role types: growth, platform, ai_ml, founding, technical, general';
COMMENT ON COLUMN public.user_levels.delta_summary IS 'Human-readable summary of gaps between current and target level';
COMMENT ON COLUMN public.user_levels.recommendations IS 'JSONB array of actionable recommendations';
COMMENT ON COLUMN public.user_levels.competency_scores IS 'JSONB object with scores for execution, customer_insight, strategy, influence (0-3 scale)';
COMMENT ON COLUMN public.user_levels.signals IS 'JSONB object with extracted signals: scope, impact, influence, metrics';
COMMENT ON COLUMN public.user_levels.disputed_at IS 'Timestamp when user disputed the level assessment';
COMMENT ON COLUMN public.user_levels.dispute_reason IS 'User-provided reason for disputing the level';
COMMENT ON COLUMN public.user_levels.expected_level IS 'User-provided expected level when disputing';

