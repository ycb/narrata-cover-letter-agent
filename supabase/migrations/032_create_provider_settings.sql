-- Migration: 017_create_provider_settings.sql
-- Purpose: Add provider settings table for BYOM (Bring Your Own Model) feature
-- Created: 2025-01-XX
-- Epic: My Data & BYOM MVP

BEGIN;

-- Provider settings table
CREATE TABLE IF NOT EXISTS public.provider_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'narrata_default' CHECK (provider_type IN ('narrata_default', 'openai_compatible', 'custom')),
  provider_config JSONB DEFAULT '{}'::jsonb, -- Encrypted credentials and config
  model_id TEXT, -- Specific model identifier (e.g., 'gpt-4o-mini', 'gpt-4')
  base_url TEXT, -- Optional custom base URL for OpenAI-compatible providers
  validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'valid', 'invalid', 'error')),
  validation_error TEXT, -- Last validation error message
  validated_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- One provider per user
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_provider_settings_user_id ON public.provider_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_settings_provider_type ON public.provider_settings(provider_type);
CREATE INDEX IF NOT EXISTS idx_provider_settings_validation_status ON public.provider_settings(validation_status);

-- RLS policies
ALTER TABLE public.provider_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own provider settings" ON public.provider_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own provider settings" ON public.provider_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own provider settings" ON public.provider_settings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own provider settings" ON public.provider_settings
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_provider_settings_updated_at 
  BEFORE UPDATE ON public.provider_settings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add soft delete support to sources table for 30-day retention
ALTER TABLE public.sources 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

-- Index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_sources_deleted_at ON public.sources(deleted_at) WHERE is_deleted = TRUE;

-- Function to permanently purge soft-deleted sources after 30 days
CREATE OR REPLACE FUNCTION purge_old_deleted_sources()
RETURNS void AS $$
BEGIN
  DELETE FROM public.sources 
  WHERE is_deleted = TRUE 
    AND deleted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE public.provider_settings IS 'Stores user AI provider configuration (Narrata default or BYOM)';
COMMENT ON COLUMN public.provider_settings.provider_config IS 'Encrypted JSONB containing API keys and provider-specific configuration';
COMMENT ON COLUMN public.provider_settings.validation_status IS 'Status of last provider validation attempt';
COMMENT ON COLUMN public.sources.deleted_at IS 'Timestamp when source was soft-deleted (30-day retention)';
COMMENT ON COLUMN public.sources.is_deleted IS 'Flag indicating soft-deleted state';

COMMIT;

