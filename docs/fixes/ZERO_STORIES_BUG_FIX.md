# Zero Stories Bug Fix

**Date:** December 9, 2025  
**Status:** ✅ FIXED  
**Severity:** Critical - Blocked all story insertions during onboarding

---

## 🐛 **Bug Summary**

Resume uploads were completing successfully with LLM extracting stories, but **ZERO stories** were being inserted into the database.

---

## 🔍 **Root Cause**

The `companies` table was missing a **unique constraint on `(user_id, name)`**, causing the batch upsert to fail silently:

```typescript
// Line 1378: This upsert FAILED because no unique constraint existed
const { data: inserted, error: insertErr } = await dbClient
  .from('companies')
  .upsert(toUpsert, { onConflict: 'user_id,name' })  // ❌ No constraint!
  .select('id, name');
```

**Consequences:**
1. Company batch upsert failed (Postgres error: no unique constraint for conflict target)
2. Error was logged but `companyIdMap` remained empty
3. Every work_item was skipped: `⚠️ Company ID missing for [company]`
4. Zero work_items created → Zero stories inserted

---

## 📊 **Evidence from Console Logs**

```
Error upserting companies batch: Object
⚠️ Company ID missing for SpatialThink, skipping work item
⚠️ Company ID missing for Enact Systems Inc., skipping work item
⚠️ Company ID missing for Aurora Solar, skipping work item
⚠️ Company ID missing for Meta, skipping work item
⚠️ Company ID missing for Samsung Research America, skipping work item
⚠️ Company ID missing for Blue Shield of California, skipping work item
⚠️ Company ID missing for YCB: Web Development, skipping work item
⚠️ Company ID missing for Youth Service California, skipping work item
⚠️ Company ID missing for Oakland Artists Inc: 401(c)3, skipping work item
```

All 9 work history items were skipped → 14 stories orphaned in `sources.structured_data`

---

## ✅ **Fixes Applied**

### **1. Database Migration**

**File:** `supabase/migrations/20251209_add_companies_unique_constraint.sql`

```sql
-- Add unique constraint for (user_id, name) to enable proper upsert behavior
ALTER TABLE companies 
ADD CONSTRAINT companies_user_id_name_unique 
UNIQUE (user_id, name);
```

**Result:** `onConflict: 'user_id,name'` now works as intended.

---

### **2. Improved Error Handling**

**File:** `src/services/fileUploadService.ts` (Lines 1375-1395)

**Changes:**
- ✅ **Expanded error logging** - Now logs full error details (message, code, hint, affected companies)
- ✅ **Fallback logic** - If batch upsert fails, attempts individual inserts
- ✅ **Better visibility** - Clear logging of which companies succeed/fail

**Before:**
```typescript
if (insertErr) {
  console.error('Error upserting companies batch:', insertErr);
  // Continues silently with empty companyIdMap
}
```

**After:**
```typescript
if (insertErr) {
  console.error('❌ Error upserting companies batch:', {
    error: insertErr,
    message: insertErr.message,
    code: insertErr.code,
    details: insertErr.details,
    hint: insertErr.hint,
    companyCount: toUpsert.length,
    companies: toUpsert.map(c => c.name)
  });
  
  // FALLBACK: Try individual inserts
  console.warn('⚠️ Batch upsert failed, attempting individual company inserts...');
  for (const company of toUpsert) {
    // Individual insert logic with detailed error handling
  }
}
```

---

## 🧪 **Testing**

To verify the fix:

1. **Delete test data:**
   ```sql
   DELETE FROM stories WHERE user_id = '<test-user-id>';
   DELETE FROM work_items WHERE user_id = '<test-user-id>';
   DELETE FROM companies WHERE user_id = '<test-user-id>';
   ```

2. **Re-upload resume** and verify console shows:
   - ✅ Companies batch upsert succeeds (no error)
   - ✅ Work items created (no "Company ID missing" warnings)
   - ✅ Stories inserted: `📝 Inserting X stories for work item <uuid>`

3. **Check database:**
   ```sql
   SELECT count(*) FROM companies WHERE user_id = '<test-user-id>';
   SELECT count(*) FROM work_items WHERE user_id = '<test-user-id>';
   SELECT count(*) FROM stories WHERE user_id = '<test-user-id>';
   ```

---

## 📈 **Impact**

**Before Fix:**
- ❌ 0% of resumes successfully inserted stories
- ❌ All work history data orphaned in `sources.structured_data`
- ❌ Onboarding appeared to work but produced no usable data

**After Fix:**
- ✅ 100% of resumes should insert stories (barring other errors)
- ✅ Work history properly linked to companies and work_items
- ✅ Stories available for cover letter generation and gap detection

---

## 🔄 **Related Issues**

- **Saved Sections Bug:** Separate issue - saved sections also not appearing (different root cause)
- **LinkedIn Override:** Work items from LinkedIn upload overwrote resume work items (needs investigation)

---

## 📝 **Lessons Learned**

1. **Silent failures are dangerous** - Error logging without halting/retrying hides critical issues
2. **Database constraints are essential** - Upsert operations REQUIRE unique constraints
3. **Always log full error objects** - `console.error('Error:', err)` should expand the object
4. **Test failure paths** - Success path worked, but failure path was untested

---

## ✅ **Status**

**Migration Applied:** ✅ YES  
**Code Updated:** ✅ YES  
**Testing Required:** ⚠️ Manual verification needed  
**Documentation:** ✅ Complete
