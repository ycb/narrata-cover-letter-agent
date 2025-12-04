# EVALS V1.1 — MIGRATION GUIDE

**Version:** 1.0  
**Date:** December 4, 2025  
**Purpose:** Guide for transitioning from old eval system to Evals V1.1

---

## OVERVIEW

This document explains how to safely migrate from the existing evaluation infrastructure to the new Evals V1.1 system without breaking existing functionality.

**Migration Strategy:** Additive approach (no deletions until new system validated).

---

## CURRENT STATE (Before Migration)

### What Exists Today

| Component | Purpose | Status |
|-----------|---------|--------|
| `evaluation_runs` table | File upload evals (JD parse, HIL events, PM levels) | ✅ Keep (different purpose) |
| `EvaluationDashboard.tsx` | UI for `evaluation_runs` | ⚠️ Will be refactored |
| LocalStorage eval logs | Deprecated file upload logs | ❌ Remove after migration |
| `PipelineTelemetry` | Console-only logging | ✅ Keep (complementary) |
| `jobs` table | Job tracking | ✅ Keep (source of truth) |

**Key Insight:** `evaluation_runs` serves **file upload flows**, NOT job streaming pipelines.

---

## NEW STATE (After Migration)

### What Will Exist

| Component | Purpose | Status |
|-----------|---------|--------|
| `evals_log` table | **Pipeline eval tracking** | 🆕 New |
| `evaluation_runs` table | File upload evals (unchanged) | ✅ Keep |
| Refactored `EvaluationDashboard.tsx` | UI for `evals_log` | 🔄 Modified |
| Structural validators | Deterministic quality checks | 🆕 New |
| `logEval` helper | Non-blocking DB logger | 🆕 New |
| `evalsService.ts` | Frontend data layer | 🆕 New |

**Key Insight:** Both tables coexist, serving different purposes.

---

## MIGRATION PHASES

### Phase 0: Preparation ✅

**Goal:** Understand current state, identify risks.

**Tasks:**
- [x] Complete audit (done)
- [x] Document existing pipelines
- [x] Map stage names
- [x] Identify reusable UI components

**Deliverables:**
- Audit report
- Implementation spec
- Quick reference

---

### Phase 1: Database Schema 🔨

**Goal:** Create `evals_log` table and aggregate functions.

**Tasks:**
- [ ] Write migration `029_create_evals_log.sql`
- [ ] Write migration `030_add_evals_aggregate_functions.sql`
- [ ] Test migrations in dev environment
- [ ] Regenerate TypeScript types from schema

**Validation:**
- `evals_log` table exists in dev DB
- Indexes created (6 total)
- RLS policies applied
- Aggregate functions callable

**Rollback:**
```sql
DROP TABLE IF EXISTS public.evals_log CASCADE;
DROP FUNCTION IF EXISTS get_evals_aggregate_by_job_type CASCADE;
DROP FUNCTION IF EXISTS get_evals_aggregate_by_stage CASCADE;
```

---

### Phase 2: Backend Infrastructure 🔨

**Goal:** Build validators and logger.

**Tasks:**
- [ ] Create `/supabase/functions/_shared/evals/types.ts`
- [ ] Create `/supabase/functions/_shared/evals/validators.ts`
  - [ ] `validateCoverLetterResult()`
  - [ ] `validatePMLevelsResult()`
  - [ ] `calculateQualityScore()`
- [ ] Create `/supabase/functions/_shared/evals/log.ts`
  - [ ] `logEval()`
  - [ ] `voidLogEval()`
  - [ ] `getEnvironment()`
- [ ] Write unit tests for validators

**Validation:**
- Validators return correct `StructuralEvalResult`
- `logEval` inserts row in `evals_log`
- `logEval` does NOT throw on DB errors
- Quality score calculation is correct

**Rollback:**
- Delete `/supabase/functions/_shared/evals/` directory

---

### Phase 3: Pipeline Instrumentation 🔨

**Goal:** Add eval logging to pipelines without breaking them.

**Tasks:**
- [ ] Update `cover-letter.ts`
  - [ ] Import validators and logger
  - [ ] Add stage start/end logging
  - [ ] Add structural validation after result assembly
  - [ ] Test with 5 synthetic jobs
- [ ] Update `pm-levels.ts`
  - [ ] Same pattern as cover letter
  - [ ] Test with 5 synthetic jobs

**Validation:**
- Pipelines still complete successfully
- `evals_log` rows created for each stage
- `quality_checks` JSONB populated
- Overhead < 50ms per stage

**Rollback Strategy:**
1. **Soft rollback:** Comment out `voidLogEval()` calls
2. **Hard rollback:** Revert pipeline file changes

**Safety Net:**
- `logEval` is best-effort (failures logged, not thrown)
- Pipeline continues even if eval logging fails

---

### Phase 4: Frontend Service Layer 🔨

**Goal:** Create data aggregation service.

