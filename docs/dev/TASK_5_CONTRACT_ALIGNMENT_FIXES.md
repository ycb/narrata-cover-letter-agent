# Task 5: Contract Alignment Fixes

**Date:** 2025-11-28  
**Branch:** `streaming-mvp`  
**Status:** ✅ All fixes applied

## Summary of Contract Mismatches Fixed

### 1. ✅ Role Insights Sourcing (CRITICAL FIX)

**Problem:** Adapter was sourcing `roleInsights` from `goalsAndStrengths.data.roleInsights`  
**Correct:** `roleInsights` is emitted in `jdAnalysis.data.roleInsights`

**Fix Applied:**
```typescript
// BEFORE (WRONG)
roleInsights: goalsAndStrengthsData?.roleInsights

// AFTER (CORRECT)
roleInsights: jdAnalysisData?.roleInsights
```

### 2. ✅ JD Requirement Summary Key Names

**Problem:** Using non-canonical keys `coreRequirementsCount`, `preferredRequirementsCount`, exposing as `coreCount`, `preferredCount`  
**Correct:** Backend emits `coreTotal`, `preferredTotal`

**Fix Applied:**
```typescript
// BEFORE (WRONG)
jdRequirementSummary?: {
  coreCount: number;
  preferredCount: number;
  inferredLevel?: string;
  inferredScope?: string;
}

// AFTER (CORRECT)
jdRequirementSummary?: { coreTotal: number; preferredTotal: number }
```

**Note:** Removed `inferredLevel` and `inferredScope` from this object — those belong in `roleInsights` if needed.

### 3. ✅ Role Insights Shape

**Problem:** Shape didn't match approved contract (missing `inferredRoleLevel`, `inferredRoleScope`; wrong shapes for `titleMatch`, `scopeMatch`, `goalAlignment`)

**Fix Applied:**
```typescript
// BEFORE (WRONG)
roleInsights?: {
  titleMatch?: {
    matchedTitles: string[];
    totalTargetTitles: number;
    matchStrength: 'strong' | 'moderate' | 'weak';
  };
  scopeMatch?: {
    jdScope: string;
    userTargetScope: string;
    alignment: 'aligned' | 'stretch' | 'underscoped';
  };
  goalAlignment?: {
    summary: string;
    alignedGoalsCount: number;
    totalGoalsCount: number;
  };
}

// AFTER (CORRECT)
roleInsights?: {
  inferredRoleLevel?: 'APM' | 'PM' | 'Senior PM' | 'Staff' | 'Group';
  inferredRoleScope?: 'feature' | 'product' | 'product_line' | 'multiple_teams' | 'org';
  titleMatch?: { exactTitleMatch: boolean; adjacentTitleMatch: boolean };
  scopeMatch?: { scopeRelation: 'belowExperience' | 'goodFit' | 'stretch' | 'bigStretch' };
  goalAlignment?: { alignsWithTargetTitles: boolean; alignsWithTargetLevelBand: boolean };
}
```

### 4. ✅ Company Context Fields

**Problem:** Missing `source` and `confidence` fields  
**Correct:** Backend emits both fields as part of contract

**Fix Applied:**
```typescript
// BEFORE (INCOMPLETE)
companyContext?: {
  industry?: string;
  maturity?: string;
  businessModels?: string[];
}

// AFTER (COMPLETE)
companyContext?: {
  industry?: string;
  maturity?: 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth' | 'public' | string;
  businessModels?: string[];
  source?: 'jd' | 'web' | 'mixed';
  confidence?: number;
}
```

### 5. ✅ Stage Flags - Missing hasRequirementAnalysis

**Problem:** Only tracking `hasJdAnalysis` and `hasGoalsAndStrengths`  
**Correct:** Need explicit flag for `requirementAnalysis` stage (3 total A-phase stages)

**Fix Applied:**
```typescript
// BEFORE (INCOMPLETE)
stageFlags: {
  hasJdAnalysis: boolean;
  hasGoalsAndStrengths: boolean;
  // ...
  phaseComplete: boolean; // true when both stages complete
}

// AFTER (COMPLETE)
stageFlags: {
  hasJdAnalysis: boolean;
  hasRequirementAnalysis: boolean; // NEW
  hasGoalsAndStrengths: boolean;
  // ...
  phaseComplete: boolean; // true when ALL THREE stages complete
}
```

### 6. ✅ Derived Flags Computation

**Problem:** Computing `hasRoleInsights` and `hasJdRequirementSummary` from `goalsAndStrengths`  
**Correct:** Both should be computed from `jdAnalysis`

**Fix Applied:**
```typescript
// BEFORE (WRONG)
const hasRoleInsights = hasGoalsAndStrengths && !!goalsAndStrengthsData?.roleInsights;
const hasJdRequirementSummary = hasJdAnalysis && (
  jdAnalysisData?.coreRequirementsCount !== undefined ||
  jdAnalysisData?.preferredRequirementsCount !== undefined
);

// AFTER (CORRECT)
const hasRoleInsights = hasJdAnalysis && !!jdAnalysisData?.roleInsights;
const hasJdRequirementSummary =
  hasJdAnalysis &&
  !!jdAnalysisData?.jdRequirementSummary &&
  (typeof jdAnalysisData.jdRequirementSummary.coreTotal === 'number' ||
   typeof jdAnalysisData.jdRequirementSummary.preferredTotal === 'number');
```

### 7. ✅ Phase Completion Logic

**Problem:** `phaseComplete` only checked 2 stages  
**Correct:** Must check all 3 A-phase stages

