# Phase 6A: HIL Instrumentation Deployment Guide

## Overview

Phase 6A adds LLM performance instrumentation to all Human-in-the-Loop (HIL) services using the RPC approach (Option 2).

**Coverage Impact:** 10 → 17 calls (~35% → ~60%)

---

## Prerequisites

### 1. Apply RLS Policy Migration

**⚠️ IMPORTANT:** Before deploying instrumented code, apply the RLS policy to allow authenticated users to insert `evals_log` entries.

**Option A: Via Supabase Dashboard SQL Editor**

1. Go to https://supabase.com/dashboard/project/lgdciykgqwqhxvtbxcvo/sql/new
2. Paste the contents of `supabase/migrations/20251230_allow_authenticated_evals_log_inserts.sql`
3. Click "Run"

**Option B: Via `psql` (if you have direct DB access)**

```bash
psql <your-connection-string> < supabase/migrations/20251230_allow_authenticated_evals_log_inserts.sql
```

**Verification Query:**

```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'evals_log' 
  AND policyname = 'Users can insert own evals_log entries';
```

Expected output:
```
policyname                           | cmd    | qual
-------------------------------------|--------|------------------
Users can insert own evals_log entries | INSERT | (user_id = auth.uid())
```

---

## Deployment Steps

### Step 1: Deploy Frontend Code

The following files have been instrumented:

1. ✅ `src/services/evalsLogger.ts` — New logging utility
2. ✅ `src/services/contentGenerationService.ts` — 3 LLM calls instrumented
3. ✅ `src/services/gapResolutionStreamingService.ts` — 1 LLM call instrumented
4. ✅ `src/services/gapResolutionStreamingServiceV2.ts` — 2 LLM calls instrumented
5. ✅ `src/services/hilReviewNotesStreamingService.ts` — 1 LLM call instrumented

**Deploy:**

```bash
# Build and deploy frontend
npm run build
# Deploy to your hosting provider (Vercel, Netlify, etc.)
```

---

### Step 2: Verify Instrumentation

After deployment, use HIL features and check that `evals_log` entries are being created:

```sql
-- Check recent HIL logs (last hour)
SELECT 
  stage,
  COUNT(*) as runs,
  ROUND(AVG(duration_ms)) as avg_ms,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE NOT success) as failed
FROM evals_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND stage LIKE 'hil%'
GROUP BY stage
ORDER BY runs DESC;
```

**Expected stages:**
- `hil.contentGeneration.story`
- `hil.contentGeneration.roleDesc`
- `hil.contentGeneration.savedSection`
- `hil.gapResolution.stream`
- `hil.gapResolutionV2.stream`
- `hil.gapResolutionV2.refine`
- `hil.reviewNotes.stream`

---

### Step 3: Monitor Dashboard

Go to `/admin/evals` and verify:

1. ✅ HIL stages appear in the stage list
2. ✅ Latency metrics are reasonable (8-20s typical)
3. ✅ Success rate > 95%
4. ✅ Token counts are populated

---

## Stage Naming Convention

All HIL stages follow the pattern: `hil.<service>.<operation>`

| Service | Operation | Stage Name | Model | Typical Latency |
|---------|-----------|------------|-------|-----------------|
| Content Generation | Story | `hil.contentGeneration.story` | gpt-4o-mini | 10-15s |
| Content Generation | Role Desc | `hil.contentGeneration.roleDesc` | gpt-4o-mini | 8-12s |
| Content Generation | Saved Section | `hil.contentGeneration.savedSection` | gpt-4o-mini | 10-14s |
| Gap Resolution (V1) | Stream | `hil.gapResolution.stream` | gpt-4 | 12-18s |
| Gap Resolution (V2) | Stream | `hil.gapResolutionV2.stream` | gpt-4 | 12-18s |
| Gap Resolution (V2) | Refine | `hil.gapResolutionV2.refine` | gpt-4 | 10-15s |
| Review Notes | Stream | `hil.reviewNotes.stream` | gpt-4 | 8-12s |

---

## Troubleshooting

### Issue: No `evals_log` entries appearing

**Cause:** RLS policy not applied or user not authenticated

**Fix:**
1. Verify RLS policy exists (see verification query above)
2. Check browser console for errors like "new row violates row-level security policy"
3. Verify user is authenticated (`supabase.auth.getUser()`)

---

### Issue: `evalsLogger.ts` import errors

**Cause:** TypeScript compilation issue

**Fix:**
```bash
npm run type-check
npm run build
```

---

### Issue: High failure rate (> 10%)

**Cause:** LLM API issues or prompt problems

**Fix:**
1. Check error messages in `evals_log.error_message`
2. Look for patterns (timeouts, rate limits, validation errors)
3. Review recent prompt changes

---

## Rollback Plan

If instrumentation causes issues:

1. **Revert frontend code:**
   ```bash
   git revert <commit-hash>
   npm run build
   # Redeploy
   ```

2. **RLS policy can stay** (it's non-blocking, just allows inserts)

3. **Logs will stop appearing** once reverted code is deployed

---

## Next Steps

After Phase 6A is stable:

- **Phase 6B:** Instrument `coverLetterDraftService.ts` (draft metrics)
- **Phase 6C:** Instrument quality gates (match intelligence, content standards, CL rating)
- **Phase 6D:** Instrument auxiliary services (tag suggestion)

---

## Related Documentation

- `docs/evals/INSTRUMENTATION_STATUS_DEC_2025.md` — Full instrumentation audit
- `docs/evals/SSE_HEALTH_TRACKING.md` — SSE stream health tracking
- `docs/evals/STAGE_NAMING_FIX.md` — Stage naming conventions
- `src/services/evalsLogger.ts` — Logging utility API reference

---

**End of Phase 6A Deployment Guide**

