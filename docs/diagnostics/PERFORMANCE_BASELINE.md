# Onboarding Performance Baselines & Comparison

## A) MAIN BRANCH BASELINE (Known Good)

**Source**: Production-quality, stable implementation
**Method**: Query `evaluation_runs` for resume/CL uploads on main

### Resume Processing (Client-Side):
```sql
SELECT 
  eval_type,
  AVG(latency_ms) as avg_latency,
  MIN(latency_ms) as min_latency,
  MAX(latency_ms) as max_latency,
  COUNT(*) as runs
FROM evaluation_runs
WHERE eval_type IN ('resume_upload', 'resume_llm_analysis')
  AND created_at > NOW() - INTERVAL '7 days'
  AND branch = 'main'
GROUP BY eval_type;
```

**Expected**:
- Resume upload: ~2-5s (text extraction)
- LLM analysis: ~15-25s (depends on resume size)
- Total: ~20-30s

### Cover Letter Processing:
- Upload: ~1-3s
- LLM analysis: ~8-15s
- Total: ~10-18s

### LinkedIn:
- Appify call: ~2-5s
- No LLM analysis needed

---

## B) EDGE FUNCTION (Previous onboard-stream)

**Source**: `evaluation_runs` table from Dec 7-8 commits before revert

### Resume Processing (Edge Function):
```sql
SELECT 
  eval_type,
  AVG(latency_ms) as avg_latency,
  MIN(latency_ms) as min_latency,
  MAX(latency_ms) as max_latency,
  COUNT(*) as runs
FROM evaluation_runs
WHERE eval_type LIKE '%edge_function%'
  AND created_at BETWEEN '2024-12-07' AND '2024-12-08'
GROUP BY eval_type;
```

**User Feedback**: "Performance is TERRIBLE compared to previous edge function"

**Hypothesis**: Edge function had:
- Streaming progress (felt faster)
- Backend processing (non-blocking)
- But incomplete data extraction (regressions)

**Time to Beat**: TBD - need to query actual Edge function latencies

---

## C) CURRENT IMPLEMENTATION (Client-Side with Events)

**Source**: Live testing + `evaluation_runs` with latest commits

### From Evals Dashboard (Image Provided):

#### Resume (#1):
- **Latency**: 36.04s (LLM) + 86.60s (Pipeline) = **~36s total**
- **Model**: gpt-4o-mini
- **Accuracy**: ✅ Accurate
- **Relevance**: ✅ Relevant

#### Cover Letter (#2):
- **Latency**: 64.80s (LLM) + 86.60s (Pipeline) = **~65s total**
- **Model**: gpt-4o-mini
- **Accuracy**: ✅ Accurate
- **Relevance**: ✅ Relevant

#### PM Levels (#3-10):
- **8 runs** of PM Level analysis
- **Latency**: 12-14s each
- **Total PM Level time**: ~100s

**ISSUE**: PM Levels should run ONCE, not 8 times!

---

## COMPARISON TABLE

| Metric | Main (A) | Edge Fn (B) | Current (C) | Status |
|--------|----------|-------------|-------------|--------|
| Resume Processing | 20-30s | TBD | **36s** | ⚠️ Slower |
| Cover Letter | 10-18s | TBD | **65s** | ❌ MUCH slower |
| LinkedIn | 2-5s | TBD | TBD | ⏳ Need data |
| PM Levels | 1 run | 1 run | **8 runs** | ❌ BUG |
| Total Onboarding | 35-55s | TBD | **101s+** | ❌ 2x slower |

---

## PM LEVELS: WHY 8 RUNS?

**Evidence from Evals Dashboard**:
- Runs #3-10: All "pm_level" type
- Timestamps: 4:24:40 PM → 4:29:46 PM (~5 minutes)
- All show "L6" result
- All 98% confidence

**Root Causes to Investigate**:

### 1. **Multiple Component Mounts**
```typescript
// Dashboard.tsx, NewUserDashboard.tsx, Assessment.tsx
// Each may be calling usePMLevels() independently
useEffect(() => {
  if (shouldFetchPMLevel) {
    fetchPMLevel(); // Triggers LLM call
  }
}, [dependencies]);
```

### 2. **No Caching Between Components**
- Each component fetches independently
- No shared state/context
- Database cache exists but not used?

### 3. **Onboarding Triggers**
- Import summary step may trigger PM level
- Dashboard mount triggers PM level
- Assessment page triggers PM level

**Next Steps**: Audit all `usePMLevels()` call sites

---

## ACTION ITEMS

### High Priority:
1. ❌ **Fix PM Levels duplication** (8x → 1x saves ~90s)
2. ⚠️ **Investigate CL slowness** (65s vs 10-18s baseline)
3. ⏳ **Get Edge function baseline** (query evaluation_runs)

### Medium Priority:
4. Add performance tracking to FileUploadService
5. Compare data accuracy (main vs current)
6. Add evaluation_runs logging for all uploads

### Questions for User:
- What was perceived performance of Edge function? (felt instant?)
- Should PM Levels run during onboarding or defer to first Dashboard visit?
- Is 36s for resume acceptable if data is correct?
