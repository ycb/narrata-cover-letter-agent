# LLM Prompt Optimization Priority — REVISED with Real Usage Data

**Generated:** 2025-12-17 (REVISED)  
**Based On:** Actual usage patterns from production

---

## 📊 REVISED Usage Assumptions

### User Activity Patterns
- **Active Users per Week:** Assume 100 users
- **Cover Letters per User per Week:** 30 CLs/week
- **Total CLs per Week:** 3,000 CLs

### Usage Frequency by Call Type

| Call Type | Trigger | Frequency per CL | Weekly Calls (100 users) |
|-----------|---------|------------------|--------------------------|
| **HIL Gap Resolution** | During CL creation | 5 gaps/CL | **15,000/week** |
| **Content Generation** | Initial setup only | Once (30 stories) | **3,000 total (one-time)** |
| **Quality Gates** | Every CL + modifications | 3-5x per CL | **10,000-15,000/week** |
| **CL Metrics** | Every CL + modifications | 3-5x per CL | **10,000-15,000/week** |
| **Match Intelligence** | Every CL + modifications | 3-5x per CL | **10,000-15,000/week** |
| **Content Standards** | Every CL + modifications | 3-5x per CL | **10,000-15,000/week** |
| **Section Gaps** | Every CL (Phase A) | 1x per CL | **3,000/week** |

---

## 🚨 CRITICAL FINDING: Quality Gates are WAY More Frequent Than Expected!

### Before (My Assumption):
- Quality gates: "Optional, low frequency"
- Priority: Tier 3 (defer)

### After (Your Data):
- Quality gates: **Run on EVERY CL + every modification**
- Frequency: **3-5x per CL = 10,000-15,000 calls/week**
- Priority: **TIER 1 CRITICAL** 🔴

---

## 🔴 TIER 1: CRITICAL — HIGHEST ROI

### 1. **Match Intelligence** (MOVED UP FROM #1)
**File:** `src/prompts/matchIntelligence.ts`

**Size:** ~1200 tokens  
**Model:** gpt-4o-mini ($0.15/$0.60 per 1M tokens)  
**Frequency:** 3-5x per CL × 3,000 CLs = **10,000-15,000/week**

**Weekly Token Cost (Current):**
- Input: 1200 tokens × 12,500 calls = 15M tokens/week = **$2.25/week = $117/year**
- Output: 800 tokens × 12,500 calls = 10M tokens/week = **$6/week = $312/year**
- **Total: $429/year**

**After 40% Optimization:**
- Input savings: $47/year
- Output savings: $125/year  
- **Total savings: $172/year**

**Priority:** **9.5/10** — Highest call volume, large prompt

---

### 2. **Enhanced Metrics (Draft CL)** (MOVED UP)
**File:** `src/prompts/enhancedMetricsAnalysis.ts`

**Size:** ~2000 tokens  
**Model:** gpt-4 ($3/$15 per 1M tokens) 💰  
**Frequency:** 3-5x per CL × 3,000 CLs = **10,000-15,000/week**

**Weekly Token Cost (Current):**
- Input: 2000 tokens × 12,500 calls = 25M tokens/week = **$75/week = $3,900/year** 💰
- Output: 1000 tokens × 12,500 calls = 12.5M tokens/week = **$187/week = $9,724/year** 💰
- **Total: $13,624/year** 💰💰💰

**After 50% Optimization:**
- Input savings: $1,950/year
- Output savings: $4,862/year
- **Total savings: $6,812/year** 🎉

**Priority:** **10/10** — MOST EXPENSIVE CALL, HIGHEST ROI

---

### 3. **Content Standards (Section + Letter)** (JUMPED TO TIER 1!)
**Files:** `src/prompts/sectionContentStandards.ts`, `letterContentStandards.ts`

**Size:** ~500 tokens each (2 calls = 1000 tokens total)  
**Model:** gpt-4o-mini ($0.15/$0.60 per 1M tokens)  
**Frequency:** 3-5x per CL × 3,000 CLs = **10,000-15,000/week**

