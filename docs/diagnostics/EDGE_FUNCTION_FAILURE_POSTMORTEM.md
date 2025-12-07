# Edge Function Failure - Postmortem
**Date:** 2025-12-07  
**Branch:** onboard-stream  
**Status:** Reverted to client-side processing

---

## TIMELINE

1. **Attempt 1:** Created incomplete Edge function (skeleton + skills prompts only)
   - Result: Missing metrics, stories, role summaries
   
2. **Attempt 2:** Fixed Edge function with FULL prompt
   - Commit: aa04ecc
   - Expected: Complete data extraction + streaming UX
   - Result: **Silently failed** - 0 work_items created

3. **Investigation:** Edge function returned 200 OK but no database writes
   - Import screen showed: 15→21 companies, 15→24 roles, 1→14 stories
   - Query revealed: All data from Dec 5, **NONE from Dec 7 upload**
   - Edge function created 0 work_items despite "success" response

4. **Decision:** Revert to client-side processing
   - Commit: 6aadf4e
   - Reason: Can't debug Edge function failures quickly
   - Goal: Get working data FIRST, optimize LATER

---

## WHAT WENT WRONG

### **Edge Function Execution:**
- ✅ Called successfully (200 OK)
- ✅ LLM analysis completed (23s execution time)
- ✅ Updated sources table (processing_stage: 'complete')
- ❌ **Database writes failed silently** (0 companies, 0 work_items, 0 stories)

### **Why Database Writes Failed:**

**Possible causes:**
1. **RLS Policies:** Edge function uses SERVICE_ROLE_KEY, should bypass RLS, but maybe misconfigured?
2. **Schema Mismatch:** Edge function schema might not match actual DB schema
3. **Foreign Key Violations:** Company_id or user_id references might be invalid
4. **Transaction Issues:** Inserts might be rolling back due to constraint failures
5. **Error Handling:** `try/catch` blocks swallow errors without logging details

### **Why We Couldn't Debug:**

1. **No detailed logs:** Edge function logs only show HTTP status, not console.log output
2. **Async errors:** Errors in `saveStructuredDataToDatabase()` are caught and logged but not visible
3. **Remote execution:** Can't step through code or inspect variables
4. **No feedback loop:** Takes 30s to deploy, test, check results

---

## EVIDENCE

### **Database Query:**
```sql
SELECT id, title, company, source_created, work_item_created
FROM work_items wi
JOIN companies c ON wi.company_id = c.id
JOIN sources s ON wi.source_id = s.id
WHERE user_id = 'narrata.ai@gmail.com'
ORDER BY work_item_created DESC
LIMIT 5;
```

**Result:**
- Latest work_items: **Dec 5, 2025**
- Latest source: **Dec 7, 2025** (today's upload)
- **Gap:** Source exists, work_items don't

### **Edge Function Logs:**
```
POST | 200 | process-resume | 23,797ms
POST | 200 | process-resume | 25,941ms  
POST | 200 | process-resume | 21,089ms
```

**All returned 200 OK**, but none created database records.

---

## DECISION RATIONALE

### **Why Revert:**

1. **Blocked on debugging:**
   - Can't see detailed logs
   - Can't iterate quickly (30s deploy cycle)
   - No local testing for Edge functions

2. **Client-side works:**
   - Main branch uses client-side processing
   - Proven to work correctly
   - Can iterate in seconds, not minutes

3. **Streaming is secondary:**
   - Primary goal: Complete data extraction
   - Secondary goal: Streaming UX
   - Don't sacrifice #1 for #2

### **Why Not Fix Edge Function:**

- **Unknown root cause:** Could be RLS, schema, FK, transactions, or other
- **No debugging tools:** Can't inspect what's failing
- **Time constraint:** User needs working solution now
- **Risk:** More attempts = more wasted time if we can't see the problem

---

## PATH FORWARD

### **Phase 1: Get Working Data (NOW)**
✅ Revert to client-side FileUploadService  
⏭️ Test resume upload → verify complete data  
⏭️ Confirm: companies, work_items, stories, metrics all created  

### **Phase 2: Add Streaming UX (NEXT)**
- Add progress events to FileUploadService
- Emit stages: uploading, extracting, analyzing, saving, complete
- Client listens to events and updates progress bar
- Same data, better UX

### **Phase 3: Optimize with Edge Function (LATER)**
- Fix Edge function with proper error handling
- Add detailed logging to every database operation
- Test locally with Supabase CLI
- Verify DB output matches main exactly
- Only deploy when proven to work

---

## LESSONS LEARNED

### ❌ **What Didn't Work:**

1. **Reimplementing complex logic in Edge function**
   - FileUploadService.processStructuredData is 500+ lines
   - Edge function tried to replicate it in 100 lines
   - Result: Missing logic, silent failures

2. **Insufficient error handling**
   - Errors caught but not surfaced
   - No way to see what failed
   - False success (200 OK, but no data)

3. **No local testing**
   - Deployed directly to prod
   - No way to step through code
   - Blind iteration

### ✅ **What to Do Next Time:**

1. **Test Edge functions locally first**
   - Use Supabase CLI (`supabase functions serve`)
   - Step through code with debugger
   - Verify DB writes before deploying

2. **Add comprehensive logging**
   - Log every database operation
   - Log success AND failures
   - Include error details, not just try/catch

3. **Start simple, add complexity**
   - Don't reimplement 500 lines at once
   - Start with minimal Edge function
   - Add features incrementally
   - Test at each step

4. **Verify output matches main**
   - Run same input through both paths
   - Compare database state
   - Ensure identical results before shipping

---

## CURRENT STATE

**Branch:** onboard-stream  
**Commit:** 6aadf4e

**Resume Processing:**
- ✅ Uses FileUploadService (client-side)
- ✅ Same logic as main (proven to work)
- ❌ No streaming UX (yet)
- ❌ No progress bar (yet)

**Cover Letter Processing:**
- ✅ Uses processCoverLetterData (client-side)
- ✅ Working correctly
- ✅ No regressions

**Next Test:**
Upload resume → should create:
- 1 company (Enact Systems Inc.)
- 1 work_item (VP of Product) with:
  - Role summary
  - Outcome metrics
  - Role tags
- 3 stories with metrics
- Gap badges visible

---

## APPENDIX: Edge Function Code That Failed

See commit `aa04ecc` for the Edge function that silently failed.

**Key files:**
- `supabase/functions/process-resume/index.ts` (deleted in 6aadf4e)
- `src/pages/NewUserOnboarding.tsx` (resumeBlockingUpload removed)

**What it tried to do:**
1. Call OpenAI with full prompt ✅
2. Parse JSON response ✅
3. Save to database ❌ (failed silently)

**Why it failed:**
Unknown - errors swallowed by try/catch, no detailed logs available.


