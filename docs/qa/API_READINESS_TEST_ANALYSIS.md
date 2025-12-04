# API Readiness Test Analysis

**Status:** FAILING (4 tests)  
**Root Cause:** Test mocking doesn't reach handler execution  
**Estimated Fix Time:** 1-2 hours  
**Blocking:** No (feature is behind flag)

---

## Files Involved

### 1. Test File
**Path:** `/Users/admin/narrata/src/pages/api/drafts/__tests__/readiness.test.ts`
- 284 lines
- 10 total tests (6 passing, 4 failing)
- Uses Vitest mocking

### 2. Handler File
**Path:** `/Users/admin/narrata/src/pages/api/drafts/[draftId]/readiness.ts`
- 175 lines
- Next.js API route handler
- Returns draft readiness evaluation

### 3. Service File (Referenced)
**Path:** `/Users/admin/narrata/src/services/coverLetterDraftService.ts`
- Contains `getReadinessEvaluation()` method
- Throws `DraftReadinessFeatureDisabledError` when feature disabled

---

## The 4 Failing Tests

### Test 1: "returns 403 when draft does not belong to user"
**Expected:** 403 Forbidden  
**Actual:** 500 Internal Server Error  
**Line:** 184-202

**Test Setup:**
- Mocks admin client to return draft with `user_id: 'another-user'`
- User making request is `'user-1'`
- Should detect ownership mismatch and return 403

**Why It's Failing:**
- Handler reaches line 133: `if (draftRow.user_id !== userId)`
- But something is throwing an error before the 403 can be returned
- Likely: `createSupabaseUserClient()` at line 137 is failing

---

### Test 2: "returns 204 when no readiness data yet"
**Expected:** 204 No Content  
**Actual:** 403 Forbidden  
**Line:** 204-224

**Test Setup:**
- Mocks `CoverLetterDraftService` to return `null` from `getReadinessEvaluation()`
- Should return 204 when no readiness data exists

**Why It's Failing:**
- Handler is returning 403 instead of reaching the service call
- Likely: Ownership check is failing because mock isn't set up correctly
- The test uses `mockAdminClient({})` with default `userId: 'user-1'` and `draftRow.user_id: 'user-1'`
- But the handler is still returning 403, suggesting ownership check issue

---

### Test 3: "returns 503 when service throws feature disabled error"
**Expected:** 503 Service Unavailable  
**Actual:** 500 Internal Server Error  
**Line:** 226-249

**Test Setup:**
- Mocks service to throw `DraftReadinessFeatureDisabledError`
- Handler should catch this and return 503

**Why It's Failing:**
- Service mock is throwing the error correctly
- But handler's catch block at line 144 isn't catching it
- Instead, outer catch block at line 167 is catching and returning 500
- Likely: Mock error isn't instanceof the actual class

---

### Test 4: "returns 200 with readiness payload"
**Expected:** 200 OK with payload  
**Actual:** 204 No Content  
**Line:** 251-283

**Test Setup:**
- Mocks service to return full readiness object
- Should return 200 with the payload

**Why It's Failing:**
- Handler is returning 204 (no content) instead of 200 (with content)
- This means `readiness` is evaluating to `null` or `undefined`
- Service mock isn't being called or isn't returning the mocked value

---

## Root Cause Analysis

### The Core Issue: Mock Isolation

**Problem:** Tests mock `CoverLetterDraftService` constructor (line 17-33), but the handler imports the actual service and creates a new instance (line 138).

**Evidence:**
```typescript
// Test mocks the constructor:
vi.mock('@/services/coverLetterDraftService', () => {
  const mockConstructor = vi.fn().mockImplementation(() => ({
    getReadinessEvaluation: vi.fn(),
  }));
  return {
    CoverLetterDraftService: mockConstructor,
    // ...
  };
});

// Handler uses the service:
const service = new CoverLetterDraftService({ supabaseClient: supabaseUserClient });
```

**Issue:** The vi.mock at the module level should work, but tests are doing additional `.mockImplementationOnce()` calls that aren't being applied correctly.

### Secondary Issue: Supabase Client Creation

**Problem:** Handler calls `createSupabaseAdminClient()` and `createSupabaseUserClient()` with real Supabase client creation.

**Evidence:**
- Line 111: `const adminClient = createSupabaseAdminClient();`
- Line 137: `const supabaseUserClient = createSupabaseUserClient(accessToken);`

**Issue:** Tests mock `createClient` from `@supabase/supabase-js`, but:
1. The mocks return mock clients
2. These mock clients are used to create the service
3. The service behavior depends on the mocked Supabase responses

But the mock setup uses `.mockReturnValueOnce()` which only works for the FIRST call, then the mock resets.

---

## What You Need to Decide

### Option 1: Fix Test Mocks (Quick Fix, 1-2h)

**Approach:** Make test mocks more robust

