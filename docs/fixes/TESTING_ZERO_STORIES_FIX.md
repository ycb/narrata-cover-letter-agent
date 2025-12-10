# Testing the Zero Stories Bug Fix

## 🎯 **Pre-Test Setup**

Before testing, clean up the test user's data to ensure a fresh start:

```sql
-- Replace with your actual user ID
DELETE FROM stories WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM work_items WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM companies WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
DELETE FROM sources WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
```

---

## ✅ **Test 1: Resume Upload - Happy Path**

### **Steps:**
1. Open the app in browser with DevTools console open
2. Upload `Peter Spannagle Resume.pdf`
3. Wait for processing to complete

### **Expected Console Logs:**

```javascript
✅ Success indicators:
- "🔍 DEBUG: Sample workHistory item" → hasStories: true, storiesCount: 2+
- "processStructuredData START"
- "Processing structured data into work_items"
- "📝 Inserting X stories for work item <uuid>" → Should appear multiple times

❌ Should NOT see:
- "Error upserting companies batch"
- "⚠️ Company ID missing for [company]"
```

### **Expected Database Results:**

```sql
-- Should return counts > 0
SELECT count(*) as companies FROM companies WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
SELECT count(*) as work_items FROM work_items WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';
SELECT count(*) as stories FROM stories WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';

-- Verify story details
SELECT 
  w.title as work_item_title,
  count(s.id) as story_count
FROM work_items w
LEFT JOIN stories s ON s.work_item_id = w.id
WHERE w.user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
GROUP BY w.id, w.title
ORDER BY w.start_date DESC;
```

**Expected:**
- Companies: ~9
- Work items: ~9
- Stories: ~14-16
- Every work item should have at least 1 story

---

## 🔧 **Test 2: Error Handling - Batch Upsert Failure**

To test the fallback logic, temporarily break the batch upsert:

### **Setup:**
Comment out the unique constraint temporarily:
```sql
ALTER TABLE companies DROP CONSTRAINT companies_user_id_name_unique;
```

### **Steps:**
1. Upload resume again
2. Check console for fallback behavior

### **Expected Console Logs:**

```javascript
❌ Error upserting companies batch: {
  error: ...,
  message: "...",
  companies: ["SpatialThink", "Enact Systems Inc.", ...]
}
⚠️ Batch upsert failed, attempting individual company inserts...
✅ Individual upsert succeeded for "SpatialThink"
✅ Individual upsert succeeded for "Enact Systems Inc."
...
```

### **Cleanup:**
Restore the constraint:
```sql
ALTER TABLE companies 
ADD CONSTRAINT companies_user_id_name_unique 
UNIQUE (user_id, name);
```

---

## 🔄 **Test 3: LinkedIn Override Prevention**

### **Steps:**
1. Upload resume first (verify stories inserted)
2. Upload LinkedIn profile second
3. Check that resume stories are preserved

### **Expected Database Results:**

```sql
-- Stories should still exist from resume
SELECT count(*) FROM stories WHERE user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30';

-- Check source_id distribution
SELECT 
  s.file_name,
  s.source_type,
  count(wi.id) as work_item_count
FROM sources s
LEFT JOIN work_items wi ON wi.source_id = s.id
WHERE s.user_id = '5d6575e8-eed6-4320-9d3b-2565cc340e30'
GROUP BY s.id, s.file_name, s.source_type
ORDER BY s.created_at;
```

**Expected:**
- Resume should have work_items with stories
- LinkedIn may add/update work_items but shouldn't delete resume stories

---

## 📋 **Test Checklist**

- [ ] Resume upload inserts companies successfully
- [ ] Resume upload creates work_items
- [ ] Resume upload inserts stories (multiple per work item)
- [ ] No "Company ID missing" warnings
- [ ] No "Error upserting companies batch" errors
- [ ] Fallback logic works if batch upsert fails
- [ ] LinkedIn upload doesn't delete resume stories
- [ ] UI displays stories in Stories tab
- [ ] Saved sections appear (separate bug - may still fail)

---

## 🚨 **If Tests Fail**

### **Scenario 1: Still seeing "Company ID missing"**

**Check:**
```sql
-- Verify constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'companies' 
  AND constraint_type = 'UNIQUE';
```

**Fix:** Re-apply migration if constraint is missing.

---

### **Scenario 2: Individual inserts failing**

**Check console for specific error details:**
- RLS policy issues?
- Data validation errors?
- Foreign key violations?

**Common issues:**
- `user_id` not set correctly
- Company name too long or contains invalid characters
- Missing required fields

---

### **Scenario 3: Stories inserted but not visible in UI**

This is a **separate bug** related to saved sections. See separate documentation.

---

## 📊 **Success Criteria**

✅ **PASS:** All companies, work items, and stories inserted with no errors  
⚠️ **PARTIAL:** Companies/work items created but some stories missing  
❌ **FAIL:** No companies/work items created, or errors in console
