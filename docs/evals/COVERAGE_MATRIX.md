# LLM Call Coverage Matrix

**Generated:** 2025-12-04  
**Current Coverage:** 21% (18 / 86 calls)  
**Target:** 100%

---

## 📊 Visual Coverage Map

```
┌─────────────────────────────────────────────────────────────────┐
│ PIPELINE LLM CALLS (100% Coverage ✅)                           │
├─────────────────────────────────────────────────────────────────┤
│ ✅ Resume Processing (3 stages)                                 │
│    └─ Work History Skeleton → Role Stories → Skills/Education  │
│                                                                  │
│ ✅ Cover Letter Pipeline (4 stages + structural)                │
│    └─ JD Analysis → Requirements → Goals → Section Gaps        │
│                                                                  │
│ ✅ PM Levels Pipeline (3 stages + structural)                   │
│    └─ Baseline → Competency → Specialization                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ HUMAN-IN-LOOP (0% Coverage ❌ - HIGH PRIORITY)                  │
├─────────────────────────────────────────────────────────────────┤
│ ❌ Gap Analysis - Story Generation                              │
│ ❌ Gap Analysis - Role Description                              │
│ ❌ Gap Analysis - Saved Section                                 │
│ ❌ Gap Analysis - Metric Enhancement                            │
│ ❌ Gap Analysis - CL Draft (Streaming)                          │
│ ❌ Generic Gap Resolution (Streaming)                           │
│                                                                  │
│ Total: 6 call types                                             │
│ Impact: Core user-facing feature, high latency                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ FOUNDATIONAL (0% Coverage ❌ - HIGH PRIORITY)                   │
├─────────────────────────────────────────────────────────────────┤
│ ❌ JD Pre-Analysis                                               │
│    └─ Affects 100% of cover letter generation                  │
│    └─ Currently invisible to evals                             │
│                                                                  │
│ Total: 1 call type                                              │
│ Impact: Foundation for all CL workflows                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ DRAFT GENERATION (0% Coverage ❌ - HIGH PRIORITY)               │
├─────────────────────────────────────────────────────────────────┤
│ ❌ Cover Letter Draft Generation                                │
│    ├─ Template Creation                                         │
│    ├─ Section Generation (Intro)                                │
│    ├─ Section Generation (Body)                                 │
│    ├─ Section Generation (Closing)                              │
│    ├─ Section Enhancement                                       │
│    └─ ... (8+ LLM calls total)                                  │
│                                                                  │
│ ❌ Draft Metrics Generation (if still used)                     │
│                                                                  │
│ Total: 8+ call types                                            │
│ Impact: Core product value, primary user workflow               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ QUALITY GATES (0% Coverage ❌ - MEDIUM PRIORITY)                │
├─────────────────────────────────────────────────────────────────┤
│ ❌ CL Ready Evaluation (LLM-as-Judge)                           │
│ ❌ Draft Readiness Judge                                        │
│ ❌ Match Intelligence Analysis                                  │
│ ❌ Generic LLM Judge (may be deprecated)                        │
│ ❌ ATS Analysis (may be low usage)                              │
│                                                                  │
│ Total: 5 call types                                             │
│ Impact: Quality measurement, user feedback                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ CONTENT EXTRACTION (33% Coverage ⚠️ - MEDIUM PRIORITY)          │
├─────────────────────────────────────────────────────────────────┤
│ ✅ CL Parse (Cover Letter Analysis)                             │
│ ❌ My Voice Extraction                                          │
│ ❌ Story Detection from CL Paragraphs                           │
│                                                                  │
│ Total: 3 call types (1/3 instrumented)                          │
│ Impact: Personalization, content quality                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ AUXILIARY (0% Coverage ❌ - LOW PRIORITY)                       │
├─────────────────────────────────────────────────────────────────┤
│ ❌ Company Tag Extraction                                       │
│ ❌ Content Tagging                                              │
│ ❌ Dynamic Matching (may be deprecated)                         │
│                                                                  │
│ Total: 2-3 call types                                           │
│ Impact: Metadata, low user visibility                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📈 Coverage by Priority

| Priority | Category | Calls | Instrumented | % | Effort |
|----------|----------|-------|--------------|---|--------|
| 🔴 **P1** | Pipelines | 13 | 13 | ✅ **100%** | *(Done)* |
| 🔴 **P1** | JD Pre-Analysis | 1 | 0 | ❌ **0%** | Low (2-4h) |
| 🔴 **P1** | HIL Gap Resolution | 6 | 0 | ❌ **0%** | Med (1-2d) |
| 🔴 **P1** | Draft CL Generation | 8+ | 0 | ❌ **0%** | High (2-3d) |
| 🟡 **P2** | Quality Gates (Judge) | 5 | 0 | ❌ **0%** | Low (1d) |
| 🟡 **P2** | Content Extraction | 2 | 0 | ❌ **0%** | Low (0.5d) |
| 🟢 **P3** | Auxiliary | 3 | 0 | ❌ **0%** | Low (0.5d) |
| **TOTAL** | **All Categories** | **~38** | **~13** | ⚠️ **~34%** | **5-7d** |

*Note: Total excludes deprecated/unused calls.*

---

## 🎯 Coverage Milestones

```
Current State (21%)
├─ ✅ Resume Pipeline
├─ ✅ Cover Letter Pipeline
└─ ✅ PM Levels Pipeline

