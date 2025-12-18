# LLM Prompt Optimization Priority — CORRECTED MODEL USAGE

**Generated:** 2025-12-17 (CORRECTED)  
**Based On:** Actual usage patterns + verified model configurations

---

## 🚨 CRITICAL CORRECTION: Model Usage

### ❌ My Initial Assumption (WRONG):
- Enhanced Metrics: `gpt-4` → **$13,624/year**
- HIL Gap Resolution: `gpt-4` → **$6,552/year**

### ✅ Actual Model Usage (CORRECT):
- **Enhanced Metrics:** `gpt-4o-mini` (from `OPENAI_CONFIG.MODEL`)
- **HIL Gap Resolution V1:** `gpt-4` (hardcoded)
- **HIL Gap Resolution V2:** `VITE_OPENAI_MODEL_HIL` (defaults to `gpt-4o-mini`)
- **Content Generation (HIL):** `VITE_OPENAI_MODEL_HIL` (defaults to `gpt-4o-mini`)
- **All Quality Gates:** `gpt-4o-mini`

### 🎯 Your Configuration:
Per your clarification:
- **HIL:** `gpt-4o` (NOT gpt-4o-mini, you said "5-mini" which I assume means o1-mini or gpt-4o)
- **Everything else:** `gpt-4o-mini`

---

## 💰 REVISED COST ANALYSIS (Assuming HIL = o1-mini)

### Model Pricing:
- **gpt-4o-mini:** $0.15 / $0.60 per 1M tokens (input/output)
- **o1-mini:** $3 / $12 per 1M tokens (input/output)

---

### Annual LLM Costs by Call Type

| Call Type | Model | Tokens (I/O) | Calls/Week | Annual Cost |
|-----------|-------|--------------|------------|-------------|
| **HIL Gap Resolution** | **o1-mini** 💰 | 800/400 | 15,000 | **$6,552** |
| Enhanced Metrics | gpt-4o-mini | 2000/1000 | 12,500 | **$390** |
| Match Intelligence | gpt-4o-mini | 1200/800 | 12,500 | **$429** |
| Content Standards | gpt-4o-mini | 1000/500 | 12,500 | **$293** |
| CL Rating | gpt-4o-mini | 400/300 | 12,500 | **$156** |
| Gap Detection | gpt-4o-mini | 600/300 | 12,500 | **$180** |
| Section Gaps | gpt-4o-mini | 900/600 | 3,000 | **$77** |
| Content Gen (Setup) | o1-mini | 600/300 | 3,000 (one-time) | **$131** |
| **TOTAL** | — | — | — | **$8,208/year** |

---

## 🔴 TIER 1: CRITICAL — HIGHEST ROI

### 1. **HIL Gap Resolution** (MOVED TO #1!)
**Files:** `gapResolutionStreamingService.ts`, `gapResolutionStreamingServiceV2.ts`

**Size:** ~800 tokens input, ~400 tokens output  
**Model:** **o1-mini** ($3/$12 per 1M tokens) 💰  
**Frequency:** 5 gaps/CL × 3,000 CLs = **15,000/week**

**Annual Cost (Current):**
- Input: 800 × 15,000 × 52 = 624M tokens = **$1,872/year**
- Output: 400 × 15,000 × 52 = 312M tokens = **$3,744/year**
- **Total: $5,616/year** (68% of total spend!)

**After 30% Optimization:**
- Input savings: $562/year
- Output savings: $1,123/year
- **Total savings: $1,685/year**

**Priority:** **10/10** — Most expensive, highest ROI

---

### 2. **Enhanced Metrics (Draft CL)**
**File:** `src/prompts/enhancedMetricsAnalysis.ts`

**Size:** ~2000 tokens input, ~1000 tokens output  
**Model:** **gpt-4o-mini** ($0.15/$0.60 per 1M tokens)  
**Frequency:** 3-5x per CL × 3,000 CLs = **12,500/week**

**Annual Cost (Current):**
- Input: 2000 × 12,500 × 52 = 1.3B tokens = **$195/year**
- Output: 1000 × 12,500 × 52 = 650M tokens = **$390/year**
- **Total: $585/year**

**After 50% Optimization:**
- **Total savings: $293/year**

**Priority:** **9/10** — Largest prompt, high frequency, good ROI

---

### 3. **Match Intelligence**
**File:** `src/prompts/matchIntelligence.ts`

**Size:** ~1200 tokens input, ~800 tokens output  
**Model:** **gpt-4o-mini** ($0.15/$0.60 per 1M tokens)  
**Frequency:** 3-5x per CL × 3,000 CLs = **12,500/week**

**Annual Cost (Current):**
- Input: 1200 × 12,500 × 52 = 780M tokens = **$117/year**
- Output: 800 × 12,500 × 52 = 520M tokens = **$312/year**
- **Total: $429/year**

**After 40% Optimization:**
- **Total savings: $172/year**

**Priority:** **8/10** — Large prompt, high frequency

