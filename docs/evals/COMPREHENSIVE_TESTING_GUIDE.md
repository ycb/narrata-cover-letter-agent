# Comprehensive Testing Guide — Evals V1.1 + V1.2

**Date:** 2025-12-05  
**Phases Covered:** 0, 1a, 1b  
**Status:** Ready for Testing (After Onboarding Pipeline is Running)  

---

## 📋 Overview

This guide covers testing for all implemented evals phases:
- ✅ **Phase 0:** Schema Extensions (Cost Tracking)
- ✅ **Phase 1a:** LLM Call Instrumentation (4 calls)
- ✅ **Phase 1b:** Token Count Tracking (7 calls total)

**Total Features to Test:** 10 instrumented LLM calls + 2 cost calculation functions

---

## 🎯 Prerequisites

### 1. Deployments Complete
```bash
# Verify these functions are deployed
supabase functions list

# Expected deployed functions:
# - preanalyze-jd
# - stream-job-process
# - evaluate-draft-readiness
```

### 2. Database Migrations Applied
```sql
-- Verify schema extensions
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'evals_log' 
  AND column_name IN ('prompt_name', 'prompt_version', 'model', 'prompt_tokens', 'completion_tokens', 'total_tokens');
-- Expected: 6 rows

-- Verify cost functions exist
SELECT proname FROM pg_proc WHERE proname IN ('get_evals_cost_by_job_type', 'get_evals_cost_by_prompt');
-- Expected: 2 rows
```

### 3. Onboarding Pipeline Running
- ⚠️ **CRITICAL:** Onboarding pipeline must be functional before testing
- Without onboarding, you can't create jobs to test against

---

## 🧪 Test Suite

### **Test 1: JD Analysis** (`preanalyze-jd`)

#### Trigger
1. Navigate to app
2. Paste a job description
3. Wait for JD preanalysis to complete (~10-15s)

#### Expected Behavior
- JD analysis completes successfully
- Role insights appear in UI

#### Verification SQL
```sql
SELECT 
  stage,
  prompt_name,
  model,
  prompt_tokens,
  completion_tokens,
  total_tokens,
  duration_ms,
  success,
  created_at
FROM evals_log
WHERE stage = 'jd_analysis'
ORDER BY created_at DESC
LIMIT 5;
```

#### Success Criteria
- ✅ At least 1 row returned
- ✅ `prompt_name` = 'buildJdRolePrompt'
- ✅ `model` = 'gpt-4o-mini'
- ✅ `prompt_tokens` > 0
- ✅ `completion_tokens` > 0
- ✅ `total_tokens` = prompt_tokens + completion_tokens
- ✅ `success` = true
- ✅ `duration_ms` between 5000-20000 (5-20 seconds)

---

### **Test 2: Cover Letter - JD Analysis** (Part of Pipeline)

#### Trigger
1. Create a cover letter job
2. Job should use cached JD analysis OR run fresh analysis
3. Wait for job to complete

#### Verification SQL
```sql
SELECT 
  j.id as job_id,
  j.status,
  e.stage,
  e.prompt_name,
  e.prompt_tokens,
  e.completion_tokens,
  e.success,
  e.created_at
FROM jobs j
LEFT JOIN evals_log e ON j.id = e.job_id
WHERE j.job_type = 'coverLetter'
  AND e.stage = 'jdAnalysis'
ORDER BY j.created_at DESC
LIMIT 5;
```

#### Success Criteria
- ✅ Row exists for cover letter job
- ✅ `prompt_name` = 'buildJdRolePrompt'
- ✅ Token counts populated
- ✅ `success` = true

---

### **Test 3: Goals & Strengths - MWS**

#### Trigger
1. Same as Test 2 (cover letter generation)
2. MWS is calculated during `goalsAndStrengths` stage

#### Verification SQL
```sql
SELECT 
  stage,
  prompt_name,
  model,
  prompt_tokens,
  completion_tokens,
  success,
  result_subset,
  created_at
FROM evals_log
WHERE stage = 'goalsAndStrengths_mws'
ORDER BY created_at DESC
LIMIT 5;
```

#### Success Criteria
- ✅ Row exists
- ✅ `prompt_name` = 'buildMwsPrompt'
- ✅ `model` = 'gpt-4o-mini'
- ✅ Token counts > 0
- ✅ `result_subset` contains `mwsScore` (0-3)
- ✅ `success` = true

---

### **Test 4: Goals & Strengths - Company Context (JD)**

#### Trigger
1. Same as Test 2 (cover letter generation)
2. Company context extracted from JD

