# Hidden Features Log

This is the single source of truth for all features that are hidden or disabled.
We track both feature-flagged features and commented-out code here.

## Feature Flags (Runtime Toggle via Environment Variables)

### External Links
- **Flag**: `ENABLE_EXTERNAL_LINKS` (default: off)
- **Status**: Implemented but hidden behind feature flag
- **Scope**: 
  - Links tab in Work History (`WorkHistoryDetail.tsx`, `WorkHistoryDetailTabs.tsx`)
  - "Pick Links" button in Add Story modal (`AddStoryModal.tsx`)
  - /show-all-links route and page (`App.tsx`, `ShowAllLinks.tsx`)
  - Links navigation in header (`Header.tsx` - desktop & mobile)
  - Tour auto-advance through Links tab (`WorkHistory.tsx`)
- **Files**: 7 components + 1 flag definition (`src/lib/flags.ts`)
- **Reactivate**: Set `ENABLE_EXTERNAL_LINKS=true` in environment
- **Why Hidden**: Backend and UX not production-ready

### Draft Readiness Evaluation
- **Flag**: `ENABLE_DRAFT_READINESS` (default: off)
- **Status**: Implemented, soft-launched for QA cohort
- **Scope**: Readiness metrics in cover letter drafts
- **Files**: See `docs/specs/W10_READINESS_METRIC.md`
- **Reactivate**: Set `ENABLE_DRAFT_READINESS=true` in environment
- **Why Hidden**: Beta feature for controlled rollout

### LinkedIn Scraping/Enrichment
- **Flag**: `ENABLE_LI_SCRAPING` (default: off)
- **Status**: Implemented but disabled due to Apify limitations
- **Scope**: 
  - LinkedIn URL scraping via Apify Actor (`useFileUpload.ts` - `connectLinkedIn`)
  - Apify proxy edge function (`appify-proxy/index.ts`)
  - Work history enrichment from LinkedIn profiles
  - LinkedIn auto-population in onboarding (`NewUserOnboarding.tsx`)
- **Files**: 
  - Client: `src/hooks/useFileUpload.ts`, `src/pages/NewUserOnboarding.tsx`
  - Server: `supabase/functions/appify-proxy/index.ts`
  - Flag: `src/lib/flags.ts` (`isLinkedInScrapingEnabled`)
  - Custom Actor: `apify-actors/linkedin-scraper/`
- **Reactivate**: Set `ENABLE_LI_SCRAPING=true` and `VITE_ENABLE_LI_SCRAPING=true` in environment
- **Why Hidden**: Apify free plan blocks API access; custom Actor incomplete; feature not production-ready
- **Behavior when disabled**:
  - LinkedIn URL validation only (no scraping)
  - No Apify API calls
  - No work_items/story generation from LinkedIn
  - Progress bar treats LinkedIn as "disabled" (auto-advances)
  - UI shows "LinkedIn enrichment temporarily disabled"

### Background Generic Gap Judge
- **Flag**: `ENABLE_BACKGROUND_GENERIC_GAP_JUDGE` (default: off)
- **Status**: Implemented but hidden behind feature flag
- **Scope**:
  - Post-import background job that runs an LLM batch “generic content” judge and writes additional `gaps` rows
  - Used by `FileUploadService` after resume/cover letter import
- **Files**:
  - `src/services/fileUploadService.ts` (`runBackgroundGenericGapJudge`)
  - `src/lib/flags.ts` (`isBackgroundGenericGapJudgeEnabled`)
- **Reactivate**: Set `ENABLE_BACKGROUND_GENERIC_GAP_JUDGE=true` (and optionally `VITE_ENABLE_BACKGROUND_GENERIC_GAP_JUDGE=true`)
- **Why Hidden**: Can cause post-onboarding gap totals to change asynchronously; revisit after onboarding latency/perf tuning

## Commented Code (Requires Code Changes to Reactivate)

### Job Description URL Ingestion
- **Location**: `src/components/cover-letters/CoverLetterModal.tsx:1534`
- **Status**: UI hidden, backend not implemented
- **Scope**: URL input button for remote JD fetching
- **Reactivate**: Uncomment code block after implementing remote JD fetch
- **Why Hidden**: Backend functionality doesn't exist yet