---

## 🟡 TIER 2: MODERATE PRIORITY

### 4. **Content Standards (Section + Letter)**
**Annual Cost:** $293/year  
**Savings (30% opt):** $88/year  
**Priority:** 7/10

### 5. **Content Generation (HIL Setup)**
**Model:** o1-mini (one-time during setup)  
**Annual Cost:** $131/year (amortized)  
**Savings (25% opt):** $33/year  
**Priority:** 6/10

### 6. **Gap Detection Batch**
**Annual Cost:** $180/year  
**Savings (20% opt):** $36/year  
**Priority:** 6/10

### 7. **CL Rating**
**Annual Cost:** $156/year  
**Savings (25% opt):** $39/year  
**Priority:** 6/10

---

## 🟢 TIER 3: LOW PRIORITY

### 8. **Section Gaps (CL Phase A)**
**Annual Cost:** $77/year  
**Savings (20% opt):** $15/year  
**Priority:** 4/10

### 9-10. **Resume, JD Analysis, Others**
**Annual Cost:** ~$400/year (combined, one-time)  
**Priority:** 2-3/10 — Defer

---

## 📊 REVISED BUDGET SUMMARY

### Current State:
| Category | Annual Cost | % of Total |
|----------|-------------|------------|
| **HIL (o1-mini)** | **$5,747** | **70%** |
| Quality Gates (gpt-4o-mini) | $1,448 | 18% |
| Other (gpt-4o-mini) | $477 | 6% |
| One-time (various) | $536 | 6% |
| **TOTAL** | **$8,208** | 100% |

### After Full Optimization:
- **Phase 1 (HIL + Enhanced Metrics + Match Intelligence):** Save $2,150/year (26%)
- **Phase 2 (Quality Gates):** Save $163/year (2%)
- **Total Savings:** $2,313/year (28% reduction)
- **New Annual Spend:** **$5,895/year**

---

## 🚀 REVISED OPTIMIZATION ORDER

### Phase 1: CRITICAL (Week 1-2) — $2,150/year savings

**1. HIL Gap Resolution (30% optimization)**
- **Current:** $5,616/year (68% of total spend!)
- **Savings:** $1,685/year
- **Effort:** 1-2 days
- **ROI:** $1,123/day

**Key Optimizations:**
- ✂️ Compress work history context (300 → 150 tokens)
- ✂️ Remove verbose instructions (trust model)
- 💾 Cache work history context across gaps
- 🎯 Consider gpt-4o-mini for "simple" gaps (if 50% are simple, save $2,808/year more)

---

**2. Enhanced Metrics (50% optimization)**
- **Current:** $585/year
- **Savings:** $293/year
- **Effort:** 2-3 days
- **ROI:** $117/day

**Key Optimizations:**
- ✂️ Compress JSON schema examples (800 → 400 tokens)
- ✂️ Remove redundant instructions
- ✂️ Simplify nested structures

---

**3. Match Intelligence (40% optimization)**
- **Current:** $429/year
- **Savings:** $172/year
- **Effort:** 0.5-1 day
- **ROI:** $172-344/day

**Key Optimizations:**
- ✂️ Remove redundant work history (already in stories)
- ✂️ Summarize user goals (not full JSON)
- ✂️ Compress requirements

---

### Phase 2: MODERATE (Week 3) — $196/year savings

4. Content Standards — $88/year
5. Content Generation — $33/year
6. Gap Detection — $36/year
7. CL Rating — $39/year

---

## 🎯 CLARIFYING QUESTIONS

1. **What is your HIL model?**
   - You said "5-mini" — Is this:
     - ✅ `o1-mini` (reasoning model, $3/$12 per 1M)
     - ✅ `gpt-4o` (vision model, $2.50/$10 per 1M)
     - ❌ `gpt-4o-mini` (standard, $0.15/$0.60 per 1M)

2. **Current env vars:**
   - `VITE_OPENAI_MODEL` = `gpt-4o-mini` (for everything except HIL)
   - `VITE_OPENAI_MODEL_HIL` = ??? (please confirm)

3. **HIL Optimization Strategy:**
   - Should I explore **downgrading simple gaps to gpt-4o-mini**?
   - Potential savings: **50% of HIL cost = $2,808/year**
   - Risk: Quality degradation for simple gaps

4. **Budget Target:**
   - Is **$8,200/year** reasonable for your scale?
   - Or should we target a specific budget (e.g., $5k/year)?

---

## 💡 KEY INSIGHT

### 🚨 HIL is 68% of Your LLM Budget!

If HIL uses **o1-mini** or **gpt-4o**, this is your #1 optimization target.

**Two Strategies:**
1. **Token Compression** (30% reduction) → Save $1,685/year
2. **Smart Model Selection** (50% of gaps to gpt-4o-mini) → Save $2,808/year
3. **Combined** → Save **$4,493/year** (total HIL cost drops from $5,616 to $1,123)

---

**End of Corrected Priority List**

