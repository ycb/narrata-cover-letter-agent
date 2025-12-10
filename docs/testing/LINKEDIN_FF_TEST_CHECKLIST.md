# LinkedIn Feature Flag - Test Checklist

## Pre-Test Setup

### Check Current Flag State
```bash
# .env file
grep "ENABLE_LI_SCRAPING" .env

# Expected output:
# VITE_ENABLE_LI_SCRAPING=false
# ENABLE_LI_SCRAPING=false
```

### Verify Supabase Secret
```bash
supabase secrets list | grep ENABLE_LI_SCRAPING

# Expected: ENABLE_LI_SCRAPING | false
```

---

## Test Suite 1: Flag OFF (Default State) ✅

**Goal**: Verify LinkedIn scraping is completely disabled and flow doesn't hang.

### Setup
- Ensure `VITE_ENABLE_LI_SCRAPING=false` in `.env`
- Ensure `ENABLE_LI_SCRAPING=false` in Supabase secrets
- Fresh browser session (clear cache/localStorage)

### Test Case 1.1: Manual LinkedIn URL Entry
**Steps**:
1. Navigate to `/new-user-onboarding`
2. Upload resume (valid PDF)
3. Upload cover letter (valid text/PDF)
4. Enter LinkedIn URL: `https://linkedin.com/in/testuser`
5. Click "Connect" button

**Expected Results**:
- ✅ URL validation passes
- ✅ UI shows: "⚠️ LinkedIn enrichment temporarily disabled - URL validation only"
- ✅ Progress bar immediately advances to 100%
- ✅ LinkedIn card shows "connected" state
- ✅ Auto-advances to review step within ~2 seconds
- ✅ **No** network call to `/functions/v1/appify-proxy` (check DevTools Network tab)
- ✅ **No** CORS errors in console
- ✅ Console shows: `📌 LinkedIn scraping disabled by feature flag`

**Database Checks**:
```sql
-- Should be EMPTY (no LinkedIn source created)
SELECT * FROM sources WHERE user_id = '<test_user_id>' AND source_type = 'linkedin';

-- Should be EMPTY (no LinkedIn work items)
SELECT * FROM work_items WHERE user_id = '<test_user_id>' AND source_id IN (
  SELECT id FROM sources WHERE source_type = 'linkedin'
);
```

---

### Test Case 1.2: Resume Auto-Population of LinkedIn URL
**Steps**:
1. Navigate to `/new-user-onboarding`
2. Upload resume containing LinkedIn URL (e.g., in contact info)
3. Wait for auto-population
4. Observe LinkedIn field

**Expected Results**:
- ✅ LinkedIn URL auto-populates from resume
- ✅ UI shows: "⚠️ LinkedIn enrichment temporarily disabled"
- ✅ **No** silent prefetch API call (check Network tab)
- ✅ Console shows: `📌 LinkedIn scraping disabled - skipping prefetch`
- ✅ Can still manually click "Connect"
- ✅ Clicking "Connect" immediately completes (no API call)

---

### Test Case 1.3: Invalid LinkedIn URL (Flag OFF)
**Steps**:
1. Navigate to `/new-user-onboarding`
2. Enter invalid LinkedIn URL: `https://twitter.com/user`
3. Click "Connect"

**Expected Results**:
- ✅ Validation error shown
- ✅ Does **not** advance to next step
- ✅ Error message: "Invalid LinkedIn URL. Please use format: https://linkedin.com/in/yourprofile"

---

### Test Case 1.4: Skip LinkedIn Entirely (Flag OFF)
**Steps**:
1. Navigate to `/new-user-onboarding`
2. Upload resume
3. Upload cover letter
4. Leave LinkedIn field empty
5. Wait for auto-advance

**Expected Results**:
- ✅ Flow waits for LinkedIn URL (field is marked `required`)
- ✅ Does **not** auto-advance until LinkedIn URL entered
- ⚠️ **OR** if LinkedIn is not required, should advance without it

**NOTE**: Verify `required={true}` prop on `FileUploadCard` for LinkedIn. If disabled feature should make it optional, update code.

---

### Test Case 1.5: Direct API Call to Edge Function (Flag OFF)
**Test with curl**:
```bash
curl -X POST https://lgdciykgqwqhxvtbxcvo.supabase.co/functions/v1/appify-proxy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANON_KEY>" \
  -d '{"linkedinUrl": "https://linkedin.com/in/pspan"}'
```

**Expected Response**:
```json
{
  "success": false,
  "error": "LinkedIn scraping disabled",
  "disabled": true
}
```
- ✅ HTTP Status: `200` (not 500)
- ✅ No Apify API call made

---

## Test Suite 2: Flag ON (Future State) ⏸️

**Goal**: Verify LinkedIn scraping works when enabled.

### Setup
- Set `VITE_ENABLE_LI_SCRAPING=true` in `.env`
- Set `ENABLE_LI_SCRAPING=true` in Supabase secrets
- Rebuild frontend: `npm run build`
- Redeploy edge function: `supabase functions deploy appify-proxy`
- Fresh browser session

