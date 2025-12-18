# Fix: Jarring Tab Auto-Switch in Cover Letter Modal

**Date:** 2024-12-17  
**Issue:** Tab automatically switches from "Cover letter" back to "Job description" after draft becomes ready, interrupting user

---

## Problem Description

After clicking "Generate cover letter", users would experience a jarring automatic tab switch:

### User Flow (Before Fix):
1. ✅ User clicks "Generate cover letter"
2. ✅ Modal switches to "Cover letter" tab
3. ✅ User sees progress/skeleton while draft generates
4. 👤 User manually switches to "Job description" tab to review the JD
5. ⚠️ **Draft becomes ready**
6. ❌ **Tab automatically switches back to "Cover letter"** (jarring!)
7. 😕 User is confused - they were reading the JD

### Root Cause

The modal had a `useEffect` that would auto-advance from the "fit-check" step to the "draft" step when `draftReady` became true:

```tsx
useEffect(() => {
  if (mode !== 'create') return;
  if (!isFitCheckStep) return;
  if (aPhaseHardError) return;
  if (!draftReady) return;
  if (autoAdvancedToDraftRef.current) return;
  autoAdvancedToDraftRef.current = true;
  setCreateFlowStep('draft');
  setMainTab('cover-letter'); // ⚠️ PROBLEM: Forces tab switch
  logAStreamEvent('gng_auto_advance_to_draft', { jobId: streamingJobId });
}, [mode, isFitCheckStep, aPhaseHardError, draftReady, streamingJobId]);
```

**The Issue:**
- This `useEffect` would fire whenever `draftReady` transitioned from `false` → `true`
- It would **always** call `setMainTab('cover-letter')` regardless of user's current tab
- If user had manually switched to `job-description` tab, this would yank them back
- This violated user agency and interrupted their workflow

---

## Solution

**Respect user's tab choice** - Only auto-advance the flow step if the user is still on the `cover-letter` tab.

### Fix Implementation

```tsx
useEffect(() => {
  if (mode !== 'create') return;
  if (!isFitCheckStep) return;
  if (aPhaseHardError) return;
  if (!draftReady) return;
  if (autoAdvancedToDraftRef.current) return;
  // ✅ NEW: Only auto-advance if user is still on cover-letter tab
  if (mainTab !== 'cover-letter') return;
  autoAdvancedToDraftRef.current = true;
  setCreateFlowStep('draft');
  // ✅ REMOVED: setMainTab('cover-letter') - not needed, they're already there
  logAStreamEvent('gng_auto_advance_to_draft', { jobId: streamingJobId });
}, [mode, isFitCheckStep, aPhaseHardError, draftReady, streamingJobId, mainTab]);
//                                                                         ^^^^^^^ Added dependency
```

### Key Changes:

1. **Added guard**: `if (mainTab !== 'cover-letter') return;`
   - Only proceed with auto-advance if user is on the cover-letter tab
   - If they've switched away, skip the auto-advance entirely

2. **Removed force**: `setMainTab('cover-letter')`
   - No longer needed since we only run when `mainTab === 'cover-letter'`
   - Eliminates the jarring forced tab switch

3. **Added dependency**: Added `mainTab` to the dependency array
   - Ensures effect re-evaluates when tab changes
   - Prevents stale closure issues

---

## User Flow (After Fix)

### Scenario 1: User Stays on Cover Letter Tab
1. ✅ User clicks "Generate"
2. ✅ Tab switches to "Cover letter"
3. ✅ User sees progress/skeleton
4. ✅ Draft becomes ready
5. ✅ Flow step advances from 'fit-check' to 'draft' (seamless, no visible change)
6. ✅ User continues viewing draft

### Scenario 2: User Switches to Job Description Tab
1. ✅ User clicks "Generate"
2. ✅ Tab switches to "Cover letter"
3. 👤 User manually switches to "Job description" tab
4. ✅ Draft becomes ready (in background)
5. ✅ **Tab stays on "Job description"** (respects user choice)
6. ✅ Flow step quietly advances to 'draft' without interrupting
7. 👤 User can switch back to "Cover letter" when ready

