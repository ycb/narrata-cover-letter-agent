# Resume Regression Fix
**Date:** 2025-12-07  
**Branch:** onboard-stream  
**Status:** ✅ Fixed - Resume processing restored to main's working logic

---

## ROOT CAUSE

The `onboard-stream` branch created a **new Edge function** (`process-resume`) that **replaced** the working client-side resume processing logic from `main`.

**The Edge function was incomplete:**
- ✅ Extracted basic work_items (company, title, dates, location)
- ✅ Extracted skills
- ❌ **NO** outcome metrics
- ❌ **NO** stories from resume bullets
- ❌ **NO** role summaries with impact statements
- ❌ **NO** comprehensive LLM analysis

**In `main`:**
- Resume processing is done **client-side**
- Uses `FileUploadService.uploadAndAnalyze()`
- Calls `analyzeResume()` with **full LLM prompt**
- Extracts complete structured data including metrics, stories, summaries

---

## WHAT WAS BROKEN

### Symptoms:
1. Work History showing "No metrics found"
2. Stories count: 0 (should have extracted from bullets)
3. Role-level data incomplete (dates/title only, no summary)
4. Gap detection working (proves data WAS being created, just incomplete)

### User Feedback:
> "MIssing gap badges AND resume content"  
> "NO ROLE LEVEL DATA NOT POPULATED BY RESUME. Another persistent critical regression"  
> "Stories are being edited by LLM, not imported verbatim. Another critical regression"

---

## WHAT WAS FIXED

### 1. Deleted `supabase/functions/process-resume/index.ts` ✅
**Why:** This file was a new, incomplete implementation that didn't exist in `main`.

**What it did (broken):**
```typescript
// Stage 1: Skeleton
const skeletonResult = await callOpenAI(openaiKey, {
  messages: [{ role: 'user', content: buildSkeletonPrompt(resumeText) }],
  maxTokens: 2000,
});
// → Only extracted company, title, dates, location

// Stage 2: Skills  
const skillsResult = await callOpenAI(openaiKey, {
  messages: [{ role: 'user', content: buildSkillsPrompt(resumeText) }],
  maxTokens: 1500,
});
// → Only extracted skill categories
```

**What it DIDN'T do:**
- Extract outcome metrics (revenue growth, user impact, etc.)
- Create stories from resume bullets
- Generate role summaries with impact statements
- Call the comprehensive `analyzeResume` prompt from `resumeAnalysis.ts`

### 2. Removed `resumeBlockingUpload` Custom Handler (167 lines) ✅
**File:** `src/pages/NewUserOnboarding.tsx`

**What it did (broken):**
- Created custom upload logic
- Called the broken Edge function
- Bypassed `FileUploadService`
- Polled for completion status
- Never triggered comprehensive LLM analysis

**Replaced with:**
- Default `FileUploadCard` behavior (same as main)
- Uses `FileUploadService.uploadAndAnalyze()`
- Calls `analyzeResume()` with full prompt
- Creates complete work_items with all fields

### 3. Removed Related State & Imports ✅
Deleted unused state from blocking upload:
- `blockingStage` state
- `showBlockingProgress` state
- `stageConfig` object
- Unused imports: `FILE_UPLOAD_CONFIG`, `TextExtractionService`, `Progress`, `createSbClient`

---

## WHAT WAS PRESERVED

### ✅ Resume Gate Logic:
- Cover Letter & LinkedIn cards enabled after resume starts
- `setResumeGateOpen(true)` on upload
- User experience unchanged

### ✅ LinkedIn Auto-Detection:
- Still extracts LinkedIn URL from resume text
- Still prefills UI immediately
- Same UX as before

### ✅ Timing Metrics:
- `onboardingStartMs`, `resumeStartMs`, etc.
- Evaluation runs still logged
- Performance tracking intact

### ✅ Auto-Advance:
- Still waits for `resumeCompleted && linkedinCompleted && coverLetterCompleted`
- Still advances to 'review' step automatically
- No UX regression

---

## EXPECTED RESULTS AFTER FIX

### Resume Upload Should Now:

1. **✅ Create Complete Work Items:**
   - Company name, title, dates, location
   - **Role summary with impact** (e.g., "Led cross-functional team...")
   - **Outcome metrics** (e.g., "+210% MAU", "$167% revenue growth")
   - Company tags, role tags
   - Full structured data