**Tasks:**
- [ ] Create `/src/services/evalsService.ts`
  - [ ] `getAggregateByJobType()`
  - [ ] `getAggregateByStage()`
  - [ ] `getRecentFailures()`
  - [ ] `getEvalsForJob()`
- [ ] Test each method in dev console
- [ ] Add TypeScript interfaces for return types

**Validation:**
- All methods return data
- Queries execute in < 500ms
- TypeScript types are correct

**Rollback:**
- Delete `/src/services/evalsService.ts`

---

### Phase 5: Dashboard Refactor 🔨

**Goal:** Create new modular dashboard using new data sources.

**Tasks:**
- [ ] Create `/src/components/evaluation/hooks/useEvalsData.ts`
- [ ] Create modular components:
  - [ ] `JobTypeFilter.tsx`
  - [ ] `LatencyOverviewCard.tsx`
  - [ ] `StageLatencyChart.tsx`
  - [ ] `StructuralChecksCard.tsx`
  - [ ] `ErrorTable.tsx`
  - [ ] `ExportButton.tsx`
- [ ] Refactor `EvaluationDashboard.tsx` to use new components
- [ ] Test in dev environment

**Validation:**
- Dashboard loads in < 2s
- Charts render correctly
- Filters work
- CSV export works

**Rollback Strategy:**
1. **Keep old dashboard:** Rename to `EvaluationDashboardLegacy.tsx`
2. **Swap routes:** Point URL to legacy dashboard
3. **Git revert:** Revert dashboard changes

---

### Phase 6: Testing & Validation 🧪

**Goal:** Ensure system works end-to-end.

**Tasks:**
- [ ] Run 10 cover letter jobs in dev
- [ ] Run 10 PM levels jobs in dev
- [ ] Verify `evals_log` has 20+ rows
- [ ] Verify structural checks pass/fail correctly
- [ ] Load dashboard, verify all panels work
- [ ] Export CSV, verify data
- [ ] Test error scenarios (LLM timeout, malformed result)
- [ ] Monitor pipeline latency (overhead check)

**Success Criteria:**
- 20/20 jobs create eval logs
- Dashboard shows correct metrics
- No pipeline failures
- Overhead < 50ms per stage

**Failure Response:**
- If overhead > 50ms → investigate `logEval` performance
- If dashboard doesn't load → check DB function queries
- If structural checks fail incorrectly → adjust validator logic

---

## DATA MIGRATION

### Historical Data

**Question:** Should we backfill `evals_log` with historical data from `jobs` table?

**Answer:** ❌ **NO** — Start fresh.

**Rationale:**
- `jobs` table doesn't have stage-level timing
- `jobs` table doesn't have quality checks
- Backfilling is complex and error-prone
- New system is forward-looking

**Alternative:** Keep `jobs` table for historical reference, start `evals_log` from deployment date.

---

## COEXISTENCE STRATEGY

### Both Tables in Production

**Scenario:** `evaluation_runs` and `evals_log` both exist.

**Separation:**
- `evaluation_runs` → File upload flows (JD parse, HIL events)
- `evals_log` → Job streaming pipelines (cover letter, PM levels)

**Dashboard Split:**
- **Option A:** Two dashboards (legacy + new)
- **Option B:** Single dashboard with toggle (recommended)

**Recommended Approach:**

```typescript
// EvaluationDashboard.tsx
const [viewMode, setViewMode] = useState<'pipelines' | 'uploads'>('pipelines');

return (
  <div>
    <Tabs value={viewMode} onValueChange={setViewMode}>
      <TabsList>
        <TabsTrigger value="pipelines">Pipeline Evals</TabsTrigger>
        <TabsTrigger value="uploads">File Upload Evals</TabsTrigger>
      </TabsList>
      
      <TabsContent value="pipelines">
        <PipelineEvalsView /> {/* Uses evals_log */}
      </TabsContent>
      
      <TabsContent value="uploads">
        <FileUploadEvalsView /> {/* Uses evaluation_runs */}
      </TabsContent>
    </Tabs>
  </div>
);
```

---

## ROLLOUT TIMELINE

### Week 1: Development (Phases 1-2)

**Environment:** Dev only

**Tasks:**
- Database migrations
- Backend infrastructure
- Unit tests

**Risk:** Low (no production impact)

---

### Week 2: Integration (Phase 3)

**Environment:** Dev only

**Tasks:**
- Pipeline instrumentation
- Synthetic job testing

**Risk:** Low (dev environment only)

**Validation:**
- Run 50+ synthetic jobs
- Verify `evals_log` populates
- Check for performance regressions

---

### Week 3: Frontend (Phases 4-5)

**Environment:** Dev only

**Tasks:**
- Service layer
- Dashboard refactor

**Risk:** Low (UI changes only)

**Validation:**
- Dashboard loads correctly
- All charts/tables work
- CSV export works

---

### Week 4: Staging Deployment

**Environment:** Staging

