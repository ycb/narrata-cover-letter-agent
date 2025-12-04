## Summary
Enable Supabase Realtime broadcasts for `sources` and `work_items` so the UI can stream stage updates and newly inserted work items.

## Problem
The onboarding flow relies on realtime updates. If tables are not in the publication, events won't be delivered.

## Files to create/modify
- Modify: migration (append to the migration from Issue 1 or create a new one, per team practice)

## Step-by-step implementation details
Option A (simple; run once in known state):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE sources;
ALTER PUBLICATION supabase_realtime ADD TABLE work_items;
```

Option B (idempotent; safe to re-run):
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='sources'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE sources';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname='public' AND tablename='work_items'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE work_items';
  END IF;
END $$;
```

## Acceptance criteria
- `sources` and `work_items` are in `supabase_realtime` publication.

## QA steps
- `SELECT * FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename IN ('sources','work_items');` shows both tables.
- Perform a test `UPDATE sources ...` and `INSERT INTO work_items ...` while a realtime client is subscribed; events are received.

