# Global Admin Evals Dashboard — Implementation Plan

**Date:** 2025-12-06  
**Goal:** Make `/admin/evals` match the rich UI of `/evals` with token/cost tracking

---

## Current State

- `/evals` → Rich dashboard with cards, charts (user-scoped)
- `/admin/evals` → Basic table view (global, all users)
- **89 records** in `evals_log` (from JD analysis, readiness checks)
- **Token/cost fields exist** but not displayed

---

## Simplified Approach

Instead of creating new Edge Functions, **reuse existing `admin-evals-query`** and compute aggregates client-side.

###  Phase 1: Fetch Raw Data ✅
- Edge Function `admin-evals-query` already fetches raw `evals_log` rows
- Returns: `{ data: EvalLogEntry[], count: number }`

### Phase 2: Compute Aggregates Client-Side
Create utility: `/src/utils/evalsAggregates.ts`

```typescript
export function computeAggregates(rows: EvalLogEntry[]) {
  return {
    jobTypeAggregates: computeByJobType(rows),
    stageAggregates: computeByStage(rows),
    qualityBuckets: computeQualityDistribution(rows),
    recentFailures: rows.filter(r => !r.success).slice(0, 10),
    tokenCost: computeTokenCost(rows),
  };
}
```

### Phase 3: Update AdminEvalsDashboard
Replace table view with:

```tsx
<AdminEvalsDashboard>
  <AdminNav />
  <UserFilterControls />
  
  {/* Reuse existing rich cards */}
  <LatencyOverviewCard data={aggregates.jobTypeAggregates} />
  <TokenCostCard data={aggregates.tokenCost} /> {/* NEW */}
  <StageLatencyChart data={aggregates.stageAggregates} />
  <StructuralChecksCard data={aggregates.qualityBuckets} />
  <ErrorTable data={aggregates.recentFailures} />
</AdminEvalsDashboard>
```

### Phase 4: Add Token/Cost Card
- Display: Total tokens, estimated cost, breakdown by model
- Use existing fields: `prompt_tokens`, `completion_tokens`, `model`

---

## Benefits of This Approach

✅ **Reuses existing Edge Function** (no new deployment)  
✅ **Reuses existing UI components** (cards, charts)  
✅ **Simpler** — aggregation logic in one place  
✅ **Faster** — less moving parts  
✅ **Works with 89 records** — client-side aggregation is fine for <1000 rows  

---

## File Changes

| File | Change |
|------|--------|
| `/src/utils/evalsAggregates.ts` | NEW — client-side aggregation logic |
| `/src/components/evaluation/pipeline/TokenCostCard.tsx` | NEW — token/cost display |
| `/src/pages/admin/AdminEvalsDashboard.tsx` | Replace table with rich cards |
| `/src/hooks/useAdminEvalsData.ts` | Add aggregation after fetch |

**Total:** 4 files (1 new util, 1 new card, 2 updates)

---

## Estimated Time

- **Phase 1:** ✅ Done (Edge Function exists)
- **Phase 2:** 30 min (aggregation utils)
- **Phase 3:** 30 min (update AdminEvalsDashboard)
- **Phase 4:** 20 min (TokenCostCard already created)

**Total:** ~1-1.5 hours

---

## Next Steps

1. Create `/src/utils/evalsAggregates.ts`
2. Update `/src/hooks/useAdminEvalsData.ts` to compute aggregates
3. Replace `/src/pages/admin/AdminEvalsDashboard.tsx` with rich UI
4. Test with existing 89 records
5. Deploy (no backend changes needed!)

---

**Proceed?**

