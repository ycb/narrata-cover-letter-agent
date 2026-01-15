# Cover Letter Draft Creation - Latency Report

**Date:** 2026-01-15  
**Data Source:** `evals_log` table (last 30 days)  
**Sample Size:** 73 cover letter drafts

---

## Executive Summary

### End-to-End Latency (Complete Draft Creation)

| Metric | Time | Status |
|--------|------|--------|
| **Average** | **36.0 seconds** | ⚠️ Slow |
| **Median (P50)** | **39.8 seconds** | ⚠️ Slow |
| **P95** | **55.1 seconds** | ❌ Very Slow |

**Key Finding:** Cover letter draft creation takes 36-40 seconds on average, with 5% of drafts taking nearly a minute.

---

## Detailed Breakdown by Stage

### 1. Phase A (Initial Draft Generation)

**Stage:** `coverLetter.phaseA`  
**Description:** Main LLM call to generate cover letter draft

| Metric | Time (ms) | Time (seconds) |
|--------|-----------|----------------|
| Average | 66,482 ms | **66.5 seconds** |
| Median | 67,140 ms | **67.1 seconds** |
| P95 | 86,115 ms | **86.1 seconds** |
| Min | 42,620 ms | 42.6 seconds |
| Max | 87,250 ms | 87.3 seconds |

**Sample Size:** 23 executions  
**Status:** ❌ **Critical - This is the slowest stage**

### 2. Section Gaps Analysis

**Stage:** `sectionGaps`  
**Description:** Identifies gaps in cover letter sections

| Metric | Time (ms) | Time (seconds) |
|--------|-----------|----------------|
| Average | 17,914 ms | **17.9 seconds** |
| Median | 17,322 ms | **17.3 seconds** |
| P95 | 25,560 ms | **25.6 seconds** |
| Min | 10,555 ms | 10.6 seconds |
| Max | 28,702 ms | 28.7 seconds |

**Sample Size:** 59 executions  
**Status:** ⚠️ **Slow**

### 3. Requirement Analysis

**Stage:** `requirementAnalysis`  
**Description:** Analyzes job requirements vs user experience

| Metric | Time (ms) | Time (seconds) |
|--------|-----------|----------------|
| Average | 15,396 ms | **15.4 seconds** |
| Median | 14,603 ms | **14.6 seconds** |
| P95 | 21,668 ms | **21.7 seconds** |
| Min | 9,654 ms | 9.7 seconds |
| Max | 25,201 ms | 25.2 seconds |

**Sample Size:** 59 executions  
**Status:** ⚠️ **Slow**

### 4. Goals and Strengths Analysis

**Stage:** `goalsAndStrengths`  
**Description:** Matches user goals with job requirements

| Metric | Time (ms) | Time (seconds) |
|--------|-----------|----------------|
| Average | 6,404 ms | **6.4 seconds** |
| Median | 6,160 ms | **6.2 seconds** |
| P95 | 9,021 ms | **9.0 seconds** |
| Min | 4,332 ms | 4.3 seconds |
| Max | 9,731 ms | 9.7 seconds |
| **TTFU** | 4,476 ms | **4.5 seconds** |

**Sample Size:** 59 executions  
**Status:** ✅ **Acceptable** (streaming starts in ~4.5s)

### 5. Job Description Analysis

**Stage:** `jdAnalysis`  
**Description:** Parses and analyzes job description

| Metric | Time (ms) | Time (seconds) |
|--------|-----------|----------------|
| Average | 3,856 ms | **3.9 seconds** |
| Median | 3,309 ms | **3.3 seconds** |
| P95 | 5,934 ms | **5.9 seconds** |
| Min | 128 ms | 0.1 seconds |
| Max | 43,672 ms | 43.7 seconds |
| **TTFU** | 728 ms | **0.7 seconds** |

**Sample Size:** 73 executions  
**Status:** ✅ **Good** (streaming starts in <1s)

### 6. Draft Readiness Judge

**Stage:** `draft_readiness_judge`  
**Description:** Evaluates if draft is ready for user review

| Metric | Time (ms) | Time (seconds) |
|--------|-----------|----------------|
| Average | 3,065 ms | **3.1 seconds** |
| Median | 2,889 ms | **2.9 seconds** |
| P95 | 4,776 ms | **4.8 seconds** |
| Min | 1,519 ms | 1.5 seconds |
| Max | 13,432 ms | 13.4 seconds |

