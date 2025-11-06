# Synthetic Mode Diagnosis - Root Cause Analysis

## Issue Summary
Work History page shows "Preview Mode" (sample data) instead of real parsed data when synthetic profile is selected, even though data is visible in Evaluation Dashboard.

## Observations

### 1. Evaluation Dashboard Shows Data ✅
- 20 evaluation runs visible (P01-P10, resume + cover letter for each)
- All show "✅ Go", "✅ Accurate", "✅ Relevant"
- Data is being parsed and stored successfully

### 2. Work History Page Shows Preview Mode ❌
**Console Logs:**
```
[WorkHistory] Synthetic context: {enabled: true, currentProfile: P04, profileName: Morgan Patel}
[WorkHistory] Found 2 sources for P04: [P04_resume.txt, P04_cover_letter.txt]
[WorkHistory] Filtering by P04: 2 source IDs
[WorkHistory] Filtering work_items by 2 source IDs...
[WorkHistory] Found 0 work_items with matching source_id
[WARNING] [WorkHistory] Debug: 0 work_items have source_id, 0 don't
```

### 3. Code Flow Analysis

#### Evaluation Dashboard
- Reads data from `sources.structured_data` (JSONB field)
- Displays parsed work history from structured JSON
- **Does NOT query `work_items` table**

#### Work History Page
- Queries `work_items` table filtered by `source_id`
- Expects `work_items` to be populated from `structured_data`
- Falls back to sample data if no `work_items` found

#### File Upload Service
**`processStructuredData()` function:**
- Called only for `type === 'resume'` (line 614)
- Reads `structuredData.workHistory` array
- Creates `work_items` with `source_id: sourceId` (line 777)
- Creates `companies` linked to work_items

## Root Cause Identified ✅

### Primary Issue: `processStructuredData()` Only Called for Resumes

**Evidence:**
1. Sources exist with `structured_data` ✅
2. `work_items` table has 0 rows with `source_id` matching profile sources ❌
3. Evaluation dashboard can read structured_data ✅
4. Code only calls `processStructuredData()` when `type === 'resume'` ❌

**Root Cause:**
- `processStructuredData()` was only called for resume files
- Cover letters were NOT being processed, even if they contained workHistory
- LinkedIn data fetching (via Appify) was NOT implemented
- Unified profile creation was NOT happening after uploads

### Secondary Hypothesis: Data Created But Without `source_id`

**Possible Causes:**
1. Old data: `work_items` created before `source_id` column existed
2. Migration issue: Existing `work_items` don't have `source_id` populated
3. Batch upload issue: Direct upload script might have a different code path

## Diagnostic Steps Needed

1. **Verify `processStructuredData()` execution:**
   - Add logging to confirm function is called
   - Check console for "🔄 Processing structured data..." messages
   - Verify `workItemsCreated` count

2. **Check source_id linkage:**
   - Query `sources` table for P04: get actual source IDs
   - Query `work_items` table: check if any exist with matching source_id
   - Verify data type match (UUID vs string)

3. **Check structured_data structure:**
   - Verify `sources.structured_data.workHistory` exists and is an array
   - Check if `workHistory` array has entries

4. **Review upload process:**
   - Check if `direct-upload-test.ts` properly calls upload flow
   - Verify `sourceId` is correctly passed through the call chain

## Fixes Applied ✅

### 1. Process Structured Data for ALL Uploads
**Changed:**
- Updated `processStructuredData()` to be called for BOTH resume AND cover letter
- Now checks if cover letter has `workHistory` array and processes it
- Code location: `src/services/fileUploadService.ts` line 615

**Before:**
```typescript
if (type === 'resume') {
  await this.processStructuredData(structuredData, sourceId, accessToken);
}
```

**After:**
```typescript
if (type === 'resume' || (type === 'coverLetter' && structuredData.workHistory && Array.isArray(structuredData.workHistory) && structuredData.workHistory.length > 0)) {
  await this.processStructuredData(structuredData, sourceId, accessToken);
}
```

### 2. Added LinkedIn Data Fetching via Appify API
**New Service:** `src/services/appifyService.ts`
- Replaces People Data Labs (PDL) with Appify API
- Fetches LinkedIn profile data after resume/cover letter upload
- Converts Appify data to structured format
- Processes LinkedIn workHistory into `work_items` table

**Implementation:**
- Added `fetchAndProcessLinkedInData()` method
- Called automatically after combined resume + cover letter analysis
- Saves LinkedIn data as a source with `source_type: 'linkedin'`
- Processes LinkedIn workHistory into `work_items` with proper `source_id`

### 3. Added Unified Profile Creation
**New Method:** `createUnifiedProfile()`
- Creates unified profile from resume + cover letter + LinkedIn
- Uses existing `UnifiedProfileService.createUnifiedProfile()`
- Called automatically after all three sources are available
- Logs unified profile summary for verification

**Flow:**
1. Resume uploaded → processed → `work_items` created
2. Cover letter uploaded → processed → `work_items` created (if has workHistory)
3. LinkedIn data fetched via Appify → processed → `work_items` created
4. Unified profile created from all three sources

## Changes Needed to Implementation Plan

### Update Synthetic Mode Plan:
1. ✅ **Process cover letter workHistory** - DONE
2. ✅ **Add Appify API integration** - DONE (replaces PDL)
3. ✅ **Create unified profile** - DONE
4. ⏳ **Update Appify API endpoint** - Need actual endpoint from Appify docs
5. ⏳ **Add VITE_APPIFY_API_KEY to environment variables**
6. ⏳ **Re-process P01-P10** to populate work_items from existing structured_data

## Code Locations

### Key Files:
- `src/services/fileUploadService.ts` (line 614, 670, 777)
- `src/pages/WorkHistory.tsx` (line 302-306)
- `scripts/direct-upload-test.ts` (upload flow)

### Key Functions:
- `FileUploadService.processStructuredData()` - Creates work_items
- `WorkHistory.fetchWorkHistory()` - Queries work_items by source_id
- `EvaluationDashboard` - Reads from sources.structured_data

## Next Steps
1. ✅ Verify data exists in sources.structured_data (confirmed via evals dashboard)
2. ⏳ Query database directly to check work_items table
3. ⏳ Add diagnostic logging to processStructuredData
4. ⏳ Identify why work_items weren't created or linked
5. ⏳ Fix and re-process data if needed

