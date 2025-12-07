# User List Email Display Fix

**Date:** December 6, 2025  
**Status:** ✅ Completed

---

## 🎯 **Problem**

The "View as User" dropdown in admin dashboards was showing user IDs instead of emails, making it difficult to select the correct user for spoofing.

**Before:**
```
Select a user...
5d6575e8-eed6-4320-9d3b-2565cc340e30
a1b2c3d4-e5f6-7890-abcd-ef1234567890
...
```

**After:**
```
Select a user...
peter.spannagle@gmail.com
john.doe@example.com
...
```

---

## 🔧 **Solution**

### **1. Created New Admin Edge Function**

**File:** `supabase/functions/admin-list-users/index.ts`

- Uses `adminClient.auth.admin.listUsers()` to fetch users from `auth.users`
- Only service role can access this table (bypasses RLS)
- Returns: `{ users: [{ id, email, created_at }], count }`
- Sorts users by creation date (newest first)

### **2. Updated Frontend Service**

**File:** `src/services/adminService.ts`

**Before:**
```typescript
// Returned user IDs only
const uniqueUserIds = [...new Set(data.map(row => row.user_id))];
return uniqueUserIds.map(id => ({ id, email: id }));
```

**After:**
```typescript
// Calls new Edge Function
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
  { ... }
);
const result = await response.json();
return result.users || [];
```

### **3. Frontend Component**

**File:** `src/components/admin/UserSpoofSelector.tsx`

No changes needed! Already expected `{ id: string; email: string }[]` format.

```typescript
{users.map((user) => (
  <option key={user.id} value={user.id}>
    {user.email || user.id}
  </option>
))}
```

---

## 📦 **Deployment**

```bash
# Deploy new Edge Function
supabase functions deploy admin-list-users

# Frontend will pick up changes automatically (no rebuild needed)
```

---

## ✅ **Testing**

1. Navigate to `/admin/evals` (or any admin dashboard)
2. Find "View as User (Admin)" dropdown
3. Verify emails are displayed instead of UUIDs
4. Select a user and click "Spoof"
5. Verify spoofing works correctly

---

## 🔐 **Security**

- ✅ Admin-only: Requires `user_roles.role = 'admin'`
- ✅ Uses service role to access `auth.users`
- ✅ RLS bypassed safely (admin Edge Function context)
- ✅ No sensitive data exposed to non-admin users

---

## 📊 **Performance**

- **Limit:** Default 100 users, max 1000
- **Sorting:** By created_at DESC (newest first)
- **Caching:** None (always fresh data)
- **Expected response time:** < 200ms

---

## 🎉 **Result**

Admins can now easily identify users by email when using the spoofing feature for CS/troubleshooting!