#### Verification SQL
```sql
SELECT 
  stage,
  prompt_name,
  prompt_tokens,
  completion_tokens,
  result_subset,
  success,
  created_at
FROM evals_log
WHERE stage = 'goalsAndStrengths_company_context'
ORDER BY created_at DESC
LIMIT 5;
```

#### Success Criteria
- ✅ Row exists
- ✅ `prompt_name` = 'buildCompanyContextPrompt'
- ✅ Token counts > 0
- ✅ `result_subset` contains `source` and `confidence`
- ✅ `success` = true

---

### **Test 5: Company Tags (External API)**

#### Trigger
1. Cover letter generation with company name
2. If JD company context is insufficient, web fallback triggers

#### Verification SQL
```sql
SELECT 
  stage,
  prompt_name,
  model,
  duration_ms,
  success,
  result_subset,
  created_at
FROM evals_log
WHERE stage = 'company_tags_extraction'
ORDER BY created_at DESC
LIMIT 5;
```

#### Success Criteria
- ✅ Row may or may not exist (depends on whether fallback triggered)
- ✅ `prompt_name` = 'companyTagsAPI'
- ✅ `model` = 'external_api'
- ✅ `prompt_tokens` IS NULL (external API, no tokens)
- ✅ `result_subset` contains `industry`, `maturity`, `source`, `confidence`
- ✅ `duration_ms` < 5000 (should be fast)

---

### **Test 6: Draft Readiness Judge**

#### Trigger
1. Generate a cover letter draft
2. Click "Evaluate Readiness" button
3. Wait for evaluation to complete

#### Verification SQL
```sql
SELECT 
  stage,
  prompt_name,
  model,
  prompt_tokens,
  completion_tokens,
  duration_ms,
  success,
  result_subset,
  created_at
FROM evals_log
WHERE stage = 'draft_readiness_judge'
ORDER BY created_at DESC
LIMIT 5;
```

#### Success Criteria
- ✅ Row exists
- ✅ `prompt_name` = 'draftReadinessJudgePrompt'
- ✅ `model` = 'gpt-4o-mini'
- ✅ Token counts > 0
- ✅ `result_subset` contains `verdict`, `dimensionsPopulated`, `improvementCount`
- ✅ `duration_ms` between 3000-10000 (3-10 seconds)
- ✅ `success` = true

---

### **Test 7: Resume Processing** (V1.1 - Should Already Work)

#### Trigger
1. Upload a resume
2. Wait for processing to complete

#### Verification SQL
```sql
SELECT 
  stage,
  success,
  duration_ms,
  created_at
FROM evals_log
WHERE job_type = 'onboarding'
  AND stage IN ('resume_skeleton', 'resume_stories', 'resume_skills')
ORDER BY created_at DESC
LIMIT 15;
```

#### Success Criteria
- ✅ 3 stages logged per resume (skeleton, stories, skills)
- ✅ All `success` = true
- ✅ Total duration < 60 seconds

**Note:** Resume stages may not have token counts if V1.1 didn't include Phase 1b changes. Check separately.

---

### **Test 8: PM Levels Pipeline** (V1.1 - Should Already Work)

#### Trigger
1. Run PM levels analysis
2. Wait for assessment to complete

#### Verification SQL
```sql
SELECT 
  stage,
  success,
  duration_ms,
  created_at
FROM evals_log
WHERE job_type = 'pmLevels'
  AND stage IN ('baselineAssessment', 'competencyBreakdown', 'specializationAssessment')
ORDER BY created_at DESC
LIMIT 15;
```

#### Success Criteria
- ✅ 3 stages logged per PM levels job
- ✅ All `success` = true
- ✅ Total duration < 45 seconds

**Note:** PM Levels stages may not have token counts if V1.1 didn't include Phase 1b changes. Check separately.

---

### **Test 9: Cost Calculation by Job Type**

#### Trigger
Run after Tests 1-6 have generated data

#### Verification SQL
```sql
SELECT * FROM get_evals_cost_by_job_type(NOW() - INTERVAL '24 hours');
```

#### Expected Result
```
job_type      | total_calls | success_rate | avg_duration_ms | total_prompt_tokens | total_completion_tokens | estimated_cost_usd
--------------+-------------+--------------+-----------------+---------------------+-------------------------+-------------------
coverLetter   | 15          | 100.00       | 12500.00        | 35000               | 18000                   | 0.2675
pmLevels      | 5           | 100.00       | 18000.00        | 22000               | 12000                   | 0.1750
onboarding    | 8           | 100.00       | 35000.00        | 48000               | 25000                   | 0.3700
```

