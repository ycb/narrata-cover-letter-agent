# EVALS V1.1 — AUDIT SUMMARY

**Date:** December 4, 2025  
**Audit Status:** ✅ Complete  
**Implementation Spec:** `EVALS_V1_1_IMPLEMENTATION_SPEC.md`

---

## EXECUTIVE SUMMARY

The comprehensive audit of Narrata's evaluation infrastructure is complete. The system has a **solid foundation** (job streaming, telemetry, UI scaffolding) but requires **targeted additions** to enable pipeline-wide evaluation tracking.

**Key Findings:**
- ✅ Excellent job streaming architecture in place
- ✅ Clear stage definitions documented
- ⚠️ `evals_log` table does NOT exist yet (needs creation)
- ⚠️ Existing `EvaluationDashboard.tsx` queries wrong table (`evaluation_runs` instead of `jobs` + `evals_log`)
- ⚠️ No structural validators implemented yet
- ✅ Pipelines are stable and ready for instrumentation

**Scope:** Cover letter + PM levels pipelines ONLY (onboarding incomplete).

---

## WHAT EXISTS

### ✅ Ready to Use

| Component | Location | Status |
|-----------|----------|--------|
| `jobs` table | DB schema | ✅ Production-ready |
| `useJobStream` hook | `src/hooks/useJobStream.ts` | ✅ Stable |
| Pipeline execution flow | `_shared/pipelines/*.ts` | ✅ Working |
| `PipelineTelemetry` class | `_shared/telemetry.ts` | ✅ Console logging only |
| Dashboard UI scaffolding | `src/components/evaluation/` | ✅ Reusable components |
| Stage documentation | `JOB_STAGES_REFERENCE.md` | ✅ Canonical source |

---

## WHAT NEEDS TO BE BUILT

### 🔨 New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `evals_log` table | DB migration | Store pipeline eval events |
| Structural validators | TypeScript module | Deterministic quality checks |
| `logEval` helper | Edge function utility | Non-blocking DB logger |
| `evalsService.ts` | Frontend service | Data aggregation layer |
| Refactored dashboard | React components | Query new data sources |

---

## JOB TYPES & STAGES

### Cover Letter (`coverLetter`) — ✅ READY

**Stages:**
1. `jdAnalysis` (20s, streaming) → `roleInsights`, `jdRequirementSummary`
2. `requirementAnalysis` (30s, GPT-4) → `coreRequirements[]`, `totalRequirements`
3. `goalsAndStrengths` (35s, streaming x2) → `mws`, `companyContext`
4. `sectionGaps` (50s, GPT-4) → `sections[]`, `gapCount`

**Structural Checks (8 total):**
- 4 critical: Role insights, core requirements, requirement analysis, MWS score
- 2 high: Company context, section gaps
- 2 medium: Total requirements count, goal alignment

---

### PM Levels (`pmLevels`) — ✅ READY

**Stages:**
1. `baselineAssessment` (15s, GPT-4) → `icLevel`, `assessmentBand`
2. `competencyBreakdown` (35s, GPT-4) → 4 competencies (0-10 scale)
3. `specializationAssessment` (50s, GPT-4) → `specializations[]`

**Structural Checks (5 total):**
- 3 critical: IC level valid, 4 competencies present, values in range
- 1 high: Assessment ID generated
- 1 medium: Specializations array present

---

### Onboarding (`onboarding`) — ⚠️ NOT READY

**Status:** Stub implementation, NOT production-ready.

**Constraint:** DO NOT instrument (per user request).

---

## IMPLEMENTATION PHASES

### Phase 1: Database & Types
- Create `evals_log` table (migration 029)
- Create aggregate functions (migration 030)
- Define TypeScript types (`EvalCheck`, `StructuralEvalResult`, `LogEvalPayload`)

### Phase 2: Validators & Logger
- Build `validateCoverLetterResult()`
- Build `validatePMLevelsResult()`
- Build `calculateQualityScore()`
- Build `logEval()` helper (non-blocking, best-effort)

### Phase 3: Pipeline Instrumentation
- Update `cover-letter.ts` pipeline (add logging)
- Update `pm-levels.ts` pipeline (add logging)
- Test with synthetic jobs

### Phase 4: Service Layer
- Create `evalsService.ts`
- Implement aggregate queries
- Test in dev console

### Phase 5: Dashboard Refactor
- Split `EvaluationDashboard.tsx` into modular components
- Rewire to use `evalsService.ts`
- Test in dev environment

### Phase 6: Testing & Validation
- Run 10+ synthetic jobs
- Verify `evals_log` populates
- Verify dashboard renders
- Export CSV

---

## KEY ARCHITECTURAL DECISIONS (FROM FEEDBACK)

### 1. Non-Blocking Logging

**Pattern:**
```typescript
voidLogEval(supabase, {
  job_id,
  stage,
  started_at,
  completed_at,
  success: true,
}).catch(err => elog.error('evals_log_error', { err }));
```

**Rationale:** Eval logging MUST NOT block pipelines or cause failures.

---

### 2. UI-Friendly Check Structure

**Type:**
```typescript
interface EvalCheck {
  name: string;
  passed: boolean;
  severity: 'critical' | 'high' | 'medium' | 'low';
  expected?: string;
  actual?: string;
}
```

**Rationale:** Direct mapping to dashboard display, easy aggregation.

---

### 3. Database Indexes

