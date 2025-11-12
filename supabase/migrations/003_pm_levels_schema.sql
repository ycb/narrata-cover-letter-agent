-- PM Levels Service schema
-- Migration: 003_pm_levels_schema.sql

-- User levels table for PM level inference
CREATE TABLE public.user_levels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  inferred_level TEXT NOT NULL, -- e.g., "L4", "Senior PM"
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  scope_score FLOAT NOT NULL CHECK (scope_score >= 0 AND scope_score <= 1),
  maturity_modifier FLOAT NOT NULL CHECK (maturity_modifier >= 0.8 AND maturity_modifier <= 1.2),
  role_type TEXT[] DEFAULT '{}', -- e.g., ['growth', 'ai_ml', 'platform']
  delta_summary TEXT, -- Human-readable summary of gaps to next level
  recommendations JSONB DEFAULT '{}', -- Structured action recommendations
  competency_scores JSONB DEFAULT '{}', -- Store individual competency scores
  signals JSONB DEFAULT '{}', -- Store extracted signals for reference
  last_run_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One level assessment per user
);

-- Create indexes for performance
CREATE INDEX idx_user_levels_user_id ON public.user_levels(user_id);
CREATE INDEX idx_user_levels_inferred_level ON public.user_levels(inferred_level);
CREATE INDEX idx_user_levels_last_run_timestamp ON public.user_levels(last_run_timestamp);

-- Enable Row Level Security
ALTER TABLE public.user_levels ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_levels table
CREATE POLICY "Users can view their own level assessments" ON public.user_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own level assessments" ON public.user_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own level assessments" ON public.user_levels
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own level assessments" ON public.user_levels
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_user_levels_updated_at 
  BEFORE UPDATE ON public.user_levels 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

