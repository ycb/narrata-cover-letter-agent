# Cover Letter Draft Creation - Latency Summary

**Date:** 2026-01-15  
**Sample:** 73 drafts (last 30 days)

---

## 📊 End-to-End Latency

```
Average:  ████████████████████████████████████████  36.0 seconds  ⚠️
Median:   ████████████████████████████████████████  39.8 seconds  ⚠️
P95:      █████████████████████████████████████████████████████  55.1 seconds  ❌
Target:   ███████████████  <15 seconds
```

**Status:** 2.4x slower than target

---

## ⏱️ Latency Breakdown by Stage

### Phase A - Initial Draft Generation (Bottleneck)

```
Average:  ████████████████████████████████████████████████████████████████  66.5s  ❌
Median:   ████████████████████████████████████████████████████████████████  67.1s
P95:      ████████████████████████████████████████████████████████████████████████████████████  86.1s
Target:   ████████████████████  <20s
```

**Status:** 3.3x slower than target | **CRITICAL BOTTLENECK**

### Section Gaps Analysis

```
Average:  ██████████████████  17.9s  ⚠️
Median:   █████████████████  17.3s
P95:      █████████████████████████  25.6s
Target:   █████  <5s
```

**Status:** 3.6x slower than target

### Requirement Analysis

```
Average:  ███████████████  15.4s  ⚠️
Median:   ██████████████  14.6s
P95:      █████████████████████  21.7s
Target:   █████  <5s
```

**Status:** 3.1x slower than target

### Goals & Strengths Analysis

```
Average:  ██████  6.4s  ⚠️
Median:   ██████  6.2s
P95:      █████████  9.0s
Target:   ███  <3s
TTFU:     ████  4.5s  ✅ (streaming starts quickly)
```

**Status:** 2.1x slower than target, but streams well

### Job Description Analysis

```
Average:  ████  3.9s  ✅
Median:   ███  3.3s
P95:      ██████  5.9s
Target:   ███  <3s
TTFU:     █  0.7s  ✅ (excellent streaming)
```

**Status:** Near target, good performance

---

## 📈 Latency Trends (Last 14 Days)

### Phase A Latency Over Time

```
Jan 14:  ████████████████████████████████████████████████████████████████████████████████████  87.0s  ⬆️ Worst
Jan 12:  ██████████████████████████████████████████████  50.0s  ⬇️ Best
Jan 09:  ████████████████████████████████████████████████████████████████  66.4s
Jan 08:  ██████████████████████████████████████████████████████████████████████  70.4s
Jan 07:  █████████████████████████████████████████████████████████████████████  69.6s
Jan 06:  ███████████████████████████████████████████████████  55.2s
```

**Trend:** Highly variable (50-87s range)

---

## 🎯 Performance vs Target

| Stage | Current | Target | Gap | Status |
|-------|---------|--------|-----|--------|
| **Total** | **36-40s** | **<15s** | **-60%** | ❌ |
| Phase A | 66.5s | <20s | -70% | ❌ Critical |
| Section Gaps | 17.9s | <5s | -72% | ⚠️ |
| Requirements | 15.4s | <5s | -68% | ⚠️ |
| Goals | 6.4s | <3s | -53% | ⚠️ |
| JD Analysis | 3.9s | <3s | -23% | ✅ |

---

## 🔥 Critical Issues

### 1. Phase A is the Bottleneck (66.5s)

**Why it's slow:**
- Large prompt (10K-20K tokens: full JD + all work history)
- Long output (1K-2K tokens: complete cover letter)
- No streaming to user (60+ second wait)
- Sequential processing (blocks other stages)

**Impact:**
- Users wait 60+ seconds with no feedback
- 3.3x slower than target
- Accounts for 65% of total latency

### 2. No Streaming for Phase A

**Current UX:**
```
User clicks "Generate Draft"
  ↓
"Generating draft..." spinner
  ↓
[60+ seconds of waiting]
  ↓
Draft appears
```

**Problem:** User has no idea what's happening or how long it will take.

### 3. Sequential Processing

**Current flow:**
```
JD Analysis (3.9s)
  ↓
Requirement Analysis (15.4s)
  ↓
Section Gaps (17.9s)
  ↓
Goals & Strengths (6.4s)
  ↓
Phase A (66.5s)
───────────────────
Total: 110s (if sequential)
```

**Actual:** Some parallelization exists, but not optimal.

