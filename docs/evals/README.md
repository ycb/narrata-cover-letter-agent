# EVALS V1.2 — DOCUMENTATION INDEX

**Version:** 1.2 (Cost Tracking + LLM Coverage)  
**Date:** December 4, 2025  
**Status:** ✅ Phase 0 Ready for Implementation

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

### 5. **FINAL_LLM_CALLS_LIST.md** — Cleaned & Ready for Instrumentation

**Purpose:** Final list of active LLM calls after cleanup, organized by priority with effort estimates.

**Audience:** Engineering leads, developers working on instrumentation.

**Length:** ~250 lines

**Key Sections:**
- Deletions complete (5 deprecated services removed)
- Final active LLM calls (30-35 calls, down from 86)
- Coverage summary (43% current, roadmap to 100%)
- Implementation roadmap (Phases 6A-6C)

**When to read:** Before starting instrumentation work.

---

### 6. **COMPLETE_LLM_CALL_AUDIT.md** — Comprehensive LLM Call Inventory

**Purpose:** Complete mapping of all LLM calls in the codebase, cross-referenced with prompts folder, instrumentation status, and prioritization.

**Note:** This was the initial audit. See `FINAL_LLM_CALLS_LIST.md` for the cleaned, actionable list.

**Audience:** Engineering leads, developers working on instrumentation.

**Length:** ~600 lines

**Key Sections:**
- Prompt inventory (all 27 prompt files)
- LLM call sites (86+ calls across 20 files)
- User checklist mapping
- Instrumentation priority matrix
- Recommended phases (6A-6D)
- Schema extension for prompt tracking

**When to read:** Before instrumenting new LLM calls, to understand coverage gaps.

---

### 7. **DASHBOARD_EVOLUTION_PLAN.md** — Dashboard Extension Plan

**Purpose:** Comprehensive plan for extending `/evaluation-dashboard` to support all new LLM calls while preserving existing patterns.

**Audience:** Frontend engineers, UX designers, product managers.

**Length:** ~650 lines

**Key Sections:**
- Vision & principles (build on what works, universal + type-specific)
- Existing patterns to extend (7 patterns documented)
- New schema extensions (SQL + TypeScript)
- Dashboard layout mockups (4 LLM call types)
- Implementation phases (4 phases, ~8-11 days total)

**When to read:** Before extending dashboard UI.

---

### 8. **CLEANUP_AND_VISION_SUMMARY.md** — Final Alignment Summary

**Purpose:** Summary of cleanup work and vision alignment between both dashboards.

**Audience:** All stakeholders.

**Length:** ~200 lines

**Key Sections:**
- Cleanup complete (5 deprecated services deleted)
- Vision alignment (observability + quality measurement)
- Two dashboards, complementary purposes
- Dashboard evolution strategy (4 phases)
- Immediate next steps

**When to read:** To understand overall project status and next steps.

---

### 9. **DASHBOARD_REFERENCE.md** — Dashboard Guide

**Purpose:** Complete documentation for both evaluation dashboards.

**Audience:** All team members, product managers, QA, engineers.

**Length:** ~600 lines

**Key Sections:**
- Overview of both dashboards
- `/evaluation-dashboard` — File upload & content quality
- `/evals` — Pipeline performance & reliability
- Feature comparison matrix
- When to use which dashboard
- Future consolidation options

**When to read:** To understand dashboard capabilities and choose the right tool.

---

### 10. **DASHBOARD_EVOLUTION_PLAN.md** — Dashboard Enhancement Roadmap ⭐ UPDATED

**Purpose:** Comprehensive plan for evolving both dashboards with cost tracking, universal LLM tracking, and type-specific customization.

**Audience:** Frontend engineers, product managers, database admins.

**Length:** ~1,080 lines

**Key Sections:**
- **Phase 0: Schema Extensions** (cost tracking + prompt metadata) ⭐ NEW
- Phase 1: `/evals` cost tracking UI
- Phase 2: `/evaluation-dashboard` universal extensions
- Phase 3: Type-specific customization
- Phase 4: Prompt performance view
- Phase 5: Prompt viewer
- Cost tracking in both dashboards
- Implementation timeline (11-14 days)

**When to read:** Before working on dashboard enhancements.

---

### 11. **PHASE_0_COST_TRACKING_README.md** — Phase 0 Implementation Guide ⭐ NEW

**Purpose:** Complete guide for Phase 0 (Schema Extensions) - adding cost tracking to both dashboards.

**Audience:** Backend engineers, database admins.

**Length:** ~350 lines

**Key Sections:**
- Database schema changes (`evals_log`, `evaluation_runs`)
- New aggregate functions (`get_evals_cost_by_job_type`, `get_evals_cost_by_prompt`)
- TypeScript type definitions (`src/types/evals-cost.ts`)
- Automated test suite (9 tests)
- Deployment steps (SQL Editor + CLI)
- Validation checklist

**When to read:** Before implementing Phase 0.

---

### 12. **DASHBOARD_PLAN_UPDATE_SUMMARY.md** — Plan Update Summary ⭐ NEW

**Purpose:** Quick summary of what changed in the dashboard evolution plan (cost tracking additions).

