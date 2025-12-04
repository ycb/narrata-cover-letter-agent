# Phase 1: Database Schema — PR Summary

**Status:** ✅ Ready for Review  
**Date:** December 4, 2025  
**Scope:** Create `evals_log` table and aggregate functions

---

## Changes

### New Files

1. **`supabase/migrations/029_create_evals_log.sql`**
   - Creates `evals_log` table with 17 columns
   - Adds 8 indexes (job_id, created_at, job_type, stage, success, environment, composite, user_id)
   - Configures RLS policies (3 total)
   - Adds comprehensive column comments

2. **`supabase/migrations/030_add_evals_aggregate_functions.sql`**
   - `get_evals_aggregate_by_job_type(since_date)` - Job-level success rate, latency percentiles
   - `get_evals_aggregate_by_stage(since_date, filter_job_type)` - Stage-level metrics
   - `get_evals_quality_score_distribution(since_date, filter_job_type)` - Score histogram
   - `get_evals_recent_failures(filter_job_type, result_limit)` - Error debugging

3. **`supabase/migrations/__tests__/test_evals_migrations.sql`**
   - 6 automated tests validating migrations
   - Tests: table existence, indexes, inserts, functions, constraints, RLS

4. **`supabase/migrations/EVALS_MIGRATIONS_README.md`**
   - Documentation for applying and testing migrations
   - Schema reference
   - Rollback instructions

---

## Testing

### Automated Tests

Run the test suite:

```bash
psql $DATABASE_URL -f supabase/migrations/__tests__/test_evals_migrations.sql
```

**Expected:** All 6 tests pass ✅

### Manual Verification

```sql
-- Verify table
\d public.evals_log

-- Verify indexes
\di public.idx_evals_log_*

-- Test function
SELECT * FROM public.get_evals_aggregate_by_job_type(NOW() - INTERVAL '7 days');
```

---

## Schema Overview

### `evals_log` Table

**Purpose:** Track pipeline evaluation metrics (latency, success/failure, quality checks) for each stage.

**Key Columns:**
- `job_id` - Reference to `jobs.id`
- `job_type` - coverLetter | pmLevels | onboarding
- `stage` - Pipeline stage name (jdAnalysis, baselineAssessment, etc.)
- `duration_ms` - Stage execution time
- `success` - Boolean success/failure
- `quality_checks` - JSONB structural evaluation result
- `quality_score` - 0-100 aggregated score

**Indexes:** 8 total for efficient dashboard queries

**RLS:** Users can view their own logs, system can insert/update

---

## Aggregate Functions

### 1. `get_evals_aggregate_by_job_type`

**Returns:** Success rate, P50/P90/P99 latency, avg quality score by job type

**Usage:**
```sql
SELECT * FROM get_evals_aggregate_by_job_type(NOW() - INTERVAL '7 days');
```

**Example output:**
```
job_type     | success_rate | p50_duration_ms | p90_duration_ms | avg_quality_score
-------------|--------------|-----------------|-----------------|------------------
coverLetter  | 98.50        | 45000           | 52000           | 87
pmLevels     | 97.30        | 95000           | 105000          | 91
```

### 2. `get_evals_aggregate_by_stage`

**Returns:** Stage-level success rate, latency for detailed analysis

**Usage:**
```sql
SELECT * FROM get_evals_aggregate_by_stage(NOW() - INTERVAL '7 days', 'coverLetter');
```

### 3. `get_evals_quality_score_distribution`

**Returns:** Quality score buckets (0-20, 21-40, etc.) with counts

**Usage:**
```sql
SELECT * FROM get_evals_quality_score_distribution(NOW() - INTERVAL '7 days', 'coverLetter');
```

### 4. `get_evals_recent_failures`

**Returns:** Recent failures with error type, message, quality checks

**Usage:**
```sql
SELECT * FROM get_evals_recent_failures('coverLetter', 50);
```

---

## Migration Safety

### Additive Changes ✅

- New table (no impact on existing tables)
- New functions (no impact on existing code)
- No schema changes to `jobs` or `evaluation_runs`

### Performance Impact

- Minimal: New indexes only affect new table
- Functions use efficient aggregations (PERCENTILE_CONT, grouping)

### Rollback Plan

```sql
DROP FUNCTION IF EXISTS public.get_evals_aggregate_by_job_type CASCADE;
DROP FUNCTION IF EXISTS public.get_evals_aggregate_by_stage CASCADE;
DROP FUNCTION IF EXISTS public.get_evals_quality_score_distribution CASCADE;
DROP FUNCTION IF EXISTS public.get_evals_recent_failures CASCADE;
DROP TABLE IF EXISTS public.evals_log CASCADE;
```

---

## Next Steps (After Merge)

1. Apply migrations to dev environment
2. Run test suite
3. Regenerate TypeScript types: `supabase gen types typescript --local > src/types/supabase.ts`
4. Proceed to Phase 2 (Structural Validators)

---

## Checklist

- [x] Migrations created (029, 030)
- [x] Test suite created
- [x] Documentation added
- [x] Schema follows spec (EVALS_V1_1_IMPLEMENTATION_SPEC.md)
- [x] Indexes on job_id and created_at (per feedback)
- [x] Environment column with CHECK constraint (per feedback)
- [x] RLS policies configured
- [x] Functions are STABLE (read-only)
- [x] Comprehensive comments for all columns

---

**Phase 1 Status:** ✅ Complete and Ready for Review

