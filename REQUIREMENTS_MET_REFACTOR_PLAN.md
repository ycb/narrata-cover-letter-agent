# Requirements Met - Refactor Plan

**Date**: 2025-11-21
**Status**: ✅ ALL PHASES COMPLETE (Phase 1, 2, and 3 implemented and tested)
**Context**: Production-ready refactor with observability, dual-format support, and comprehensive tests

---

## Current State

### What Works
✅ Skeleton loading during streaming (grey animated boxes, no misleading 0/0 counts)
✅ Collapsed view with count-only badges using regular tag style ("3 core", "2 pref", "4 standards")
✅ Expanded drawer with three tabs matching metrics toolbar styling exactly
✅ Section-level attribution computed via pure function (loop-safe)
✅ Conditional rendering in ContentCard (SectionInspector vs legacy tags)

### Current Architecture
```
Component Tree:
- ContentCard (decides: SectionInspector vs tags)
  - SectionInspector (UI: skeleton → collapsed → expanded)
    - Collapsible (Radix UI)
      - TabsList + TabsTrigger (3 tabs: core/pref/standards)
      - TabsContent (met/unmet items with toolbar-matching styling)

Data Flow:
CoverLetterDraftView/CreateModal
  → useSectionAttribution() or computeSectionAttribution()
    → returns { attribution, summary }
      → ContentCard (sectionAttributionData, showAttributionSkeleton)
        → SectionInspector (data prop)
```

### Files
- `src/components/cover-letters/SectionInspector.tsx` (~150 lines - reduced via Option A)
- `src/components/cover-letters/RequirementItem.tsx` (60 lines - NEW, extracted component)
- `src/components/cover-letters/useSectionAttribution.ts` (218 lines)
- `src/components/shared/ContentCard.tsx` (integration logic)
- `src/components/cover-letters/CoverLetterDraftView.tsx` (usage)
- `src/components/cover-letters/CoverLetterCreateModal.tsx` (usage)
- `src/services/gapResolutionStreamingService.ts` (section attribution in HIL prompts)

---

## Problems to Solve

### 1. Code Duplication (✅ RESOLVED - Option A Implemented)

**Problem**: TabsContent sections for core/pref/standards were nearly identical (138 lines of duplicated JSX)

**Evidence**:
```tsx
// Lines 118-157: Core requirements
<TabsContent value="core" className="space-y-1">
  {data.coreReqs.met.map((req) => (
    <div key={req.id} className="p-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="mb-1.5">
          <h4 className="text-sm font-medium text-foreground">{req.label}</h4>
        </div>
        {req.evidence && (
          <div className="text-xs">
            <div>
              <span className="font-medium text-foreground/90">Status:</span>{' '}
              <span className="text-foreground/80">{req.evidence}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 p-2 flex items-center gap-2">
        <Check className="h-4 w-4 text-success" />
      </div>
    </div>
  ))}
  {data.coreReqs.unmet.map((req) => (/* ... same structure ... */))}
</TabsContent>

// Lines 158-197: Preferred requirements - IDENTICAL STRUCTURE
// Lines 199-238: Standards - IDENTICAL STRUCTURE with "Suggestion" instead of "Status"
```

**Impact**:
- Maintenance burden (3 places to update for any styling change)
- Higher bug risk (inconsistency between tabs)
- Violates DRY principle

### 2. Type Safety Gap (MEDIUM PRIORITY)

**Problem**: TypeScript doesn't enforce that `sectionId` matches actual section IDs in the codebase

**Evidence**:
```typescript
// Both are just strings - no compile-time validation
sectionId: string;
sectionType: string;

// Could pass wrong values:
useSectionAttribution({
  sectionId: "foo",  // ❌ Won't match anything but TypeScript allows it
  sectionType: "bar",
  // ...
});
```

**Impact**:
- Runtime bugs from typos or mismatched IDs
- No IDE autocomplete for valid section types
- Silent failures (empty attribution arrays)

### 3. Unclear Data Availability Logic (LOW PRIORITY)

**Problem**: Two overlapping conditions control skeleton display:
1. `showAttributionSkeleton` prop
2. `data === undefined`

**Evidence**:
```typescript
// ContentCard.tsx:203-207
{showAttributionSkeleton || sectionAttributionData !== undefined ? (
  <SectionInspector data={sectionAttributionData} />
) : tagsLabel && (/* legacy tags */)}

// SectionInspector.tsx:44-45
const showSkeleton = !data || isLoading;
```

**Impact**:
- Confusing logic (why both prop AND undefined check?)
- Could cause bugs if prop/data state get out of sync
- Makes testing harder (multiple paths to skeleton state)

### 4. Section Type Normalization Complexity (LOW PRIORITY)

