# Cleanup & Vision Summary

**Date:** 2025-12-04  
**Status:** ✅ Deprecated services deleted, vision aligned

---

## ✅ Cleanup Complete

### **Files Deleted:**
1. ✅ `src/prompts/dynamicMatching.ts` — Unused prompts (replaced by Company Tags)
2. ✅ `src/services/evaluationService.ts` — Deprecated generic evaluation
3. ✅ `src/prompts/evaluation.ts` — Deprecated evaluation prompts
4. ✅ `src/services/atsAnalysisService.ts` — Exploratory, not in MVP
5. ✅ `src/prompts/atsAnalysis.ts` — ATS prompts

### **Files Updated:**
- ✅ `src/prompts/index.ts` — Removed deprecated exports

### **Result:**
- **Removed ~50 deprecated/unused LLM calls** from audit list
- **Final active LLM call count: 30-35** (down from 86)
- **Codebase is cleaner and more focused**

---

## 🎯 Vision Alignment

### **Unified Evals Vision:**
> **Both dashboards evolve to support observability, performance, reliability, and quality measurement for ALL LLM interactions — with emphasis on actionable insights for prompt refinement and product improvements.**

---

## 📊 Two Dashboards, Complementary Purposes

### **/evals** — Pipeline Performance Monitoring
**Purpose:** Real-time operational monitoring of **job pipelines** (Resume, CL, PM Levels, Onboarding)

**Focus:**
- ✅ Job-level success/failure rates
- ✅ Pipeline latency (P50/P90/P99)
- ✅ Structural quality checks per stage
- ✅ Stage-level drill-down

**User:** Engineering, DevOps

**Data Source:** `evals_log` + `jobs` tables

---

### **/evaluation-dashboard** — LLM Quality & Data Integrity
**Purpose:** Deep-dive analysis of **individual LLM calls** with universal + type-specific customization

**Focus:**
- ✅ LLM call-level metrics (latency, tokens, model)
- ✅ Prompt performance analysis
- ✅ Input/output inspection
- ✅ Quality scoring (structural + semantic)
- ✅ Data quality flagging
- ✅ Type-specific details (JD analysis, HIL, Draft CL, etc.)

**User:** Product, Engineering, QA

**Data Source:** `evaluation_runs` + `sources` + `evals_log` (extended)

---

## 📋 Dashboard Evolution Strategy

### **Phase 1: Universal Extensions** (~2-3 days)
Extend `/evaluation-dashboard` with universal LLM tracking:
- ✅ Add `llm_call_type`, `prompt_name`, `quality_checks` to `evaluation_runs`
- ✅ Show prompt metadata (tokens, model, prompt name)
- ✅ Reusable `QualityChecksTable` component
- ✅ Prompt link → full prompt viewer

---

### **Phase 2: Type-Specific Extensions** (~3-5 days)
Add data-type specific customization for each LLM call:
- ✅ JD Analysis details (job title, requirements count, etc.)
- ✅ HIL Gap Resolution details (gap type, truthfulness, relevance)
- ✅ Draft CL Generation details (sections, word count, voice applied)
- ✅ Company Tags details (industry, business model, cache hit)
- ✅ Each type has custom quality dimensions

---

### **Phase 3: Prompt Performance View** (~2 days)
Add prompt-specific performance analysis:
- ✅ Success rate per prompt
- ✅ Avg latency, quality score per prompt
- ✅ Quality distribution histogram
- ✅ Recent failures list
- ✅ A/B test comparison view

---

### **Phase 4: Prompt Viewer** (~1 day)
Modal for viewing full prompt text + variables:
- ✅ Show system + user prompts
- ✅ Show variable substitutions
- ✅ Link to prompt file in GitHub
- ✅ "Test in Playground" button

---

## 🚀 Immediate Next Steps

### **Step 1: Extend `evals_log` Schema** (30 min)
Add prompt metadata columns:

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

---

### **Step 2: Update `logEval` Helper** (30 min)
Accept new optional params:

```typescript
export interface LogEvalPayload {
  // ... existing fields
  
  // NEW: Prompt metadata
  promptName?: string;
  promptVersion?: string;
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
}
```

---

### **Step 3: Start Phase 6A Instrumentation** (1-2 days)
Instrument JD + HIL (5 calls):

1. ✅ JD Pre-Analysis (`preanalyze-jd/index.ts`)
2. ✅ HIL Story Generation (`contentGenerationService.ts`)
3. ✅ HIL Role Description (`contentGenerationService.ts`)
4. ✅ HIL Saved Section (`contentGenerationService.ts`)
5. ✅ HIL Streaming (`gapResolutionStreamingService.ts`)

---

### **Step 4: Start Phase 1 Dashboard Extensions** (2-3 days)
Extend `/evaluation-dashboard`:

1. ✅ Add universal LLM columns to `evaluation_runs`
2. ✅ Add LLM call type filter
3. ✅ Add `PromptLinkCard` component
4. ✅ Add `QualityChecksTable` component
5. ✅ Update performance metrics card

---

## 📈 Expected Outcomes

### **After Phase 6A + Dashboard Phase 1:**
- ✅ **60% LLM call coverage** (18 / 30 calls instrumented)
- ✅ `/evals` shows JD + HIL pipeline metrics
- ✅ `/evaluation-dashboard` shows JD + HIL call-level details
- ✅ Prompt performance tracking for JD + HIL prompts
- ✅ Quality checks visible in dashboard

### **After All Phases:**
- ✅ **100% LLM call coverage**
- ✅ Unified evals vision realized
- ✅ Actionable prompt refinement insights
- ✅ Complete observability of all LLM interactions

---

## 🎯 Alignment Confirmed

**Vision:** ✅ Observability + measurement of LLM inputs/outputs (data quality + performance)  
**Purpose:** ✅ Ensure quality, identify when standards aren't met, enable prompt refinement  
**Dashboards:** ✅ Two complementary views (pipelines + LLM calls)  
**Approach:** ✅ Build on existing patterns, extend thoughtfully, maintain UX quality  
**Coverage:** ✅ Tight, actionable list (30-35 active calls)  

---

**Ready to proceed with implementation?** 🚀

---

**End of Summary**

