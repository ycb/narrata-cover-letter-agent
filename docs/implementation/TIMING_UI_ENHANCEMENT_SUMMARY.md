# Timing Breakdown UI Enhancement - Summary

**Date:** Dec 9, 2025  
**Feature:** Visual stage-by-stage performance analysis  
**Location:** `/admin/evaluation` dashboard

---

## 🎯 What Was Delivered

### Visual Performance Breakdown in Detail Modal

When clicking "View Details" on any evaluation run, users now see:

1. **📊 Visual Progress Bar**
   - Color-coded segments showing time distribution
   - Blue (Extraction) / Indigo (LLM) / Purple (Database)
   - Percentages displayed directly on bar

2. **📄 Text Extraction Card**
   - Total extraction time
   - Cache hit indicator (when cached text used)

3. **🤖 LLM Analysis Card**
   - Total LLM time
   - **Resume-specific:** 3-stage breakdown (skeleton, stories, skills)
   - **Cover Letter:** Single-stage total

4. **💾 Database Operations Card**
   - Total database time
   - Sub-operation breakdown:
     - Save Sections (cover letter)
     - Companies Upsert
     - Work Items Upsert
     - Stories Insert
     - Gap Heuristics
     - Skills Normalization
   - Only shows operations that ran (>0ms)

---

## 🔧 Technical Implementation

### Database Schema
**Migration:** `20251227_add_timing_breakdown_to_evaluation_runs.sql`

Added `timing_breakdown` JSONB column:
```json
{
  "extraction": {
    "extraction_ms": 1234,
    "cache_hit": false,
    "checksum_ms": 45
  },
  "llm": {
    "stage1_skeleton_ms": 5678,
    "stage2_stories_ms": 8901,
    "stage3_skills_ms": 2345,
    "total_ms": 16924
  },
  "database": {
    "save_sections_ms": 123,
    "companies_upsert_ms": 234,
    "work_items_upsert_ms": 1234,
    "stories_insert_ms": 2345,
    "gap_heuristics_ms": 567,
    "normalize_skills_ms": 234,
    "total_ms": 4737
  }
}
```

### Frontend Components
**File:** `src/components/evaluation/EvaluationDashboard.tsx`

**Changes:**
1. Added `timing_breakdown` field to `EvaluationRun` interface
2. Created detailed breakdown UI (lines 1702-1835)
3. Added visual progress bar with dynamic width calculation
4. Conditional rendering for different file types (resume vs cover letter)

### Data Population
**File:** `src/services/fileUploadService.ts`

Already implemented in previous commit:
- `logLLMGeneration()` method populates `timing_breakdown` JSONB
- Captures timing from console log instrumentation
- Stores structured breakdown for easy querying

---

## 📊 Example Output

### Resume Upload (47.09s total)

```
⏱️ Performance Breakdown                Total: 47.09s

┌───────────────────────────────────────────────────┐
│ 📄 Text Extraction                         1.23s │
│ ✨ Cache Hit                                     │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│ 🤖 LLM Analysis                           37.77s │
│   • Stage 1 (Skeleton): 5.67s                    │
│   • Stage 2 (Stories): 28.90s                    │
│   • Stage 3 (Skills): 3.20s                      │
└───────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────┐
│ 💾 Database Operations                     8.09s │
│   • Companies Upsert: 0.23s                      │
│   • Work Items Upsert: 1.23s                     │
│   • Stories Insert: 2.34s                        │
│   • Gap Heuristics: 0.57s                        │
│   • Skills Normalization: 0.23s                  │
└───────────────────────────────────────────────────┘

Progress Bar:
[█░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░█░░]
 3%  Extraction    80%  LLM    17% DB
```

---

## ✅ Benefits

### For Admins
- **Identify bottlenecks** at a glance
- **Compare performance** across uploads
- **Spot trends** (LLM slowdowns, database issues)
- **Debug issues** with detailed breakdown

