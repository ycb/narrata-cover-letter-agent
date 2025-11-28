# QA Test Plan: Task 7 — Toolbar A-Phase Accordions

**Feature:** A-Phase Streaming Insights in Match Metrics Toolbar  
**Status:** Ready for QA  
**Date:** 2025-11-28  
**Branch:** feat/streaming-mvp

---

## Overview

This feature adds streaming A-phase insights to the toolbar sidebar during cover letter generation. Users will see preliminary analysis data (role alignment, MWS, company context, JD requirements) appear progressively during the 60–90s drafting window.

---

## Test Environment Setup

### Prerequisites
1. Ensure you're on branch `feat/streaming-mvp`
2. Feature flag `ENABLE_A_PHASE_INSIGHTS = true` (default in CoverLetterModal.tsx)
3. Have a job description ready that will trigger streaming (100+ chars)
4. User profile with goals set (for goal alignment data)

### Expected Behavior
- A-phase accordion appears in toolbar when insights are available
- Accordion labeled "Analysis Insights" with "⋮" indicator
- Accordion positioned at bottom of toolbar (after Overall Score)
- Draft-based badges (score/core/pref/gaps/goals) remain unchanged

---

## Test Cases

### TC-1: Accordion Appearance During Streaming

**Steps:**
1. Open cover letter modal (Create new cover letter)
2. Paste job description
3. Select template
4. Click "Generate Cover Letter"
5. Watch the toolbar sidebar during generation

**Expected Results:**
- ✅ Toolbar shows skeleton/loading state initially
- ✅ As A-phase data arrives, "Analysis Insights" accordion appears
- ✅ Accordion appears BEFORE draft content loads
- ✅ Other badges show "–" or muted state during streaming
- ✅ Progress banner shows A-phase stage progress

**Pass Criteria:**
- Accordion becomes visible within 5–15 seconds of generation start
- Appearance does not cause layout shift or flicker

---

### TC-2: Role Insights Display

**Preconditions:**
- Job description with clear role level (e.g., "Senior Product Manager")
- User goals set with target titles

**Steps:**
1. Generate cover letter
2. When accordion appears, click "Analysis Insights"
3. Verify "Role Alignment" section displays

**Expected Results:**
- ✅ Level shows (APM/PM/Senior PM/Staff/Group)
- ✅ Scope shows (feature/product/product_line/etc.)
- ✅ Title Match shows (Exact/Adjacent/No match)
- ✅ Fit shows (Good fit/Stretch/Big stretch/Below experience)
- ✅ Goal Alignment shows alignment status

**Pass Criteria:**
- All fields present when data available
- Text is readable and properly formatted
- No undefined/null values displayed

---

### TC-3: JD Requirements (Preliminary)

**Steps:**
1. Generate cover letter
2. Open "Analysis Insights" accordion
3. Locate "Requirements from JD (preliminary)" section

**Expected Results:**
- ✅ Section header includes "(preliminary)" label
- ✅ Core count displays as number (e.g., "5")
- ✅ Preferred count displays as number (e.g., "3")
- ✅ Does NOT show fractions or percentages
- ✅ Text clearly states "from JD"

**Pass Criteria:**
- Numbers match job description analysis
- Labeled distinctly from draft-based Core/Preferred badges
- Draft-based badges show different values after draft loads

---

### TC-4: Match with Strengths Display

**Preconditions:**
- User profile has strengths/experiences entered

**Steps:**
1. Generate cover letter
2. Open "Analysis Insights" accordion
3. Check "Match with Strengths" section

**Expected Results:**
- ✅ Summary score shows 0–3 with color-coded badge
  - Score 3: green (success)
  - Score 2: yellow (warning)
  - Score 0–1: gray (muted)
- ✅ Individual strength items show:
  - Label (e.g., "Technical Leadership")
  - Strength level badge (strong/moderate/light)
  - Explanation text
- ✅ All items are readable and properly spaced

**Pass Criteria:**
- Score matches quality of strength alignment
- Badges use appropriate colors
- Explanation text provides context

---

### TC-5: Company Context Display

**Steps:**
1. Generate cover letter (use JD with company info)
2. Open "Analysis Insights" accordion
3. Check "Company Context" section

**Expected Results:**
- ✅ Industry displays (e.g., "SaaS", "E-commerce")
- ✅ Stage displays with proper formatting (e.g., "Series B")
- ✅ Business models display as comma-separated list
- ✅ Source attribution shows at bottom (JD/Web/Mixed)

**Pass Criteria:**
- All available data displays correctly
- Missing fields are gracefully omitted (no "undefined")
- Source attribution is in muted text

---

### TC-6: Draft Arrival Does Not Hide A-Phase

**Steps:**
1. Generate cover letter
2. Wait for "Analysis Insights" accordion to appear
3. Continue waiting until draft content loads
4. Verify accordion remains visible

**Expected Results:**
- ✅ Accordion remains in toolbar after draft loads
- ✅ Accordion content remains accessible
- ✅ Draft-based badges update to show real metrics
- ✅ A-phase preliminary data remains unchanged

**Pass Criteria:**
- No disappearing/re-appearing of accordion
- Both A-phase and draft-based data coexist
- User can switch between all accordions

---

### TC-7: No Auto-Open/Close Behavior

