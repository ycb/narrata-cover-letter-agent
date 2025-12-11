# Timing Breakdown UI - User Guide

**Date:** Dec 9, 2025  
**Feature:** Stage-by-stage performance analysis in `/admin/evaluation`

---

## 🎯 How to View Detailed Timing

### Step 1: Go to `/admin/evaluation`
Navigate to the admin evaluation dashboard.

### Step 2: Click "View Details" on any row
Click the "View Details" button on a resume or cover letter evaluation run.

### Step 3: Scroll to "Performance Breakdown"
You'll see a blue-gradient card with detailed timing breakdown.

---

## 📊 What You'll See

### Visual Progress Bar
A color-coded horizontal bar showing the proportion of time spent in each stage:
- **Blue** - 📄 Text Extraction
- **Indigo** - 🤖 LLM Analysis
- **Purple** - 💾 Database Operations

Each segment shows the percentage of total time.

### Detailed Breakdown Cards

#### 1. 📄 Text Extraction
```
📄 Text Extraction                    1.23s
✨ Cache Hit                           (if applicable)
```

**Shows:**
- Total extraction time
- Whether cached text was used (cache hit = 0ms)

---

#### 2. 🤖 LLM Analysis
```
🤖 LLM Analysis                       37.77s
  • Stage 1 (Skeleton): 5.67s         (resume only)
  • Stage 2 (Stories): 28.90s         (resume only)
  • Stage 3 (Skills): 3.20s           (resume only)
```

**Shows:**
- Total LLM time
- **For resumes:** 3-stage breakdown (skeleton, stories, skills)
- **For cover letters:** Single-stage total

---

#### 3. 💾 Database Operations
```
💾 Database Operations                 8.09s
  • Save Sections: 0.12s              (cover letter only)
  • Companies Upsert: 0.23s
  • Work Items Upsert: 1.23s
  • Stories Insert: 2.34s
  • Gap Heuristics: 0.57s
  • Skills Normalization: 0.23s
```

**Shows:**
- Total database time
- Sub-operations with individual timings
- Only shows operations that ran (>0ms)

---

## 🔍 Example: Resume Upload

**Total Time:** 47.09s

```
┌─────────────────────────────────────────────────────────────┐
│ ⏱️ Performance Breakdown              Total: 47.09s         │
├─────────────────────────────────────────────────────────────┤
│ 📄 Text Extraction                                   1.23s  │
│ ✨ Cache Hit                                                │
├─────────────────────────────────────────────────────────────┤
│ 🤖 LLM Analysis                                     37.77s  │
│   • Stage 1 (Skeleton): 5.67s                               │
│   • Stage 2 (Stories): 28.90s                               │
│   • Stage 3 (Skills): 3.20s                                 │
├─────────────────────────────────────────────────────────────┤
│ 💾 Database Operations                               8.09s  │
│   • Companies Upsert: 0.23s                                 │
│   • Work Items Upsert: 1.23s                                │
│   • Stories Insert: 2.34s                                   │
│   • Gap Heuristics: 0.57s                                   │
│   • Skills Normalization: 0.23s                             │
├─────────────────────────────────────────────────────────────┤
│ Progress Bar:                                               │
│ ▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓░░░          │
│ 3%        Extraction    80%  LLM     17% DB                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Example: Cover Letter Upload

**Total Time:** 15.34s

```
┌─────────────────────────────────────────────────────────────┐
│ ⏱️ Performance Breakdown              Total: 15.34s         │
├─────────────────────────────────────────────────────────────┤
│ 📄 Text Extraction                                   0.00s  │
│ ✨ Cache Hit                                                │
├─────────────────────────────────────────────────────────────┤
│ 🤖 LLM Analysis                                     12.45s  │
├─────────────────────────────────────────────────────────────┤
│ 💾 Database Operations                               2.89s  │
│   • Save Sections: 0.12s                                    │
│   • Gap Heuristics: 0.34s                                   │
│   • Skills Normalization: 0.18s                             │
├─────────────────────────────────────────────────────────────┤
│ Progress Bar:                                               │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░▓░░░░░░░░░          │
│ 0%        Extraction    81%  LLM     19% DB                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚨 Identifying Bottlenecks

### Resume Taking Too Long?
**Check the breakdown:**

| Issue | Possible Cause | Look For |
|-------|---------------|----------|
| Slow extraction (>5s) | Large file, complex PDF | Extraction >3% of total |
| Slow LLM (>60s) | Many roles, OpenAI API slow | LLM >90% of total |
| Slow database (>15s) | Many stories, slow inserts | Database >30% of total |

### Cover Letter Taking Too Long?
**Check the breakdown:**

| Issue | Possible Cause | Look For |
|-------|---------------|----------|
| Slow extraction | Scanned PDF, OCR needed | Extraction >5s |
| Slow LLM | OpenAI API latency | LLM >20s |
| Slow database | Many stories to match | Database >5s |

---

## 💡 Performance Expectations

### Resume (3-5 roles)
- **Extraction:** 1-3s
- **LLM:** 20-40s (varies with role count)
- **Database:** 5-10s
- **Total:** 30-50s

### Resume (10+ roles)
- **Extraction:** 1-3s
- **LLM:** 60-90s (parallel processing helps)
- **Database:** 15-25s
- **Total:** 80-120s

### Cover Letter
- **Extraction:** 0-2s
- **LLM:** 10-20s
- **Database:** 2-5s
- **Total:** 15-25s

---

## 🔧 Troubleshooting

### Timing Breakdown Not Showing?
**Possible reasons:**
1. **Old upload** - Uploaded before timing instrumentation was added
2. **Migration not applied** - Check if `timing_breakdown` column exists
3. **Upload failed** - Check if `total_latency_ms` is null

**Fix:** Upload a new file after migration `20251227_add_timing_breakdown_to_evaluation_runs.sql` is applied.

### Shows "—" for Pipeline?
**Possible reasons:**
1. **PM Level run** - PM levels don't have pipeline timing
2. **Incomplete upload** - Upload may have failed midway
3. **total_latency_ms is null** - Check database

**Fix:** Re-upload the file or check logs for errors.

---

## 📁 Related Documentation
- `/docs/implementation/TIMING_TO_DASHBOARD_COMPLETE.md` - Full implementation details
- `/docs/implementation/STREAMING_ONBOARDING_TIMING_INSTRUMENTATION.md` - Console log format
- Migration: `/supabase/migrations/20251227_add_timing_breakdown_to_evaluation_runs.sql`

---

**Now you can identify performance bottlenecks at a glance!** 🎉


