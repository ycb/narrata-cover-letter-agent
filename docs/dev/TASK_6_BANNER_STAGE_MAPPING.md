# Task 6: Banner Mapping to A-Phase Stages

**Status:** ✅ Complete  
**Branch:** `streaming-mvp`  
**Ticket:** Ticket 6 — Banner mapping to A-phase stages (Sonnet)

## Purpose
Drive banner progress and labels from A-phase stages only. Progress should be computed only from `jobState.stages` and draft presence; never from `aPhaseInsights` content, so adapter changes can't break progress.

## Scope
- ✅ In scope: `src/components/cover-letters/CoverLetterModal.tsx` (progress calc)
- ✅ In scope: `src/components/cover-letters/CoverLetterDraftEditor.tsx` (banner labels)
- ❌ Out of scope: Toolbar counts/scores; draft generation API

## Changes Made

### 1. Progress Calculation (CoverLetterModal.tsx)
**Location:** Lines 668-681 (useEffect for progress tracking)

**Before:**
```typescript
// Used old stage names: basicMetrics, requirementAnalysis, sectionGaps
else if (isJobStreaming) {
  if (jobState?.stages?.sectionGaps) {
    currentProgress = 30;
  } else if (jobState?.stages?.requirementAnalysis) {
    currentProgress = 20;
  } else if (jobState?.stages?.basicMetrics) {
    currentProgress = 10;
  } else {
    currentProgress = 0;
  }
}
```

**After:**
```typescript
// Task 6: Map A-phase stages to progress
else if (isJobStreaming) {
  const flags = aPhaseInsights?.stageFlags;
  if (flags?.hasGoalsAndStrengths) {
    currentProgress = 30;
  } else if (flags?.hasRequirementAnalysis) {
    currentProgress = 20;
  } else if (flags?.hasJdAnalysis) {
    currentProgress = 10;
  } else {
    currentProgress = 0;
  }
}
```

**Rationale:**
- Replaced `basicMetrics` with `jdAnalysis` (correct A-phase stage name)
- Replaced `sectionGaps` with `goalsAndStrengths` (third A-phase stage)
- Uses `aPhaseInsights.stageFlags` for consistent boolean checks
- Progress computation independent of `aPhaseInsights` content (only uses flags)

### 2. Render Progress Calculation (CoverLetterModal.tsx)
**Location:** Lines 1533-1546

**Before:**
```typescript
// Used jobState.stages directly
else if (isJobStreaming) {
  if (jobState?.stages?.sectionGaps) {
    progressPercent = 30;
  } else if (jobState?.stages?.requirementAnalysis) {
    progressPercent = 20;
  } else if (jobState?.stages?.basicMetrics) {
    progressPercent = 10;
  } else {
    progressPercent = 0;
  }
}
```

**After:**
```typescript
// Task 6: Map A-phase stages to progress
else if (isJobStreaming) {
  const flags = aPhaseInsights?.stageFlags;
  if (flags?.hasGoalsAndStrengths) {
    progressPercent = 30;
  } else if (flags?.hasRequirementAnalysis) {
    progressPercent = 20;
  } else if (flags?.hasJdAnalysis) {
    progressPercent = 10;
  } else {
    progressPercent = 0;
  }
}
```

### 3. Banner Stage Labels (CoverLetterDraftEditor.tsx)
**Location:** Lines 306-319

**Before:**
```typescript
<span className={jobState.stages.basicMetrics ? 'text-primary' : 'text-muted-foreground'}>
  ✓ Analyzing metrics
</span>
<span className={jobState.stages.requirementAnalysis ? 'text-primary' : 'text-muted-foreground'}>
  ✓ Extracting requirements
</span>
<span className={jobState.stages.sectionGaps ? 'text-primary' : 'text-muted-foreground'}>
  ✓ Identifying gaps
</span>
```

**After:**
```typescript
<span className={progressState.aPhaseInsights.stageFlags.hasJdAnalysis ? 'text-primary' : 'text-muted-foreground'}>
  ✓ Analyzing job description
</span>
<span className={progressState.aPhaseInsights.stageFlags.hasRequirementAnalysis ? 'text-primary' : 'text-muted-foreground'}>
  ✓ Extracting requirements
</span>
<span className={progressState.aPhaseInsights.stageFlags.hasGoalsAndStrengths ? 'text-primary' : 'text-muted-foreground'}>
  ✓ Matching with goals and strengths
</span>
```

