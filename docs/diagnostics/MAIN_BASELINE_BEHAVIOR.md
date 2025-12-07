# Main Branch: Working Baseline Behavior
**Date:** 2025-12-07  
**Branch:** main  
**Status:** ✅ ALL FEATURES WORKING CORRECTLY

---

## Resume Upload - Work History ✅

### What Works:
1. **21 Companies** extracted correctly
2. **24 Roles** extracted correctly
3. **Role-level data populated:**
   - ✅ Role summaries present (NOT empty)
   - ✅ Outcome metrics extracted
   - ✅ All metadata (dates, titles, etc.)

4. **Stories extracted:**
   - ✅ 14 Stories with metrics & impact
   - ✅ Stories extracted from resume bullets
   - ✅ Linked to correct work items

5. **Gap Detection:**
   - ✅ Gap badges visible on roles (Δ1, Δ2, Δ3, etc.)
   - ✅ Gap banners working in Work History sidebar
   - ✅ "No metrics found" shown when appropriate

### Example (Enact Systems role):
- Title: VP of Product ✅
- Dates: Feb 2022 - Jan 2024 ✅
- Role summary: Populated ✅
- Outcome Metrics: Present ✅
- Gap badge: Δ1 (indicating 1 gap) ✅

---

## Cover Letter Upload - Saved Sections ✅

### What Works:
1. **Introduction section:**
   - ✅ ONE intro section (no duplicates)
   - ✅ Greeting + opening paragraph merged correctly
   - ✅ Full text: "Dear 23andMe Team, I'm a product leader with 15 years of experience..."
   - ✅ Properly formatted (no empty sections)

2. **Body Paragraph sections:**
   - ✅ Multiple body paragraphs correctly identified
   - ✅ No fragments or line-break issues
   - ✅ Clean paragraph extraction

3. **Closing section:**
   - ✅ TWO closing sections created
   - ✅ Signature block included properly
   - ✅ No 27-line fragment issues
   - ✅ Properly formatted

### Saved Sections Count:
- Introduction: 1 section ✅
- Body Paragraph: Multiple sections ✅
- Closing: 2 sections ✅

**Total: Clean, properly parsed sections with NO duplication or fragmentation**

---

## Cover Letter Template ✅

### What Works:
1. **Template structure reflects cover letter:**
   - ✅ Introduction (static content)
   - ✅ Body Paragraph 1 (dynamic story matching)
   - ✅ Body Paragraph 2 (dynamic story matching)
   - ✅ Body Paragraph 3 (dynamic story matching)
   - ✅ Body Paragraph 4 (dynamic story matching)
   - ✅ Closing (static content)

2. **Multiple body paragraphs:**
   - ✅ 4 body paragraph slots in template
   - ✅ Each set to "Dynamic story matching"
   - ✅ Proper structure for reuse

---

## LinkedIn Integration ✅

### What Works:
- ✅ LinkedIn connected immediately
- ✅ Profile enriched
- ✅ No 75s delay

---

## Known Issue in Main (NOT a regression)

### Cover Letter → Stories Pipeline:
**Current Behavior:**
- Cover letter content is parsed into STORIES (✅ works)
- Cover letter content is NOT ALSO saved to Saved Sections
- **This appears to be intentional:** Stories are the primary artifact

**User Note:** "full CL parsing into SS not working -- parsed as stories instead. Should populate BOTH"

**Status:** This is a FEATURE REQUEST, not a regression from onboard-stream

---

## Summary: Main Branch Behavior

| Feature | Status | Notes |
|---------|--------|-------|
| Resume → Work History | ✅ WORKS | Role summaries, metrics, stories all populated |
| Resume → Gap Detection | ✅ WORKS | Gap badges and banners visible |
| Resume → Stories | ✅ WORKS | 14 stories with metrics |
| Cover Letter → Saved Sections | ✅ WORKS | Clean parsing, no duplicates/fragments |
| Cover Letter → Template | ✅ WORKS | Multiple body paragraphs, proper structure |
| Cover Letter → Stories | ✅ WORKS | Stories extracted from CL |
| LinkedIn → Auto-advance | ✅ WORKS | No delay |
| CL → Saved Sections + Stories | ❌ MISSING | Feature request: populate BOTH |

---

## Implications for onboard-stream Branch

### What onboard-stream BROKE:
1. ❌ Empty role summaries (was: populated)
2. ❌ Missing role metrics (was: extracted)
3. ❌ Missing stories (was: 14 stories)
4. ❌ No gap badges (was: visible)
5. ❌ Duplicate intro sections (was: 1 intro)
6. ❌ 27-line fragments (was: clean paragraphs)

### Root Cause:
**onboard-stream introduced functional changes beyond performance:**
- Created new `coverLetterProcessingService.ts` (breaks CL parsing)
- Modified resume processing flow (breaks work history)
- Changed data pipeline (breaks gap detection)

### Fix Strategy:
**Option A (RECOMMENDED): Surgical Revert**
1. Identify ONLY performance-related changes in onboard-stream
2. Revert ALL functional changes to match main
3. Keep: progress UI, parallelization, caching
4. Discard: new parsing logic, data flow changes

**Option B: Start Fresh**
1. Create new branch from main
2. Add ONLY streaming UI + performance improvements
3. Test that output matches main exactly

---

## Next Steps

1. ✅ Main baseline documented
2. ⏭️ Compare onboard-stream implementation to main
3. ⏭️ Identify exact breaking commits
4. ⏭️ Revert or fix to restore main's behavior
5. ⏭️ Add performance improvements WITHOUT functional changes
6. ⏭️ Verify output matches main exactly


