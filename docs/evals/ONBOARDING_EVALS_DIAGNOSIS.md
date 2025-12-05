# Onboarding Evals Data — Diagnosis & Expected Behavior

**Date**: 2025-12-05  
**Context**: User completed onboarding, checking what should appear in dashboards

---

## ✅ What You Should See

### `/evaluation-dashboard` (File Upload Quality)
**Expected After Onboarding:**
- ✅ Resume entry (from resume upload)
- ✅ Cover Letter entry (from cover letter upload)
- ❌ LinkedIn entry (only if LinkedIn OAuth was used)

**Why:**
- This dashboard tracks **file upload parsing** (resume, cover letter, LinkedIn)
- Logs to `evaluation_runs` table
- Shows parse quality, structured data extraction

**Current Status**: ✅ **CORRECT** — Resume + Cover Letter present

---

### `/evals` (Pipeline Performance & LLM Tracking)
**Expected After Onboarding:**
- ❌ **NOTHING** — Onboarding pipeline is **NOT instrumented** (by design)

**Why:**
- Onboarding pipeline (`onboarding.ts`) has NO `voidLogEval` calls
- Only **Cover Letter** and **PM Levels** pipelines are instrumented in Phase 1
- Onboarding was excluded from Phase 1 scope (see `EVALS_V1_1_IMPLEMENTATION_SPEC.md`)

**Current Status**: ✅ **CORRECT** — Empty is expected

---

## 🔍 What's Missing (Not Onboarding Errors)

### 1. PM Levels Not Called ✅ EXPECTED
**Why:**
- PM Levels is a **separate pipeline** triggered by user action
- NOT part of onboarding flow
- User must explicitly request PM Level assessment

**To Test:**
1. Go to PM Levels page
2. Request assessment
3. Check `/evals` for `pmLevels` job entries

---

### 2. My Voice Not Called ✅ EXPECTED (Frontend Issue)
**Why:**
- My Voice extraction happens in **frontend service** (`coverLetterProcessingService.ts`)
- NOT instrumented in Phase 1 (see `docs/backlog/FRONTEND_LLM_TO_EDGE_FUNCTIONS.md`)
- Logs to `user_voice` table, NOT `evals_log`

**Current Flow:**
```
Cover letter upload
  → fileUploadService.ts
    → processCoverLetter() [FRONTEND]
      → extractMyVoice() [LLM, not instrumented]
        → Insert to user_voice table
```

**To Verify My Voice Worked:**
```sql
SELECT * FROM user_voice WHERE user_id = '<your_user_id>' ORDER BY created_at DESC LIMIT 1;
```

**Expected:**
- 1 row with `prompt` field containing writing style analysis
- No entry in `evals_log` (not instrumented)

---

## 🧪 What WOULD Appear in `/evals` (If You Trigger Instrumented Pipelines)

### Cover Letter Generation Pipeline
**Trigger:** Create a cover letter from JD

**Expected in `/evals`:**
1. `jd_analysis` — JD role insights extraction
2. `company_tags` — Company tags extraction
3. `goalsAndStrengths_mws` — Most Wonderful Story LLM call
4. `goalsAndStrengths_company_context` — Company context LLM call
5. `structural_checks` — Final validation

**SQL to Check:**
```sql
SELECT 
  stage,
  prompt_name,
  model,
  total_tokens,
  success,
  created_at
FROM evals_log
WHERE job_type = 'coverLetter'
  AND user_id = '<your_user_id>'
ORDER BY created_at DESC;
```

---

### PM Levels Pipeline
**Trigger:** Request PM Level assessment

**Expected in `/evals`:**
1. `baselineAssessment` — Baseline PM level LLM call
2. `competencyBreakdown` — Competency analysis LLM call
3. `specializationAssessment` — Specialization LLM call
4. `structural_checks` — Final validation

**SQL to Check:**
```sql
SELECT 
  stage,
  prompt_name,
  model,
  total_tokens,
  success,
  created_at
FROM evals_log
WHERE job_type = 'pmLevels'
  AND user_id = '<your_user_id>'
ORDER BY created_at DESC;
```
