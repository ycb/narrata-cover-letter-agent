-- Rebuild user_stage_progress with IP/geo columns and re-create dependent RPCs.

DROP FUNCTION IF EXISTS public.get_users_by_funnel_stage(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_users_dropped_before_stage(TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.get_funnel_stats(TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.funnel_get_stage_timestamp(TEXT, public.user_stage_progress);
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
  p.signup_ip,
  p.geo->>'city' AS geo_city,
  p.geo->>'region' AS geo_region,
  p.geo->>'country' AS geo_country,
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

CREATE OR REPLACE FUNCTION public.funnel_get_stage_timestamp(
  target_stage TEXT,
  data public.user_stage_progress
) RETURNS TIMESTAMPTZ AS $$
BEGIN
  RETURN CASE target_stage
    WHEN 'account_created' THEN data.account_created_at
    WHEN 'onboarding_completed' THEN data.onboarding_completed_at
    WHEN 'dashboard_viewed' THEN data.dashboard_viewed_at
    WHEN 'work_history_edited' THEN data.work_history_edited_at
    WHEN 'saved_section_edited' THEN data.saved_section_edited_at
    WHEN 'template_edited' THEN data.template_edited_at
    WHEN 'cover_letter_created' THEN data.cover_letter_created_at
    WHEN 'cover_letter_saved' THEN data.cover_letter_saved_at
    WHEN 'checklist_completed' THEN data.checklist_completed_at
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_funnel_stats(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  stage TEXT,
  stage_order INTEGER,
  users_reached INTEGER,
  conversion_rate NUMERIC(5,2),
  avg_time_to_next_stage_hours NUMERIC(10,2)
) AS $$
DECLARE
  baseline INTEGER;
BEGIN
  RETURN QUERY
  WITH stage_times AS (
    SELECT
      fmap.stage AS stage_name,
      fmap.stage_order AS map_stage_order,
      public.funnel_get_stage_timestamp(fmap.stage, usp) AS stage_timestamp
    FROM public.user_stage_progress usp
    JOIN public.funnel_stage_map fmap ON TRUE
  ),
  stage_stats AS (
    SELECT stage_name, map_stage_order, COUNT(*) AS stage_users
    FROM stage_times
    WHERE stage_timestamp IS NOT NULL
      AND stage_timestamp >= since_date
    GROUP BY stage_name, map_stage_order
  )
  SELECT
    fmap.stage::TEXT,
    fmap.stage_order::INTEGER,
    COALESCE(sc.stage_users, 0)::INTEGER AS users_reached,
    CASE
      WHEN b.baseline = 0 THEN 0
      ELSE COALESCE(sc.stage_users, 0)::NUMERIC / b.baseline * 100
    END::NUMERIC(5,2) AS conversion_rate,
    NULL::NUMERIC(10,2) AS avg_time_to_next_stage_hours
  FROM public.funnel_stage_map fmap
  LEFT JOIN stage_stats sc
    ON sc.stage_name = fmap.stage
   AND sc.map_stage_order = fmap.stage_order
  CROSS JOIN LATERAL (
    SELECT COALESCE(
      (SELECT stage_users FROM stage_stats ss WHERE ss.stage_name = 'account_created'),
      1
    )::INTEGER AS baseline
  ) b
  ORDER BY fmap.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_users_by_funnel_stage(
  target_stage TEXT,
  limit_rows INTEGER DEFAULT 100
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  acquisition_source TEXT,
  geo JSONB,
  signup_ip INET,
  geo_city TEXT,
  geo_region TEXT,
  geo_country TEXT,
  first_visit_at TIMESTAMPTZ,
  stage_name TEXT,
  stage_timestamp TIMESTAMPTZ,
  previous_stage TEXT,
  previous_stage_timestamp TIMESTAMPTZ,
  latest_stage TEXT,
  latest_stage_at TIMESTAMPTZ
) AS $$
DECLARE
  fmap RECORD;
  prev RECORD;
BEGIN
  SELECT * INTO fmap FROM public.funnel_stage_map WHERE stage = target_stage;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown funnel stage: %', target_stage;
  END IF;

  SELECT * INTO prev FROM public.funnel_stage_map WHERE stage_order = fmap.stage_order - 1;

  RETURN QUERY
  SELECT
    usp.user_id,
    usp.email::TEXT,
    usp.acquisition_source::TEXT,
    usp.geo,
    usp.signup_ip,
    usp.geo_city::TEXT,
    usp.geo_region::TEXT,
    usp.geo_country::TEXT,
    usp.first_visit_at,
    fmap.stage::TEXT AS stage_name,
    public.funnel_get_stage_timestamp(fmap.stage, usp) AS stage_timestamp,
    prev.stage::TEXT AS previous_stage,
    public.funnel_get_stage_timestamp(prev.stage, usp) AS previous_stage_timestamp,
    usp.latest_stage::TEXT,
    usp.latest_stage_at
  FROM public.user_stage_progress usp
  WHERE public.funnel_get_stage_timestamp(fmap.stage, usp) IS NOT NULL
  ORDER BY public.funnel_get_stage_timestamp(fmap.stage, usp) DESC
  LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_users_dropped_before_stage(
  target_stage TEXT,
  limit_rows INTEGER DEFAULT 100
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  acquisition_source TEXT,
  geo JSONB,
  signup_ip INET,
  geo_city TEXT,
  geo_region TEXT,
  geo_country TEXT,
  first_visit_at TIMESTAMPTZ,
  previous_stage TEXT,
  previous_stage_timestamp TIMESTAMPTZ,
  missing_stage TEXT,
  latest_stage TEXT,
  latest_stage_at TIMESTAMPTZ
) AS $$
DECLARE
  fmap RECORD;
  prev RECORD;
BEGIN
  SELECT * INTO fmap FROM public.funnel_stage_map WHERE stage = target_stage;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown funnel stage: %', target_stage;
  END IF;

  SELECT * INTO prev FROM public.funnel_stage_map WHERE stage_order = fmap.stage_order - 1;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    usp.user_id,
    usp.email::TEXT,
    usp.acquisition_source::TEXT,
    usp.geo,
    usp.signup_ip,
    usp.geo_city::TEXT,
    usp.geo_region::TEXT,
    usp.geo_country::TEXT,
    usp.first_visit_at,
    prev.stage::TEXT AS previous_stage,
    public.funnel_get_stage_timestamp(prev.stage, usp) AS previous_stage_timestamp,
    fmap.stage::TEXT AS missing_stage,
    usp.latest_stage::TEXT,
    usp.latest_stage_at
  FROM public.user_stage_progress usp
  WHERE public.funnel_get_stage_timestamp(prev.stage, usp) IS NOT NULL
    AND public.funnel_get_stage_timestamp(fmap.stage, usp) IS NULL
  ORDER BY public.funnel_get_stage_timestamp(prev.stage, usp) DESC
  LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