**Sample Size:** 684 executions  
**Status:** ✅ **Good**

---

## Latency Trends (Last 14 Days)

### Phase A Latency by Date

| Date | Count | Avg (s) | Median (s) | P95 (s) |
|------|-------|---------|------------|---------|
| 2026-01-14 | 1 | **87.0** | 87.0 | 87.0 |
| 2026-01-12 | 3 | **50.0** | 45.0 | 60.6 |
| 2026-01-09 | 2 | **66.4** | 66.4 | 71.2 |
| 2026-01-08 | 4 | **70.4** | 71.8 | 77.2 |
| 2026-01-07 | 4 | **69.6** | 70.5 | 71.6 |
| 2026-01-06 | 1 | **55.2** | 55.2 | 55.2 |

**Trend:** Latency is **inconsistent**, ranging from 50-87 seconds.

### Section Gaps Latency by Date

| Date | Count | Avg (s) | Median (s) | P95 (s) |
|------|-------|---------|------------|---------|
| 2026-01-14 | 2 | 17.4 | 17.4 | 17.4 |
| 2026-01-12 | 6 | 20.3 | 21.4 | 21.5 |
| 2026-01-09 | 4 | 15.6 | 15.6 | 16.9 |
| 2026-01-08 | 8 | 21.2 | 22.6 | 26.7 |
| 2026-01-07 | 8 | 17.1 | 17.1 | 18.7 |
| 2026-01-06 | 2 | 14.7 | 14.7 | 14.7 |

**Trend:** Relatively **stable** at 15-21 seconds.

---

## Performance Analysis

### Critical Issues

1. **Phase A is the bottleneck** (66.5s average):
   - Takes 2x longer than all other stages combined
   - Highly variable (42-87 seconds)
   - No streaming (user waits for full completion)

2. **Total latency is too high** (36-40s):
   - Users expect <10s for draft generation
   - Current latency is 4-6x slower than target

3. **No Time-to-First-Update (TTFU) for Phase A**:
   - User sees loading spinner for 60+ seconds
   - No feedback during generation

### What's Working

1. **JD Analysis is fast** (3.9s average):
   - Streams in <1 second (TTFU: 728ms)
   - Good user experience

2. **Draft Readiness Judge is efficient** (3.1s average):
   - Runs frequently (684 times)
   - Consistent performance

3. **Goals Analysis streams quickly** (TTFU: 4.5s):
   - User sees results within 5 seconds

---

## Root Cause Analysis

### Why is Phase A so slow?

1. **Large prompt size:**
   - Includes full job description
   - Includes user's complete work history
   - Includes all stories and achievements
   - Likely 10,000-20,000 tokens input

2. **Long output generation:**
   - Generates complete cover letter (500-1000 words)
   - Multiple sections with detailed content
   - Likely 1,000-2,000 tokens output

3. **No streaming to user:**
   - Even though LLM streams internally
   - UI doesn't show progress during Phase A

4. **Sequential processing:**
   - Phase A must complete before other stages start
   - No parallelization

### Why is Section Gaps slow?

1. **Runs after Phase A:**
   - Analyzes generated draft for gaps
   - Requires full draft context

2. **Multiple LLM calls:**
   - One call per section (4-5 sections)
   - Each call takes 3-5 seconds

---

## Recommendations

### Priority 1: Reduce Phase A Latency (Target: <30s)

**Option 1: Optimize Prompt Size**
- Reduce input context (only relevant stories, not all)
- Use semantic search to find top 5-10 relevant stories
- Expected improvement: 30-40% faster (46s → 40s)

**Option 2: Stream Phase A to User**
- Show draft sections as they're generated
- User sees progress in real-time
- Perceived latency: 5-10s (TTFU) instead of 66s

**Option 3: Use Faster Model**
- Switch from gpt-4o to gpt-4o-mini for Phase A
- Expected improvement: 50-60% faster (66s → 26-33s)
- Trade-off: Slightly lower quality

**Option 4: Parallel Section Generation**
- Generate intro, experience, closing in parallel
- Combine at the end
- Expected improvement: 60-70% faster (66s → 20-26s)

