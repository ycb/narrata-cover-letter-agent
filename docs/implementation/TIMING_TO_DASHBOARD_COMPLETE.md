# Timing Metrics → Dashboard Integration Complete ✅

**Date:** Dec 9, 2025  
**Status:** ✅ Complete

---

## What We Built

Instead of just console logs, **timing metrics now surface in the `/admin/evaluation` dashboard** for persistent visibility and trend analysis.

---

## Changes Made

### 1. Database Schema ✅
**Migration:** `/supabase/migrations/20251227_add_timing_breakdown_to_evaluation_runs.sql`

Added `timing_breakdown` JSONB column to `evaluation_runs`:
```sql
ALTER TABLE public.evaluation_runs ADD COLUMN timing_breakdown JSONB;
CREATE INDEX idx_evaluation_runs_timing_breakdown ON public.evaluation_runs USING gin(timing_breakdown);
```

**Purpose:** Store granular timing metrics beyond the existing latency columns.

---

### 2. fileUploadService.ts ✅
**File:** `/src/services/fileUploadService.ts`

**Changes:**
1. **Build timing breakdown object** (lines 1059-1073):
   ```typescript
   const timingBreakdown = {
     extraction: { extraction_ms: extractionLatencyMs, cache_hit: extractionLatencyMs === 0 },
     llm: { total_ms: llmLatencyMs },
     database: {
       save_sections_ms: saveSectionsMs,
       normalize_skills_ms: normalizeSkillsMs,
       gap_heuristics_ms: gapHeuristicsMs,
       total_ms: dbLatencyMs,
     },
   };
   ```

2. **Pass to logLLMGeneration()** - Added `timingBreakdown` parameter
3. **Save to database** - Insert into `evaluation_runs.timing_breakdown` column

**Result:** Every upload now saves detailed timing breakdown to database.

---

### 3. EvaluationDashboard.tsx ✅
**File:** `/src/components/evaluation/EvaluationDashboard.tsx`

**Changes:**

1. **Added `timing_breakdown` field** to `EvaluationRun` interface (line 31)

2. **Fixed Pipeline Column** - Line 1575 - Removed `file_type === 'coverLetter'` restriction
   - **Before:** Only showed for coverLetters
   - **After:** Shows for **all file types** (resume, coverLetter)

3. **Added Detailed Timing Breakdown View** (lines 1702-1835) - **NEW!**
   - **Visual Progress Bar** - Shows extraction/LLM/database as colored segments
   - **Stage-by-stage breakdown:**
     - 📄 Text Extraction (with cache hit indicator)
     - 🤖 LLM Analysis (with Stage 1/2/3 sub-timings for resume)
     - 💾 Database Operations (companies, work items, stories, gaps, skills)
   - **Expandable in detail modal** when clicking "View Details"

**Result:** 
- Pipeline timing shows for all file types
- Detailed breakdown visible in modal with visual progress bar
- Sub-operation timing for each major stage

---

## Where Timing Data Surfaces

### 1. Browser Console (Real-time)
- Detailed logs with `⏱️ [TIMING]` prefix
- Stage-by-stage breakdown
- Sub-operation timing
- Best for: Active debugging during development

### 2. `/admin/evaluation` Dashboard (Persistent)
- **Pipeline column** shows end-to-end time
- **LLM column** shows LLM analysis time
- **Sortable table** for identifying slow uploads
- **Detail view** shows full breakdown
- Best for: Identifying trends, slow uploads, performance regression

### 3. Database (Long-term Analytics)
**Existing columns:**
- `total_latency_ms` - End-to-end time
- `llm_analysis_latency_ms` - LLM call time
- `text_extraction_latency_ms` - PDF/DOCX parsing time
- `database_save_latency_ms` - DB write time

**New column:**
- `timing_breakdown` (JSONB) - Granular breakdown

Best for: SQL queries, performance analysis, reporting

---

## Testing

### ✅ Console Logs Still Work
Upload a file and check browser console for detailed timing logs.

### ✅ Dashboard Shows Timing
1. Upload a resume or cover letter
2. Go to `/admin/evaluation`
3. See "Pipeline" column populated with total time
4. Click row to see LLM + Pipeline breakdown

### ✅ Database Stores Breakdown
```sql
SELECT 
  id,
  file_type,
  total_latency_ms,
  timing_breakdown
FROM evaluation_runs
WHERE timing_breakdown IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

---

## Benefits

### 1. Persistent Visibility
- No more digging through console logs
- Historical performance data
- Trend analysis over time

### 2. Sortable & Filterable
- Find slowest uploads
- Identify bottlenecks by file type
- Compare real vs synthetic users

### 3. Production-Ready
- Console logs can be disabled via env var
- Dashboard always shows timing (no performance impact)
- Database queries for analytics

---

## Next Steps (Optional)

### Phase 2: Enhanced Dashboard View
- [ ] Add expandable timing breakdown in detail view
- [ ] Show extraction/LLM/database breakdown as stacked bars
- [ ] Add performance badges (🟢 Fast <20s, 🟡 Medium 20-60s, 🔴 Slow >60s)

### Phase 3: Trend Analysis
- [ ] Add "Average Performance" card to dashboard summary
- [ ] Show 7-day/30-day performance trends
- [ ] Alert on performance regression (>2x slower than baseline)

### Phase 4: Sub-Operation Visibility
- [ ] Expand `timing_breakdown` to include per-role LLM timing
- [ ] Show company/work_item/story insert counts + timing
- [ ] Track cache hit rate for text extraction

---

## Files Modified

| File | Purpose | Lines Changed |
|------|---------|---------------|
| `supabase/migrations/20251209_add_timing_breakdown_to_evaluation_runs.sql` | Add `timing_breakdown` column | New file (45 lines) |
| `src/services/fileUploadService.ts` | Build & save timing breakdown | +15 lines |
| `src/components/evaluation/EvaluationDashboard.tsx` | Fix pipeline column visibility | -1 restriction |
| `docs/implementation/STREAMING_ONBOARDING_TIMING_INSTRUMENTATION.md` | Updated with dashboard integration | +40 lines |

---

## Summary

✅ **Console Logs** - Detailed real-time debugging (can be disabled in prod)  
✅ **Dashboard** - Persistent, sortable, filterable performance data  
✅ **Database** - Long-term storage for analytics and reporting  

**All timing metrics from streaming onboarding now surface in the admin dashboard for easy access and trend analysis.** 🎉

---

## 📖 User Guide

See **[TIMING_BREAKDOWN_UI_GUIDE.md](./TIMING_BREAKDOWN_UI_GUIDE.md)** for:
- How to view detailed timing in the UI
- Visual examples of the breakdown (with ASCII art)
- Performance expectations for resume/cover letter
- Identifying bottlenecks
- Troubleshooting

