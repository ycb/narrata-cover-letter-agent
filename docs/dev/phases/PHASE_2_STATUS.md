# Phase 2: Progressive Streaming - Current Status

## Status: ⚠️ PARTIALLY IMPLEMENTED BUT NOT WORKING

**Last Updated**: 2025-11-20
**Time Invested**: ~8 hours
**Result**: Streaming callbacks implemented but not functioning as expected

---

## What Works ✅

1. **3-Way Parallel LLM Split**: Successfully split single 72s call into 3 parallel calls
   - `basicMetrics.ts` - Fast call (10-15s, 1500 tokens) for toolbar metrics
   - `requirementAnalysis.ts` - Medium call (15-20s, 2000 tokens) for requirement details
   - `sectionGaps.ts` - Slow call (20-30s, 5000 tokens) for section gap insights

2. **Data Generation**: All 3 calls complete successfully and generate correct data
   - Metrics populate correctly
   - Requirements analysis works
   - Section gaps render in UI

3. **Performance Improvement**: Total time reduced from 72s → ~45s (1.6x faster)

4. **Critical Bug Fixes**:
   - Token limit increased (3000 → 5000) to prevent response truncation
   - LLM prompt updated to require mandatory `sectionId` fields
   - Gap matching logic fixed to use unique `sectionId` instead of ambiguous `sectionSlug`

---

## What Doesn't Work ❌

### Critical Issue: No Progressive Streaming

**Expected Behavior**:
1. ~0s: Skeleton loads
2. ~13s: Basic metrics stream in (6 toolbar items populate)
3. ~41s: Requirement details stream in
4. ~45s: Section gaps stream in

**Actual Behavior**:
1. ~0s: Skeleton loads
2. ~45s: **ALL gaps appear at once**
3. ~60s: **ALL metrics appear at once**

**Console Evidence**:
```
[PHASE 2 STREAMING] Metrics updated for draft 047d2839-aa19-4629-8e6d-19dc10485a3d
[PHASE 2 STREAMING] Metrics updated for draft 047d2839-aa19-4629-8e6d-19dc10485a3d
[PHASE 2 STREAMING] Metrics updated for draft 047d2839-aa19-4629-8e6d-19dc10485a3d
```

Only **ONE callback fired** (logged 3 times), not three separate callbacks at different times.

---

## Root Cause Analysis

### Why Callbacks Don't Stream Progressively

**Hypothesis 1: React Batching**
- React batches state updates during async operations
- All 3 callbacks may be queued and processed as single update
- Async callbacks fire outside React's rendering cycle

**Hypothesis 2: Promise.all() Timing**
- Even though promises run in parallel, callbacks may be microtask-batched
- All 3 callbacks execute but React only re-renders once

**Hypothesis 3: Database Race Condition**
- All 3 calls try to update same DB row simultaneously
- Supabase may serialize writes internally
- Only final write triggers callback visible to UI

**Hypothesis 4: Hook Refetch Pattern**
- Each callback triggers async refetch from DB
- Multiple concurrent refetches may overwrite each other
- Only last refetch results in visible state update

### Key Difference from JD Parsing (Which Works)

**JD Parsing** (synchronous, works):
```typescript
sections.map((section, index) => {
  const built = buildSection(...);
  onSectionBuilt(built, index, total); // Fires IMMEDIATELY in sync loop
  return built;
});
```
- Synchronous loop
- Callbacks fire in order
- React re-renders immediately after each callback

**Metrics Streaming** (asynchronous, broken):
```typescript
Promise.all([
  (async () => {
    await calculateMetrics();
    await saveToDb();
    onMetricsProgress(draftId); // Fires async, outside React's control
  })(),
  // ... 2 more parallel promises
]);
```
- Asynchronous promises
- Callbacks fire outside React rendering cycle
- State updates don't trigger re-renders reliably

---

## Approaches Tried (All Failed)

### Attempt 1: Split + Callbacks
- Split into 3 parallel calls with callbacks
- **Failed**: DB fetch in `.then()` overwrote progressive updates

### Attempt 2: In-Memory State Merging
- Remove DB fetch, merge partial results in hook state
- **Failed**: Spread operators caused flickering (gaps appeared/disappeared)

### Attempt 3: Progress Messages Only
- Disable progressive UI, show text messages only
- **Failed**: No streaming value, user still waits 60s

### Attempt 4: DB Writes + Refetch
- Save partial results to DB, refetch in callback
- **Failed**: Async refetch doesn't trigger React re-render

### Attempt 5: Move Into generateDraftFast
- Copy JD parsing pattern exactly
- **Failed**: Only ONE callback fires instead of three

---

## Files Modified

