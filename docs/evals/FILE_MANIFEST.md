# Evals V1.1 — Complete File Manifest

**Generated:** December 4, 2025  
**Total Files:** 25 (14 code/migrations, 11 documentation)

---

## PHASE 1: Database Schema (4 files)

### Migrations

1. **`supabase/migrations/029_create_evals_log.sql`** (141 lines)
   - Creates `evals_log` table
   - 8 indexes (job_id, created_at, composite, etc.)
   - 3 RLS policies (read own, system insert/update)
   - CHECK constraints on job_type and environment

2. **`supabase/migrations/030_add_evals_aggregate_functions.sql`** (206 lines)
   - `get_evals_aggregate_by_job_type()` — Job-level metrics
   - `get_evals_aggregate_by_stage()` — Stage-level metrics
   - `get_evals_quality_score_distribution()` — Score histogram
   - `get_evals_recent_failures()` — Error debugging

### Tests

3. **`supabase/migrations/__tests__/test_evals_migrations.sql`** (228 lines)
   - 6 automated tests
   - Table existence, indexes, constraints, RLS

### Documentation

4. **`supabase/migrations/EVALS_MIGRATIONS_README.md`** (docs)

---

## PHASE 2: Structural Validators (4 files)

### Code

5. **`supabase/functions/_shared/evals/types.ts`** (~120 lines)
   - `EvalCheck` interface
   - `StructuralEvalResult` interface
   - `LogEvalPayload` interface
   - `EvalSeverity` type
   - `SEVERITY_WEIGHTS` constant

6. **`supabase/functions/_shared/evals/validators.ts`** (~280 lines)
   - `validateCoverLetterResult()` — 8 checks
   - `validatePMLevelsResult()` — 5 checks
   - `calculateQualityScore()` — Weighted scoring

### Tests

7. **`supabase/functions/_shared/evals/__tests__/validators.test.ts`** (~380 lines)
   - 17 unit tests
   - Cover letter validation (8 tests)
   - PM levels validation (5 tests)
   - Quality scoring (4 tests)

### Documentation

8. **`supabase/functions/_shared/evals/README.md`** (docs)

---

## PHASE 3: Pipeline Instrumentation (3 files)

### Code

9. **`supabase/functions/_shared/evals/log.ts`** (~160 lines)
   - `logEval()` — Main logging function
   - `voidLogEval()` — Fire-and-forget wrapper
   - `elog` — Console logger
   - Auto-detects environment
   - Auto-calculates duration

### Modified Files

10. **`supabase/functions/_shared/pipelines/cover-letter.ts`** (modified)
    - Instrumented 4 stages: jdAnalysis, requirementAnalysis, goalsAndStrengths, sectionGaps
    - Final structural validation stage
    - Captures timestamps for duration calculation

11. **`supabase/functions/_shared/pipelines/pm-levels.ts`** (modified)
    - Instrumented 3 stages: baselineAssessment, competencyBreakdown, specializationAssessment
    - Final structural validation stage
    - Refactored from `executePipeline` to manual stage execution

---

## PHASE 4: Frontend Service Layer (2 files)

### Code

12. **`src/services/evalsService.ts`** (~450 lines)
    - `EvalsService` class
    - 9 static methods
    - 7 TypeScript interfaces
    - Error handling with console logging
    - CSV export utility

### Documentation

13. **`src/services/EVALS_SERVICE_README.md`** (docs)
    - API reference
    - Usage examples
    - Performance notes

---

## PHASE 5: Dashboard Components (9 files)

### Hooks

14. **`src/components/evaluation/hooks/useEvalsData.ts`** (~150 lines)
    - `useJobTypeAggregates()` hook
    - `useStageAggregates()` hook
    - `useQualityDistribution()` hook
    - `useRecentFailures()` hook
    - Cancellation support

### Components

15. **`src/components/evaluation/pipeline/JobTypeFilter.tsx`** (~30 lines)
    - Dropdown filter (All, Cover Letter, PM Levels)

16. **`src/components/evaluation/pipeline/LatencyOverviewCard.tsx`** (~90 lines)
    - P50/P90/P99 latency display
    - Success rate badges
    - Quality scores

17. **`src/components/evaluation/pipeline/StageLatencyChart.tsx`** (~160 lines)
    - Stage-by-stage breakdown
    - CSS bar charts
    - TTFU display

18. **`src/components/evaluation/pipeline/StructuralChecksCard.tsx`** (~130 lines)
    - Quality score histogram
    - Color-coded buckets
    - Progress bars

19. **`src/components/evaluation/pipeline/ErrorTable.tsx`** (~190 lines)
    - Recent failures table
    - Expandable rows
    - Error details

20. **`src/components/evaluation/pipeline/ExportButton.tsx`** (~50 lines)
    - CSV export button
    - Auto-download

### Root Dashboard

21. **`src/components/evaluation/PipelineEvaluationDashboard.tsx`** (~110 lines)
    - Main dashboard component
    - Time range filter
    - Job type filter
    - Orchestrates all child components

---

## DOCUMENTATION (11 files)

### Planning & Specs

22. **`docs/evals/EVALS_AUDIT_SUMMARY.md`** (~500 lines)
    - Executive summary
    - Job types and stages mapping
    - Implementation phases

