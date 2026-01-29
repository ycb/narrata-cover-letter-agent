-- Align funnel RPCs with the new stage view and expose stage listings.

DROP VIEW IF EXISTS public.funnel_stage_map;
CREATE VIEW public.funnel_stage_map AS
SELECT * FROM (
  VALUES
    (1, 'account_created', 'account_created_at', 'onboard'),
    (2, 'onboarding_completed', 'onboarding_completed_at', 'onboard'),
    (3, 'dashboard_viewed', 'dashboard_viewed_at', 'onboard'),
    (4, 'work_history_edited', 'work_history_edited_at', 'setup'),
    (5, 'saved_section_edited', 'saved_section_edited_at', 'setup'),
    (6, 'template_edited', 'template_edited_at', 'setup'),
    (7, 'cover_letter_created', 'cover_letter_created_at', 'usage'),
    (8, 'cover_letter_saved', 'cover_letter_saved_at', 'usage'),
    (9, 'checklist_completed', 'checklist_completed_at', 'onboard')
) AS t(stage_order, stage, stage_column, flow);

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
  WITH stage_stats AS (
    SELECT
      fmap.stage,
      fmap.stage_order,
      COUNT(*) AS stage_users
    FROM public.user_stage_progress usp
    JOIN public.funnel_stage_map fmap ON fmap.stage_column IS NOT NULL
    WHERE
      (CASE fmap.stage_column
        WHEN 'account_created_at' THEN usp.account_created_at
        WHEN 'onboarding_completed_at' THEN usp.onboarding_completed_at
        WHEN 'dashboard_viewed_at' THEN usp.dashboard_viewed_at
        WHEN 'work_history_edited_at' THEN usp.work_history_edited_at
        WHEN 'saved_section_edited_at' THEN usp.saved_section_edited_at
        WHEN 'template_edited_at' THEN usp.template_edited_at
        WHEN 'cover_letter_created_at' THEN usp.cover_letter_created_at
        WHEN 'cover_letter_saved_at' THEN usp.cover_letter_saved_at
        WHEN 'checklist_completed_at' THEN usp.checklist_completed_at
        ELSE NULL
      END) IS NOT NULL
    GROUP BY fmap.stage, fmap.stage_order
  )
  SELECT
    fmap.stage,
    fmap.stage_order,
    COALESCE(sc.stage_users, 0) AS users_reached,
    CASE
      WHEN baseline = 0 THEN 0
      ELSE COALESCE(sc.stage_users, 0)::NUMERIC / baseline * 100
    END::NUMERIC(5,2) AS conversion_rate,
    NULL::NUMERIC(10,2) AS avg_time_to_next_stage_hours
  FROM public.funnel_stage_map fmap
  LEFT JOIN stage_stats sc USING (stage, stage_order)
  CROSS JOIN LATERAL (
    SELECT COALESCE((SELECT stage_users FROM stage_stats ss WHERE ss.stage = 'account_created'), 1) AS baseline
  ) b
  ORDER BY fmap.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION public.get_users_by_funnel_stage(
  target_stage TEXT,
  limit_rows INTEGER DEFAULT 100
) RETURNS TABLE (
  user_id UUID,
  email TEXT,
  acquisition_source TEXT,
  geo JSONB,
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
    usp.email,
    usp.acquisition_source,
    usp.geo,
    usp.first_visit_at,
    fmap.stage AS stage_name,
    public.funnel_get_stage_timestamp(fmap.stage, usp) AS stage_timestamp,
    prev.stage AS previous_stage,
    COALESCE(public.funnel_get_stage_timestamp(prev.stage, usp), NULL) AS previous_stage_timestamp,
    usp.latest_stage,
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
    usp.email,
    usp.acquisition_source,
    usp.geo,
    usp.first_visit_at,
    prev.stage AS previous_stage,
    public.funnel_get_stage_timestamp(prev.stage, usp) AS previous_stage_timestamp,
    fmap.stage AS missing_stage,
    usp.latest_stage,
    usp.latest_stage_at
  FROM public.user_stage_progress usp
  WHERE public.funnel_get_stage_timestamp(prev.stage, usp) IS NOT NULL
    AND public.funnel_get_stage_timestamp(fmap.stage, usp) IS NULL
  ORDER BY public.funnel_get_stage_timestamp(prev.stage, usp) DESC
  LIMIT limit_rows;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON VIEW public.funnel_stage_map IS 'Lookup table for canonical funnel stages and their derived columns.';