### Test Case 2.1: Valid LinkedIn URL (Flag ON)
**Steps**:
1. Navigate to `/new-user-onboarding`
2. Upload resume
3. Upload cover letter
4. Enter LinkedIn URL: `https://linkedin.com/in/pspan`
5. Click "Connect"

**Expected Results**:
- ✅ UI shows normal message (no "disabled" warning)
- ✅ Network call to `/functions/v1/appify-proxy` **IS** made
- ✅ Apify API called (check edge function logs)
- ✅ Progress bar shows actual scraping progress
- ✅ LinkedIn data stored in `sources` table
- ✅ Work items created in `work_items` table
- ✅ Auto-advances after **actual** completion

**Database Checks**:
```sql
-- Should have 1 row
SELECT * FROM sources WHERE user_id = '<test_user_id>' AND source_type = 'linkedin';

-- Should have work items
SELECT * FROM work_items WHERE user_id = '<test_user_id>' AND source_id IN (
  SELECT id FROM sources WHERE source_type = 'linkedin'
);
```

---

### Test Case 2.2: Silent Prefetch (Flag ON)
**Steps**:
1. Upload resume with LinkedIn URL in contact info
2. Wait for auto-population
3. Observe network tab

**Expected Results**:
- ✅ LinkedIn URL auto-populates
- ✅ Silent prefetch API call **IS** made in background
- ✅ Console shows: `🔄 Silent LinkedIn prefetch starting`
- ✅ Clicking "Connect" uses cached result (no duplicate API call)

---

## Test Suite 3: Flag Toggle (State Transitions)

### Test Case 3.1: Toggle OFF → ON
**Steps**:
1. Start with flag OFF
2. Complete onboarding (no LinkedIn data scraped)
3. Set flag ON
4. Try to connect LinkedIn URL again

**Expected Results**:
- ✅ New scraping attempt **should** work
- ✅ Data gets stored

### Test Case 3.2: Toggle ON → OFF
**Steps**:
1. Start with flag ON
2. Complete onboarding (LinkedIn data scraped)
3. Set flag OFF
4. Try to connect new LinkedIn URL

**Expected Results**:
- ✅ New scraping attempt **should** be blocked
- ✅ Previous data remains in database
- ✅ No new API calls

---

## Edge Cases & Error Handling

### Test Case 4.1: Flag OFF + Apify Service Configured
**Setup**: Flag OFF but `VITE_APPIFY_API_KEY` exists in env

**Expected**: Feature flag takes precedence, no API calls made

### Test Case 4.2: Flag ON + Apify Service NOT Configured
**Setup**: Flag ON but `VITE_APPIFY_API_KEY` missing

**Expected**: Error handled gracefully, no crash

### Test Case 4.3: Flag Mismatch (Client vs Server)
**Setup**: `VITE_ENABLE_LI_SCRAPING=true` but `ENABLE_LI_SCRAPING=false`

**Expected**: Server returns "disabled" even if client attempts call

---

## Performance Checks

### When Flag OFF:
- ✅ Zero network calls to Apify/edge function
- ✅ Progress bar advances in <500ms
- ✅ Auto-advance to review step in <2s
- ✅ No hanging/loading states

### When Flag ON:
- ✅ Scraping takes 10-30s (expected)
- ✅ Progress updates during scraping
- ✅ No timeout errors (60s limit)

---

## Console Output Verification

### Expected Logs (Flag OFF):
```
📌 LinkedIn scraping disabled by feature flag (ENABLE_LI_SCRAPING=false)
📌 LinkedIn scraping disabled - skipping prefetch
📌 LinkedIn scraping disabled - validating URL only
```

### Expected Logs (Flag ON):
```
🔄 Silent LinkedIn prefetch starting for: https://linkedin.com/in/...
🔄 LinkedIn Connect: calling Appify...
✅ LinkedIn Connect succeeded
✅ LinkedIn prefetch succeeded
```

---

## Rollback Plan

If tests fail or bugs found:

1. **Immediate**: Set flag to `false` (already default)
2. **Code**: Revert commits if needed
3. **Database**: No migration needed (feature is additive)
4. **Users**: No impact (flag already disabled)

---

## Sign-Off Checklist

Before marking complete:
- [ ] Test Case 1.1 passed (manual URL entry, flag OFF)
- [ ] Test Case 1.2 passed (auto-population, flag OFF)
- [ ] Test Case 1.3 passed (invalid URL, flag OFF)
- [ ] Test Case 1.5 passed (direct API call blocked, flag OFF)
- [ ] No errors in browser console
- [ ] No CORS errors
- [ ] Progress bar advances normally
- [ ] Auto-advance to review step works
- [ ] No hanging/stuck states
- [ ] Database checks confirm no LinkedIn data created

**Optional** (requires enabling flag):
- [ ] Test Case 2.1 passed (scraping works when ON)
- [ ] Test Case 2.2 passed (silent prefetch works when ON)

---

## Current Status

**Last Tested**: _[Not yet tested]_  
**Test Environment**: _[Local/Staging/Production]_  
**Tester**: _[Name]_  
**Result**: _[Pass/Fail]_  
**Issues Found**: _[List any issues]_
