-- Add source column to stories table to track data provenance
-- Tracks where the story originated: resume, linkedin, cover_letter, or manual entry

DO $$ 
BEGIN
  -- Only add if stories table exists and column doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'stories'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'stories' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE public.stories 
    ADD COLUMN source TEXT;
    
    -- Set default for existing rows
    UPDATE public.stories 
    SET source = 'manual' 
    WHERE source IS NULL;
    
    -- Add comment for documentation
    COMMENT ON COLUMN public.stories.source IS 'Origin of the story: resume, linkedin, cover_letter, or manual';
  END IF;
END $$;


















