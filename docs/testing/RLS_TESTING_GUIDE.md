# 🔒 RLS Policy Testing Guide

## **Overview**
This guide will help you verify that Row-Level Security (RLS) policies are working correctly in your Supabase database, ensuring user data isolation.

## **🧪 Testing Methods**

### **Method 1: Using the RLS Test Panel (Recommended)**
1. **Sign in** to your application
2. **Go to Dashboard** (`/dashboard`)
3. **Click "Show RLS Tests"** button
4. **Click "Run All Tests"** to execute automated tests
5. **Review results** for each test category

### **Method 2: Manual Testing in Browser Console**
1. **Open browser console** (F12 → Console)
2. **Run**: `await testRLSPolicies()`
3. **Review console output** for test results

### **Method 3: Manual Database Testing**
Use Supabase dashboard to manually verify policies.

## **📋 Test Scenarios**

### **Test 1: Data Isolation**
**Goal**: Verify users can only see their own data

**Steps**:
1. Create account with User A
2. Create some test data (companies, work items)
3. Sign out
4. Create account with User B
5. Verify User B cannot see User A's data

**Expected Result**: Each user sees only their own data

### **Test 2: Direct Access Prevention**
**Goal**: Verify users cannot access data by ID without ownership

**Steps**:
1. User A creates a company
2. User B tries to access User A's company by ID
3. Verify access is blocked

**Expected Result**: User B gets "row not found" or permission error

### **Test 3: CRUD Operations**
**Goal**: Verify users can only modify their own data

**Steps**:
1. User A creates, reads, updates, deletes their data
2. User B tries to modify User A's data
3. Verify operations are blocked

**Expected Result**: User B cannot modify User A's data

## **🔍 Manual Verification Steps**

### **Step 1: Check RLS Policies in Supabase**
1. Go to **Authentication > Policies** in Supabase dashboard
2. Verify RLS is enabled on all tables:
   - ✅ `profiles`
   - ✅ `companies`
   - ✅ `work_items`
   - ✅ `approved_content`
   - ✅ `external_links`
   - ✅ `job_descriptions`
   - ✅ `cover_letter_templates`
   - ✅ `cover_letters`

### **Step 2: Verify Policy Content**
Each table should have these policies:
- **SELECT**: `auth.uid() = user_id`
- **INSERT**: `auth.uid() = user_id`
- **UPDATE**: `auth.uid() = user_id`
- **DELETE**: `auth.uid() = user_id`

### **Step 3: Test with SQL Editor**
1. Go to **SQL Editor** in Supabase
2. **Switch to different users** and run queries
3. Verify data isolation

## **🚨 Common RLS Issues & Solutions**

### **Issue 1: "RLS policy violation"**
**Cause**: Policy not properly applied
**Solution**: Check policy syntax and ensure RLS is enabled

### **Issue 2: "Row not found" for own data**
**Cause**: Policy too restrictive
**Solution**: Verify policy allows `auth.uid() = user_id`

### **Issue 3: User can see other users' data**
**Cause**: Policy missing or incorrect
**Solution**: Add/update SELECT policy with user isolation

### **Issue 4: Cannot insert/update data**
**Cause**: INSERT/UPDATE policy missing
**Solution**: Add policies for all CRUD operations

## **✅ Success Criteria**

Your RLS policies are working correctly when:

1. **User A** can only see their own data
2. **User B** can only see their own data
3. **No data overlap** between users
4. **CRUD operations** respect user ownership
5. **Direct ID access** is blocked for unauthorized users
6. **All tables** have RLS enabled with proper policies

## **🧪 Quick Test Commands**

### **In Browser Console (after signing in)**:
```javascript
// Test data isolation
const { data } = await supabase.from('companies').select('*')
console.log('Companies visible:', data?.length)

// Test creating data
const { data: newCompany } = await supabase
  .from('companies')
  .insert({
    name: 'Test Company',
    description: 'RLS Test',
    tags: ['test'],
    user_id: (await supabase.auth.getUser()).data.user?.id
  })
  .select()
  .single()

console.log('Created company:', newCompany)
```

### **In Supabase SQL Editor**:
```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## **🎯 What to Look For**

### **✅ Good Signs**:
- Users can only see their own data
- No permission errors for own data
- Clear error messages for unauthorized access
- RLS enabled on all tables
- Policies applied correctly

### **❌ Red Flags**:
- Users can see other users' data
- Permission errors for own data
- No error messages for unauthorized access
- RLS disabled on any table
- Missing policies

## **🔧 Troubleshooting**

### **If RLS Tests Fail**:
1. **Check Supabase dashboard** for policy status
2. **Verify environment variables** are correct
3. **Check browser console** for detailed error messages
4. **Review policy syntax** in migration file
5. **Ensure user is authenticated** before testing

### **If Manual Tests Fail**:
1. **Verify user authentication** status
2. **Check database connection** in Supabase
3. **Review policy definitions** for typos
4. **Test with simple queries** first
5. **Check user ID matching** in policies

## **📞 Next Steps**

After successful RLS testing:

1. **Document any issues** found
2. **Verify all tables** have proper policies
3. **Test edge cases** (deleted users, etc.)
4. **Move to next feature** (LinkedIn OAuth, resume upload)
5. **Set up monitoring** for policy violations

---

**Remember**: RLS is your first line of defense for data security. Proper testing ensures your users' data remains isolated and secure! 🔒
