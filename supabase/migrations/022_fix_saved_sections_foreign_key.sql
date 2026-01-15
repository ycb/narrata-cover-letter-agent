-- Migration: Fix saved_sections foreign key reference
-- Migration: 011_fix_saved_sections_foreign_key.sql
-- 
-- The original migration referenced uploaded_files table, but the actual table is sources.
-- This migration fixes the foreign key constraint.

-- Drop the existing foreign key constraint if it exists
DO $$
BEGIN
  -- Drop foreign key constraint on source_file_id if it references uploaded_files
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = 'saved_sections_source_file_id_fkey'
    AND table_name = 'saved_sections'
  ) THEN
    ALTER TABLE public.saved_sections 
    DROP CONSTRAINT saved_sections_source_file_id_fkey;
  END IF;
END $$;

-- Add correct foreign key constraint referencing sources table
DO $$
BEGIN
  -- Only add if sources table exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'sources'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'saved_sections'
      AND column_name = 'source_file_id'
  ) THEN
    ALTER TABLE public.saved_sections
    ADD CONSTRAINT saved_sections_source_file_id_fkey
    FOREIGN KEY (source_file_id) 
    REFERENCES public.sources(id) 
    ON DELETE SET NULL;
  END IF;
END $$;
