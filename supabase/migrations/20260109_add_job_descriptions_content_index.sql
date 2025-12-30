-- Add index on job_descriptions (user_id, content) for deduplication lookup
-- This speeds up the findOrCreateJobDescription query that checks for existing JDs
-- by exact content match to prevent duplicate parsing

CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_content 
  ON public.job_descriptions (user_id, md5(content));

-- Add a comment explaining the purpose
COMMENT ON INDEX idx_job_descriptions_user_content IS 
  'Speeds up deduplication lookups when checking if a JD has already been parsed. Uses MD5 hash of content for efficient matching.';
