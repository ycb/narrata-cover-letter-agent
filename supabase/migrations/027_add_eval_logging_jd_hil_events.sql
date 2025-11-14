-- Add evaluation logging columns for JD parsing and HIL content events
-- Migration: 027_add_eval_logging_jd_hil_events.sql

BEGIN;

-- Add JD parse event columns
ALTER TABLE public.evaluation_runs
  ADD COLUMN IF NOT EXISTS jd_parse_event JSONB,
  ADD COLUMN IF NOT EXISTS jd_parse_status TEXT CHECK (jd_parse_status IN ('success', 'failed', 'pending', NULL));

-- Add HIL content event columns
ALTER TABLE public.evaluation_runs
  ADD COLUMN IF NOT EXISTS hil_content_type TEXT CHECK (hil_content_type IN ('story', 'saved_section', 'cover_letter_draft', NULL)),
  ADD COLUMN IF NOT EXISTS hil_action TEXT CHECK (hil_action IN ('ai_suggest', 'manual_edit', 'apply_suggestion', NULL)),
  ADD COLUMN IF NOT EXISTS hil_content_id TEXT,
  ADD COLUMN IF NOT EXISTS hil_content_word_delta INTEGER,
  ADD COLUMN IF NOT EXISTS hil_gap_coverage JSONB,
  ADD COLUMN IF NOT EXISTS hil_gaps_addressed TEXT[],
  ADD COLUMN IF NOT EXISTS hil_status TEXT CHECK (hil_status IN ('success', 'failed', 'pending', NULL));

-- Add indexes for filtering by event type
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_jd_parse_status 
  ON public.evaluation_runs(jd_parse_status) 
  WHERE jd_parse_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_hil_content_type 
  ON public.evaluation_runs(hil_content_type) 
  WHERE hil_content_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_evaluation_runs_hil_status 
  ON public.evaluation_runs(hil_status) 
  WHERE hil_status IS NOT NULL;

-- Add composite index for event type + user_id for dashboard queries
CREATE INDEX IF NOT EXISTS idx_evaluation_runs_event_user
  ON public.evaluation_runs(user_id, jd_parse_status, hil_content_type)
  WHERE (jd_parse_status IS NOT NULL OR hil_content_type IS NOT NULL);

-- Add comments for documentation
COMMENT ON COLUMN public.evaluation_runs.jd_parse_event IS 'Full JD parsing event payload including company, role, requirements, differentiator summary';
COMMENT ON COLUMN public.evaluation_runs.jd_parse_status IS 'Status of JD parsing: success, failed, or pending';
COMMENT ON COLUMN public.evaluation_runs.hil_content_type IS 'Type of HIL content: story, saved_section, or cover_letter_draft';
COMMENT ON COLUMN public.evaluation_runs.hil_action IS 'User action that triggered content: ai_suggest, manual_edit, apply_suggestion';
COMMENT ON COLUMN public.evaluation_runs.hil_content_id IS 'Reference ID of the HIL content item (story_id, saved_section_id, or draft_id)';
COMMENT ON COLUMN public.evaluation_runs.hil_content_word_delta IS 'Change in word count (final - initial)';
COMMENT ON COLUMN public.evaluation_runs.hil_gap_coverage IS 'JSON object tracking gap closure: closedGapIds[], remainingGapCount, percentage';
COMMENT ON COLUMN public.evaluation_runs.hil_gaps_addressed IS 'Array of gap IDs that this content addresses';
COMMENT ON COLUMN public.evaluation_runs.hil_status IS 'Status of HIL event: success, failed, or pending';

COMMIT;

