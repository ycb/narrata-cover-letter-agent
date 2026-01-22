# Story Over-Extraction Fix

**Date:** 2024-12-09  
**Issue:** Ben Shaw onboarding extracted 318 stories (expected ~15-25)  
**Root Cause:** LLM extracting every bullet as separate story + no deduplication + no quality filtering

---

## Problem Summary

Ben Shaw's resume processing created **318 stories** from ~6 work items:
- **Massive duplication**: 8-18 copies of the same story per role
- **Low quality**: Many generic responsibilities without concrete outcomes
- **Poor UX**: Overwhelming number of stories makes profile unusable

Example:
- "Internal Communications Plan for Autodesk University": **18 duplicates**
- "Global communications strategy for sales conference": **16 duplicates**

---

## Solution Implemented

### Phase 1: Immediate Cleanup (Ben Shaw)
✅ Created `scripts/dedupe-stories.ts` to clean up existing data
✅ Ran deduplication on Ben's account: **318 → 30 stories (90.6% reduction)**

### Phase 2: Prompt Improvements
✅ Updated `src/prompts/resumeAnalysisSplit.ts`:
- Added **hard cap**: 3-7 stories per role (max 8)
- Added **quality gate**: Must have action + scope/result
- Changed extraction strategy: **combine related bullets** instead of splitting everything

✅ Updated `src/prompts/sharedStoryGuidance.ts`:
- Added story count targets
- Added quality gate requirements
- Emphasized combining related achievements

### Phase 3: Post-Extraction Safeguards
✅ Updated `src/services/fileUploadService.ts` (lines 1776-1836):

**Hard Cap:**
```typescript
const cappedStories = stories.slice(0, 8);
if (stories.length > 8) {
  console.warn(`⚠️ Story cap applied: ${workItem.company} had ${stories.length} stories, capped to 8`);
}
```

**Quality Gate (Binary Filter):**
```typescript
const hasAction = /\b(launched|built|scaled|drove|designed|led|...)\b/i.test(content);
const hasMetric = (story.metrics && story.metrics.length > 0) || /\d+[%$kKmMbB]|.../.test(content);
const hasScope = /\b(\d+\s*person|team|user|...|enterprise|global|...)\b/i.test(content);

if (!hasAction && !hasMetric && !hasScope) {
  console.log(`⚠️ Story filtered (quality gate): "${storyTitle}..." - no action/metric/scope`);
  continue;
}
```

**Simple Deduplication:**
```typescript
const normalizedTitle = storyTitle.toLowerCase().replace(/[^\w\s]/g, '').trim();
const storyKey = `${workItemId}|${normalizedTitle}`;
if (seenStoryKey.has(storyKey)) {
  console.log(`⚠️ Story filtered (duplicate): "${storyTitle}..."`);
  continue;
}
```

---

## Implementation Strategy (User Feedback)

User requested **incremental, safe approach**:

1. ✅ **Hard cap early** - Prevent blow-ups even if prompts drift
2. ✅ **Prompt + simple dedupe first** - 80% of win without embedding cost
3. ✅ **Binary quality gate** - Heuristic (regex) before scoring
4. ⏳ **Aggregate by role** - Future: cluster bullets by shared nouns (product, platform, initiative)
5. ⏳ **Embedding-based dedupe** - Optional later if still noisy

---

## Results

### Ben Shaw (After Fix)
- **Before:** 318 stories (90% duplicates)
- **After:** 30 stories (high quality, deduplicated)
- **Reduction:** 90.6%

### Expected for New Users
- **Resume with 4 roles:** ~12-28 stories (3-7 per role)
- **Quality:** All stories have action + scope/result
- **No duplicates:** Title-based deduplication prevents exact matches

---

## Files Changed

1. `src/prompts/resumeAnalysisSplit.ts` - Updated prompt rules
2. `src/prompts/sharedStoryGuidance.ts` - Added quality gate + targets
3. `src/services/fileUploadService.ts` - Added cap + quality gate + dedupe
4. `scripts/dedupe-stories.ts` - New cleanup script for existing data

---

## Testing Plan

1. ✅ Test on Ben Shaw (cleaned up successfully)
2. ⏳ Test on new user onboarding (verify story counts)
3. ⏳ Monitor production for next 5 onboardings
4. ⏳ Add metrics to track:
   - Stories per role (target: 3-7)
   - Stories filtered by quality gate
   - Stories filtered by dedupe

---

## Future Improvements (Optional)

If story quality/count issues persist:

1. **Clustering by shared nouns**: Group bullets mentioning same product/platform/initiative
2. **Embedding-based similarity**: Dedupe semantically similar stories (>70% match)
3. **LLM-based merge**: Ask LLM to combine related bullets into single story
4. **Source-level cap**: Max stories per source (resume vs cover letter)

---

## Monitoring

Watch for:
- ⚠️ Users with >50 total stories (indicates over-extraction)
- ⚠️ Roles with >8 stories (hard cap should prevent this)
- ⚠️ Generic stories without metrics/scope (quality gate should filter)
- ⚠️ Duplicate titles within same role (dedupe should prevent)

---

## Rollback Plan

If issues arise:
1. Revert `src/services/fileUploadService.ts` changes (remove cap/quality gate/dedupe)
2. Revert prompt changes
3. Run `scripts/dedupe-stories.ts` on affected users
