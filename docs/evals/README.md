# EVALS V1.1 — DOCUMENTATION INDEX

**Version:** 1.1  
**Date:** December 4, 2025  
**Status:** ✅ Ready for Implementation

---

## 📚 DOCUMENTATION STRUCTURE

This directory contains the complete documentation for Narrata's Evals V1.1 system.

---

## 🗂️ DOCUMENTS

### 1. **EVALS_AUDIT_SUMMARY.md** — Executive Overview

**Purpose:** High-level summary of the audit findings and implementation plan.

**Audience:** Product managers, engineering leads, stakeholders.

**Length:** ~500 lines

**Key Sections:**
- What exists today
- What needs to be built
- Job types and stages
- Implementation phases
- Success metrics

**When to read:** First document to understand project scope.

---

### 2. **EVALS_V1_1_IMPLEMENTATION_SPEC.md** — Complete Technical Spec

**Purpose:** Detailed implementation guide with code examples and SQL.

**Audience:** Backend engineers, frontend engineers, full-stack developers.

**Length:** ~1,200 lines

**Key Sections:**
- Database schema (migrations)
- Type definitions
- Structural validators
- logEval helper
- Pipeline instrumentation
- Service layer
- Dashboard refactor
- Testing checklist

**When to read:** Before writing any code, as reference during implementation.

---

### 3. **QUICK_REFERENCE.md** — Developer Cheat Sheet

**Purpose:** Quick lookup for key concepts, code patterns, and file locations.

**Audience:** Developers actively implementing the system.

**Length:** ~200 lines

**Key Sections:**
- What to build (summary)
- Stage names (must match exactly)
- Structural checks table
- File locations
- Testing checklist

**When to read:** Daily reference during implementation.

---

### 4. **MIGRATION_GUIDE.md** — Rollout Plan

**Purpose:** Step-by-step guide for safely migrating from old to new system.

**Audience:** DevOps, release managers, engineering leads.

**Length:** ~400 lines

**Key Sections:**
- Current vs. new state
- Migration phases (0-6)
- Rollout timeline
- Risk assessment
- Rollback plans
- Monitoring & troubleshooting

**When to read:** Before deploying to staging or production.

---

## 🎯 QUICK START

### For Backend Engineers

1. Read **EVALS_AUDIT_SUMMARY.md** (15 min)
2. Read **EVALS_V1_1_IMPLEMENTATION_SPEC.md** — Sections 1-4 (30 min)
3. Bookmark **QUICK_REFERENCE.md** (5 min)
4. Implement Phases 1-3 (12-16 hours)

---

### For Frontend Engineers

1. Read **EVALS_AUDIT_SUMMARY.md** (15 min)
2. Read **EVALS_V1_1_IMPLEMENTATION_SPEC.md** — Sections 6-7 (20 min)
3. Bookmark **QUICK_REFERENCE.md** (5 min)
4. Implement Phases 4-5 (10-14 hours)

---

### For Project Managers

1. Read **EVALS_AUDIT_SUMMARY.md** (15 min)
2. Read **MIGRATION_GUIDE.md** — Rollout timeline (10 min)
3. Review **EVALS_V1_1_IMPLEMENTATION_SPEC.md** — Section 7 (checklist) (5 min)

---

## 📊 PROJECT OVERVIEW

### Scope

**In Scope (Evals V1.1):**
- ✅ `evals_log` table for pipeline evaluation tracking
- ✅ Deterministic structural validators
- ✅ Non-blocking eval logging helper
- ✅ Cover letter pipeline instrumentation
- ✅ PM levels pipeline instrumentation
- ✅ Refactored evaluation dashboard

**Out of Scope (Evals V1.1):**
- ❌ Onboarding pipeline instrumentation (pipeline incomplete)
- ❌ LLM-as-judge semantic evals (Evals 1.2+)
- ❌ Cross-job correlation analysis
- ❌ Alerting system
- ❌ Historical trending beyond 7 days

---

### Constraints

**DO NOT:**
- ❌ Modify `jobs` table schema
- ❌ Rewrite `useJobStream` hook
- ❌ Change job type names (`coverLetter`, `pmLevels`, `onboarding`)
- ❌ Change stage names (must match `JOB_STAGES_REFERENCE.md`)
- ❌ Extend `evaluation_runs` table for job pipelines

---

### Timeline

| Phase | Duration | Owner |
|-------|----------|-------|
| DB & Types | 0.5 day | Backend |
| Validators | 0.5 day | Backend |
| Instrumentation | 1 day | Backend |
| Service Layer | 0.5 day | Frontend |
| Dashboard | 1 day | Frontend |
| Testing | 0.5 day | QA + Eng |
| **Total** | **4-5 days** | Team |

---

## 🔑 KEY CONCEPTS

### 1. Structural Checks

**Definition:** Deterministic rules that validate result structure (NOT LLM-based).

**Example:**
```typescript
{
  name: 'Core Requirements Extracted',
  passed: coreRequirementsCount >= 1,
  severity: 'critical',
  expected: '>= 1 core requirement',
  actual: '5',
}
```

**Severity Levels:**
- **Critical:** Must pass for overall success
- **High:** Should pass, flagged if fails
- **Medium:** Nice-to-have
- **Low:** Informational

---

### 2. Non-Blocking Logging

**Pattern:**
```typescript
voidLogEval(supabase, {
  job_id,
  stage,
  success: true,
}).catch(err => elog.error('evals_log_error', { err }));
```

**Rationale:** Eval logging MUST NOT block or fail pipelines.

---

### 3. Quality Score

