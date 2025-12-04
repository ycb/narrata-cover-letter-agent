# LLM Call Audit — Summary & Next Steps

**Generated:** 2025-12-04  
**Purpose:** Executive summary of comprehensive LLM call audit and instrumentation roadmap.

---

## 🎯 Key Findings

### Current State
- **Total LLM Call Sites:** ~86 calls across 20 files
- **Prompts Folder:** 27 prompt files
- **Instrumented:** 3 pipelines (Resume, Cover Letter, PM Levels)
- **Coverage:** **21%** 🚨

### Gap Analysis
- **Missing:** 13+ distinct LLM call types
- **High Priority:** 6 call types (JD, HIL, Draft CL)
- **Medium Priority:** 5 call types (My Voice, CL Ready, Judge)
- **Low Priority:** 2-3 call types (Company Tags, deprecated calls)

---

## 📊 Coverage by Category

| Category | Total Calls | Instrumented | Coverage |
|----------|-------------|--------------|----------|
| **Pipeline LLM Calls** | 13 | 13 | ✅ **100%** |
| **HIL Gap Resolution** | 6 | 0 | ❌ **0%** |
| **Draft Generation** | 8+ | 0 | ❌ **0%** |
| **Quality Gates (Judge)** | 5 | 0 | ❌ **0%** |
| **Content Extraction** | 3 | 1 | ⚠️ **33%** |
| **Auxiliary** | 3-5 | 0 | ❌ **0%** |
| **TOTAL** | ~86 | ~18 | ⚠️ **~21%** |

---

## 🚨 Critical Gaps (Must Instrument)

### 1. **JD Pre-Analysis** (`preanalyze-jd/index.ts`)
- **Why Critical:** Foundation for all cover letter generation
- **User Impact:** Affects 100% of cover letters
- **Effort:** Low (1 LLM call)
- **File:** `supabase/functions/preanalyze-jd/index.ts`
- **Prompt:** `buildJobDescriptionAnalysisPrompt`

### 2. **HIL Gap Resolution** (6 call types)
- **Why Critical:** Core HIL feature, high latency, user-facing
- **User Impact:** Direct user experience for content generation
- **Effort:** Medium (6 call sites across 2 services)
- **Files:** 
  - `src/services/contentGenerationService.ts` (3 types: Story, Role, Saved Section)
  - `src/services/gapResolutionStreamingService.ts` (streaming)
- **Prompts:** `buildStoryGenerationPrompt`, `buildRoleDescriptionPrompt`, `buildSavedSectionPrompt`

### 3. **Draft Cover Letter Generation** (`coverLetterDraftService.ts`)
- **Why Critical:** Core product feature, multiple LLM calls
- **User Impact:** Primary user value proposition
- **Effort:** High (8+ LLM calls in complex service)
- **File:** `src/services/coverLetterDraftService.ts`
- **Prompts:** `buildTemplateCreationPrompt` + custom section prompts

---

## 📋 Your Original Checklist — Updated

| Your Item | Mapped To | Status | Priority |
|-----------|-----------|--------|----------|
| ✅ CL parse | `coverLetterProcessingService.ts` | ✅ **Instrumented** | N/A |
| ✅ PM level | `pm-levels.ts` pipeline | ✅ **Instrumented** | N/A |
| ✅ Resume | `process-resume`, `openaiService.ts` | ✅ **Instrumented** | N/A |
| ❌ HIL | `contentGenerationService.ts` + streaming | ❌ **NOT instrumented** | 🔴 **HIGH** |
| ❌ Gap - Role | `contentGenerationService.ts:116` | ❌ **NOT instrumented** | 🔴 **HIGH** |
| ❌ Gap - Story | `contentGenerationService.ts:107` | ❌ **NOT instrumented** | 🔴 **HIGH** |
| ❌ Gap - Metric | TBD (may not exist) | ❌ **NOT instrumented** | 🟡 **MEDIUM** |
| ❌ Gap - Saved Section | `contentGenerationService.ts:124` | ❌ **NOT instrumented** | 🔴 **HIGH** |
| ❌ Gap - CL Draft | `gapResolutionStreamingService.ts:49` | ❌ **NOT instrumented** | 🔴 **HIGH** |
| ❌ JD | `preanalyze-jd/index.ts:60` | ❌ **NOT instrumented** | 🔴 **HIGH** |
| ❌ Draft CL | `coverLetterDraftService.ts` (8+ calls) | ❌ **NOT instrumented** | 🔴 **HIGH** |
| ❌ Draft Metrics | TBD (may be part of resume) | ❌ **NOT instrumented** | 🟡 **MEDIUM** |
| ❌ CL Ready | `coverLetterRatingService.ts:46` | ❌ **NOT instrumented** | 🟡 **MEDIUM** |
| ❌ My Voice | `coverLetterProcessingService.ts:338` | ❌ **NOT instrumented** | 🟡 **MEDIUM** |
| ❌ Judge | `evaluationService.ts:51`, `readiness.ts` | ❌ **NOT instrumented** | 🟡 **MEDIUM** |
| ❌ Company Tag | `tagSuggestionService.ts` | ❌ **NOT instrumented** | 🟢 **LOW** |