**Audience:** Engineering leads, anyone catching up on recent changes.

**Length:** ~150 lines

**Key Sections:**
- What was updated
- Cost tracking features for both dashboards
- Updated implementation timeline
- Phased rollout recommendation

**When to read:** For a quick overview of recent plan updates.

---

### 13. **PHASE_1_INSTRUMENTATION_SUMMARY.md** — Phase 1a Implementation Summary ⭐ NEW

**Purpose:** Summary of LLM call instrumentation work (Phase 1a).

**Audience:** Engineering team, QA, code reviewers.

**Length:** ~500 lines

**Key Sections:**
- Schema extensions (types & logging)
- Instrumented LLM calls (4 of 13)
  - JD Analysis (`preanalyze-jd`)
  - Company Tags (`cover-letter`)
  - Draft Readiness Judge (`evaluate-draft-readiness`)
- Coverage status table
- Impact & observability gains
- Next steps (remaining calls + token tracking)
- Verification SQL queries
- Files modified (5 files)
- Deployment checklist

**When to read:** After completing Phase 1a instrumentation.

---

### 14. **PHASE_1B_TOKEN_TRACKING_SUMMARY.md** — Phase 1b Token Tracking Summary ⭐ NEW

**Purpose:** Summary of token count tracking implementation (Phase 1b).

**Audience:** Engineering team, QA, DevOps.

**Length:** ~400 lines

**Key Sections:**
- `streamJsonFromLLM()` refactor (breaking change)
- Updated all 4 callers (pipeline-utils, preanalyze-jd, cover-letter, readiness)
- Token usage now tracked for 7 LLM calls
- Cost calculation examples
- Business impact (cost visibility)
- Deployment notes

**When to read:** After completing Phase 1b token tracking.

---

### 15. **COMPREHENSIVE_TESTING_GUIDE.md** — Complete Test Suite ⭐ NEW

**Purpose:** Comprehensive testing guide for all implemented phases (0, 1a, 1b).

**Audience:** QA team, engineers, product managers.

**Length:** ~600 lines

**Key Sections:**
- 12 test cases (JD Analysis, Cover Letter stages, Draft Readiness, Resume, PM Levels, Cost Functions, Dashboards)
- Expected metrics & benchmarks
- Troubleshooting guide (4 common issues)
- Performance expectations
- Sign-off checklist

**When to read:** Before testing, after onboarding pipeline is running.

---

### 16. **FINAL_IMPLEMENTATION_SUMMARY.md** — Executive Summary ⭐ NEW

**Purpose:** High-level summary of all completed work (Phases 0, 1a, 1b).

**Audience:** All stakeholders, project managers, executives.

**Length:** ~350 lines

**Key Sections:**
- What was delivered (3 phases)
- Coverage summary (12 LLM calls instrumented)
- Files modified (7 files)
- Deployment checklist
- Business impact (cost visibility, $46/month estimate)
- Success criteria
- Quick links to all docs

**When to read:** For final sign-off, before production deployment.

---

### 17. **PHASE_1_FINAL_SUMMARY.md** — Phase 1 Complete Summary ⭐ NEW

**Purpose:** Comprehensive summary of Phase 1 (Schema + Instrumentation + Token Tracking).

**Audience:** Engineering team, QA, stakeholders.

**Length:** ~550 lines

**Key Sections:**
- All 3 sub-phases (0, 1a, 1b)
- 5 LLM calls instrumented (JD Analysis, Company Tags, MWS, Company Context, Draft Readiness)
- Database schema complete (`evals_log` with prompt metadata)
- Token tracking infrastructure refactor
- Coverage status (backend ✅, frontend ⏸️)
- Example `evals_log` entry
- Files modified (8 files total)
- Success metrics

**When to read:** For complete Phase 1 reference, before user testing.

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

## 🗂️ BACKLOG ITEMS

### **Frontend LLM Migration to Edge Functions**

**Document:** `docs/backlog/FRONTEND_LLM_TO_EDGE_FUNCTIONS.md`

**Purpose:** Complete spec for moving My Voice + Story Detection LLM calls from frontend to Edge Functions.

**LOE:** 8-12 hours  
**Breaking Risk:** 20-25%  
**Status:** Deferred until post-onboarding launch

**Key Sections:**
- Current architecture (frontend direct OpenAI calls)
- Proposed Edge Functions (extract-my-voice, detect-cover-letter-stories)
- Frontend service refactor
- Implementation checklist (15 steps)
- Testing strategy
- Rollback plan

**When to read:** Before implementing full evals coverage for cover letter upload flow.

---

## 🚀 NEXT STEPS

### For Implementation Team

1. ✅ Read this README
2. ✅ Complete Phase 0-1 (DB schema + instrumentation + token tracking)
3. **Current**: User testing + validation (see `COMPREHENSIVE_TESTING_GUIDE.md`)
4. **Next**: Implement remaining LLM calls or frontend migration (see backlog)

---

### For Stakeholders

1. ✅ Read this README
2. ✅ Phase 0-1 complete (5 backend LLM calls instrumented)
3. **Current**: Waiting for onboarding pipeline testing
4. **Next**: Review Phase 2 plan (dashboard enhancements)

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

