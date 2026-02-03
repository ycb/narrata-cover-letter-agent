-- Migration: Harden funnel instrumentation, clean obsolete events, and add trigger-based logging
-- Purpose: Align user_events with the canonical stage list and log Setup/Usage milestones via database triggers.

-- Clean up any historical event types that no longer belong in the funnel.
DELETE FROM public.user_events
WHERE event_type NOT IN (
  'account_created',
  'onboarding_completed',
  'dashboard_viewed',
  'work_history_edited',
  'saved_section_edited',
  'template_edited',
  'cover_letter_created',
  'cover_letter_saved',
  'checklist_completed',
  'admin_spoofed_user'
);

-- Rebuild the constraint so only the approved stage types are permitted.
ALTER TABLE public.user_events
  DROP CONSTRAINT IF EXISTS user_events_event_type_check;

ALTER TABLE public.user_events
  ADD CONSTRAINT user_events_event_type_check CHECK (event_type IN (
    'account_created',
    'onboarding_completed',
    'dashboard_viewed',
    'work_history_edited',
    'saved_section_edited',
    'template_edited',
    'cover_letter_created',
    'cover_letter_saved',
    'checklist_completed',
    'admin_spoofed_user'
  ));

-- Shared helper: log a funnel-crafted event from a trigger argument.
CREATE OR REPLACE FUNCTION public.funnel_trigger_log_user_event()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  payload JSONB;
BEGIN
  target_user_id := COALESCE(NEW.user_id, OLD.user_id);
  IF target_user_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  payload := jsonb_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'record_id', COALESCE(NEW.id, OLD.id)::TEXT,
    'timestamp', timezone('UTC', now())
  );

  PERFORM log_user_event(target_user_id, TG_ARGV[0], payload);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.funnel_log_cover_letter_saved()
RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.status IN ('reviewed', 'finalized')
     AND OLD.status IS DISTINCT FROM NEW.status THEN
    payload := jsonb_build_object(
      'status', NEW.status::TEXT,
      'previous_status', OLD.status::TEXT,
      'record_id', NEW.id::TEXT,
      'operation', TG_OP,
      'timestamp', timezone('UTC', now())
    );
    PERFORM log_user_event(NEW.user_id, 'cover_letter_saved', payload);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the shared helper across the tables that represent Setup/Usage interactions.
DROP TRIGGER IF EXISTS trg_funnel_work_items ON public.work_items;
CREATE TRIGGER trg_funnel_work_items
  AFTER INSERT OR UPDATE OR DELETE ON public.work_items
  FOR EACH ROW
  EXECUTE FUNCTION public.funnel_trigger_log_user_event('work_history_edited');

DROP TRIGGER IF EXISTS trg_funnel_stories ON public.stories;
CREATE TRIGGER trg_funnel_stories
  AFTER INSERT OR UPDATE OR DELETE ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.funnel_trigger_log_user_event('work_history_edited');

DROP TRIGGER IF EXISTS trg_funnel_saved_sections ON public.saved_sections;
CREATE TRIGGER trg_funnel_saved_sections
  AFTER INSERT OR UPDATE OR DELETE ON public.saved_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.funnel_trigger_log_user_event('saved_section_edited');

DROP TRIGGER IF EXISTS trg_funnel_templates ON public.cover_letter_templates;
CREATE TRIGGER trg_funnel_templates
  AFTER INSERT OR UPDATE OR DELETE ON public.cover_letter_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.funnel_trigger_log_user_event('template_edited');

DROP TRIGGER IF EXISTS trg_funnel_cover_letter_created ON public.cover_letters;
CREATE TRIGGER trg_funnel_cover_letter_created
  AFTER INSERT ON public.cover_letters
  FOR EACH ROW
  EXECUTE FUNCTION public.funnel_trigger_log_user_event('cover_letter_created');

DROP TRIGGER IF EXISTS trg_funnel_cover_letter_saved ON public.cover_letters;
CREATE TRIGGER trg_funnel_cover_letter_saved
  AFTER UPDATE OF status ON public.cover_letters
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.funnel_log_cover_letter_saved();

-- Rebuild the funnel stats function so the since_date parameter actually filters the returned counts.
CREATE OR REPLACE FUNCTION public.get_funnel_stats(since_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days')
RETURNS TABLE(
  stage TEXT,
  stage_order INTEGER,
  users_reached INTEGER,
  conversion_rate NUMERIC(5,2),
  avg_time_to_next_stage_hours NUMERIC(10,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH stage_times AS (
    SELECT
      fmap.stage,
      fmap.stage_order,
      public.funnel_get_stage_timestamp(fmap.stage, usp) AS stage_timestamp
    FROM public.user_stage_progress usp
    JOIN public.funnel_stage_map fmap ON TRUE
  ),
  stage_stats AS (
    SELECT stage, stage_order, COUNT(*) AS stage_users
    FROM stage_times
    WHERE stage_timestamp IS NOT NULL
      AND stage_timestamp >= since_date
    GROUP BY stage, stage_order
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
    SELECT COALESCE(
      (SELECT stage_users FROM stage_stats ss WHERE ss.stage = 'account_created'),
      1
    ) AS baseline
  ) b
  ORDER BY fmap.stage_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
