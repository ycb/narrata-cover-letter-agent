# Task 5: A-Phase Streaming Insights Implementation

**Branch:** `streaming-mvp`  
**Feature Flag:** `ENABLE_A_PHASE_INSIGHTS`  
**Status:** ✅ Complete (Contract-aligned)

## Overview

Implemented a pure, read-only adapter hook (`useAPhaseInsights`) that normalizes streaming job state into structured insights for the banner and toolbar, without modifying any draft-based metrics, requirements, or gaps.

**Contract Alignment:** All types and data sourcing align with the approved backend contract:
- `roleInsights` sourced from `jdAnalysis` (NOT goalsAndStrengths)
- `jdRequirementSummary` uses canonical keys (`coreTotal`, `preferredTotal`)
- `companyContext` includes `source` and `confidence` fields
- `stageFlags` includes `hasRequirementAnalysis` for explicit three-stage tracking
- `phaseComplete` requires all three A-phase stages (jdAnalysis, requirementAnalysis, goalsAndStrengths)

## Files Changed

### 1. Type Definitions (`src/types/jobs.ts`)

**Added A-Phase Stage Data Types (Canonical Contract):**
- `JdAnalysisStageData` - JD parsing results (roleInsights with inferred level/scope, jdRequirementSummary)
- `GoalsAndStrengthsStageData` - User alignment data (MWS, company context with source/confidence)

**Updated `CoverLetterStreamState`:**
- Added `jdAnalysis` and `goalsAndStrengths` optional stage fields
- Each stage includes `status` and `data` fields

**Added `APhaseInsights` Interface (Canonical Contract):**
```typescript
export interface APhaseInsights {
  roleInsights?: {
    inferredRoleLevel?: 'APM' | 'PM' | 'Senior PM' | 'Staff' | 'Group';
    inferredRoleScope?: 'feature' | 'product' | 'product_line' | 'multiple_teams' | 'org';
    titleMatch?: { exactTitleMatch: boolean; adjacentTitleMatch: boolean };
    scopeMatch?: { scopeRelation: 'belowExperience' | 'goodFit' | 'stretch' | 'bigStretch' };
    goalAlignment?: { alignsWithTargetTitles: boolean; alignsWithTargetLevelBand: boolean };
  };
  jdRequirementSummary?: { coreTotal: number; preferredTotal: number };
  mws?: {
    summaryScore?: number;
    details: Array<{
      label: string;
      strengthLevel: 'strong' | 'moderate' | 'light';
      explanation: string;
    }>;
  };
  companyContext?: {
    industry?: string;
    maturity?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'public' | string;
    businessModels?: string[];
    source?: 'jd' | 'web' | 'mixed';
    confidence?: number;
  };
  stageFlags: {
    hasJdAnalysis: boolean;
    hasRequirementAnalysis: boolean;
    hasGoalsAndStrengths: boolean;
    hasRoleInsights: boolean;
    hasJdRequirementSummary: boolean;
    hasMws: boolean;
    hasCompanyContext: boolean;
    phaseComplete: boolean; // true when all THREE A-phase stages completed
  };
}
```

### 2. Hook Implementation (`src/hooks/useAPhaseInsights.ts`)

**Purpose:**
- Pure transformation hook (no side effects)
- Reads from `jobState.stages`
- Outputs normalized `APhaseInsights` object
- NEVER writes to draft or modifies any draft-related data

**Key Features:**
- Explicit null/undefined handling
- Stage flags computed ONLY from stage presence & completion status
- Does NOT infer from draft state
- Handles A-phase failure gracefully (returns empty insights)
- Type-safe with full TypeScript coverage

**Signature:**
```typescript
function useAPhaseInsights(jobState: JobStreamState | null): APhaseInsights | null
```

**Data Sourcing (Canonical Contract):**
- `roleInsights` → sourced from `jdAnalysis.data.roleInsights` (NOT goalsAndStrengths)
- `jdRequirementSummary` → sourced from `jdAnalysis.data.jdRequirementSummary`
- `mws` → sourced from `goalsAndStrengths.data.mws`
- `companyContext` → sourced from `goalsAndStrengths.data.companyContext` (includes source/confidence)

### 3. Integration (`src/components/cover-letters/CoverLetterModal.tsx`)

