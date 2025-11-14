-- Migration: 012_create_content_variations.sql
-- Purpose: Add content_variations table and saved_sections table for human-in-the-loop content generation
-- Created: 2025-11-06
-- Epic: Phase 4 - AI-Assisted Content Creation

-- ===========================
-- 1. Create saved_sections table
-- ===========================
CREATE TABLE IF NOT EXISTS public.saved_sections (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  section_type TEXT NOT NULL CHECK (section_type IN ('introduction', 'closer', 'signature', 'custom')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  is_default BOOLEAN DEFAULT false,
  addressed_gap_id UUID, -- Will add FK constraint after verifying gaps table
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for saved_sections
CREATE INDEX IF NOT EXISTS idx_saved_sections_user_id ON public.saved_sections(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_sections_section_type ON public.saved_sections(section_type);
CREATE INDEX IF NOT EXISTS idx_saved_sections_addressed_gap_id ON public.saved_sections(addressed_gap_id);

-- RLS for saved_sections
ALTER TABLE public.saved_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved sections" ON public.saved_sections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved sections" ON public.saved_sections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved sections" ON public.saved_sections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved sections" ON public.saved_sections
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- 2. Create content_variations table
-- ===========================
CREATE TABLE public.content_variations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  parent_entity_type TEXT NOT NULL CHECK (parent_entity_type IN ('approved_content', 'saved_section')),
  parent_entity_id UUID NOT NULL, -- Generic reference to parent entity (no FK due to polymorphic relation)

  -- Variation content
  title TEXT NOT NULL,
  content TEXT NOT NULL,

  -- Gap context
  filled_gap_id UUID, -- Will add FK constraint after verifying gaps table
  gap_tags TEXT[] DEFAULT '{}', -- Tags describing which gaps this addresses

  -- Job context (optional)
  target_job_title TEXT,
  target_company TEXT,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE SET NULL,

  -- Reuse tracking
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by TEXT DEFAULT 'AI' CHECK (created_by IN ('user', 'AI', 'user-edited-AI')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for content_variations
CREATE INDEX idx_content_variations_parent ON public.content_variations(parent_entity_type, parent_entity_id);
CREATE INDEX idx_content_variations_user_id ON public.content_variations(user_id);
CREATE INDEX idx_content_variations_filled_gap ON public.content_variations(filled_gap_id);
CREATE INDEX idx_content_variations_job_description ON public.content_variations(job_description_id);

-- RLS for content_variations
ALTER TABLE public.content_variations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own variations" ON public.content_variations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own variations" ON public.content_variations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own variations" ON public.content_variations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own variations" ON public.content_variations
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================
-- 3. Add foreign key constraints (after verifying gaps table exists)
-- ===========================
-- Check if gaps table exists and add FK constraints
DO $$
BEGIN
  -- Add FK for saved_sections.addressed_gap_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gaps' AND table_schema = 'public') THEN
    ALTER TABLE public.saved_sections
      ADD CONSTRAINT fk_saved_sections_addressed_gap
      FOREIGN KEY (addressed_gap_id) REFERENCES public.gaps(id) ON DELETE SET NULL;

    ALTER TABLE public.content_variations
      ADD CONSTRAINT fk_content_variations_filled_gap
      FOREIGN KEY (filled_gap_id) REFERENCES public.gaps(id) ON DELETE SET NULL;
  ELSE
    RAISE NOTICE 'Gaps table does not exist yet - FK constraints will need to be added manually';
  END IF;
END$$;

-- ===========================
-- 4. Extend gaps table to support cover_letter_drafts
-- ===========================
DO $$
DECLARE
  con_name text;
BEGIN
  -- Check if gaps table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'gaps' AND table_schema = 'public') THEN
    -- Drop existing check constraint on entity_type
    FOR con_name IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE rel.relname = 'gaps'
        AND nsp.nspname = 'public'
        AND con.contype = 'c'
        AND pg_get_constraintdef(con.oid) ILIKE '%entity_type%'
    LOOP
      EXECUTE format('ALTER TABLE public.gaps DROP CONSTRAINT %I', con_name);
    END LOOP;

    -- Recreate constraint allowing cover_letter_drafts
    ALTER TABLE public.gaps
      ADD CONSTRAINT gaps_entity_type_check
      CHECK (entity_type IN ('work_item','approved_content','saved_section','cover_letter_drafts'));
  ELSE
    RAISE NOTICE 'Gaps table does not exist yet - entity_type constraint will need to be added manually';
  END IF;
END$$;

-- ===========================
-- 5. Add trigger for updated_at timestamps
-- ===========================
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for saved_sections
DROP TRIGGER IF EXISTS update_saved_sections_updated_at ON public.saved_sections;
CREATE TRIGGER update_saved_sections_updated_at
  BEFORE UPDATE ON public.saved_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for content_variations
DROP TRIGGER IF EXISTS update_content_variations_updated_at ON public.content_variations;
CREATE TRIGGER update_content_variations_updated_at
  BEFORE UPDATE ON public.content_variations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
