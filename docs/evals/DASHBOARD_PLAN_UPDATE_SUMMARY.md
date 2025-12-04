# Dashboard Plan Update Summary

**Date:** 2025-12-04  
**Changes:** Added cost tracking + enhancements for both dashboards

---

## ✅ What Was Updated

### **DASHBOARD_EVOLUTION_PLAN.md** now includes:

1. ✅ **Phase 0: Schema Extensions** (NEW)
   - SQL migrations for prompt + cost metadata
   - Cost aggregate function for `/evals`
   - Extended `evaluation_runs` for `/evaluation-dashboard`

2. ✅ **Phase 1: `/evals` Enhancements** (UPDATED)
   - `CostOverviewCard` component (pipeline-level costs)
   - Model filter (optional)
   - Cost aggregate function integration
   - Updated `PipelineEvaluationDashboard` layout

3. ✅ **Phase 2-5: `/evaluation-dashboard` Extensions** (RENUMBERED)
   - All phases now include cost tracking
   - Prompt Performance View includes cost analysis
   - Per-call cost breakdown
   - Cost outliers detection

---

## 🎯 Key Additions

### **Cost Tracking in Both Dashboards:**

**`/evals`** — Pipeline-Level Budget Monitoring
```
┌─────────────────────────────────────────────────────────────────┐
│ Pipeline Costs (Last 30 days)                    $50.50         │
├─────────────────────────────────────────────────────────────────┤
│ Job Type      │ Runs │ Total Tokens │ Est. Cost │ Avg/Job      │
│ ──────────────────────────────────────────────────────────────  │
│ Cover Letter  │ 243  │ 1.8M         │ $28.50    │ $0.117       │
│ PM Levels     │ 189  │ 980K         │ $14.20    │ $0.075       │
│ Resume        │ 156  │ 620K         │ $7.80     │ $0.050       │
└─────────────────────────────────────────────────────────────────┘
```

**`/evaluation-dashboard`** — Call-Level Cost Analysis
```
┌─────────────────────────────────────────────────────────────────┐
│ Run #123 - Token Usage & Cost                                   │
├─────────────────────────────────────────────────────────────────┤
│ Type          │ Tokens │ Rate      │ Cost                       │
│ ──────────────────────────────────────────────────────────────  │
│ Prompt (in)   │ 450    │ $0.15/1M  │ $0.0007                    │
│ Completion    │ 800    │ $0.60/1M  │ $0.0048                    │
│ **TOTAL**     │ 1,250  │ —         │ $0.0055                    │
└─────────────────────────────────────────────────────────────────┘

Prompt Performance: buildJobDescriptionAnalysisPrompt
├─ Total Runs: 243
├─ Total Cost: $18.50
├─ Avg Cost per Call: $0.076
└─ Most Expensive Run: $0.95 (outlier)
```

---

## 📊 Updated Implementation Timeline

| Phase | Dashboard | Effort | Key Deliverable |
|-------|-----------|--------|-----------------|
| **0** | Both | 1 day | Schema extensions for cost tracking |
| **1** | `/evals` | 2 days | Pipeline cost visibility + model filter |
| **2** | `/evaluation-dashboard` | 2-3 days | Universal LLM tracking |
| **3** | `/evaluation-dashboard` | 3-5 days | Type-specific views |
| **4** | `/evaluation-dashboard` | 2 days | Prompt performance + cost analysis |
| **5** | `/evaluation-dashboard` | 1 day | Prompt viewer |
| **TOTAL** | Both | **11-14 days** | Complete LLM observability + cost tracking |

---

## 🎯 Phased Rollout (Recommended)

### **Week 1: Cost Visibility (Quick Win)**
- Phase 0 + Phase 1
- **Result:** Budget monitoring across all pipelines

### **Week 2: Universal Tracking**
- Phase 2
- **Result:** All LLM calls visible + filterable

### **Weeks 3-4: Full Customization**
- Phases 3-5
- **Result:** Complete observability + optimization toolkit

---

## 💰 Cost Tracking Features

### **Both Dashboards Get:**
1. ✅ Token usage tracking (prompt + completion)
2. ✅ Model-specific cost calculation
3. ✅ Cost per job/call metrics

### **`/evals` Gets:**
1. ✅ Pipeline-level cost aggregation
2. ✅ Cost trend over time
3. ✅ Cost per job type comparison
4. ✅ Model filter (optional)

### **`/evaluation-dashboard` Gets:**
1. ✅ Per-call cost breakdown
2. ✅ Per-prompt cost aggregation
3. ✅ Cost outliers detection
4. ✅ Prompt comparison (cost + quality)

---

## 🔧 New Database Functions

### **`get_evals_cost_by_job_type(since_date)`**
Returns pipeline-level cost metrics:
- Total runs
- Total tokens (prompt + completion)
- Estimated cost (model-specific pricing)
- Avg cost per job

**Used by:** `/evals` CostOverviewCard

---

## 📝 New Components

### **`/evals`:**
- `CostOverviewCard.tsx` — Pipeline cost table + summary

### **`/evaluation-dashboard`:**
- `PromptCostBreakdown.tsx` — Detailed token + cost analysis
- `CostOutliersTable.tsx` — Expensive runs investigation

---

## ✅ Ready for Implementation

**Updated plan document:** `docs/evals/DASHBOARD_EVOLUTION_PLAN.md`

**Next step:** Phase 0 (Schema Extensions) — 1 day

**Total effort:** 11-14 days for complete implementation

---

**End of Update Summary**

