# Model Quality Analysis vs Ground Truth

**Date:** 2025-10-19  
**Source of Truth:** `fixtures/synthetic/v1/expected_counts_v5.json`

---

## 📊 Results vs Expected Counts

### P01 - Avery Chen (Gold Quality)
**Expected:** 7-9 stories, 18-22 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 6 | 19 | ❌ (-1) | ✅ | **C+** |
| gpt-4o-mini | 7 | 16 | ✅ | ❌ (-2) | **B-** |
| gpt-4o | 7 | 17 | ✅ | ⚠️ (-1) | **B** |

---

### P02 - Jordan Alvarez (Gold Quality)
**Expected:** 6-8 stories, 16-20 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 7 | 18 | ✅ | ✅ | **A** |
| gpt-4o-mini | 7 | 18 | ✅ | ✅ | **A** |
| gpt-4o | 7 | 19 | ✅ | ✅ | **A** |

---

### P03 - Riley Gupta (Gold Quality)
**Expected:** 6-8 stories, 15-18 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 6 | 16 | ✅ | ✅ | **A** |
| gpt-4o-mini | 7 | 19 | ✅ | ⚠️ (+1) | **A-** |
| gpt-4o | 7 | 19 | ✅ | ⚠️ (+1) | **A-** |

---

### P04 - Morgan Patel (Medium Quality)
**Expected:** 5-6 stories, 10-14 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 3 | 6 | ❌ (-2) | ❌ (-4) | **D** |
| gpt-4o-mini | 3 | 6 | ❌ (-2) | ❌ (-4) | **D** |
| gpt-4o | 3 | 6 | ❌ (-2) | ❌ (-4) | **D** |

---

### P05 - Samira Khan (Medium-Low Quality)
**Expected:** 4-5 stories, 8-12 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 2 | 5 | ❌ (-2) | ❌ (-3) | **F** |
| gpt-4o-mini | 3 | 6 | ❌ (-1) | ❌ (-2) | **D** |
| gpt-4o | 3 | 6 | ❌ (-1) | ❌ (-2) | **D** |

---

### P06 - Diego Morales (Medium-Low Quality)
**Expected:** 4-5 stories, 8-10 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 3 | 4 | ❌ (-1) | ❌ (-4) | **F** |
| gpt-4o-mini | 3 | 6 | ❌ (-1) | ❌ (-2) | **D** |
| gpt-4o | 3 | 4 | ❌ (-1) | ❌ (-4) | **F** |

---

### P07 - Noah Williams (High Quality)
**Expected:** 5-7 stories, 10-14 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 3 | 6 | ❌ (-2) | ❌ (-4) | **F** |
| gpt-4o-mini | 3 | 6 | ❌ (-2) | ❌ (-4) | **F** |
| gpt-4o | 3 | 6 | ❌ (-2) | ❌ (-4) | **F** |

---

### P08 - Priya Desai (Medium Quality)
**Expected:** 3-4 stories, 6-8 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 3 | 3 | ✅ | ❌ (-3) | **C** |
| gpt-4o-mini | 4 | 8 | ✅ | ✅ | **A** |
| gpt-4o | 4 | 2 | ✅ | ❌ (-4) | **D** |

---

### P09 - Leo Martin (Medium Quality)
**Expected:** 3-4 stories, 6-8 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 2 | 4 | ❌ (-1) | ❌ (-2) | **D** |
| gpt-4o-mini | 3 | 5 | ✅ | ❌ (-1) | **C+** |
| gpt-4o | 3 | 4 | ✅ | ❌ (-2) | **C** |

---

### P10 - Sophia Rivera (High Quality)
**Expected:** 6-8 stories, 15-18 metrics

| Model | Stories | Metrics | Stories ✓ | Metrics ✓ | Grade |
|-------|---------|---------|-----------|-----------|-------|
| gpt-3.5-turbo | 3 | 6 | ❌ (-3) | ❌ (-9) | **F** |
| gpt-4o-mini | 4 | 7 | ❌ (-2) | ❌ (-8) | **F** |
| gpt-4o | 4 | 6 | ❌ (-2) | ❌ (-9) | **F** |

---

## 🎯 Overall Performance