#### Success Criteria
- ✅ At least 1 row per job type tested
- ✅ `total_calls` > 0
- ✅ `success_rate` > 95%
- ✅ `total_prompt_tokens` > 0
- ✅ `total_completion_tokens` > 0
- ✅ `estimated_cost_usd` > 0

---

### **Test 10: Cost Calculation by Prompt**

#### Trigger
Run after Tests 1-6 have generated data

#### Verification SQL
```sql
SELECT * FROM get_evals_cost_by_prompt(NOW() - INTERVAL '24 hours')
ORDER BY estimated_cost_usd DESC
LIMIT 10;
```

#### Expected Result
```
prompt_name                     | model        | total_calls | avg_prompt_tokens | avg_completion_tokens | estimated_cost_usd
--------------------------------+--------------+-------------+-------------------+-----------------------+-------------------
buildJdRolePrompt               | gpt-4o-mini  | 20          | 2500.00           | 1200.00               | 0.2900
buildMwsPrompt                  | gpt-4o-mini  | 15          | 1800.00           | 900.00                | 0.2025
draftReadinessJudgePrompt       | gpt-4o-mini  | 10          | 1600.00           | 800.00                | 0.1200
buildCompanyContextPrompt       | gpt-4o-mini  | 15          | 800.00            | 400.00                | 0.0900
```

#### Success Criteria
- ✅ At least 4 prompts returned
- ✅ All token averages > 0
- ✅ All costs > 0
- ✅ Costs ranked correctly (highest first)

---

## 📊 Dashboard Verification

### **Test 11: /evals Dashboard**

#### Steps
1. Navigate to `/evals` in the app
2. Verify all new stages appear in filters
3. Check latency charts show data
4. Check success rates are displayed
5. Export to CSV and verify data

#### Success Criteria
- ✅ New stages visible in dropdown:
  - `jd_analysis`
  - `goalsAndStrengths_mws`
  - `goalsAndStrengths_company_context`
  - `company_tags_extraction`
  - `draft_readiness_judge`
- ✅ Latency charts show data for each stage
- ✅ Success rate > 95% for all stages
- ✅ CSV export includes new stages

---

### **Test 12: /evaluation-dashboard** (Existing Dashboard)

#### Steps
1. Navigate to `/evaluation-dashboard`
2. Verify existing resume/PM levels data still works
3. Check filters still function
4. Verify no regressions

#### Success Criteria
- ✅ Dashboard loads without errors
- ✅ Existing data displays correctly
- ✅ Filters work as before
- ✅ No console errors

---

## 🐛 Common Issues & Troubleshooting

### Issue 1: No Data in `evals_log`

**Symptoms:**
- SQL queries return 0 rows
- Dashboard shows "No data"

**Diagnosis:**
```sql
-- Check if evals_log table exists
SELECT COUNT(*) FROM evals_log;

-- Check if RLS is blocking access
SELECT current_user, auth.uid();

-- Check function logs
```

**Solutions:**
1. Verify Edge Functions deployed
2. Check RLS policies (should allow system inserts)
3. Check function logs for errors
4. Manually trigger features in UI

---

### Issue 2: Token Counts are NULL

**Symptoms:**
- `prompt_tokens`, `completion_tokens`, `total_tokens` are all NULL

**Diagnosis:**
```sql
SELECT 
  stage,
  prompt_name,
  COUNT(*) as total,
  COUNT(prompt_tokens) as with_tokens
FROM evals_log
GROUP BY stage, prompt_name;
```

**Solutions:**
1. Verify Phase 1b deployed (check `streamJsonFromLLM` signature)
2. Check if old Edge Functions are cached (redeploy)
3. Verify OpenAI API is returning usage data

---

### Issue 3: Cost Functions Return 0

**Symptoms:**
- `get_evals_cost_by_job_type()` returns empty
- `get_evals_cost_by_prompt()` returns empty

**Diagnosis:**
```sql
-- Check raw data exists
SELECT COUNT(*), MIN(created_at), MAX(created_at) 
FROM evals_log 
WHERE prompt_tokens IS NOT NULL;

-- Try function with wider time range
SELECT * FROM get_evals_cost_by_job_type(NOW() - INTERVAL '7 days');
```

**Solutions:**
1. Verify data exists in time range
2. Check token counts are populated (Issue 2)
3. Manually run function SQL to debug

---

### Issue 4: High Failure Rate