---

## 🛤️ Recommended Implementation Phases

### **Phase 6A: JD + HIL** (Highest ROI) — ~1-2 days
✅ **Instrument:**
1. `preanalyze-jd/index.ts` (JD analysis)
2. `contentGenerationService.ts` (Story, Role, Saved Section)
3. `gapResolutionStreamingService.ts` (streaming HIL)

**Deliverable:** 100% coverage of JD and HIL flows  
**Impact:** Foundational + core HIL feature  
**New Coverage:** +6 call types

---

### **Phase 6B: Draft CL** (Complex, High Impact) — ~2-3 days
✅ **Instrument:**
1. `coverLetterDraftService.ts` (8+ LLM calls)

**Deliverable:** Full coverage of CL draft generation  
**Impact:** Core product feature, primary user value  
**New Coverage:** +8 call types

---

### **Phase 6C: Quality Gates** (Judge Calls) — ~1 day
✅ **Instrument:**
1. `coverLetterRatingService.ts` (CL ready)
2. `readiness.ts` (draft readiness)
3. `matchIntelligenceService.ts` (match scoring)

**Deliverable:** All LLM-as-judge calls tracked  
**Impact:** Quality measurement, user feedback  
**New Coverage:** +5 call types

---

### **Phase 6D: Auxiliary** (Nice to Have) — ~0.5-1 day
✅ **Instrument:**
1. `coverLetterProcessingService.ts` (My Voice, story detection)
2. `tagSuggestionService.ts` (company tags)

**Deliverable:** 100% LLM call coverage  
**Impact:** Completeness, long-tail features  
**New Coverage:** +3 call types

---

## 🔧 Required Schema Extension

To support prompt tracking (for your "prompts folder" vision), extend `evals_log`:

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
```

**Why:**
- Links each eval to the prompt file that generated it
- Enables prompt performance analysis
- Supports A/B testing of prompt versions
- Tracks token usage per prompt

---

## 📈 Expected Outcomes (After All Phases)

### Coverage
- **Current:** 21% (3 pipelines)
- **After Phase 6A:** ~45% (JD + HIL)
- **After Phase 6B:** ~65% (+ Draft CL)
- **After Phase 6C:** ~85% (+ Judge calls)
- **After Phase 6D:** ~100% (complete)

### Dashboard Capabilities (New)
- **Prompt Performance View:** Success rate, latency, quality score by prompt
- **Input/Output Tracking:** See prompt text + LLM response for each call
- **Prompt Version Comparison:** A/B test prompt changes
- **Failing Prompts Report:** Identify low-quality prompts needing refinement
- **Token Usage by Prompt:** Cost tracking per prompt file

---

## ✅ Next Steps

1. **Review this audit** — Confirm accuracy of mapping
2. **Approve phasing** — 6A → 6B → 6C → 6D
3. **Extend schema** — Add prompt metadata columns
4. **Update `logEval`** — Accept `promptName`, `model`, `tokens` params
5. **Start Phase 6A** — Instrument JD + HIL (highest ROI)
6. **Test incrementally** — Verify data in `/evals` dashboard
7. **Dashboard enhancements** — Add prompt performance views

---

## 📄 Full Documentation

See **[COMPLETE_LLM_CALL_AUDIT.md](./COMPLETE_LLM_CALL_AUDIT.md)** for:
- Detailed prompt inventory (all 27 files)
- Call site locations (exact line numbers)
- Prompt-to-service mapping
- Implementation guidance per phase

---

**Ready to proceed with Phase 6A?** 🚀

