# Bug Fix #3: Missing Tooltip Content for Experience & Requirements

## Problem Report
User reported that **three tooltips have no content** and show empty/blank when hovered:
- Match with Experience (no content)
- Core Requirements (no content)
- Preferred Requirements (no content)

**Context:** 
- These tooltips worked in the prototype and before merging
- Goals tooltip works fine (has content)
- This is a data wiring issue, not a UI rendering issue

## Root Cause Analysis

**Location:** `src/components/cover-letters/CoverLetterCreateModal.tsx:576-580`

The `ProgressIndicatorWithTooltips` component was being rendered **without passing the necessary data props**:

```typescript
// OLD (BROKEN):
<ProgressIndicatorWithTooltips
  metrics={hilMetrics}
  isPostHIL={false}
/>
```

### What Was Missing

The component requires several props to populate tooltip content:

1. **`enhancedMatchData`** - Contains all the detailed match analysis:
   - `coreRequirementDetails` → Core Requirements tooltip
   - `preferredRequirementDetails` → Preferred Requirements tooltip
   - `coreExperienceDetails` + `preferredExperienceDetails` → Experience tooltip
   - `goalMatches` → Goals tooltip (this one was working because it had fallback empty state)

2. **`jobDescription`** - Basic job info (company, role) for context

3. **`onEditGoals`, `onAddStory`, `onEnhanceSection`, `onAddMetrics`** - CTA callbacks for interactive buttons in tooltips

### Data Flow

The data DOES exist in `draft.enhancedMatchData` (populated by the backend analysis service), but it wasn't being passed through:

```
Backend Analysis Service
  ↓
draft.enhancedMatchData ← Data exists here
  ↓
CoverLetterCreateModal  ← Was NOT passing it to child
  ↓
ProgressIndicatorWithTooltips ← Received undefined
  ↓
MatchExperienceTooltip / RequirementsTooltip ← Got empty arrays []
  ↓
Tooltip renders empty content
```

## Solution Implemented

**Added all missing props** to `ProgressIndicatorWithTooltips`:

```typescript
// NEW (FIXED):
<ProgressIndicatorWithTooltips
  metrics={hilMetrics}
  isPostHIL={false}
  enhancedMatchData={draft.enhancedMatchData}  // ← Contains all tooltip data
  goNoGoAnalysis={undefined}
  jobDescription={jobDescriptionRecord ? {
    role: jobDescriptionRecord.role,
    company: jobDescriptionRecord.company,
  } : undefined}
  onEditGoals={() => {
    // TODO: Wire to actual goals modal
    console.log('Open goals modal');
  }}
  onAddStory={(requirement, severity) => {
    // TODO: Wire to actual story modal
    console.log('Add story for requirement:', requirement);
  }}
  onEnhanceSection={(sectionId, requirement) => {
    // TODO: Wire to actual enhancement flow
    console.log('Enhance section:', sectionId, 'for requirement:', requirement);
  }}
  onAddMetrics={(sectionId) => {
    // TODO: Wire to actual metrics flow
    console.log('Add metrics to section:', sectionId);
  }}
/>
```

### How It Works Now

1. **Draft generation** populates `draft.enhancedMatchData` with analysis results
2. **CoverLetterCreateModal** passes `draft.enhancedMatchData` to child
3. **ProgressIndicatorWithTooltips** extracts arrays from `enhancedMatchData`:
   ```typescript
   const coreReqs = enhancedMatchData?.coreRequirementDetails || [];
   const preferredReqs = enhancedMatchData?.preferredRequirementDetails || [];
   const coreExperienceMatches = enhancedMatchData?.coreExperienceDetails || [];
   const preferredExperienceMatches = enhancedMatchData?.preferredExperienceDetails || [];
   ```
4. **Tooltip components** receive populated arrays and render cards with evidence

## Files Modified
- `src/components/cover-letters/CoverLetterCreateModal.tsx` - Added missing props to `ProgressIndicatorWithTooltips`

## Testing Recommendations

### Manual Test
1. Generate a cover letter draft
2. Wait for generation to complete
3. Hover over **MATCH WITH EXPERIENCE** badge
   - Verify tooltip shows requirements with evidence
   - Should see work items or stories referenced
4. Hover over **CORE REQS** badge (e.g., "2/5")
   - Verify tooltip shows list of 5 core requirements
   - 2 should have checkmarks (demonstrated in draft)
   - 3 should have X marks (not demonstrated)
5. Hover over **PREFERRED REQS** badge (e.g., "0/0")
   - Verify tooltip shows list of preferred requirements (if any)
   - Each should show evidence or "not mentioned"

### Expected Tooltip Content

**Experience Tooltip:**
```
✓ 5+ years product management
  Evidence: Led cross-functional teams at Supio...

✗ B2B SaaS background
  No matching experience found
```

**Core Requirements Tooltip:**
```
✓ Product lifecycle management
  Demonstrated in intro section

✗ Agile/Scrum methodologies
  Not mentioned in current draft
```

**Preferred Requirements Tooltip:**
```
✓ SQL/Python proficiency
  Mentioned in experience section

✗ MBA or equivalent
  Not mentioned in current draft
```

## Impact
- ✅ All three broken tooltips now show content
- ✅ Users can see detailed match breakdowns
- ✅ CTAs in tooltips are wired (TODO: implement actual modal flows)

## Follow-Up Work (TODO Comments Added)
The CTA callbacks are stubbed with `console.log` statements. Need to wire them to actual flows:
1. `onEditGoals` → Open UserGoalsModal
2. `onAddStory` → Open story creation modal
3. `onEnhanceSection` → Trigger HIL content generation for that section
4. `onAddMetrics` → Open metrics addition modal/flow

## Why This Happened
This regression occurred during the merge of Agent work. The `CoverLetterCreateModal` was refactored to use `draft.metrics` for the badges, but the `enhancedMatchData` prop wiring was missed. The Goals tooltip appeared to work because it has a graceful empty state ("No Career Goals Set"), while the other tooltips just rendered empty content silently.

## Prevention
- Add E2E test that validates tooltip content is present (not just that tooltips render)
- Add prop validation/warnings when `enhancedMatchData` is missing
- Consider making `enhancedMatchData` required instead of optional if tooltips are non-functional without it

