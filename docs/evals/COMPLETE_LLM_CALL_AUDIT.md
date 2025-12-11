# Complete LLM Call Audit — All Prompts & Call Sites

**Generated:** 2025-12-04  
**Purpose:** Map ALL LLM calls in the codebase to their prompts, identify instrumentation coverage gaps, and prioritize instrumentation work.

---

## Executive Summary

**Total LLM Call Sites Found (verified active):** ~35-40  
**Currently Instrumented:** 3 pipelines (Resume, Cover Letter generation, PM Levels)  
**Instrumentation Coverage:** ~13 of ~35-40 active calls (**≈35%**)  
**Missing:** JD pre-analysis, HIL gap resolution, draft CL generation, judges/standards, match intelligence, voice/story extraction, and aux tagging

> Notes (2025-12-05):  
> - Cover letter parsing is now fully programmatic (no LLM); the CL parsing call was removed.  
> - Counts above reflect the verified active list in `docs/evals/VERIFIED_LLM_CALLS.md` (supersedes earlier ~85-call estimate).

---

## Methodology

1. **Prompt Folder Scan:** Analyzed all 27 files in `/src/prompts`
2. **Service Layer Grep:** Found `callOpenAI`, `streamText`, and `buildXPrompt` references
3. **Edge Functions Grep:** Found LLM calls in Supabase functions
4. **Cross-Reference:** Matched prompts to actual call sites

**Prompt visibility note (2025-12-05):** Some live prompts sit outside `/src/prompts` (e.g., PM Levels stages in `supabase/functions/_shared/pipelines/pm-levels.ts`). A new `src/prompts/README.md` documents current prompt locations to keep review/edits centralized.

---

## Part 1: Prompt Inventory (By File)

### Core Pipeline Prompts

| Prompt File | Exports | Used In | **Instrumented?** |
|------------|---------|---------|-------------------|
| `resumeAnalysisSplit.ts` | `buildWorkHistorySkeletonPrompt`<br>`buildRoleStoriesPrompt`<br>`buildSkillsAndEducationPrompt` | `openaiService.ts`<br>`process-resume/index.ts` | ✅ **YES** (Resume pipeline) |
| `jobDescriptionAnalysis.ts` | `buildJobDescriptionAnalysisPrompt` | `preanalyze-jd/index.ts`<br>`jobDescriptionService.ts` | ❌ **NO** |
| `coverLetterTemplate.ts` | `buildTemplateCreationPrompt` | `coverLetterDraftService.ts` | ❌ **NO** (Part of Draft CL) |
| `requirementAnalysis.ts` | `buildRequirementAnalysisPrompt` | `cover-letter.ts` pipeline | ✅ **YES** (CL pipeline) |
| `matchIntelligence.ts` | `buildMatchIntelligencePrompt` | `matchIntelligenceService.ts` | ❌ **NO** |
| `sectionGaps.ts` | `buildSectionGapsPrompt` | `cover-letter.ts` pipeline | ✅ **YES** (CL pipeline) |

### Content Generation Prompts (HIL)

| Prompt File | Exports | Used In | **Instrumented?** |
|------------|---------|---------|-------------------|
| `contentGeneration.ts` | `buildStoryGenerationPrompt`<br>`buildRoleDescriptionPrompt`<br>`buildSavedSectionPrompt` | `contentGenerationService.ts`<br>`gapResolutionStreamingService.ts` | ❌ **NO** (Gap Analysis) |

### Evaluation & Quality Prompts

| Prompt File | Exports | Used In | **Instrumented?** |
|------------|---------|---------|-------------------|
| `evaluation.ts` | `buildEvaluationPrompt`<br>`buildEnhancedEvaluationPrompt` | `evaluationService.ts` | ❌ **NO** (Judge) |
| `coverLetterRating.ts` | `buildCoverLetterRatingPrompt` | `coverLetterRatingService.ts` | ❌ **NO** (CL Ready) |
| `templateEvaluation.ts` | `buildTemplateEvaluationPrompt` | `templateService.ts` | ❌ **NO** |
| `atsAnalysis.ts` | `buildATSAnalysisPrompt` | `atsAnalysisService.ts` | ❌ **NO** |
| `contentStandards.ts` (2 files) | Letter & Section standards | `contentStandardsEvaluationService.ts` | ❌ **NO** |

