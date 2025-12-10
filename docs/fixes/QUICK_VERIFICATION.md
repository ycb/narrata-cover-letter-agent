# Quick Verification Guide - Onboarding Fixes

**Use this guide to quickly verify the fixes are working.**

---

## ✅ **1-Minute Smoke Test**

### **Step 1: Upload Resume**
```bash
# Upload: Peter Spannagle Resume.pdf
# Expected console output:
✅ "🔍 DEBUG: Sample workHistory item: storiesCount: 2+"
✅ "📝 Inserting X stories for work item"
❌ Should NOT see: "Company ID missing"
```

### **Step 2: Check Database**
```sql
-- Quick counts (all should be > 0)
SELECT 
  (SELECT COUNT(*) FROM companies WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30') as companies,
  (SELECT COUNT(*) FROM work_items WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30') as work_items,
  (SELECT COUNT(*) FROM stories WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30') as stories;
```

**Expected:** All counts > 0

---

## ✅ **2-Minute Full Test**

### **Step 1: Clear Test Data**
```sql
DELETE FROM stories WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM work_items WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM companies WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM saved_sections WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM sources WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
```

### **Step 2: Upload Resume**
1. Upload `Peter Spannagle Resume.pdf`
2. Wait for completion
3. Check console for success logs

### **Step 3: Upload Cover Letter**
1. Upload `23andMe.pdf`
2. Wait for completion
3. Navigate to Saved Sections page
4. Verify sections appear

### **Step 4: Verify Database**
```sql
-- Detailed verification
SELECT 
  'companies' as table_name,
  COUNT(*) as count
FROM companies 
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'

UNION ALL

SELECT 
  'work_items',
  COUNT(*)
FROM work_items 
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'

UNION ALL

SELECT 
  'stories',
  COUNT(*)
FROM stories 
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'

UNION ALL

SELECT 
  'saved_sections',
  COUNT(*)
FROM saved_sections 
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
```

**Expected:**
```
companies      | ~9
work_items     | ~9
stories        | ~14-16
saved_sections | ~3
```

---

## 🚨 **If Tests Fail**

### **Scenario 1: "Company ID missing" still appears**

**Check constraint:**
```sql
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'companies' 
  AND constraint_type = 'UNIQUE'
  AND constraint_name = 'companies_user_id_name_unique';
```

**Fix:** Re-apply migration
```bash
supabase db reset  # or manually apply migration
```

---

### **Scenario 2: No stories inserted**

**Check console for:**
- "Error upserting companies batch"
- "Company ID missing"
- Any database errors

**Debug query:**
```sql
-- Check if companies were created
SELECT * FROM companies 
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
```

If empty, check error logs for RLS policy issues.

---

### **Scenario 3: No saved sections**

**Check console for:**
- "Converting X stories from new format"
- "Backfill: created X section(s)"

**Debug query:**
```sql
-- Check cover letter source
SELECT 
  id,
  file_name,
  structured_data ? 'stories' as has_stories,
  jsonb_array_length(COALESCE(structured_data->'stories', '[]'::jsonb)) as story_count
FROM sources
WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
  AND source_type = 'cover_letter';
```

If `has_stories` is false, check if old format exists (`structured_data->'paragraphs'`).

---

## 📋 **Console Log Checklist**

### **Expected Logs (Resume):**
```
✅ "processStructuredData START"
✅ "🔍 DEBUG: Sample workHistory item"
✅ "📝 Inserting X stories for work item" (multiple times)
✅ "processStructuredData COMPLETE"
```

### **Unexpected Logs (Resume):**
```
❌ "Error upserting companies batch"
❌ "Company ID missing for [company]"
❌ "Skipping work item"
```

### **Expected Logs (Cover Letter):**
```
✅ "Creating saved sections from X stories (new format)"
✅ (On Saved Sections page) "Backfill: Converting X stories"
✅ "Backfill: created X section(s)"
```

---

## 📊 **Success Criteria**

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| Resume upload | No errors | | ⬜ |
| Companies created | ~9 | | ⬜ |
| Work items created | ~9 | | ⬜ |
| Stories inserted | ~14-16 | | ⬜ |
| CL upload | No errors | | ⬜ |
| Saved sections | ~3 | | ⬜ |
| UI displays stories | ✓ | | ⬜ |
| UI displays sections | ✓ | | ⬜ |

**Overall Status:** ⬜ PENDING / ✅ PASS / ❌ FAIL

---

## 🔧 **Quick Fixes**

### **Reset Test User:**
```sql
-- Nuclear option - full reset
DELETE FROM saved_sections WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM stories WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM work_items WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM companies WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM sources WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
```

### **Verify Migration:**
```sql
-- Check companies constraint exists
\d companies  -- Shows table definition including constraints

-- Or via query:
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'companies'
  AND table_schema = 'public';
```

### **Force Backfill:**
```typescript
// In browser console, force saved sections backfill:
const userId = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
// Navigate to Saved Sections page - backfill should trigger automatically
```

---

## 📞 **Need Help?**

1. **Check detailed docs:**
   - `docs/fixes/ZERO_STORIES_BUG_FIX.md`
   - `docs/fixes/SAVED_SECTIONS_BUG_FIX.md`

2. **Check console for error patterns** documented in bug fix docs

3. **Run debug queries** from individual fix documents

4. **Check migration status:**
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations
   WHERE version LIKE '202512%'
   ORDER BY version DESC;
   ```
