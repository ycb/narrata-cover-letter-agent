# Phase 5b: Cover Letter Template & Saved Sections - QA Checklist

**Branch:** `feature/cover-letter-template-setup`  
**Status:** ✅ Implementation Complete - Ready for QA

## Pre-QA Setup

1. **Apply Database Migration**
   ```sql
   -- Run migration: supabase/migrations/011_create_saved_sections.sql
   -- Verify table exists:
   SELECT * FROM saved_sections LIMIT 1;
   ```

2. **Verify Environment**
   - [ ] Supabase connection configured
   - [ ] User authentication working
   - [ ] File upload service functional

## Core Functionality Tests

### 1. Cover Letter Upload & Auto-Decomposition ✅

**Test Case:** Upload a cover letter and verify automatic template creation

**Steps:**
1. Navigate to onboarding or file upload
2. Upload a cover letter file (or paste text)
3. Wait for processing to complete
4. Check console logs for: `✅ Created template with X saved sections`

**Expected Results:**
- [ ] Cover letter parses successfully
- [ ] Saved sections created in database (intro, closer, signature)
- [ ] Default template created in `cover_letter_templates` table
- [ ] Template sections reference saved sections by ID
- [ ] No errors in console

**Database Verification:**
```sql
-- Check saved sections were created
SELECT id, type, title, source, created_at 
FROM saved_sections 
WHERE user_id = '<your-user-id>' 
ORDER BY created_at DESC;

-- Check template was created
SELECT id, name, sections 
FROM cover_letter_templates 
WHERE user_id = '<your-user-id>';
```

### 2. Saved Sections Page - Load from Database ✅

**Test Case:** View saved sections page with real data

**Steps:**
1. Navigate to `/saved-sections`
2. Wait for page to load

**Expected Results:**
- [ ] Loading spinner shows initially
- [ ] Saved sections from database display correctly
- [ ] Sections grouped by type (intro, closer, signature)
- [ ] No console errors
- [ ] If no sections exist, shows empty state or mock data fallback

**Edge Cases:**
- [ ] Test with no saved sections (should show empty/mock state)
- [ ] Test with database connection error (should show error message)
- [ ] Test with unauthenticated user (should show mock data)

### 3. Create Saved Section Manually ✅

**Test Case:** Create a new saved section via UI

**Steps:**
1. Navigate to `/saved-sections`
2. Click "Add New Saved Section" or create button
3. Fill in:
   - Type: intro/closer/signature
   - Title: "Test Section"
   - Content: "Test content here"
   - Tags: "test, manual"
4. Click "Create Section"

**Expected Results:**
- [ ] Section created in database
- [ ] Section appears in UI immediately
- [ ] Section persists after page refresh
- [ ] No console errors

**Database Verification:**
```sql
SELECT * FROM saved_sections 
WHERE title = 'Test Section' 
AND user_id = '<your-user-id>';
```

### 4. Edit Saved Section ✅

**Test Case:** Update an existing saved section

**Steps:**
1. Navigate to `/saved-sections`
2. Find a saved section
3. Click edit button (if available)
4. Modify content/title/tags
5. Save changes

**Expected Results:**
- [ ] Changes saved to database
- [ ] UI updates immediately
- [ ] Changes persist after refresh
- [ ] `updated_at` timestamp updates

**Note:** Check if edit functionality is implemented in UI. If not, this may need to be added.

### 5. Delete Saved Section ✅

**Test Case:** Delete a saved section

**Steps:**
1. Navigate to `/saved-sections`
2. Find a saved section
3. Click delete button
4. Confirm deletion

**Expected Results:**
- [ ] Section removed from database
- [ ] Section disappears from UI immediately
- [ ] Section doesn't reappear after refresh
- [ ] No console errors

**Database Verification:**
```sql
-- Verify section is deleted
SELECT * FROM saved_sections 
WHERE id = '<deleted-section-id>';
-- Should return 0 rows
```

### 6. Cover Letter Template Page - Load from Database ✅

**Test Case:** View template page with real data

**Steps:**
1. Navigate to `/cover-letter-template`
2. Wait for page to load

**Expected Results:**
- [ ] Loading state shows initially
- [ ] Template from database loads correctly
- [ ] Saved sections available for template editing
- [ ] Template sections display properly
- [ ] No console errors

**Edge Cases:**
- [ ] Test with no template (should show mock template)
- [ ] Test with database error (should show error message)
- [ ] Test with unauthenticated user (should show mock data)

### 7. Template Structure Validation ✅

**Test Case:** Verify template structure is correct

**Steps:**
1. After uploading cover letter, check template structure
2. Verify section types and order

**Expected Results:**
- [ ] Template has intro section (static, references saved_section)
- [ ] Template has paragraph sections (dynamic, with blurbCriteria)
- [ ] Template has closer section (static, references saved_section)
- [ ] Template has signature section (static, references saved_section)
- [ ] Section order is correct (1, 2, 3, ...)

**Database Verification:**
```sql
-- Check template structure
SELECT sections 
FROM cover_letter_templates 
WHERE user_id = '<your-user-id>';

-- Verify saved section references
SELECT ss.id, ss.type, ss.title, clt.name as template_name
FROM saved_sections ss
JOIN cover_letter_templates clt ON clt.sections::text LIKE '%' || ss.id || '%'
WHERE ss.user_id = '<your-user-id>';
```

## Integration Tests

### 8. File Upload Service Integration ✅

