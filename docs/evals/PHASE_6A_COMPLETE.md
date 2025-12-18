# Phase 6A: HIL Instrumentation — COMPLETE ✅

**Date:** 2025-12-17  
**Coverage Impact:** 10 → 17 calls (~35% → ~60%)

---

## ✅ What Was Delivered

### 1. **RLS Policy for Frontend Logging**
- **File:** `supabase/migrations/20251230_allow_authenticated_evals_log_inserts.sql`
- **Purpose:** Allows authenticated users to insert their own `evals_log` entries
- **Status:** ⚠️ **Needs Manual Application** (see deployment guide)

### 2. **Frontend Evals Logger Utility**
- **File:** `src/services/evalsLogger.ts`
- **Features:**
  - `EvalsLogger` class for start/success/failure tracking
  - Automatic duration calculation
  - TTFU (Time to First Update) tracking for streaming
  - Token usage logging
  - Error handling with truncated messages
- **Usage:**
  ```typescript
  const logger = new EvalsLogger({ userId, stage: 'hil.contentGeneration.story' });
  logger.start();
  try {
    const result = await llmCall();
    await logger.success({ model: 'gpt-4o-mini', tokens: result.usage });
  } catch (error) {
    await logger.failure(error, { model: 'gpt-4o-mini' });
  }
  ```

### 3. **Instrumented Services (7 LLM Calls)**

#### `contentGenerationService.ts` (3 calls) ✅
- **Stage Names:**
  - `hil.contentGeneration.story` — Story generation
  - `hil.contentGeneration.roleDesc` — Role description enhancement
  - `hil.contentGeneration.savedSection` — Saved section generation
- **Model:** `gpt-4o-mini`
- **Typical Latency:** 10-15s
- **Changes:**
  - Added `EvalsLogger` import
  - Wrapped `generateContent()` with logging
  - Logs success with token usage
  - Logs failures with error details

#### `gapResolutionStreamingService.ts` (1 call) ✅
- **Stage Name:** `hil.gapResolution.stream`
- **Model:** `gpt-4`
- **Typical Latency:** 12-18s
- **Changes:**
  - Added `EvalsLogger` import
  - Added `userId` to `StreamingOptions` interface
  - Wrapped `streamGapResolution()` with logging
  - Tracks TTFU (time to first chunk)

#### `gapResolutionStreamingServiceV2.ts` (2 calls) ✅
- **Stage Names:**
  - `hil.gapResolutionV2.stream` — Initial generation
  - `hil.gapResolutionV2.refine` — Refinement after user input
- **Model:** `gpt-4`
- **Typical Latency:** 12-18s (stream), 10-15s (refine)
- **Changes:**
  - Added `EvalsLogger` import
  - Wrapped both `streamGapResolutionV2()` and `streamRefineWithInputs()` with logging
  - Tracks TTFU for both methods

#### `hilReviewNotesStreamingService.ts` (1 call) ✅
- **Stage Name:** `hil.reviewNotes.stream`
- **Model:** `gpt-4`
- **Typical Latency:** 8-12s
- **Changes:**
  - Added `EvalsLogger` import
  - Added `userId` to `StreamingOptions` interface
  - Wrapped `streamReviewNotes()` with logging
  - Tracks TTFU

---

## 📊 New Metrics Available

After deployment, you'll be able to query:

```sql
-- HIL performance overview (last 7 days)
SELECT 
  stage,
  COUNT(*) as runs,
  ROUND(AVG(duration_ms)) as avg_ms,
  ROUND(AVG(ttfu_ms)) as avg_ttfu_ms,
  ROUND(AVG(completion_tokens)) as avg_completion_tokens,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE NOT success) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 1) as success_rate_pct
FROM evals_log
WHERE stage LIKE 'hil.%'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY stage
ORDER BY runs DESC;
```

**Expected output:**
```
stage                              | runs | avg_ms | avg_ttfu_ms | avg_completion_tokens | successful | failed | success_rate_pct
-----------------------------------|------|--------|-------------|----------------------|------------|--------|------------------
hil.gapResolutionV2.stream         |  120 |  14500 |    2500     |         850          |    118     |    2   |       98.3
hil.contentGeneration.story        |   80 |  12000 |    null     |         900          |     78     |    2   |       97.5
hil.contentGeneration.savedSection |   60 |  11500 |    null     |         850          |     59     |    1   |       98.3
hil.gapResolution.stream           |   50 |  15000 |    2800     |         750          |     49     |    1   |       98.0
hil.contentGeneration.roleDesc     |   40 |   9500 |    null     |         700          |     40     |    0   |      100.0
hil.gapResolutionV2.refine         |   30 |  11000 |    2200     |         800          |     29     |    1   |       96.7
hil.reviewNotes.stream             |   25 |   8500 |    1800     |         600          |     25     |    0   |      100.0
```

