-- Migration: Create saved_sections table for reusable cover letter content
-- Migration: 011_create_saved_sections.sql
--
-- Saved sections are reusable content blocks (intro, closer, signature) that can be:
-- 1. Extracted from uploaded cover letters during parsing
-- 2. Manually created by users
-- 3. AI-generated based on work history

-- Create saved_sections table
CREATE TABLE IF NOT EXISTS public.saved_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Content
  type TEXT NOT NULL CHECK (type IN ('intro', 'closer', 'signature', 'other')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,

  -- Usage tracking
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,

  -- Source tracking
  source TEXT CHECK (source IN ('uploaded', 'manual', 'generated')),
  source_file_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,

  -- Gap detection integration
  has_gaps BOOLEAN DEFAULT false,
  gap_count INTEGER DEFAULT 0,
  gap_details JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_saved_sections_user_id ON public.saved_sections(user_id);
CREATE INDEX idx_saved_sections_type ON public.saved_sections(type);
CREATE INDEX idx_saved_sections_source_file_id ON public.saved_sections(source_file_id);
CREATE INDEX idx_saved_sections_is_default ON public.saved_sections(is_default);

-- Enable RLS
ALTER TABLE public.saved_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own saved sections" ON public.saved_sections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved sections" ON public.saved_sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved sections" ON public.saved_sections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved sections" ON public.saved_sections
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_saved_sections_updated_at
  BEFORE UPDATE ON public.saved_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.saved_sections IS 'Reusable cover letter content blocks (intros, closers, signatures) extracted from uploads or manually created';
COMMENT ON COLUMN public.saved_sections.type IS 'Type of section: intro, closer, signature, or other';
COMMENT ON COLUMN public.saved_sections.source IS 'How the section was created: uploaded (from cover letter), manual, or generated (AI)';
COMMENT ON COLUMN public.saved_sections.source_file_id IS 'Reference to the uploaded file if extracted from a cover letter';
