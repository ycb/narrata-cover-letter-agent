# Metrics Architecture Test Summary

**Date:** 2025-11-25  
**Status:** ✅ Implementation Complete  
**Deployment:** Ready for production testing

---

## Changes Implemented

### 1. Pipeline Updates (`supabase/functions/_shared/pipelines/cover-letter.ts`)
**Lines 390-398**: Added metrics write-back to `cover_letters` table on job completion.

```typescript
// Update draft with final metrics (canonical source of truth)
if (finalResult.draftId) {
  await supabase
    .from('cover_letters')
    .update({
      metrics: finalResult.metrics,
    })
    .eq('id', finalResult.draftId);
}
```

**Impact:**
- `cover_letters.metrics` is now the canonical source of truth
- Metrics are written in array format: `[{ key, label, type, value, summary, tooltip }]`
- Job result still contains metrics for debugging/telemetry

### 2. Frontend Updates (`src/components/cover-letters/CoverLetterCreateModal.tsx`)
**Lines 236-238**: Removed job metrics override.

```typescript
// BEFORE:
const draftWithMetrics = {
  ...fetched,
  metrics: jobState?.result?.metrics || [],
};
setDraft(draftWithMetrics as any);

// AFTER:
setDraft(fetched as any);
```

**Impact:**
- Frontend now reads metrics directly from the database
- No dependency on job state after draft is created
- Fixes "metrics.find is not a function" error

### 3. Database Migration (`supabase/migrations/029_add_job_cleanup_policy.sql`)
Added retention policy for jobs table:

**New Columns:**
- `archived_at` (timestamp): When the job was archived
- `should_archive` (boolean): Whether to archive this job

**New Function:**
- `archive_old_jobs()`: Archives jobs older than 30 days

**Retention Logic:**
- Jobs older than 30 days are automatically archived
- Retained fields: `id`, `user_id`, `type`, `created_at`, `status`, `result.draftId`, `result.gapCount`
- Cleared fields: Full `result` object (except minimal fields), `stages` (set to NULL)

### 4. Documentation Updates
Updated `docs/dev/features/STREAMING_MVP_IMPLEMENTATION.md` with:
- Data ownership model (cover_letters = source of truth, jobs = ephemeral)
- Archival policy details
- Data flow diagram

---

## Data Flow Verification

### Pipeline Execution Flow
1. **Job Creation** (`create-job` Edge Function)
   - Creates job record with `status: 'pending'`
   - Returns `jobId` to client

2. **Pipeline Processing** (`stream-job-process` Edge Function)
   - Executes stages sequentially
   - Updates `jobs.stages` incrementally for real-time progress
   - Generates final metrics array

3. **Draft Creation** (Stage 4: draftGeneration)
   - Creates record in `cover_letters` table
   - Initially without metrics (to be added later)
   - Returns `draftId`

4. **Job Completion** (Final step in pipeline)
   - Writes final result to `jobs.result` (includes metrics)
   - **NEW**: Writes metrics to `cover_letters.metrics` using `draftId`
   - Marks job as `complete`

5. **Frontend Loading** (After job completion)
   - Fetches draft from `cover_letters` table
   - Loads `metrics` directly from database (no job dependency)
   - Displays metrics in UI

### Data Ownership Model

| Entity | Source of Truth | Lifecycle | Purpose |
|--------|----------------|-----------|---------|
| `cover_letters.metrics` | ✅ YES | Permanent | User-facing metrics, canonical data |
| `jobs.result.metrics` | ❌ NO | 30 days | Debugging, telemetry, execution artifact |
| `jobs.stages` | ❌ NO | 30 days | Real-time progress tracking |

---

## Schema Verification

### cover_letters.metrics Column
- **Type**: `jsonb`
- **Format**: Array of metric objects
- **Structure**:
  ```json
  [
    {
      "key": "ats",
      "label": "ATS Score",
      "type": "score",
      "value": 85,
      "summary": "ATS keyword match score",
      "tooltip": "Based on keyword matching with job description"
    },
    {
      "key": "requirementsMet",
      "label": "Requirements Met",
      "type": "count",
      "value": 8,
      "summary": "8 of 10 requirements met",
      "tooltip": "Number of job requirements you meet"
    }
  ]
  ```

### jobs.result Column
- **Type**: `jsonb`
- **Format**: Object with execution data
- **Structure** (before archival):
  ```json
  {
    "draftId": "uuid",
    "metrics": [...],  // Same structure as cover_letters.metrics
    "gapCount": 3
  }
  ```
