# Task 6 Verification Checklist

## ✅ Implementation Complete

### 1. Replace basicMetrics References ✅
- [x] Line 671-679: Progress calculation in useEffect uses `hasJdAnalysis` instead of `basicMetrics`
- [x] Line 1535-1543: Render progress calculation uses `hasJdAnalysis` instead of `basicMetrics`
- [x] Removed all references to `basicMetrics` stage name
- [x] Updated diagnostic logging to track `jdAnalysis` stage

### 2. Map Stage Labels ✅
- [x] `jdAnalysis` → "Analyzing job description" (line 311)
- [x] `requirementAnalysis` → "Extracting requirements" (line 314)
- [x] `goalsAndStrengths` → "Matching with goals and strengths" (line 317)

### 3. Progress Mapping ✅
- [x] 0% → No stages complete
- [x] 10% → jdAnalysis complete
- [x] 20% → requirementAnalysis complete  
- [x] 30% → goalsAndStrengths complete (all A-phase stages)
- [x] 100% → Draft exists

### 4. Prevent Backwards Movement ✅
- [x] Existing `peakProgress` mechanism in place (line 687-693)
- [x] `peakProgress` updated on every progress advance
- [x] `peakProgress` reset only when skeleton completes (line 692)
- [x] Progress never decreases during generation (line 1545-1547)

### 5. Source of Truth ✅
- [x] Progress computed from `aPhaseInsights.stageFlags` only
- [x] No dependency on draft metrics for progress calculation
- [x] No dependency on toolbar counts for progress
- [x] Draft presence → 100% (final state only)

## ❌ Not Changed (By Design)

- [x] Draft generation API (`generateDraft`) - untouched
- [x] Toolbar numeric badges - remain draft-based
- [x] `requirementAnalysis` schema - untouched
- [x] Enhanced match data structure - untouched

## Testing Scenarios

### Scenario 1: Normal Generation Flow
**Expected:**
1. User clicks "Generate cover letter"
2. Progress: 0%
3. jdAnalysis completes → 10%, "Analyzing job description" ✓
4. requirementAnalysis completes → 20%, "Extracting requirements" ✓
5. goalsAndStrengths completes → 30%, "Matching with goals and strengths" ✓
6. Draft generation continues (30% → 95% animated)
7. Draft arrives → 100%, banner disappears

### Scenario 2: Regeneration (No Backwards Movement)
**Expected:**
1. Draft exists (100%)
2. User regenerates
3. Old draft cleared, new job starts
4. Progress never goes below previous peak
5. Stages arrive: 0% → 10% → 20% → 30%
6. Draft arrives: 100%

### Scenario 3: Stage Failure
**Expected:**
1. jdAnalysis completes → 10%
2. requirementAnalysis fails
3. Progress holds at 10% (doesn't regress)
4. Error banner displays
5. User can retry

## Code Quality

- [x] No linter errors
- [x] TypeScript types correct
- [x] Comments explain Task 6 changes
- [x] Diagnostic logging updated
- [x] Consistent naming (A-phase stages)

## Documentation

- [x] Implementation guide created (TASK_6_BANNER_STAGE_MAPPING.md)
- [x] Verification checklist created (this file)
- [x] Changes logged with Task 6 references
- [x] Related docs referenced (Task 5, useAPhaseInsights)

## Sign-Off

**Implemented by:** Claude (Sonnet)  
**Date:** 2025-11-28  
**Branch:** streaming-mvp  
**Status:** ✅ Ready for QA

