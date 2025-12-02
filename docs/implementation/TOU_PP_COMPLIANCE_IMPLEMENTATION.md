# Terms of Service & Privacy Policy Compliance Implementation
**Date**: December 1, 2025  
**Status**: ✅ Complete

---

## Overview

Implemented required Terms of Service (TOU) and Privacy Policy (PP) opt-in compliance for new user signups, including:
- Database tracking of acceptance timestamps
- Auth flow integration to record acceptance
- UI updates with proper linking
- Navigation improvements for existing users

---

## Changes Made

### 1. Database Migration
**File**: `supabase/migrations/20251201_add_terms_acceptance.sql`

Added two new columns to the `profiles` table:
- `terms_accepted_at` (TIMESTAMP WITH TIME ZONE) - Records when user accepted TOU
- `privacy_accepted_at` (TIMESTAMP WITH TIME ZONE) - Records when user accepted PP

**Features**:
- Indexed for compliance queries
- Documented with SQL comments
- Nullable (existing users not affected)

---

### 2. Authentication Context
**File**: `src/contexts/AuthContext.tsx`

**Updated signUp Function**:
- Added `acceptedTerms` parameter (boolean, optional)
- Records acceptance timestamp in database when `acceptedTerms === true`
- Logs acceptance event to console
- Graceful error handling (signup not blocked if logging fails)

**Signature Change**:
```typescript
// Before
signUp: (email: string, password: string, fullName?: string)

// After  
signUp: (email: string, password: string, fullName?: string, acceptedTerms?: boolean)
```

**Logging Logic**:
```typescript
if (acceptedTerms && data.user.id) {
  const now = new Date().toISOString()
  await supabase
    .from('profiles')
    .update({
      terms_accepted_at: now,
      privacy_accepted_at: now,
    })
    .eq('id', data.user.id)
}
```

---

### 3. SignUp Page
**File**: `src/pages/SignUp.tsx`

**Changes**:
1. **Pass terms acceptance to signUp function**:
   - `signUp(email, password, fullName, formData.agreeTerms)`
   
2. **Added "Sign In" link in header**:
   - Top-right navigation for existing users
   - Routes to `/signin`
   - Balanced layout with logo in center

3. **Terms checkbox already existed**:
   - Links to `/terms` and `/privacy` (already working)
   - Form validation prevents submission without checkbox

---

### 4. SignIn Page  
**File**: `src/pages/SignIn.tsx`

**Changes**:
1. **Added "Get Started" link in header**:
   - Top-right navigation for new users
   - Routes to `/signup`
   - Balanced layout with logo in center

2. **Fixed subtitle typo**:
   - Before: " to your narrative engine" (missing word)
   - After: "Welcome back to your narrative engine"

---

### 5. Routing
**File**: `src/App.tsx`

**Added route aliases** for convenience:
- `/terms` → `<TermsOfService />` (alias for `/terms-of-service`)
- `/privacy` → `<PrivacyPolicy />` (alias for `/privacy-policy`)

**Backwards compatibility**: Original routes still work

---

## User Flow

### New User Signup (Email)
1. Navigate to `/signup`
2. Fill out form (first name, last name, email, password)
3. **Check "I agree to Terms and Privacy Policy" checkbox** (REQUIRED)
4. Click "Create Account"
5. **System records**:
   - User created in `auth.users`
   - Profile created in `profiles` table
   - `terms_accepted_at` and `privacy_accepted_at` set to current timestamp
6. User redirected to `/dashboard`

### New User Signup (OAuth - Google/LinkedIn)
**Note**: OAuth users bypass the checkbox. We should add a post-OAuth acceptance flow.

**Current behavior**:
- User clicks "Continue with Google" or "Continue with LinkedIn"
- Redirected to OAuth provider
- After approval, redirected back to Narrata
- Automatically signed in
- **No terms acceptance recorded** ⚠️

**Recommended follow-up**: Add terms acceptance modal after first OAuth login

---

## Compliance Status

### ✅ Implemented
- [x] Terms and Privacy Policy pages exist (`/terms-of-service`, `/privacy-policy`)
- [x] Checkbox on signup form requires agreement
- [x] Acceptance timestamp logged to database
- [x] Links to TOU/PP functional
- [x] Database indexed for compliance queries
- [x] Form validation prevents signup without agreement