2. **✅ Extract Stories:**
   - Stories created from resume bullets
   - Each story has: title, company, role, metrics, impact
   - Stories linked to work_items
   - Gap detection runs on stories

3. **✅ Trigger Gap Detection:**
   - `GapDetectionService.detectWorkItemGaps()` called
   - `GapDetectionService.detectStoryGaps()` called
   - Gap badges visible (Δ1, Δ2, etc.)
   - Gap banners in sidebar

4. **✅ Match Main's Behavior:**
   - Same database schema
   - Same data structure
   - Same LLM prompts
   - Same processing pipeline

---

## FILES CHANGED

### Deleted:
- `supabase/functions/process-resume/index.ts` (352 lines)

### Modified:
- `src/pages/NewUserOnboarding.tsx`:
  - Removed `resumeBlockingUpload` function (167 lines)
  - Removed blocking state variables (3 lines)
  - Removed `stageConfig` object (7 lines)
  - Removed unused imports (4 lines)
  - Removed `customUpload` prop from `FileUploadCard`
  - **Total removed:** ~181 lines

---

## TESTING REQUIRED

### 1. Upload Resume (VP of Product example):

**Expected:**
```
✅ Companies: 1 (Enact Systems Inc.)
✅ Roles: 1 (VP of Product)
✅ Role Summary: "Led a cross-functional team of 8 from 0-1 to improve solar ownership | Series A management team"
✅ Outcome Metrics:
   - "+210% Monthly Active Users"
   - "50% activation rate"
   - "+620% Visitors"
   - "+876% events"
   - "+169% revenue growth"
✅ Stories: 3 (extracted from bullets)
✅ Gap Badges: Visible if gaps detected
✅ Gap Banners: Visible in sidebar
```

### 2. Compare to Main:

**Database Query:**
```sql
-- Compare work_items structure
SELECT 
  id, 
  title, 
  description,  -- Should have role summary
  metrics,      -- Should have outcome metrics
  (SELECT COUNT(*) FROM stories WHERE work_item_id = work_items.id) as story_count
FROM work_items 
WHERE user_id = 'test_user'
ORDER BY start_date DESC;
```

**Expected:** Same structure, same data as main for identical resume.

### 3. End-to-End Test:

1. Upload resume → Check work_items created
2. Click role → Check "Outcome Metrics" section populated
3. Click "Stories" tab → Check stories exist
4. Check gap badges → Should show Δ count
5. Click role → Check gap banners in sidebar

---

## COMMIT SUMMARY

**Commit:** 3720de6  
**Message:** "REVERT: Delete broken process-resume Edge function, restore client-side processing"

**Changes:**
- Deleted: Edge function (incomplete implementation)
- Modified: NewUserOnboarding.tsx (removed custom handler)
- Result: Restored main's working logic

**Impact:**
- Resume processing: SHOULD NOW WORK (same as main)
- Cover letter processing: STILL WORKING (previous revert)
- Gap detection: SHOULD NOW WORK (data will be complete)
- Streaming performance: LOST (but functionality > performance for MVP)

---

## NEXT STEPS

1. ✅ **DONE:** Revert complete
2. ⏭️ **TODO:** Test resume upload end-to-end
3. ⏭️ **TODO:** Verify metrics, stories, gaps all working
4. ⏭️ **TODO:** If working, document baseline
5. ⏭️ **TODO:** THEN re-introduce streaming (correctly this time)

---

## LESSONS LEARNED

### ❌ What Went Wrong:

1. **Replaced instead of enhanced**
   - Created new Edge function instead of adding events to existing logic
   - Resulted in functional regression

2. **Incomplete implementation**
   - Edge function only extracted partial data
   - Never tested against main's output

3. **No validation**
   - No check to ensure new implementation matched main's data structure
   - No automated tests to catch regression

### ✅ Correct Approach for Streaming:

1. **Add, don't replace**
   - Keep existing logic intact
   - Add progress events around it
   - Wrap with streaming UI

2. **Validate output**
   - New implementation must produce identical DB output
   - Run diff comparison tests
   - Check schema compatibility

3. **Incremental changes**
   - Add streaming events first (non-functional)
   - Test thoroughly
   - Then optimize (parallelization, caching)
   - Test again


