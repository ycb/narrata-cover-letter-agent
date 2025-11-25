-- Add retention policy columns to jobs table
ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS should_archive BOOLEAN DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_jobs_archived_at ON jobs(archived_at);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at_status ON jobs(created_at, status);

COMMENT ON COLUMN jobs.archived_at IS 'Timestamp when job result was archived/cleaned up';
COMMENT ON COLUMN jobs.should_archive IS 'Whether to archive this job (false = keep indefinitely)';

-- Archive function: Keeps minimal fields, clears heavy result data
CREATE OR REPLACE FUNCTION archive_old_jobs()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Archive completed jobs older than 30 days
  UPDATE jobs
  SET 
    result = jsonb_build_object(
      'archived', true,
      'draftId', result->>'draftId',
      'gapCount', result->>'gapCount'
    ),
    stages = NULL,
    archived_at = NOW()
  WHERE 
    status IN ('complete', 'error')
    AND created_at < NOW() - INTERVAL '30 days'
    AND archived_at IS NULL
    AND should_archive = true;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_old_jobs IS 'Archives jobs older than 30 days by keeping minimal fields and clearing heavy result/stages data';