### New Files Created:
- `src/prompts/basicMetrics.ts` - Fast metrics call
- `src/prompts/requirementAnalysis.ts` - Requirement analysis call
- `src/prompts/sectionGaps.ts` - Section gaps call
- `PHASE_2_STREAMING_FAILURE_ANALYSIS.md` - Detailed failure analysis
- `PHASE_2_PROGRESSIVE_STREAMING_COMPLETE.md` - Premature success doc (inaccurate)
- `PHASE_2_IMPLEMENTATION_SUMMARY.md` - Premature success doc (inaccurate)

### Modified Files:
- `src/services/coverLetterDraftService.ts`
  - Added `onMetricsProgress` callback parameter
  - Added 3 new methods: `calculateBasicMetrics`, `calculateRequirementAnalysis`, `calculateSectionGaps`
  - Modified `generateDraftFast` to fire-and-forget metrics calculation
  - Added DB writes after each parallel call

- `src/hooks/useCoverLetterDraft.ts`
  - Added `onMetricsProgress` callback handler with DB refetch
  - Removed separate `calculateMetricsForDraft()` call

- `src/types/coverLetters.ts`
  - Added `onMetricsProgress?: (draftId: string) => void` to `DraftGenerationOptions`

- `src/components/cover-letters/CoverLetterCreateModal.tsx`
  - Fixed gap matching logic: `sectionSlug` → `sectionId` (CRITICAL FIX)

### Debug Logging to Remove:
- `[PHASE 2 STREAMING]` logs in hook
- `[PHASE 2 PROGRESSIVE]` logs in service
- `[PHASE 2 DEBUG]` logs in modal

---

## Recommendations

### Option 1: Revert Everything (Safest) ⭐ RECOMMENDED
**Pros**:
- Code works predictably
- No flickering or confusion
- Clean codebase

**Cons**:
- User still waits 72s (vs 45s with parallel calls)
- No progressive feedback

**Action Items**:
1. Revert `coverLetterDraftService.ts` to single-call approach
2. Restore hook's separate `calculateMetricsForDraft` call
3. Delete 3 new prompt files
4. Remove `onMetricsProgress` from types
5. Keep the critical bug fixes (sectionId matching, token limit)

### Option 2: Keep Parallel Calls, Remove Streaming
**Pros**:
- Faster completion (45s vs 72s)
- No flickering
- Simpler than streaming

**Cons**:
- Still long wait
- No progressive feedback

**Action Items**:
1. Keep 3-way parallel split for speed
2. Remove all `onMetricsProgress` callbacks
3. Show single spinner with fake progress percentage
4. Update once when all 3 calls complete

### Option 3: Implement True Streaming (SSE)
**Pros**:
- True progressive streaming
- No React batching issues
- Professional solution

**Cons**:
- Requires backend changes (SSE endpoint)
- More complex architecture
- Significant dev time investment

**Action Items**:
1. Create Supabase Edge Function for SSE
2. Stream metrics as they're calculated
3. Hook subscribes to SSE events
4. Update state as events arrive

### Option 4: Try Smarter Model (Opus/o1)
**Pros**:
- May identify race condition faster
- Could implement SSE correctly
- Fresh perspective

**Cons**:
- More expensive
- No guarantee of success
- May hit same architectural limits

---

## Decision Needed

**Question for stakeholder**: Which option should we pursue?

1. **Revert** (safest, 72s wait, clean code)
2. **Keep parallel** (45s wait, no streaming, simpler)
3. **Implement SSE** (true streaming, complex, time investment)
4. **Try smarter model** (expensive, uncertain outcome)

**My recommendation**: **Option 1 (Revert)** or **Option 2 (Keep parallel without streaming)**

The current half-working state is worse than either alternative. We spent 8 hours and couldn't solve the async callback issue. Better to have a working slower experience or a working faster experience without streaming than a broken streaming experience.

---

## Performance Metrics

### Before Phase 2:
- Single call: **72 seconds**
- Time to first data: **72 seconds**

### Current State (Parallel but No Streaming):
- Total time: **~45 seconds**
- Time to first data: **45 seconds** (no improvement in perceived speed)
- User experience: Worse (confusion about progress)

### If Streaming Worked (Hypothetical):
- Total time: **~45 seconds**
- Time to first data: **~13 seconds** (5.5x improvement)
- User experience: Much better (continuous feedback)

---

## Next Steps

**Awaiting decision on which option to pursue.**

Once decided:
1. Execute chosen approach
2. Remove debug logging
3. Delete contradictory documentation
4. Test thoroughly
5. Document final state

**Files to clean up regardless of decision**:
- `PHASE_2_PROGRESSIVE_STREAMING_COMPLETE.md` (DELETE - inaccurate)
- `PHASE_2_IMPLEMENTATION_SUMMARY.md` (DELETE - inaccurate)
- `PHASE_2_STREAMING_FAILURE_ANALYSIS.md` (KEEP for reference)
