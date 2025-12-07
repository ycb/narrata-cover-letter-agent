# Streaming Architecture: Performance Goals vs Functional Preservation
**Date:** 2025-12-07  
**Analysis:** How to achieve streaming performance WITHOUT breaking main's working logic

---

## STREAMING GOALS (What We're Trying to Achieve)

### User Experience Goals:
1. **Show progress during long-running operations** (resume/CL upload takes 30-90s)
2. **Give immediate feedback** ("Extracting text...", "Analyzing with AI...")
3. **Prevent user anxiety** (loading spinners, progress bars)
4. **Allow incremental UI updates** (show companies as they're found, not all at once)

### Technical Performance Goals:
1. **Reduce perceived latency** (start showing results before everything is done)
2. **Parallelize independent operations** (run LinkedIn + resume + CL simultaneously)
3. **Pre-extract text** (start extraction before upload completes)
4. **Non-blocking operations** (don't freeze UI while LLM processes)

### Critical Constraint:
**ZERO functional changes to what gets extracted, stored, or displayed**

---

## ANALYZING THE DIFFS

## THE ROOT CAUSE: WHY `coverLetterProcessingService.ts` WAS CREATED

### Main's Approach (WORKS):
```typescript
// In fileUploadService.ts
if (type === 'coverLetter') {
  await this.processCoverLetterData(structuredData, sourceId, accessToken);
}
```

**What `processCoverLetterData` does:**
- Takes LLM-parsed `structuredData` (stories already extracted by LLM)
- Matches stories to work_items
- Extracts profile data (goals, voice, skills)
- **DOES NOT create saved sections** (that's handled elsewhere/differently)

### Branch's Approach (BROKEN):
```typescript
// ADDED in onboard-stream:
if (type === 'coverLetter') {
  await this.processCoverLetterData(structuredData, sourceId, accessToken);
  
  // NEW: Run comprehensive cover letter processing pipeline
  const { processCoverLetter } = await import('./coverLetterProcessingService');
  const result = await processCoverLetter(userId, sourceId, rawText, openaiKey);
  // Creates: Saved Sections, Template, My Voice, Stories
}
```

**What went wrong:**
1. **Duplicate processing**: Runs BOTH old logic AND new service
2. **New service uses regex**: Naive paragraph splitting instead of LLM parsing
3. **Breaking change**: Different paragraph detection = different results

---

## STREAMING GOAL vs IMPLEMENTATION

### What SHOULD Have Been Done (Streaming Performance):

**Goal:** Show progress during cover letter processing

**Implementation:**
```typescript
// STEP 1: Emit progress event
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { 
    sourceId, 
    stage: 'processingCoverLetter', 
    progress: 75, 
    message: 'Extracting cover letter sections...' 
  } 
}));

// STEP 2: Use MAIN'S existing logic (no changes)
await this.processCoverLetterData(structuredData, sourceId, accessToken);

// STEP 3: Emit completion event
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { 
    sourceId, 
    stage: 'coverLetterComplete', 
    progress: 85, 
    message: 'Cover letter processed!' 
  } 
}));
```

**Result:** ✅ Streaming UI + ✅ Main's working logic preserved

---

### What ACTUALLY Was Done (Functional Changes):

```typescript
// Created NEW service with DIFFERENT paragraph parsing logic
const { processCoverLetter } = await import('./coverLetterProcessingService');

// parseParagraphs() uses regex split: /\n\s*\n/
// Main uses: LLM-based semantic paragraph detection
```

**Result:** ❌ New bugs introduced + ❌ Main's logic broken

---

## THE CORRECT STREAMING ARCHITECTURE

### Principle: **Add Events, Not Logic**

**For Resume Processing:**
```typescript
// ✅ CORRECT: Add progress events to existing flow
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { stage: 'extractingSkeleton', progress: 40 }
}));
const analysisResult = await this.llmAnalysisService.analyzeResumeStagedWithEvents(...);
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { stage: 'extractingStories', progress: 60 }
}));
```

**For Cover Letter Processing:**
```typescript
// ✅ CORRECT: Add progress events to existing flow
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { stage: 'matchingStories', progress: 75 }
}));
await this.processCoverLetterData(structuredData, sourceId, accessToken);
```

**For Gap Detection:**
```typescript
// ✅ CORRECT: Add progress events to existing flow
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { stage: 'detectingGaps', progress: 90 }
}));
const roleGaps = await GapDetectionService.detectWorkItemGaps(...);
await GapDetectionService.saveGaps(roleGaps, accessToken);
```

### Principle: **Parallelize, Don't Replace**

**✅ CORRECT approach:**
```typescript
// Run independent operations in parallel
const [resumeResult, linkedinResult] = await Promise.all([
  this.processResume(resumeText),
  this.fetchLinkedInData(linkedinUrl)
]);
```

**❌ WRONG approach:**
```typescript
// Replace working logic with new implementation
const result = await newServiceWithDifferentLogic();
```

---

## RESUME PROCESSING: SIMILAR ISSUES?

Let me check if resume processing also has functional changes:

### Main's Resume Flow:
1. Extract text from file
2. LLM analyzes → structured data
3. Process structured data (create companies, work_items, stories)
4. Run gap detection
5. Save to DB

### Branch's Resume Flow (checking for changes):
- Added "pre-extraction" (performance: ✅ good)
- Added "parallel LLM calls" (performance: ✅ good)
- Added "staged analysis with events" (streaming: ✅ good)
- **Question:** Did the data structure or storage logic change?

**Need to verify:**
- Does branch's resume processing produce SAME database records as main?
- Are role summaries, metrics, stories stored identically?
- Is gap detection triggered the same way?

---

## FIX STRATEGY: SURGICAL REVERT

### Step 1: Remove `coverLetterProcessingService.ts`
**Reason:** It's a functional change, not a performance improvement

**Action:**
```bash
git rm src/services/coverLetterProcessingService.ts
```

### Step 2: Restore Main's Cover Letter Logic
**File:** `src/services/fileUploadService.ts`

**Remove:**
```typescript
// NEW: Run comprehensive cover letter processing pipeline
const { processCoverLetter } = await import('./coverLetterProcessingService');
// ... all the new code
```

**Keep:**
```typescript
// Match cover letter stories to existing work_items
await this.processCoverLetterData(structuredData, sourceId, accessToken);
```

**Add (for streaming):**
```typescript
// Emit progress event BEFORE processing
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { 
    sourceId, 
    stage: 'processingCoverLetter', 
    progress: 75, 
    message: 'Processing cover letter...' 
  } 
}));

await this.processCoverLetterData(structuredData, sourceId, accessToken);

// Emit progress event AFTER processing
window.dispatchEvent(new CustomEvent('file-upload-progress', { 
  detail: { 
    sourceId, 
    stage: 'coverLetterComplete', 
    progress: 85, 
    message: 'Cover letter processed!' 
  } 
}));
```

### Step 3: Verify Resume Processing Preserves Main's Logic

**Check:**
1. Does branch create role summaries correctly?
2. Does branch extract outcome metrics?
3. Does branch store stories?
4. Does branch trigger gap detection?

**If NO to any:** Revert those changes too, add streaming events only

### Step 4: Keep ONLY Performance Improvements

**✅ Keep these changes:**
- Pre-extraction (reduces perceived latency)
- Progress events (enables streaming UI)
- Parallel LLM calls (reduces total time)
- Caching (avoids duplicate work)
- Non-blocking operations (improves UX)

**❌ Revert these changes:**
- New paragraph parsing logic
- Different data structures
- Modified storage logic
- Anything that changes WHAT gets stored or HOW it's displayed

---

## TESTING STRATEGY: OUTPUT EQUIVALENCE

### The Test:
```
Upload same resume + cover letter to:
1. Main branch
2. Fixed onboard-stream branch

Compare database records:
- companies table (same count, same data?)
- work_items table (same role summaries, metrics?)
- stories table (same content, same metrics?)
- content_gaps table (same gaps detected?)
- saved_sections table (same sections, same content?)
- cover_letter_templates table (same structure?)
```

**Pass Criteria:** Database records are IDENTICAL (except timestamps)

**Only Then:** Streaming is "performance-only" with "no functional changes"

---

## NEXT STEPS

1. **Delete `coverLetterProcessingService.ts`**
2. **Restore main's cover letter processing logic**
3. **Add streaming events (non-functional)**
4. **Test: verify DB output matches main**
5. **Check resume processing for similar issues**
6. **Test: verify resume DB output matches main**
7. **Only then:** Claim streaming is ready for QA


