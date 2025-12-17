# Stage Naming Standardization - Implementation Complete

## Problem Identified

User reported two critical issues with `evals_log` data:

1. **Inconsistent `goalsAndStrengths` logging:**
   - Only 1 run for `goalsAndStrengths` (should be N)
   - Caused by logging sub-stages with different names: `goalsAndStrengths_mws`, `goalsAndStrengths_company_context`
   - Made aggregation unreliable

2. **Partial/mixed pipeline logging:**
   - `requirementAnalysis` (76 runs) vs `sectionGaps` (77 runs) vs `jd_analysis` (139 runs)
   - Mismatches suggested:
     - Incomplete jobs (failed before all stages)
     - Inconsistent naming (`jd_analysis` vs `jdAnalysis`)
     - Missing start/completion log pairs

## Root Cause

The pipeline code was:
1. **Using snake_case for some stages** (`jd_analysis`, `company_tags_extraction`, `structural_checks`)
2. **Using underscore for sub-stages** (`goalsAndStrengths_mws` instead of `goalsAndStrengths.mws`)
3. **Not logging stage start events** - only logging on completion/failure
4. **No validation** for stage names

This made it impossible to:
- Trust phase breakdown analytics
- Calculate accurate stage success rates
- Identify where pipelines were failing
- Distinguish primary stages from sub-stages for token tracking

---

## Solution Implemented

### 1. Normalized Stage Names ✅

**Convention:** `<primaryStage>[.<subStage>]`

| Old Name | New Name | Type |
|----------|----------|------|
| `jd_analysis` | `jdAnalysis` | Primary |
| `requirementAnalysis` | (unchanged) | Primary |
| `goalsAndStrengths_mws` | `goalsAndStrengths.mws` | Sub-stage |
| `goalsAndStrengths_company_context` | `goalsAndStrengths.companyContext` | Sub-stage |
| `goalsAndStrengths` | (unchanged) | Primary |
| `sectionGaps` | (unchanged) | Primary |
| `company_tags_extraction` | `companyTags` | Primary |
| `structural_checks` | `structuralChecks` | Primary |

**Benefits:**
- **Hierarchical clarity:** Dot notation (`.`) shows parent-child relationship
- **camelCase consistency:** Matches TypeScript/JavaScript conventions
- **Query simplicity:** `WHERE stage NOT LIKE '%.%'` excludes sub-stages for primary aggregations
- **Token tracking:** Sub-stages preserve detailed prompt/token metrics for cost analysis

### 2. Added Start Event Logging ✅

**Before:**
```typescript
// Only logged on completion
voidLogEval(supabase, {
  job_id,
  stage: 'jdAnalysis',
  started_at: new Date(stageStart),
  completed_at: new Date(), // <-- completion only
  success: true
});
```

**After:**
```typescript
// Log BEFORE execution
const stageStart = Date.now();
voidLogEval(supabase, {
  job_id,
  stage: 'jdAnalysis',
  started_at: new Date(stageStart),
  success: true, // Placeholder
});

try {
  // ... stage execution ...
  
  // Log on success
  voidLogEval(supabase, {
    job_id,
    stage: 'jdAnalysis',
    started_at: new Date(stageStart),
    completed_at: new Date(),
    duration_ms: Date.now() - stageStart,
    success: true,
  });
} catch (error) {
  // Log on failure
  voidLogEval(supabase, {
    job_id,
    stage: 'jdAnalysis',
    started_at: new Date(stageStart),
    completed_at: new Date(),
    duration_ms: Date.now() - stageStart,
    success: false,
    error_type: error.constructor.name,
    error_message: error.message,
  });
  throw error;
}
```

**Benefits:**
- **In-flight tracking:** Dashboards can show active pipelines
- **Failure diagnosis:** Start events logged even if stage crashes early
- **Accurate counts:** Every stage execution has a start event
- **Timeout detection:** Can identify hung stages (start without completion > threshold)

### 3. Backfilled Historical Data ✅

Migration: `20251216_normalize_eval_stage_names.sql`

