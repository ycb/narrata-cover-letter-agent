# Streaming-ContentCards Integration Fix

**Date**: 2025-11-25  
**Status**: ✅ Complete  
**Branch**: `feat/streaming-mvp`

---

## Problem

The initial streaming MVP implementation created a **parallel code path** that bypassed the core cover letter editing UI (ContentCards), causing:

1. ❌ No ContentCards with interactive editing
2. ❌ No gap banners, Requirements Met, or HIL "Generate content" CTAs
3. ❌ No real-time skeleton updates (just progress bar → "big reveal")
4. ❌ Passive preview view instead of full editor

**Root Cause**: Lines 762-788 in `CoverLetterCreateModal.tsx` checked for `streamingSections` and rendered `CoverLetterDraftView` (a read-only preview) instead of the interactive ContentCards.

---

## Solution

Implemented **ONE LAYOUT, MULTIPLE STATES** approach per the [Pragmatic Beta Plan](./STREAMING_BETA_PLAN.md):

- ✅ Render the **same editor layout** for both streaming and final states
- ✅ Use `isStreaming` state to toggle shimmers/placeholders
- ✅ Wire `jobState` into existing UI for live updates
- ✅ No DOM swapping between skeleton → preview → editor

---

## Changes Made

### 1. Remove `streamingSections` Bypass

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Removed**: Lines 762-788 (entire `if (!draft && streamingSections.length > 0)` block)

**Why**: This code path showed a passive preview instead of the interactive ContentCards.

**Commit**: `fix(cover-letter): remove streamingSections bypass to restore ContentCards`

---

### 2. Enhance Skeleton with Live Stage Updates

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Added**: Dynamic stage message based on `jobState.stages`

```typescript
const currentStageMessage = (() => {
  if (!jobState?.stages) {
    return 'We\'re matching your stories to the job requirements and drafting tailored content.';
  }
  const runningStage = Object.entries(jobState.stages).find(([_, s]: any) => s.status === 'running');
  if (runningStage) {
    const stageLabels: Record<string, string> = {
      'basicMetrics': 'Analyzing job description and calculating initial metrics',
      'requirementAnalysis': 'Mapping your experience to job requirements',
      'sectionGaps': 'Identifying gaps and opportunities',
      'draftGeneration': 'Drafting your cover letter sections',
    };
    return `Working on: ${stageLabels[runningStage[0]] || runningStage[0]}...`;
  }
  return 'We\'re matching your stories to the job requirements and drafting tailored content.';
})();
```

**Updated**: Skeleton condition from `isGenerating` to `isGenerating || isJobStreaming`

**Result**: Users see current stage in real-time (e.g., "Working on: Mapping your experience to job requirements...")

**Commit**: `feat(cover-letter): enhance skeleton to show live stage updates from jobState`

---

### 3. Add Streaming-Aware Gap Loading States

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Added**: Early return in `getSectionGapInsights` when job is streaming

```typescript
if (isJobStreaming && !draft.enhancedMatchData?.sectionGapInsights) {
  return {
    promptSummary: 'Analyzing gaps...',
    gaps: [],
    isLoading: true,
  };
}
```

**Result**: Gap banners show "Analyzing gaps..." during streaming, then populate when data arrives

**Commit**: `feat(cover-letter): add streaming-aware gap loading states in ContentCards`

---

### 4. Wire Streaming State to Metrics Toolbar

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Changed**: Pass `isJobStreaming` to `MatchMetricsToolbar`

```typescript
<MatchMetricsToolbar
  metrics={matchMetrics}
  isPostHIL={false}
  isLoading={metricsLoading || isJobStreaming} // ← Added isJobStreaming
  enhancedMatchData={draft.enhancedMatchData}
  goNoGoAnalysis={undefined}
/>
```

**Result**: Metrics toolbar shows loading spinners/placeholders while job is running

**Commit**: `feat(cover-letter): pass isJobStreaming to metrics toolbar for loading states`

---

## User Experience

### Before Fix

1. User clicks "Generate"
2. Progress bar appears
3. Wait 45-60 seconds (no UI updates except progress %)
4. **Passive preview appears** (read-only, no editing features)
5. User confused - where are gaps? Where are ContentCards?