**Fix Applied:**
```typescript
// BEFORE (INCOMPLETE)
const phaseComplete = hasJdAnalysis && hasGoalsAndStrengths;

// AFTER (COMPLETE)
const phaseComplete = hasJdAnalysis && hasRequirementAnalysis && hasGoalsAndStrengths;
```

## Files Changed

1. **`src/types/jobs.ts`**
   - Updated `JdAnalysisStageData` to canonical contract
   - Updated `GoalsAndStrengthsStageData` to canonical contract
   - Updated `APhaseInsights` interface to match approved shapes
   - Added `hasRequirementAnalysis` to stageFlags

2. **`src/hooks/useAPhaseInsights.ts`**
   - Fixed data sourcing (roleInsights from jdAnalysis, not goalsAndStrengths)
   - Fixed key names (coreTotal/preferredTotal)
   - Added hasRequirementAnalysis flag computation
   - Updated phaseComplete logic (3 stages)
   - Fixed derived flag computation

3. **`src/components/cover-letters/CoverLetterModal.tsx`**
   - Enhanced diagnostic logging to show all stage flags
   - Added individual stage completion logs

4. **`docs/dev/TASK_5_A_PHASE_INSIGHTS_IMPLEMENTATION.md`**
   - Updated to reflect canonical contract
   - Added data sourcing documentation
   - Updated banner progression stages (3 stages)

## Verification

### ✅ Type Safety
- All types align with approved backend contract
- No linter errors in any file
- TypeScript strict mode passes

### ✅ Data Flow
- `roleInsights` → `jdAnalysis.data.roleInsights` ✅
- `jdRequirementSummary` → `jdAnalysis.data.jdRequirementSummary` ✅
- `mws` → `goalsAndStrengths.data.mws` ✅
- `companyContext` → `goalsAndStrengths.data.companyContext` ✅

### ✅ Stage Tracking
- Three explicit stage flags: `hasJdAnalysis`, `hasRequirementAnalysis`, `hasGoalsAndStrengths`
- `phaseComplete` requires all three stages
- Banner can show 0 → 1/3 → 2/3 → 3/3 progression

### ✅ Read-Only Guarantee
- Hook remains pure (useMemo)
- No writes to draft or enhancedMatchData
- No side effects

### ✅ Feature Flag Protection
- All behavior behind `ENABLE_A_PHASE_INSIGHTS`
- Graceful null handling when flag is off

## Testing Notes

To verify the contract alignment:

1. **Check stage data sourcing:**
```javascript
// When backend emits jdAnalysis.data.roleInsights
// Adapter should populate aPhaseInsights.roleInsights
console.log(aPhaseInsights.roleInsights); // Should NOT be null
console.log(aPhaseInsights.stageFlags.hasRoleInsights); // Should be true
```

2. **Verify requirement summary keys:**
```javascript
// Backend emits: jdAnalysis.data.jdRequirementSummary = { coreTotal: 11, preferredTotal: 3 }
console.log(aPhaseInsights.jdRequirementSummary.coreTotal); // Should be 11
console.log(aPhaseInsights.jdRequirementSummary.preferredTotal); // Should be 3
```

3. **Check three-stage progression:**
```javascript
// Stage 1 complete
console.log(aPhaseInsights.stageFlags.hasJdAnalysis); // true
console.log(aPhaseInsights.stageFlags.phaseComplete); // false (need 2 more)

// Stage 2 complete
console.log(aPhaseInsights.stageFlags.hasRequirementAnalysis); // true
console.log(aPhaseInsights.stageFlags.phaseComplete); // false (need 1 more)

// Stage 3 complete
console.log(aPhaseInsights.stageFlags.hasGoalsAndStrengths); // true
console.log(aPhaseInsights.stageFlags.phaseComplete); // true (all 3 complete)
```

4. **Verify company context fields:**
```javascript
// Backend should emit source and confidence
console.log(aPhaseInsights.companyContext?.source); // 'jd' | 'web' | 'mixed'
console.log(aPhaseInsights.companyContext?.confidence); // 0-1 number
```

## Contract Compliance Checklist

- [x] `roleInsights` sourced from `jdAnalysis` (not `goalsAndStrengths`)
- [x] `jdRequirementSummary` uses `coreTotal` / `preferredTotal` (not `coreCount` / `preferredCount`)
- [x] `roleInsights` shape matches approved contract (inferredRoleLevel, inferredRoleScope, titleMatch, scopeMatch, goalAlignment)
- [x] `companyContext` includes `source` and `confidence` fields
- [x] `stageFlags` includes `hasRequirementAnalysis`
- [x] `hasRoleInsights` computed from `jdAnalysis` (not `goalsAndStrengths`)
- [x] `hasJdRequirementSummary` computed from `jdAnalysis`
- [x] `phaseComplete` requires all 3 stages (jdAnalysis + requirementAnalysis + goalsAndStrengths)
- [x] All types align with backend emission contract
- [x] Adapter remains pure/read-only
- [x] Zero linter errors
- [x] Documentation updated

## Next Integration Steps

With contract alignment complete, downstream tasks can proceed:

1. **Banner Component** - Use `stageFlags` for 3-stage progression (0 → 1/3 → 2/3 → 3/3)
2. **Toolbar Accordions** - Display `roleInsights`, `jdRequirementSummary`, `mws`, `companyContext`
3. **Backend Integration** - Task 4 worker can emit stages knowing frontend will consume correctly

All contract mismatches have been resolved. The normalizer is now safe for UI integration.

