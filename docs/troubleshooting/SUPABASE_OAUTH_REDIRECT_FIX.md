# Supabase OAuth Redirect URL Fix

## Issue
The OAuth callback was failing because the redirect URL was set to Supabase's default callback URL instead of our frontend URL.

## Solution
Updated the OAuth configuration to use Supabase's built-in callback handling.

## Changes Made

### 1. Updated OAuth Redirect URLs
- **Before**: `http://localhost:8080/auth/callback`
- **After**: `http://localhost:8080/dashboard`

### 2. Removed Custom AuthCallback Route
- Removed `/auth/callback` route from App.tsx
- Removed AuthCallback component import
- Supabase now handles the OAuth callback internally

## Supabase Dashboard Configuration

### Required Redirect URLs
In your Supabase Dashboard → Authentication → URL Configuration:

**Site URL**: `http://localhost:8080`

**Redirect URLs** (add both):
- `http://localhost:8080/dashboard`
- `http://localhost:8080/**` (wildcard for all routes)

### OAuth Provider Settings
Ensure your OAuth providers (Google, LinkedIn) are configured with:

**Google OAuth**:
- Client ID: Your Google Client ID
- Client Secret: `no-secret-needed` (placeholder for PKCE)

**LinkedIn OAuth**:
- Client ID: Your LinkedIn Client ID  
- Client Secret: Your LinkedIn Client Secret

## How It Works Now

1. User clicks "Continue with Google"
2. Redirected to Google OAuth
3. Google redirects to Supabase callback: `https://your-project.supabase.co/auth/v1/callback`
4. Supabase processes the OAuth response
5. Supabase redirects to: `http://localhost:8080/dashboard`
6. User lands on dashboard with active session

## Testing

1. Clear browser cache and cookies
2. Click "Continue with Google" or "Continue with LinkedIn"
3. Complete OAuth flow
4. Should redirect to dashboard with active session

## Benefits

- ✅ Uses Supabase's built-in OAuth handling
- ✅ More reliable than custom callback
- ✅ Automatic session management
- ✅ Better error handling
- ✅ Works with all OAuth providers
