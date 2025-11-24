# Section Attribution Root Cause Analysis

**Date**: 2025-11-20
**Severity**: CRITICAL
**Impact**: Section-level attribution completely broken - all sections showing 0 requirements met

---

## Problem Statement

### Observed Symptoms
1. **Core Requirements**: UI shows "3/12" total, but "Requirements Met: 0 core" on ALL sections
2. **Preferred Requirements**: No requirements attributed to any section (0 pref on all)
3. **Content Standards**: All sections show "0/9 standards", but metrics toolbar shows "3 standards met"

### Expected Behavior
- Each section should show which core/pref requirements it addresses
- Standards (letter-level) should show same 3/9 count across all sections
- Counts should match toolbar and provide source attribution

---

## Root Cause

### Issue 1: UUID vs Semantic Type Mismatch

**Location**: `src/components/cover-letters/useSectionAttribution.ts:92-94`

**Problem**:
```typescript
// OLD BROKEN CODE
return sectionIds.some(id =>
  id === sectionId || normalizedTypes.includes(id.toLowerCase())
);
```

**What the code expected**:
- `sectionIds` from LLM: semantic types like `["introduction", "experience", "closing"]`
- `sectionId` param: semantic type string like `"introduction"`

**What the code actually got**:
- `sectionIds` from service: UUIDs like `["550e8400-e29b-41d4-a716-446655440000"]`
- `sectionId` param: UUID like `"550e8400-e29b-41d4-a716-446655440000"`

**Why the match failed**:
1. First condition `id === sectionId`: ✅ Should work (UUID == UUID)
2. Second condition `normalizedTypes.includes(id.toLowerCase())`: ❌ **BACKWARDS LOGIC**
   - Checks if `["introduction", "experience"]` includes UUID string
   - Should check if UUID includes semantic type OR semantic type matches

**Evidence**:
- `src/services/requirementsMatchService.ts:83`: `matchedSectionIds.push(section.id)` ← Uses UUID
- Service returns UUIDs in `sectionIds` field
- LLM prompts ask for semantic types but service overrides with UUIDs

### Issue 2: Section Type Mismatch

**Location**: `src/components/cover-letters/CoverLetterDraftView.tsx:384`

**Problem**:
```typescript
const { attribution, summary } = useSectionAttribution({
  sectionId: section.id,
  sectionType: section.type,  // ← Problem: DraftSectionType
  enhancedMatchData,
  ratingCriteria,
});
```

**Type definitions**:
```typescript
// What section.type actually is:
type DraftSectionType = 'static' | 'dynamic-story' | 'dynamic-saved' | 'closing';

// What LLM/normalization expects:
type SemanticSectionType = 'introduction' | 'experience' | 'closing' | 'signature';
```

**Why it matters**:
- Normalization function tries to map `"static"` → `?` but has no mapping
- `"dynamic-story"` and `"dynamic-saved"` also have no mappings
- Only `"closing"` maps correctly

**Impact**: Even with UUID match working, semantic type fallback would fail for most sections

### Issue 3: Content Standards Display (Not a Bug)

**Location**: `src/components/cover-letters/useSectionAttribution.ts:142-157`

**What it does**:
```typescript
// Shows ALL standards (letter-level) in EVERY section
if (ratingCriteria && ratingCriteria.length > 0) {
  const metStandards = ratingCriteria.filter(c => c.met);
  attribution.standards.met = metStandards.map(/*...*/);
}
```

**This is CORRECT behavior**:
- Standards apply to entire letter, not individual sections
- Every section should show same "3/9 standards met"
- The issue is NO standards are being passed (ratingCriteria is empty/undefined)

---

## Fix Implemented

### Change 1: Fixed UUID Matching Logic

**File**: `src/components/cover-letters/useSectionAttribution.ts`

**Before**:
```typescript
return sectionIds.some(id =>
  id === sectionId || normalizedTypes.includes(id.toLowerCase())
);
```

**After**:
```typescript
return sectionIds.some(sid => {
  // Direct UUID match (service uses section.id which is UUID)
  if (sid === sectionId) return true;

  // Normalized type match (for LLM responses that use semantic types)
  const lowerSid = sid.toLowerCase();
  return normalizedTypes.some(nt => lowerSid.includes(nt) || nt.includes(lowerSid));
});
```

**Why this works**:
1. First tries exact UUID match (handles current service behavior)
2. Falls back to bidirectional substring matching for semantic types
3. Handles both UUID-based and semantic-type-based `sectionIds`

### Change 2: Applied to Both Core and Preferred Requirements

**Location**: Lines 91-98 (core) and 124-131 (pref)

**Consistency**: Same matching logic applied to both requirement types

---

## Remaining Issues to Investigate

### 1. Section Type Mismatch (Not Fixed Yet)

**Question**: What is the actual value of `section.type` being passed?
- Is it `DraftSectionType` (`'static'`, `'dynamic-story'`, etc.)?
- Or is there a different field with semantic type?

**Next Step**: Add console logging to see actual `section.type` values:
```typescript
console.log('Section attribution:', {
  id: sectionId,
  type: sectionType,
  normalizedTypes,
  sectionIds: req.sectionIds
});
```

