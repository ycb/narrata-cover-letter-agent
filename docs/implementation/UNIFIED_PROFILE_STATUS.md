# Unified Profile Status

## Current Implementation

The unified profile is created automatically when a user uploads:
1. Resume
2. Cover Letter
3. LinkedIn data (via Appify)

## Where It's Created

- **Service**: `UnifiedProfileService.createUnifiedProfile()`
- **Trigger**: Called automatically in `FileUploadService.processCombinedAnalysis()` after all three sources are processed
- **Location in code**: `src/services/fileUploadService.ts:1383` and `src/services/fileUploadService.ts:1903`

## Current Behavior

1. **Creation**: Unified profile is created via LLM from all three sources
2. **Logging**: Currently only logged to console with summary stats:
   ```typescript
   console.log('📊 Unified profile summary:', {
     workHistoryCount: unifiedResult.data.workHistory?.length || 0,
     educationCount: unifiedResult.data.education?.length || 0,
     skillsCount: unifiedResult.data.skills?.length || 0,
     totalExperience: unifiedResult.data.overallMetrics?.totalExperience || 0
   });
   ```
3. **Storage**: **NOT YET STORED IN DATABASE** - TODO comment exists in code: `// TODO: Store unified profile in database (create table if needed)`

## What's Needed for UI

To display unified profile data, you would need:

1. **Database table** for `unified_profiles`:
   ```sql
   CREATE TABLE unified_profiles (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
     profile_data JSONB NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id)
   );
   ```

2. **Update `createUnifiedProfile()`** to save to database instead of just logging

3. **UI Component/Page** to display unified profile data:
   - Could be a new page: `/unified-profile`
   - Could be a section in Dashboard
   - Could be a modal in user menu

## Recommendation

For MVP, unified profile doesn't need its own UI. The Work History page already shows combined data from all sources via `work_items` and `companies` tables. The unified profile is mainly useful for:
- Merging duplicate entries across sources
- Computing overall metrics (total experience, etc.)
- Future features like gap detection or level assessment

If we want to show it, simplest would be:
1. Add to Dashboard as a summary card
2. Or add as a modal accessible from user menu
3. Or create a dedicated page later if needed