### Auxiliary Prompts

| Prompt File | Exports | Used In | **Instrumented?** |
|------------|---------|---------|-------------------|
| `contentTagging.ts` | `buildContentTaggingPrompt`<br>`buildJobMatchingTagsPrompt` | `tagSuggestionService.ts` | ❌ **NO** (Company Tag) |
| `coverLetterAnalysis.ts` | `buildCoverLetterAnalysisPrompt` | _Deprecated (CL parsing now programmatic)_ | ⚪ **N/A** |
| `unifiedProfile.ts` | `buildUnifiedProfilePrompt` | `unifiedProfileService.ts` | ❌ **NO** |
| `dynamicMatching.ts` | `buildDynamicMatchingPrompt`<br>`buildContentLibraryAnalysisPrompt` | `browserSearchService.ts` (?) | ❌ **NO** |
| `goNoGo.ts` | `buildGoNoGoPrompt` | `goNoGoService.ts` (deprecated?) | ❌ **NO** |
| `experienceMatch.ts` | `buildExperienceMatchPrompt` | `experienceMatchService.ts` | ❌ **NO** |
| `basicMetrics.ts` | `buildBasicMetricsPrompt` | `openaiService.ts` (?) | ❌ **NO** (Draft Metrics) |
| `enhancedMetricsAnalysis.ts` | `buildEnhancedMetricsPrompt` | PM Levels service (?) | ❌ **NO** |

> PM Levels prompt text currently lives in `supabase/functions/_shared/pipelines/pm-levels.ts` (edge pipeline), not in `/src/prompts`.

---

## Part 2: LLM Call Sites (By Service/Function)

### ✅ Instrumented (3 pipelines)

#### 1. **Resume Processing** (`process-resume/index.ts`, `openaiService.ts`)
- **Prompts Used:**
  - `buildWorkHistorySkeletonPrompt` (Stage 1)
  - `buildRoleStoriesPrompt` (Stage 2, per role)
  - `buildSkillsAndEducationPrompt` (Stage 3)
- **Stages:** 3
- **Instrumented:** ✅ YES (via `process-resume` edge function)
- **Coverage:** Latency, success/failure tracking

#### 2. **Cover Letter Pipeline** (`cover-letter.ts`)
- **Prompts Used:**
  - JD Analysis (from `jobDescriptionAnalysis.ts`)
  - `buildRequirementAnalysisPrompt`
  - Goals & Strengths (custom)
  - `buildSectionGapsPrompt`
- **Stages:** 4 + structural_checks
- **Instrumented:** ✅ YES (Phase 3)
- **Coverage:** Latency, structural validation, quality scores

#### 3. **PM Levels Pipeline** (`pm-levels.ts`)
- **Prompts Used:**
  - Baseline assessment
  - Competency breakdown
  - Specialization assessment
- **Stages:** 3 + structural_checks
- **Instrumented:** ✅ YES (Phase 3)
- **Coverage:** Latency, structural validation, quality scores

---

### ❌ NOT Instrumented (13+ call types)

#### 4. **JD Pre-Analysis** (`preanalyze-jd/index.ts`)
- **Prompt:** `buildJobDescriptionAnalysisPrompt`
- **Call Site:** `supabase/functions/preanalyze-jd/index.ts:60`
- **Purpose:** Extract job title, company, requirements from JD
- **Job Type:** Standalone (not in a job pipeline)
- **Priority:** 🔴 **HIGH** (foundational for all cover letters)