### 2. Content Standards Not Populating

**Question**: Is `ratingCriteria` being passed correctly to `useSectionAttribution`?

**Evidence needed**:
- Check if `ratingCriteria` prop is defined in CoverLetterDraftView
- Verify it's being passed through from parent component
- Confirm it has the expected structure: `Array<{ id, label, met, evidence, suggestion }>`

**Next Step**: Add console logging in CoverLetterDraftView:
```typescript
console.log('Rating criteria:', ratingCriteria);
```

### 3. Service Data Flow Validation

**Question**: Does `enhancedMatchData.coreRequirementDetails` contain valid `sectionIds`?

**Evidence needed**:
- Log actual `enhancedMatchData` structure
- Verify `sectionIds` field is populated
- Confirm UUIDs match section IDs

**Next Step**: Add logging in attribution hook:
```typescript
console.log('Enhanced match data:', {
  coreReqCount: enhancedMatchData?.coreRequirementDetails?.length,
  prefReqCount: enhancedMatchData?.preferredRequirementDetails?.length,
  sampleSectionIds: enhancedMatchData?.coreRequirementDetails?.[0]?.sectionIds
});
```

---

## Testing Plan

### 1. Verify UUID Matching Works
- [ ] Check if any section now shows non-zero core requirements
- [ ] Verify counts add up correctly across sections
- [ ] Confirm evidence strings display

### 2. Debug Section Type Issue
- [ ] Add console logs for section type values
- [ ] Determine if normalization is even needed
- [ ] Fix mapping if necessary

### 3. Debug Standards Display
- [ ] Verify ratingCriteria is populated
- [ ] Check if standards appear in ANY section
- [ ] Confirm 3/9 count matches toolbar

### 4. End-to-End Validation
- [ ] Generate fresh cover letter draft
- [ ] Verify attribution appears correctly
- [ ] Cross-reference with toolbar metrics
- [ ] Test multiple section types (intro, experience, closing)

---

## Architecture Recommendations

### Short-term (Immediate)
1. ✅ Fix UUID matching logic (DONE)
2. Add debug logging to diagnose remaining issues
3. Fix section type mapping or eliminate semantic type fallback
4. Ensure ratingCriteria is passed through component tree

### Medium-term (This Sprint)
1. **Standardize section identification**:
   - Decide: UUID-only OR semantic types?
   - Update all services/prompts consistently
   - Document the contract

2. **Type safety**:
   - Create proper TypeScript interfaces for section types
   - Enforce at compile time, not runtime normalization

3. **Service layer consolidation**:
   - Remove duplicate logic between requirementsMatchService and LLM-based attribution
   - Single source of truth for section matching

### Long-term (Next Sprint)
1. **Refactor section model**:
   - Add explicit `semanticType` field to sections
   - Keep UUID for identity, semantic type for display/matching
   - Eliminate runtime normalization

2. **LLM prompt alignment**:
   - Update prompts to return UUIDs (if we keep UUID-based matching)
   - OR: Update services to use semantic types (if we switch)
   - Ensure consistency between prompt expectations and data model

3. **Comprehensive testing**:
   - Unit tests for attribution logic
   - Integration tests for full data flow
   - Fixtures with known section IDs for deterministic testing

---

## Lessons Learned

1. **Type mismatches are silent killers**: TypeScript didn't catch the UUID vs semantic type mismatch because both are strings
2. **Runtime normalization is fragile**: Trying to "fix" data at runtime hides schema mismatches
3. **Service-LLM contracts need documentation**: Unclear what format `sectionIds` should use
4. **Backward logic is easy to miss**: `normalizedTypes.includes(id)` looks correct at first glance
5. **Console logging is critical for data flow debugging**: Would have caught this immediately

---

## Status

**Fix Deployed**: ✅ UUID matching logic corrected
**Root Cause Found**: ✅ LLM returning empty `sectionIds` arrays
**Prompt Fixed**: ✅ Updated to use section IDs instead of slugs
**Testing Required**: ⚠️ Need to regenerate metrics with new prompt
**Follow-up Required**: ⚠️ Standards display issue (ratingCriteria undefined)

## Final Root Cause

Console debug revealed:
```javascript
{
  sectionId: "section-1-1",
  sectionType: "intro",
  coreReqCount: 12,
  sampleSectionIds: [],  // ← EMPTY!
  ratingCriteriaCount: undefined  // ← MISSING!
}
```

**The LLM is returning empty `sectionIds` arrays for all requirements.**

### Why This Happened

1. **Prompt ambiguity**: Original prompt said "use section slugs" but provided both ID and slug
2. **Token pressure**: Requirement analysis call limited to 2000 tokens, may be cutting corners
3. **Instruction unclear**: LLM didn't understand to populate sectionIds from the draft structure

### Fix Applied

Updated `src/prompts/requirementAnalysis.ts`:
- Changed instruction from "use section slugs" to "use section ID values"
- Added explicit example: `"sectionIds": ["section-2-2"]`
- Clarified to look for `[id: section-X-X]` prefix in draft

### To Test

User must regenerate cover letter metrics (re-run analysis) to get fresh LLM response with populated sectionIds.
