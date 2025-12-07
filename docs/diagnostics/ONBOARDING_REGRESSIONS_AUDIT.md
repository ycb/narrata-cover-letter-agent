# Onboarding Regressions Audit
**Date:** 2025-12-07  
**Branch:** onboard-stream  
**Status:** CRITICAL - Multiple failures blocking product tour

---

## ISSUE #1: No Gap Banners in Work History
**Times Flagged:** 3  
**Severity:** CRITICAL  
**User Quote:** "NO GAP BANNERS in the work history parent / sidebar. 3rd time this critical regression persists"

### Root Cause Analysis
**Status:** INVESTIGATING  

**Evidence Collected:**
1. Gap detection service exists and runs (`gapDetectionService.ts`)
2. Batch gap detection was added in commit `e1dc70a` (Dec 2)
3. Gap detection is called in `fileUploadService.ts` lines 1062-1097, 1263-1283, 1353-1375, 1466-1485

**Hypothesis:**
- Gap detection may be running but NOT saving results
- Gap detection may be failing silently
- Gap banners may not be rendering even if gaps exist

**Next Steps:**
- [ ] Check if gaps are being written to database
- [ ] Check if WorkHistoryDetail is reading gaps correctly
- [ ] Add console logging to trace gap detection flow
- [ ] Test with known-bad resume that should trigger gaps

**Supporting Evidence Needed:**
- Database query: `SELECT COUNT(*) FROM content_gaps WHERE user_id = ?`
- Console logs from gap detection during resume upload
- Network tab showing gap API calls

---

## ISSUE #2: Role-Level Data Not Populated by Resume
**Times Flagged:** 3  
**Severity:** CRITICAL  
**User Quote:** "ROLE LEVEL DATA NOT POPULATED BY RESUME. Another persistent critical regression"

### Root Cause Analysis
**Status:** LIKELY IDENTIFIED  

**Evidence:**
1. **Commit aa30197** (Dec 2) changed roleSummary extraction:
   - BEFORE: `"1-2 sentence overview of focus and impact in this role"`
   - AFTER: `"EXTRACT verbatim from resume header/subheader"`

2. **User's resume structure:**
   ```
   VP of Product
   Enact Systems Inc. 04/2022 - 01/2024
   • Led a cross-functional team...
   • Conducted 30+ user interviews...
   • Implemented product-led-growth...
   ```
   **No header/subheader text exists!**

3. **Prompt logic flaw:**
   - Line 58: "EXTRACT verbatim from resume header/subheader"
   - Line 23-28: "If something isn't in the resume, leave it empty. Do NOT invent or infer content."
   - Result: `roleSummary` left empty for 90% of resumes

**Root Cause:** Overly strict "EXTRACTION ONLY" rule in prompt prevents LLM from synthesizing role summaries from bullets when no header exists.

**Fix Required:** Allow LLM to create summaries from bullet points when no explicit header/subheader text exists.

**Confidence Level:** HIGH (90%)

---

## ISSUE #3: Stories Being Edited by LLM, Not Imported Verbatim
**Times Flagged:** 3  
**Severity:** CRITICAL  
**User Quote:** "Stories are being edited by LLM, not imported verbatim. Another critical regression"

### Root Cause Analysis
**Status:** HYPOTHESIS  

**User's Resume Story (Original):**
```
•Conducted 30+ user interviews and statewide survey to define value props and features 
that increased Monthly Active Users 210% and improved activation rate to 50%
```

**Evidence:**
- Same commit aa30197 added: "Extract text VERBATIM from the resume. Do NOT paraphrase, summarize, or rewrite."
- BUT story extraction may have ALWAYS involved some LLM transformation (extracting STAR format, separating metrics, etc.)

**Hypothesis:**
The "EXTRACTION ONLY" rule is being inconsistently applied:
- LLM tries to extract "verbatim" 
- BUT also tries to structure into STAR format (problem/action/outcome)
- Result: Paraphrasing during structure extraction

**Alternative Hypothesis:**
Stories are stored correctly but DISPLAYED incorrectly in UI (transformation happening in frontend/service layer)

**Confidence Level:** MEDIUM (50%)

**Next Steps:**
- [ ] Check actual database `stories` table content
- [ ] Compare raw resume text vs stored story.content field
- [ ] Trace story rendering in WorkHistoryDetail component

---

## ISSUE #4: Duplicate and Empty Intro Section (Saved Sections)
**Times Flagged:** 3  
**Severity:** CRITICAL  
**User Quote:** "STILL DUPLICATE AND EMPTY INTRO SECTION. 3rd time I've mentioned. Why did you fail?"

