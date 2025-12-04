-- Add preferred_dashboard column to profiles
-- Controls which dashboard view is shown by default at /dashboard

ALTER TABLE profiles
ADD COLUMN preferred_dashboard text DEFAULT 'onboarding' CHECK (preferred_dashboard IN ('onboarding', 'main'));

-- Add comment
COMMENT ON COLUMN profiles.preferred_dashboard IS 'User preference for default dashboard view (onboarding | main)';

