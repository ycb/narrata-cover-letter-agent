# LinkedIn Scraping Feature Flag

## Overview
All LinkedIn scraping/enrichment functionality is gated behind a feature flag: `ENABLE_LI_SCRAPING`.

## Environment Variables
```bash
# Client-side (Vite)
VITE_ENABLE_LI_SCRAPING=false

# Server-side (Supabase Edge Functions)
ENABLE_LI_SCRAPING=false
```

**Default**: `false` (disabled)

## What's Gated

### Client (`useFileUpload.ts`)
- **Function**: `connectLinkedIn()`
- **Behavior when disabled**:
  - Validates LinkedIn URL format
  - Skips all Apify API calls
  - Emits progress event: "LinkedIn scraping disabled - URL saved"
  - Returns success without creating source record
  - Progress bar advances to 100%

### UI (`NewUserOnboarding.tsx`)
- **Component**: `FileUploadCard` (LinkedIn)
- **Behavior when disabled**:
  - Shows warning message: "⚠️ LinkedIn enrichment temporarily disabled - URL validation only"
  - Still accepts LinkedIn URL input
  - Marks task as completed (not failed)
  - Auto-advances to next step

### Edge Function (`appify-proxy/index.ts`)
- **Endpoint**: `/functions/v1/appify-proxy`
- **Behavior when disabled**:
  - Returns early with: `{ success: false, error: "LinkedIn scraping disabled", disabled: true }`
  - Status: 200 (not 500)
  - No Apify Actor calls
  - No database writes

## What's NOT Done When Disabled

❌ No Apify API calls  
❌ No PDL fallback  
❌ No LinkedIn data scraping  
❌ No `work_items` generation from LinkedIn  
❌ No `sources` table writes for LinkedIn  
❌ No story extraction from LinkedIn work history  

## Testing Checklist

### With Flag OFF (`ENABLE_LI_SCRAPING=false`)
- [ ] Upload resume + cover letter
- [ ] Enter LinkedIn URL
- [ ] Click "Connect"
- [ ] Progress bar advances to 100%
- [ ] Auto-advances to review step
- [ ] No Apify API calls in network tab
- [ ] No CORS errors
- [ ] LinkedIn task marked "disabled" (not failed)
- [ ] UI shows "temporarily disabled" message

### With Flag ON (`ENABLE_LI_SCRAPING=true`)
- [ ] Upload resume + cover letter
- [ ] Enter LinkedIn URL
- [ ] Click "Connect"
- [ ] Apify proxy called
- [ ] LinkedIn data scraped (if Actor works)
- [ ] `sources` table updated
- [ ] Progress reflects actual completion

## Why Disabled?

1. **Apify Free Plan**: Blocks API access for `dev_fusion/linkedin-profile-scraper`
2. **Custom Actor Incomplete**: Our `highvoltag3-owner/linkedin-scraper` doesn't extract full work history (LinkedIn hides data from unauthenticated users)
3. **Production Not Ready**: Feature needs paid Apify plan or alternative solution

## Reactivation Plan

To enable:
1. Choose approach:
   - **Option A**: Upgrade Apify to paid plan ($49/mo) to use `dev_fusion` Actor via API
   - **Option B**: Improve custom Actor with cookie authentication
   - **Option C**: Switch to alternative LinkedIn scraper (RapidAPI, ScraperAPI, etc.)
2. Set env vars: `ENABLE_LI_SCRAPING=true` and `VITE_ENABLE_LI_SCRAPING=true`
3. Deploy edge function with flag enabled
4. Test end-to-end flow

## Files Modified
- `src/lib/flags.ts` - Added `isLinkedInScrapingEnabled()`
- `src/hooks/useFileUpload.ts` - Gated `connectLinkedIn()`
- `src/pages/NewUserOnboarding.tsx` - Added UI messaging
- `supabase/functions/appify-proxy/index.ts` - Early return when disabled
- `docs/backlog/HIDDEN_FEATURES.md` - Documented feature flag
- `.env` - Added flag (default: false)
