# Phase 1: LLM Call Instrumentation — PR Checklist

**Date:** 2025-12-05  
**Type:** Backend Instrumentation (Edge Functions)  
**Scope:** Add prompt metadata and cost tracking to 4 Edge Function LLM calls  

---

## ✅ Changes Overview

### 1. Core Infrastructure (2 files)

#### `supabase/functions/_shared/evals/types.ts`
- ✅ Extended `LogEvalPayload` interface with 6 new fields:
  - `prompt_name?: string`
  - `prompt_version?: string`
  - `model?: string`
  - `prompt_tokens?: number`
  - `completion_tokens?: number`
  - `total_tokens?: number`

#### `supabase/functions/_shared/evals/log.ts`
- ✅ Updated `logEval()` function to insert new fields into `evals_log` table

---

### 2. Instrumented Edge Functions (3 files)

#### `supabase/functions/preanalyze-jd/index.ts`
- ✅ Added import: `voidLogEval`
- ✅ Instrumented JD analysis LLM call (lines 120-147)
- ✅ Tracks: prompt_name, model, duration, success
- ✅ Stage: `jd_analysis`

#### `supabase/functions/_shared/pipelines/cover-letter.ts`
- ✅ Instrumented Company Tags API call (lines 587-666)
- ✅ Tracks: prompt_name, model, duration, success, result_subset
- ✅ Stage: `company_tags_extraction`
- ✅ Error handling: logs failed API calls

#### `supabase/functions/evaluate-draft-readiness/index.ts`
- ✅ Added import: `voidLogEval`
- ✅ Instrumented Draft Readiness Judge LLM call (lines 266-295)
- ✅ Tracks: prompt_name, model, duration, success, result_subset
- ✅ Stage: `draft_readiness_judge`

---

## 📊 Impact

### Observability Gains
- ✅ Can track 4 new LLM call types in `/evals` dashboard
- ✅ Cost estimation ready (once token counts are added)
- ✅ Latency monitoring for JD analysis, company tags, and draft readiness
- ✅ Success rate tracking

### Dashboard Data
New stages will appear in `/evals`:
1. `jd_analysis` — JD analysis calls
2. `company_tags_extraction` — Company tags API calls
3. `draft_readiness_judge` — Draft readiness evaluations

---

## 🧪 Testing Checklist

### Pre-Deployment
- [ ] Run linter: `deno lint supabase/functions`
- [ ] Check TypeScript: `deno check supabase/functions/**/*.ts`
- [ ] Review schema: Confirm Phase 0 migrations are applied

### Post-Deployment
- [ ] Trigger JD analysis (paste JD in frontend)
- [ ] Trigger company tags (generate cover letter)
- [ ] Trigger draft readiness (evaluate draft)
- [ ] Check `/evals` dashboard for new data
- [ ] Run verification SQL (see PHASE_1_INSTRUMENTATION_SUMMARY.md)

### SQL Verification
```sql
-- Check recent instrumented calls
SELECT 
  stage,
  prompt_name,
  model,
  duration_ms,
  success,
  created_at
FROM evals_log
WHERE stage IN ('jd_analysis', 'company_tags_extraction', 'draft_readiness_judge')
ORDER BY created_at DESC
LIMIT 20;
```

Expected result: At least 1 row per stage after triggering each feature.

---

## 🚀 Deployment Steps

### 1. Apply Phase 0 Migrations (if not already done)
```bash
# Via SQL Editor (recommended if CLI had issues)
# Run migrations:
# - 20251208_add_prompt_and_cost_metadata.sql
# - 20251209_extend_evaluation_runs.sql
```

### 2. Deploy Edge Functions
```bash
# Deploy all affected functions
supabase functions deploy preanalyze-jd
supabase functions deploy stream-job-process  # contains cover-letter pipeline
supabase functions deploy evaluate-draft-readiness
```

### 3. Verify Deployment
```bash
# Check function logs
supabase functions logs preanalyze-jd --tail
supabase functions logs stream-job-process --tail
supabase functions logs evaluate-draft-readiness --tail
```

