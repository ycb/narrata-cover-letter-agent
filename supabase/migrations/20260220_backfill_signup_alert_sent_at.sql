-- Backfill signup alert timestamps for profiles that existed before alerts were recorded.
UPDATE public.profiles
SET signup_alert_sent_at = COALESCE(created_at, timezone('UTC', NOW()))
WHERE signup_alert_sent_at IS NULL;