**Required:**
- `CREATE INDEX ON evals_log (job_id);`
- `CREATE INDEX ON evals_log (created_at DESC);`

**Optional but Recommended:**
- `environment` column with CHECK constraint

**Rationale:** Dashboard queries filter by job_id and sort by created_at.

---

### 4. Structural Validation Placement

**Location:** After pipeline result assembly, BEFORE `telemetry.complete()`.

**Rationale:** Ensures result is complete before validation.

---

### 5. Component Modularity

**Pattern:** Split dashboard into 6+ small components, single `evalsService.ts`.

**Rationale:** Maintainability, testability, reusability.

---

## CLEANUP TASKS

### Files to Remove

| File | Reason |
|------|--------|
| `/supabase/functions/_shared/pm-levels.ts` | Duplicate (use `/pipelines/pm-levels.ts`) |
| LocalStorage eval references | Deprecated (3 references in `fileUploadService.ts`) |

---

## CONSTRAINTS (DO NOT CHANGE)

| Component | Constraint |
|-----------|------------|
| `jobs` table schema | DO NOT modify |
| `useJobStream` hook | DO NOT rewrite |
| Job type names | DO NOT rename (`coverLetter`, `pmLevels`, `onboarding`) |
| Stage names | DO NOT rename (must match `JOB_STAGES_REFERENCE.md`) |
| `pipeline-utils.ts` | DO NOT refactor |
| Result shapes | DO NOT change structure |

---

## NON-GOALS (EXPLICIT)

### Evals V1.1 EXCLUDES:

- ❌ LLM-as-judge semantic evals (future: Evals 1.2+)
- ❌ Onboarding pipeline instrumentation
- ❌ Cross-job correlation analysis
- ❌ Alerting system
- ❌ Historical trending beyond 7 days
- ❌ Modifications to `evaluation_runs` table

**Rationale:** Keep scope tight, ship quickly, iterate later.

---

## SUCCESS METRICS

### Functional ✅

- [ ] `evals_log` table created
- [ ] Structural validators implemented
- [ ] Pipelines instrumented
- [ ] Dashboard shows P50/P90/P99 latency
- [ ] Dashboard shows success rate
- [ ] Dashboard shows recent failures
- [ ] CSV export works

### Non-Functional ✅

- [ ] Eval logging adds < 50ms overhead per stage
- [ ] Dashboard loads in < 2s
- [ ] No pipeline failures from eval logging
- [ ] Zero data loss (best-effort logging)

---

## NEXT STEPS

1. ✅ **Audit complete** (this document)
2. **Implement Phase 1** (DB schema)
3. **Implement Phase 2** (validators)
4. **Implement Phase 3** (pipeline instrumentation)
5. **Implement Phase 4** (service layer)
6. **Implement Phase 5** (dashboard refactor)
7. **Test & validate** (Phase 6)
8. **Deploy to staging**
9. **Deploy to production**

---

## REFERENCE DOCUMENTS

| Document | Purpose |
|----------|---------|
| `EVALS_V1_1_IMPLEMENTATION_SPEC.md` | Complete implementation guide |
| `/docs/architecture/JOB_STAGES_REFERENCE.md` | Stage names and result shapes |
| `/docs/backlog/EVALS_V1-1.md` | Original MVP plan |
| `/docs/qa/COMPREHENSIVE_QA_AUDIT_REPORT.md` | QA findings |

---

## ESTIMATED EFFORT

| Phase | Effort | Duration |
|-------|--------|----------|
| Phase 1: DB & Types | 2-3 hours | 0.5 day |
| Phase 2: Validators | 3-4 hours | 0.5 day |
| Phase 3: Instrumentation | 4-6 hours | 1 day |
| Phase 4: Service Layer | 2-3 hours | 0.5 day |
| Phase 5: Dashboard | 6-8 hours | 1 day |
| Phase 6: Testing | 4-6 hours | 0.5 day |
| **TOTAL** | **21-30 hours** | **4-5 days** |

**Note:** Assumes single developer, includes testing time.

---

## RISK MITIGATION

### Risk: Eval logging impacts pipeline performance

**Mitigation:** Non-blocking async logging, best-effort semantics.

---

### Risk: Dashboard queries are slow

**Mitigation:** Pre-computed aggregations via DB functions, indexed queries.

---

### Risk: Structural checks are too strict

**Mitigation:** Severity levels (critical vs. high vs. medium), adjustable thresholds.

---

### Risk: Schema changes break existing code

**Mitigation:** New table (`evals_log`), no changes to `jobs` or `evaluation_runs`.

---

## ROLLOUT STRATEGY

### Week 1: Development

- Implement Phases 1-2
- Test validators locally
- Create DB migrations

### Week 2: Integration

- Implement Phases 3-4
- Instrument pipelines
- Test with synthetic jobs

### Week 3: UI Refactor

- Implement Phase 5
- Test dashboard in dev
- Fix bugs

### Week 4: Staging & Production

- Deploy to staging
- Monitor for 7 days
- Deploy to production
- Internal launch

---

## CONCLUSION

The audit is **complete** and the path forward is **clear**. Narrata has a solid foundation — we just need to add the missing eval-specific wiring on top of the existing job infrastructure.

**This is a well-scoped, achievable MVP** that does NOT require rewriting the entire system.

---

**Audit Complete** ✅  
**Ready for Implementation** ✅  
**Estimated Timeline:** 4-5 days  
**Risk Level:** Low (surgical changes, no core rewrites)

---

**End of Summary**

