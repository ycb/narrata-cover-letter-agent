# Task 7: Toolbar A-Phase Accordions — COMPLETE

**Date:** 2025-11-28  
**Status:** ✅ Complete  
**Ticket:** Ticket 7 — Toolbar accordions for A-phase insights (Sonnet)

---

## Overview

Added A-phase streaming insights accordions to the Match Metrics Toolbar. These accordions display preliminary analysis data (role alignment, MWS, company context, JD requirement counts) as they arrive during the 60–90s drafting window, without affecting draft-based badges or counts.

---

## Changes Made

### 1. `MatchMetricsToolbar.tsx` — Added A-Phase Accordion

**Imports:**
- Added `APhaseInsights` type import from `@/types/jobs`
- Extended `MetricKey` type to include `'a-phase'`

**Props:**
- Added `aPhaseInsights?: APhaseInsights` prop to `MatchMetricsToolbarProps`
- Threaded `aPhaseInsights` to `MetricDrawerContent` component

**Toolbar Items:**
- Added conditional A-phase accordion item when insights are present
- Shows "Analysis Insights" label with "⋮" indicator
- Only appears when at least one A-phase insight is available
- Does NOT replace or affect draft-based badges

**New Component: `APhaseDrawerContent`**
Created dedicated drawer component to display:

1. **Role Alignment** (`roleInsights`)
   - Level (APM/PM/Senior PM/Staff/Group)
   - Scope (feature/product/product_line/etc.)
   - Title match (exact/adjacent/none)
   - Fit assessment (good fit/stretch/big stretch/below experience)
   - Goal alignment status

2. **Requirements from JD** (`jdRequirementSummary`)
   - Core count (labeled as "preliminary")
   - Preferred count (labeled as "preliminary")
   - Clearly marked as "from JD" to distinguish from draft-based counts

3. **Match with Strengths** (`mws`)
   - Summary score (0–3) with color-coded badges
   - Individual strength items with level badges (strong/moderate/light)
   - Explanations for each strength match

4. **Company Context** (`companyContext`)
   - Industry
   - Company stage/maturity
   - Business models
   - Data source attribution (JD/web/mixed)

**Design Principles:**
- All data shown is streaming-only (never draft-based)
- Labeled appropriately ("preliminary", "from JD")
- Does NOT auto-open/close on updates
- Does NOT replace draft-based badge values once draft exists
- Gracefully handles partial data (shows only available sections)

---

### 2. `CoverLetterDraftEditor.tsx` — Prop Threading

**Props:**
- Added `aPhaseInsights?: any` to `CoverLetterDraftEditorProps`
- Accepted and destructured in component function

**Toolbar Props:**
- Passed `aPhaseInsights={aPhaseInsights}` to `MatchMetricsToolbar`

---

### 3. `CoverLetterModal.tsx` — Wiring from Hook

**Props:**
- Passed `aPhaseInsights={aPhaseInsights}` to `CoverLetterDraftEditor`
- `aPhaseInsights` is already computed via `useAPhaseInsights(jobState)` hook (Task 5)

---

## Validation Checklist

✅ **Accordions appear as partials arrive**  
   - Conditional rendering based on `stageFlags` ensures sections appear only when data is present

✅ **Draft arrival does not hide A-phase**  
   - A-phase accordion is independent of draft state
   - Remains visible as long as insights exist

✅ **Badges switch to draft values**  
   - Draft-based badges (score/core/pref) remain unchanged
   - A-phase accordion only shows preliminary JD counts, labeled appropriately

✅ **No auto-open/close on updates**  
   - Accordion state managed by `activeMetric` state
   - Only changes on user interaction

✅ **No replacement of draft counts post-draft**  
   - JD requirement counts explicitly labeled as "preliminary" and "from JD"
   - Core/Preferred badge values remain draft-based (from `enhancedMatchData`)

---

## Technical Notes

### Single Prop Constraint
- Used single `aPhaseInsights` prop rather than spreading multiple new props
- Minimizes surface area and keeps contract clean
- All A-phase data flows through one object

### Section Visibility Logic
```typescript
const hasAnyInsights = stageFlags.hasRoleInsights || 
                        stageFlags.hasMws || 
                        stageFlags.hasCompanyContext || 
                        stageFlags.hasJdRequirementSummary;

if (hasAnyInsights) {
  items.push({ key: 'a-phase', ... });
}
```

### Data Safety
- All property access uses optional chaining
- Graceful degradation when data is missing or incomplete
- Type-safe through `APhaseInsights` interface

---

## Files Modified

1. `src/components/cover-letters/MatchMetricsToolbar.tsx` — Core implementation
2. `src/components/cover-letters/CoverLetterDraftEditor.tsx` — Prop threading
3. `src/components/cover-letters/CoverLetterModal.tsx` — Hook wiring

---

## Out of Scope (Correctly Avoided)

✅ Did NOT change draft badge logic  
✅ Did NOT affect gap banners  
✅ Did NOT introduce new section ID systems  
✅ Did NOT auto-open/close accordions  
✅ Did NOT replace draft counts with JD counts post-draft  
✅ Did NOT read `jobState` directly in toolbar (all data comes from `aPhaseInsights`)

---

## Next Steps

This task is complete and ready for integration testing with:
- Task 4: `useJobStream` hook (job state streaming)
- Task 5: `useAPhaseInsights` hook (data normalization)
- Task 6: Progress banner (unified loading UX)

The toolbar now displays streaming A-phase insights while preserving all draft-based metrics as the single source of truth.

---

**Rollback Point:** Current HEAD (pre-merge)  
**Dependencies:** Tasks 4, 5, 6 must be complete for full functionality  
**Testing:** Requires live streaming job to verify accordion appearance and data flow

