# Onboarding Gaps - Executive Summary

**Issue**: Gap detection and PM levels analysis are not running for new users during onboarding  
**User Affected**: Jungwon Yang (and potentially all recent signups)  
**Date**: 2026-01-17

---

## Problem Statement

When users complete onboarding (upload resume + cover letter), two critical analysis steps should run automatically:
1. **Gap Detection** - Identifies generic/weak content in work history and cover letter sections
2. **PM Levels Analysis** - Determines user's seniority level based on work history

**Current Reality**: Neither system is running reliably, leaving users without critical profile insights.

---

## Root Causes

### Gap Detection (0% Success Rate)
1. **Feature flag disabled**: `ENABLE_BACKGROUND_GENERIC_GAP_JUDGE=false` (env var not set)
2. **Wrong code path**: Cover letter upload uses direct DB insert, bypassing gap detection entirely
3. **Silent failures**: Errors caught but not surfaced or tracked

### PM Levels (Unknown Success Rate)
1. **Undefined variables**: Edge function receives `undefined` for `triggerReason` and `runType`
2. **Fire-and-forget pattern**: No way to verify job was created successfully
3. **Error swallowing**: Failures logged to console but no alerts or retries
4. **Possible RLS issues**: Edge function calls may be blocked by auth policies

---

## Immediate Fix (Jungwon)

**Manual triggers via browser console** (5-10 minutes):

1. **Gap Detection**: Navigate to `/work-history`, run gap detection script for work items, stories, and saved sections
2. **PM Levels**: Navigate to `/assessment`, run PM levels analysis script

**See**: `docs/fixes/JUNGWON_ONBOARDING_GAPS_PLAN.md`

---

## Systemic Fix

### Phase 1: Critical Fixes (P0) - 35 minutes
1. Enable gap detection feature flag (`.env` change)
2. Fix undefined variables in PM levels job creation
3. Add gap detection to cover letter upload flow
4. Add error logging for PM levels job creation

### Phase 2: Reliability (P0-P1) - 30 minutes
5. Return gap count from background judge
6. Make PM levels job creation return Promise
7. Add evals_log tracking for job scheduling

### Phase 3: Monitoring & UX (P1) - 4 hours
8. Create onboarding health check dashboard
9. Add user-facing loading/error states
10. Add "Retry Analysis" functionality

**See**: `docs/fixes/ONBOARDING_SYSTEMIC_FIX_PLAN.md`

---

## Impact

### Current State
- **Gap Detection**: 0% success rate (feature disabled)
- **PM Levels**: Unknown success rate, likely <50% (silent failures)
- **User Experience**: No visibility into failures, no retry options

### After Fix
- **Gap Detection**: >95% success rate
- **PM Levels**: >95% job creation, >90% completion
- **User Experience**: Loading indicators, error messages, retry buttons
- **Observability**: All failures logged and tracked

---

## Files Changed

**Immediate Fix (Manual)**:
- None (browser console scripts)

**Systemic Fix (Code Changes)**:
- `.env` or `.env.local` (enable feature flag)
- `src/services/fileUploadService.ts` (gap detection + PM levels error handling)
- `src/services/pmLevelsEdgeClient.ts` (fix undefined vars, return Promise)
- `src/services/coverLetterTemplateService.ts` (add gap detection to upload flow)
- `src/pages/admin/OnboardingHealthCheck.tsx` (new monitoring dashboard)
- `src/components/dashboard/*` (loading/error states)

---

## Testing Plan

### Manual Testing (After Phase 1)
- [ ] Create fresh test user
- [ ] Upload resume → verify gaps created
- [ ] Upload cover letter → verify gaps created
- [ ] Verify PM levels job created in `jobs` table
- [ ] Verify PM levels result in `user_levels` table

### Automated Testing (After Phase 2)
- [ ] Write integration tests for upload → gap detection flow
- [ ] Write integration tests for upload → PM levels flow
- [ ] Add error scenario tests (LLM failures, edge function failures)

### Monitoring (After Phase 3)
- [ ] Set up alerts for onboarding failures
- [ ] Create weekly health report
- [ ] Track success rates over time

---

## Timeline

| **Phase** | **Effort** | **When** |
|-----------|-----------|----------|
| Immediate Fix (Jungwon) | 10 min | Today |
| Phase 1 (Critical) | 35 min | Today |
| Phase 2 (Reliability) | 30 min | This week |
| Phase 3 (Monitoring) | 4 hours | Next sprint |

---

## Recommendation

**Do immediately**:
1. Fix Jungwon manually (10 min)
2. Implement Phase 1 critical fixes (35 min)
3. Deploy to staging and test (30 min)
4. Deploy to production and monitor (1 hour)

**Do this week**:
5. Implement Phase 2 reliability improvements (30 min)
6. Run backfill script for other affected users (1 hour)

**Do next sprint**:
7. Implement Phase 3 monitoring and UX improvements (4 hours)
8. Set up automated testing (2 hours)

**Total investment**: ~9 hours for complete fix + monitoring

---

## Related Documents

- **Immediate Fix Plan**: `docs/fixes/JUNGWON_ONBOARDING_GAPS_PLAN.md`
- **Systemic Fix Plan**: `docs/fixes/ONBOARDING_SYSTEMIC_FIX_PLAN.md`
- **Gap Detection Matrix**: `docs/implementation/GAP_DETECTION_MATRIX.csv`
- **Feature Flags**: `docs/backlog/HIDDEN_FEATURES.md`