#### 5. **My Voice Extraction** (`coverLetterProcessingService.ts`)
- **Prompt:** Custom inline prompt (lines 316-335)
- **Call Site:** `src/services/coverLetterProcessingService.ts:338`
- **Purpose:** Extract writing style/tone from uploaded cover letter
- **Job Type:** Standalone (during CL upload)
- **Priority:** 🟡 **MEDIUM**

#### 6. **Story Detection (from CL paragraphs)** (`coverLetterProcessingService.ts`)
- **Prompt:** Custom inline prompt (lines 367-424)
- **Call Site:** `src/services/coverLetterProcessingService.ts:371`
- **Purpose:** Detect CAR stories in cover letter paragraphs
- **Job Type:** Standalone (during CL upload)
- **Priority:** 🟡 **MEDIUM**

#### 7. **Gap Analysis — Role** (`contentGenerationService.ts`)
- **Prompt:** `buildRoleDescriptionPrompt`
- **Call Site:** `src/services/contentGenerationService.ts:116`
- **Purpose:** Generate enhanced role descriptions (HIL)
- **Job Type:** HIL gap resolution
- **Priority:** 🔴 **HIGH** (core HIL feature)

#### 8. **Gap Analysis — Story** (`contentGenerationService.ts`)
- **Prompt:** `buildStoryGenerationPrompt`
- **Call Site:** `src/services/contentGenerationService.ts:107`
- **Purpose:** Generate new stories to fill gaps (HIL)
- **Job Type:** HIL gap resolution
- **Priority:** 🔴 **HIGH** (core HIL feature)

#### 9. **Gap Analysis — Saved Section** (`contentGenerationService.ts`)
- **Prompt:** `buildSavedSectionPrompt`
- **Call Site:** `src/services/contentGenerationService.ts:124`
- **Purpose:** Generate CL section content (HIL)
- **Job Type:** HIL gap resolution
- **Priority:** 🔴 **HIGH** (core HIL feature)

#### 10. **Gap Analysis — Streaming** (`gapResolutionStreamingService.ts`)
- **Prompt:** Custom inline (built in `buildGapResolutionPrompt`)
- **Call Site:** `src/services/gapResolutionStreamingService.ts:49-70`
- **Purpose:** Stream gap resolution content (HIL)
- **Job Type:** HIL gap resolution
- **Priority:** 🔴 **HIGH** (core HIL feature, streaming)

#### 11. **Draft Cover Letter Generation** (`coverLetterDraftService.ts`)
- **Prompts:**
  - `buildTemplateCreationPrompt` (create template)
  - Custom section generation prompts
- **Call Sites:**
  - `src/services/coverLetterDraftService.ts:~180` (template)
  - `src/services/coverLetterDraftService.ts:~250+` (sections)
- **Purpose:** Generate full draft cover letter
- **Job Type:** Cover letter generation
- **Priority:** 🔴 **HIGH** (core product feature)

#### 12. **Draft Metrics Generation** (`basicMetrics.ts`, `enhancedMetricsAnalysis.ts`)
- **Prompts:** `buildBasicMetricsPrompt`, `buildEnhancedMetricsPrompt`
- **Call Site:** TBD (need to verify if still used)
- **Purpose:** Generate metrics from role descriptions
- **Job Type:** Metrics extraction
- **Priority:** 🟡 **MEDIUM** (if still active)

#### 13. **CL Ready Evaluation (Judge)** (`coverLetterRatingService.ts`)
- **Prompt:** `buildCoverLetterRatingPrompt`
- **Call Site:** `src/services/coverLetterRatingService.ts:46-54`
- **Purpose:** LLM-as-judge for CL quality rating
- **Job Type:** Quality evaluation
- **Priority:** 🟡 **MEDIUM**

#### 14. **Draft Readiness Judge** (`evaluate-draft-readiness/index.ts`)
- **Prompt:** Custom inline (in `readiness.ts`)
- **Call Site:** `supabase/functions/_shared/readiness.ts:~100`
- **Purpose:** LLM-as-judge for draft readiness
- **Job Type:** Quality evaluation
- **Priority:** 🟡 **MEDIUM**