**Formula:**
```
score = (passedWeight / totalWeight) * 100

where:
  criticalWeight = 3x
  highWeight = 2x
  mediumWeight = 1x
  lowWeight = 0.5x
```

**Example:**
- 4 critical checks (3x weight each) = 12 points
- 2 high checks (2x weight each) = 4 points
- 2 medium checks (1x weight each) = 2 points
- **Total weight:** 18
- **If 3 critical + 2 high pass:** (9 + 4) / 18 * 100 = **72%**

---

## 🏗️ ARCHITECTURE

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Pipeline Execution                                          │
│ (cover-letter.ts, pm-levels.ts)                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Stage Execution                                             │
│ - startStage()                                              │
│ - execute()                                                 │
│ - endStage()                                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Eval Logging (voidLogEval)                                 │
│ - Non-blocking                                              │
│ - Best-effort                                               │
│ - Logs to evals_log table                                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Structural Validation (after all stages)                   │
│ - validateCoverLetterResult()                               │
│ - calculateQualityScore()                                   │
│ - logEval({ stage: 'structural_checks' })                  │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Database                                                    │
│ - evals_log (pipeline evals)                               │
│ - jobs (job state)                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend Service Layer (evalsService.ts)                   │
│ - getAggregateByJobType()                                  │
│ - getAggregateByStage()                                    │
│ - getRecentFailures()                                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ Dashboard (EvaluationDashboard.tsx)                        │
│ - Latency charts                                           │
│ - Success rate                                             │
│ - Quality checks table                                     │
│ - Error logs                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 TESTING STRATEGY

### Unit Tests

**Location:** `/supabase/functions/_shared/evals/__tests__/`

**Coverage:**
- `validators.test.ts` — Structural check logic
- `log.test.ts` — Non-blocking behavior

---

### Integration Tests

**Location:** Run in dev environment

**Coverage:**
- Pipeline instrumentation (5 cover letter jobs + 5 PM levels jobs)
- `evals_log` population
- Dashboard rendering

---

### E2E Tests

**Location:** Staging environment

**Coverage:**
- Real user jobs
- Dashboard performance
- CSV export

---

## 📈 SUCCESS METRICS

### Functional ✅

- [ ] `evals_log` table created
- [ ] Structural validators return correct results
- [ ] Pipelines log to `evals_log`
- [ ] Dashboard shows P50/P90/P99 latency
- [ ] Dashboard shows success rate
- [ ] Dashboard shows quality scores
- [ ] CSV export works

### Non-Functional ✅

- [ ] Eval logging adds < 50ms overhead per stage
- [ ] Dashboard loads in < 2s
- [ ] No pipeline failures from eval logging
- [ ] Quality score distribution is meaningful (not all 0 or all 100)

---

## 🔗 RELATED DOCUMENTATION

### Internal Docs (Narrata)

- `/docs/architecture/JOB_STAGES_REFERENCE.md` — Stage definitions
- `/docs/backlog/EVALS_V1-1.md` — Original MVP plan
- `/docs/qa/COMPREHENSIVE_QA_AUDIT_REPORT.md` — QA findings

### External References

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [React TypeScript Best Practices](https://react-typescript-cheatsheet.netlify.app/)

---

## 🤝 CONTRIBUTING

### Code Review Checklist

- [ ] Follows implementation spec
- [ ] Matches stage names exactly (see `QUICK_REFERENCE.md`)
- [ ] Non-blocking `voidLogEval` pattern used
- [ ] Structural checks have severity levels
- [ ] Quality score calculated correctly
- [ ] Dashboard components are modular
- [ ] TypeScript types are correct
- [ ] Tests pass

---

### Git Workflow

```bash
# Feature branch naming
git checkout -b evals/phase-1-db-schema
git checkout -b evals/phase-2-validators
git checkout -b evals/phase-3-instrumentation
git checkout -b evals/phase-4-service-layer
git checkout -b evals/phase-5-dashboard
git checkout -b evals/phase-6-testing

# Commit message format
git commit -m "evals: Add evals_log table migration"
git commit -m "evals: Implement cover letter structural validator"
git commit -m "evals: Instrument cover letter pipeline"
```

---

## 📞 SUPPORT

### Questions?

- **Technical:** Ask in #eng-evals channel
- **Product:** Ask in #product
- **Urgent:** Ping @evals-team

### Issues?

- **Bug Reports:** Create issue with `[EVALS]` prefix
- **Feature Requests:** Add to `/docs/backlog/EVALS_V1-2.md`

---

## 🚀 NEXT STEPS

### For Implementation Team

1. ✅ Read this README
2. Read **EVALS_AUDIT_SUMMARY.md**
3. Read **EVALS_V1_1_IMPLEMENTATION_SPEC.md**
4. Bookmark **QUICK_REFERENCE.md**
5. Start Phase 1 (DB schema)

---

### For Stakeholders

1. ✅ Read this README
2. Read **EVALS_AUDIT_SUMMARY.md**
3. Review **MIGRATION_GUIDE.md** — Rollout timeline
4. Approve implementation plan

---

## 📝 CHANGELOG

### v1.1 (2025-12-04)

- Initial documentation suite created
- Audit complete
- Implementation spec finalized
- Migration guide added
- Quick reference added

### v1.0 (2025-12-03)

- Audit initiated
- Existing infrastructure mapped

---

## 🎯 PROJECT STATUS

**Current Phase:** ✅ Audit Complete  
**Next Phase:** 🔨 Implementation (Phase 1: DB Schema)  
**Estimated Completion:** Week of December 9, 2025

---

**Last Updated:** December 4, 2025  
**Maintained By:** Evals Team  
**Version:** 1.1

---

**End of Documentation Index**

