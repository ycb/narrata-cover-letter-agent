# Task 3: PM Levels Profile Loader - COMPLETE ✅

**Worker**: Sonnet (BE)  
**Branch**: `streaming-mvp`  
**Status**: ✅ Complete and ready for integration  
**Date**: 2025-11-28

---

## Overview

Implemented `getPMLevelsProfile(userId)` utility for Edge Functions to load canonical PM Levels profile data for streaming insights (JD analysis, goals and strengths).

---

## What Was Built

### Core Implementation

**File**: `supabase/functions/_shared/pm-levels.ts`

```typescript
export async function getPMLevelsProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<PMLevelsProfile>
```

**Returns**:
```typescript
interface PMLevelsProfile {
  inferredLevel: string | null;          // "L4", "L5", "L6", etc.
  targetLevelBand: string | null;        // "L5-L6", "L6", etc.
  inferredLevelTitle: string | null;     // "Senior Product Manager"
  specializations: string[];             // ["growth", "platform", "ai_ml"]
  confidence: number | null;             // 0-1 confidence score
  lastAnalyzedAt: string | null;         // ISO timestamp
}
```

### Key Features

✅ **Null-Safe**: Never throws on "user not found" - returns empty structure  
✅ **Canonical Source**: Queries `user_levels` table (same as PM Levels UI)  
✅ **Derived Bands**: Automatically computes target level band (1-2 levels up)  
✅ **Light Logging**: Dev-friendly logging for hits/misses  
✅ **No Side Effects**: Read-only; no writes, no new tables

---

## Files Created/Modified

### Created
- `supabase/functions/_shared/pm-levels.ts` - Main implementation (175 lines)
- `supabase/functions/_shared/README.md` - Full documentation
- `supabase/functions/_shared/examples/pm-levels-usage.ts` - Usage examples
- `supabase/functions/_shared/__tests__/pm-levels.test.ts` - Test harness

### Modified
- `supabase/functions/_shared/pipeline-utils.ts` - Added re-exports

---

## How to Use

### Import

```typescript
import { getPMLevelsProfile } from '../_shared/pm-levels.ts';
// or
import { getPMLevelsProfile } from '../_shared/pipeline-utils.ts';
```

### Basic Usage

```typescript
const pmProfile = await getPMLevelsProfile(supabase, job.user_id);

// Always safe to use - never null
const hasProfile = pmProfile.inferredLevel !== null;

if (hasProfile) {
  console.log(`Level: ${pmProfile.inferredLevel}`);
  console.log(`Target: ${pmProfile.targetLevelBand}`);
  console.log(`Specializations: ${pmProfile.specializations.join(', ')}`);
}
```

### In Pipeline Stage

```typescript
export async function jdAnalysisStage(ctx: PipelineContext) {
  const { job, supabase, send } = ctx;
  
  // Load PM Levels profile
  const pmProfile = await getPMLevelsProfile(supabase, job.user_id);
  
  // Stream insight to frontend
  if (pmProfile.inferredLevel) {
    await send('progress', {
      stage: 'jdAnalysis',
      insight: 'pmLevelAlignment',
      data: {
        userLevel: pmProfile.inferredLevel,
        userLevelTitle: pmProfile.inferredLevelTitle,
        targetBand: pmProfile.targetLevelBand,
        specializations: pmProfile.specializations,
      }
    });
  }
  
  // Use in LLM prompt context...
}
```

---

## Testing

### Manual Test Harness

```bash
cd supabase/functions/_shared/__tests__
deno run --allow-env --allow-net pm-levels.test.ts <user-id>
```

**Tests**:
1. ✅ Existing user profile shape verification
2. ✅ Null-safe behavior for non-existent users
3. ✅ Target level band derivation logic

### Example Output

```json
{
  "inferredLevel": "L5",
  "targetLevelBand": "L6",
  "inferredLevelTitle": "Senior Product Manager",
  "specializations": ["growth", "platform"],
  "confidence": 0.83,
  "lastAnalyzedAt": "2025-11-28T12:34:56Z"
}
```

---

## Design Decisions

### Why No Target Level Storage?

Target level is **derived** from current level using career ladder logic:
- L3 → L4-L5 (early career progression)
- L4 → L5-L6 (mid to senior)
- L5 → L6 (senior to staff)
- L6 → M1-M2 (IC to manager or stay IC)
- M1 → M2 (manager progression)

This keeps the schema simple and avoids stale target data.

### Why Specializations Array?

PM Levels stores `role_type[]` in database. We return this as-is (e.g., `["growth", "platform", "ai_ml"]`) to match what the PM Levels UI expects.

### Error Handling Philosophy

- **Expected "not found"**: Return null-safe structure, log info
- **Unexpected errors**: Log error, return null-safe structure (don't crash pipeline)
- **Never throws**: Pipelines can continue even if PM Levels unavailable

---

## Integration Points for Next Tasks

### Task 4: JD Analysis Integration (FE)

**Files to modify**:
- `supabase/functions/_shared/pipelines/cover-letter.ts` (or new JD analysis stage)

**What to add**:
```typescript
import { getPMLevelsProfile } from '../pipeline-utils.ts';

// In JD analysis stage:
const pmProfile = await getPMLevelsProfile(supabase, job.user_id);

// Stream PM Level role alignment
await send('progress', {
  stage: 'jdAnalysis',
  insight: 'pmLevelAlignment',
  data: {
    userLevel: pmProfile.inferredLevel,
    userLevelTitle: pmProfile.inferredLevelTitle,
    targetBand: pmProfile.targetLevelBand,
  }
});
```

### Task 5: Goals & Strengths Integration (FE)

**Files to modify**:
- `supabase/functions/_shared/pipelines/cover-letter.ts` (goals stage)

**What to add**:
```typescript
const pmProfile = await getPMLevelsProfile(supabase, job.user_id);

// Use in Match With Strengths (MWS) prompt
const mwsPrompt = `
User PM Level: ${pmProfile.inferredLevelTitle || 'Unknown'}
Specializations: ${pmProfile.specializations.join(', ') || 'General PM'}
Target Band: ${pmProfile.targetLevelBand || 'Not specified'}

JD Requirements: ${jdRequirements}

Assess alignment between user strengths and JD...
`;
```

---

## Checklist

- [x] Core function implemented (`getPMLevelsProfile`)
- [x] Type definitions added (`PMLevelsProfile`)
- [x] Re-exported from `pipeline-utils.ts`
- [x] Null-safe error handling
- [x] Light logging (info/error)
- [x] Target band derivation logic
- [x] Documentation (README.md)
- [x] Usage examples
- [x] Test harness
- [x] No linter errors
- [x] No new tables/stores
- [x] Updated implementation plan doc

---

## Next Steps

**Ready for**:
1. Task 4 (FE): Integrate into JD analysis pipeline
2. Task 5 (FE): Integrate into goals and strengths pipeline
3. Task 6 (FE): Wire streaming insights to toolbar accordions

**Notes for next worker**:
- All PM Levels data comes from this single loader - don't create alternate loaders
- Function is null-safe by design - no need for try/catch at call sites
- Specializations array may be empty - handle gracefully in UI
- Target band is derived, not stored - don't query for it separately
- Feature flag: `ENABLE_A_PHASE_INSIGHTS` gates all A-phase UI

---

## Questions?

See full documentation:
- `supabase/functions/_shared/README.md`
- `supabase/functions/_shared/examples/pm-levels-usage.ts`
- `docs/dev/features/PM_LEVELS_ROLE_INSIGHTS_INTEGRATION_COVER_LETTER_DRAFT.md`

