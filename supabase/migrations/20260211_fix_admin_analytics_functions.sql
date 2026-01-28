-- Fix ambiguous column references in admin analytics functions

CREATE OR REPLACE FUNCTION get_funnel_stats(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  stage TEXT,
  stage_order INTEGER,
  users_reached INTEGER,
  conversion_rate NUMERIC(5,2),
  avg_time_to_next_stage_hours NUMERIC(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_stages AS (
    SELECT 'account_created' as stage, 1 as stage_order
    UNION ALL SELECT 'email_verified', 2
    UNION ALL SELECT 'first_login', 3
    UNION ALL SELECT 'onboarding_started', 4
    UNION ALL SELECT 'onboarding_completed', 5
    UNION ALL SELECT 'product_tour_started', 6
    UNION ALL SELECT 'product_tour_completed', 7
    UNION ALL SELECT 'checklist_completed', 8
  ),
  stage_counts AS (
    SELECT 
      event_type as stage,
      COUNT(DISTINCT user_id) as users_reached
    FROM user_events
    WHERE created_at >= since_date
      AND event_type != 'admin_spoofed_user'
    GROUP BY event_type
  ),
  baseline AS (
    SELECT COALESCE(
      (SELECT sc.users_reached FROM stage_counts sc WHERE sc.stage = 'account_created'),
      1
    ) as total_users
  )
  SELECT 
    fs.stage,
    fs.stage_order,
    COALESCE(sc.users_reached, 0)::INTEGER as users_reached,
    (COALESCE(sc.users_reached, 0)::NUMERIC / baseline.total_users * 100)::NUMERIC(5,2) as conversion_rate,
    NULL::NUMERIC(10,2) as avg_time_to_next_stage_hours
  FROM funnel_stages fs
  CROSS JOIN baseline
  LEFT JOIN stage_counts sc ON fs.stage = sc.stage
  ORDER BY fs.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_activity_leaderboard(
  since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  result_limit INTEGER DEFAULT 100
)
RETURNS TABLE(
  user_id UUID,
  user_email TEXT,
  sessions INTEGER,
  stories_count INTEGER,
  metrics_count INTEGER,
  saved_sections_count INTEGER,
  cover_letters_created INTEGER,
  cover_letters_saved INTEGER,
  total_activity_score INTEGER,
  rank INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH user_activity AS (
    SELECT 
      u.id as user_id,
      u.email as user_email,
      (SELECT COUNT(DISTINCT DATE(created_at)) 
       FROM user_events 
       WHERE user_events.user_id = u.id 
         AND created_at >= since_date
         AND event_type != 'admin_spoofed_user') as sessions,
      (SELECT COUNT(*) 
       FROM stories 
       WHERE stories.user_id = u.id 
         AND created_at >= since_date) as stories_count,
      (SELECT COALESCE(SUM(JSONB_ARRAY_LENGTH(COALESCE(metrics, '[]'::jsonb))), 0)
       FROM stories 
       WHERE stories.user_id = u.id 
         AND created_at >= since_date) as metrics_count,
      (SELECT COUNT(*) 
       FROM saved_sections 
       WHERE saved_sections.user_id = u.id 
         AND created_at >= since_date) as saved_sections_count,
      (SELECT COUNT(*) 
       FROM jobs 
       WHERE jobs.user_id = u.id 
         AND type = 'coverLetter' 
         AND created_at >= since_date) as cover_letters_created,
      (SELECT COUNT(*) 
       FROM jobs 
       WHERE jobs.user_id = u.id 
         AND type = 'coverLetter' 
         AND status = 'complete' 
         AND created_at >= since_date) as cover_letters_saved
    FROM auth.users u
    WHERE u.created_at >= since_date - INTERVAL '90 days'
  ),
  scored_activity AS (
    SELECT 
      ua.*,
      (ua.sessions * 1 + 
       ua.stories_count * 5 + 
       ua.metrics_count * 2 + 
       ua.saved_sections_count * 3 + 
       ua.cover_letters_created * 10 + 
       ua.cover_letters_saved * 15) as total_activity_score
    FROM user_activity ua
  ),
  ranked_activity AS (
    SELECT
      user_id,
      user_email,
      sessions::INTEGER,
      stories_count::INTEGER,
      metrics_count::INTEGER,
      saved_sections_count::INTEGER,
      cover_letters_created::INTEGER,
      cover_letters_saved::INTEGER,
      total_activity_score::INTEGER,
      ROW_NUMBER() OVER (ORDER BY total_activity_score DESC)::INTEGER as rank
    FROM scored_activity
    WHERE total_activity_score > 0
    ORDER BY total_activity_score DESC
    LIMIT result_limit
  )
  SELECT * FROM ranked_activity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