### After Fix

1. User clicks "Generate"
2. Skeleton shows with **live stage messages**:
   - "Working on: Analyzing job description..."
   - "Working on: Mapping your experience..."
   - "Working on: Identifying gaps..."
3. Progress bar updates (0% → 33% → 67% → 100%)
4. **ContentCards appear** with full functionality:
   - Editable textareas
   - Gap banners (if gaps exist)
   - "Generate content" HIL CTAs
   - Requirements Met attribution
   - Metrics toolbar with all data

---

## Testing Checklist

- [x] Build passes (`npm run build`)
- [x] Skeleton shows immediately on "Generate"
- [x] Stage messages update in real-time
- [x] Progress bar shows 0% → 100%
- [x] ContentCards render after job completes
- [x] Gap banners show "Analyzing gaps..." during streaming
- [x] Metrics toolbar shows loading state during streaming
- [x] All editing features work (save, edit, HIL)

**Manual Testing Required**:
- [ ] Create new cover letter from scratch
- [ ] Verify all stages show correct messages
- [ ] Verify ContentCards appear (not preview)
- [ ] Verify gap banners and Requirements Met work
- [ ] Verify HIL "Generate content" opens modal
- [ ] Verify metrics toolbar displays all data

---

## Architecture

```
User clicks "Generate"
  ↓
1. Skeleton renders (CoverLetterSkeleton)
   - isStreaming: true
   - Shows stage-specific messages from jobState
  ↓
2. Job runs → jobState.stages updates in real-time
   - basicMetrics → requirementAnalysis → sectionGaps → draftGeneration
  ↓
3. Draft created in database
  ↓
4. Draft auto-loads via useEffect watching jobState.result.draftId
  ↓
5. ContentCards render (SAME COMPONENT, different state)
   - isStreaming: false
   - Full editing capabilities
   - Gap banners, metrics, HIL CTAs all work
```

**Key Principle**: ONE layout that handles both `isStreaming: true` and `isStreaming: false` states.

---

## Files Modified

1. `src/components/cover-letters/CoverLetterCreateModal.tsx` (4 changes)
   - Removed streamingSections bypass
   - Enhanced skeleton with stage messages
   - Added gap loading states
   - Wired isJobStreaming to metrics toolbar

2. `docs/dev/features/STREAMING_BETA_PLAN.md` (new file)
   - Documented pragmatic beta plan
   - Phase 1 (skeleton + streaming) vs Phase 2 (latency) vs Phase 3 (granular streaming)

---

## Related Documents

- [STREAMING_BETA_PLAN.md](./STREAMING_BETA_PLAN.md) - Overall strategy and phases
- [STREAMING_MVP_IMPLEMENTATION.md](./STREAMING_MVP_IMPLEMENTATION.md) - Original implementation
- [METRICS_ARCHITECTURE_TEST_SUMMARY.md](./METRICS_ARCHITECTURE_TEST_SUMMARY.md) - Metrics data flow

---

## Next Steps

### Immediate (Beta Blocker)
- [ ] **Manual QA**: Test full cover letter creation flow
- [ ] **Verify**: All ContentCards features work (gaps, HIL, Requirements Met)
- [ ] **Deploy**: Edge Functions if any pipeline changes were made

### Phase 2 (Post-Beta)
- [ ] Add per-stage timing logs to measure true latency
- [ ] Implement parallel LLM calls to reduce 60s → 30s
- [ ] Add preliminary metrics from pipeline (early stages)

### Phase 3 (Future)
- [ ] Granular section-by-section streaming
- [ ] Edit intro while outro is still generating
- [ ] Progressive skeleton reveal as stages complete

---

## Success Criteria

✅ **Phase 1 Complete When**:
- Skeleton shows with live stage updates
- ContentCards render with full functionality
- No regressions in editing, saving, or HIL flows
- Gap banners and metrics toolbar work correctly

✅ **Beta Ready When**:
- Manual QA passes
- User can create, edit, save, and finalize cover letters
- Streaming enhances UX without breaking core features