---

## 💡 Recommended Fixes

### Priority 1: Stream Phase A to User (Biggest UX Win)

**Change:**
```
User clicks "Generate Draft"
  ↓
"Analyzing job..." (3s)
  ↓
"Generating introduction..." ✓ (shown at 5s)
  ↓
"Writing experience section..." ⏳ (shown at 15s)
  ↓
"Crafting closing..." ⏳ (shown at 30s)
  ↓
Draft complete
```

**Impact:**
- Perceived latency: 66s → **5-10s** (85-92% improvement)
- User sees progress in real-time
- No code changes to LLM (already streams internally)

**Effort:** Low (1-2 days)

### Priority 2: Parallelize Analysis Stages (50% Improvement)

**Current:**
```
Sequential: 3.9s + 15.4s + 17.9s + 6.4s = 43.6s
```

**Proposed:**
```
Parallel: 3.9s + max(15.4s, 17.9s, 6.4s) = 21.8s
```

**Impact:** 50% faster (43.6s → 21.8s)

**Effort:** Medium (3-5 days)

### Priority 3: Optimize Prompt Size (30-40% Improvement)

**Current:**
- Includes ALL user stories (~50-100 stories)
- Input tokens: ~15,000-20,000

**Proposed:**
- Use semantic search for top 10 relevant stories
- Input tokens: ~8,000-10,000

**Impact:** 30-40% faster (66.5s → 40-46s)

**Effort:** Medium (3-5 days)

### Priority 4: Parallel Section Generation (60-70% Improvement)

**Current:**
- Generate entire letter in one call

**Proposed:**
- Generate intro, experience, closing in parallel
- Combine at the end

**Impact:** 60-70% faster (66.5s → 20-26s)

**Effort:** High (1-2 weeks)

---

## 📋 Implementation Roadmap

### Week 1 (Quick Wins)
- ✅ Stream Phase A to user
- ✅ Add progress indicators
- **Expected:** Perceived latency 66s → 5-10s

### Week 2-3 (Medium Improvements)
- ✅ Parallelize analysis stages
- ✅ Optimize prompt size (semantic search)
- **Expected:** Total latency 36s → 20-25s

### Month 2-3 (Long-term Optimization)
- ✅ Parallel section generation
- ✅ Model optimization (A/B test gpt-4o-mini)
- **Expected:** Total latency 36s → 10-15s

---

## 🎯 Expected Outcomes

### After Phase 1 (Streaming)
```
Perceived Latency:
Before: ████████████████████████████████████████████████████████████████  66s
After:  █████  5-10s  (85-92% improvement)
```

### After Phase 2 (Parallelization + Optimization)
```
Actual Latency:
Before: ████████████████████████████████████████  36s
After:  ████████████████████████  20-25s  (31-44% improvement)
```

### After Phase 3 (Full Optimization)
```
Actual Latency:
Before: ████████████████████████████████████████  36s
After:  ██████████████  10-15s  (58-72% improvement)
```

---

## 📊 Monitoring

### Key Metrics to Track

1. **P95 latency** (alert if >60s)
2. **Average latency** (alert if >45s)
3. **TTFU (Time to First Update)** (alert if >5s)
4. **Error rate** (alert if >5%)

### SQL Query for Daily Monitoring

```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as drafts,
  ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as p95_seconds
FROM evals_log
WHERE job_type = 'coverLetter' 
  AND stage = 'coverLetter.phaseA'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Summary

**Current State:**
- ❌ 36-40 seconds average (2.4x slower than target)
- ❌ Phase A takes 66.5 seconds (3.3x slower than target)
- ❌ No streaming feedback during Phase A
- ❌ Sequential processing adds unnecessary latency

**Recommended Actions:**
1. **Stream Phase A** → Perceived latency 66s → 5-10s (85-92% improvement)
2. **Parallelize stages** → Total latency 36s → 20-25s (31-44% improvement)
3. **Optimize prompts** → Phase A 66s → 40-46s (30-40% improvement)
4. **Parallel sections** → Phase A 66s → 20-26s (60-70% improvement)

**Expected Final Result:**
- Total latency: 36s → **10-15s** (60-72% improvement)
- Perceived latency: 66s → **3-5s** (streaming)
- User satisfaction: **Significant improvement**

---

**Full Analysis:** `docs/analysis/COVER_LETTER_LATENCY_REPORT.md`