**Weekly Token Cost (Current):**
- Input: 1000 tokens × 12,500 calls = 12.5M tokens/week = **$1.88/week = $98/year**
- Output: 500 tokens × 12,500 calls = 6.25M tokens/week = **$3.75/week = $195/year**
- **Total: $293/year**

**After 30% Optimization:**
- **Total savings: $88/year**

**Priority:** **9/10** — High volume, moderate cost

---

### 4. **CL Rating** (JUMPED TO TIER 1!)
**File:** `src/prompts/coverLetterRating.ts`

**Size:** ~400 tokens  
**Model:** gpt-4o-mini ($0.15/$0.60 per 1M tokens)  
**Frequency:** 3-5x per CL × 3,000 CLs = **10,000-15,000/week**

**Weekly Token Cost (Current):**
- Input: 400 tokens × 12,500 calls = 5M tokens/week = **$0.75/week = $39/year**
- Output: 300 tokens × 12,500 calls = 3.75M tokens/week = **$2.25/week = $117/year**
- **Total: $156/year**

**After 25% Optimization:**
- **Total savings: $39/year**

**Priority:** **8/10** — High volume

---

### 5. **Gap Detection Batch** (JUMPED TO TIER 1!)
**File:** `src/services/gapDetectionService.ts`

**Size:** ~600 tokens (scales with batch size)  
**Model:** gpt-4o-mini ($0.15/$0.60 per 1M tokens)  
**Frequency:** 3-5x per CL × 3,000 CLs = **10,000-15,000/week**

**Weekly Token Cost (Current):**
- **Total: ~$200/year** (estimate)

**After 20% Optimization:**
- **Total savings: $40/year**

**Priority:** **8/10** — High volume

---

## 🟡 TIER 2: HIGH PRIORITY — Second Wave

### 6. **HIL Gap Resolution V2** (DROPPED FROM #3)
**File:** `src/services/gapResolutionStreamingServiceV2.ts`

**Size:** ~800 tokens  
**Model:** gpt-4 ($3/$15 per 1M tokens) 💰  
**Frequency:** 5 gaps/CL × 3,000 CLs = **15,000/week**

**Weekly Token Cost (Current):**
- Input: 800 tokens × 15,000 calls = 12M tokens/week = **$36/week = $1,872/year**
- Output: 400 tokens × 15,000 calls = 6M tokens/week = **$90/week = $4,680/year**
- **Total: $6,552/year**

**After 30% Optimization:**
- **Total savings: $1,966/year**

**Priority:** **8.5/10** — Expensive model, high volume

---

### 7. **Section Gaps** (CL Phase A)
**File:** `src/prompts/sectionGaps.ts`

**Size:** ~900 tokens  
**Model:** gpt-4o-mini ($0.15/$0.60 per 1M tokens)  
**Frequency:** 1x per CL = **3,000/week**

**Weekly Token Cost (Current):**
- Input: 900 tokens × 3,000 calls = 2.7M tokens/week = **$0.41/week = $21/year**
- Output: 600 tokens × 3,000 calls = 1.8M tokens/week = **$1.08/week = $56/year**
- **Total: $77/year**

**After 20% Optimization:**
- **Total savings: $15/year**

**Priority:** **6/10** — Lower volume than quality gates

---

## 🟢 TIER 3: LOW PRIORITY — One-Time or Rare

### 8. **Content Generation (HIL Setup)**
**Frequency:** One-time during setup (30 stories/user)  
**Priority:** **4/10** — One-time use, defer

### 9-10. **Resume, JD Analysis, Others**
**Frequency:** One-time or cached  
**Priority:** **2-4/10** — Defer

---

## 💰 REVISED COST ANALYSIS

### Annual LLM Costs (Current State)