- **Structure** (after archival):
  ```json
  {
    "archived": true,
    "draftId": "uuid",
    "gapCount": 3
  }
  ```

---

## Testing Checklist

### ✅ Pre-deployment Verification
- [x] TypeScript compilation passes
- [x] Frontend build succeeds (no errors)
- [x] Migration applied successfully
- [x] Schema verification confirms `cover_letters.metrics` exists as JSONB
- [x] Pipeline code updated to write metrics to draft
- [x] Frontend code updated to read from draft.metrics

### 🔄 Post-deployment Testing (Manual)
- [ ] **Test 1**: Create new cover letter via streaming
  - Expected: Job completes, draft created, metrics appear in UI
  - Verify: `cover_letters.metrics` is populated as an array
  - Verify: No "metrics.find is not a function" error

- [ ] **Test 2**: Verify metrics display correctly
  - Expected: ATS Score, Experience Match, Goals Match, Requirements Met all show
  - Verify: Metrics use correct data structure (array of objects)

- [ ] **Test 3**: Verify job archival function
  - SQL: `UPDATE jobs SET created_at = NOW() - INTERVAL '31 days' WHERE id = '<test-job-id>';`
  - SQL: `SELECT archive_old_jobs();`
  - Expected: Function returns count of archived jobs
  - Verify: Archived job has minimal `result` and `stages` is NULL
  - Verify: Draft still loads correctly (no dependency on job)

- [ ] **Test 4**: Verify draft loads without active job
  - Navigate away after job completes
  - Return to cover letter edit page
  - Expected: Metrics display correctly (loaded from draft, not job)

### 🚀 Edge Function Deployment
**Note**: Edge Functions need to be deployed manually via CLI or Dashboard Editor due to dependency complexity.

**Deployment command** (if using CLI):
```bash
cd /Users/admin/narrata
supabase functions deploy stream-job-process
```

**Dashboard Editor**: Copy/paste updated pipeline files if needed.

---

## Rollback Plan

If issues arise in production:

### Step 1: Revert Pipeline Changes
```bash
git revert <commit-hash-for-pipeline-update>
```

### Step 2: Revert Frontend Changes
```bash
git revert <commit-hash-for-frontend-update>
```

### Step 3: Redeploy Edge Functions
Deploy the reverted version of `stream-job-process`.

### Step 4: (Optional) Roll Back Migration
```sql
-- Remove archival function
DROP FUNCTION IF EXISTS archive_old_jobs();

-- Remove columns
ALTER TABLE jobs DROP COLUMN IF EXISTS archived_at;
ALTER TABLE jobs DROP COLUMN IF EXISTS should_archive;

-- Remove indexes
DROP INDEX IF EXISTS idx_jobs_archived_at;
DROP INDEX IF EXISTS idx_jobs_created_at_status;
```

**Note**: The migration rollback is optional as it only adds non-breaking features.

---

## Success Criteria

✅ **Implementation Complete When:**
1. New cover letter creation flows successfully from start to finish
2. Metrics display correctly in the UI (no JavaScript errors)
3. `metrics.find()` works (confirms array structure)
4. Draft loads correctly without active job
5. Job archival function runs without errors

✅ **Production Ready When:**
1. All manual tests pass
2. Edge Functions deployed with updated pipeline code
3. No regression in existing cover letter functionality
4. User can create, view, and edit cover letters without errors

---

## Next Steps

1. **Deploy Edge Functions**: Update `stream-job-process` with the new pipeline code
2. **Manual QA**: Run through the testing checklist above
3. **Monitor**: Watch for any errors in production logs
4. **Cron Setup** (optional): Add weekly cron job for `archive_old_jobs()` via Supabase Dashboard

---

## Related Files

- Pipeline: `supabase/functions/_shared/pipelines/cover-letter.ts` (lines 390-398)
- Frontend: `src/components/cover-letters/CoverLetterCreateModal.tsx` (lines 236-238)
- Migration: `supabase/migrations/029_add_job_cleanup_policy.sql`
- Docs: `docs/dev/features/STREAMING_MVP_IMPLEMENTATION.md`

---

## Commit History

1. `feat(pipeline): write final metrics to cover_letters table on job completion`
2. `refactor(cover-letter): remove job metrics override, use draft.metrics from database`
3. `feat(db): add job archival policy and cleanup function`
4. `docs(streaming): document data ownership and archival policy`

