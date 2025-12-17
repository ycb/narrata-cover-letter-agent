# Stage Naming Fix - Deployment Checklist

## Pre-Deployment

- [ ] Review changes in:
  - `supabase/functions/_shared/pipelines/cover-letter.ts`
  - `supabase/functions/_shared/pipelines/pm-levels.ts`
  - `supabase/migrations/20251216_normalize_eval_stage_names.sql`

## Deployment Steps

### 1. Apply Database Migration

```bash
cd /Users/admin/narrata
supabase db push
```

**Expected output:**
```
Applying migration 20251216_normalize_eval_stage_names...
Migration complete. Normalized X rows to camelCase + dot notation.
```

### 2. Deploy Edge Functions

```bash
# Deploy cover-letter pipeline
supabase functions deploy cover-letter

# Deploy pm-levels pipeline  
supabase functions deploy pm-levels
```

**Expected output:**
```
Deployed Functions on project lgdciykgqwqhxvtbxcvo:
  cover-letter
  pm-levels
```

### 3. Verify Migration Success

Run verification queries:

```bash
# Connect to remote DB
supabase db remote --linked

# Run verification
\i /tmp/verify_stage_names.sql
```

**Check for:**
- ✅ No snake_case stages (query #2 returns empty)
- ✅ Sub-stages use dot notation (`goalsAndStrengths.mws`, `goalsAndStrengths.companyContext`)
- ✅ All stages present with normalized names

### 4. Test New Pipeline Run

Trigger a cover letter generation:

1. Go to app
2. Create new cover letter
3. Monitor browser console for timing logs
4. Wait for completion

### 5. Verify New Data

Query recent pipeline runs:

```sql
SELECT 
  job_id,
  stage,
  started_at,
  completed_at,
  success,
  duration_ms
FROM evals_log
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY started_at;
```

**Expected:**
- ✅ Each stage has TWO rows:
  1. Start event (`completed_at IS NULL`)
  2. Completion event (`completed_at IS NOT NULL`)
- ✅ All stage names in camelCase
- ✅ Sub-stages use dot notation

## Post-Deployment Monitoring

### First 24 Hours

- [ ] Monitor `evals_log` for new entries
- [ ] Check start/completion pairing rate
- [ ] Verify no regression in pipeline success rates
- [ ] Validate dashboard aggregations

### Queries to Monitor

```sql
-- Check start/completion pairing (last hour)
SELECT 
  stage,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as starts,
  COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE completed_at IS NOT NULL) / COUNT(*), 1) as completion_pct
FROM evals_log
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY stage
ORDER BY stage;
```

Expected: `completion_pct` > 90% for all stages

```sql
-- Check stage name consistency (last hour)
SELECT DISTINCT stage
FROM evals_log
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY stage;
```

Expected: Only camelCase names, sub-stages with dot notation

## Rollback Procedure

If issues detected:

```bash
# 1. Revert Edge Functions
git checkout HEAD~1 supabase/functions/_shared/pipelines/cover-letter.ts
git checkout HEAD~1 supabase/functions/_shared/pipelines/pm-levels.ts
supabase functions deploy cover-letter
supabase functions deploy pm-levels

# 2. Revert database migration
supabase db execute << 'EOF'
BEGIN;
UPDATE evals_log 
SET stage = CASE
  WHEN stage = 'goalsAndStrengths.mws' THEN 'goalsAndStrengths_mws'
  WHEN stage = 'goalsAndStrengths.companyContext' THEN 'goalsAndStrengths_company_context'
  WHEN stage = 'jdAnalysis' THEN 'jd_analysis'
  WHEN stage = 'companyTags' THEN 'company_tags_extraction'
  WHEN stage = 'structuralChecks' THEN 'structural_checks'
  ELSE stage
END;
COMMIT;
EOF
```

## Success Criteria

✅ **Deployment successful if:**
1. No snake_case stage names in new logs
2. Start/completion pairing rate > 90%
3. Sub-stage counts match parent stage counts (within 5%)
4. No increase in pipeline failure rate
5. Dashboard aggregations show consistent data

❌ **Rollback if:**
1. Pipeline failure rate increases by > 10%
2. Stage name validation errors in logs
3. Dashboard queries break
4. Start/completion pairing rate < 80%

---

**Deployed by:** _____________
**Date:** _____________
**Status:** _____________