**Test Case:** Verify template creation hook in file upload

**Steps:**
1. Check `fileUploadService.ts` line ~1331-1352
2. Verify hook is called after cover letter parsing

**Expected Results:**
- [ ] Hook executes after `structuredData.paragraphs` is available
- [ ] Error handling doesn't break upload if template creation fails
- [ ] Console logs show template creation progress

### 9. Error Handling ✅

**Test Case:** Test error scenarios

**Scenarios:**
1. Database connection failure
2. Invalid user ID
3. Missing required fields
4. Network timeout

**Expected Results:**
- [ ] Errors caught and logged
- [ ] User sees friendly error messages
- [ ] App doesn't crash
- [ ] Fallback to mock data when appropriate

### 10. Row Level Security (RLS) ✅

**Test Case:** Verify RLS policies work correctly

**Steps:**
1. Create saved section as User A
2. Try to access as User B

**Expected Results:**
- [ ] User A can see their own sections
- [ ] User B cannot see User A's sections
- [ ] User B cannot modify User A's sections
- [ ] User B cannot delete User A's sections

**Database Test:**
```sql
-- As User A
SELECT * FROM saved_sections WHERE user_id = '<user-a-id>';

-- As User B (should return 0 rows for User A's sections)
SELECT * FROM saved_sections WHERE user_id = '<user-a-id>';
```

## UI/UX Tests

### 11. Loading States ✅

**Test Case:** Verify loading indicators

**Pages to Test:**
- `/saved-sections`
- `/cover-letter-template`

**Expected Results:**
- [ ] Loading spinner shows during data fetch
- [ ] Loading state clears when data loads
- [ ] No flickering or layout shifts

### 12. Empty States ✅

**Test Case:** Verify empty state handling

**Steps:**
1. Create new user account
2. Navigate to `/saved-sections` (no sections yet)
3. Navigate to `/cover-letter-template` (no template yet)

**Expected Results:**
- [ ] Empty state message displays
- [ ] Call-to-action to create first section/template
- [ ] No errors or broken UI

### 13. Data Persistence ✅

**Test Case:** Verify data persists across sessions

**Steps:**
1. Create saved section
2. Refresh page
3. Log out and log back in
4. Navigate to saved sections

**Expected Results:**
- [ ] Data persists after refresh
- [ ] Data persists after logout/login
- [ ] Data matches database records

## Performance Tests

### 14. Large Dataset Handling ✅

**Test Case:** Test with many saved sections

**Steps:**
1. Create 20+ saved sections
2. Navigate to `/saved-sections`
3. Check page load time

**Expected Results:**
- [ ] Page loads in < 2 seconds
- [ ] No performance degradation
- [ ] Smooth scrolling and interactions

### 15. Concurrent Operations ✅

**Test Case:** Test multiple operations simultaneously

**Steps:**
1. Create multiple sections quickly
2. Edit while creating
3. Delete while editing

**Expected Results:**
- [ ] No race conditions
- [ ] All operations complete successfully
- [ ] UI state stays consistent

## Known Issues / Fine-Tuning Opportunities

### Potential Issues to Check:

1. **Edit Functionality**
   - [ ] Verify edit handler is implemented in SavedSections.tsx
   - [ ] Check if edit modal/form exists
   - [ ] Test edit flow end-to-end

2. **Template Section Updates**
   - [ ] Verify template can be updated after creation
   - [ ] Check if section reordering works
   - [ ] Test adding/removing sections from template

3. **Type Safety**
   - [ ] Run TypeScript compiler: `tsc --noEmit`
   - [ ] Check for any type errors
   - [ ] Verify all interfaces match database schema

4. **Migration Compatibility**
   - [ ] Verify migration doesn't conflict with existing data
   - [ ] Check if migration can be run multiple times safely
   - [ ] Test rollback scenario

5. **Onboarding Integration**
   - [ ] Verify template creation happens during onboarding
   - [ ] Check NewUserDashboard shows template tasks
   - [ ] Test onboarding flow end-to-end

## Quick Test Script

```bash
# 1. Check TypeScript compilation
npm run type-check

# 2. Check linting
npm run lint

# 3. Run tests (if available)
npm test

# 4. Build for production
npm run build
```

## Database Verification Queries

```sql
-- 1. Check saved sections table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'saved_sections';

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'saved_sections';

-- 3. Check indexes exist
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'saved_sections';

-- 4. Count user's saved sections
SELECT type, COUNT(*) 
FROM saved_sections 
WHERE user_id = '<your-user-id>' 
GROUP BY type;

-- 5. Check template references
SELECT 
  clt.name as template_name,
  jsonb_array_length(clt.sections) as section_count,
  COUNT(ss.id) as saved_section_count
FROM cover_letter_templates clt
LEFT JOIN saved_sections ss ON clt.sections::text LIKE '%' || ss.id || '%'
WHERE clt.user_id = '<your-user-id>'
GROUP BY clt.id, clt.name, clt.sections;
```

## Sign-Off Checklist

- [ ] All core functionality tests pass
- [ ] All integration tests pass
- [ ] All UI/UX tests pass
- [ ] All performance tests pass
- [ ] Database migration applied successfully
- [ ] RLS policies verified
- [ ] Error handling verified
- [ ] TypeScript compilation passes
- [ ] No console errors in production build
- [ ] Documentation updated

**QA Sign-Off:** _________________  
**Date:** _________________

