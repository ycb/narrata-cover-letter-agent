# Phase 6C: Quality Gates Complete ✅

**Date:** 2025-12-17  
**Scope:** Instrumented all LLM-as-judge quality gate services

---

## ✅ What Was Delivered

### 1. **Match Intelligence Service** ✅

**File:** `src/services/matchIntelligenceService.ts`

**Stage Name:** `qualityGate.matchIntelligence`

**What It Does:**
- Consolidated service performing ALL match analysis in a single LLM call
- Evaluates: goals match, requirements match, experience match, differentiator analysis, gap identification

**What's Logged:**
```typescript
{
  userId: string,
  stage: 'qualityGate.matchIntelligence',
  model: 'gpt-4o-mini',
  started_at: Date,
  completed_at: Date,
  duration_ms: number,
  success: boolean,
  prompt_tokens: number,
  completion_tokens: number,
  total_tokens: number,
  result_subset: {
    goalsMatchScore: number,
    coreReqsMatched: number,
    preferredReqsMatched: number,
    gapFlagsCount: number,
  }
}
```

**Usage Note:** Requires `userId` parameter to be passed to `analyzeMatchIntelligence()` for logging.

---

### 2. **Content Standards Evaluation Service** ✅

**File:** `src/services/contentStandardsEvaluationService.ts`

**Stage Names:**
- `qualityGate.contentStandards.section` — Per-section evaluation
- `qualityGate.contentStandards.letter` — Whole-letter evaluation

**What It Does:**
- LLM-based evaluation of cover letter sections and entire letters against content quality standards
- Assesses standards and returns structured results

**What's Logged (Section):**
```typescript
{
  userId: string,
  stage: 'qualityGate.contentStandards.section',
  model: 'gpt-4o-mini',
  started_at: Date,
  completed_at: Date,
  duration_ms: number,
  success: boolean,
  result_subset: {
    sectionType: 'intro' | 'body' | 'closing',
    standardsEvaluated: number,
    metCount: number,
  }
}
```

**What's Logged (Letter):**
```typescript
{
  userId: string,
  stage: 'qualityGate.contentStandards.letter',
  model: 'gpt-4o-mini',
  started_at: Date,
  completed_at: Date,
  duration_ms: number,
  success: boolean,
  result_subset: {
    standardsEvaluated: number,
    metCount: number,
    wordCount: number,
    paragraphCount: number,
  }
}
```

**Usage Note:** Requires `userId` parameter to be passed to `evaluateSection()` and `evaluateLetter()` for logging.

---

### 3. **Cover Letter Rating Service** ✅

**File:** `src/services/coverLetterRatingService.ts`

**Stage Name:** `qualityGate.clRating`

**What It Does:**
- Evaluates cover letter drafts against quality criteria
- Returns structured rating with met/unmet criteria and overall rating

**What's Logged:**
```typescript
{
  userId: string,
  stage: 'qualityGate.clRating',
  model: 'gpt-4o-mini',
  started_at: Date,
  completed_at: Date,
  duration_ms: number,
  success: boolean,
  prompt_tokens: number,
  completion_tokens: number,
  total_tokens: number,
  result_subset: {
    overallRating: 'strong' | 'average' | 'weak',
    metCount: number,
    totalCount: number,
  }
}
```

**Usage Note:** Requires `userId` parameter to be passed to `evaluateCoverLetter()` for logging.

---

### 4. **Gap Detection Service (Batch)** ✅

**File:** `src/services/gapDetectionService.ts`

**Stage Name:** `qualityGate.gapDetection.batch`

**What It Does:**
- Batch evaluation of multiple stories/descriptions for generic content
- LLM-as-judge determines if content is too generic or lacks specific details

**What's Logged:**
```typescript
{
  userId: string,
  stage: 'qualityGate.gapDetection.batch',
  model: 'gpt-4o-mini',
  started_at: Date,
  completed_at: Date,
  duration_ms: number,
  success: boolean,
  prompt_tokens: number,
  completion_tokens: number,
  total_tokens: number,
  result_subset: {
    itemsEvaluated: number,
    genericCount: number,
    specificCount: number,
  }
}
```

**Usage Note:** Requires `userId` in `options` parameter to `checkGenericContentBatch()` for logging.

---

## 📊 Coverage Impact

### Before Phase 6C
- **Total LLM Calls:** 18 of 25-30 (~64%)

### After Phase 6C
- **Total LLM Calls:** 22-23 of 25-30 (~82-88%)
- **Gain:** +4-5 LLM calls (all quality gates)

### Breakdown
- **Onboarding:** ✅ Fully instrumented
- **CL Phase A:** ✅ Individual stages + aggregate
- **CL Phase B:** ✅ Metrics calculation
- **HIL Services:** ✅ Content generation, gap resolution, review notes
- **Quality Gates:** ✅ Match intelligence, content standards, CL rating, gap detection

---

## 🎯 What You Can Now Track

### 1. **Match Intelligence Performance**
```sql
-- Average match intelligence performance
SELECT 
  COUNT(*) as runs,
  ROUND(AVG(duration_ms)) as avg_ms,
  ROUND(AVG((result_subset->>'goalsMatchScore')::numeric), 2) as avg_goals_score,
  ROUND(AVG((result_subset->>'gapFlagsCount')::int)) as avg_gaps
FROM evals_log
WHERE stage = 'qualityGate.matchIntelligence'
  AND created_at > NOW() - INTERVAL '7 days';
```

### 2. **Content Standards Pass Rate**
```sql
-- Section standards pass rate
SELECT 
  result_subset->>'sectionType' as section_type,
  COUNT(*) as evaluations,
  ROUND(AVG((result_subset->>'metCount')::int::float / 
            NULLIF((result_subset->>'standardsEvaluated')::int, 0) * 100), 1) as pass_rate_pct
FROM evals_log
WHERE stage = 'qualityGate.contentStandards.section'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY section_type;
```