**Changes:**
1. Added import for `useAPhaseInsights`
2. Added feature flag constant: `ENABLE_A_PHASE_INSIGHTS = true`
3. Created `aPhaseInsights` by calling hook with `jobState`
4. Added diagnostic logging useEffect to track insight updates
5. Passed `aPhaseInsights` to `progressState` for downstream consumption

**Code Location:**
- Lines 62: Import statement
- Line 83: Feature flag definition
- Lines 320-323: Hook invocation
- Lines 325-341: Diagnostic logging
- Line 1587: Passed to DraftEditor via progressState

## Design Principles Followed

### ✅ Single Responsibility
- Hook has ONE job: normalize jobState → aPhaseInsights
- No mixing of concerns (no UI logic, no draft logic)

### ✅ Separation of Concerns
- A-phase insights completely separate from draft-based analytics
- No coupling between streaming data and final draft metrics
- Clear boundaries: jobState (in) → aPhaseInsights (out)

### ✅ Composition over Inheritance
- Hook is a pure function wrapper (useMemo)
- Can be easily composed with other hooks
- No inheritance hierarchies

### ✅ KISS (Keep It Simple)
- Straightforward data transformation
- No clever abstractions
- Easy to understand data flow

### ✅ DRY (Don't Repeat Yourself)
- Centralized normalization logic in one place
- Reusable across banner, toolbar, and future components

## Verification Checklist

### ✅ No Draft Modifications
- [x] Hook is pure (no setState, no mutations)
- [x] No writes to `draft.enhancedMatchData`
- [x] No modifications to requirements arrays
- [x] No changes to gap computation logic
- [x] Verified with grep: no `enhancedMatchData =` in hook

### ✅ Read-Only Adapter
- [x] Uses `useMemo` for pure transformation
- [x] Only reads from `jobState.stages`
- [x] Returns new object (no mutation)
- [x] No side effects (no API calls, no localStorage, etc.)

### ✅ Feature Flag Protection
- [x] All new behavior behind `ENABLE_A_PHASE_INSIGHTS`
- [x] Hook returns null when flag is off
- [x] Graceful degradation when insights unavailable

### ✅ Stage Flag Computation
- [x] Flags derived ONLY from stage presence/completion
- [x] Does NOT check draft state for flags
- [x] Explicit boolean checks (no implicit truthy/falsy)
- [x] `phaseComplete` = both A-phase stages complete

### ✅ Error Handling
- [x] Null checks for jobState
- [x] Type guard for coverLetter jobs only
- [x] Safe navigation for nested data
- [x] Defaults to empty/undefined for missing data

### ✅ No Linter Errors
- [x] jobs.ts: No errors
- [x] useAPhaseInsights.ts: No errors
- [x] CoverLetterModal.tsx: No errors

## Next Steps (Out of Scope for Task 5)

These are for downstream tasks:

1. **Banner Component** - Use `aPhaseInsights.stageFlags` for progress mapping
2. **Toolbar Accordions** - Display streaming insights from `aPhaseInsights`
3. **Backend Integration** - Implement A-phase streaming in worker (Task 4)
4. **Testing** - Simulate staged jobState updates, verify incremental updates

## Testing Notes

To test this implementation:

1. **Simulate jobState updates** in browser console:
```javascript
// Inject test data
window.__TEST_APHASE__ = {
  jdAnalysis: {
    status: 'complete',
    data: {
      coreRequirementsCount: 11,
      preferredRequirementsCount: 3,
      inferredLevel: 'Senior PM',
      inferredScope: 'Product'
    }
  }
};
```

2. **Check console logs** for diagnostic output:
```
[CoverLetterModal] [STREAM] A-phase insights updated: {
  hasJdAnalysis: true,
  hasGoalsAndStrengths: false,
  phaseComplete: false,
  ...
}
```

3. **Verify banner progression**:
- 0/3 stages: phaseComplete = false
- 1/3 stages: hasJdAnalysis = true
- 2/3 stages: hasRequirementAnalysis = true
- 3/3 stages: hasGoalsAndStrengths = true, phaseComplete = true

4. **Confirm draft independence**:
- A-phase insights should update even when draft is null
- Draft metrics/requirements/score should be unchanged
- Gap computation should remain draft-based

## Notes

- Hook is memoized - only recomputes when jobState reference changes
- All data is optional - graceful degradation at every level
- Stage flags are explicit booleans for clear conditional logic
- Designed for incremental streaming (stages arrive independently)
- No assumptions about stage ordering or timing

