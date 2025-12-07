# Admin Auth Debugging Session — Post-Mortem

**Date:** December 6, 2025  
**Duration:** ~2 hours  
**Status:** ✅ Resolved  
**Final Outcome:** Admin dashboards fully functional + user email display

---

## 🔴 **Initial Problem**

Admin dashboards (`/admin/evals`, `/admin/funnel`, `/admin/leaderboard`) were returning:
- **Error:** "Internal server error" (HTTP 500)
- **User Impact:** Complete admin access failure
- **Attempts:** 3 failed fixes before root cause identified

---

## 🔍 **Debugging Journey**

### **Attempt 1: RLS Infinite Recursion (WRONG)**
**Hypothesis:** RLS policy on `user_roles` was causing infinite loop.

**Action Taken:**
- Created migration `20251226_fix_user_roles_rls.sql`
- Dropped "Admins can manage all roles" policy
- Kept only "Users can read own role" policy

**Result:** ❌ Still failed (403 error)

**Lesson:** Fixed a real issue, but not THE issue.

---

### **Attempt 2: Service Role Fallback (WRONG)**
**Hypothesis:** Service role credentials missing or incorrect.

**Action Taken:**
- Added service role fallback in `admin-guard.ts`
- Added `checkAdminWithServiceRole()` function
- Verified `SUPABASE_SERVICE_ROLE_KEY` was set

**Result:** ❌ Still failed (403 error)

**Lesson:** Service role was configured correctly, but guard logic was broken.

---

### **Attempt 3: Missing `elog.warn()` Method (WRONG)**
**Hypothesis:** Edge Function crashing due to missing logging method.

**Action Taken:**
- Added `warn()` method to `elog` utility
- Redeployed all admin Edge Functions

**Result:** ❌ Still failed (403 error)

**Lesson:** Fixed a minor bug, but not the root cause.

---

### **Attempt 4: JWT Token Expired (WRONG)**
**Hypothesis:** User's session token was invalid/expired.

**Action Taken:**
- Asked user to log out and log back in
- Checked browser DevTools for session data

**Result:** ❌ Still failed (403 error)

**Lesson:** Session was valid; problem was server-side.

---

## ✅ **Root Cause Found**

### **The Actual Problem:**

**File:** `supabase/functions/_shared/admin-guard.ts`

**Broken Code:**
```typescript
const userClient = createClient(supabaseUrl, anonKey, {
  global: { headers: { Authorization: authHeader } },  // ❌ WRONG
});

const { data: { user }, error: authError } = await userClient.auth.getUser();  // ❌ No token passed
```

**Why It Failed:**
- `createClient()` with `global.headers` doesn't pass token to `getUser()`
- `getUser()` called with **no argument** always fails
- Edge Function returned 403 "Invalid or expired auth token"

**Correct Pattern** (from `preanalyze-jd/index.ts`):
```typescript
const token = authHeader.replace('Bearer ', '');  // ✅ Extract token
const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);  // ✅ Pass token
```

---

## 🔧 **The Fix**

**File:** `supabase/functions/_shared/admin-guard.ts`

```typescript
// Extract token from Authorization header
const token = authHeader.replace('Bearer ', '');

const userClient = createClient(supabaseUrl, anonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Get authenticated user by token
const { data: { user }, error: authError } = await userClient.auth.getUser(token);
```

**Deployed:**
```bash
supabase functions deploy admin-evals-query
supabase functions deploy admin-evaluation-runs-query
supabase functions deploy admin-funnel-stats
supabase functions deploy admin-leaderboard
supabase functions deploy admin-spoof-user
```

**Result:** ✅ **All admin dashboards working!**

---

## 🎓 **Lessons Learned**

### **1. Compare Working Code First**
- ❌ **Wrong:** Create new auth guard from scratch
- ✅ **Right:** Compare to existing working Edge Functions (`preanalyze-jd`, `evaluate-draft-readiness`)

### **2. Test Edge Functions Directly**
- ❌ **Wrong:** Only test via frontend UI
- ✅ **Right:** Use `curl` to test Edge Functions in isolation
- ✅ **Right:** Check Edge Function logs: `supabase functions logs <name>`

### **3. Don't Assume API Patterns**
- ❌ **Wrong:** Assume `createClient` with `global.headers` works
- ✅ **Right:** Verify against Supabase docs and working examples

### **4. Distinguish Error Codes**
- ❌ **Wrong:** Treat all failures as "auth expired"
- ✅ **Right:** 403 = auth succeeded but authorization failed
- ✅ **Right:** 500 = server crash (different root cause)

### **5. Verify Each Fix**
- ❌ **Wrong:** Layer multiple fixes without testing
- ✅ **Right:** Test after EACH change to confirm it worked

---

## 📊 **Impact Assessment**

### **Problems Fixed:**
1. ✅ Admin auth guard (getUser token extraction)
2. ✅ RLS infinite recursion (user_roles policy)
3. ✅ Missing `elog.warn()` method
4. ✅ Service role fallback (working correctly now)

### **New Features Added:**
5. ✅ User email display in spoof selector
6. ✅ New Edge Function: `admin-list-users`

### **Files Modified:**
- `supabase/functions/_shared/admin-guard.ts` (auth fix)
- `supabase/functions/_shared/log.ts` (warn method)
- `supabase/functions/admin-list-users/index.ts` (new)
- `src/services/adminService.ts` (user list API)
- `supabase/migrations/20251226_fix_user_roles_rls.sql` (new)

---

## 🚀 **Current Status**

### **Working:**
- ✅ Admin authentication
- ✅ `/admin/evals` — Global evals dashboard
- ✅ `/admin/funnel` — Funnel analytics
- ✅ `/admin/leaderboard` — User leaderboard
- ✅ User spoofing (with email display)
- ✅ Service role queries (bypassing RLS)

### **Pending:**
- ⏸️ Phase 3: Global `/evaluation-dashboard` view
- ⏸️ Phase 4: Event instrumentation (funnel data)
- ⏸️ Phase 5: CSV export

---

## 💡 **Best Practices Going Forward**

1. **Always reference working Edge Functions** when creating new ones
2. **Test Edge Functions with `curl`** before integrating with frontend
3. **Check Edge Function logs** for server-side errors
4. **Use `admin-guard.ts`** as shared utility (now fixed!)
5. **Deploy admin Edge Functions together** for consistency

---

## 🎉 **Final Outcome**

**Admin tooling suite is LIVE and fully functional!**

- 6 Edge Functions deployed
- 4 database migrations applied
- 3 admin dashboards operational
- User spoofing with email display
- Comprehensive documentation

**Next steps:** Event instrumentation (Phase 4) or CSV export (Phase 5).


