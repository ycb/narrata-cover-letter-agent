-- Migration: Create unified user_skills table
-- Migration: 006_create_user_skills_table.sql
-- 
-- Creates a unified skills table to normalize skills from all sources:
-- - LinkedIn profiles (currently TEXT[])
-- - Resume sources (currently JSONB)
-- - Manual additions (future)

-- Create user_skills table
CREATE TABLE public.user_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  category TEXT, -- e.g., "Product Management", "Technical", "Design"
  source_type TEXT NOT NULL CHECK (source_type IN ('resume', 'linkedin', 'cover_letter', 'manual')),
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL, -- NULL for manual additions
  linkedin_profile_id UUID REFERENCES public.linkedin_profiles(id) ON DELETE SET NULL, -- For LinkedIn source
  proficiency TEXT CHECK (proficiency IN ('beginner', 'intermediate', 'advanced', 'expert')), -- Future: user-rated proficiency
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
  -- Note: Unique constraints handled via partial indexes below
);

-- Create indexes for performance
CREATE INDEX idx_user_skills_user_id ON public.user_skills(user_id);
CREATE INDEX idx_user_skills_skill ON public.user_skills(skill);
CREATE INDEX idx_user_skills_category ON public.user_skills(category);
CREATE INDEX idx_user_skills_source_type ON public.user_skills(source_type);
CREATE INDEX idx_user_skills_user_skill ON public.user_skills(user_id, skill); -- For deduplication queries

-- Partial unique indexes to prevent duplicates per source type
-- For resume/cover_letter sources (source_id is NOT NULL)
CREATE UNIQUE INDEX idx_user_skills_unique_source 
  ON public.user_skills(user_id, skill, source_type, source_id) 
  WHERE source_id IS NOT NULL;

-- For LinkedIn sources (linkedin_profile_id is NOT NULL)
CREATE UNIQUE INDEX idx_user_skills_unique_linkedin 
  ON public.user_skills(user_id, skill, source_type, linkedin_profile_id) 
  WHERE linkedin_profile_id IS NOT NULL;

-- For manual additions (both NULL)
CREATE UNIQUE INDEX idx_user_skills_unique_manual 
  ON public.user_skills(user_id, skill, source_type) 
  WHERE source_id IS NULL AND linkedin_profile_id IS NULL AND source_type = 'manual';

-- Enable RLS
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own skills" ON public.user_skills
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own skills" ON public.user_skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own skills" ON public.user_skills
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own skills" ON public.user_skills
  FOR DELETE USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_skills_updated_at 
  BEFORE UPDATE ON public.user_skills 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.user_skills IS 'Unified skills table for all sources (LinkedIn, resume, cover letter, manual). Skills are deduplicated by (user_id, skill) across sources.';
COMMENT ON COLUMN public.user_skills.source_type IS 'Source of the skill: resume, linkedin, cover_letter, or manual (user-added)';
COMMENT ON COLUMN public.user_skills.proficiency IS 'User-rated proficiency level (future feature)';

-- Migration: Migrate existing LinkedIn skills
-- Extract skills from linkedin_profiles.skills (TEXT[])
INSERT INTO public.user_skills (user_id, skill, source_type, linkedin_profile_id)
SELECT 
  lp.user_id,
  unnest(lp.skills) AS skill,
  'linkedin' AS source_type,
  lp.id AS linkedin_profile_id
FROM public.linkedin_profiles lp
WHERE lp.skills IS NOT NULL 
  AND array_length(lp.skills, 1) > 0
ON CONFLICT DO NOTHING;

-- Migration: Migrate existing resume skills from sources.structured_data
-- Extract skills from JSONB structured_data.skills array
INSERT INTO public.user_skills (user_id, skill, category, source_type, source_id)
SELECT DISTINCT
  s.user_id,
  skill_item->>'skill' AS skill,
  skill_item->>'category' AS category,
  'resume' AS source_type,
  s.id AS source_id
FROM public.sources s,
  LATERAL jsonb_array_elements(s.structured_data->'skills') AS skill_category,
  LATERAL jsonb_array_elements(skill_category->'items') AS skill_item
WHERE s.structured_data->'skills' IS NOT NULL
  AND jsonb_typeof(s.structured_data->'skills') = 'array'
  AND s.file_type = 'resume'
ON CONFLICT DO NOTHING;

-- Also handle skills as simple string array (backup format)
INSERT INTO public.user_skills (user_id, skill, source_type, source_id)
SELECT DISTINCT
  s.user_id,
  skill_text AS skill,
  'resume' AS source_type,
  s.id AS source_id
FROM public.sources s,
  LATERAL jsonb_array_elements_text(s.structured_data->'skills') AS skill_text
WHERE s.structured_data->'skills' IS NOT NULL
  AND jsonb_typeof(s.structured_data->'skills') = 'array'
  AND s.file_type = 'resume'
  AND NOT EXISTS (
    SELECT 1 FROM public.user_skills us 
    WHERE us.user_id = s.user_id 
      AND us.skill = skill_text 
      AND us.source_type = 'resume'
      AND us.source_id = s.id
  )
ON CONFLICT DO NOTHING;

-- Migration: Migrate cover letter skills from sources.structured_data
-- Extract skillsMentioned from cover letter structured_data
INSERT INTO public.user_skills (user_id, skill, source_type, source_id)
SELECT DISTINCT
  s.user_id,
  skill_text AS skill,
  'cover_letter' AS source_type,
  s.id AS source_id
FROM public.sources s,
  LATERAL jsonb_array_elements_text(s.structured_data->'skillsMentioned') AS skill_text
WHERE s.structured_data->'skillsMentioned' IS NOT NULL
  AND jsonb_typeof(s.structured_data->'skillsMentioned') = 'array'
  AND s.file_type = 'coverLetter'
ON CONFLICT DO NOTHING;

