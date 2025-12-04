-- Cleanup script for synthetic PM level data
-- This script can be run periodically (e.g., weekly) to remove old synthetic user data
-- Keeps the database clean while allowing proper caching during active testing

-- Delete synthetic PM level records older than 7 days
DELETE FROM user_levels 
WHERE user_id LIKE 'synthetic_%' 
  AND last_run_timestamp < NOW() - INTERVAL '7 days';

-- Create a function to automate cleanup (optional - can be called via cron or manually)
CREATE OR REPLACE FUNCTION cleanup_old_synthetic_pm_levels()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_levels 
  WHERE user_id LIKE 'synthetic_%' 
    AND last_run_timestamp < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Deleted % old synthetic PM level records', deleted_count;
  RETURN deleted_count;
END;
$$;

-- Example usage (run manually or via scheduled job):
-- SELECT cleanup_old_synthetic_pm_levels();