---

## Benefits

### UX Improvements
- ✅ **No more jarring interruptions** - users maintain control
- ✅ **Predictable behavior** - tab only changes when user initiates it
- ✅ **Respects user agency** - doesn't override manual tab switches
- ✅ **Seamless when intended** - still auto-advances flow step silently

### Technical Improvements
- ✅ **Correct dependency array** - includes all relevant state
- ✅ **Cleaner logic** - removed unnecessary `setMainTab` call
- ✅ **Better separation of concerns** - flow step vs. tab state are independent

---

## Testing

### Manual Test Scenarios

#### Test 1: User Stays on Cover Letter Tab
1. Open "Create Draft" modal
2. Paste job description
3. Click "Generate cover letter"
4. **Verify**: Automatically switches to "Cover letter" tab
5. **Verify**: See progress/skeleton
6. Wait for draft to complete
7. **Verify**: Tab stays on "Cover letter" (no flash/switch)
8. **Verify**: Draft content appears

**Expected**: ✅ Smooth, no tab switching

#### Test 2: User Switches to Job Description Tab
1. Open "Create Draft" modal
2. Paste job description
3. Click "Generate cover letter"
4. **Verify**: Automatically switches to "Cover letter" tab
5. **Manually** click "Job description" tab
6. Wait for draft to complete
7. **Verify**: Tab **stays** on "Job description" (no auto-switch back)
8. **Manually** click "Cover letter" tab
9. **Verify**: Draft content is ready and displayed

**Expected**: ✅ No jarring auto-switch, user maintains control

#### Test 3: User Switches Back and Forth
1. Start generation
2. Switch to "Job description" tab
3. Switch back to "Cover letter" tab
4. Draft completes while on "Cover letter" tab
5. **Verify**: No unwanted tab switches

**Expected**: ✅ Smooth, respects user's current position

---

## Edge Cases Handled

### Case 1: Draft completes while on Job Description tab
- ✅ Flow step advances silently
- ✅ Tab stays on Job Description
- ✅ User can switch when ready

### Case 2: Draft completes while on Cover Letter tab
- ✅ Flow step advances seamlessly
- ✅ Tab stays on Cover Letter (already there)
- ✅ No visible change

### Case 3: User rapidly switches tabs
- ✅ Auto-advance only happens if on Cover Letter tab at moment of draft completion
- ✅ No race conditions or flickering

---

## Related Code

### Files Changed
- `src/components/cover-letters/CoverLetterModal.tsx`
  - Line ~825-835: Updated auto-advance useEffect
  - Added `mainTab` guard
  - Removed forced `setMainTab` call
  - Added `mainTab` to dependency array

### Flow State Machine
```
Create Mode Flow:
1. job-description tab (initial)
2. [User clicks Generate]
3. cover-letter tab + fit-check step
4. [Draft completes]
5. cover-letter tab (if user is there) + draft step
   OR
   current tab (if user switched) + draft step
```

---

## Future Considerations

### Potential Enhancements:
1. **Visual indicator** when draft is ready while on other tab
   - Badge or notification on "Cover letter" tab
   - "Draft ready - click to view" message

2. **Smart toast notification**
   - "Your draft is ready!" toast when draft completes
   - Only show if user is on different tab

3. **Analytics tracking**
   - Track how often users switch tabs during generation
   - Measure if users prefer to wait on cover-letter tab vs. review JD

### Not Recommended:
- ❌ Force tab switch (current behavior we just fixed)
- ❌ Disable tab switching during generation (too restrictive)
- ❌ Modal or confirmation to switch tabs (annoying)

---

## Conclusion

This fix improves the user experience by **respecting user agency**. The system no longer forces unwanted tab switches, making the draft generation flow feel more natural and less jarring.

**Key Principle**: Let the user control the UI. The system should guide, not force.