---

## 📁 Files Changed

1. `supabase/functions/_shared/evals/types.ts` — Added prompt metadata fields
2. `supabase/functions/_shared/evals/log.ts` — Updated insert statement
3. `supabase/functions/preanalyze-jd/index.ts` — Instrumented JD analysis
4. `supabase/functions/_shared/pipelines/cover-letter.ts` — Instrumented company tags
5. `supabase/functions/evaluate-draft-readiness/index.ts` — Instrumented draft readiness

**Total:** 5 files modified  
**Lines Added:** ~80 lines  
**Lines Removed:** ~5 lines  
**Net Change:** +75 lines

---

## ⚠️ Known Limitations

### 1. Token Counts Not Tracked Yet
- ✅ Schema fields exist (`prompt_tokens`, `completion_tokens`, `total_tokens`)
- ❌ Not populated yet (requires `streamJsonFromLLM()` to return usage data)
- 📋 **Next PR:** Update pipeline-utils to expose token usage from OpenAI responses

### 2. Remaining LLM Calls Not Instrumented
- ✅ 4 of 13 calls instrumented (~31%)
- ⏸️ 9 calls pending (HIL, Draft CL, Draft Metrics, My Voice)
- 📋 **Next PR:** Instrument remaining backend LLM calls

### 3. HIL Calls Frontend-Only
- ⚠️ HIL (Human-in-Loop) calls currently run client-side via `ContentGenerationService`
- 💡 **Decision needed:** Should HIL calls be moved to Edge Functions for instrumentation?

---

## 🔍 Code Review Focus Areas

### 1. Non-Blocking Pattern
Verify `voidLogEval` is used correctly (fire-and-forget):
```typescript
voidLogEval(supabase, {
  job_id,
  stage: 'jd_analysis',
  // ... rest of payload
});
// ✅ No await, no error handling needed
```

### 2. Error Handling
Verify failed calls are logged:
```typescript
try {
  const result = await someLLMCall();
  voidLogEval(supabase, { success: true, ... });
} catch (error) {
  voidLogEval(supabase, { 
    success: false, 
    error_type: 'LLMError',
    error_message: error.message,
  });
}
```

### 3. Prompt Names
Verify prompt names match actual prompt builder functions:
- ✅ `buildJdRolePrompt` → `prompt_name: 'buildJdRolePrompt'`
- ✅ `companyTagsAPI` → `prompt_name: 'companyTagsAPI'`
- ✅ `draftReadinessJudgePrompt` → `prompt_name: 'draftReadinessJudgePrompt'`

---

## 📈 Success Criteria

### Functional
- [ ] New stages appear in `/evals` dashboard
- [ ] Latency data shows reasonable values (JD: 5-15s, Company Tags: 1-5s, Judge: 3-8s)
- [ ] Success rate > 95% for each stage
- [ ] No pipeline failures from eval logging

### Non-Functional
- [ ] Eval logging overhead < 5ms per call
- [ ] No increase in Edge Function cold start time
- [ ] No errors in function logs related to eval logging

---

## 🔗 Related PRs

### Prerequisite
- **Phase 0:** Schema Extensions (migrations applied manually)

### Follow-Up
- **Phase 1b:** Token count tracking
- **Phase 1c:** Remaining LLM call instrumentation
- **Phase 2:** Dashboard cost tracking UI

---

## 📝 Commit History

```
evals: extend LogEvalPayload with prompt metadata
evals: update logEval to insert prompt fields
evals: instrument JD analysis (preanalyze-jd)
evals: instrument company tags (cover-letter)
evals: instrument draft readiness judge
docs: add Phase 1 instrumentation summary
```

---

## 👥 Reviewers

### Required
- [ ] Backend Lead (schema/Edge Functions)
- [ ] QA Lead (testing plan)

### Optional
- [ ] Frontend Lead (dashboard impact awareness)
- [ ] DevOps (deployment verification)

---

**End of PR Checklist**