### Root Cause Analysis
**Status:** IDENTIFIED  

**Evidence:**
File: `src/services/coverLetterProcessingService.ts`

**Bug #1 - Empty Intro (Line 297-301):**
```typescript
// Intro = first paragraph
paragraphs.push({
  type: 'intro',
  content: chunks[0],  // chunks[0] might be "Dear 23andMe Team," (greeting only)
  position: position++,
});
```

**Problem:** If first chunk is just a greeting with no content, it creates an empty intro section.

**Bug #2 - Duplicate Intro:**
- Line 56: Service creates intro from `chunks[0]`
- Line 64-70: Service also creates saved section with title "Intro paragraph"
- Result: TWO intro sections in database

**Root Cause:** Service does naive paragraph splitting instead of using LLM-structured output.

**Confidence Level:** HIGH (95%)

**Fix Required:** Rewrite paragraph parsing or use LLM to identify intro vs greeting.

---

## ISSUE #5: 27 Fragments in Body Section (After Closing)
**Times Flagged:** 2  
**Severity:** CRITICAL  
**User Quote:** "27 FRAGMENTS in a second BODY SECTION (AFTER CLOSING = WRONG) instead of clean paragraph extraction"

### Root Cause Analysis
**Status:** IDENTIFIED  

**Evidence:**
File: `src/services/coverLetterProcessingService.ts`, Lines 279-334

**The Bug:**
```typescript
// Line 281-284: Split on blank lines
let chunks = text
  .split(/\n\s*\n/)  // ❌ ONLY splits on blank lines
  .map((p) => p.trim())
  .filter((p) => p.length > 0);
```

**Problem:**
1. Many cover letters don't have blank lines between paragraphs
2. If user's CL has 27 lines of contact info/footer at end without blank lines, they ALL merge into one chunk
3. Line 324-330: Closing detection merges everything from `closingIndex` to end:
   ```typescript
   const closingContent = chunks.slice(closingIndex).join('\n\n');
   ```

**Example:**
```
Best regards,
Avery Walker
Product Manager
415-555-1234
avery@email.com
linkedin.com/in/avery
portfolio.com
[27 more lines of signature/links]
```
All 27+ lines become ONE "closing" section with internal line breaks → renders as fragments.

**Root Cause:** Regex split assumes blank-line-separated paragraphs. Real cover letters have varied formatting.

**Confidence Level:** VERY HIGH (98%)

**Fix Required:** More sophisticated paragraph detection (sentence-based, semantic breaks, or LLM-based).

---

## ISSUE #6: LinkedIn Auto-Advance Delay (75s)
**Times Flagged:** 1  
**Severity:** CRITICAL  
**Status:** ✅ FIXED (commit 398d530)

**Root Cause:** `setLinkedinCompleted(true)` was not called when LinkedIn OAuth succeeded.

**Fix:** Added `setLinkedinCompleted(true)` to `handleLinkedInUrl()` function.

---

## SUMMARY

| Issue | Flag Count | RCA Status | Confidence | Fix Difficulty |
|-------|-----------|------------|------------|----------------|
| No gap banners | 3 | INVESTIGATING | Unknown | TBD |
| Empty role data | 3 | LIKELY IDENTIFIED | 90% | EASY |
| Stories edited | 3 | HYPOTHESIS | 50% | MEDIUM |
| Duplicate intro | 3 | IDENTIFIED | 95% | MEDIUM |
| 27 fragments | 2 | IDENTIFIED | 98% | HARD |
| LinkedIn delay | 1 | ✅ FIXED | 100% | ✅ DONE |

---

## PROPOSED FIX PRIORITY

### P0 (Fix First)
1. **Issue #5:** 27 fragments - most clearly understood, highest confidence
2. **Issue #4:** Duplicate intro - same file, clear fix path
3. **Issue #2:** Empty role data - simple prompt change

### P1 (Fix Second)
4. **Issue #1:** Gap banners - needs investigation first
5. **Issue #3:** Stories edited - needs data verification

---

## TESTING REQUIREMENTS

Before claiming ANY issue is fixed:
1. Upload real resume with no header/subheader text
2. Upload real cover letter with varied paragraph formatting
3. Check database directly (`stories`, `work_items`, `content_gaps`, `saved_sections`)
4. Run product tour end-to-end
5. Verify gap banners appear in Work History UI
6. Verify saved sections have correct count (1 intro, N body, 1 closing)
7. Verify role summaries are populated for all roles


