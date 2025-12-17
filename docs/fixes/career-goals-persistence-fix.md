# Career Goals Persistence Fix

**Date:** 2024-12-17  
**Issue:** Changes to career goals (removing target job titles) were not persisting after save

---

## Problem Description

When users removed items from their career goals (specifically target job titles) and clicked Save, the changes would appear to save successfully. However, upon reopening the Career Goals modal, the removed items would reappear.

### User Report
> "Changes I make (and save) to my goals are not persisting. I keep removing the first two items here, only to have them reappear."

---

## Root Cause

The `UserGoalsModal` component had a `useEffect` hook with `initialGoals` as a dependency:

```typescript
useEffect(() => {
  if (initialGoals) {
    setFormData({
      targetTitles: initialGoals.targetTitles,
      // ... other fields
    });
  }
}, [initialGoals]); // ❌ Problem: depends on initialGoals
```

### The Bug Flow

1. User opens modal with goals: `["Advance in AI-driven product leadership", "Focus on healthtech innovations", "Group Product Manager", ...]`
2. User removes first two items
3. User clicks Save
4. Modal closes, data saves to database successfully ✅
5. `UserGoalsContext` reloads goals from database
6. The reloaded goals object has a **different reference** in memory
7. This triggers the `useEffect` in `UserGoalsModal` (even though modal is closed)
8. When user reopens modal, the form data has been reset to stale/cached `initialGoals`

### Why This Happened

- React's `useEffect` runs whenever any dependency changes
- The `goals` object from context gets recreated when data reloads
- Even though the modal was closed, the component wasn't unmounted
- The effect would run with stale `initialGoals` still in memory
- Next time the modal opened, it showed the old data

---

## Solution

Changed the `useEffect` dependency from `[initialGoals]` to `[isOpen]`:

```typescript
useEffect(() => {
  if (isOpen && initialGoals) {
    setFormData({
      targetTitles: initialGoals.targetTitles,
      // ... other fields
    });
  }
}, [isOpen]); // ✅ Only load when modal opens
```

### Why This Works

- Form data only loads when `isOpen` changes from `false` to `true`
- Changes to `initialGoals` object reference no longer trigger form reset
- Modal always loads the **current** goals from context when it opens
- User edits are preserved until Save is clicked

---

## Files Changed

- `src/components/user-goals/UserGoalsModal.tsx`
  - Updated `useEffect` dependency from `[initialGoals]` to `[isOpen]`
  - Added comment explaining the fix

---

## Testing

### Manual Test Steps

1. Open Career Goals modal
2. Note the current target job titles
3. Remove one or more titles by clicking the X button
4. Click "Save Goals"
5. Wait for save confirmation
6. Reopen Career Goals modal
7. **Verify:** Removed titles should NOT reappear

### Expected Behavior

- ✅ Removed items stay removed
- ✅ Added items persist
- ✅ All changes save correctly to database
- ✅ Modal always shows current state from database

---

## Related Issues

This fix is similar to the issue documented in `docs/implementation/USERGOALS_CONTEXT_FIX.md` which addressed:
- Legacy array format in database
- Missing validation on localStorage load
- Race conditions in `hasGoals` check

Both issues involved stale data and improper dependency management in React hooks.

---

## Prevention

**Best Practices for Modal Forms:**

1. **Load data only when modal opens:**
   ```typescript
   useEffect(() => {
     if (isOpen) {
       // Load initial data
     }
   }, [isOpen]);
   ```

2. **Don't depend on prop objects that get recreated:**
   - Avoid `[initialData]` as dependency
   - Use `[isOpen]` or specific primitive values

3. **Reset form on close if needed:**
   ```typescript
   useEffect(() => {
     if (!isOpen) {
       // Optionally reset form
     }
   }, [isOpen]);
   ```

4. **Consider using `useRef` for initial data:**
   - Store initial data in ref on mount
   - Prevents re-initialization on prop changes

---

## Verification

The fix has been applied and tested. Users should now be able to:
- Remove any target job titles
- Add custom titles
- Modify all goal fields
- Have all changes persist correctly after save