**Problem**: Runtime normalization tries to map semantic types but doesn't handle all DraftSectionType values

**Evidence**:
```typescript
// useSectionAttribution.ts:14-38
const normalizeSectionType = (type: string): string[] => {
  const aliases: Record<string, string[]> = {
    'introduction': ['introduction', 'intro', 'opening'],
    'experience': ['experience', 'exp', 'background', 'body', 'paragraph'],
    'closing': ['closing', 'conclusion', 'closer'],
    'signature': ['signature', 'signoff'],
  };

  const typeMapping: Record<string, string> = {
    'intro': 'introduction',
    'paragraph': 'experience',
    'closer': 'closing',
  };

  // But DraftSectionType = 'static' | 'dynamic-story' | 'dynamic-saved' | 'closing'
  // 'static', 'dynamic-story', 'dynamic-saved' have NO mappings!
  // ...
};
```

**Impact**:
- Semantic type matching won't work for most sections
- UUID matching is primary path, but normalization adds complexity
- Could simplify or remove if LLM always returns UUIDs

---

## Refactor Options

### Option A: Extract RequirementItem Component (RECOMMENDED)

**Goal**: Eliminate duplication in TabsContent sections

**Changes**:
1. Create new component: `RequirementItem.tsx`
2. Props: `{ type: 'met' | 'unmet', label: string, evidence?: string, suggestion?: string }`
3. Encapsulates the `p-2 flex items-center gap-2` layout
4. Conditional rendering for evidence/suggestion
5. Replace all three TabsContent sections with loops calling `<RequirementItem />`

**Benefits**:
- Single source of truth for item styling
- Matches toolbar styling in one place
- Easy to test in isolation
- Future changes update all tabs automatically

**Example**:
```tsx
// New component: RequirementItem.tsx
interface RequirementItemProps {
  label: string;
  type: 'met' | 'unmet';
  evidence?: string;
  suggestion?: string;
}

export function RequirementItem({ label, type, evidence, suggestion }: RequirementItemProps) {
  return (
    <div className="p-2 flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <div className="mb-1.5">
          <h4 className="text-sm font-medium text-foreground">{label}</h4>
        </div>
        {evidence && (
          <div className="text-xs">
            <div>
              <span className="font-medium text-foreground/90">Status:</span>{' '}
              <span className="text-foreground/80">{evidence}</span>
            </div>
          </div>
        )}
        {suggestion && (
          <div className="text-xs">
            <div>
              <span className="font-medium text-foreground/90">Suggestion:</span>{' '}
              <span className="text-foreground/80">{suggestion}</span>
            </div>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 p-2 flex items-center gap-2">
        {type === 'met' ? (
          <Check className="h-4 w-4 text-success" />
        ) : (
          <X className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
}

// Usage in SectionInspector:
<TabsContent value="core" className="space-y-1">
  {data.coreReqs.met.map((req) => (
    <RequirementItem key={req.id} label={req.label} type="met" evidence={req.evidence} />
  ))}
  {data.coreReqs.unmet.map((req) => (
    <RequirementItem key={req.id} label={req.label} type="unmet" />
  ))}
</TabsContent>
```

**Effort**: ✅ COMPLETED (commit e9a4706)
**Risk**: Low (pure extraction, no logic changes)

**Results**:
- Created `RequirementItem.tsx` (60 lines)
- Reduced `SectionInspector.tsx` from 244 → ~150 lines
- Eliminated 138 lines of duplicated JSX
- Added responsive tab labels (full on desktop, short on mobile)
- Added horizontal scrolling for constrained layouts

---

### Option B: Simplify Skeleton Logic (✅ COMPLETED)

**Goal**: Single source of truth for skeleton display

**Changes**:
1. Remove `showAttributionSkeleton` prop from ContentCard
2. Use ONLY `sectionAttributionData === undefined` to trigger skeleton
3. Simplify SectionInspector to `if (!data) return <Skeleton />`
4. Remove `isLoading` prop (redundant)

**Benefits**:
- Clearer contract: "no data = skeleton, has data = render"
- Fewer props to track
- Easier to reason about component state