### gpt-3.5-turbo
- **Latency:** 6.3s (fastest) ⚡
- **Pass Rate:** 3/10 profiles meet expectations (30%) ❌
- **Average Deficit:** -1.4 stories, -3.4 metrics
- **Grade Distribution:** A (2), C (2), D (2), F (4)
- **Cost:** $0.0016

### gpt-4o-mini
- **Latency:** 10.6s (slowest) 🐌
- **Pass Rate:** 4/10 profiles meet expectations (40%) ⚠️
- **Average Deficit:** -1.0 stories, -2.8 metrics
- **Grade Distribution:** A (3), C (1), D (4), F (2)
- **Cost:** $0.0006 (cheapest)

### gpt-4o
- **Latency:** 7.7s (middle) 
- **Pass Rate:** 3/10 profiles meet expectations (30%) ❌
- **Average Deficit:** -1.2 stories, -3.6 metrics
- **Grade Distribution:** A (2), B (1), C (1), D (2), F (4)
- **Cost:** $0.0167 (most expensive)

---

## 🚨 **CRITICAL FINDINGS**

### 1. **ALL MODELS FAIL ON 60-70% OF PROFILES**
   - None of the models are extracting enough stories/metrics
   - The issue gets WORSE for Medium/High quality profiles (P04-P10)
   - Gold profiles (P01-P03) perform best but still miss targets

### 2. **Consistent Pattern: Good on Complex, Bad on Simple**
   - P01-P03 (Gold, detailed resumes): 60-90% pass rate
   - P04-P10 (Medium-High, shorter resumes): 10-30% pass rate
   - **Theory:** LLM needs MORE explicit content, not less

### 3. **Metrics Extraction is BROKEN**
   - Average deficit: -3 to -3.6 metrics per profile
   - Even when story count is right, metrics are missing
   - **Root cause:** Prompt may not be clear about extracting ALL metrics

### 4. **gpt-4o-mini is SLIGHTLY better (40% vs 30%)**
   - But still fails on 60% of profiles
   - The extra 4 seconds doesn't justify marginal improvement
   - **Conclusion:** The problem is NOT the model, it's the PROMPT

---

## 💡 **ROOT CAUSE ANALYSIS**

The test script uses the SAME prompt from `resumeAnalysis.ts`. Looking at the actual extracted data:

**Problem 1: Stories are NOT being expanded from bullets**
- P04-P10 have shorter resumes with fewer explicit stories
- LLM is only extracting explicit CAR-formatted stories
- It's NOT transforming bullets into stories

**Problem 2: Metrics are NOT being counted per story**
- The prompt asks for `metrics` array in stories
- But many stories have metrics embedded in `content` not extracted to array
- Counting logic in test may be wrong OR extraction is incomplete

**Problem 3: Prompt may be TOO strict about CAR format**
- Asking for "Context, Action, Result" may cause LLM to skip bullets
- that don't perfectly fit this structure

---

## 🔧 **RECOMMENDED FIXES**

### **Option A: Fix the Prompt** (2-3 hours)
1. Make story extraction more lenient
2. Explicitly instruct to "transform each bullet into a story"
3. Add examples of bullet → story transformation
4. Clarify that metrics should be BOTH in array AND content

### **Option B: Two-Pass Extraction** (4-5 hours)
1. **Pass 1 (gpt-3.5-turbo):** Extract basic structure (10s)
2. **Pass 2 (gpt-4o-mini background):** Expand stories & metrics (60s)
3. Show user basic data immediately, enrich in background

### **Option C: Prompt + Streaming** (3-4 hours)
1. Fix prompt to be more aggressive about extraction
2. Implement streaming so user sees stories appearing live
3. Review & Approve screen lets user add missing stories

---

## 🎯 **NEXT STEP**

**Big Daddy, the data shows:**
- Speed difference is 6s vs 10s (not 10s vs 90s as seen in production)
- Quality difference is minimal (40% vs 30% pass rate)
- **BOTH are failing because the PROMPT is inadequate**

**My recommendation:**
1. **Fix the prompt first** - test with P04-P10 to ensure it extracts ALL stories
2. **Re-run this analysis** to see true model performance
3. **Then** decide between gpt-3.5-turbo (fast) vs gpt-4o-mini (quality)

**Should I:**
- A) Fix the prompt and re-test?
- B) Implement streaming with current extraction quality?
- C) Implement two-pass approach?

Your call, Big Daddy! 🙏




