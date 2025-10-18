-- Migration: Add source_type column to sources table
-- This allows tracking different types of uploaded files (resume, cover_letter, etc.)

-- Add source_type column with constraint
ALTER TABLE public.sources 
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'resume' 
CHECK (source_type IN ('resume', 'cover_letter'));

-- Create index for filtering by source_type
CREATE INDEX idx_sources_source_type ON public.sources(source_type);

-- Add composite index for common queries (user + type)
CREATE INDEX idx_sources_user_type ON public.sources(user_id, source_type);
