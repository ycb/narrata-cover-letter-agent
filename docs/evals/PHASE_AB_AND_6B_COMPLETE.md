# Phase A/B Aggregates + Phase 6B Complete ✅

**Date:** 2025-12-17  
**Scope:** Added Phase A/B aggregate logging + instrumented draft CL metrics (Phase 6B)

---

## ✅ What Was Delivered

### 1. **Cover Letter Phase A Aggregate Logging** ✅

**File:** `supabase/functions/_shared/pipelines/cover-letter.ts`

**Changes:**
- Added `coverLetter.phaseA` aggregate log after all Phase A stages complete
- Calculates total Phase A duration by summing individual stage durations
- Tracks success status (all stages must succeed)
- Includes key metrics: requirementsMet, totalRequirements, totalGaps, qualityScore

**Stage Name:** `coverLetter.phaseA`

**What's Logged:**
```typescript
{
  job_id: string,
  job_type: 'coverLetter',
  stage: 'coverLetter.phaseA',
  user_id: string,
  started_at: Date (backdate to pipeline start),
  completed_at: Date,
  duration_ms: number (sum of all Phase A stages),
  success: boolean (all stages succeeded),
  result_subset: {
    stagesCompleted: string[], // e.g., ['jdAnalysis', 'requirementAnalysis', ...]
    stageCount: number,
    requirementsMet: number,
    totalRequirements: number,
    totalGaps: number,
    qualityScore: number,
  }
}
```

**Phase A Stages Included:**
1. `jdAnalysis` — Job description parsing
2. `requirementAnalysis` — Requirement extraction
3. `goalsAndStrengths` — MWS + company context
4. `sectionGaps` — Gap detection

---

### 2. **Cover Letter Phase B Instrumentation** ✅ (Phase 6B)

**File:** `src/services/coverLetterDraftService.ts`

**Changes:**
- Added `EvalsLogger` import
- Instrumented `generateDraft()` method's metrics calculation
- Wrapped retry loop with logging
- Tracks attempt count and fallback usage
- Logs success with metrics details or fallback reason

**Stage Name:** `coverLetter.phaseB.metrics`

**What's Logged:**
```typescript
{
  job_id: string (draft ID),
  job_type: 'coverLetter',
  stage: 'coverLetter.phaseB.metrics',
  user_id: string,
  started_at: Date,
  completed_at: Date,
  duration_ms: number,
  success: boolean (always true, even with fallback),
  model: 'gpt-4',
  result_subset: {
    attemptCount: number, // How many retries before success/fallback
    usedFallback: boolean, // True if LLM failed and fallback metrics used
    fallbackReason?: string, // Error message if fallback used
    metricsCalculated?: number, // Number of metrics calculated (if success)
    atsScore?: number, // ATS score (if success)
  }
}
```

**Retry Logic:**
- Attempt 1: Immediate
- Attempt 2: Wait 750ms
- Attempt 3: Wait 1500ms
- If all fail: Use fallback metrics (still logs as success with `usedFallback: true`)

---

## 📊 New Metrics Available

### Query Phase A Aggregate
```sql
-- Phase A performance (last 7 days)
SELECT 
  COUNT(*) as runs,
  ROUND(AVG(duration_ms)) as avg_ms,
  ROUND(AVG((result_subset->>'requirementsMet')::int)) as avg_reqs_met,
  ROUND(AVG((result_subset->>'totalGaps')::int)) as avg_gaps,
  ROUND(AVG((result_subset->>'qualityScore')::numeric), 2) as avg_quality,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE NOT success) as failed
FROM evals_log
WHERE stage = 'coverLetter.phaseA'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Expected output:**
```
runs | avg_ms | avg_reqs_met | avg_gaps | avg_quality | successful | failed
-----|--------|--------------|----------|-------------|------------|-------
 150 |  45000 |      18      |    12    |    0.85     |    148     |   2
```

### Query Phase B Metrics
```sql
-- Phase B performance (last 7 days)
SELECT 
  COUNT(*) as runs,
  ROUND(AVG(duration_ms)) as avg_ms,
  COUNT(*) FILTER (WHERE (result_subset->>'usedFallback')::boolean = true) as fallback_count,
  ROUND(AVG((result_subset->>'attemptCount')::int), 1) as avg_attempts,
  ROUND(AVG((result_subset->>'atsScore')::numeric), 2) as avg_ats_score
FROM evals_log
WHERE stage = 'coverLetter.phaseB.metrics'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Expected output:**
```
runs | avg_ms | fallback_count | avg_attempts | avg_ats_score
-----|--------|----------------|--------------|---------------
 150 |  18000 |       5        |     1.2      |     0.78
```

### Query Total CL Pipeline (Phase A + Phase B)
```sql
-- Total pipeline duration per job
SELECT 
  job_id,
  SUM(duration_ms) as total_pipeline_ms,
  MAX(CASE WHEN stage = 'coverLetter.phaseA' THEN duration_ms END) as phase_a_ms,
  MAX(CASE WHEN stage = 'coverLetter.phaseB.metrics' THEN duration_ms END) as phase_b_ms
FROM evals_log
WHERE stage IN ('coverLetter.phaseA', 'coverLetter.phaseB.metrics')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_id
ORDER BY total_pipeline_ms DESC
LIMIT 10;
```

