# LinkedIn Security Checkpoint Issue

## Problem
When attempting to sign in with LinkedIn OAuth, users may encounter a security checkpoint page that loads indefinitely with the error:
```
Uncaught (in promise) TypeError: grecaptcha.render is not a function
```

## Root Cause
LinkedIn's security system sometimes requires additional verification (reCAPTCHA challenge) for:
- New devices or locations
- Unusual activity patterns
- VPN or proxy usage
- Browser fingerprinting issues

The reCAPTCHA fails to load properly in the OAuth flow, causing the page to hang.

## This is NOT a Narrata Bug
This is a LinkedIn-side issue with their security checkpoint implementation. Our OAuth integration is correct and working.

## User Solutions

### Quick Fix: Try a Different Sign-In Method
1. **Use Google OAuth**: Go back and click "Continue with Google" instead
2. **Use Email/Password**: Create an account normally, link LinkedIn later

### If You Must Use LinkedIn OAuth

#### Method 1: Clear Cache and Retry
1. Clear browser cache and cookies for `linkedin.com`
2. Close all LinkedIn tabs
3. Wait 5 minutes
4. Try the OAuth flow again in a fresh incognito window

#### Method 2: Different Browser/Device
1. Try a different browser (Chrome → Firefox, etc.)
2. Disable browser extensions (especially ad blockers, privacy tools)
3. Try from a different device if available

#### Method 3: Complete Security Challenge
1. If the reCAPTCHA eventually loads, complete it
2. LinkedIn may ask you to verify your identity via email/phone
3. After completing verification, retry the OAuth flow

#### Method 4: Wait It Out
LinkedIn's security system often auto-resolves after:
- 15-30 minutes
- Accessing LinkedIn directly from linkedin.com first
- Logging into LinkedIn's website normally, then retrying our OAuth

## Prevention

### For Users
- Log into LinkedIn's website directly before using OAuth
- Use a consistent device and network
- Avoid VPNs when using LinkedIn OAuth
- Keep your LinkedIn account in good standing

### For Developers
We've added:
- Timeout protection in OAuth callbacks
- Better error messages
- Fallback authentication methods
- User guidance when OAuth fails

## Technical Details

### The Error
```javascript
Uncaught (in promise) TypeError: grecaptcha.render is not a function
```

This occurs when LinkedIn's checkpoint page tries to render a reCAPTCHA v2 widget, but:
1. Google's reCAPTCHA script hasn't loaded yet
2. Content Security Policy blocks the script
3. Browser extensions interfere with loading
4. Network issues prevent the script from loading

### OAuth Flow
1. User clicks "Continue with LinkedIn" → ✅ Works
2. Redirect to LinkedIn OAuth → ✅ Works
3. LinkedIn detects "suspicious" activity → ⚠️ Shows checkpoint
4. Checkpoint page tries to load reCAPTCHA → ❌ Fails
5. Page hangs indefinitely → ❌ User stuck

### Why This Affects OAuth More Than Normal Login
- OAuth requests come from third-party domains
- LinkedIn's security system is more aggressive with OAuth
- The redirect flow makes it harder to complete challenges
- No session context from previous LinkedIn use

## Monitoring

### Analytics Events to Track
- `linkedin_oauth_started`
- `linkedin_oauth_checkpoint_detected`
- `linkedin_oauth_completed`
- `linkedin_oauth_abandoned`

### Metrics to Watch
- LinkedIn OAuth success rate vs. Google OAuth
- Time spent on checkpoint pages
- User fallback to email/password after failed OAuth

## Related Issues
- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-linkedin)
- [LinkedIn OAuth Known Issues](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authentication)
- [reCAPTCHA v2 Loading Issues](https://developers.google.com/recaptcha/docs/faq)

## Support Response Template

> Hi [User],
>
> Sorry you're experiencing issues with LinkedIn sign-in! This is a security checkpoint from LinkedIn (not a Narrata issue). LinkedIn sometimes requires additional verification for new devices or locations.
>
> **Quick fix**: Try signing in with Google instead - it's much more reliable!
>
> If you need to use LinkedIn:
> 1. Clear your browser cache for linkedin.com
> 2. Try in an incognito window
> 3. Or wait 15-30 minutes and retry
>
> Once you're signed in (via any method), you can link your LinkedIn account from your dashboard if needed.
>
> Let me know if you need any help!

## Future Improvements
- [ ] Add OAuth provider status indicators
- [ ] Implement OAuth timeout with automatic redirect
- [ ] Show helpful error messages when checkpoint is detected
- [ ] Add "Having trouble?" link with alternative sign-in methods
- [ ] Track OAuth success rates by provider
- [ ] Consider removing LinkedIn OAuth if success rate is too low

