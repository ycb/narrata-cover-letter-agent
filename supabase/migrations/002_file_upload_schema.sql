-- File upload and LinkedIn integration schema
-- Migration: 002_file_upload_schema.sql

-- Sources table for file metadata
CREATE TABLE public.sources (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_checksum TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  raw_text TEXT,
  structured_data JSONB,
  processing_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- LinkedIn profiles table
CREATE TABLE public.linkedin_profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  linkedin_id TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  about TEXT,
  experience JSONB, -- Array of work experiences
  education JSONB, -- Array of education
  skills TEXT[], -- Array of skills
  certifications JSONB, -- Array of certifications
  projects JSONB, -- Array of projects
  raw_data JSONB, -- Full LinkedIn API response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, linkedin_id)
);

-- Create indexes for performance
CREATE INDEX idx_sources_user_id ON public.sources(user_id);
CREATE INDEX idx_sources_processing_status ON public.sources(processing_status);
CREATE INDEX idx_sources_created_at ON public.sources(created_at);
CREATE INDEX idx_linkedin_profiles_user_id ON public.linkedin_profiles(user_id);
CREATE INDEX idx_linkedin_profiles_linkedin_id ON public.linkedin_profiles(linkedin_id);

-- RLS policies for sources table
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sources" ON public.sources
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sources" ON public.sources
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sources" ON public.sources
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sources" ON public.sources
  FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for linkedin_profiles table
ALTER TABLE public.linkedin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own linkedin profiles" ON public.linkedin_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own linkedin profiles" ON public.linkedin_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own linkedin profiles" ON public.linkedin_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own linkedin profiles" ON public.linkedin_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Function to clean up old files (keep last 10 per user)
CREATE OR REPLACE FUNCTION cleanup_old_sources()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sources 
  WHERE id IN (
    SELECT id FROM (
      SELECT id, 
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM public.sources
    ) ranked
    WHERE rn > 10
  );
END;
$$ LANGUAGE plpgsql;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_sources_updated_at 
  BEFORE UPDATE ON public.sources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_linkedin_profiles_updated_at 
  BEFORE UPDATE ON public.linkedin_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