### For Developers
- **Validate optimizations** (caching, parallel processing)
- **Track regression** in performance
- **Understand cost drivers** (LLM time = $$)
- **Prioritize improvements** based on data

### For Product
- **Set SLAs** based on real data
- **Monitor user experience** (upload speed)
- **Plan capacity** for scale

---

## 🔍 How to Access

1. Navigate to `/admin/evaluation`
2. Find a resume or cover letter upload
3. Click **"View Details"** button
4. Scroll to **"⏱️ Performance Breakdown"** section
5. See detailed timing + visual progress bar

---

## 📁 Files Changed

### Database
- `supabase/migrations/20251227_add_timing_breakdown_to_evaluation_runs.sql` - NEW

### Frontend
- `src/components/evaluation/EvaluationDashboard.tsx` - MODIFIED
  - Added `timing_breakdown` field to interface
  - Added visual breakdown component (133 lines)
  - Added progress bar visualization

### Backend (No Changes)
- `src/services/fileUploadService.ts` - Already populating `timing_breakdown` ✅

### Documentation
- `docs/implementation/TIMING_BREAKDOWN_UI_GUIDE.md` - NEW (user guide)
- `docs/implementation/TIMING_TO_DASHBOARD_COMPLETE.md` - UPDATED
- `docs/implementation/TIMING_UI_ENHANCEMENT_SUMMARY.md` - NEW (this file)

---

## 🧪 Testing

### Manual Test Steps
1. Upload a resume via `/onboarding`
2. Wait for processing to complete
3. Go to `/admin/evaluation`
4. Click "View Details" on the latest resume row
5. Verify:
   - ✅ Blue gradient card appears
   - ✅ Shows 3 sections (Extraction, LLM, Database)
   - ✅ LLM shows 3 stages (skeleton, stories, skills)
   - ✅ Database shows sub-operations
   - ✅ Progress bar shows proportional segments
   - ✅ Percentages add up to ~100%

### Expected Results
- **Resume (5 roles):** ~30-50s total, LLM ~70-80%, DB ~15-20%
- **Cover Letter:** ~15-25s total, LLM ~80-85%, DB ~15-20%
- **Cached Upload:** Extraction ~0s (cache hit indicator)

---

## 🚀 Next Steps

### Potential Enhancements
1. **Export to CSV** - Include timing breakdown in CSV export
2. **Trend Charts** - Graph LLM/DB performance over time
3. **Alerting** - Flag uploads >120s as "slow"
4. **Comparison** - Side-by-side comparison of 2 uploads
5. **Optimization Suggestions** - "LLM is slow, consider caching"

### Analytics Queries
```sql
-- Average LLM time by file type
SELECT 
  file_type,
  AVG((timing_breakdown->'llm'->>'total_ms')::numeric) / 1000 as avg_llm_seconds
FROM evaluation_runs
WHERE timing_breakdown IS NOT NULL
GROUP BY file_type;

-- Slowest uploads
SELECT 
  id,
  file_type,
  total_latency_ms / 1000 as total_seconds,
  (timing_breakdown->'llm'->>'total_ms')::numeric / 1000 as llm_seconds
FROM evaluation_runs
WHERE timing_breakdown IS NOT NULL
ORDER BY total_latency_ms DESC
LIMIT 10;
```

---

## 📖 Related Documentation

- **User Guide:** [TIMING_BREAKDOWN_UI_GUIDE.md](./TIMING_BREAKDOWN_UI_GUIDE.md)
- **Implementation:** [TIMING_TO_DASHBOARD_COMPLETE.md](./TIMING_TO_DASHBOARD_COMPLETE.md)
- **Instrumentation:** [STREAMING_ONBOARDING_TIMING_INSTRUMENTATION.md](./STREAMING_ONBOARDING_TIMING_INSTRUMENTATION.md)

---

**Status:** ✅ **COMPLETE AND DEPLOYED**

Now admins can see exactly where time is spent for every upload! 🎉

