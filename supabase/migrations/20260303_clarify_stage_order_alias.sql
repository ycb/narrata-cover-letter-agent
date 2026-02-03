-- Resolve ambiguity between stage_order columns by explicitly referencing the funnel map alias.

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
    fmap.stage,
    fmap.stage_order,
    COALESCE(sc.stage_users, 0) AS users_reached,
    CASE
      WHEN baseline = 0 THEN 0
      ELSE COALESCE(sc.stage_users, 0)::NUMERIC / baseline * 100
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
    ) AS baseline
  ) b
  ORDER BY fmap.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
