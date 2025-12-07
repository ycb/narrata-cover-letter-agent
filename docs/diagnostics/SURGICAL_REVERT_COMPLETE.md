# Surgical Revert: Complete
**Date:** 2025-12-07  
**Branch:** onboard-stream  
**Status:** ✅ Functional regressions reverted, main's logic restored

---

## WHAT WAS REVERTED

### 1. Deleted `coverLetterProcessingService.ts` ✅
**Why:** This file contained broken regex-based paragraph parsing that caused:
- Duplicate intro sections
- 27-line fragment issues  
- Different parsing logic than main's LLM-based approach

**Files Changed:**
- `src/services/coverLetterProcessingService.ts` - DELETED

### 2. Restored Main's Cover Letter Logic ✅
**Why:** Branch added NEW processing pipeline on top of main's logic, causing duplication and conflicts

**Before (Broken):**
```typescript
if (type === 'coverLetter') {
  // Fetch user_id...
  await this.processCoverLetterData(structuredData, sourceId, accessToken);
  
  // NEW: Run comprehensive cover letter processing pipeline
  const { processCoverLetter } = await import('./coverLetterProcessingService');
  // ... 30+ lines of new code
}
```

**After (Fixed - matches main):**
```typescript
if (type === 'coverLetter') {
  await this.processCoverLetterData(structuredData, sourceId, accessToken);
}
```

**Files Changed:**
- `src/services/fileUploadService.ts` (lines 879-918 reverted to main's logic)

### 3. Removed Misleading Comment ✅
**Removed:**
```typescript
// Resume continues through legacy client-side path until streaming UI is approved
```

**Why:** Confusing comment that didn't reflect reality

---

## WHAT WAS PRESERVED

### ✅ Main's Working Logic (Now Restored):

1. **Resume Processing:**
   - ✅ `processStructuredData()` - creates companies, work_items, stories
   - ✅ Gap detection triggered for work_items (lines 1226, 1255, 1317)
   - ✅ Gap detection triggered for stories (lines 1429, 1624)
   - ✅ `outcomeMetrics` extraction (line 1316)
   - ✅ Role summary creation

2. **Cover Letter Processing:**
   - ✅ `processCoverLetterData()` - matches stories to work_items, extracts profile data
   - ✅ Gap detection for cover letter stories (line 1624)

3. **Gap Detection:**
   - ✅ `GapDetectionService.detectWorkItemGaps()` - called 3x for resume
   - ✅ `GapDetectionService.detectStoryGaps()` - called 2x for stories
   - ✅ `GapDetectionService.saveGaps()` - saves all detected gaps

### ✅ Performance Improvements (Still Intact):

The branch still has these streaming improvements:
- Pre-extraction caching (lines 61-72, 739-746)
- Progress events for UI (`window.dispatchEvent`)
- Staged resume analysis with events (lines 802-823)
- Parallel LLM calls
- Non-blocking operations

**These are GOOD changes** - they add performance without changing functionality.

---

## WHAT SHOULD NOW WORK

### Expected Behavior After Revert:

1. **Resume Upload:**
   - ✅ 21 companies created
   - ✅ 24 roles with role summaries (NOT empty)
   - ✅ Outcome metrics extracted and stored
   - ✅ 14 stories with metrics & impact
   - ✅ Gap badges visible (Δ1, Δ2, etc.)
   - ✅ Gap banners in Work History sidebar

2. **Cover Letter Upload:**
   - ✅ Stories extracted and matched to work_items
   - ✅ Profile data extracted (goals, voice, skills)
   - ✅ NO duplicate intro sections
   - ✅ NO 27-line fragments
   - ✅ Clean paragraph extraction (via main's logic)

3. **Gap Detection:**
   - ✅ Gaps detected for work_items
   - ✅ Gaps detected for stories
   - ✅ Gaps saved to database
   - ✅ Gap UI shows badges and banners

---

## KNOWN LIMITATIONS

### Cover Letter → Saved Sections:
**Status:** Not implemented in main either

Main's `processCoverLetterData` focuses on:
- Extracting stories from cover letter
- Matching stories to work_items
- Extracting profile data (goals, voice, skills)

It does NOT:
- Create saved sections from cover letter paragraphs
- Create cover letter templates
- Parse cover letter structure

**This is NOT a regression** - it's how main works too.

**If needed:** This feature should be implemented separately, using:
- LLM-based paragraph detection (not regex)
- Proper testing to ensure clean parsing
- No duplication with existing logic

---

## TESTING REQUIRED

### Manual QA Test (Product Tour):

1. **Test Resume Upload:**
   ```
   - Upload same resume used in main testing
   - Verify: 21 companies, 24 roles, 14 stories
   - Check: Role summaries are populated (not empty)
   - Check: Outcome metrics are present
   - Check: Gap badges visible (Δ1, Δ2, etc.)
   - Check: Clicking role shows gap banners
   ```

2. **Test Cover Letter Upload:**
   ```
   - Upload same cover letter used in main testing
   - Verify: Stories extracted
   - Check: NO duplicate sections
   - Check: NO fragment issues
   - Check: Clean data structure
   ```

### Database Comparison Test:

```sql
-- Compare onboard-stream output to main output
-- Upload same resume+CL to both branches

-- Check companies
SELECT COUNT(*) FROM companies WHERE user_id = 'test_user';
-- Should be: 21 (same as main)

-- Check work_items
SELECT id, title, description, metrics 
FROM work_items 
WHERE user_id = 'test_user';
-- Should have: role summaries, outcome metrics (not empty)

-- Check stories
SELECT COUNT(*) FROM stories WHERE user_id = 'test_user';
-- Should be: 14 (same as main)

-- Check gaps
SELECT COUNT(*) FROM content_gaps WHERE user_id = 'test_user';
-- Should be: >0 (gaps detected)

-- Check saved_sections
SELECT COUNT(*), type FROM saved_sections 
WHERE user_id = 'test_user' 
GROUP BY type;
-- Should show: clean structure (no duplicates if implemented)
```

---

## NEXT STEPS

1. ✅ **DONE:** Surgical revert complete
2. ⏭️ **TODO:** Run manual QA test (product tour with resume+CL)
3. ⏭️ **TODO:** Compare database output to main
4. ⏭️ **TODO:** Verify all 6 regressions are fixed:
   - [ ] Gap banners visible
   - [ ] Role summaries populated
   - [ ] Role metrics extracted
   - [ ] Stories created
   - [ ] No duplicate intro
   - [ ] No 27 fragments
5. ⏭️ **TODO:** If all pass, ready for final QA

---

## COMMIT SUMMARY

**Commit:** fbd6e44  
**Message:** "REVERT: Remove coverLetterProcessingService and restore main's working logic"

**Changes:**
- Deleted: `src/services/coverLetterProcessingService.ts` (-522 lines)
- Modified: `src/services/fileUploadService.ts` (-38 lines of broken logic)
- Result: Restored main's exact processing logic

**Impact:**
- Cover letter regressions: SHOULD BE FIXED
- Resume regressions: SHOULD BE FIXED (same logic as main)
- Gap detection: SHOULD WORK (same triggers as main)
- Streaming performance: PRESERVED (events still intact)


