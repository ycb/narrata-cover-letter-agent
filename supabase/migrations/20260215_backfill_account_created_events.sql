-- Backfill account_created events for legacy users

INSERT INTO user_events (user_id, event_type, metadata, created_at)
SELECT
  u.id,
  'account_created',
  jsonb_build_object('source', 'historical-backfill', 'user_created_at', u.created_at::text),
  u.created_at
FROM auth.users u
LEFT JOIN user_events ue
  ON ue.user_id = u.id
  AND ue.event_type = 'account_created'
WHERE ue.id IS NULL
  AND u.id IS NOT NULL;

COMMENT ON TABLE user_events IS 'Tracks user progression through onboarding funnel and key product milestones.';
