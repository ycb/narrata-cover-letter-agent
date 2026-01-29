-- Migration: User Events & Funnel Tracking
-- Purpose: Track user progression through onboarding and key milestones

-- ============================================================================
-- 1. User Events Table
-- ============================================================================

CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'account_created',
    'email_verified',
    'first_login',
    'onboarding_started',
    'onboarding_completed',
    'product_tour_started',
    'product_tour_completed',
    'checklist_completed',
    'first_cl_created',
    'first_cl_saved',
    'admin_spoofed_user' -- For audit trail
  )),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. Row Level Security (RLS)
-- ============================================================================

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own events
CREATE POLICY "Users can insert own events" ON user_events
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Admins can read all events
CREATE POLICY "Admins can read all events" ON user_events
  FOR SELECT
  USING (is_admin());

-- Policy: Users can read their own events
CREATE POLICY "Users can read own events" ON user_events
  FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================================
-- 3. Indexes
-- ============================================================================

CREATE INDEX idx_user_events_user_id ON user_events(user_id);
CREATE INDEX idx_user_events_type ON user_events(event_type);
CREATE INDEX idx_user_events_created_at ON user_events(created_at DESC);
CREATE INDEX idx_user_events_user_type ON user_events(user_id, event_type);

-- ============================================================================
-- 4. Helper Function: Log User Event
-- ============================================================================

CREATE OR REPLACE FUNCTION log_user_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO user_events (user_id, event_type, metadata)
  VALUES (p_user_id, p_event_type, p_metadata)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. Funnel Analytics Function
-- ============================================================================

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
      AND event_type != 'admin_spoofed_user' -- Exclude admin actions
    GROUP BY event_type
  ),
  baseline AS (
    SELECT COALESCE(
      (SELECT users_reached FROM stage_counts sc WHERE sc.stage = 'account_created'),
      1
    ) as total_users
  )
  SELECT 
    fs.stage,
    fs.stage_order,
    COALESCE(sc.users_reached, 0)::INTEGER as users_reached,
    (COALESCE(sc.users_reached, 0)::NUMERIC / baseline.total_users * 100)::NUMERIC(5,2) as conversion_rate,
    NULL::NUMERIC(10,2) as avg_time_to_next_stage_hours -- TODO: Calculate time deltas
  FROM funnel_stages fs
  CROSS JOIN baseline
  LEFT JOIN stage_counts sc ON fs.stage = sc.stage
  ORDER BY fs.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. User Activity Leaderboard Function
-- ============================================================================

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
      -- Sessions (count of distinct days with events)
      (SELECT COUNT(DISTINCT DATE(created_at)) 
       FROM user_events 
       WHERE user_events.user_id = u.id 
         AND created_at >= since_date
         AND event_type != 'admin_spoofed_user') as sessions,
      -- Stories
      (SELECT COUNT(*) 
       FROM stories 
       WHERE stories.user_id = u.id 
         AND created_at >= since_date) as stories_count,
      -- Metrics (from stories.metrics JSONB array length)
      (SELECT COALESCE(SUM(JSONB_ARRAY_LENGTH(COALESCE(metrics, '[]'::jsonb))), 0)
       FROM stories 
       WHERE stories.user_id = u.id 
         AND created_at >= since_date) as metrics_count,
      -- Saved Sections
      (SELECT COUNT(*) 
       FROM saved_sections 
       WHERE saved_sections.user_id = u.id 
         AND created_at >= since_date) as saved_sections_count,
      -- Cover Letters Created
      (SELECT COUNT(*) 
       FROM jobs 
       WHERE jobs.user_id = u.id 
         AND type = 'coverLetter' 
         AND created_at >= since_date) as cover_letters_created,
      -- Cover Letters Saved (completed)
      (SELECT COUNT(*) 
       FROM jobs 
       WHERE jobs.user_id = u.id 
         AND type = 'coverLetter' 
         AND status = 'complete' 
         AND created_at >= since_date) as cover_letters_saved
    FROM auth.users u
    WHERE u.created_at >= since_date - INTERVAL '90 days' -- Include users from slightly before window
  ),
  scored_activity AS (
    SELECT 
      *,
      -- Activity score: weighted sum
      -- Sessions: 1pt, Stories: 5pts, Metrics: 2pts, Saved Sections: 3pts, CLs Created: 10pts, CLs Saved: 15pts
      (sessions * 1 + 
       stories_count * 5 + 
       metrics_count * 2 + 
       saved_sections_count * 3 + 
       cover_letters_created * 10 + 
       cover_letters_saved * 15) as total_activity_score
    FROM user_activity
  )
  SELECT 
    scored_activity.user_id,
    scored_activity.user_email,
    scored_activity.sessions::INTEGER,
    scored_activity.stories_count::INTEGER,
    scored_activity.metrics_count::INTEGER,
    scored_activity.saved_sections_count::INTEGER,
    scored_activity.cover_letters_created::INTEGER,
    scored_activity.cover_letters_saved::INTEGER,
    scored_activity.total_activity_score::INTEGER,
    ROW_NUMBER() OVER (ORDER BY scored_activity.total_activity_score DESC)::INTEGER as rank
  FROM scored_activity
  WHERE scored_activity.total_activity_score > 0
  ORDER BY scored_activity.total_activity_score DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. Comments (Documentation)
-- ============================================================================

COMMENT ON TABLE user_events IS 'Tracks user progression through onboarding funnel and key product milestones.';
COMMENT ON FUNCTION log_user_event IS 'Helper function to log a user event (callable from Edge Functions).';
COMMENT ON FUNCTION get_funnel_stats IS 'Returns funnel conversion rates for each stage since a given date.';
COMMENT ON FUNCTION get_user_activity_leaderboard IS 'Returns top N users ranked by activity score (weighted sum of actions).';
