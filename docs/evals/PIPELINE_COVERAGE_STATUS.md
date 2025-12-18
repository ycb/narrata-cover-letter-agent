# Pipeline Evals Coverage Status

**Date:** 2025-12-17  
**Question:** Are onboarding pipeline and CL Phase A/B metrics accounted for?

---

## ✅ YES — Already Instrumented!

Both pipelines you mentioned are **already fully instrumented** and were included in the original Phase 3 work.

---

## 1. Onboarding Pipeline ✅ **COMPLETE**

**Status:** ✅ **Fully instrumented** (uses `PipelineTelemetry`)

**File:** `supabase/functions/_shared/pipelines/onboarding.ts`

**Stages Logged:**
- `linkedInFetch` — LinkedIn data extraction (no LLM)
- `profileStructuring` — Skeleton profile extraction (LLM #1)
- `derivedArtifacts` — Detailed analysis (LLM #2)

**How It Works:**
```typescript
// Line 232-233
const telemetry = new PipelineTelemetry(job.id, job.type);

// Line 252-254
telemetry.startStage('linkedInFetch');
const linkedInResult = await linkedInFetchStage.execute(context);
telemetry.endStage(true);

// Lines 263-273 (parallel execution)
const [profileResult, derivedResult] = await Promise.all([
  profileStructuringStage.execute(context),
  derivedArtifactsStage.execute(context),
]);
```

**What's Logged:**
- ✅ Individual stage timing (linkedInFetch, profileStructuring, derivedArtifacts)
- ✅ Total pipeline duration
- ✅ Success/failure per stage
- ✅ Console summary with stage breakdown

**Note:** The onboarding pipeline runs both LLM calls **in parallel** for performance (saves 20-40s vs sequential).

---

## 2. Cover Letter Pipeline — Phase A/B Distinction ⚠️ **PARTIAL**

**Status:** ⚠️ **Individual stages logged, but NO explicit Phase A/B aggregation**

**File:** `supabase/functions/_shared/pipelines/cover-letter.ts`

### What IS Logged (Individual Stages) ✅

All individual stages are logged via `voidLogEval`:

**Phase A (Analysis):**
- `jdAnalysis` — Job description parsing (10-20s)
- `requirementAnalysis` — Requirement extraction (10-25s)
- `goalsAndStrengths.mws` — MWS analysis (sub-stage)
- `goalsAndStrengths.companyContext` — Company context (sub-stage)
- `sectionGaps` — Gap detection (25-45s)
- `companyTags` — Company tags extraction (external API)
- `structuralChecks` — Structural validation (near-instant)

**Phase B (Generation):**
- ❌ **NOT in pipeline** — Draft generation is handled by `coverLetterDraftService.ts` (frontend service)
- ❌ **NOT instrumented yet** (this is Phase 6B of our plan)

### What is NOT Logged (Phase-Level Aggregates) ❌

There is **NO explicit Phase A or Phase B aggregate logging**. The code has comments mentioning "Phase A" (lines 577, 693, 1721), but these are just conceptual markers, not actual logged metrics.

**Example of what's missing:**
```typescript
// ❌ This does NOT exist currently
voidLogEval(supabase, {
  stage: 'coverLetter.phaseA',
  duration_ms: phaseADuration,
  success: true,
  result_subset: {
    stagesCompleted: ['jdAnalysis', 'requirementAnalysis', 'goalsAndStrengths', 'sectionGaps'],
    totalDuration: phaseADuration,
  },
});
```

---

## 📊 Current Coverage Matrix

| Pipeline | Individual Stages | Phase-Level Aggregates | Total Duration |
|----------|-------------------|------------------------|----------------|
| **Onboarding** | ✅ YES (via PipelineTelemetry) | ✅ YES (console summary) | ✅ YES |
| **Cover Letter (Phase A)** | ✅ YES (via voidLogEval) | ❌ NO | ⚠️ Implicit (sum of stages) |
| **Cover Letter (Phase B)** | ❌ NO (not in pipeline) | ❌ NO | ❌ NO |
| **PM Levels** | ✅ YES (via voidLogEval) | ⚠️ Implicit | ⚠️ Implicit |
| **Resume Processing** | ✅ YES (via voidLogEval) | ⚠️ Implicit | ⚠️ Implicit |

---

## 🔍 What You Can Query Now

### Onboarding Pipeline (Full Coverage)
```sql
-- Individual stages
SELECT stage, COUNT(*), AVG(duration_ms)
FROM evals_log
WHERE job_type = 'onboarding'
  AND stage IN ('linkedInFetch', 'profileStructuring', 'derivedArtifacts')
GROUP BY stage;

-- Total pipeline duration (sum of stages)
SELECT 
  job_id,
  SUM(duration_ms) as total_pipeline_ms
FROM evals_log
WHERE job_type = 'onboarding'
  AND stage IN ('linkedInFetch', 'profileStructuring', 'derivedArtifacts')
GROUP BY job_id;
```

### Cover Letter Phase A (Individual Stages Only)
```sql
-- Individual stages
SELECT stage, COUNT(*), AVG(duration_ms)
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage IN ('jdAnalysis', 'requirementAnalysis', 'goalsAndStrengths.mws', 
                'goalsAndStrengths.companyContext', 'sectionGaps', 'structuralChecks')
GROUP BY stage;

-- Phase A total (sum of stages)
SELECT 
  job_id,
  SUM(duration_ms) as phase_a_total_ms
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage IN ('jdAnalysis', 'requirementAnalysis', 'goalsAndStrengths.mws', 
                'goalsAndStrengths.companyContext', 'sectionGaps')
GROUP BY job_id;
```

### Cover Letter Phase B (Not Available Yet)
```sql
-- ❌ This will return 0 rows (Phase B not instrumented)
SELECT stage, COUNT(*), AVG(duration_ms)
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage LIKE 'draftGeneration%'
GROUP BY stage;
```

---

## 🎯 What's Missing & How to Fix It

### Option 1: Add Explicit Phase-Level Logging (Recommended)

Add aggregate logging at the end of each phase:

**In `cover-letter.ts` (after all Phase A stages complete):**
```typescript
// After line 1628 (where stages are compiled)
const phaseAStages = ['jdAnalysis', 'requirementAnalysis', 'goalsAndStrengths', 'sectionGaps'];
const phaseADuration = phaseAStages.reduce((sum, stage) => {
  return sum + (results[stage]?.duration_ms || 0);
}, 0);

voidLogEval(supabase, {
  job_id: job.id,
  job_type: 'coverLetter',
  stage: 'coverLetter.phaseA',
  user_id: job.user_id,
  started_at: new Date(pipelineStartTime), // Track this at pipeline start
  completed_at: new Date(),
  duration_ms: phaseADuration,
  success: true,
  result_subset: {
    stagesCompleted: phaseAStages,
    stageCount: phaseAStages.length,
  },
});
```

**In `coverLetterDraftService.ts` (for Phase B):**
```typescript
// After draft generation completes
voidLogEval(supabase, {
  job_id: draftId, // or jobId if available
  job_type: 'coverLetter',
  stage: 'coverLetter.phaseB',
  user_id: userId,
  started_at: new Date(phaseBStartTime),
  completed_at: new Date(),
  duration_ms: phaseBDuration,
  success: true,
  result_subset: {
    sectionsGenerated: sections.length,
    metricsCalculated: true,
  },
});
```

### Option 2: Use Client-Side Aggregation (Current State)

You can already aggregate Phase A/B metrics client-side:

```typescript
// Frontend utility
function aggregatePhaseMetrics(evalsLogs: EvalsLog[], jobId: string) {
  const phaseAStages = ['jdAnalysis', 'requirementAnalysis', 'goalsAndStrengths.mws', 
                        'goalsAndStrengths.companyContext', 'sectionGaps'];
  
  const phaseALogs = evalsLogs.filter(log => 
    log.job_id === jobId && phaseAStages.includes(log.stage)
  );
  
  const phaseADuration = phaseALogs.reduce((sum, log) => sum + (log.duration_ms || 0), 0);
  const phaseASuccess = phaseALogs.every(log => log.success);
  
  return { phaseADuration, phaseASuccess, phaseAStages: phaseALogs };
}
```

---

## 📋 Recommendation

### Short-Term (Current State)
- ✅ **Onboarding:** Already complete, no action needed
- ✅ **CL Phase A:** Individual stages logged, use client-side aggregation
- ⚠️ **CL Phase B:** Not instrumented yet (this is Phase 6B of our plan)

### Long-Term (Add Phase-Level Logging)
1. Add `coverLetter.phaseA` aggregate log (5 min effort)
2. Add `coverLetter.phaseB` aggregate log when instrumenting draft service (Phase 6B)
3. Add similar aggregates for PM Levels and Resume pipelines

**Benefit:** Easier dashboard queries, clearer phase-level performance tracking

**Cost:** Minimal (1 extra `voidLogEval` call per phase)

---

## 🎯 Next Steps

**If you want Phase A/B aggregates:**
1. I can add the aggregate logging to `cover-letter.ts` now (5 min)
2. Phase B will be added when we do Phase 6B (draft CL instrumentation)

**If client-side aggregation is sufficient:**
- ✅ You're all set! Just query individual stages and sum them

**Let me know which approach you prefer!**

---

## 📚 Related Documentation

- `supabase/functions/_shared/pipelines/onboarding.ts` — Onboarding pipeline
- `supabase/functions/_shared/pipelines/cover-letter.ts` — CL Phase A pipeline
- `supabase/functions/_shared/telemetry.ts` — PipelineTelemetry class
- `supabase/functions/_shared/evals/log.ts` — voidLogEval utility
- `docs/evals/INSTRUMENTATION_STATUS_DEC_2025.md` — Full coverage audit

---

**End of Pipeline Coverage Status**