**Expected output:**
```
job_id                               | total_pipeline_ms | phase_a_ms | phase_b_ms
-------------------------------------|-------------------|------------|------------
f336d0bc-b841-465b-8045-024475c079dd |      68500        |   48000    |   20500
a1b2c3d4-e5f6-7890-abcd-ef1234567890 |      65200        |   45000    |   20200
...
```

---

## 📈 Coverage Update

### Before This Work
- **Onboarding:** ✅ Fully instrumented (individual stages + console summary)
- **CL Phase A:** ⚠️ Individual stages only (no aggregate)
- **CL Phase B:** ❌ Not instrumented

### After This Work
- **Onboarding:** ✅ Fully instrumented
- **CL Phase A:** ✅ Individual stages + aggregate
- **CL Phase B:** ✅ Metrics calculation instrumented

### Overall LLM Call Coverage
- **Before:** 17 of 25-30 calls (~60%)
- **After:** 18 of 25-30 calls (~64%)
- **Gain:** +1 LLM call (draft CL metrics)

---

## 🎯 What You Can Now Track

### 1. **Phase A Performance**
- Total analysis duration (jdAnalysis → sectionGaps)
- Success rate
- Requirements met
- Gaps detected
- Quality score

### 2. **Phase B Performance**
- Metrics calculation duration
- Retry attempts before success
- Fallback usage rate (when LLM fails)
- ATS scores
- Metrics calculated per draft

### 3. **Total Pipeline Performance**
- End-to-end duration (Phase A + Phase B)
- Phase breakdown (which phase is slower?)
- Bottleneck identification

### 4. **Reliability Metrics**
- Phase A failure rate
- Phase B fallback rate (graceful degradation)
- Retry patterns

---

## 🚀 Deployment Steps

### Step 1: Deploy Edge Function (Phase A)
```bash
cd /Users/admin/narrata
supabase functions deploy stream-job
```

### Step 2: Deploy Frontend (Phase B)
```bash
npm run build
# Deploy to your hosting provider
```

### Step 3: Verify Logging
```sql
-- Check Phase A logs (should appear after next CL generation)
SELECT * FROM evals_log 
WHERE stage = 'coverLetter.phaseA' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check Phase B logs (should appear after next draft generation)
SELECT * FROM evals_log 
WHERE stage = 'coverLetter.phaseB.metrics' 
ORDER BY created_at DESC 
LIMIT 5;
```

---

## 🔍 Troubleshooting

### Issue: No Phase A logs appearing

**Possible causes:**
1. Edge function not deployed
2. No cover letter jobs running

**Debug:**
```sql
-- Check if individual Phase A stages are logging
SELECT stage, COUNT(*) 
FROM evals_log 
WHERE job_type = 'coverLetter'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY stage;
```

### Issue: No Phase B logs appearing

**Possible causes:**
1. Frontend not deployed
2. Users not generating drafts
3. `userId` not available in context

**Debug:**
```typescript
// Check browser console for errors
console.log('[Phase 6B] userId:', userId);
```

### Issue: High fallback rate in Phase B

**Possible causes:**
1. LLM API rate limits
2. Network issues
3. Invalid prompts

**Debug:**
```sql
-- Check fallback reasons
SELECT 
  result_subset->>'fallbackReason' as reason,
  COUNT(*) as occurrences
FROM evals_log
WHERE stage = 'coverLetter.phaseB.metrics'
  AND (result_subset->>'usedFallback')::boolean = true
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY reason
ORDER BY occurrences DESC;
```

---

## 📚 Related Documentation

- `docs/evals/INSTRUMENTATION_STATUS_DEC_2025.md` — Full coverage audit
- `docs/evals/PIPELINE_COVERAGE_STATUS.md` — Pipeline coverage before this work
- `docs/evals/PHASE_6A_COMPLETE.md` — HIL instrumentation (Phase 6A)
- `docs/evals/PHASE_6A_DEPLOYMENT.md` — HIL deployment guide
- `supabase/functions/_shared/pipelines/cover-letter.ts` — Phase A pipeline
- `src/services/coverLetterDraftService.ts` — Phase B service

---

## 🎯 Next Steps

### Phase 6C: Quality Gates (~1 day)
- Instrument match intelligence (`matchIntelligenceService.ts`)
- Instrument content standards (`contentStandardsEvaluationService.ts`)
- Instrument CL rating (`coverLetterRatingService.ts`)
- Instrument gap detection batch (`gapDetectionService.ts`)
- **Would increase coverage from 64% → 82-96%**

### Phase 6D: Auxiliary (~0.5 day)
- Instrument tag suggestion (`tagSuggestionService.ts`)
- Verify PM Levels and Job Description services
- **Would achieve ~100% coverage**

---

**End of Phase A/B + 6B Summary**

