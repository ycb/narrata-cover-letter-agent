# Cover Letter Stabilization - Validation Checklist

**Date:** November 28, 2025  
**Implementation:** Complete  
**Ready for QA:** ✅ Yes

---

## Quick Validation Checklist

Use this checklist to verify the stabilization changes are working correctly in the browser.

---

### ✅ Streaming Toolbar - Early Data Display (3-5 seconds)

**Test:** Paste a job description and click "Generate Draft"

**Within 3-5 seconds, verify toolbar shows:**
- [ ] ATS Score (non-zero number, e.g., "72%")
- [ ] Goals Match (non-zero number, e.g., "85%")

**Within 10-15 seconds, verify toolbar shows:**
- [ ] Core Requirements count (non-zero, e.g., "5/7")
- [ ] Preferred Requirements count (non-zero, e.g., "3/8")

**Expected behavior:**
- Counts come from `jobState.stages.requirementAnalysis.data`
- Values appear during streaming, before draft completes
- Toolbar is NEVER blank during this phase

---

### ✅ Section Gap Timing - No Flash During Streaming

**Test:** While draft is generating (0-90 seconds)

**Verify NO section gap banners appear:**
- [ ] No gap badges on any ContentCard
- [ ] No "Fix X gaps" buttons visible
- [ ] No yellow warning borders on sections

**Expected behavior:**
- Section gaps are completely hidden during streaming
- `isStreaming = true` prevents gap rendering
- No flicker, no premature gaps

---

### ✅ Section Gap Appearance - After Draft Complete

**Test:** Wait for draft generation to complete (~90 seconds)

**Verify section gap banners appear:**
- [ ] Yellow warning borders on sections with gaps
- [ ] Gap summary text shows (e.g., "2 requirement gaps")
- [ ] "Generate Content" button shows on sections with gaps
- [ ] Toolbar "Gaps" badge shows total count (e.g., "5")

**Expected behavior:**
- Gaps appear once draft completes
- Gaps come from `draft.enhancedMatchData.sectionGapInsights`
- Gaps persist and never disappear

---

### ✅ Toolbar Data Persistence - After Draft Complete

**Test:** After draft completes, check toolbar again

**Verify:**
- [ ] Core Requirements count still shows (may update, but never blank)
- [ ] Preferred Requirements count still shows (may update, but never blank)
- [ ] ATS Score still shows (may update to draft value)
- [ ] Goals Match still shows (may update to draft value)

**Expected behavior:**
- Streaming values are overridden by draft values
- No blank/undefined states
- Smooth transition (no flicker)

---

### ✅ Console Logs - No Errors

**Test:** Open browser DevTools Console during entire flow

**Verify NO errors for:**
- [ ] No "undefined sectionId" warnings
- [ ] No "cannot read property of undefined" for metrics
- [ ] No "cannot read property of undefined" for requirements
- [ ] No "cannot read property of undefined" for gaps
- [ ] No hallucinated section IDs (e.g., "intro-1", "section-intro")

**Expected behavior:**
- Clean console with only info/debug logs
- Section IDs are DB UUIDs (e.g., "550e8400-e29b-41d4-a716-446655440000")

---

### ✅ UI State - No Blank Screens

**Test:** Watch UI during entire generation flow

**Verify:**
- [ ] Skeleton appears immediately after clicking "Generate"
- [ ] No blank white screen at any point
- [ ] No flicker between skeleton and content
- [ ] Progress bar moves smoothly (0% → 30% → 95% → 100%)
- [ ] Progress bar doesn't get stuck (e.g., at 70% for 45 seconds)

**Expected behavior:**
- Unified loading state (`isCoverLetterLoading`)
- Skeleton visible during entire generation
- Content appears only when ready

---

### ✅ Progress Bar Honesty

**Test:** Watch progress bar during generation

**Verify progression:**
- [ ] 0-10%: Job description parsing complete
- [ ] 10-20%: Basic metrics stage completes
- [ ] 20-30%: Requirements analysis completes
- [ ] 30-95%: Draft generation in progress (animated)
- [ ] 95-100%: Draft complete

**Expected behavior:**
- Progress reflects actual pipeline stages
- No stuck progress for extended periods
- Smooth animation during draft generation phase

---

## Detailed Validation Scenarios

### Scenario 1: First Time User (No Existing Data)

1. **Setup:** New user, no existing cover letters or templates
2. **Action:** Create template, paste JD, generate draft
3. **Expected:**
   - Toolbar shows metrics within 5 seconds
   - No section gaps during streaming
   - Gaps appear after draft completes
   - All counts non-zero and stable

### Scenario 2: Regenerate Draft (Same JD, Different Template)

1. **Setup:** Existing draft, change template
2. **Action:** Click "Generate Draft" again
3. **Expected:**
   - Progress resets to 0%
   - Streaming metrics appear quickly (cached JD analysis)
   - Old gaps disappear during streaming
   - New gaps appear after new draft completes
   - No flicker between old and new content

### Scenario 3: Long Job Description (3000+ words)

1. **Setup:** Very long, detailed job posting
2. **Action:** Generate draft
3. **Expected:**
   - Progress doesn't get stuck
   - Toolbar metrics appear within 5-10 seconds
   - Requirements count may be higher (e.g., 15/20)
   - Draft generation may take 90-120 seconds
   - UI remains responsive throughout

---

## Common Issues & How to Spot Them

### ❌ Issue: Toolbar Blank During Streaming
**Symptom:** Toolbar shows "—" or "0/0" for requirements  
**Root Cause:** `jobState.stages.requirementAnalysis` not populating  
**Check:** Console logs for streaming stage data

### ❌ Issue: Gaps Flash During Streaming
**Symptom:** Yellow borders appear then disappear  
**Root Cause:** `isStreaming` check not working in `getSectionGapInsights()`  
**Check:** Console logs for "[GAPS] Section X: streaming active - no gaps displayed"

### ❌ Issue: Gaps Don't Appear After Draft
**Symptom:** No yellow borders, no gap summary text  
**Root Cause:** `draft.enhancedMatchData.sectionGapInsights` missing or empty  
**Check:** Console logs for "[GAPS DEBUG] Raw draft gaps"

### ❌ Issue: Section ID Mismatch
**Symptom:** Gaps show in wrong sections or not at all  
**Root Cause:** Backend using wrong section IDs  
**Check:** Console logs for section IDs (should be UUIDs matching template)

### ❌ Issue: Progress Stuck at 70%
**Symptom:** Progress bar stops moving for 30+ seconds  
**Root Cause:** Draft generation taking longer than expected  
**Check:** Network tab for active requests to `/generate-draft`

---

## Success Criteria

All checkboxes above must be checked ✅ for stabilization to be considered successful.

**If any checkbox fails:**
1. Note the specific failure in console
2. Check browser DevTools Network tab for errors
3. Review console logs for diagnostic messages
4. Report issue with reproduction steps

---

## Next Steps After Validation

Once all checks pass:
1. Mark stabilization as "QA Verified" ✅
2. Proceed with Phase-A enhancements:
   - Role insights streaming
   - PM level insights streaming
   - Enhanced toolbar UI

---

*This validation ensures the foundation is stable before adding new features.*

