# LLM Instrumentation Status — December 2025

**Generated:** 2025-12-16  
**Purpose:** Current state of LLM call instrumentation after onboarding streaming completion and cover letter draft changes.

---

## 📊 Executive Summary

| Category | Active Calls | Instrumented | Coverage | Priority |
|----------|--------------|--------------|----------|----------|
| **✅ Edge Function Pipelines** | 10 | 10 | ✅ **100%** | N/A (done) |
| **❌ Frontend Services** | 15-20 | 0 | ❌ **0%** | 🔴 **HIGH** |
| **TOTAL** | **25-30** | **10** | ⚠️ **~35-40%** | N/A |

**Key Changes Since Last Audit:**
- ✅ **Onboarding streaming pipeline**: Now **COMPLETE** with 2 LLM calls (profileStructuring, derivedArtifacts)
- ✅ **JD Pre-Analysis**: Already **INSTRUMENTED** (preanalyze-jd edge function)
- ✅ **Draft Readiness**: Already **INSTRUMENTED** (evaluate-draft-readiness edge function)
- ⚠️ **Cover Letter Draft Service**: Partially refactored, but **NOT YET INSTRUMENTED**
- ❌ **Frontend HIL Services**: Still **NOT INSTRUMENTED** (contentGenerationService, gapResolutionStreamingService)

---

## ✅ FULLY INSTRUMENTED (Edge Functions)

### 1. **Resume Processing Pipeline** (3 LLM calls)
- **File:** `supabase/functions/process-resume-v2/index.ts`
- **Calls:**
  1. Work history skeleton extraction
  2. Role stories extraction (per role)
  3. Skills & education extraction
- **Stage Names:** `workHistorySkeleton`, `roleStories`, `skillsAndEducation`
- **Status:** ✅ **INSTRUMENTED** (Phase 1)
- **Coverage:** Latency, tokens, errors, success rate

---

### 2. **Cover Letter Generation Pipeline** (4 LLM calls)
- **File:** `supabase/functions/_shared/pipelines/cover-letter.ts`
- **Calls:**
  1. `jdAnalysis` — Job description parsing
  2. `requirementAnalysis` — Requirement extraction
  3. `goalsAndStrengths` — User goals analysis (2 sub-stages: `.mws`, `.companyContext`)
  4. `sectionGaps` — Gap detection
- **Stage Names:** `jdAnalysis`, `requirementAnalysis`, `goalsAndStrengths.mws`, `goalsAndStrengths.companyContext`, `sectionGaps`
- **Status:** ✅ **INSTRUMENTED** (Phase 3)
- **Coverage:** Latency, tokens, structural validation, quality scores

---

### 3. **PM Levels Pipeline** (3 LLM calls)
- **File:** `supabase/functions/_shared/pipelines/pm-levels.ts`
- **Calls:**
  1. `baselineAssessment` — Baseline PM level assessment
  2. `competencyBreakdown` — Competency analysis
  3. `specializationAssessment` — Specialization scoring
- **Stage Names:** `baselineAssessment`, `competencyBreakdown`, `specializationAssessment`
- **Status:** ✅ **INSTRUMENTED** (Phase 3)
- **Coverage:** Latency, tokens, structural validation, quality scores

---

### 4. **Onboarding Streaming Pipeline** (2 LLM calls) — ✅ **NEW**
- **File:** `supabase/functions/_shared/pipelines/onboarding.ts`
- **Calls:**
  1. `profileStructuring` — Extract skeleton profile from resume/CL
  2. `derivedArtifacts` — Detailed analysis (impact scores, story suggestions, confidence)
- **Stage Names:** `profileStructuring`, `derivedArtifacts`
- **Status:** ✅ **INSTRUMENTED** (uses `PipelineTelemetry` from Phase 3)
- **Coverage:** Latency, tokens, success rate
- **Note:** These run in **PARALLEL** for performance (saves 20-40s vs sequential)

---

### 5. **JD Pre-Analysis** (1 LLM call) — ✅ **ALREADY INSTRUMENTED**
- **File:** `supabase/functions/preanalyze-jd/index.ts`
- **Call:** Role insights extraction from job description
- **Stage Name:** `jdAnalysis.preanalyze`
- **Status:** ✅ **INSTRUMENTED** (via `voidLogEval` at line 119-132)
- **Coverage:** Latency, tokens, errors, caching behavior
- **Note:** This is a **performance optimization** that pre-computes JD analysis before cover letter generation

---

