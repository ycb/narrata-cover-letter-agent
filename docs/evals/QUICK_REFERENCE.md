# EVALS V1.1 — QUICK REFERENCE CARD

**Last Updated:** December 4, 2025

---

## 🎯 GOAL

Add deterministic structural quality checks + latency tracking to `coverLetter` and `pmLevels` pipelines.

---

## 📋 WHAT TO BUILD

### 1. Database (2 migrations)

```sql
-- Migration 029: evals_log table
CREATE TABLE evals_log (
  id UUID PRIMARY KEY,
  job_id UUID,
  job_type TEXT,
  stage TEXT,
  user_id UUID,
  environment TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INT,
  success BOOLEAN,
  quality_checks JSONB,
  quality_score INT
);

-- Migration 030: Aggregate functions
CREATE FUNCTION get_evals_aggregate_by_job_type(...);
CREATE FUNCTION get_evals_aggregate_by_stage(...);
```

---

### 2. Types (`/supabase/functions/_shared/evals/types.ts`)

```typescript
interface EvalCheck {
  name: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  expected?: string;
  actual?: string;
}

interface StructuralEvalResult {
  passed: boolean; // true only if all critical checks pass
  checks: EvalCheck[];
}
```

---

### 3. Validators (`/supabase/functions/_shared/evals/validators.ts`)

```typescript
export function validateCoverLetterResult(result): StructuralEvalResult {
  // 8 checks: 4 critical, 2 high, 2 medium
  // Critical: role insights, core reqs, req analysis, MWS score
}

export function validatePMLevelsResult(result): StructuralEvalResult {
  // 5 checks: 3 critical, 1 high, 1 medium
  // Critical: IC level, 4 competencies, value ranges
}

export function calculateQualityScore(result): number {
  // Weighted: critical=3x, high=2x, medium=1x
}
```

---

### 4. Logger (`/supabase/functions/_shared/evals/log.ts`)

```typescript
export async function logEval(
  supabase: SupabaseClient,
  payload: LogEvalPayload
): Promise<void> {
  // Best-effort, non-blocking
  // Wraps in try/catch, logs errors via elog
}

export function voidLogEval(...): void {
  // void pattern for fire-and-forget
}
```

---

### 5. Pipeline Integration

**Pattern for each stage:**

```typescript
const stageStart = Date.now();
try {
  telemetry?.startStage('stageName');
  const result = await stageExecute(context);
  telemetry?.endStage(true);
  
  // Log success
  voidLogEval(supabase, {
    job_id: job.id,
    job_type: 'coverLetter',
    stage: 'stageName',
    user_id: job.user_id,
    started_at: new Date(stageStart),
    completed_at: new Date(),
    duration_ms: Date.now() - stageStart,
    success: true,
    result_subset: { key: 'value' },
  });
} catch (error) {
  telemetry?.endStage(false);
  
  // Log failure
  voidLogEval(supabase, {
    job_id: job.id,
    stage: 'stageName',
    success: false,
    error_type: error.name,
    error_message: error.message,
  });
}
```

**Final structural validation:**

```typescript
// After all stages complete, before telemetry.complete()
const structuralResult = validateCoverLetterResult(finalResult);
const qualityScore = calculateQualityScore(structuralResult);

voidLogEval(supabase, {
  job_id: job.id,
  stage: 'structural_checks',
  success: structuralResult.passed,
  quality_checks: structuralResult,
  quality_score: qualityScore,
});
```

---

### 6. Service Layer (`/src/services/evalsService.ts`)

```typescript
export class EvalsService {
  static async getAggregateByJobType(days = 7): Promise<...> {
    // Call DB function
  }
  
  static async getAggregateByStage(jobType?, days = 7): Promise<...> {
    // Call DB function
  }
  
  static async getRecentFailures(jobType?, limit = 50): Promise<...> {
    // Query evals_log
  }
  
  static async getEvalsForJob(jobId): Promise<...> {
    // Query evals_log
  }
}
```

---

### 7. Dashboard Components

**Structure:**

```
/src/components/evaluation/
├── EvaluationDashboard.tsx         (Root)
├── JobTypeFilter.tsx               (Dropdown)
├── LatencyOverviewCard.tsx         (P50/P90/P99)
├── StageLatencyChart.tsx           (Bar chart)
├── StructuralChecksCard.tsx        (Quality table)
├── ErrorTable.tsx                  (Recent failures)
├── ExportButton.tsx                (CSV)
└── hooks/
    └── useEvalsData.ts             (Fetch from evalsService)
```

**Data Flow:**

