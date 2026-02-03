-- Ensure funnel RPCs return columns with types that exactly match their function signatures.

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
