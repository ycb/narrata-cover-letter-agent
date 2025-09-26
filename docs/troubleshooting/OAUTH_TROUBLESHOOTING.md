# OAuth Troubleshooting Guide

## Current Issue
OAuth flow completes but session is immediately lost (`SIGNED_OUT` event).

## Root Cause
The OAuth redirect URL configuration in Supabase is incorrect.

## Solution

### 1. Update Supabase Redirect URLs

In your Supabase Dashboard → Authentication → URL Configuration:

**Site URL**: `http://localhost:8080`

**Redirect URLs** (add these exact URLs):
- `http://localhost:8080/dashboard`
- `http://localhost:8080/**` (wildcard for all routes)

### 2. Verify OAuth Provider Settings

**Google OAuth**:
- Client ID: Your Google Client ID
- Client Secret: `no-secret-needed` (placeholder for PKCE)
- Redirect URI: `https://your-project.supabase.co/auth/v1/callback`

**LinkedIn OAuth**:
- Client ID: Your LinkedIn Client ID
- Client Secret: Your LinkedIn Client Secret
- Redirect URI: `https://your-project.supabase.co/auth/v1/callback`

### 3. Test the Flow

1. Clear browser cache and cookies
2. Open browser console
3. Click "Continue with Google"
4. Complete OAuth
5. Check console for:
   - `Auth state change: SIGNED_IN user@example.com`
   - `Loading profile for user: [user-id]`
   - `ProtectedRoute check: { user: "user@example.com", ... }`

## Expected Flow

1. User clicks OAuth button
2. Redirected to Google/LinkedIn
3. Google/LinkedIn → `https://your-project.supabase.co/auth/v1/callback`
4. Supabase processes OAuth → redirects to `http://localhost:8080/dashboard`
5. User lands on dashboard with active session

## Common Issues

### Issue: Session lost immediately
**Cause**: Incorrect redirect URL configuration
**Fix**: Update Supabase redirect URLs as shown above

### Issue: "Invalid redirect URI" error
**Cause**: OAuth provider redirect URI doesn't match Supabase callback
**Fix**: Ensure OAuth provider uses `https://your-project.supabase.co/auth/v1/callback`

### Issue: User redirected to login after OAuth
**Cause**: Session not persisting or RLS issues
**Fix**: Check Supabase client configuration and RLS policies

## Debug Steps

1. Check browser console for auth state changes
2. Verify Supabase redirect URLs are correct
3. Ensure OAuth provider redirect URI matches Supabase callback
4. Check if user profile is being created in database
5. Verify RLS policies allow user access