```
evalsService.ts → useEvalsData hook → Dashboard components
```

---

## 🚫 DO NOT

- ❌ Instrument onboarding pipeline
- ❌ Add LLM-as-judge semantic checks
- ❌ Modify `jobs` table schema
- ❌ Rewrite `useJobStream` hook
- ❌ Change job type or stage names
- ❌ Extend `evaluation_runs` table

---

## ✅ STAGE NAMES (MUST MATCH EXACTLY)

### Cover Letter

- `jdAnalysis`
- `requirementAnalysis`
- `goalsAndStrengths`
- `sectionGaps`
- `structural_checks` (new)

### PM Levels

- `baselineAssessment`
- `competencyBreakdown`
- `specializationAssessment`
- `structural_checks` (new)

---

## 📊 STRUCTURAL CHECKS

### Cover Letter (8 checks)

| Check | Severity | Rule |
|-------|----------|------|
| Role Insights Present | Critical | `roleInsights.inferredRoleLevel` not null |
| Core Reqs Extracted | Critical | `jdRequirementSummary.coreTotal >= 1` |
| Req Analysis Complete | Critical | `requirements.coreRequirements.length >= 1` |
| MWS Score Valid | Critical | `mws.summaryScore in [0,1,2,3]` |
| Company Context | High | `companyContext.industry` present |
| Section Gaps | High | `gapCount >= 0` |
| Total Reqs Count | Medium | `totalRequirements >= 3` |
| Goal Alignment | Medium | `goalAlignment` not null |

### PM Levels (5 checks)

| Check | Severity | Rule |
|-------|----------|------|
| IC Level Valid | Critical | `icLevel in [3-9]` |
| 4 Competencies | Critical | All 4 keys present |
| Competency Values | Critical | All values in [0-10] |
| Assessment ID | High | `assessmentId` not empty |
| Specializations | Medium | Array present |

---

## 🗂️ FILE LOCATIONS

### Backend

```
/supabase/functions/_shared/evals/
├── types.ts                        (TypeScript types)
├── validators.ts                   (Structural checks)
└── log.ts                          (logEval helper)

/supabase/functions/_shared/pipelines/
├── cover-letter.ts                 (Instrument)
└── pm-levels.ts                    (Instrument)

/supabase/migrations/
├── 029_create_evals_log.sql
└── 030_add_evals_aggregate_functions.sql
```

### Frontend

```
/src/services/
└── evalsService.ts                 (Data layer)

/src/components/evaluation/
├── EvaluationDashboard.tsx
├── JobTypeFilter.tsx
├── LatencyOverviewCard.tsx
├── StageLatencyChart.tsx
├── StructuralChecksCard.tsx
├── ErrorTable.tsx
├── ExportButton.tsx
└── hooks/
    └── useEvalsData.ts
```

---

## ⏱️ ESTIMATED EFFORT

| Task | Hours |
|------|-------|
| DB migrations | 2-3 |
| Validators | 3-4 |
| Logger | 2-3 |
| Pipeline instrumentation | 4-6 |
| Service layer | 2-3 |
| Dashboard refactor | 6-8 |
| Testing | 4-6 |
| **TOTAL** | **21-30** |

**Timeline:** 4-5 days (single developer)

---

## 🧪 TESTING CHECKLIST

- [ ] Create `evals_log` table in dev
- [ ] Run 5 cover letter jobs
- [ ] Run 5 PM levels jobs
- [ ] Verify 10+ rows in `evals_log`
- [ ] Verify `quality_checks` populated
- [ ] Load dashboard, verify charts render
- [ ] Filter by job type
- [ ] Export CSV
- [ ] Deploy to staging
- [ ] Monitor for 7 days
- [ ] Deploy to production

---

## 📚 REFERENCE DOCS

- **Implementation Spec:** `EVALS_V1_1_IMPLEMENTATION_SPEC.md`
- **Audit Summary:** `EVALS_AUDIT_SUMMARY.md`
- **Stage Reference:** `/docs/architecture/JOB_STAGES_REFERENCE.md`
- **Original Plan:** `/docs/backlog/EVALS_V1-1.md`

---

## 💡 KEY INSIGHTS

1. **Non-blocking logging** — Use `voidLogEval()`, never throw
2. **UI-friendly types** — `EvalCheck` maps directly to dashboard
3. **Severity levels** — Critical checks must pass, others are warnings
4. **Quality score** — Weighted sum (critical=3x, high=2x, medium=1x)
5. **Modular dashboard** — Split into 6+ components, single service

---

**Quick Reference Complete** ✅

