# STREAMING DEBUG SESSION - Issues Found & Fixed

## User-Reported Issues (After Phase 3)

**Symptoms:**
1. Click "Generate" → CTA shows "Generating" ✅
2. Page reverts back to JD tab (should stay on Cover Letter)
3. Page sits silently for ~1 minute (should show skeleton immediately)
4. Draft finally appears but with wrong structure (single section with placeholders instead of multiple ContentCards)

## Root Causes Identified

### Issue 1: Stale useEffect Blocking Draft Load ✅ FIXED
**Location:** `CoverLetterModal.tsx` line 315-343

**Problem:**
- Old useEffect from pre-Phase-1 architecture still present
- Tried to load draft from `jobState.result.draftId`
- This field NO LONGER EXISTS after Phase 1 (pipeline is analysis-only)
- Caused silent 1-minute wait as condition never triggered

**Fix:** Removed in commit `9027f46`

### Issue 2: Insufficient Logging
**Problem:**
- Can't see which operation (streaming vs generateDraft) is failing
- Can't see draft structure when it's set
- Can't diagnose why skeleton doesn't show

**Fix:** Added detailed logging in commit `2760e94`

## Next Debugging Steps

### For User (Next Test Run):

1. **Open browser DevTools console BEFORE clicking Generate**

2. **Click "Generate" and watch for these log messages:**

```
[CoverLetterModal] Starting parallel operations
[CoverLetterModal] About to start Promise.allSettled with 2 operations
[CoverLetterModal] createJob resolved: ...
[CoverLetterModal] generateDraft resolved with X sections
[CoverLetterModal] Promise.allSettled complete: { streamingStatus: ..., draftStatus: ... }
[CoverLetterModal] Draft generated successfully: { draftId, sectionCount, sectionTitles }
```

3. **Watch for what tab you're on:**
   - Should immediately switch to "Cover letter" tab
   - Should NOT revert to "Job description" tab

4. **Look for these UI elements:**
   - Skeleton with section titles from template (not hardcoded)
   - Loading shimmers on sections
   - Metrics progressively updating (streaming)

### Expected Behavior (If Working Correctly):

**Immediate (0-1s):**
- Switch to "Cover letter" tab
- Skeleton appears with template section structure
- Empty content with shimmers
- Metrics show loading state

**Progressive (1-45s):**
- Metrics update from streaming (3/7, 0/11 → actual scores)
- Gap banners may appear from streaming
- Section content remains in loading state

**Final (20-60s):**
- Draft from `generateDraft()` populates sections
- Multiple ContentCards with individual sections
- Each section has proper title, content, gap banners
- Metrics toolbar shows final scores

## Possible Remaining Issues

### If Draft Structure is Still Wrong:

**Check:** Does `generateDraft()` service return proper sections?
- Should return array of sections with: id, title, slug, type, content
- NOT a single section with entire letter as content

**Check:** Is the template valid?
- Template should have multiple sections defined
- Each section should have structure

### If Skeleton Never Shows:

**Check:** Is `isStreaming` prop being set correctly?
- Should be true when `createJob` starts
- Should remain true until job completes

**Check:** Are `templateSections` being loaded?
- Modal should fetch template.sections when templateId changes
- Should pass non-empty array to DraftEditor

### If Tab Reverts to JD:

**Check:** Is an error being thrown before `setMainTab('cover-letter')`?
- Error in JD parsing?
- Error in createJob call?
- Look for console errors

## Files Modified in This Session

1. `src/components/cover-letters/CoverLetterModal.tsx`
   - Removed stale useEffect (commit 9027f46)
   - Added debug logging (commit 2760e94)

## Commits

- `9027f46` - fix: Remove stale useEffect that blocks draft loading
- `2760e94` - debug: Add detailed logging to parallel operations

## Status

**Branch:** `feat/streaming-mvp`
**Latest Commit:** `2760e94`

**Action Required:** User needs to test again with console open and report back with:
1. Console log output
2. What tab they're on after clicking Generate
3. Whether skeleton shows
4. Whether draft structure is correct (multiple ContentCards vs single textarea)

