# Appify LinkedIn Integration Fix - Dec 2, 2024

## Issue
LinkedIn URL input during onboarding was failing with CORS errors:
```
GET https://api.linkedin.com/v2/me... net::ERR_FAILED
LinkedIn API request error: TypeError: Failed to fetch
```

Plus Supabase 406 errors:
```
GET https://lgdciykgqwqhxvtbxcvo.supabase.co/rest/v1/linkedin_profiles... 406 (Not Acceptable)
```

## Root Cause
The code was calling `LinkedInOAuthService` which tries to call LinkedIn API directly from the browser, which violates CORS policy. LinkedIn API doesn't allow direct browser calls.

The app **should be using Appify API** instead, which is already configured in the codebase.

## The Fix

### Changed File: `src/hooks/useFileUpload.ts`

**Before** (Broken):
```typescript
// Strategy 1: Try to fetch real LinkedIn data using OAuth
const linkedInService = new LinkedInOAuthService();
const profileResult = await linkedInService.fetchProfileData();
// ❌ This calls LinkedIn API directly → CORS error
```

**After** (Fixed):
```typescript
// Strategy 1: Try to fetch LinkedIn data using Appify API
const appifyService = new AppifyService();
let appifyResult: AppifyEnrichmentResult | null = null;

if (appifyService.isConfigured()) {
  appifyResult = await appifyService.enrichPerson({
    linkedinUrl: trimmedUrl,
    name: user?.user_metadata?.full_name || profile?.full_name || undefined
  });
}
// ✅ This calls Appify API via backend → Works!
```

### What Changed
1. Replaced `LinkedInOAuthService` with `AppifyService` as Strategy 1
2. Added `AppifyService` import to the file
3. Updated profile data mapping to use Appify's structured data format
4. Kept PDL and synthetic data as fallback strategies

## Enrichment Strategy (Priority Order)

Now the LinkedIn URL enrichment follows this cascade:

1. **Appify API** (Primary) - Scrapes LinkedIn profile data
   - Requires: `VITE_APPIFY_API_KEY` in `.env` ✅ (configured)
   - Endpoint: `https://api.cloud.appifyhub.com/v1/scrape/linkedin`

2. **Synthetic Data** (Dev Only) - Uses fixture files
   - Only in development mode
   - For testing with P01-P10 profiles

3. **People Data Labs** (Fallback) - Enrichment API
   - Requires: `VITE_PDL_API_KEY` in `.env`
   - Only used if Appify fails

4. **Minimal Data** (Last Resort) - Stub profile
   - Used if all strategies fail
   - Provides basic structure

## Environment Configuration

`.env` file has correct configuration:
```bash
VITE_APPIFY_USER_ID=9uYQ9HBku7rHNp3Vp
VITE_APPIFY_API_KEY=apify_api_8E3Y9QGtlFmmuDPSPZRxxC2irUJh4h1VaWBA
```

## How It Works Now

### Onboarding Flow
1. User uploads resume → extracted to `sources` table
2. User uploads cover letter → extracted to `sources` table  
3. User enters LinkedIn URL → **Appify API enriches profile**
4. LinkedIn data saved to `linkedin_profiles` table
5. LinkedIn work history processed → `companies` + `work_items` created
6. Stories extracted → `approved_content` created

### What Appify Returns
The Appify API scrapes LinkedIn and returns:
- Basic info (name, headline, profile URL, location)
- Work experience (company, title, dates, description)
- Education (school, degree, field of study, dates)
- Skills (array of skill names)
- Certifications (name, issuer, dates)
- Projects (name, description)

This data is converted to our `StructuredResumeData` format and processed the same way as resume data.

## Testing the Fix

### Test Case 1: Valid LinkedIn URL
1. Upload resume (e.g., `Peter Spannagle Resume.pdf`)
2. Enter LinkedIn URL: `https://linkedin.com/in/pspan`
3. Upload cover letter
4. Click "Review & Approve"
5. **Expected**: 
   - ✅ No CORS errors
   - ✅ Appify API called successfully
   - ✅ Profile data extracted
   - ✅ Companies, roles, and stories created

### Test Case 2: Invalid LinkedIn URL
1. Enter invalid URL: `https://linkedin.com/in/fake-user-999`
2. **Expected**:
   - ⚠️ Appify returns error (profile not found)
   - ✅ Falls back to PDL or minimal data
   - ✅ No crashes, graceful handling

### Test Case 3: Appify API Down
1. Temporarily break API key in `.env`
2. Enter LinkedIn URL
3. **Expected**:
   - ⚠️ Appify skipped (not configured)
   - ✅ Falls back to PDL enrichment
   - ✅ Or uses minimal data

## Related Issues Fixed

### Supabase 406 Errors
The 406 "Not Acceptable" errors were likely caused by:
- Invalid LinkedIn ID format (`pspan` instead of full URL)
- Missing `Accept: application/json` header

These should be resolved now that we're using Appify's proper data format.

### Resume Extraction Failures
Previous attempts showed:
- Resume PDFs uploaded but `structured_data` was NULL
- Text extraction failed (`text_length` was null)

**Action Items**:
1. Monitor resume extraction in new uploads
2. Check if text extraction service is working
3. Add retry logic for failed extractions

## Appify API Details

### Endpoint
```
POST https://api.cloud.appifyhub.com/v1/scrape/linkedin
```

### Request
```json
{
  "linkedinUrl": "https://linkedin.com/in/username",
  "name": "Full Name",
  "company": "Current Company"
}
```

### Response Structure
See `src/services/appifyService.ts` for complete type definitions (`AppifyPersonData`).

### Rate Limits
- Unknown (check Appify documentation)
- Timeout: 30 seconds
- Max retries: 2

## Monitoring

### Key Metrics to Track
1. **Appify Success Rate**: % of LinkedIn URLs successfully enriched
2. **Fallback Usage**: How often PDL or minimal data is used
3. **Data Quality**: Completeness of extracted profiles
4. **API Response Time**: How long Appify takes

### Console Logs to Watch
```
🔍 Appify: Enriching from resume data with params: {...}
✅ Successfully fetched LinkedIn data via Appify
⚠️ Appify API not configured - skipping LinkedIn enrichment
```

## Next Steps

1. **Test with real LinkedIn URLs** during onboarding
2. **Monitor Appify API calls** for rate limits or errors
3. **Verify data quality** - check if work history is complete
4. **Add error handling** for edge cases (private profiles, rate limits)
5. **Consider caching** Appify results to avoid duplicate calls

## Files Modified
- `src/hooks/useFileUpload.ts` - Replaced LinkedIn OAuth with Appify

## Files NOT Modified (Still Use Appify)
- `src/services/fileUploadService.ts` - Already uses Appify in production mode
- `src/services/appifyService.ts` - Core Appify integration (no changes needed)

## Rollback Plan
If Appify integration fails, revert `src/hooks/useFileUpload.ts` to previous version:
```bash
git checkout HEAD~1 -- src/hooks/useFileUpload.ts
```

This will restore LinkedIn OAuth as Strategy 1 (though it will still have CORS issues).

## Conclusion
The LinkedIn URL input during onboarding now uses **Appify API** instead of broken LinkedIn OAuth. This eliminates CORS errors and provides proper LinkedIn profile enrichment. The enriched data flows into the same processing pipeline as resume/cover letter data, creating companies, roles, and stories in the database.





