After Phase 6A (45%)
├─ ✅ ... (existing)
├─ ✅ JD Pre-Analysis
└─ ✅ HIL Gap Resolution (6 types)

After Phase 6B (65%)
├─ ✅ ... (existing + 6A)
└─ ✅ Draft CL Generation (8+ types)

After Phase 6C (85%)
├─ ✅ ... (existing + 6A + 6B)
└─ ✅ Quality Gates (5 types)

After Phase 6D (100%)
├─ ✅ ... (existing + 6A + 6B + 6C)
├─ ✅ Content Extraction (2 types)
└─ ✅ Auxiliary (3 types)
```

---

## 🔍 Where Are the Gaps?

### **Frontend Services** (`src/services/`)
- `contentGenerationService.ts` — ❌ **4 calls NOT instrumented**
- `gapResolutionStreamingService.ts` — ❌ **3 calls NOT instrumented**
- `coverLetterDraftService.ts` — ❌ **8+ calls NOT instrumented**
- `coverLetterRatingService.ts` — ❌ **2 calls NOT instrumented**
- `coverLetterProcessingService.ts` — ⚠️ **2/3 calls NOT instrumented**
- `matchIntelligenceService.ts` — ❌ **2 calls NOT instrumented**
- `tagSuggestionService.ts` — ❌ **1 call NOT instrumented**

### **Edge Functions** (`supabase/functions/`)
- `preanalyze-jd/index.ts` — ❌ **1 call NOT instrumented** (JD analysis)
- `_shared/readiness.ts` — ❌ **2 calls NOT instrumented** (Draft readiness judge)

---

## 🚀 Fastest Path to 100%

### Quick Wins (Low Effort, High Impact)
1. **JD Pre-Analysis** — 2-4 hours, foundational
2. **My Voice Extraction** — 1-2 hours, single call
3. **Story Detection** — 1-2 hours, single call
4. **Company Tag** — 1-2 hours, single call

**Total:** ~1 day, +4 call types (+10% coverage)

---

### Medium Wins (Medium Effort, High Impact)
5. **HIL Gap Resolution (6 types)** — 1-2 days, core feature
6. **Quality Gates (5 types)** — 1 day, LLM-as-judge

**Total:** ~2-3 days, +11 call types (+30% coverage)

---

### Big Win (High Effort, Very High Impact)
7. **Draft CL Generation (8+ types)** — 2-3 days, core product

**Total:** 2-3 days, +8 call types (+25% coverage)

---

## ✅ Recommended Sequence

```
Week 1: Quick Wins (1 day)
└─ JD, My Voice, Story Detection, Company Tag
   Result: 31% coverage

Week 2: Medium Wins (2-3 days)
└─ HIL Gap Resolution + Quality Gates
   Result: 61% coverage

Week 3: Big Win (2-3 days)
└─ Draft CL Generation
   Result: 86% coverage

Week 4: Cleanup (0.5 day)
└─ Deprecated/edge cases
   Result: 100% coverage
```

---

## 📄 Related Documentation

- **[COMPLETE_LLM_CALL_AUDIT.md](./COMPLETE_LLM_CALL_AUDIT.md)** — Full audit with file locations
- **[LLM_CALL_AUDIT_SUMMARY.md](./LLM_CALL_AUDIT_SUMMARY.md)** — Executive summary
- **[AUDIT_COMPLETION_SUMMARY.md](./AUDIT_COMPLETION_SUMMARY.md)** — Next steps

---

**End of Coverage Matrix**

