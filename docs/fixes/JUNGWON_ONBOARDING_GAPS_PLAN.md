# Jungwon Onboarding Gaps - Immediate Fix Plan

**User**: Jungwon Yang (`d3937780-28ec-4221-8bfb-2bb0f670fd52`)  
**Date**: 2026-01-17  
**Status**: Ready to Execute

---

## Current State

| **System** | **Expected** | **Actual** | **Status** |
|------------|-------------|------------|------------|
| Resume Processing | ✅ | ✅ | Complete |
| Work History Migration | ✅ | ✅ | Complete (5 work items, 20 stories, 3 companies) |
| Cover Letter Sections | ✅ | ✅ | **Just Fixed** (5 sections: intro + 3 body + closer) |
| Cover Letter Template | ✅ | ✅ | **Just Fixed** (template updated with 5 sections) |
| Gap Detection | ✅ | ❌ | **Missing** (0 gaps) |
| PM Levels Analysis | ✅ | ❌ | **Missing** (no `user_levels` entry, no jobs) |

---

## Part 1: Trigger Gap Detection for Jungwon

### What Should Have Happened

**For Work History (Resume):**
1. `fileUploadService.processStructuredData()` saves work items & stories
2. `fileUploadService.runBackgroundGenericGapJudge()` checks for generic content
3. Gaps saved to `gaps` table with categories like `story_needs_specifics`, `role_description_needs_specifics`

**For Cover Letter Sections:**
1. `fileUploadService.saveCoverLetterSections()` saves sections to `saved_sections`
2. **NO automatic gap detection** (only runs if using `processUploadedCoverLetter`, which is not called in current flow)

### Why It Didn't Happen

**Work History Gaps:**
- ❌ `isBackgroundGenericGapJudgeEnabled()` returns `false` (feature flag disabled)
- File: `src/lib/flags.ts` line 89-107
- Check: `ENABLE_BACKGROUND_GENERIC_GAP_JUDGE` and `VITE_ENABLE_BACKGROUND_GENERIC_GAP_JUDGE` env vars
- Default: OFF

**Cover Letter Section Gaps:**
- ❌ Gap detection for saved sections is **only** in `processUploadedCoverLetter()` (lines 1470-1488 in `coverLetterTemplateService.ts`)
- ❌ Current flow uses `parseCoverLetter()` + `convertToSavedSections()` + direct DB insert, which **bypasses** gap detection entirely

### Manual Fix for Jungwon

**Option 1: Use Node Script (Recommended - Works in All Environments)**

```bash
# Gap Detection
npm run trigger:gaps d3937780-28ec-4221-8bfb-2bb0f670fd52

# PM Levels Analysis
npm run trigger:pm-levels d3937780-28ec-4221-8bfb-2bb0f670fd52
```

**Option 2: Browser Console (Dev Environment Only - Requires Import Paths)**

⚠️ **Note**: This only works in development builds where module imports are available and `supabase` is globally accessible. For production, use the Node scripts above.

```javascript
// Only works in dev mode with proper module resolution
const { GapDetectionService } = await import('/src/services/gapDetectionService.ts');

// Type mapping for saved sections (body -> paragraph, closer stays closer)
const typeMapping = {
  'intro': 'intro',
  'body': 'paragraph',
  'closer': 'closer',
  'signature': 'signature'
};

// 1. Detect gaps for work items
const workItemsRes = await supabase
  .from('work_items')
  .select('id, title, description, metrics, start_date, end_date, tags')
  .eq('user_id', 'd3937780-28ec-4221-8bfb-2bb0f670fd52');

const workItemGaps = [];
for (const item of workItemsRes.data || []) {
  // ✅ Correct signature: (userId, workItemId, workItemData, stories?)
  const gaps = await GapDetectionService.detectWorkItemGaps(
    'd3937780-28ec-4221-8bfb-2bb0f670fd52',
    item.id,
    {
      title: item.title,
      description: item.description || '',
      metrics: item.metrics || [],
      startDate: item.start_date,
      endDate: item.end_date,
      tags: item.tags || []
    }
  );
  workItemGaps.push(...gaps);
}

// 2. Detect gaps for stories
const storiesRes = await supabase
  .from('stories')
  .select('id, title, content, metrics, work_item_id')
  .eq('user_id', 'd3937780-28ec-4221-8bfb-2bb0f670fd52');

const storyGaps = [];
for (const story of storiesRes.data || []) {
  // ✅ Correct signature: (userId, story, workItemId?)
  const gaps = await GapDetectionService.detectStoryGaps(
    'd3937780-28ec-4221-8bfb-2bb0f670fd52',
    {
      id: story.id,
      title: story.title,
      content: story.content,
      metrics: story.metrics || []
    },
    story.work_item_id || undefined
  );
  storyGaps.push(...gaps);
}

// 3. Detect gaps for saved sections
const sectionsRes = await supabase
  .from('saved_sections')
  .select('id, type, content, title')
  .eq('user_id', 'd3937780-28ec-4221-8bfb-2bb0f670fd52');

const sectionGaps = [];
for (const section of sectionsRes.data || []) {
  // ✅ Map database types (body/closer) to expected types (paragraph/closer)
  const mappedType = typeMapping[section.type] || 'paragraph';
  
  const gaps = await GapDetectionService.detectCoverLetterSectionGaps(
    'd3937780-28ec-4221-8bfb-2bb0f670fd52',
    {
      id: section.id,
      type: mappedType,
      content: section.content,
      title: section.title
    }
  );
  sectionGaps.push(...gaps);
}

// 4. Save all gaps
const allGaps = [...workItemGaps, ...storyGaps, ...sectionGaps];
if (allGaps.length > 0) {
  await GapDetectionService.saveGaps(allGaps);
  console.log(`✅ Created ${allGaps.length} gaps`);
}
```