| Call Type | Frequency/Week | Annual Cost | Optimization Potential |
|-----------|----------------|-------------|------------------------|
| **Enhanced Metrics** | 12,500 | **$13,624** 💰💰💰 | **$6,812** |
| **HIL Gap Resolution** | 15,000 | **$6,552** 💰 | **$1,966** |
| **Match Intelligence** | 12,500 | **$429** | **$172** |
| **Content Standards** | 12,500 | **$293** | **$88** |
| **Gap Detection Batch** | 12,500 | **$200** | **$40** |
| **CL Rating** | 12,500 | **$156** | **$39** |
| **Section Gaps** | 3,000 | **$77** | **$15** |
| **Other (Resume, etc)** | Low | **$500** | **$100** |
| **TOTAL** | — | **$21,831/year** | **$9,232/year** |

### 🎉 **Total Optimization Potential: $9,232/year (42% savings)**

---

## 🚀 REVISED OPTIMIZATION ORDER

### Phase 1: CRITICAL (Week 1-2) — $8,900/year savings
1. **Enhanced Metrics** — 50% reduction = **$6,812/year**
2. **HIL Gap Resolution V2** — 30% reduction = **$1,966/year**
3. **Match Intelligence** — 40% reduction = **$172/year**

**Expected:** $8,900/year savings (41% of total spend)

### Phase 2: HIGH PRIORITY (Week 3-4) — $172/year savings
4. **Content Standards** — 30% reduction = **$88/year**
5. **CL Rating** — 25% reduction = **$39/year**
6. **Gap Detection** — 20% reduction = **$40/year**

**Expected:** Additional $167/year savings

### Phase 3: POLISH (Week 5+) — $165/year savings
7. **Section Gaps** — 20% reduction = **$15/year**
8. **Other prompts** — Various = **$150/year**

---

## 🎯 IMMEDIATE ACTION ITEMS

### Week 1: Enhanced Metrics Optimization
**Target:** 50% reduction (2000 → 1000 tokens)

1. ✂️ **Compress JSON schema** (800 → 400 tokens)
   - Remove verbose examples
   - Use abbreviations for repeated fields
   - Simplify nested structures

2. ✂️ **Remove redundant instructions** (200 → 100 tokens)
   - System prompt repeats guidance
   - Model already knows best practices

3. 🎯 **Consider splitting** (if optimization isn't enough)
   - Basic metrics: gpt-4o-mini ($200/year)
   - Deep analysis: gpt-4 ($6,000/year)
   - Total: $6,200/year (save $7,424/year)

**Expected Savings:** $6,812/year  
**Time Investment:** 2-3 days  
**ROI:** $2,270/day of optimization work

### Week 2: HIL Gap Resolution Optimization
**Target:** 30% reduction (800 → 560 tokens)

1. ✂️ **Compress work history context** (300 → 150 tokens)
2. ✂️ **Remove verbose instructions** (100 → 50 tokens)
3. 🎯 **Use gpt-4o-mini for simple gaps** (test)
   - If 50% of gaps are "simple", save $3,276/year

**Expected Savings:** $1,966/year (+ potential $3,276/year)

---

## 📊 KEY INSIGHTS from Real Usage Data

### What Changed:
1. **Quality Gates are NOW Tier 1** — Runs 3-5x per CL, not optional
2. **Enhanced Metrics is #1 Priority** — $13,624/year (62% of total spend)
3. **HIL is still expensive** — But quality gates cost MORE in aggregate

### Optimization Strategy:
1. **Phase 1 Focus:** Enhanced Metrics + HIL (82% of savings)
2. **Quick Wins:** Content standards, CL rating (low-hanging fruit)
3. **Long-term:** Consider gpt-4o-mini for simple HIL gaps

### Budget Impact:
- **Current:** ~$22k/year
- **After Phase 1:** ~$13k/year (41% reduction)
- **After All Phases:** ~$13k/year (42% reduction)

---

## 💬 Questions for You:

1. **Is $22k/year annual LLM spend reasonable for your scale?**
2. **Should I start Enhanced Metrics optimization now?** (Biggest impact)
3. **Would you consider splitting Enhanced Metrics into two calls?** (gpt-4o-mini + gpt-4)
4. **Are there latency concerns with quality gates running 3-5x per CL?**

---

**End of Revised Priority List**