---

## 🚀 Deployment Steps

### Step 1: Apply RLS Policy

⚠️ **CRITICAL:** Must be done before deploying frontend code.

**Via Supabase Dashboard SQL Editor:**
1. Go to https://supabase.com/dashboard/project/lgdciykgqwqhxvtbxcvo/sql/new
2. Paste contents of `supabase/migrations/20251230_allow_authenticated_evals_log_inserts.sql`
3. Click "Run"

**Verify:**
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'evals_log' 
  AND policyname = 'Users can insert own evals_log entries';
```

### Step 2: Deploy Frontend Code

```bash
npm run build
# Deploy to your hosting provider
```

### Step 3: Verify Instrumentation

After users interact with HIL features, check logs:

```sql
-- Check recent HIL logs (last hour)
SELECT 
  stage,
  COUNT(*) as runs,
  ROUND(AVG(duration_ms)) as avg_ms
FROM evals_log
WHERE created_at > NOW() - INTERVAL '1 hour'
  AND stage LIKE 'hil.%'
GROUP BY stage;
```

### Step 4: Monitor Dashboard

Go to `/admin/evals` and verify:
- ✅ HIL stages appear in stage list
- ✅ Latency metrics are reasonable
- ✅ Success rate > 95%
- ✅ Token counts are populated

---

## ⚠️ Important Notes

### 1. **HIL V3 Refactor Compatibility**

The instrumentation is **compatible with the ongoing HIL V3 refactor** because:
- ✅ Instrumentation is at the **service layer** (lowest level)
- ✅ Works regardless of which UI component calls the service
- ✅ No UI changes required
- ✅ V3 components will automatically inherit instrumentation when they call these services

### 2. **userId Requirement**

For logging to work, the calling code must pass `userId` in options:

```typescript
// Example: contentGenerationService.ts
await contentGenerationService.generateContent(request, {
  userId: currentUser.id, // ← Required for logging
  startTime: Date.now(),
});
```

**If `userId` is not provided:**
- Logging is skipped (no error thrown)
- Service continues to work normally
- Console warning: `[EvalsLogger] success() called before start()`

### 3. **Streaming Services: TTFU Tracking**

All streaming services now track **TTFU (Time to First Update)**:
- Measures latency until first chunk arrives
- Helps diagnose cold starts and network delays
- Typical TTFU: 1.5-3s (good), 3-5s (acceptable), >5s (investigate)

---

## 🔍 Troubleshooting

### Issue: No logs appearing

**Possible causes:**
1. RLS policy not applied → Apply migration manually
2. User not authenticated → Check `supabase.auth.getUser()`
3. `userId` not passed to service → Update calling code

**Debug:**
```typescript
// Check if user is authenticated
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user?.id);

// Check if RLS policy exists
// Run verification query in Supabase dashboard
```

### Issue: High failure rate

**Possible causes:**
1. LLM API rate limits
2. Invalid prompts
3. Network issues

**Debug:**
```sql
-- Check error messages
SELECT 
  stage,
  error_type,
  error_message,
  COUNT(*) as occurrences
FROM evals_log
WHERE stage LIKE 'hil.%'
  AND success = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY stage, error_type, error_message
ORDER BY occurrences DESC;
```

---

## 📈 Success Metrics

**Phase 6A is successful if:**
- ✅ All 7 HIL stages appear in `evals_log`
- ✅ Success rate > 95% for each stage
- ✅ Average latency < 20s for each stage
- ✅ TTFU < 5s for streaming stages
- ✅ No RLS policy errors in logs

---

## 🎯 Next Steps

### Phase 6B: Draft CL Metrics (~2-3 days)
- Instrument `coverLetterDraftService.ts` (1 LLM call)
- Complex retry logic requires careful instrumentation
- Would increase coverage from 60% → 64%

### Phase 6C: Quality Gates (~1 day)
- Instrument match intelligence, content standards, CL rating, gap detection
- Would increase coverage from 64% → 82-96%

### Phase 6D: Auxiliary (~0.5 day)
- Instrument tag suggestion and any remaining services
- Would achieve ~100% coverage

---

## 📚 Related Documentation

- `docs/evals/INSTRUMENTATION_STATUS_DEC_2025.md` — Full instrumentation audit
- `docs/evals/PHASE_6A_DEPLOYMENT.md` — Detailed deployment guide
- `docs/evals/SSE_HEALTH_TRACKING.md` — SSE stream health tracking
- `docs/evals/STAGE_NAMING_FIX.md` — Stage naming conventions
- `src/services/evalsLogger.ts` — Logging utility API reference

---

**End of Phase 6A Summary**