#### 15. **Company Tag Extraction** (`tagSuggestionService.ts`)
- **Prompt:** `buildContentTaggingPrompt` or `buildJobMatchingTagsPrompt`
- **Call Site:** `src/services/tagSuggestionService.ts:~50`
- **Purpose:** Extract company/industry tags
- **Job Type:** Tagging
- **Priority:** 🟢 **LOW**

#### 16. **Match Intelligence** (`matchIntelligenceService.ts`)
- **Prompt:** `buildMatchIntelligencePrompt`
- **Call Site:** `src/services/matchIntelligenceService.ts:118-133`
- **Purpose:** Analyze job/candidate match metrics
- **Job Type:** Match analysis
- **Priority:** 🟡 **MEDIUM**

#### 17. **Generic LLM Judge** (`evaluationService.ts`)
- **Prompt:** `buildEvaluationPrompt` or `buildEnhancedEvaluationPrompt`
- **Call Site:** `src/services/evaluationService.ts:51-84`
- **Purpose:** Generic LLM-as-judge evaluation
- **Job Type:** Quality evaluation
- **Priority:** 🟢 **LOW** (may be deprecated)

---

## Part 3: Mapping User's Checklist to Call Sites

| User's List Item | File(s) | Prompt(s) | **Status** | **Priority** |
|-----------------|---------|-----------|------------|--------------|
| ✅ CL parse | `coverLetterProcessingService.ts` | `buildCoverLetterAnalysisPrompt` | ✅ Instrumented | N/A |
| ✅ PM level | `pm-levels.ts` | Custom PM prompts | ✅ Instrumented | N/A |
| ✅ Resume | `process-resume`, `openaiService.ts` | `buildWorkHistorySkeleton`, `buildRoleStories`, `buildSkillsAndEducation` | ✅ Instrumented | N/A |
| ❌ HIL | `contentGenerationService.ts`, `gapResolutionStreamingService.ts` | `buildStoryGeneration`, `buildRoleDescription`, `buildSavedSection` | ❌ NOT instrumented | 🔴 **HIGH** |
| ❌ Gap Analysis - Role | `contentGenerationService.ts` | `buildRoleDescriptionPrompt` | ❌ NOT instrumented | 🔴 **HIGH** |
| ❌ Gap Analysis - Story | `contentGenerationService.ts` | `buildStoryGenerationPrompt` | ❌ NOT instrumented | 🔴 **HIGH** |
| ❌ Gap Analysis - Metric | TBD (may not exist) | `buildBasicMetricsPrompt` (?) | ❌ NOT instrumented | 🟡 **MEDIUM** |
| ❌ Gap Analysis - Saved Section | `contentGenerationService.ts` | `buildSavedSectionPrompt` | ❌ NOT instrumented | 🔴 **HIGH** |
| ❌ Gap Analysis - CL Draft | `gapResolutionStreamingService.ts` | Custom streaming prompt | ❌ NOT instrumented | 🔴 **HIGH** |
| ❌ JD | `preanalyze-jd/index.ts` | `buildJobDescriptionAnalysisPrompt` | ❌ NOT instrumented | 🔴 **HIGH** |
| ❌ Draft CL | `coverLetterDraftService.ts` | `buildTemplateCreationPrompt` + custom | ❌ NOT instrumented | 🔴 **HIGH** |
| ❌ Draft Metrics | TBD (may be part of resume or PM) | `buildBasicMetricsPrompt` | ❌ NOT instrumented | 🟡 **MEDIUM** |
| ❌ CL Ready | `coverLetterRatingService.ts` | `buildCoverLetterRatingPrompt` | ❌ NOT instrumented | 🟡 **MEDIUM** |
| ❌ My Voice | `coverLetterProcessingService.ts` | Custom inline (lines 316-335) | ❌ NOT instrumented | 🟡 **MEDIUM** |
| ❌ Judge | `evaluationService.ts`, `readiness.ts` | `buildEvaluationPrompt`, custom judge prompts | ❌ NOT instrumented | 🟡 **MEDIUM** |
| ❌ Company Tag | `tagSuggestionService.ts` | `buildContentTaggingPrompt` | ❌ NOT instrumented | 🟢 **LOW** |

