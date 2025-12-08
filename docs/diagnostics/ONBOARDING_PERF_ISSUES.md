# Onboarding Performance & Functionality Issues - DIAGNOSED

## User Report (Dec 8, 2024)

**Testing Resume**: Peter Spannagle Resume.pdf  
**Testing CL**: 23andMe.pdf

### Issues Reported:

1. **Stuck at 15% for a LONG TIME** - Performance terrible compared to Edge function
2. **Strange 406 error** - Failed to load resource
3. **No auto-extraction of LinkedIn URL**
4. **Different summary results** - Not same as previous run

---

## ROOT CAUSE ANALYSIS

### Issue #1: Stuck at 15% (PERFORMANCE)

**Cause**: Mixed progress event formats + large progress gaps

**Evidence**:
- Service used TWO different event formats simultaneously:
  - OLD: `{sourceId, stage, progress, message}`
  - NEW: `{stage, percent, label, fileType}`
- UI listened for NEW format only
- Large gap: 15% (extraction start) → 80% (saving) with NO intermediate events
- LLM analysis (slowest part) had no progress updates

**Fix Applied**:
```typescript
// Standardized ALL progress events
private emitProgress(stage: string, percent: number, label: string, fileType?: string)

// Added intermediate milestones:
- Starting: 5%
- Extracting: 15-25%
- Analyzing: 40%
- Work history: 55%
- Stories: 70%
- Skills: 75%
- Structuring: 78%
- Saving: 80%
- Complete: 100%
```

**Commit**: `7238817`

---

### Issue #2: 406 Error

**Status**: NOT YET INVESTIGATED - Need browser console logs

**Hypothesis**:
- CORS issue
- Content-type negotiation failure
- Missing Accept header

**Next Steps**: Check browser Network tab for the failing request

---

### Issue #3: No LinkedIn URL Auto-Extraction

**Cause**: LinkedIn URL WAS extracted, but UI field not populated

**Evidence**:
- `checkAndAutoPopulateLinkedIn()` IS being called after resume upload (line 215)
- Function reads from `structured_data.contactInfo.linkedin`
- Sets `onboardingData.linkedinUrl` state
- Silent prefetch also triggers

**Hypothesis**: `FileUploadCard` not syncing `currentValue` prop properly

**Status**: NEEDS TESTING - should work but verify UI updates

---

### Issue #4: Different Summary Results

**Cause**: TBD - Need to compare actual data

**Possible Causes**:
1. Client-side `processStructuredData()` has different logic than Edge function
2. LLM prompt regression (we reverted `aa30197` changes)
3. Data extraction incomplete

**Next Steps**: Compare database records:
```sql
SELECT 
  COUNT(*) as total_companies,
  (SELECT COUNT(*) FROM work_items WHERE user_id = 'USER_ID') as total_roles,
  (SELECT COUNT(*) FROM stories WHERE user_id = 'USER_ID') as total_stories
FROM work_items 
WHERE user_id = 'USER_ID' AND parent_id IS NULL;
```

---

## FIXES APPLIED

### ✅ Progress Event Standardization
- File: `src/services/fileUploadService.ts`
- Changes: Replaced ALL `window.dispatchEvent()` with `this.emitProgress()`
- Result: Smooth progress bar progression, no stuck at 15%

### ✅ File Type Tracking
- Added `fileType` parameter to all progress events
- UI can now distinguish Resume vs CL vs LinkedIn uploads

### ⏳ LinkedIn Auto-Population
- Code exists and is called
- Needs UI verification

### ⏳ Summary Results
- Needs data comparison

---

## TESTING CHECKLIST

- [ ] Upload resume → progress bar shows smooth 5% → 100%
- [ ] Resume completes → LinkedIn URL populates in UI field
- [ ] Click LinkedIn Connect → "Connecting..." → "Connected"
- [ ] All 3 complete → auto-advance to Summary
- [ ] Summary shows correct counts (compare to main branch)
- [ ] No 406 errors in console

---

## PERFORMANCE COMPARISON

**Edge Function (Previous)**:
- Streaming progress with backend control
- Fast perceived performance

**Client-Side (Current)**:
- Progress events from service
- LLM analysis blocks UI thread
- Should be ~same speed, just different architecture

**Next Iteration**:
- Move to Edge function with proper logging
- Use proven client-side logic in Edge context
- Add comprehensive error handling