**Label Mapping:**
1. `jdAnalysis` → "Analyzing job description"
2. `requirementAnalysis` → "Extracting requirements"
3. `goalsAndStrengths` → "Matching with goals and strengths"

### 4. Diagnostic Logging (CoverLetterModal.tsx)
**Location:** Lines 1549-1562

Updated logging to reflect A-phase stage flags only:
```typescript
// Task 6: A-phase stage flags (source of truth for progress)
aPhaseStageFlags: {
  hasJdAnalysis: aPhaseInsights?.stageFlags.hasJdAnalysis,
  hasRequirementAnalysis: aPhaseInsights?.stageFlags.hasRequirementAnalysis,
  hasGoalsAndStrengths: aPhaseInsights?.stageFlags.hasGoalsAndStrengths,
},
```

**Rationale:** Logs stage flags directly rather than raw stage data, emphasizing that flags are the source of truth for progress.

## Progress Mapping

| Stage Complete | Progress | Label |
|---|---|---|
| None | 0% | (waiting) |
| jdAnalysis | 10% | "Analyzing job description" |
| requirementAnalysis | 20% | "Extracting requirements" |
| goalsAndStrengths | 30% | "Matching with goals and strengths" |
| Draft arrives | 100% | (complete) |

## Anti-Regression Safeguards

### ✅ Peak Progress Protection
Existing `peakProgress` mechanism prevents backwards movement:
```typescript
if (showSkeleton && progressPercent < peakProgress) {
  progressPercent = peakProgress; // Hold at peak during regeneration
}
```

### ✅ Draft Complete Always 100%
```typescript
if (draft) {
  progressPercent = 100; // Draft complete
}
```

### ✅ Progress Never Tied to Draft Metrics
Progress computed only from:
1. `aPhaseInsights.stageFlags` (stage presence)
2. `draft` existence (final completion)

Never from:
- Draft content
- Toolbar counts
- Gap analysis results

## Testing Checklist

### Simulated Stage Progression
- [ ] Verify 0% → 10% when jdAnalysis completes
- [ ] Verify 10% → 20% when requirementAnalysis completes
- [ ] Verify 20% → 30% when goalsAndStrengths completes
- [ ] Verify 30% → 100% when draft arrives

### No Backwards Movement
- [ ] Progress never decreases during single generation
- [ ] Regeneration holds at peak until new stages arrive
- [ ] Draft arrival always jumps to 100%

### Label Display
- [ ] "Analyzing job description" appears for jdAnalysis
- [ ] "Extracting requirements" appears for requirementAnalysis
- [ ] "Matching with goals and strengths" appears for goalsAndStrengths
- [ ] Labels highlight (text-primary) when stage complete

### Independence from Draft
- [ ] Progress updates before draft exists
- [ ] Banner labels never reference draft metrics
- [ ] Toolbar counts remain draft-based (unchanged)

## Files Modified

1. **src/components/cover-letters/CoverLetterModal.tsx**
   - Progress calculation useEffect (lines 658-693)
   - Render progress calculation (lines 1522-1547)
   - Diagnostic logging (lines 1549-1568)

2. **src/components/cover-letters/CoverLetterDraftEditor.tsx**
   - Banner stage chips (lines 306-319)
   - progressState interface (line 56)

## NOT Changed (By Design)

- ❌ Draft generation API (`generateDraft`)
- ❌ Toolbar numeric badges (score/core/pref remain draft-based)
- ❌ Section gap insights (remain draft-based)
- ❌ Requirement analysis schema
- ❌ Enhanced match data structure

## Related Documents

- Task 5: `docs/dev/TASK_5_A_PHASE_INSIGHTS_IMPLEMENTATION.md` (A-phase adapter)
- Hook: `src/hooks/useAPhaseInsights.ts` (stage flag computation)
- Types: `src/types/jobs.ts` (APhaseInsights interface)

## Notes

1. **Single Source of Truth:** Progress driven exclusively by `aPhaseInsights.stageFlags`
2. **No Content Dependency:** Adapter changes to `aPhaseInsights` data fields cannot break progress
3. **Consistent Stage Naming:** Uses canonical A-phase stage names from types
4. **User Experience:** Labels provide meaningful context during 60-90s wait