### 6. **Draft Readiness Judge** (1 LLM call) — ✅ **ALREADY INSTRUMENTED**
- **File:** `supabase/functions/_shared/readiness.ts` (called by `evaluate-draft-readiness/index.ts`)
- **Call:** Editorial readiness evaluation (4 dimensions: narrative coherence, persuasiveness, role relevance, professional polish)
- **Stage Name:** `draftReadiness`
- **Status:** ✅ **INSTRUMENTED** (via `voidLogEval` in `evaluate-draft-readiness/index.ts`)
- **Coverage:** Latency, tokens, errors, verdict distribution
- **Model:** `gpt-4o-mini`

---

## ❌ NOT INSTRUMENTED (Frontend Services)

### 7. **HIL Gap Resolution — Content Generation** (3 LLM calls) — 🔴 **CRITICAL**
- **File:** `src/services/contentGenerationService.ts`
- **Calls:**
  1. Story generation (`buildStoryGenerationPrompt`) — Generate new stories to fill gaps
  2. Role description enhancement (`buildRoleDescriptionPrompt`) — Enhance role descriptions
  3. Saved section generation (`buildSavedSectionPrompt`) — Generate CL section content
- **UI:** `ContentGenerationModal.tsx`, `ContentGenerationPanel.tsx`
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🔴 **HIGH** (core HIL feature, user-facing, high latency)
- **Model:** `gpt-4o-mini` (1000 tokens max)

---

### 8. **HIL Gap Resolution — Streaming V1** (1 LLM call) — 🔴 **CRITICAL**
- **File:** `src/services/gapResolutionStreamingService.ts`
- **Call:** Real-time streaming gap resolution
- **UI:** `ContentGenerationModal.tsx` (streaming mode)
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🔴 **HIGH** (core HIL feature, streaming UX)
- **Model:** `gpt-4` (800 tokens max)

---

### 9. **HIL Gap Resolution — Streaming V2** (2 LLM calls) — 🔴 **CRITICAL**
- **File:** `src/services/gapResolutionStreamingServiceV2.ts`
- **Calls:**
  1. `streamGapResolutionV2` — Enhanced streaming with context
  2. `streamRefineWithInputs` — Refinement after user input
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🔴 **HIGH** (newer version, may be primary)
- **Model:** `gpt-4` (900 tokens max)

---

### 10. **HIL Review Notes Streaming** (1 LLM call) — 🟡 **MEDIUM**
- **File:** `src/services/hilReviewNotesStreamingService.ts`
- **Call:** Stream review notes for HIL content
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🟡 **MEDIUM** (auxiliary HIL feature)

---

### 11. **Draft CL Generation — Metrics** (1 LLM call) — 🔴 **HIGH**
- **File:** `src/services/coverLetterDraftService.ts`
- **Call:** Enhanced metrics analysis (`ENHANCED_METRICS_SYSTEM_PROMPT`, `buildEnhancedMetricsUserPrompt`)
- **Location:** Lines 1545-1678 (with retry logic)
- **UI:** `CoverLetterModal.tsx` (generate draft button)
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🔴 **HIGH** (core product feature, metrics calculation)
- **Model:** `gpt-4` (dynamic token calculation)
- **Note:** Has sophisticated retry logic with exponential backoff

---

### 12. **Match Intelligence** (1 LLM call) — 🟡 **MEDIUM**
- **File:** `src/services/matchIntelligenceService.ts`
- **Call:** Job/candidate match analysis (`buildMatchIntelligencePrompt`)
- **UI:** `CoverLetterDraftView.tsx`, `MatchMetricsToolbar.tsx`
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🟡 **MEDIUM** (match scoring feature)

---

### 13. **Content Standards Evaluation** (2-5 LLM calls) — 🟡 **MEDIUM**
- **File:** `src/services/contentStandardsEvaluationService.ts`
- **Calls:**
  - Letter-level standards evaluation
  - Section-level standards evaluation (multiple)
- **UI:** `CoverLetterDraftView.tsx`, `CoverLetterDraftEditor.tsx`
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🟡 **MEDIUM** (quality scoring)

---

### 14. **CL Ready Evaluation (Judge)** (1 LLM call) — 🟡 **MEDIUM**
- **File:** `src/services/coverLetterRatingService.ts`
- **Call:** Quality rating against rubric (`buildCoverLetterRatingPrompt`)
- **Location:** Line 54
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🟡 **MEDIUM** (quality gate)
- **Model:** `gpt-4o-mini` (1500 tokens max)

---

### 15. **Gap Detection — Generic Content Batch** (1 LLM call) — 🟡 **MEDIUM**
- **File:** `src/services/gapDetectionService.ts`
- **Call:** Batch generic content detection
- **Location:** Lines 1397-1410
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🟡 **MEDIUM** (content quality analysis)
- **Model:** `gpt-4o-mini` (dynamic tokens based on batch size)

