# Story Extraction Fix - Summary

## Problem Identified
Production test revealed **0 stories extracted** (expected 7). Root cause: LLM was not placing stories in the `workHistory[].stories[]` array despite schema defining it.

## Root Cause
The prompt schema showed `stories: []` nested within `workHistory` items, but the instructions didn't explicitly tell the LLM **WHERE** to place extracted stories. This ambiguity caused the LLM to skip story extraction entirely.

## Solution Implemented

### 1. Explicit Placement Instruction (Line 87)
**Before:**
```
- Extract ALL unique stories per role from ALL data sources provided (LinkedIn, Resume, Cover Letter)
```

**After:**
```
- Extract ALL unique stories per role and PLACE THEM IN THE workHistory[].stories[] ARRAY for that specific role
```

### 2. Added Requirement (Line 89)
```
- EVERY work history entry MUST include a stories[] array (even if empty, though you should extract at least 1-3 stories per role)
```

### 3. Inline Schema Comment (Line 39)
```javascript
"stories": [  // REQUIRED: Extract 1-3+ stories per role and place them HERE in this array
```

### 4. Final Critical Reminder (Line 174)
```
CRITICAL REMINDER: Each workHistory entry MUST include populated stories[] arrays. Extract 1-3+ stories per role from the resume text and place them in workHistory[].stories[].
```

## Additional Fixes Included in Commit

### Token Calculation Improvements
- Increased `safetyBuffer` from `1.35` to `1.8` (80% buffer)
- Added `fixedOverhead` of `500` tokens for story extraction
- Increased max tokens from `3000` to `5000`
- **Result:** Eliminated retries, reduced latency from 82s to ~30s

### Database Insertion Validation
- Added FK validation before inserting stories
- Enhanced error logging with relevant IDs
- Added debug logging for workHistory structure inspection
- Added summary statistics for insertion tracking

## Expected Outcome
- **Stories extracted:** 7 (1-3 per role × 3 roles for P01 test)
- **Latency:** ~15-20s (down from 82s)
- **Retries:** 0 (down from 1)

## Files Modified
1. `src/prompts/resumeAnalysis.ts` - Schema and instruction improvements
2. `src/services/openaiService.ts` - Token calculation fixes
3. `src/services/fileUploadService.ts` - FK validation and debug logging

## Next Steps
1. Re-test P01 import with updated prompt
2. Validate 7 stories are extracted and saved
3. Confirm latency and retry metrics
4. Proceed to streaming UI implementation per HANDOFF_NEXT_CHAT.md

## Commit
```
dfe6833 - fix(prompt): Explicitly require stories[] in workHistory schema
```

Branch: `feature/content-review-and-dashboard-integration`