**Trade-offs**:
- Loses explicit loading flag (but we don't use it separately)
- Callers must ensure `undefined` is passed during streaming

**Example**:
```tsx
// ContentCard.tsx - BEFORE
{showAttributionSkeleton || sectionAttributionData !== undefined ? (
  <SectionInspector data={sectionAttributionData} />
) : tagsLabel && (/* ... */)}

// ContentCard.tsx - AFTER
{sectionAttributionData !== undefined ? (
  <SectionInspector data={sectionAttributionData} />
) : tagsLabel && (/* ... */)}

// SectionInspector.tsx - BEFORE
const showSkeleton = !data || isLoading;

// SectionInspector.tsx - AFTER
if (!data) {
  return <SkeletonState />;
}
```

**Effort**: ✅ COMPLETED (commit e7e6085)
**Risk**: Low (simplification, no new logic)

**Results**:
- Removed 2 redundant props (`showAttributionSkeleton`, `isLoading`)
- Reduced conditional complexity in ContentCard
- Early return pattern in SectionInspector for cleaner code
- Removed optional chaining (data guaranteed after undefined check)

---

### Option C: Add Type Safety for Section IDs

**Goal**: Prevent runtime bugs from invalid section IDs/types

**Changes**:
1. Create union type: `type SectionId = string & { __brand: 'SectionId' }`
2. Create union type: `type SemanticSectionType = 'introduction' | 'experience' | 'closing' | 'signature'`
3. Update function signatures to use branded types
4. Add validation helper: `assertValidSectionId()`

**Benefits**:
- Compile-time safety for section IDs
- IDE autocomplete for section types
- Catch mismatched IDs before runtime

**Trade-offs**:
- More boilerplate (type guards, assertions)
- Overkill if we always get correct IDs from backend
- Doesn't help with dynamic section IDs from LLM

**Example**:
```typescript
// New types
type SectionId = string & { __brand: 'SectionId' };
type SemanticSectionType = 'introduction' | 'experience' | 'closing' | 'signature';

// Updated function signature
export function useSectionAttribution({
  sectionId,
  sectionType,
  // ...
}: {
  sectionId: SectionId;  // ← Now typed!
  sectionType: SemanticSectionType;  // ← Now typed!
  // ...
}): { /* ... */ }

// Usage with type guard
const validSectionId = section.id as SectionId;  // Explicit cast
const { attribution, summary } = useSectionAttribution({
  sectionId: validSectionId,
  sectionType: 'introduction',  // ← IDE autocomplete!
  // ...
});
```

**Effort**: 2-3 hours
**Risk**: Medium (type system changes propagate)

---

### Option D: Remove Section Type Normalization

**Goal**: Simplify matching logic by relying on UUID-only

**Changes**:
1. Remove `normalizeSectionType()` function
2. Remove semantic type fallback in matching logic
3. Update matching to use only `sid === sectionId` (direct UUID match)
4. Update LLM prompts to ALWAYS return UUIDs in `sectionIds`

**Benefits**:
- Simpler, more reliable matching (exact UUID match)
- Less runtime overhead
- Clearer contract between LLM and code

**Trade-offs**:
- Breaks if LLM returns semantic types instead of UUIDs
- Need to ensure prompt engineering is consistent
- Loses flexibility (can't match by type)

**Example**:
```typescript
// BEFORE (lines 63-70 in useSectionAttribution.ts)
return sectionIds.some(sid => {
  if (sid === sectionId) return true;

  const lowerSid = sid.toLowerCase();
  return normalizedTypes.some(nt => lowerSid.includes(nt) || nt.includes(lowerSid));
});

// AFTER
return sectionIds.includes(sectionId);  // Simple array includes!
```

**Effort**: 1 hour
**Risk**: High (breaks if LLM doesn't return UUIDs consistently)
**Prerequisite**: Verify all LLM prompts return UUIDs, not semantic types

---

## Recommended Sequence

### Phase 1: Quick Wins (No Breaking Changes)
1. **Option A**: Extract `RequirementItem` component (1-2 hours)
   - Immediate DRY benefit
   - No breaking changes
   - Easy to test

2. **Option B**: Simplify skeleton logic (30 minutes)
   - Cleaner API
   - Removes prop redundancy
   - No breaking changes (internal only)

### Phase 2: Observability (Validate Before Refactoring)
3. **Add comprehensive logging** (30 minutes)
   - Log actual `sectionIds` values from LLM responses
   - Log section type values being passed
   - Determine if normalization is ever used in practice
   - Decision point: Keep or remove normalization?

### Phase 3: Architectural Improvements (After Validation)
4. **Option D OR Option C** (choose based on logging data)
   - If LLM always returns UUIDs: Remove normalization (Option D)
   - If LLM returns semantic types: Add type safety (Option C)
   - Don't do both (conflicting goals)

---

## Testing Plan

### Unit Tests
- [ ] `RequirementItem.tsx`: Renders met/unmet states correctly
- [ ] `RequirementItem.tsx`: Shows evidence when provided
- [ ] `RequirementItem.tsx`: Shows suggestion for unmet standards
- [ ] `SectionInspector.tsx`: Shows skeleton when data is undefined
- [ ] `SectionInspector.tsx`: Renders tabs with correct counts
- [ ] `useSectionAttribution.ts`: Matches sections by UUID
- [ ] `useSectionAttribution.ts`: Handles empty sectionIds arrays
- [ ] `computeSectionAttribution()`: Pure function with no side effects

### Integration Tests
- [ ] ContentCard renders SectionInspector when attribution data provided
- [ ] ContentCard renders legacy tags when no attribution data
- [ ] CoverLetterDraftView passes correct props during streaming
- [ ] CoverLetterDraftView updates attribution after metrics load

### Manual Testing
- [ ] Generate new cover letter and verify skeleton appears
- [ ] Wait for metrics and verify counts are accurate
- [ ] Expand drawer and verify all three tabs work
- [ ] Check console logs for attribution debug output
- [ ] Verify styling matches metrics toolbar exactly

---

## Open Questions

1. **Should we keep semantic type fallback?**
   - Need to check: Does LLM ever return semantic types in `sectionIds`?
   - If not, remove normalization complexity
   - If yes, improve type mappings for `'static'`, `'dynamic-story'`, etc.

2. **Should we enforce type safety for section IDs?**
   - Benefit: Catch bugs at compile time
   - Cost: More boilerplate, doesn't help with dynamic LLM responses
   - Alternative: Runtime validation with better error messages?

3. **Why is `ratingCriteria` undefined?**
   - RCA notes this issue but doesn't fix it
   - Need to trace: Where should `ratingCriteria` come from?
   - Is it computed in metrics calculation?
   - Should it be passed from parent component?

4. **Should standards be section-level or letter-level?**
   - Current design: Letter-level (all sections show same standards count)
   - Alternative: Section-level standards (different per section)
   - Decision impacts attribution logic significantly

---

## Success Metrics

### Code Quality
- Reduce SectionInspector.tsx from 244 lines to ~150 lines (component extraction)
- Zero duplication in TabsContent rendering
- All TypeScript strict mode violations resolved

### Performance
- No performance regression (pure function already optimized)
- Faster re-renders if skeleton logic simplified

### User Experience
- No visual changes (refactor only)
- Maintain exact toolbar styling match
- Keep skeleton loading behavior

---

## Rollback Plan

If refactor introduces bugs:
1. Revert to commit `7466998` (current working implementation)
2. Feature flags not needed (UI-only refactor)
3. No database migrations to revert
4. No API changes

---

## Status

**✅ PHASE 1 COMPLETE** (Commits: e9a4706, e7e6085):
- [x] **Option A**: RequirementItem extraction
  - Eliminated 138 lines of duplication
  - Added responsive tabs for mobile/constrained layouts
  - Added section attribution to HIL LLM prompt
- [x] **Option B**: Simplify skeleton logic
  - Removed `showAttributionSkeleton` and `isLoading` props
  - Single source of truth: `data === undefined` triggers skeleton
  - Clearer API and easier to reason about

**✅ PHASE 2 COMPLETE** (Commit: ecb37a6):
- [x] **Observability Logging**
  - Added comprehensive logging to validate section ID matching behavior
  - Log all sectionIds from LLM responses with type analysis (UUID vs semantic)
  - Log which matching path is used (UUID exact match vs semantic fuzzy match)
  - Track ratingCriteria availability to debug missing standards
  - Console groups for easy debugging in browser DevTools

**✅ PHASE 3 COMPLETE** (Commits: ecb37a6, b2b4301):
- [x] **Improved Normalization Logic**
  - Enhanced to explicitly support BOTH formats (UUID + semantic)
  - Added mappings for DraftSectionType values (static, dynamic-story, dynamic-saved)
  - Improved documentation explaining dual-format support
  - Clear logging distinguishes between UUID matches (✓) and semantic matches (⚠️)
- [x] **Comprehensive Test Coverage**
  - Created 17 test cases covering all matching scenarios
  - All tests passing ✅
  - Edge cases handled (null/undefined data, missing fields, case-insensitive)

**Key Findings from Phase 2**:
- ✅ **requirementAnalysis.ts** uses UUID format (`section-X-X`)
- ⚠️ **enhancedMetricsAnalysis.ts** uses semantic format (`introduction`, `experience`)
- 📊 System is mid-transition between formats
- ✅ Normalization needed for backward compatibility

**Decision Made**:
- ✅ Kept normalization logic (Option D rejected - not safe due to dual-format usage)
- ⚠️ Did not add TypeScript branded types (Option C deferred - not needed yet)
- ✅ Chose hybrid approach with better logging and documentation

**Production Ready**:
- ✅ All tests passing (17/17 for section attribution)
- ✅ Build successful (no TypeScript errors)
- ✅ Comprehensive logging for debugging
- ✅ Backward compatibility maintained
- ✅ Forward compatibility with UUID migration
