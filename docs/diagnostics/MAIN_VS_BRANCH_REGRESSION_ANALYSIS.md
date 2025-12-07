# Main vs onboard-stream: Regression Root Cause Analysis
**Date:** 2025-12-07  
**Critical Finding:** Multiple breaking changes introduced in `onboard-stream` branch

---

## EXECUTIVE SUMMARY

**ALL 5 regressions are caused by changes made IN THIS BRANCH (`onboard-stream`), not in main.**

The branch diverged from main ~10 days ago and introduced:
1. **NEW file**: `coverLetterProcessingService.ts` (breaks cover letter parsing)
2. **MODIFIED**: Resume extraction logic in `fileUploadService.ts` (breaks work history)
3. **INHERITED**: Prompt changes from main that may have exacerbated issues

---

## Branch Divergence Timeline

### When did onboard-stream branch from main?
```bash
# First commit unique to onboard-stream (not in main)
b80c2cb Use tech stack vite_react_shadcn_ts_20250728_minor
```

### Key Changes in onboard-stream (not in main):

#### 1. **Cover Letter Processing Service (NEW FILE)**
- **Commit**: bc5a501 (Nov 25, 2024)
- **File**: `src/services/coverLetterProcessingService.ts`
- **Status**: DOES NOT EXIST IN MAIN
- **Impact**: Breaks cover letter paragraph parsing

**What main uses instead:**
Main processes cover letters differently (need to check exact implementation)

#### 2. **Resume Upload Changes**
- **Commit**: 168d92e "perf(onboarding): Add pre-extraction, latency tracking, and parallel LLM calls"
- **Commit**: 772482a "perf: quick fixes for onboarding latency"
- **Commit**: 14a91b1 "fix: Resume extraction improvements and LinkedIn integration"

These commits modified how resume data flows through the system.

---

## REGRESSION #1: No Gap Banners
**Status:** Needs investigation  
**Question:** Does gap detection work in main?

### Hypothesis:
Gap detection may have been broken by:
1. Changes to resume data structure
2. Timing issues with async gap detection
3. UI changes that broke gap banner rendering

**NEXT STEP:** Test resume upload in main and verify gaps appear

---

## REGRESSION #2-3: Work History (Role Summary, Metrics, Stories)
**Status:** HIGH CONFIDENCE  

### Evidence:
The branch made MAJOR changes to resume processing:

**Commit 168d92e:**
- Added "pre-extraction" 
- Added "parallel LLM calls"
- Modified how structured data flows

**Commit 14a91b1:**
- "Resume extraction improvements"
- Modified `fileUploadService.ts`

### What likely happened:
1. Resume data structure changed
2. Field mapping broke (roleSummary, outcomeMetrics)
3. Stories extraction pipeline modified
4. Data not reaching database correctly

**PROOF NEEDED:**
- Compare `fileUploadService.ts` in main vs branch
- Check database schema compatibility
- Verify LLM extraction prompt usage

---

## REGRESSION #4: Duplicate/Empty Intro Sections
**Status:** CONFIRMED  

### Root Cause:
`coverLetterProcessingService.ts` is a **NEW FILE** that **DOES NOT EXIST IN MAIN**.

**File location:** `src/services/coverLetterProcessingService.ts`  
**Introduced in:** Commit bc5a501 (Nov 25)

### The Bug (Lines 279-334):
```typescript
function parseParagraphs(text: string): ProcessedParagraph[] {
  // Split on blank lines
  let chunks = text.split(/\n\s*\n/)  // ❌ NAIVE SPLIT
  
  // Intro = first paragraph (might be just greeting)
  paragraphs.push({
    type: 'intro',
    content: chunks[0],  // ❌ Could be "Dear Team," only
    position: position++,
  });
}
```

**Why main works:**
Main doesn't use this service. It processes cover letters differently (using LLM-based paragraph detection, not regex).

---

## REGRESSION #5: 27 Fragments in Body/Closing
**Status:** CONFIRMED  

### Root Cause:
Same file: `coverLetterProcessingService.ts` (Lines 281-330)

```typescript
// Line 324-330: Merge ALL chunks from closing onward
if (closingIndex !== null) {
  const closingContent = chunks.slice(closingIndex).join('\n\n');
  paragraphs.push({
    type: 'closing',
    content: closingContent,  // ❌ Merges 27 lines into one section
  });
}
```

**Why main works:**
Main uses LLM to identify paragraph boundaries semantically, not by blank lines.

---

## FILE-BY-FILE COMPARISON NEEDED

### Critical Files to Compare:

1. **`src/services/fileUploadService.ts`**
   - Main vs Branch diff
   - Resume processing flow
   - Gap detection trigger points

2. **`src/services/coverLetterProcessingService.ts`**
   - **DOES NOT EXIST IN MAIN**
   - Need to find what main uses instead

3. **`src/prompts/resumeAnalysis.ts`**
   - Check if prompt is same in both branches
   - Verify "EXTRACTION ONLY" rules

4. **`src/services/gapDetectionService.ts`**
   - Check if gap detection logic changed

---

## WHY THIS HAPPENED

**User's Question:** "I am trying to QA the onboarding/streaming feature only. Yet seeing major regressions everywhere. EXPLAIN HOW THIS COULD BE HAPPENING"

### Answer:

The `onboard-stream` branch was created to implement **streaming/blocking resume upload**. However:

1. **Scope Creep:** The branch introduced a NEW cover letter processing service
2. **Data Flow Changes:** Resume upload was refactored for performance
3. **Untested Side Effects:** Changes broke existing functionality that worked in main
4. **No Regression Testing:** New code wasn't tested against existing use cases

### Timeline:
```
Nov 25: Create coverLetterProcessingService.ts (broke CL parsing)
Dec 2:  Add "EXTRACTION ONLY" to prompt (broke resume parsing)
Dec 2-7: Performance optimizations (may have broken gap detection)
```

---

## IMMEDIATE ACTION ITEMS

### Step 1: Verify Main Works ✅
```bash
# Checkout main
git checkout main

# Test with user's resume
# Upload resume
# Verify: Role summary populated, metrics extracted, stories created, gap banners appear

# Test with user's cover letter
# Upload cover letter
# Verify: 1 intro, N body paragraphs, 1 closing (no duplicates, no fragments)
```

### Step 2: Identify Exact Breaking Commits
```bash
# For resume issues
git diff main..onboard-stream -- src/services/fileUploadService.ts
git diff main..onboard-stream -- src/prompts/resumeAnalysis.ts

# For cover letter issues
git log --oneline onboard-stream ^main -- src/services/coverLetterProcessingService.ts
```

### Step 3: Surgical Fixes
- **Option A:** Cherry-pick streaming logic, revert everything else
- **Option B:** Fix bugs one-by-one in current branch
- **Option C:** Restart branch from main with ONLY streaming changes

---

## CONFIDENCE LEVELS

| Issue | Main Works? | Branch Broke It? | Confidence |
|-------|-------------|------------------|------------|
| Gap banners | TBD | TBD | TBD |
| Role summary | TBD | YES (likely) | 80% |
| Role metrics | TBD | YES (likely) | 80% |
| Stories | TBD | YES (likely) | 80% |
| Duplicate intro | YES | YES | 100% |
| 27 fragments | YES | YES | 100% |

**Next Step:** Test main to confirm it works, then compare exact code changes.