---

## Part 4: Instrumentation Priority Matrix

### 🔴 **Priority 1 (Critical)** — Must Instrument

These are core product features with high user visibility and impact:

1. **JD Pre-Analysis** (`preanalyze-jd/index.ts`)
   - **Why:** Foundation for all cover letters
   - **Effort:** Low (single LLM call)
   - **Impact:** High (affects all CL generation)

2. **HIL Gap Resolution — All Types** (5 call sites in `contentGenerationService.ts` + streaming)
   - **Why:** Core HIL feature, high latency, user-facing
   - **Effort:** Medium (multiple call sites)
   - **Impact:** High (direct user experience)

3. **Draft CL Generation** (`coverLetterDraftService.ts`)
   - **Why:** Core product feature, multiple LLM calls
   - **Effort:** High (complex service with 8+ calls)
   - **Impact:** Very High (primary user value)

---

### 🟡 **Priority 2 (Important)** — Should Instrument

4. **My Voice Extraction** (`coverLetterProcessingService.ts`)
   - **Why:** Personalization feature, user-uploaded content
   - **Effort:** Low (single LLM call)
   - **Impact:** Medium (quality of voice prompts)

5. **CL Ready Evaluation** (`coverLetterRatingService.ts`)
   - **Why:** Quality gate, LLM-as-judge
   - **Effort:** Low (single LLM call)
   - **Impact:** Medium (user feedback on quality)

6. **Draft Readiness Judge** (`readiness.ts`)
   - **Why:** Quality gate, determines if draft is ready
   - **Effort:** Low (single LLM call)
   - **Impact:** Medium (user workflow blocker)

7. **Match Intelligence** (`matchIntelligenceService.ts`)
   - **Why:** Match scoring, affects UX
   - **Effort:** Low (single LLM call)
   - **Impact:** Medium (match quality insights)

8. **Story Detection from CL** (`coverLetterProcessingService.ts`)
   - **Why:** Content extraction during upload
   - **Effort:** Low (single LLM call)
   - **Impact:** Medium (quality of extracted stories)

---

### 🟢 **Priority 3 (Nice to Have)** — Can Defer

9. **Company Tag Extraction** (`tagSuggestionService.ts`)
   - **Why:** Auxiliary tagging feature
   - **Effort:** Low
   - **Impact:** Low (nice-to-have metadata)

10. **Generic LLM Judge** (`evaluationService.ts`)
    - **Why:** May be deprecated or low usage
    - **Effort:** Low
    - **Impact:** Low (verify usage first)

11. **Unified Profile Merging** (`unifiedProfileService.ts`)
    - **Why:** May be part of onboarding (already instrumented?)
    - **Effort:** TBD
    - **Impact:** TBD (verify if still used)

---

## Part 5: Recommended Instrumentation Phases

### **Phase 6A: JD + HIL** (Highest ROI)
- ✅ Instrument `preanalyze-jd/index.ts` (JD analysis)
- ✅ Instrument `contentGenerationService.ts` (all gap resolution types)
- ✅ Instrument `gapResolutionStreamingService.ts` (streaming HIL)
- **Deliverable:** 100% coverage of JD and HIL flows
- **Effort:** ~1-2 days

### **Phase 6B: Draft CL** (Complex, High Impact)
- ✅ Instrument `coverLetterDraftService.ts` (8+ LLM calls)
- **Deliverable:** Full coverage of CL draft generation
- **Effort:** ~2-3 days (complex service)