**Symptoms:**
- Success rate < 90%
- Many `success = false` rows

**Diagnosis:**
```sql
SELECT 
  stage,
  error_type,
  error_message,
  COUNT(*) as failure_count
FROM evals_log
WHERE success = false
GROUP BY stage, error_type, error_message
ORDER BY failure_count DESC;
```

**Solutions:**
1. Check OpenAI API status
2. Verify API keys are valid
3. Check for timeout issues (increase `maxTokens`)
4. Review error messages for patterns

---

## 📈 Expected Metrics (After 1 Day)

### Call Volume
```
Job Type       | Expected Calls | Stages per Job
---------------|----------------|---------------
coverLetter    | 10-20          | 4-5 stages
pmLevels       | 3-5            | 3 stages
onboarding     | 5-10           | 3 stages (resume)
```

### Latency Benchmarks
```
Stage                              | P50     | P90     | P99
-----------------------------------|---------|---------|--------
jd_analysis                        | 10s     | 15s     | 20s
goalsAndStrengths_mws              | 6s      | 9s      | 12s
goalsAndStrengths_company_context  | 4s      | 6s      | 8s
company_tags_extraction            | 2s      | 4s      | 6s
draft_readiness_judge              | 5s      | 8s      | 10s
```

### Token Usage
```
Prompt                        | Avg Prompt | Avg Completion | Avg Total
------------------------------|------------|----------------|----------
buildJdRolePrompt             | 2500       | 1200           | 3700
buildMwsPrompt                | 1800       | 900            | 2700
draftReadinessJudgePrompt     | 1600       | 800            | 2400
buildCompanyContextPrompt     | 800        | 400            | 1200
```

### Daily Cost Estimate
```
Prompt                        | Calls | Cost/Call | Daily Cost
------------------------------|-------|-----------|------------
buildJdRolePrompt             | 20    | $0.0145   | $0.29
buildMwsPrompt                | 15    | $0.0135   | $0.20
draftReadinessJudgePrompt     | 10    | $0.0120   | $0.12
buildCompanyContextPrompt     | 15    | $0.0060   | $0.09
-----------------------------------|-------|-----------|------------
TOTAL                              |       |           | $0.70/day
                                   |       |           | ~$21/month
```

---

## ✅ Sign-Off Checklist

Before marking testing complete, verify:

### Phase 0: Schema
- [ ] All 6 cost tracking columns exist in `evals_log`
- [ ] All 9 new columns exist in `evaluation_runs`
- [ ] Both cost functions exist and execute
- [ ] Test SQL suite passes

### Phase 1a: Instrumentation
- [ ] JD Analysis logs with prompt metadata
- [ ] Company Tags logs API calls
- [ ] Draft Readiness Judge logs with prompt metadata
- [ ] All 4 new stages appear in `/evals`

### Phase 1b: Token Tracking
- [ ] JD Analysis has token counts
- [ ] Goals MWS has token counts
- [ ] Goals Company Context has token counts
- [ ] Draft Judge has token counts
- [ ] Cost functions return non-zero values

### Dashboard
- [ ] `/evals` shows new stages
- [ ] `/evaluation-dashboard` still works
- [ ] CSV export includes new data
- [ ] No console errors

### Performance
- [ ] Success rate > 95% across all stages
- [ ] Latency within expected ranges
- [ ] No pipeline failures from logging
- [ ] Eval logging overhead < 50ms

---

## 📝 Test Report Template

After completing all tests, fill out this report:

```markdown
# Evals V1.1 + V1.2 Test Report

**Date:** YYYY-MM-DD  
**Tester:** [Your Name]  
**Environment:** [Dev/Staging/Prod]  

## Summary
- Total Tests Run: 12
- Passed: X
- Failed: Y
- Skipped: Z

## Detailed Results

### Test 1: JD Analysis
- Status: [Pass/Fail]
- Notes: [Any observations]

### Test 2: Cover Letter JD Analysis
- Status: [Pass/Fail]
- Notes: [Any observations]

[... continue for all 12 tests ...]

## Issues Found
1. [Issue description] - Severity: [High/Medium/Low]
2. [Issue description] - Severity: [High/Medium/Low]

## Performance Metrics
- Avg Latency: Xs
- Success Rate: X%
- Daily Cost: $X.XX

## Sign-Off
- [ ] All critical tests passed
- [ ] All issues logged
- [ ] Ready for production

**Approved By:** [Name]  
**Date:** YYYY-MM-DD
```

---

**End of Testing Guide**