```sql
UPDATE evals_log 
SET stage = CASE
  WHEN stage = 'goalsAndStrengths_mws' THEN 'goalsAndStrengths.mws'
  WHEN stage = 'goalsAndStrengths_company_context' THEN 'goalsAndStrengths.companyContext'
  WHEN stage = 'jd_analysis' THEN 'jdAnalysis'
  WHEN stage = 'company_tags_extraction' THEN 'companyTags'
  WHEN stage = 'structural_checks' THEN 'structuralChecks'
  ELSE stage
END
WHERE stage IN (...);
```

**Note:** Historical data won't have start events (since code didn't log them before). Only new pipeline runs will have complete start/completion pairs.

---

## Files Changed

### Pipeline Code
1. **`supabase/functions/_shared/pipelines/cover-letter.ts`**
   - Renamed `goalsAndStrengths_mws` → `goalsAndStrengths.mws`
   - Renamed `goalsAndStrengths_company_context` → `goalsAndStrengths.companyContext`
   - Renamed `company_tags_extraction` → `companyTags`
   - Renamed `structural_checks` → `structuralChecks`
   - Added start event logging for all 4 primary stages

2. **`supabase/functions/_shared/pipelines/pm-levels.ts`**
   - Renamed `structural_checks` → `structuralChecks`
   - Added start event logging for all 3 stages

### Database
3. **`supabase/migrations/20251216_normalize_eval_stage_names.sql`**
   - Backfilled historical stage names
   - Updated column comment with naming convention

### Documentation
4. **`docs/evals/STAGE_NAMING_FIX.md`** - Detailed spec
5. **`docs/evals/STAGE_NAMING_FIX_SUMMARY.md`** - This file

---

## Verification Steps

### 1. Check Stage Name Distribution
```sql
SELECT 
  job_type,
  stage,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as in_progress,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND success) as completed,
  COUNT(*) FILTER (WHERE NOT success) as failed
FROM evals_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY job_type, stage
ORDER BY job_type, stage;
```

**Expected:**
- ✅ No snake_case names (`jd_analysis`, `company_tags_extraction`)
- ✅ Sub-stages use dot notation (`goalsAndStrengths.mws`, `goalsAndStrengths.companyContext`)
- ✅ All stages have roughly equal counts (within expected variance for failures)

### 2. Verify Start/Completion Pairing
```sql
WITH stage_events AS (
  SELECT
    stage,
    job_type,
    COUNT(*) FILTER (WHERE completed_at IS NULL) as start_only,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
    COUNT(*) as total
  FROM evals_log
  WHERE created_at > NOW() - INTERVAL '1 hour'
    AND stage NOT LIKE '%.%' -- Primary stages only
  GROUP BY stage, job_type
)
SELECT 
  *,
  ROUND(100.0 * start_only / NULLIF(total, 0), 1) as incomplete_pct,
  CASE 
    WHEN start_only > total * 0.1 THEN '⚠️ HIGH INCOMPLETE RATE'
    ELSE '✅ OK'
  END as health
FROM stage_events
ORDER BY job_type, stage;
```

**Expected:**
- ✅ `start_only` count > 0 (new behavior - logs start events)
- ✅ `incomplete_pct` < 10% (most stages should complete)
- ⚠️ If `incomplete_pct` > 10%, investigate stage failures

### 3. Token Tracking for Sub-Stages
```sql
SELECT 
  stage,
  COUNT(*) as runs,
  SUM(prompt_tokens) as total_prompt_tokens,
  SUM(completion_tokens) as total_completion_tokens,
  SUM(total_tokens) as total_tokens,
  ROUND(AVG(duration_ms)) as avg_duration_ms
FROM evals_log
WHERE stage LIKE 'goalsAndStrengths.%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY stage
ORDER BY stage;
```

**Expected:**
```
stage                            | runs | total_prompt_tokens | total_completion_tokens | total_tokens | avg_duration_ms
---------------------------------|------|---------------------|-------------------------|--------------|----------------
goalsAndStrengths.companyContext |   X  |        ~15,000      |          ~8,000         |    ~23,000   |      ~5,000
goalsAndStrengths.mws            |   X  |        ~20,000      |          ~12,000        |    ~32,000   |      ~8,000
```