---

### 16. **Tag Suggestion** (1 LLM call) — 🟢 **LOW**
- **File:** `src/services/tagSuggestionService.ts`
- **Call:** Company/industry tag extraction
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** 🟢 **LOW** (auxiliary tagging feature)

---

### 17. **PM Levels Service (Frontend)** (1 LLM call) — ⚠️ **UNCERTAIN**
- **File:** `src/services/pmLevelsService.ts`
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** ⚠️ **VERIFY** if this is separate from edge function PM Levels pipeline

---

### 18. **Job Description Service** (calls) — ⚠️ **UNCERTAIN**
- **File:** `src/services/jobDescriptionService.ts`
- **Status:** ❌ **NOT INSTRUMENTED**
- **Priority:** ⚠️ **VERIFY** if this duplicates `preanalyze-jd` edge function

---

## 🚫 DEPRECATED / UNUSED (No Action Needed)

The following services exist but are **NOT actively used** in production:

- ❌ `experienceMatchService.ts` — No instantiation found
- ❌ `browserSearchService.ts` — No active usage
- ❌ `unifiedProfileService.ts` — May be part of deprecated LinkedIn merge
- ❌ Cover letter parsing via LLM — Now fully programmatic

---

## 🎯 Recommended Instrumentation Phases

### **Phase 6A: Critical HIL Path** (Highest ROI) — ~1-2 days
**Goal:** Instrument all Human-in-the-Loop LLM calls

1. ✅ `contentGenerationService.ts` (3 calls)
   - Story generation
   - Role description enhancement
   - Saved section generation
2. ✅ `gapResolutionStreamingService.ts` (1 call)
3. ✅ `gapResolutionStreamingServiceV2.ts` (2 calls)
4. ✅ `hilReviewNotesStreamingService.ts` (1 call)

**Total:** 7 calls  
**New Coverage:** 10 → 17 calls (~60%)

**Challenge:** These are **frontend services**, not edge functions. Need to:
- Create new edge function wrappers OR
- Add direct `evals_log` inserts from frontend via authenticated RPC OR
- Refactor HIL services to call instrumented edge functions

---

### **Phase 6B: Draft CL Generation** (Complex, High Impact) — ~2-3 days
**Goal:** Instrument draft cover letter generation metrics

1. ✅ `coverLetterDraftService.ts` (metrics call)
   - Enhanced metrics analysis with retry logic

**Total:** 1 call  
**New Coverage:** 17 → 18 calls (~64%)

**Challenge:** Complex service with retry logic, needs careful instrumentation

---

### **Phase 6C: Quality Gates & Judges** (Medium Priority) — ~1 day
**Goal:** Complete coverage of all LLM-as-judge calls

1. ✅ `matchIntelligenceService.ts` (1 call)
2. ✅ `contentStandardsEvaluationService.ts` (2-5 calls)
3. ✅ `coverLetterRatingService.ts` (1 call)
4. ✅ `gapDetectionService.ts` (batch generic content, 1 call)

**Total:** 5-9 calls  
**New Coverage:** 18 → 23-27 calls (~82-96%)

---

### **Phase 6D: Auxiliary** (Nice to Have) — ~0.5 day
**Goal:** 100% LLM call coverage

1. ✅ `tagSuggestionService.ts` (1 call)
2. ✅ Verify `pmLevelsService.ts` (if separate from edge function)
3. ✅ Verify `jobDescriptionService.ts` (if separate from preanalyze-jd)

**Total:** 1-3 calls  
**New Coverage:** 23-27 → 24-30 calls (**~100%**)

---

## 🔧 Implementation Strategy for Frontend Services

### Option 1: Edge Function Wrappers (Recommended)
**Pros:**
- Centralized instrumentation
- Consistent logging format
- Easy to maintain

**Cons:**
- Requires refactoring frontend to call edge functions
- May break existing streaming UX

**Approach:**
1. Create new edge functions (e.g., `hil-content-generation`, `hil-stream-gap-resolution`)
2. Move LLM logic from frontend services to edge functions
3. Add `voidLogEval` calls in edge functions
4. Update frontend to call edge functions instead of direct OpenAI

---

### Option 2: Frontend RPC to `evals_log` (Quick Win)
**Pros:**
- Minimal refactoring
- Preserves existing UX
- Fast to implement

**Cons:**
- Requires RLS policy for `evals_log` inserts
- Less centralized (instrumentation scattered)
- Frontend has access to log writes (potential abuse)

**Approach:**
1. Create RLS policy: `authenticated users can insert own evals_log rows`
2. Add `logEval` helper to frontend service base class
3. Wrap existing LLM calls with timing + logging
4. Insert to `evals_log` after LLM call completes