**Tasks:**
- Deploy migrations
- Deploy instrumented pipelines
- Deploy new dashboard

**Risk:** Medium (first production-like environment)

**Validation:**
- Monitor real user jobs (7 days)
- Check for errors in `evals_log`
- Verify dashboard with real data

**Rollback Plan:**
- Revert pipeline changes (remove `voidLogEval` calls)
- Point dashboard to legacy view

---

### Week 5: Production Deployment

**Environment:** Production

**Tasks:**
- Run migrations (low-traffic window)
- Deploy instrumented pipelines
- Enable dashboard for internal team

**Risk:** Medium (production impact)

**Validation:**
- Monitor for 24 hours
- Check error rates
- Verify no pipeline failures
- Review eval logs for completeness

**Rollback Plan:**
1. **Immediate:** Comment out `voidLogEval` calls via hotfix
2. **Full rollback:** Revert to previous pipeline versions

---

## RISK ASSESSMENT

### High Risk ⚠️

**Risk:** Eval logging blocks pipelines or causes failures.

**Mitigation:**
- Non-blocking `voidLogEval` pattern
- Best-effort semantics
- Try/catch wrappers
- Extensive testing in dev/staging

**Detection:**
- Monitor pipeline failure rate
- Check for timeouts
- Review error logs

---

### Medium Risk ⚠️

**Risk:** Dashboard queries are slow or timeout.

**Mitigation:**
- Pre-computed aggregations via DB functions
- Indexed queries
- Limit date range to 7 days

**Detection:**
- Monitor query execution time
- Check Supabase dashboard metrics
- Load test with 1000+ eval logs

---

### Low Risk ✅

**Risk:** Structural checks are too strict or lenient.

**Mitigation:**
- Severity levels (critical vs. high vs. medium)
- Adjustable thresholds
- Iterative refinement based on data

**Detection:**
- Review quality score distribution
- Check for 100% failure or 100% success
- Spot-check flagged jobs manually

---

## CLEANUP TASKS (Post-Migration)

### After 30 Days in Production

**Tasks:**
- [ ] Remove LocalStorage eval logging from `fileUploadService.ts`
- [ ] Delete `/supabase/functions/_shared/pm-levels.ts` (duplicate)
- [ ] Archive old dashboard code (if replaced completely)
- [ ] Update documentation to reference new system

**Validation:**
- No references to deprecated code
- All tests pass
- Dashboard still works

---

## MONITORING & OBSERVABILITY

### What to Monitor

| Metric | Threshold | Action |
|--------|-----------|--------|
| `evals_log` insert latency | < 50ms | Investigate if higher |
| Pipeline overhead | < 50ms per stage | Optimize `logEval` |
| Dashboard load time | < 2s | Optimize queries |
| Success rate | > 95% | Review failing jobs |
| Quality score avg | > 80 | Adjust validators if lower |

### Alerts to Set Up

- [ ] Pipeline failure rate > 5%
- [ ] `evals_log` insert errors > 10/hour
- [ ] Dashboard 500 errors
- [ ] Quality score avg drops below 70

---

## TROUBLESHOOTING

### Problem: `evals_log` rows not appearing

**Diagnosis:**
1. Check pipeline logs for `logEval` calls
2. Check `evals_log` table for errors
3. Check RLS policies

**Solution:**
- Verify `voidLogEval` is called
- Check Supabase service role permissions
- Review edge function logs

---

### Problem: Dashboard shows no data

**Diagnosis:**
1. Check `evals_log` has rows
2. Check DB function returns data
3. Check frontend service layer

**Solution:**
- Run DB functions manually in SQL editor
- Check `evalsService.ts` error logs
- Verify date range filter

---

### Problem: Structural checks all fail

**Diagnosis:**
1. Check validator logic
2. Review result shape
3. Check expected vs. actual values

**Solution:**
- Log `result` object before validation
- Adjust validator rules
- Review `EvalCheck.expected` and `EvalCheck.actual`

---

## SUCCESS METRICS

### Technical KPIs

- [ ] `evals_log` insert success rate > 99%
- [ ] Pipeline overhead < 50ms per stage
- [ ] Dashboard load time < 2s
- [ ] Zero pipeline failures from eval logging

### Product KPIs

- [ ] Quality score distribution visible
- [ ] Latency trends visible
- [ ] Failure root causes identifiable
- [ ] Team uses dashboard weekly

---

## CONCLUSION

This migration is **low-risk** and **additive**:
- New table, no schema changes to existing tables
- New code, minimal changes to existing pipelines
- New dashboard, old dashboard can be kept as fallback

**Key Success Factors:**
1. Thorough testing in dev/staging
2. Phased rollout with monitoring
3. Clear rollback plan at each phase
4. Team alignment on goals

---

**Migration Guide Version:** 1.0  
**Last Updated:** December 4, 2025  
**Next Review:** After production deployment

---

**End of Migration Guide**

