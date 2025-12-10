# PM Levels Data Issues - Fixes Applied

## Issues Identified

### 1. Role Titles & Companies Stopping Mid-Way
**Problem**: The overall level modal was only showing the first 5 roles and first 5 companies, cutting off mid-way through work history and missing the most relevant/recent roles.

**Root Cause**: `pmLevelsService.ts` lines 1184-1204 were using `.slice(0, 5)` to limit displayed roles and companies.

**Fix**: Removed `.slice(0, 5)` limits to show ALL roles and companies in chronological order.

**Files Changed**:
- `src/services/pmLevelsService.ts` (lines 1184-1204)

---

### 2. Experience Calculation
**Problem**: Experience calculation may be counting duplicate work items or missing some entries.

**Root Cause**: Multiple potential issues:
- Work items query was missing `tags` field
- Deduplication logic needed better visibility

**Fixes Applied**:
1. Added `tags` field to work items query (line 415)
2. Added comprehensive debug logging to track:
   - Total work items being processed
   - Each role being counted with dates
   - Duplicate detection
   - PM vs non-PM role classification
   - Final duration totals

**Files Changed**:
- `src/services/pmLevelsService.ts` (lines 415, 1061-1120, 1273)

---

### 3. No Specializations Found
**Problem**: Expected Growth, AI/ML, and Founding specializations but none were detected.

**Root Causes**:
1. **Missing Tags in Pipeline**: The PM levels pipeline (Supabase Edge Function) was NOT including tags when building context for specialization assessment
2. **Incomplete Work History Data**: Pipeline was using `wh.company` instead of `wh.companies?.name`, potentially causing data access issues
3. **Weak Prompt**: Specialization prompt didn't explicitly tell the LLM to look for tags

**Fixes Applied**:

#### a) Pipeline Context Building (All 3 Stages)
- **Baseline Assessment**: Fixed company name access (`wh.companies?.name` instead of `wh.company`)
- **Competency Breakdown**: Added tags to work history and stories context
- **Specialization Assessment**: Added tags to work history and stories context

#### b) Enhanced Specialization Prompt
Added explicit guidance to:
- List specific tags to look for per specialization
- Highlight the `[Tags: ...]` annotations in the data
- Provide scoring guidance (6-7 = solid, 8-9 = strong, 10 = exceptional)
- Added tag examples:
  - **Growth**: growth, activation, retention, experimentation, conversion, metrics, analytics, a/b-testing
  - **Platform**: platform, api, sdk, developer-experience, infrastructure, ecosystem
  - **AI/ML**: ai, ml, machine-learning, ai-ml, nlp, computer-vision, recommendation
  - **Founding**: founding, 0-1, startup, launch, mvp, early-stage, pre-seed, seed

**Files Changed**:
- `supabase/functions/_shared/pipelines/pm-levels.ts` (lines 36-41, 91-125, 157-230)

---

## Testing Recommendations

After these fixes, you should:

1. **Trigger a new PM Levels analysis** from the Assessment page
2. **Check the browser console** for the new debug logs showing:
   - Number of work items processed
   - Each role being counted with duration
   - Any duplicates detected
   - Total experience calculation
3. **Verify in the Overall Level modal**:
   - All role titles are shown (not just first 5)
   - All companies are shown (not just first 5)
   - Experience calculation looks correct
4. **Verify specializations**:
   - Check if Growth, AI/ML, and Founding specializations are now detected
   - Review the pipeline logs in Supabase to see the specialization scores

---

## Architecture Notes

### Data Flow
1. **Frontend** (`pmLevelsService.ts`) → Triggers background analysis
2. **Supabase Edge Function** (`pm-levels.ts` pipeline) → Fetches data and runs 3 stages:
   - Baseline Assessment (IC level)
   - Competency Breakdown (Execution, Strategy, Customer Insight, Influence)
   - Specialization Assessment (Growth, Platform, AI/ML, Founding)
3. **Results** → Stored in `user_levels` table
4. **Frontend** → Fetches and displays evidence

### Why Tags Matter
- Tags are user-curated signals of specialization areas
- Tags like "growth", "ai-ml", "founding" directly indicate specialization matches
- Without tags in the pipeline context, the LLM only has story content to infer from
- Tags provide explicit, high-confidence signals

---

## Future Improvements

1. **Client-side Specialization Detection**: Consider running tag-based specialization scoring on the frontend before sending to pipeline for validation
2. **Tag Standardization**: Enforce consistent tag vocabulary (e.g., "ai-ml" vs "ai/ml" vs "machine-learning")
3. **Experience Calculation**: Consider caching work history duration calculations to avoid recalculating on every analysis
4. **Specialization Threshold**: Review the `score > 5` threshold in line 396-399 - may be too conservative
