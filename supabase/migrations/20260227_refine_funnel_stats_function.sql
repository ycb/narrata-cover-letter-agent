-- Ensure the get_funnel_stats function aggregates via stage_stats alias with stage_users.
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
      COALESCE(
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
        END), NULL
      ) IS NOT NULL
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
