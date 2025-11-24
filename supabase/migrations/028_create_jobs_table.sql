-- Create jobs table for unified streaming architecture
-- Supports: onboarding, coverLetter, pmLevels
-- Migration: 028_create_jobs_table.sql
-- Date: 2025-11-24

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('onboarding', 'coverLetter', 'pmLevels')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'error')),
  input JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_type ON public.jobs(type);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX idx_jobs_user_type_status ON public.jobs(user_id, type, status);

-- Enable Row Level Security
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own jobs"
  ON public.jobs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs"
  ON public.jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON public.jobs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON public.jobs
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_jobs_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.jobs IS 'Unified job tracking table for streaming long-running operations (onboarding, cover letter generation, PM levels assessment)';
COMMENT ON COLUMN public.jobs.type IS 'Job type: onboarding, coverLetter, or pmLevels';
COMMENT ON COLUMN public.jobs.status IS 'Job status: pending (created), running (in progress), complete (finished), or error (failed)';
COMMENT ON COLUMN public.jobs.input IS 'Job-specific input parameters (JSONB for flexibility)';
COMMENT ON COLUMN public.jobs.result IS 'Job-specific output data (JSONB, populated on completion)';
COMMENT ON COLUMN public.jobs.started_at IS 'Timestamp when job execution began';
COMMENT ON COLUMN public.jobs.completed_at IS 'Timestamp when job finished (success or error)';