**Steps:**
1. Generate cover letter
2. Do NOT click "Analysis Insights" accordion
3. Wait for new A-phase data to stream in
4. Verify accordion state

**Expected Results:**
- ✅ Accordion remains closed if user hasn't opened it
- ✅ No automatic expansion on data updates
- ✅ No visual indication of "new data" (no badges, no pulsing)

**Then:**
5. Click to open accordion
6. Wait for draft to load
7. Verify accordion state

**Expected Results:**
- ✅ Accordion remains open if user opened it
- ✅ Does not auto-close when draft arrives
- ✅ User must manually close it

**Pass Criteria:**
- Accordion state is 100% user-controlled
- No surprise behaviors during streaming

---

### TC-8: Draft-Based Badges Remain Unchanged

**Steps:**
1. Generate cover letter
2. Note preliminary JD counts in A-phase accordion
3. Wait for draft to complete
4. Compare badge values

**Expected Results:**
- ✅ Core Requirements badge shows draft-based count (e.g., "3/5")
- ✅ Preferred Requirements badge shows draft-based count (e.g., "2/3")
- ✅ Badge counts likely DIFFER from A-phase preliminary counts
- ✅ Overall Score badge shows calculated score based on draft
- ✅ Goals badge shows goal match results from draft

**Pass Criteria:**
- No confusion between preliminary (JD) and final (draft) counts
- Badges use draft.enhancedMatchData as source
- A-phase counts remain labeled "preliminary"

---

### TC-9: Partial Data Graceful Degradation

**Test with limited data:**
1. Use minimal job description (triggers streaming but limited insights)
2. Generate cover letter
3. Open "Analysis Insights" accordion

**Expected Results:**
- ✅ Only sections with data are shown
- ✅ Missing sections are omitted (not shown as empty)
- ✅ Accordion still appears if ANY insight is available
- ✅ No errors in console
- ✅ No "undefined" or "null" text displayed

**Pass Criteria:**
- Clean degradation when data is incomplete
- User sees only valid, useful information

---

### TC-10: Multiple Cover Letter Sessions

**Steps:**
1. Generate cover letter A (with insights)
2. Open "Analysis Insights" accordion
3. Close modal (cancel/save)
4. Open new cover letter modal
5. Generate cover letter B (different JD)
6. Open "Analysis Insights" accordion

**Expected Results:**
- ✅ Accordion shows insights for cover letter B (not A)
- ✅ No stale data from previous session
- ✅ Data updates correctly for new job
- ✅ No cross-contamination between sessions

**Pass Criteria:**
- Each generation shows its own A-phase data
- No caching issues

---

## Edge Cases

### E-1: Very Fast Draft Generation
- If draft completes before A-phase insights arrive
- Expected: Accordion may not appear (acceptable)
- Verify: No errors, no broken UI

### E-2: A-Phase Failure
- If A-phase stages fail/timeout
- Expected: Accordion does not appear
- Verify: Draft still generates, no blocking errors

### E-3: Feature Flag Disabled
- Set `ENABLE_A_PHASE_INSIGHTS = false`
- Expected: No accordion appears
- Verify: Toolbar works normally without A-phase

### E-4: No User Goals
- User profile without goals set
- Expected: Goal Alignment section may be missing/incomplete
- Verify: Other sections still display correctly

---

## Visual/UX Verification

### Layout
- ✅ Accordion fits within toolbar width
- ✅ Proper spacing between sections
- ✅ Readable text hierarchy (headers vs. content)
- ✅ Consistent with other toolbar accordions

### Colors/Badges
- ✅ Badge colors match design system
- ✅ Success (green), Warning (yellow), Muted (gray)
- ✅ Text contrast meets accessibility standards

### Responsive
- ✅ Works at various viewport sizes
- ✅ Text wraps appropriately
- ✅ No horizontal scroll in accordion

---

## Performance Checks

- ✅ No layout thrashing when insights arrive
- ✅ Smooth accordion expand/collapse animation
- ✅ No memory leaks over multiple sessions
- ✅ Console clean (no warnings/errors)

---

## Browser Compatibility

Test in:
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

---

## Known Limitations

1. **Accordion appears only if A-phase data arrives**
   - Very fast draft generation may skip A-phase display
   - This is expected and acceptable

2. **Data is preliminary during streaming**
   - Final metrics come from draft.enhancedMatchData
   - Users should understand "preliminary" label

3. **No real-time updates within accordion**
   - Accordion content is set when data arrives
   - Does not stream character-by-character

---

## Success Criteria

**PASS if:**
- All 10 test cases pass
- Edge cases handled gracefully
- No console errors
- Draft-based badges remain authoritative
- User can clearly distinguish preliminary vs. final data

**FAIL if:**
- Draft-based badges are replaced by A-phase data
- Accordion auto-opens/closes unexpectedly
- Layout breaks or shifts during streaming
- Errors in console
- Confusion between preliminary and final metrics

---

## Rollback Plan

If critical issues found:
1. Set `ENABLE_A_PHASE_INSIGHTS = false` in CoverLetterModal.tsx
2. Feature flag prevents accordion from appearing
3. Existing functionality unaffected
4. Fix issues on branch, re-test, re-enable flag

---

## Sign-off

**QA Tester:** _______________  
**Date:** _______________  
**Status:** [ ] PASS [ ] FAIL [ ] BLOCKED  
**Notes:**

---


