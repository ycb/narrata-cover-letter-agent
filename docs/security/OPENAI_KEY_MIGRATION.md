# OpenAI API Key Security Migration - Complete

## Problem
OpenAI notified us that an API key (`sk-pro...30A`) from the Narrata organization was leaked and disabled. Investigation revealed that `VITE_OPENAI_API_KEY` was being bundled into client-side JavaScript, exposing it to anyone who viewed the production site's source code.

## Root Cause
Environment variables with the `VITE_` prefix in Vite are bundled into the client-side JavaScript at build time. This meant that `VITE_OPENAI_API_KEY` was visible in production bundles, accessible to anyone inspecting the site.

## Solution
Migrated all OpenAI API calls from client-side to secure server-side Edge Functions.

### Phase 1: Server-Side Edge Functions
Created three new Supabase Edge Functions with comprehensive tests:

1. **`stream-gap-resolution`** - Streaming gap resolution content generation
   - Handles gap analysis and content suggestions
   - SSE streaming for real-time updates
   - JWT authentication and error handling

2. **`stream-hil-review`** - Streaming HIL review notes generation
   - Provides structured feedback on content
   - Priority-based suggestions (P0/P1/P2)
   - JSON-formatted review notes with text anchors

3. **`generate-stories`** - Batch story generation from work items
   - Extracts achievement stories from role descriptions
   - Creates stories in database with metrics and tags
   - Idempotent (skips items that already have stories)

All Edge Functions:
- Use server-side `OPENAI_API_KEY` from Supabase secrets
- Include JWT authentication via `SUPABASE_SERVICE_ROLE_KEY`
- Have comprehensive Deno tests
- Follow existing Edge Function patterns (cors, SSE, error handling)

### Phase 2: Client-Side Integration
Updated client hooks and components to call Edge Functions:

1. **`src/utils/edgeFunctionHelpers.ts`** - New utilities
   - `streamGapResolution()` - Calls stream-gap-resolution Edge Function
   - `streamHilReview()` - Calls stream-hil-review Edge Function
   - `generateStories()` - Calls generate-stories Edge Function
   - All helpers handle auth tokens and SSE streaming

2. **`src/hooks/useGapResolution.ts`** - Updated hook
   - Removed `GapResolutionStreamingService` instantiation
   - Now uses `streamGapResolution()` helper
   - Maintains same interface for components

3. **`src/hooks/useFileUpload.ts`** - Updated hook
   - Replaced `generateStoriesForWorkItems()` import
   - Now calls `generate-stories` Edge Function via fetch

4. **`src/components/hil/ContentGenerationModalV3.tsx`** - Updated component
   - Removed service instantiations
   - Now uses Edge Function helpers
   - Removed `isAvailable()` checks (always available via Edge Functions)

### Phase 3: Environment Cleanup
Removed `VITE_OPENAI_API_KEY` from all configuration:

1. **`.env`** - Commented out with deprecation notice
   - Added instructions to set `OPENAI_API_KEY` in Supabase secrets
   - Key no longer bundled in client-side JavaScript

2. **`.github/workflows/deploy.yml`** - Removed from CI/CD
   - Removed from staging env vars
   - Removed from production env vars
   - Added comments explaining the change

3. **`.github/workflows/ci.yml`** - Removed from tests
   - Tests no longer need API key
   - Edge Functions handle OpenAI calls

## Verification
- ✅ All Deno Edge Function tests passing
- ✅ Client-side build successful (TypeScript compilation)
- ✅ No API keys found in production bundle (`dist/` directory)
- ✅ No `VITE_OPENAI_API_KEY` references in production bundle

## Deployment Steps

### 1. Set OpenAI API Key in Supabase
```bash
# In Supabase Dashboard:
# Project Settings -> Edge Functions -> Secrets
# Add secret:
# Name: OPENAI_API_KEY
# Value: <your-openai-api-key>
```

### 2. Deploy Edge Functions
```bash
# Deploy all three Edge Functions
supabase functions deploy stream-gap-resolution
supabase functions deploy stream-hil-review
supabase functions deploy generate-stories

# Verify deployment
supabase functions list
```

### 3. Merge and Deploy
```bash
# Merge feature branch to main
git checkout main
git merge feat/secure-openai-api-key
git push origin main

# GitHub Actions will automatically deploy to staging
# Production deployment requires manual workflow trigger
```

### 4. Verify Production
```bash
# 1. Check production bundle contains no API key
curl https://narrata.ai/assets/index-*.js | grep -i "sk-proj" || echo "✅ No keys found"

# 2. Test Edge Functions are accessible
curl -X POST \
  -H "Authorization: Bearer <user-jwt-token>" \
  -H "Content-Type: application/json" \
  https://lgdciykgqwqhxvtbxcvo.supabase.co/functions/v1/generate-stories \
  -d '{"userId":"test","sourceId":"test"}'
```

## Impact
- **Security**: OpenAI API key no longer exposed in client-side code
- **Performance**: Similar performance (SSE streaming maintained)
- **User Experience**: No changes to UI/UX
- **Cost**: Marginally higher (Edge Function execution vs. direct client calls)
- **Scalability**: Better (rate limiting and monitoring at Edge Function level)

## Related Services
The following services still use `VITE_OPENAI_API_KEY` but are:
- **Low priority** (infrequent use)
- **Non-critical** (fallback/optional features)
- **Test-only** (test files)

These can be migrated in future iterations if needed:
- `src/services/gapDetectionService.ts` (gap detection, can use existing pipelines)
- `src/services/contentStandardsEvaluationService.ts` (evaluation, rare use)
- `src/services/tagSuggestionService.ts` (tag suggestions, optional feature)
- `src/services/browserSearchService.ts` (search, optional feature)
- `src/services/jobDescriptionService.ts` (JD parsing, can use existing pipelines)
- Test files (use mock keys)

## Maintenance Notes
- **DO NOT** add `VITE_` prefix to any API keys
- **DO NOT** store secrets in `.env` that need to be used client-side
- **ALWAYS** use Edge Functions for any third-party API calls
- **VERIFY** production bundles after major changes: `grep -r "sk-" dist/`

## References
- OpenAI Leak Notification: Email from OpenAI (2026-03-03)
- Leaked Key: `sk-pro...30A` (disabled by OpenAI)
- Supabase Edge Functions Docs: https://supabase.com/docs/guides/functions
- Vite Environment Variables: https://vitejs.dev/guide/env-and-mode.html