---

### Option 3: Hybrid (Best of Both)
**Approach:**
1. **Short-term:** Option 2 (RPC) for quick wins (HIL, draft metrics)
2. **Long-term:** Option 1 (edge functions) for new features and refactors

---

## 📋 Verification Checklist

Before marking a service as "instrumented", verify:

- [ ] `voidLogEval` or `logEval` called with correct stage name
- [ ] `started_at` and `completed_at` timestamps captured
- [ ] `duration_ms` calculated correctly
- [ ] `success` flag set based on try/catch
- [ ] `error_type` and `error_message` captured on failure
- [ ] `model` name logged (e.g., `gpt-4`, `gpt-4o-mini`)
- [ ] `prompt_tokens` and `completion_tokens` logged (if available)
- [ ] `job_id` linked (if part of a pipeline)
- [ ] `user_id` captured
- [ ] Stage name follows naming convention (camelCase, dot notation for sub-stages)

---

## 🔍 Query to Verify Instrumentation

```sql
-- Check which stages are actively logging
SELECT 
  stage,
  COUNT(*) as runs,
  ROUND(AVG(duration_ms)) as avg_ms,
  ROUND(AVG(COALESCE(prompt_tokens, 0))) as avg_prompt_tokens,
  ROUND(AVG(COALESCE(completion_tokens, 0))) as avg_completion_tokens,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE NOT success) as failed
FROM evals_log
WHERE created_at > NOW() - INTERVAL '7 days'
  AND stage NOT IN ('sse.streamJob', 'async.streamJobProcess')
GROUP BY stage
ORDER BY runs DESC;
```

**Expected output (current state):**
```
stage                              | runs | avg_ms | avg_prompt_tokens | avg_completion_tokens | successful | failed
-----------------------------------|------|--------|-------------------|-----------------------|------------|-------
jdAnalysis                         | 150  |  8500  |        2500       |          1200         |    148     |    2
requirementAnalysis                |  75  | 12000  |        3000       |          1500         |     74     |    1
goalsAndStrengths.mws              |  75  | 10000  |        2800       |          1000         |     75     |    0
goalsAndStrengths.companyContext   |  75  |  8000  |        2000       |           800         |     75     |    0
sectionGaps                        |  75  | 15000  |        3500       |          2000         |     73     |    2
baselineAssessment                 |  45  | 18000  |        4000       |          1800         |     44     |    1
competencyBreakdown                |  45  | 20000  |        4500       |          2200         |     45     |    0
specializationAssessment           |  45  | 16000  |        3800       |          1600         |     45     |    0
profileStructuring                 |  20  | 10000  |        2500       |          1000         |     20     |    0
derivedArtifacts                   |  20  | 15000  |        3000       |          1500         |     19     |    1
jdAnalysis.preanalyze              |  80  |  7000  |        2200       |          1100         |     78     |    2
draftReadiness                     |  30  | 12000  |        2800       |          1200         |     28     |    2
```

**After Phase 6A (HIL instrumentation):**
```
+ contentGeneration.story          |  50  | 12000  |        2500       |          1000         |     48     |    2
+ contentGeneration.roleDesc       |  30  |  8000  |        2000       |           800         |     30     |    0
+ contentGeneration.savedSection   |  40  | 10000  |        2200       |          1100         |     38     |    2
+ hilStream.gapResolution          |  60  | 15000  |        3000       |          1200         |     58     |    2
+ hilStreamV2.gapResolution        |  70  | 14000  |        2900       |          1150         |     68     |    2
+ hilStreamV2.refineWithInputs     |  20  |  9000  |        2100       |           900         |     19     |    1
+ hilReviewNotes.stream            |  25  |  8000  |        1800       |           750         |     24     |    1
```

---

## 📚 Related Documentation

- `docs/evals/STAGE_NAMING_FIX.md` — Stage naming conventions
- `docs/evals/SSE_HEALTH_TRACKING.md` — SSE stream health tracking
- `docs/evals/EVALS_V1_1_IMPLEMENTATION_SPEC.md` — Overall evals architecture
- `docs/evals/VERIFIED_LLM_CALLS.md` — Original audit (now outdated)
- `docs/evals/COMPLETE_LLM_CALL_AUDIT.md` — Detailed audit (now outdated)

---

## 🎯 Next Steps

1. **Review this audit** with team for accuracy
2. **Choose implementation strategy** (Option 1, 2, or 3)
3. **Start with Phase 6A** (HIL instrumentation) — highest user impact
4. **Monitor dashboard** after each phase to verify data quality
5. **Update audit** as new LLM calls are added

---

**End of Instrumentation Status Audit**

