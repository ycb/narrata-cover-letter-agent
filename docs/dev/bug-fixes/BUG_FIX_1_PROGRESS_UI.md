# Bug Fix #1: Progress UI Issues (UPDATED)

## Problem Report
User reported three issues with the streaming progress UI during cover letter generation:

1. **Infinite METRICS loop**: The progress list showed dozens/hundreds of "METRICS - AI analyzing draft quality..." items
2. **Button text too verbose**: Button showed full messages like "Analyzing job description..." instead of simple phase names
3. **Banner list overwhelming**: The expanding list in the progress banner was too much information

## Root Cause Analysis

### Issue 1: Infinite METRICS Items
**Location:** `src/services/coverLetterDraftService.ts:446`

The `metricsStreamer` was configured with an `onToken` callback that emitted a progress update for **every single token** received from the LLM stream. Since the LLM response could be 500-1000+ tokens, this created 500-1000+ "METRICS" progress items.

```typescript
// OLD (BAD):
onToken: (token) => {
  this.emitProgress(onProgress, 'metrics', `AI analyzing draft quality…`, true);
},
```

### Issue 2: Verbose Button Text
**Location:** `src/components/cover-letters/CoverLetterCreateModal.tsx:488-498`

Button only showed two states:
- "Analyzing job description..." (while parsing)
- "Generate cover letter" (idle)

Didn't reflect the current generation phase during draft creation.

### Issue 3: Overwhelming Banner List
**Location:** `src/components/cover-letters/CoverLetterCreateModal.tsx:394-442`

The progress banner was rendering **every single progress update** as a list item, including:
- All JD parsing messages
- Every phase transition
- Every token-level update (see Issue 1)

This resulted in 100+ list items scrolling off the screen.

## Solution Implemented

### Fix 1: Remove Token-Level Progress Emissions
```typescript
// NEW (GOOD):
onToken: undefined, // Don't emit on every token - causes infinite progress list
```

**Impact:** METRICS phase now appears once, as intended.

### Fix 2: Simplify Button Text to Phase Names Only
```typescript
// NEW:
{isParsingJobDescription ? (
  <>
    <Loader2 className="h-4 w-4 animate-spin" />
    Parsing
  </>
) : isGenerating ? (
  <>
    <Loader2 className="h-4 w-4 animate-spin" />
    {progress[progress.length - 1]?.phase === 'jd_parse' ? 'Parsing' :
     progress[progress.length - 1]?.phase === 'content_match' ? 'Draft Generation' :
     progress[progress.length - 1]?.phase === 'metrics' ? 'Calculating Metrics' :
     progress[progress.length - 1]?.phase === 'gap_detection' ? 'Gap Detection' :
     'Generating'}
  </>
) : (
  <>
    <Wand2 className="h-4 w-4" />
    Generate cover letter
  </>
)}
```

**Impact:** Button now shows simple, clear phase names that match the banner headings.

### Fix 3: Deduplicate Banner - One Message Per Phase
```typescript
// NEW: Group by phase, show only latest message per phase
const phaseGroups = progress.reduce((acc, update) => {
  acc[update.phase] = update.message;
  return acc;
}, {} as Record<string, string>);

const phaseLabels: Record<string, string> = {
  jd_parse: 'Parsing',
  content_match: 'Draft Generation',
  metrics: 'Calculating Metrics',
  gap_detection: 'Gap Detection',
};

// Render as flat list with phase labels
{Object.entries(phaseGroups).map(([phase, message]) => (
  <div key={phase} className="flex items-start gap-2">
    <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide min-w-[180px]">
      {phaseLabels[phase] || phase}
    </span>
    <span className="text-sm text-muted-foreground flex-1">{message}</span>
  </div>
))}
```

**Impact:** Progress banner now shows max 4-5 lines (one per phase) instead of 100+.

## Files Modified
1. `src/services/coverLetterDraftService.ts` - Removed token-level progress emissions
2. `src/components/cover-letters/CoverLetterCreateModal.tsx` - Simplified button text + deduped banner

## Testing Recommendations
1. Generate a cover letter and verify:
   - Progress banner shows max 4-5 lines
   - Each phase appears once
   - Button text shows: "Parsing" → "Draft Generation" → "Calculating Metrics" → "Gap Detection"
   - No infinite scrolling list

2. Check that retry logic still works:
   - If LLM fails, should see "Retrying (X/Y)..." message
   - Should not spam the list

## Before/After

### Before
- Button: "Analyzing job description..." (static)
- Banner: 100+ "METRICS - AI analyzing draft quality..." items filling the screen
- User: "Why so many METRICS items??"

### After
- Button: Shows current phase ("Parsing" → "Draft Generation" → "Calculating Metrics")
- Banner: Clean 4-5 line summary with phase headings + latest status per phase
- User: Clear, digestible progress feedback ✅

## Notes
- Pre-existing TypeScript errors in `coverLetterDraftService.ts` remain unchanged
- No new type errors introduced by this fix
- Retry/backoff logic remains intact and functional

