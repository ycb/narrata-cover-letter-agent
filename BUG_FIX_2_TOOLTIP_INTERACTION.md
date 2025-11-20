# Bug Fix #2: Tooltip Interaction Issue

## Problem Report
User reported that they **cannot click the "Configure goals" button** inside the Goals tooltip because:
- The tooltip disappears when the mouse leaves the match metrics badge
- There appears to be a gap between the trigger and the tooltip content
- Tooltip closes before the user can move their cursor to interact with buttons/links inside

## Root Cause Analysis

**Location:** `src/components/ui/full-width-tooltip.tsx:45`

The tooltip component already had an **invisible bridge** feature designed to solve exactly this problem (lines 108-118). The bridge is a transparent div that covers the gap between the trigger element and the tooltip, preventing the tooltip from closing when the user moves their mouse from the badge to the tooltip content.

However, there was a **calculation bug** in the bridge positioning:

```typescript
// OLD (WRONG):
triggerBottom: rect.top, // Start bridge from top of trigger element
```

This positioned the bridge starting from the **top** of the trigger element (the badge), when it should start from the **bottom**. This created a gap where mouse movement would trigger the `hideTooltip()` handler.

### Visual Diagram

```
Before (Broken):
┌─────────────────┐
│  MATCH BADGE    │ ← rect.top (triggerBottom was set here - WRONG!)
│  WITH GOALS     │
│    "average"    │
└─────────────────┘ ← rect.bottom (bridge should start here)
      ↓
   [GAP - tooltip closes here!]
      ↓
┌─────────────────────────────┐
│  Tooltip Content            │
│  ┌─────────────────────┐   │
│  │ Configure Goals Btn │   │ ← User can't reach this!
│  └─────────────────────┘   │
└─────────────────────────────┘


After (Fixed):
┌─────────────────┐
│  MATCH BADGE    │
│  WITH GOALS     │
│    "average"    │
└─────────────────┘ ← rect.bottom (bridge starts here - CORRECT!)
      ↓
   [BRIDGE - invisible, mouse hover maintained]
      ↓
┌─────────────────────────────┐
│  Tooltip Content            │
│  ┌─────────────────────┐   │
│  │ Configure Goals Btn │   │ ← User can click this now!
│  └─────────────────────┘   │
└─────────────────────────────┘
```

## Solution Implemented

**Multiple fixes applied:**

1. **Fixed bridge positioning:**
```typescript
// NEW (CORRECT):
triggerBottom: rect.bottom, // Start bridge from bottom of trigger element
```

2. **Reduced gap for easier mouse movement:**
```typescript
const tooltipTop = rect.bottom + 8; // Reduced from 12px to 8px
```

3. **Increased hover delay tolerance:**
```typescript
setTimeout(() => {
  setIsVisible(false);
}, 300); // Increased from 200ms to 300ms
```

4. **Explicitly enabled pointer events:**
```typescript
// On bridge
pointerEvents: 'auto', // Explicitly enable pointer events

// On tooltip
pointerEvents: 'auto', // Ensure tooltip content is interactive
```

These changes ensure the invisible bridge covers the **entire gap** from the bottom of the trigger badge to the top of the tooltip content, with explicit pointer event handling and more forgiving timing.

### How the Bridge Works

1. **User hovers over badge** → `showTooltip()` is called
2. **Tooltip appears** with invisible bridge covering the gap
3. **User moves mouse down** toward tooltip:
   - Mouse enters the bridge area
   - Bridge has `onMouseEnter={handleMouseEnter}` which cancels the hide timeout
   - Tooltip stays open
4. **User enters tooltip content** → Can interact with buttons/links
5. **User moves mouse away** → Bridge detects `onMouseLeave`, tooltip closes after 200ms delay

## Files Modified
- `src/components/ui/full-width-tooltip.tsx` - Fixed bridge positioning calculation

## Testing Recommendations

### Manual Test
1. Navigate to cover letter draft view
2. Hover over "MATCH WITH GOALS" badge
3. **Slowly** move mouse from badge toward the tooltip content
4. Verify tooltip stays open as you move through the gap
5. Click the "Configure your career goals" button
6. Verify goals modal opens

### Edge Cases to Test
- Fast mouse movement (should still work with 200ms delay)
- Hovering different badges (Experience, Requirements, etc.) that also use CTAs
- Mobile/touch behavior (click-to-open should work)
- Window resize while tooltip is open (bridge should reposition)

## Impact
- ✅ Users can now interact with **all CTA buttons** in tooltips:
  - "Configure goals" in Goals tooltip
  - "Add story covering X" in Experience tooltip  
  - "Enhance section" in Requirements tooltip
  - Any future interactive content in tooltips

## Related Components
All these tooltips use `FullWidthTooltip` and benefit from this fix:
- `MatchGoalsTooltip.tsx` ← Primary issue reported here
- `MatchExperienceTooltip.tsx`
- `RequirementsTooltip.tsx`
- `CoverLetterRatingTooltip.tsx`
- `ATSScoreTooltip.tsx`

## Notes
- The invisible bridge technique is a common UX pattern for nested interactive tooltips
- The 200ms delay (`hideTooltip()` line 60) provides additional buffer for user mouse movement
- Dark mode compatibility: Bridge is invisible so no visual changes needed

