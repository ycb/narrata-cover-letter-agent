-- Draft Cover Letter MVP schema updates

-- Extend job_descriptions with structured data and tagging support
ALTER TABLE public.job_descriptions
  ADD COLUMN IF NOT EXISTS structured_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS standard_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS differentiator_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS differentiator_notes TEXT;

-- Ensure llm_feedback can be stored incrementally and add analytics envelope
ALTER TABLE public.cover_letters
  ALTER COLUMN llm_feedback SET DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analytics JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;

-- Workpad storage for resilient draft generation checkpoints
CREATE TABLE IF NOT EXISTS public.cover_letter_workpads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  draft_id UUID REFERENCES public.cover_letters(id) ON DELETE CASCADE,
  job_description_id UUID REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
  phase TEXT DEFAULT 'idle',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cover_letter_workpads_draft_id
  ON public.cover_letter_workpads(draft_id)
  WHERE draft_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cover_letter_workpads_user_phase
  ON public.cover_letter_workpads(user_id, phase);

DO $$
BEGIN
  CREATE TRIGGER update_cover_letter_workpads_updated_at
    BEFORE UPDATE ON public.cover_letter_workpads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Enable RLS and mirror standard ownership policies
ALTER TABLE public.cover_letter_workpads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cover_letter_workpads'
      AND policyname = 'Users can view own cover letter workpads'
  ) THEN
    CREATE POLICY "Users can view own cover letter workpads"
      ON public.cover_letter_workpads
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cover_letter_workpads'
      AND policyname = 'Users can insert own cover letter workpads'
  ) THEN
    CREATE POLICY "Users can insert own cover letter workpads"
      ON public.cover_letter_workpads
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cover_letter_workpads'
      AND policyname = 'Users can update own cover letter workpads'
  ) THEN
    CREATE POLICY "Users can update own cover letter workpads"
      ON public.cover_letter_workpads
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'cover_letter_workpads'
      AND policyname = 'Users can delete own cover letter workpads'
  ) THEN
    CREATE POLICY "Users can delete own cover letter workpads"
      ON public.cover_letter_workpads
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Additional indexes for cover_letter analytics access patterns
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_status
  ON public.cover_letters(user_id, status);

CREATE INDEX IF NOT EXISTS idx_cover_letters_job_description
  ON public.cover_letters(job_description_id);