### **Phase 6C: Quality Gates** (Judge Calls)
- ✅ Instrument `coverLetterRatingService.ts` (CL ready)
- ✅ Instrument `readiness.ts` (draft readiness)
- ✅ Instrument `matchIntelligenceService.ts` (match scoring)
- **Deliverable:** All LLM-as-judge calls tracked
- **Effort:** ~1 day

### **Phase 6D: Auxiliary** (Nice to Have)
- ✅ Instrument `coverLetterProcessingService.ts` (My Voice, story detection)
- ✅ Instrument `tagSuggestionService.ts` (company tags)
- **Deliverable:** 100% LLM call coverage
- **Effort:** ~0.5-1 day

---

## Part 6: Schema Extension for Prompts

To fully support prompt tracking, extend `evals_log`:

```sql
-- Migration: 20251208_add_prompt_metadata_to_evals_log.sql

ALTER TABLE evals_log 
  ADD COLUMN prompt_name TEXT,
  ADD COLUMN prompt_version TEXT,
  ADD COLUMN model TEXT,
  ADD COLUMN prompt_tokens INTEGER,
  ADD COLUMN completion_tokens INTEGER,
  ADD COLUMN total_tokens INTEGER;

CREATE INDEX idx_evals_log_prompt_name ON evals_log(prompt_name);
CREATE INDEX idx_evals_log_model ON evals_log(model);

COMMENT ON COLUMN evals_log.prompt_name IS 
  'Name of the prompt used (e.g., buildJobDescriptionAnalysisPrompt, buildStoryGenerationPrompt)';

COMMENT ON COLUMN evals_log.prompt_version IS 
  'Optional version/hash of the prompt for A/B testing';

COMMENT ON COLUMN evals_log.model IS 
  'LLM model used (e.g., gpt-4o-mini, gpt-4o)';

COMMENT ON COLUMN evals_log.prompt_tokens IS 
  'Number of tokens in the prompt (input)';

COMMENT ON COLUMN evals_log.completion_tokens IS 
  'Number of tokens in the completion (output)';

COMMENT ON COLUMN evals_log.total_tokens IS 
  'Total tokens used (prompt + completion)';
```

---

## Part 7: Next Steps

1. ✅ **Review this audit** with user for accuracy
2. ✅ **Prioritize phases** (6A → 6B → 6C → 6D)
3. ✅ **Extend `evals_log` schema** (migration for prompt metadata)
4. ✅ **Update `logEval` helper** to accept prompt metadata
5. ✅ **Instrument Phase 6A** (JD + HIL)
6. ✅ **Deploy and test** incrementally
7. ✅ **Update dashboard** to show prompt performance

---

## Appendix: Files with LLM Calls

### Services (Frontend)
- `src/services/openaiService.ts` (22 calls)
- `src/services/coverLetterDraftService.ts` (8 calls)
- `src/services/unifiedProfileService.ts` (6 calls)
- `src/services/templateService.ts` (6 calls)
- `src/services/contentStandardsEvaluationService.ts` (5 calls)
- `src/services/contentGenerationService.ts` (4 calls)
- `src/services/browserSearchService.ts` (4 calls)
- `src/services/gapResolutionStreamingService.ts` (3 calls)
- `src/services/evaluationService.ts` (3 calls)
- `src/services/coverLetterRatingService.ts` (2 calls)
- `src/services/matchIntelligenceService.ts` (2 calls)
- `src/services/jobDescriptionService.ts` (2 calls)
- `src/services/atsAnalysisService.ts` (2 calls)
- `src/services/experienceMatchService.ts` (2 calls)
- `src/services/tagSuggestionService.ts` (1 call)
- `src/services/pmLevelsService.ts` (1 call)

### Edge Functions (Supabase)
- `supabase/functions/_shared/pipelines/cover-letter.ts` (6 calls) ✅ Instrumented
- `supabase/functions/process-resume/index.ts` (4 calls) ✅ Instrumented
- `supabase/functions/_shared/readiness.ts` (2 calls)
- `supabase/functions/preanalyze-jd/index.ts` (1 call)

---

**End of Audit**
