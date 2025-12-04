## Summary
Add `processing_stage` column to `sources` with an index to drive realtime stage tracking for onboarding streaming.

## Problem
The UI needs to react to backend processing stages as the edge function progresses. The `processing_stage` column does not exist yet.

## Files to create/modify
- Create: `supabase/migrations/YYYYMMDD_add_processing_stage.sql`

## Step-by-step implementation details
1) Create migration file `supabase/migrations/YYYYMMDD_add_processing_stage.sql`.
2) Add the SQL below. Keep the migration idempotent.

```sql
-- Migration: add_processing_stage_to_sources

ALTER TABLE sources 
ADD COLUMN IF NOT EXISTS processing_stage TEXT DEFAULT 'pending';

-- MVP values: 'pending', 'extracting', 'skeleton', 'skills', 'complete', 'error'

CREATE INDEX IF NOT EXISTS idx_sources_processing_stage 
ON sources(processing_stage);
```

Note: This ticket is strictly scoped to `processing_stage`. Do not modify `work_items` here.

## Acceptance criteria
- `sources.processing_stage` exists with default `'pending'`.
- Index `idx_sources_processing_stage` exists.

## QA steps
- Verify column: `SELECT column_name FROM information_schema.columns WHERE table_name='sources' AND column_name='processing_stage';`
- Update a sample row: `UPDATE sources SET processing_stage='skeleton' WHERE id=<id>;` Confirm update succeeds.