### 3. **CL Rating Distribution**
```sql
-- Overall rating distribution
SELECT 
  result_subset->>'overallRating' as rating,
  COUNT(*) as count,
  ROUND(AVG((result_subset->>'metCount')::int::float / 
            NULLIF((result_subset->>'totalCount')::int, 0) * 100), 1) as avg_criteria_met_pct
FROM evals_log
WHERE stage = 'qualityGate.clRating'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY rating
ORDER BY rating DESC;
```

### 4. **Generic Content Detection**
```sql
-- Generic content detection stats
SELECT 
  COUNT(*) as batch_runs,
  SUM((result_subset->>'itemsEvaluated')::int) as total_items,
  SUM((result_subset->>'genericCount')::int) as generic_items,
  ROUND(AVG((result_subset->>'genericCount')::int::float / 
            NULLIF((result_subset->>'itemsEvaluated')::int, 0) * 100), 1) as generic_rate_pct
FROM evals_log
WHERE stage = 'qualityGate.gapDetection.batch'
  AND created_at > NOW() - INTERVAL '7 days';
```

---

## 🚀 Deployment Steps

### Step 1: Deploy Frontend
```bash
cd /Users/admin/narrata
npm run build
# Deploy to your hosting provider
```

### Step 2: Update Calling Code (Optional)

**Note:** All instrumented services now accept an optional `userId` parameter. If you want logging to work, you need to pass `userId` when calling these services.

**Example updates:**

```typescript
// Before
const result = await matchIntelligenceService.analyzeMatchIntelligence(
  jobContext, userGoals, workItems, approvedContent, sections, goNoGoAnalysis
);

// After (with logging)
const result = await matchIntelligenceService.analyzeMatchIntelligence(
  jobContext, userGoals, workItems, approvedContent, sections, goNoGoAnalysis,
  userId // <-- Add userId parameter
);
```

```typescript
// Before
const sectionResult = await contentStandardsService.evaluateSection(
  sectionId, sectionContent, sectionType, jobDescription
);

// After (with logging)
const sectionResult = await contentStandardsService.evaluateSection(
  sectionId, sectionContent, sectionType, jobDescription,
  userId // <-- Add userId parameter
);
```

```typescript
// Before
const rating = await coverLetterRatingService.evaluateCoverLetter(
  draft, jobDescription, userVoicePrompt, pmLevel
);

// After (with logging)
const rating = await coverLetterRatingService.evaluateCoverLetter(
  draft, jobDescription, userVoicePrompt, pmLevel,
  userId // <-- Add userId parameter
);
```

```typescript
// Before
const gaps = await GapDetectionService.checkGenericContentBatch(items, { useLLM: true });

// After (with logging)
const gaps = await GapDetectionService.checkGenericContentBatch(
  items, 
  { useLLM: true, userId } // <-- Add userId to options
);
```

### Step 3: Verify Logging
```sql
-- Check quality gate logs (should appear after next quality check)
SELECT stage, COUNT(*) 
FROM evals_log 
WHERE stage LIKE 'qualityGate.%'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY stage;
```

**Expected output:**
```
stage                                  | count
---------------------------------------|-------
qualityGate.matchIntelligence          |   5
qualityGate.contentStandards.section   |  15
qualityGate.contentStandards.letter    |   5
qualityGate.clRating                   |   5
qualityGate.gapDetection.batch         |   2
```

---

## 🔍 Troubleshooting

### Issue: No quality gate logs appearing

**Possible causes:**
1. Frontend not deployed
2. `userId` not passed to instrumented methods
3. Quality gates not being invoked

**Debug:**
```typescript
// Check browser console for errors
console.log('[Phase 6C] userId:', userId);
```

```sql
-- Check if any quality gate calls are happening
SELECT COUNT(*) FROM evals_log WHERE stage LIKE 'qualityGate.%';
```

### Issue: High failure rate for quality gates

**Possible causes:**
1. LLM API rate limits
2. Invalid prompts
3. Network issues

**Debug:**
```sql
-- Check failure reasons
SELECT 
  stage,
  error_type,
  error_message,
  COUNT(*) as occurrences
FROM evals_log
WHERE stage LIKE 'qualityGate.%'
  AND success = false
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY stage, error_type, error_message
ORDER BY occurrences DESC;
```

### Issue: Missing userId in logs

**Possible causes:**
1. Calling code not updated to pass `userId`
2. `userId` not available in context

**Fix:**
- Update calling code to pass `userId` parameter
- Ensure `userId` is available in the component/service context

---

## 📚 Related Documentation

- `docs/evals/INSTRUMENTATION_STATUS_DEC_2025.md` — Full coverage audit
- `docs/evals/PHASE_AB_AND_6B_COMPLETE.md` — Phase A/B + 6B summary
- `docs/evals/PHASE_6A_COMPLETE.md` — HIL instrumentation
- `src/services/evalsLogger.ts` — Frontend logging utility
- `src/services/matchIntelligenceService.ts` — Match intelligence
- `src/services/contentStandardsEvaluationService.ts` — Content standards
- `src/services/coverLetterRatingService.ts` — CL rating
- `src/services/gapDetectionService.ts` — Gap detection

---

## 🎯 Next Steps

### Phase 6D: Auxiliary (~0.5 day)
- Instrument tag suggestion (`tagSuggestionService.ts`)
- Verify PM Levels and Job Description services
- **Would achieve ~100% coverage**

### Alternative: Dashboard Enhancements
- Add quality gate metrics to `/admin/evals`
- Create quality gate performance dashboard
- Add quality gate failure alerts

---

**End of Phase 6C Summary**

