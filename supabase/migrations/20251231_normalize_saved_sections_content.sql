-- Migration: Normalize saved sections content to remove excess line breaks
-- Date: 2025-12-31
-- Description: Fixes saved sections that were parsed with old parser version
--              which preserved single newlines within paragraphs

-- Create a function to normalize content (remove single newlines within paragraphs)
CREATE OR REPLACE FUNCTION normalize_saved_section_content(content TEXT)
RETURNS TEXT AS $$
DECLARE
  paragraphs TEXT[];
  paragraph TEXT;
  normalized TEXT := '';
BEGIN
  -- If content is null or empty, return as-is
  IF content IS NULL OR content = '' THEN
    RETURN content;
  END IF;
  
  -- Split by double newlines (paragraph boundaries)
  paragraphs := regexp_split_to_array(content, E'\\n\\s*\\n+');
  
  -- Process each paragraph
  FOREACH paragraph IN ARRAY paragraphs
  LOOP
    -- Skip empty paragraphs
    IF trim(paragraph) = '' THEN
      CONTINUE;
    END IF;
    
    -- Normalize each paragraph:
    -- 1. Replace newlines with spaces
    -- 2. Collapse multiple spaces to single space
    -- 3. Trim whitespace
    paragraph := trim(regexp_replace(
      regexp_replace(paragraph, E'\\n', ' ', 'g'),
      E'\\s+', ' ', 'g'
    ));
    
    -- Add to result with double newline separator
    IF normalized = '' THEN
      normalized := paragraph;
    ELSE
      normalized := normalized || E'\\n\\n' || paragraph;
    END IF;
  END LOOP;
  
  RETURN normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update all existing saved sections to normalize their content
-- This will fix sections that have excess line breaks within paragraphs
UPDATE saved_sections
SET 
  content = normalize_saved_section_content(content),
  updated_at = NOW()
WHERE 
  -- Only update sections that contain single newlines (not just double newlines)
  -- This avoids updating already-normalized content
  content ~ E'[^\\n]\\n[^\\n]';

-- Add a comment to the function
COMMENT ON FUNCTION normalize_saved_section_content IS 
  'Normalizes saved section content by removing single newlines within paragraphs while preserving double newlines between paragraphs';