✅ Both sub-stages have similar run counts
✅ Token metrics are captured for cost tracking

### 4. Check Phase Breakdown Accuracy
```sql
WITH stage_stats AS (
  SELECT 
    stage,
    COUNT(*) as runs,
    ROUND(AVG(duration_ms)) as avg_ms
  FROM evals_log
  WHERE job_type = 'coverLetter'
    AND stage NOT LIKE '%.%'
    AND completed_at IS NOT NULL
    AND created_at > NOW() - INTERVAL '7 days'
  GROUP BY stage
)
SELECT 
  stage,
  runs,
  avg_ms,
  ROUND(100.0 * avg_ms / SUM(avg_ms) OVER(), 1) as pct_of_total
FROM stage_stats
ORDER BY avg_ms DESC;
```

**Expected:**
```
stage               | runs | avg_ms | pct_of_total
--------------------|------|--------|-------------
sectionGaps         |   N  | 35,000 |     45.8%
requirementAnalysis |   N  | 18,000 |     23.5%
jdAnalysis          |   N  | 15,000 |     19.6%
goalsAndStrengths   |   N  |  8,000 |     10.5%
companyTags         |   N  |    300 |      0.4%
structuralChecks    |   N  |    150 |      0.2%
```

✅ All stages have similar `runs` counts (within 5%)
✅ Phase breakdown adds to ~100%
✅ `sectionGaps` is the slowest stage (expected)

---

## Expected Outcomes

1. **✅ Accurate Aggregations**
   - Dashboard stage breakdowns show true distribution
   - No more mystery "1 run" anomalies
   - Reliable "phase A vs B" comparisons

2. **✅ Consistent Naming**
   - All stages use camelCase
   - Sub-stages use dot notation
   - No more snake_case pollution

3. **✅ Complete Tracking**
   - Every stage execution has start + completion events
   - Can identify in-flight vs completed vs failed
   - 99%+ start/completion match rate (allowing for crashes)

4. **✅ Clear Hierarchy**
   - Primary stages for high-level metrics
   - Sub-stages for detailed token tracking
   - Easy to query: `WHERE stage NOT LIKE '%.%'`

5. **✅ Debugging Confidence**
   - Analytics are trustworthy
   - Can pinpoint exact stage failures
   - Performance optimization decisions based on real data

---

## Next Steps

### Immediate (Before Next Pipeline Run)
- [ ] Deploy Edge Functions: `cover-letter`, `pm-levels`
- [ ] Run migration: `20251216_normalize_eval_stage_names.sql`
- [ ] Verify with queries above

### Short-Term (Next 7 Days)
- [ ] Monitor dashboard for anomalies
- [ ] Validate start/completion pairing rate
- [ ] Update `AdminEvalsDashboard` to filter by primary stages only

### Long-Term (Future Enhancement)
- [ ] Add stage name validation in `logEval()` function
- [ ] Create materialized view for stage aggregations
- [ ] Add alerting for high incomplete rates (> 10%)

---

## Rollback Plan

If normalization causes issues:

```sql
BEGIN;

-- Revert stage names
UPDATE evals_log 
SET stage = CASE
  WHEN stage = 'goalsAndStrengths.mws' THEN 'goalsAndStrengths_mws'
  WHEN stage = 'goalsAndStrengths.companyContext' THEN 'goalsAndStrengths_company_context'
  WHEN stage = 'jdAnalysis' THEN 'jd_analysis'
  WHEN stage = 'companyTags' THEN 'company_tags_extraction'
  WHEN stage = 'structuralChecks' THEN 'structural_checks'
  ELSE stage
END
WHERE stage IN (
  'goalsAndStrengths.mws',
  'goalsAndStrengths.companyContext',
  'jdAnalysis',
  'companyTags',
  'structuralChecks'
);

COMMIT;
```

Then redeploy previous Edge Function versions.

---

**Status:** ✅ Ready for Deployment
**Risk:** Low (non-breaking change, backward compatible queries)
**Estimated Impact:** Fixes unreliable analytics, enables accurate performance optimization