23. **`docs/evals/EVALS_V1_1_IMPLEMENTATION_SPEC.md`** (~1,200 lines)
    - Complete technical spec
    - Database schema
    - Type definitions
    - Pipeline instrumentation patterns
    - Service layer
    - Dashboard refactor

24. **`docs/evals/QUICK_REFERENCE.md`** (~200 lines)
    - Developer cheat sheet
    - Stage names
    - Structural checks
    - File locations

25. **`docs/evals/MIGRATION_GUIDE.md`** (~400 lines)
    - Step-by-step migration phases
    - Rollout timeline
    - Risk assessment
    - Rollback plans

### Phase Summaries

26. **`docs/evals/PHASE_1_PR_SUMMARY.md`** (~300 lines)
27. **`docs/evals/PHASE_2_PR_SUMMARY.md`** (~400 lines)
28. **`docs/evals/PHASE_3_PR_SUMMARY.md`** (~350 lines)
29. **`docs/evals/PHASE_4_PR_SUMMARY.md`** (~400 lines)
30. **`docs/evals/PHASE_5_PR_SUMMARY.md`** (~500 lines)

### Index & Completion

31. **`docs/evals/README.md`** (index)
32. **`docs/evals/EVALS_V1_1_COMPLETE.md`** (~300 lines)
33. **`docs/evals/FILE_MANIFEST.md`** (this file)

---

## FILE LOCATIONS (Directory Tree)

```
/Users/admin/narrata/
├── docs/
│   └── evals/
│       ├── README.md
│       ├── EVALS_AUDIT_SUMMARY.md
│       ├── EVALS_V1_1_IMPLEMENTATION_SPEC.md
│       ├── QUICK_REFERENCE.md
│       ├── MIGRATION_GUIDE.md
│       ├── PHASE_1_PR_SUMMARY.md
│       ├── PHASE_2_PR_SUMMARY.md
│       ├── PHASE_3_PR_SUMMARY.md
│       ├── PHASE_4_PR_SUMMARY.md
│       ├── PHASE_5_PR_SUMMARY.md
│       ├── EVALS_V1_1_COMPLETE.md
│       └── FILE_MANIFEST.md
├── src/
│   ├── components/
│   │   └── evaluation/
│   │       ├── PipelineEvaluationDashboard.tsx
│   │       ├── hooks/
│   │       │   └── useEvalsData.ts
│   │       └── pipeline/
│   │           ├── JobTypeFilter.tsx
│   │           ├── LatencyOverviewCard.tsx
│   │           ├── StageLatencyChart.tsx
│   │           ├── StructuralChecksCard.tsx
│   │           ├── ErrorTable.tsx
│   │           └── ExportButton.tsx
│   └── services/
│       ├── evalsService.ts
│       └── EVALS_SERVICE_README.md
└── supabase/
    ├── functions/
    │   └── _shared/
    │       ├── evals/
    │       │   ├── types.ts
    │       │   ├── validators.ts
    │       │   ├── log.ts
    │       │   ├── README.md
    │       │   └── __tests__/
    │       │       └── validators.test.ts
    │       └── pipelines/
    │           ├── cover-letter.ts (modified)
    │           └── pm-levels.ts (modified)
    └── migrations/
        ├── 029_create_evals_log.sql
        ├── 030_add_evals_aggregate_functions.sql
        ├── EVALS_MIGRATIONS_README.md
        └── __tests__/
            └── test_evals_migrations.sql
```

---

## LINES OF CODE

### Code Files (14 files)

| File | Lines | Type |
|------|-------|------|
| `029_create_evals_log.sql` | 141 | SQL |
| `030_add_evals_aggregate_functions.sql` | 206 | SQL |
| `test_evals_migrations.sql` | 228 | SQL |
| `types.ts` | 120 | TS |
| `validators.ts` | 280 | TS |
| `validators.test.ts` | 380 | TS |
| `log.ts` | 160 | TS |
| `cover-letter.ts` | ~1,500 | TS (modified) |
| `pm-levels.ts` | ~800 | TS (modified) |
| `evalsService.ts` | 450 | TS |
| `useEvalsData.ts` | 150 | TSX |
| `Pipeline components (6)` | ~660 | TSX |
| `PipelineEvaluationDashboard.tsx` | 110 | TSX |

**Total Code:** ~5,200 lines (new + modified)

### Documentation Files (11 files)

| File | Lines |
|------|-------|
| All phase summaries + specs | ~4,500 |

**Total Documentation:** ~4,500 lines

### Grand Total

**~9,700 lines** across 25 files (code + docs + tests)

---

## GIT STATUS (New Files Only)

```
?? docs/evals/
?? src/components/evaluation/PipelineEvaluationDashboard.tsx
?? src/components/evaluation/hooks/
?? src/components/evaluation/pipeline/
?? src/services/evalsService.ts
?? supabase/functions/_shared/evals/
?? supabase/migrations/029_create_evals_log.sql
?? supabase/migrations/030_add_evals_aggregate_functions.sql
```

Plus 2 modified files:
- `supabase/functions/_shared/pipelines/cover-letter.ts`
- `supabase/functions/_shared/pipelines/pm-levels.ts`

---

## DEPLOYMENT ORDER

1. Apply migrations (029, 030)
2. Verify tests pass
3. Deploy edge functions (instrumented pipelines)
4. Deploy frontend (service + dashboard)
5. Add route to app router
6. Test end-to-end

---

**File Manifest Complete** ✅  
**Ready for Deployment** ✅