**Option 3: PM Levels via Browser Console (Dev Only)**

```javascript
const { PMLevelsService } = await import('/src/services/pmLevelsService.ts');
const pmService = new PMLevelsService();

const result = await pmService.analyzeUserLevel(
  'd3937780-28ec-4221-8bfb-2bb0f670fd52',
  undefined, // targetLevel
  undefined, // roleType
  {
    sessionId: `pm-level-manual-${Date.now()}`,
    triggerReason: 'manual-fix-jungwon',
    runType: 'initial'
  }
);

console.log('✅ PM Levels analysis complete:', result);
```

---

## Part 2: Trigger PM Levels Analysis for Jungwon

### What Should Have Happened

1. `fileUploadService.processStructuredData()` completes
2. `schedulePMLevelBackgroundRun()` called with 6-second delay (line 1882)
3. Edge function `create-job` creates a `pmLevels` job in `jobs` table
4. Job processor analyzes work history and generates PM level inference
5. Result saved to `user_levels` table

### Why It Didn't Happen

**Evidence:**
- ❌ No `pmLevels` jobs in `jobs` table for this user
- ❌ No entries in `user_levels` table
- ❌ Work item tags are generic (no level indicators)

**Root Causes:**
1. **Edge function `create-job` failed silently** (error swallowed by `console.warn` on line 39 of `pmLevelsEdgeClient.ts`)
2. **Auth/RLS issue**: Edge function call blocked by Supabase RLS policies
3. **Edge function not deployed** or misconfigured
4. **Job created but immediately failed/archived** (would need to check archived jobs)

### Manual Fix for Jungwon

⚠️ **Important**: The Node script (`npm run trigger:pm-levels`) **doesn't work** due to RLS blocking data access. See `docs/fixes/PM_LEVELS_RLS_ISSUE.md` for details.

**Option 1: Browser Console (Recommended - Works in Dev & Production)**

```javascript
// Log in as Jungwon, navigate to /assessment, open console:

const { PMLevelsService } = await import('/src/services/pmLevelsService.ts');
const pmService = new PMLevelsService();

const result = await pmService.analyzeUserLevel(
  'd3937780-28ec-4221-8bfb-2bb0f670fd52',
  undefined, // targetLevel
  undefined, // roleType
  {
    sessionId: `pm-level-manual-${Date.now()}`,
    triggerReason: 'manual-fix-jungwon',
    runType: 'initial'
  }
);

console.log('✅ PM Levels analysis complete:', result);
```

**Why this works**: Browser has user's auth token, so RLS allows data access.

**Option 2: Wait for Auto-Trigger**

Simply visit `/assessment` as Jungwon. The UI will auto-trigger analysis if no cached result exists. Takes 5-30 seconds.

**Option 3: Fix Edge Function (Long-term)**

Debug and fix the `create-job` edge function so `schedulePMLevelBackgroundRun()` works reliably. See systemic fix plan for details.

---

## Execution Checklist

### For Gap Detection
- [ ] Run Node script: `npm run trigger:gaps d3937780-28ec-4221-8bfb-2bb0f670fd52`
- [ ] Verify gaps created: `SELECT COUNT(*) FROM gaps WHERE user_id = 'd3937780-28ec-4221-8bfb-2bb0f670fd52'`
- [ ] Log in as Jungwon and check UI for gap banners on Work History page
- [ ] Check UI for gap warnings on Saved Sections page

### For PM Levels (Browser Console - RLS Issue with Node Script)
- [ ] Log in as Jungwon and navigate to `/assessment`
- [ ] Open browser console
- [ ] Run: `const { PMLevelsService } = await import('/src/services/pmLevelsService.ts'); const pm = new PMLevelsService(); await pm.analyzeUserLevel('d3937780-28ec-4221-8bfb-2bb0f670fd52');`
- [ ] Verify result saved: `SELECT * FROM user_levels WHERE user_id = 'd3937780-28ec-4221-8bfb-2bb0f670fd52'`
- [ ] Check UI for PM level badge and recommendations
- [ ] **Alternative**: Just visit `/assessment` - UI will auto-trigger analysis (5-30s wait)

---

## Success Criteria

**Gap Detection:**
- `gaps` table has > 0 entries for Jungwon
- Work History page shows gap banners for generic content
- Saved Sections page shows gap warnings

**PM Levels:**
- `user_levels` table has entry for Jungwon
- Assessment page displays level badge (e.g., "L5 Senior PM")
- Level recommendations visible on dashboard

---

## Notes

- Both fixes can be executed in parallel
- Estimated time: 5-10 minutes total
- No code changes required for immediate fix
- See Part 2 (next doc) for systemic fix to prevent future occurrences