**Changes Needed:**
1. **Fix `createClient` mock sequencing:**
   - Tests call `mockReturnValueOnce` twice (admin client, user client)
   - But handler might be calling `createSupabaseAdminClient` multiple times
   - Solution: Use `.mockReturnValue()` instead of `.mockReturnValueOnce()`

2. **Fix service mock persistence:**
   - Tests do `.mockImplementationOnce()` on the constructor
   - This only affects ONE instantiation
   - Solution: Set up mock once in `beforeEach`, then override specific methods per test

3. **Add debug logging:**
   - Add `console.log` in failing tests to see what's actually being called
   - Verify mock setup is correct

**Pros:**
- Quick fix
- Doesn't change production code
- Tests will pass

**Cons:**
- Tests remain tightly coupled to implementation
- Brittle mocking may break again with future changes

---

### Option 2: Refactor Handler for Testability (Better Long-Term, 2-3h)

**Approach:** Make handler easier to test by injecting dependencies

**Changes Needed:**
1. **Extract client creation to injectable functions:**
   ```typescript
   // Add optional params for testing:
   const readinessHandler = async (
     req: NextApiRequestLike,
     res: NextApiResponseLike,
     deps?: {
       createAdminClient?: () => SupabaseClient;
       createUserClient?: (token: string) => SupabaseClient;
       createService?: (client: SupabaseClient) => CoverLetterDraftService;
     }
   ) => {
     const adminClient = deps?.createAdminClient?.() ?? createSupabaseAdminClient();
     // ...
   }
   ```

2. **Tests pass in mock dependencies:**
   - No more vi.mock at module level
   - Direct dependency injection
   - Clearer, more maintainable tests

**Pros:**
- More testable design
- Easier to debug
- Less brittle tests

**Cons:**
- Requires changing handler signature
- More upfront work
- May affect how handler is called (need to check if Next.js allows this)

---

### Option 3: Accept Test Failures (Not Recommended)

**Approach:** Mark tests as skipped, document as known issue

**Pros:**
- No work required
- Focus on other priorities

**Cons:**
- Lose test coverage for API endpoint
- Feature may break without knowing
- Bad practice

---

## My Recommendation

**Go with Option 1: Fix Test Mocks (Quick Fix)**

**Rationale:**
1. Feature is behind a flag (not production-critical)
2. Handler logic is straightforward (low risk)
3. Quick fix gets tests green without major refactor
4. Can refactor later if needed (Option 2) during broader API refactor

**Specific Steps:**

1. **Change `createClient` mock from `mockReturnValueOnce` to `mockReturnValue`:**
   ```typescript
   // In each failing test, replace:
   (createClient as unknown as ReturnType<typeof vi.fn>)
     .mockReturnValueOnce(adminClient)
     .mockReturnValueOnce(userClient);
   
   // With:
   (createClient as unknown as ReturnType<typeof vi.fn>)
     .mockReturnValue(adminClient); // Remove .mockReturnValueOnce
   ```

2. **Move service mock setup to beforeEach instead of per-test:**
   ```typescript
   let mockService: any;
   
   beforeEach(() => {
     mockService = {
       getReadinessEvaluation: vi.fn(),
     };
     (CoverLetterDraftService as unknown as ReturnType<typeof vi.fn>)
       .mockImplementation(() => mockService);
   });
   
   // Then in each test, just override the method:
   it('returns 204 when no readiness data yet', async () => {
     mockService.getReadinessEvaluation.mockResolvedValue(null);
     // ... rest of test
   });
   ```

3. **Verify with debug logging:**
   - Add console.logs to see actual vs. expected status codes
   - Remove once tests pass

---

## What I Need From You

**Decision Point:** Which option do you want to pursue?

**If Option 1 (Quick Fix):**
- ✅ I can implement immediately (~30 minutes)
- ✅ I'll fix all 4 tests
- ✅ Tests will be green
- ⚠️ Tests remain somewhat brittle

**If Option 2 (Refactor):**
- ⏱️ Need to verify Next.js allows optional dependency injection
- ⏱️ 2-3 hours of work
- ✅ Better long-term solution
- ❓ May have knock-on effects to other API routes

**If Option 3 (Skip):**
- ✅ Mark tests as `it.skip()` with comment
- ✅ Document in TEST_STATUS.md as "known issue"
- ⚠️ Lose coverage

---

## Summary

**Files:**
- Test: `src/pages/api/drafts/__tests__/readiness.test.ts`
- Handler: `src/pages/api/drafts/[draftId]/readiness.ts`

**Issue:** Mock setup doesn't persist correctly through handler execution

**Fix Options:**
1. Quick fix test mocks (1-2h) ← Recommended
2. Refactor for testability (2-3h)
3. Skip tests (not recommended)

**Decision Needed:** Which option should I pursue?

**My Recommendation:** Option 1 (quick fix), since feature is flagged and non-critical, and tests can be refactored later if needed.

