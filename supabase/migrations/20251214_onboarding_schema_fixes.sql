-- Migration: Onboarding schema fixes for streaming branch
-- Date: 2025-12-06
-- Purpose:
--   - Align saved_sections with streaming cover letter pipeline (add is_dynamic, source_type, updated type check)
--   - Add source_type/source_id to stories for provenance
--   - Create user_voice table expected by cover letter processing

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- saved_sections: add is_dynamic, source_type, and relax type check to include body/closing
DO $$
BEGIN
  -- is_dynamic flag (static vs dynamic sections)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saved_sections' AND column_name = 'is_dynamic'
  ) THEN
    ALTER TABLE public.saved_sections
      ADD COLUMN is_dynamic BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.saved_sections.is_dynamic IS 'Whether the section is dynamic (true) or static (false). Imported CL sections default to false.';
  END IF;

  -- source_type (e.g., cover_letter, manual, generated)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'saved_sections' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.saved_sections
      ADD COLUMN source_type TEXT;
    COMMENT ON COLUMN public.saved_sections.source_type IS 'Logical source of the section: cover_letter, manual, generated, etc.';
  END IF;

  -- Update type check constraint to allow intro/body/closing (streaming parser emits these)
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_schema = 'public' AND table_name = 'saved_sections' AND constraint_name LIKE 'saved_sections_type_check%'
  ) THEN
    ALTER TABLE public.saved_sections DROP CONSTRAINT IF EXISTS saved_sections_type_check;
  END IF;
  -- Preserve legacy values (closer/signature) while allowing new parser values (intro/body/closing/other)
  ALTER TABLE public.saved_sections
    ADD CONSTRAINT saved_sections_type_check CHECK (
      type IS NULL OR type IN ('intro', 'body', 'closing', 'closer', 'signature', 'other')
    ) NOT VALID;
END $$;

-- stories: add source_type and source_id for provenance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stories' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE public.stories
      ADD COLUMN source_type TEXT;
    COMMENT ON COLUMN public.stories.source_type IS 'Origin of the story: resume, linkedin, cover_letter, or manual';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'stories' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE public.stories
      ADD COLUMN source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;
    COMMENT ON COLUMN public.stories.source_id IS 'Reference to the source record that produced this story';
  END IF;
END $$;

-- user_voice table: store extracted voice prompt (one row per user)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_voice'
  ) THEN
    CREATE TABLE public.user_voice (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      source_type TEXT,
      source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX idx_user_voice_user_id ON public.user_voice(user_id);

    ALTER TABLE public.user_voice ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can view own voice" ON public.user_voice
      FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own voice" ON public.user_voice
      FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own voice" ON public.user_voice
      FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY "Users can delete own voice" ON public.user_voice
      FOR DELETE USING (auth.uid() = user_id);

    COMMENT ON TABLE public.user_voice IS 'Stores extracted user voice prompt (single cohesive block) per user';
    COMMENT ON COLUMN public.user_voice.prompt IS 'Cohesive prompt describing user voice/style';
  END IF;
END $$;

COMMIT;