### ⚠️ Gaps (Future Work)
- [ ] OAuth users (Google, LinkedIn) do not accept terms during signup
- [ ] No opt-in tracking for magic link signups
- [ ] No re-acceptance flow if TOU/PP updated
- [ ] No admin dashboard to view compliance records

---

## Database Queries for Compliance

### Check if user accepted terms
```sql
SELECT 
  id, 
  email, 
  terms_accepted_at, 
  privacy_accepted_at
FROM profiles
WHERE id = '<user_id>';
```

### Find users who haven't accepted terms
```sql
SELECT 
  id, 
  email, 
  created_at
FROM profiles
WHERE terms_accepted_at IS NULL
OR privacy_accepted_at IS NULL;
```

### Count acceptance by date
```sql
SELECT 
  DATE(terms_accepted_at) as date,
  COUNT(*) as acceptances
FROM profiles
WHERE terms_accepted_at IS NOT NULL
GROUP BY DATE(terms_accepted_at)
ORDER BY date DESC;
```

---

## Testing Checklist

### Manual Testing
- [x] Signup form validation (checkbox required)
- [x] Terms link opens `/terms-of-service`
- [x] Privacy link opens `/privacy-policy`
- [x] Acceptance logged to database after signup
- [x] "Sign In" link on signup page works
- [x] "Get Started" link on signin page works
- [ ] OAuth signup flow (needs follow-up acceptance)

### Database Testing
```sql
-- Run migration
psql -h localhost -U postgres -d narrata -f supabase/migrations/20251201_add_terms_acceptance.sql

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('terms_accepted_at', 'privacy_accepted_at');

-- Verify index exists
SELECT indexname FROM pg_indexes 
WHERE tablename = 'profiles' 
AND indexname = 'idx_profiles_terms_accepted';
```

---

## Follow-Up Work (Recommended)

### Priority 1: OAuth Terms Acceptance
**Issue**: Users signing up with Google/LinkedIn bypass terms checkbox

**Solution**: Add post-OAuth acceptance modal
1. Check if `terms_accepted_at IS NULL` after OAuth login
2. Show modal with TOU/PP links and checkbox
3. Block dashboard access until accepted
4. Log acceptance timestamp

### Priority 2: Terms Update Notification
**Issue**: No way to notify users when TOU/PP updated

**Solution**: Add terms version tracking
1. Add `terms_version` and `privacy_version` columns to `profiles`
2. Add `current_terms_version` to app config
3. Show banner if user's accepted version < current version
4. Require re-acceptance for continued use

### Priority 3: Admin Compliance Dashboard
**Issue**: No UI to view compliance records

**Solution**: Add admin page showing:
- Total users with/without acceptance
- Acceptance timeline chart
- Export CSV for legal audit

---

## Files Modified

```
/supabase/migrations/20251201_add_terms_acceptance.sql  (NEW)
/src/contexts/AuthContext.tsx                           (MODIFIED)
/src/pages/SignUp.tsx                                   (MODIFIED)
/src/pages/SignIn.tsx                                   (MODIFIED)
/src/App.tsx                                            (MODIFIED)
/docs/implementation/TOU_PP_COMPLIANCE_IMPLEMENTATION.md (NEW)
```

---

## Screenshots

### SignUp Page - Before
- No "Sign In" link for existing users
- Terms checkbox present but not logged

### SignUp Page - After
- ✅ "Sign In" link in top-right
- ✅ Terms acceptance logged to database
- ✅ Links to `/terms` and `/privacy` functional

### SignIn Page - Before
- Typo: " to your narrative engine"
- No "Get Started" link for new users

### SignIn Page - After
- ✅ Fixed: "Welcome back to your narrative engine"
- ✅ "Get Started" link in top-right

---

## Legal Notes

**Disclaimer**: This implementation provides technical compliance infrastructure but does not constitute legal advice. Consult with legal counsel to ensure:
- TOU and PP content meet regulatory requirements (GDPR, CCPA, etc.)
- Acceptance mechanism is legally binding
- Record retention policies comply with jurisdiction
- Cookie consent is handled separately (if applicable)

---

**Implementation Complete**: December 1, 2025  
**Tested**: Manual testing only (no automated tests yet)  
**Ready for QA**: Yes  
**Ready for Production**: Yes (with noted OAuth gap)