### Priority 2: Parallelize Analysis Stages (Target: <10s total)

Currently sequential:
```
jdAnalysis (3.9s) → requirementAnalysis (15.4s) → sectionGaps (17.9s) → goalsAndStrengths (6.4s)
Total: 43.6s
```

Proposed parallel:
```
jdAnalysis (3.9s) → [requirementAnalysis (15.4s) || sectionGaps (17.9s) || goalsAndStrengths (6.4s)]
Total: 3.9s + 17.9s = 21.8s (50% improvement)
```

### Priority 3: Add Progress Indicators

**Current UX:**
- User sees "Generating draft..." for 60+ seconds
- No feedback on what's happening

**Proposed UX:**
```
✓ Analyzing job description... (3s)
✓ Matching your experience... (15s)
⏳ Generating cover letter draft... (40s)
  → Introduction... ✓
  → Experience section... ⏳
  → Closing... pending
```

### Priority 4: Cache Intermediate Results

**Cacheable stages:**
- JD Analysis (if same JD used multiple times)
- User's work history analysis (rarely changes)
- Goals and strengths (rarely changes)

**Expected improvement:** 20-30% faster for repeat drafts

---

## Performance Targets

### Current vs Target

| Stage | Current | Target | Gap |
|-------|---------|--------|-----|
| **Total End-to-End** | 36-40s | **<15s** | -60% |
| Phase A | 66.5s | **<20s** | -70% |
| Section Gaps | 17.9s | **<5s** | -72% |
| Requirement Analysis | 15.4s | **<5s** | -68% |
| Goals & Strengths | 6.4s | **<3s** | -53% |
| JD Analysis | 3.9s | **<3s** | ✅ Good |

### Stretch Goals

| Metric | Target | Stretch Goal |
|--------|--------|--------------|
| Average latency | <15s | **<10s** |
| P95 latency | <25s | **<15s** |
| TTFU (Phase A) | N/A | **<3s** |

---

## Implementation Priority

### Phase 1 (Quick Wins - 1 week)

1. **Stream Phase A to user** (biggest UX improvement)
   - Show sections as they're generated
   - Add progress indicators
   - Expected: Perceived latency drops from 66s → 5-10s

2. **Parallelize analysis stages**
   - Run requirementAnalysis, sectionGaps, goalsAndStrengths in parallel
   - Expected: Total latency drops from 43s → 22s

### Phase 2 (Medium-term - 2-3 weeks)

3. **Optimize prompt size**
   - Use semantic search for relevant stories
   - Reduce input tokens by 50%
   - Expected: Phase A drops from 66s → 40-50s

4. **Add caching**
   - Cache JD analysis results
   - Cache user work history analysis
   - Expected: 20-30% improvement for repeat drafts

### Phase 3 (Long-term - 1-2 months)

5. **Parallel section generation**
   - Generate intro, experience, closing in parallel
   - Expected: Phase A drops from 66s → 20-26s

6. **Model optimization**
   - A/B test gpt-4o vs gpt-4o-mini
   - Evaluate quality vs speed trade-off

---

## Monitoring & Alerts

### Key Metrics to Track

1. **P95 latency** (alert if >60s)
2. **Average latency** (alert if >45s)
3. **TTFU** (alert if >5s for any stage)
4. **Error rate** (alert if >5%)

### Dashboard Queries

```sql
-- Daily latency summary
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
- ❌ Average latency: 36-40 seconds (target: <15s)
- ❌ Phase A: 66.5 seconds (target: <20s)
- ❌ No streaming for Phase A (poor UX)
- ✅ JD Analysis: 3.9 seconds (good)

**Recommended Actions:**
1. **Immediate:** Stream Phase A to user (biggest UX win)
2. **Short-term:** Parallelize analysis stages (50% improvement)
3. **Medium-term:** Optimize prompt size (30-40% improvement)
4. **Long-term:** Parallel section generation (60-70% improvement)

**Expected Outcome:**
- Total latency: 36s → **10-15s** (60-72% improvement)
- Perceived latency: 66s → **3-5s** (streaming)
- User satisfaction: Significant improvement

---

**Files Referenced:**
- Database: `evals_log` table
- Related: `evaluation_runs` table (file upload latency)
