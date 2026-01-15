# Evals V1.1 Migrations

**Created:** December 4, 2025  
**Purpose:** Database schema for pipeline evaluation tracking

---

## Migrations

### `029_create_evals_log.sql`

Creates the `evals_log` table with:
- Job context columns (job_id, job_type, stage, user_id, environment)
- Timing metrics (started_at, completed_at, duration_ms, ttfu_ms)
- Reliability metrics (success, error_type, error_message)
- Quality metrics (quality_checks, quality_score)
- 8 indexes for efficient queries
- RLS policies for security

### `030_add_evals_aggregate_functions.sql`

Creates 4 aggregate functions for dashboard queries:
- `get_evals_aggregate_by_job_type(since_date)` - Job-level metrics
- `get_evals_aggregate_by_stage(since_date, filter_job_type)` - Stage-level metrics
- `get_evals_quality_score_distribution(since_date, filter_job_type)` - Score histogram
- `get_evals_recent_failures(filter_job_type, result_limit)` - Recent errors

---

## Local Testing

### Apply Migrations

```bash
# Apply both migrations
supabase db reset

# Or apply individually
supabase migration up 029
supabase migration up 030
```

### Run Tests

```bash
# Run test script
psql $DATABASE_URL -f supabase/migrations/__tests__/test_evals_migrations.sql
```

**Expected output:**
```
NOTICE:  Test 1 PASSED: evals_log table exists
NOTICE:  Test 2 PASSED: All required indexes exist (8 found)
NOTICE:  Test 3 PASSED: Successfully inserted test eval log
NOTICE:  Test 4 PASSED: All aggregate functions exist (4 found)
NOTICE:  Test 4 PASSED: get_evals_aggregate_by_job_type is callable
NOTICE:  Test 5 PASSED: Check constraints are enforced
NOTICE:  Test 6 PASSED: RLS policies exist (3 found)
NOTICE:  ALL TESTS PASSED ✅
```

### Manual Verification

```sql
-- Check table exists
SELECT COUNT(*) FROM public.evals_log;

-- Check indexes
SELECT indexname FROM pg_indexes 
WHERE tablename = 'evals_log' 
ORDER BY indexname;

-- Check functions
SELECT proname FROM pg_proc 
WHERE proname LIKE 'get_evals%';

-- Test aggregate function
SELECT * FROM public.get_evals_aggregate_by_job_type(NOW() - INTERVAL '7 days');
```

---

## Schema Details

### `evals_log` Table

| Column | Type | Constraint | Description |
|--------|------|------------|-------------|
| `id` | UUID | PRIMARY KEY | Auto-generated |
| `job_id` | UUID | NOT NULL | Reference to jobs.id |
| `job_type` | TEXT | CHECK | coverLetter, pmLevels, or onboarding |
| `stage` | TEXT | NOT NULL | Stage name (e.g., jdAnalysis) |
| `user_id` | UUID | FK → auth.users | Job owner |
| `environment` | TEXT | CHECK | dev, staging, or prod |
| `started_at` | TIMESTAMPTZ | NOT NULL | Stage start time |
| `completed_at` | TIMESTAMPTZ | | Stage completion time |
| `duration_ms` | INTEGER | | Execution duration |
| `ttfu_ms` | INTEGER | | Time to first update (streaming) |
| `success` | BOOLEAN | NOT NULL | Stage success/failure |
| `error_type` | TEXT | | Error class if failed |
| `error_message` | TEXT | | Error details if failed |
| `quality_checks` | JSONB | | StructuralEvalResult object |
| `quality_score` | INTEGER | CHECK 0-100 | Aggregated score |
| `semantic_checks` | JSONB | | Future: LLM-as-judge |
| `result_subset` | JSONB | | Safe result snapshot |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Row creation time |

### Indexes

1. `idx_evals_log_job_id` - Lookup by job
2. `idx_evals_log_created_at` - Time-series queries (DESC)
3. `idx_evals_log_job_type` - Filter by job type
4. `idx_evals_log_stage` - Filter by stage
5. `idx_evals_log_success` - Filter by success/failure
6. `idx_evals_log_environment` - Filter by environment (partial)
7. `idx_evals_log_job_type_stage_env` - Composite for aggregations
8. `idx_evals_log_user_id` - RLS queries

### RLS Policies

1. **Users can view their own eval logs** (SELECT) - `auth.uid() = user_id`
2. **System can insert eval logs** (INSERT) - Always allowed (service role)
3. **System can update eval logs** (UPDATE) - Always allowed (service role)

---

## TypeScript Types

After applying migrations, regenerate Supabase types:

```bash
# Generate TypeScript types
supabase gen types typescript --local > src/types/supabase.ts
```

This will add `evals_log` to the Database type definition.

---

## Rollback

To rollback these migrations:

```sql
-- Drop functions first (dependencies)
DROP FUNCTION IF EXISTS public.get_evals_aggregate_by_job_type CASCADE;
DROP FUNCTION IF EXISTS public.get_evals_aggregate_by_stage CASCADE;
DROP FUNCTION IF EXISTS public.get_evals_quality_score_distribution CASCADE;
DROP FUNCTION IF EXISTS public.get_evals_recent_failures CASCADE;

-- Drop table
DROP TABLE IF EXISTS public.evals_log CASCADE;
```

Or use Supabase CLI:

```bash
supabase migration down
```

---

## Next Steps

After migrations are applied:

1. ✅ Verify tests pass
2. Regenerate TypeScript types
3. Proceed to Phase 2 (Structural Validators)

---

**Phase 1 Complete** ✅

