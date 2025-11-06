-- Migration: Create gaps table for gap detection tracking
-- Date: 2025-01-31
-- Phase 3: Gap Detection Service Implementation

-- Create gaps table
CREATE TABLE IF NOT EXISTS public.gaps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('work_item', 'approved_content')),
  entity_id UUID NOT NULL,
  gap_type TEXT NOT NULL CHECK (gap_type IN ('data_quality', 'best_practice', 'role_expectation')),
  gap_category TEXT NOT NULL, -- 'missing_metrics', 'incomplete_story', 'too_generic', etc.
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  description TEXT,
  suggestions JSONB DEFAULT '[]'::jsonb,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_reason TEXT CHECK (resolved_reason IN ('user_override', 'content_added', 'manual_resolve', 'no_longer_applicable')),
  addressing_content_ids UUID[] DEFAULT '{}', -- IDs of content that addresses this gap
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_gaps_user_id ON public.gaps(user_id);
CREATE INDEX IF NOT EXISTS idx_gaps_entity ON public.gaps(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_gaps_resolved ON public.gaps(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_gaps_severity ON public.gaps(severity);
CREATE INDEX IF NOT EXISTS idx_gaps_gap_category ON public.gaps(gap_category);

-- Add column to approved_content for bidirectional tracking
ALTER TABLE public.approved_content 
  ADD COLUMN IF NOT EXISTS addressed_gap_id UUID REFERENCES public.gaps(id) ON DELETE SET NULL;

-- Create index for addressed_gap_id
CREATE INDEX IF NOT EXISTS idx_approved_content_addressed_gap_id ON public.approved_content(addressed_gap_id);

-- Enable RLS
ALTER TABLE public.gaps ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own gaps
CREATE POLICY "Users can view their own gaps"
  ON public.gaps FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own gaps
CREATE POLICY "Users can insert their own gaps"
  ON public.gaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own gaps
CREATE POLICY "Users can update their own gaps"
  ON public.gaps FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own gaps
CREATE POLICY "Users can delete their own gaps"
  ON public.gaps FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE public.gaps IS 'Gap detection results for work items and approved content. Tracks data quality, best practice, and role expectation gaps with resolution tracking.';

