-- Migration: Add terms and privacy policy acceptance tracking
-- Date: 2025-12-01
-- Description: Adds fields to track when users accept TOU and Privacy Policy

-- Add terms_accepted_at and privacy_accepted_at columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMP WITH TIME ZONE;

-- Create index for compliance queries
CREATE INDEX IF NOT EXISTS idx_profiles_terms_accepted 
  ON public.profiles(terms_accepted_at) 
  WHERE terms_accepted_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.terms_accepted_at IS 'Timestamp when user accepted Terms of Service';
COMMENT ON COLUMN public.profiles.privacy_accepted_at IS 'Timestamp when user accepted Privacy Policy';

