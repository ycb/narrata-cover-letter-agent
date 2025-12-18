-- Migration: Waitlist Signups
-- Purpose: Capture pre-beta interest from marketing CTAs

CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  source TEXT,
  referrer TEXT,
  utm JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_unique ON public.waitlist_signups (lower(email));

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anon) to join the waitlist.
CREATE POLICY "Anyone can insert waitlist signups" ON public.waitlist_signups
  FOR INSERT
  WITH CHECK (true);

-- Allow admins to view signups (used for internal dashboards/exports).
CREATE POLICY "Admins can read waitlist signups" ON public.waitlist_signups
  FOR SELECT
  USING (is_admin());

COMMENT ON TABLE public.waitlist_signups IS 'Marketing waitlist signups captured from narrata.co while beta is closed.';

