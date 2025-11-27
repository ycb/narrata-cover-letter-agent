# BASELINE VERIFICATION - Phase 0

## Objective
Confirm that the current `generateDraft` function produces correctly structured cover letter drafts before implementing streaming.

## Current generateDraft Behavior (VERIFIED)

### Location
`src/services/coverLetterDraftService.ts:1152`

### Signature
```typescript
async generateDraft(options: DraftGenerationOptions): Promise<DraftGenerationResult>
```

### Input Parameters
- `userId`: User identifier
- `templateId`: Cover letter template to use
- `jobDescriptionId`: Job description to match against
- `onProgress`: Optional progress callback
- `onSectionBuilt`: Optional section streaming callback
- `signal`: Optional abort signal

### Return Structure
```typescript
{
  draft: CoverLetterDraft,  // Main draft object
  workpad: WorkpadRow       // Supporting workpad data
}
```

### Draft Structure Components (CONFIRMED)

**1. Sections** (`draft.sections`)
- Array of section objects
- Each section has:
  - `id`: unique identifier
  - `type`: section type (intro/body/closing/dynamic-story/dynamic-saved)
  - `slug`: section slug matching template
  - `title`: section display title
  - `content`: actual text content
  - `metadata`: requirements matched, scores, etc.
  - `status`: gaps, gapIds, etc.

**2. Metrics** (`draft.metrics`)
- Array of CoverLetterMatchMetric objects
- Includes: ATS score, experience match, goals match, etc.

**3. Enhanced Match Data** (`draft.enhancedMatchData`)
- Core requirements details
- Preferred requirements details
- Section gap insights
- Requirement matching analysis

**4. LLM Feedback** (`draft.llmFeedback`)
- Rating criteria
- Content standards
- Generated metrics

## Key Baseline Behaviors (DO NOT CHANGE)

### ✅ Section Generation
- Sections are generated from template structure
- Each template section type is preserved
- Content is matched from stories/saved sections or generated
- Section order follows template order

### ✅ Metrics Calculation
- Retry logic with exponential backoff (4 attempts max)
- Graceful fallback to default metrics if LLM fails
- metrics stored in both `metrics` and `llmFeedback.metrics`

### ✅ Gap Detection
- Requirements are matched across all sections
- Unmatched requirements become gaps
- Gaps are tracked per-section via `gapIds`
- Section gap insights stored in `enhancedMatchData.sectionGapInsights`

### ✅ Database Storage
- Draft saved to `cover_letters` table
- Workpad saved to `cover_letter_workpads` table
- All analysis data persisted with draft

## Acceptance Criteria for Baseline

1. ✅ `generateDraft` signature unchanged
2. ✅ Returns `{ draft, workpad }` structure
3. ✅ Draft contains properly structured sections array
4. ✅ Draft contains metrics and enhancedMatchData
5. ✅ No writes to database except from `generateDraft`
6. ✅ Template structure is preserved in sections

## Verification Status

**STATUS**: ✅ BASELINE CONFIRMED

**Date**: 2025-11-27
**Branch**: `feat/streaming-mvp`
**Commit**: `03a0684`

**Notes**:
- `generateDraft` is the single source of truth for draft creation
- All section structure, content, and analysis originates here
- Streaming pipeline must NOT duplicate this logic
- Streaming pipeline must ONLY provide progressive analysis (metrics/gaps)

## Next Phase
Proceed to **Phase 1**: Remove `draftGenerationStage` from streaming pipeline

