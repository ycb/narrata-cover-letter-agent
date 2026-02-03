-- Backfill onboarding_completed events from profiles and exclude internal users from funnel view.

-- Backfill onboarding_completed events for users flagged as onboarding_complete.
INSERT INTO public.user_events (user_id, event_type, metadata, created_at)
SELECT
  p.id,
  'onboarding_completed',
  jsonb_build_object('source', 'profiles.onboarding_complete'),
  COALESCE(p.updated_at, NOW())
FROM public.profiles p
LEFT JOIN public.user_events ue
  ON ue.user_id = p.id
 AND ue.event_type = 'onboarding_completed'
WHERE p.onboarding_complete = TRUE
  AND ue.id IS NULL;

-- Rebuild the stage progress view to (a) respect onboarding_complete and
-- (b) exclude internal/test users from the funnel.
CREATE OR REPLACE VIEW public.user_stage_progress AS
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
  COALESCE(st.onboarding_completed_at, CASE WHEN p.onboarding_complete THEN p.updated_at ELSE NULL END) AS onboarding_completed_at,
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
    WHEN COALESCE(st.onboarding_completed_at, CASE WHEN p.onboarding_complete THEN p.updated_at ELSE NULL END) IS NOT NULL THEN 'onboard_complete'
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
    COALESCE(st.onboarding_completed_at, CASE WHEN p.onboarding_complete THEN p.updated_at ELSE NULL END),
    st.account_created_at,
    p.created_at
  ) AS latest_stage_at
FROM public.profiles p
LEFT JOIN stage_times st ON st.user_id = p.id
WHERE lower(p.email) NOT IN (
  'peter.spannagle@gmail.com',
  'narrata.ai@gmail.com',
  'darionovoa@ideartte.com'
);

COMMENT ON VIEW public.user_stage_progress IS 'Current funnel stage per user with acquisition/geo metadata (internal users excluded).';
