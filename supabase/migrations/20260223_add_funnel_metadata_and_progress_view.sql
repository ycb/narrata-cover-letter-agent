-- Migration: Add funnel metadata columns and a per-stage progress view

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_visit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT,
  ADD COLUMN IF NOT EXISTS geo JSONB;

WITH earliest_events AS (
  SELECT
    user_id,
    MIN(created_at) AS first_event_time
  FROM public.user_events
  GROUP BY user_id
)
UPDATE public.profiles p
SET
  first_visit_at = COALESCE(e.first_event_time, u.created_at),
  acquisition_source = COALESCE(
    acquisition_source,
    acquisition_referrer,
    acquisition_first_landing_url,
    acquisition_utm->>'source',
    acquisition_utm->>'campaign'
  ),
  geo = COALESCE(
    geo,
    CASE
      WHEN signup_ip IS NOT NULL THEN jsonb_build_object('ip', signup_ip)
      ELSE NULL
    END
  )
FROM earliest_events e
JOIN auth.users u ON u.id = e.user_id
WHERE p.id = e.user_id
  AND (p.first_visit_at IS NULL OR p.acquisition_source IS NULL OR p.geo IS NULL);

UPDATE public.profiles p
SET first_visit_at = u.created_at
FROM auth.users u
WHERE u.id = p.id
  AND p.first_visit_at IS NULL;

DELETE FROM public.user_events
WHERE event_type IN (
  'email_verified',
  'first_login',
  'product_tour_started',
  'product_tour_completed'
);

DROP VIEW IF EXISTS public.user_stage_progress;

CREATE VIEW public.user_stage_progress AS
WITH stage_times AS (
  SELECT
    user_id,
    MAX(CASE WHEN event_type = 'account_created' THEN created_at END) AS account_created_at,
    MAX(CASE WHEN event_type = 'onboarding_completed' THEN created_at END) AS onboarding_completed_at,
    MAX(CASE WHEN event_type = 'dashboard_viewed' THEN created_at END) AS dashboard_viewed_at,
    MAX(CASE WHEN event_type = 'work_history_edited' THEN created_at END) AS work_history_edited_at,
    MAX(CASE WHEN event_type = 'saved_section_edited' THEN created_at END) AS saved_section_edited_at,
    MAX(CASE WHEN event_type = 'template_edited' THEN created_at END) AS template_edited_at,
    MAX(CASE WHEN event_type = 'cover_letter_created' THEN created_at END) AS cover_letter_created_at,
    MAX(CASE WHEN event_type = 'cover_letter_saved' THEN created_at END) AS cover_letter_saved_at,
    MAX(CASE WHEN event_type = 'checklist_completed' THEN created_at END) AS checklist_completed_at
  FROM public.user_events
  GROUP BY user_id
)
SELECT
  p.id AS user_id,
  p.email,
  p.first_visit_at,
  p.acquisition_source,
  p.geo,
  p.onboarding_complete,
  COALESCE(st.account_created_at, p.created_at) AS account_created_at,
  st.onboarding_completed_at,
  st.dashboard_viewed_at,
  st.work_history_edited_at,
  st.saved_section_edited_at,
  st.template_edited_at,
  st.cover_letter_created_at,
  st.cover_letter_saved_at,
  st.checklist_completed_at,
  CASE
    WHEN st.cover_letter_saved_at IS NOT NULL THEN 'usage_saved'
    WHEN st.cover_letter_created_at IS NOT NULL THEN 'usage_created'
    WHEN st.template_edited_at IS NOT NULL
      OR st.saved_section_edited_at IS NOT NULL
      OR st.work_history_edited_at IS NOT NULL THEN 'setup'
    WHEN st.dashboard_viewed_at IS NOT NULL THEN 'onboard_dashboard'
    WHEN st.onboarding_completed_at IS NOT NULL THEN 'onboard_complete'
    WHEN st.account_created_at IS NOT NULL THEN 'account_created'
    ELSE 'new'
  END AS latest_stage,
  COALESCE(
    st.cover_letter_saved_at,
    st.cover_letter_created_at,
    st.template_edited_at,
    st.saved_section_edited_at,
    st.work_history_edited_at,
    st.dashboard_viewed_at,
    st.onboarding_completed_at,
    st.account_created_at,
    p.created_at
  ) AS latest_stage_at
FROM public.profiles p
LEFT JOIN stage_times st ON st.user_id = p.id;

COMMENT ON VIEW public.user_stage_progress IS 'Current funnel stage per user with acquisition/geo metadata.';
