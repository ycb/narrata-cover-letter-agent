# PM Levels Dual Implementation Analysis

## Executive Summary

**CRITICAL FINDING**: PM Levels assessment has **TWO COMPLETELY SEPARATE IMPLEMENTATIONS**:

1. **Client-side** (`src/services/pmLevelsService.ts`) - 2200+ lines, full LLM-based analysis
2. **Edge Function** (`supabase/functions/_shared/pipelines/pm-levels.ts`) - 450+ lines, streaming pipeline

**CURRENT STATE**: Both are being used, but **NOT interchangeably**. They produce different results.

**RECOMMENDATION**: Migrate to Edge Function pipeline ONLY. Remove client-side implementation.

---

## Architecture Overview

### Path 1: Client-Side Implementation

**File**: `src/services/pmLevelsService.ts`
**Size**: ~2252 lines
**Invoked by**:
- `usePMLevel` hook (lines 122, 205)
- Called when: Initial load for synthetic users, manual recalculate (fallback)
- Used for: Real-time UI updates, caching

**What it does**:
1. Fetches user content (work items, stories, sources)
2. Calls LLM to extract signals
3. Computes competency scores (execution, strategy, customer insight, influence)
4. Calculates level score using formula
5. Maps score to level (L3-L6, M1)
6. Collects evidence for modals
7. Saves to `user_levels` table

**Key methods**:
- `analyzeUserLevel()` - Main entry point
- `extractSignals()` - LLM call to extract career signals
- `computeCompetencyScores()` - LLM call to rate competencies
- `computeLevelScore()` - Formula-based level calculation
- `mapLevelScoreToLevel()` - Score → Level code mapping
- `collectLevelEvidence()` - Extract role titles, companies, experience
- `detectSpecializations()` - **NEW** Tag-based specialization detection

---

### Path 2: Edge Function Pipeline

**File**: `supabase/functions/_shared/pipelines/pm-levels.ts`
**Size**: ~456 lines
**Invoked by**:
- `stream-job` Edge Function (line 156)
- `stream-job-process` Edge Function (line 137)
- Triggered via: `usePMLevelsJobStream` hook → creates job in `jobs` table

**What it does**:
1. **Stage 1**: Baseline Assessment (5-10s) - IC level, role-to-level mapping
2. **Stage 2**: Competency Breakdown (10-30s) - 4 competency scores
3. **Stage 3**: Specialization Assessment (30-45s) - Growth, Platform, AI/ML, Founding
4. Compiles final result with specializations
5. Saves to `jobs` table (NOT `user_levels`)
6. Streams progress via SSE

**Key stages**:
- `baselineAssessmentStage` - Level assessment (IC3-IC9, M1-M2)
- `competencyBreakdownStage` - Competency scoring
- `specializationAssessmentStage` - Specialization detection

---

## Call Flow Analysis

### When User Clicks "Run Analysis" on Assessment Page

```
Assessment.tsx (line 354-373)
  ↓
handlePMLevelsRecalcStreaming()
  ↓
IF activeProfileId (synthetic user):
  ↓
  createPMJob('pmLevels', { profileId })  ← EDGE FUNCTION PATH
    ↓
    Inserts job into `jobs` table
    ↓
    stream-job Edge Function connects via SSE
    ↓
    executePMLevelsPipeline() runs 3 stages
    ↓
    Saves to `jobs.result`
    ↓
    Timer polls until complete → calls recalculate()
      ↓
      pmLevelsService.analyzeUserLevel()  ← CLIENT-SIDE PATH
      (Re-runs ENTIRE analysis client-side!)
ELSE (regular user):
  ↓
  recalculate()  ← CLIENT-SIDE PATH ONLY
    ↓
    pmLevelsService.analyzeUserLevel()
    ↓
    Saves to `user_levels` table
```

### When Page Loads

```
usePMLevel hook
  ↓
queryFn: async ()
  ↓
1. Check cache: pmLevelsService.getUserLevel()
  ↓
  Reads from `user_levels` table
  ↓
  IF found: return cached
  ↓
2. IF synthetic user AND no cache:
  ↓
  pmLevelsService.analyzeUserLevel()  ← CLIENT-SIDE PATH
  (Fresh analysis client-side)
  ↓
3. IF regular user AND no cache:
  ↓
  return null (user must click "Run Analysis")
```

---

## Key Differences Between Implementations

| Feature | Client-Side | Edge Function Pipeline |
|---------|-------------|------------------------|
| **Lines of code** | ~2252 | ~456 |
| **LLM calls** | Multiple (signals, competencies, recommendations) | 3 (one per stage) |
| **Specialization detection** | Tag-based (NEW) | LLM-based (score 0-10) |
| **Level range** | L3-L6, M1 | IC3-IC9, M1-M2 |
| **Management track** | M1 only (NEW), requires score >= 5.5 | M1-M2, based on title/scope |
| **Streaming** | No | Yes (SSE) |
| **Storage** | `user_levels` table | `jobs` table |
| **Execution time** | ~10-30s | ~45-60s (streaming) |
| **Cost** | Higher (multiple LLM calls) | Lower (optimized prompts) |
| **Background updates** | Via `schedulePMLevelBackgroundRun()` | Via job queue |

---

## Data Flow Mismatch

### Problem 1: Edge Function Results Not Used

When synthetic user triggers Edge Function:
1. Edge Function runs → saves to `jobs.result`
2. Timer polls for completion
3. On complete → calls `recalculate()` → **RE-RUNS client-side analysis!**
4. Client-side result overwrites Edge Function result

**Impact**: Edge Function work is wasted. Client-side always wins.

### Problem 2: Different Tables

- **Client-side** writes to `user_levels`
- **Edge Function** writes to `jobs`
- No sync between them

### Problem 3: Different Schemas

**`jobs.result`** (Edge Function):
```typescript
{
  assessmentId: string;
  icLevel: number;
  assessmentBand: string;
  competencies: { executionDelivery, leadershipInfluence, productStrategy, technicalDepth };
  specializations: string[];  // ["Growth PM", "AI/ML PM"]
}
```

**`user_levels`** (Client-side):
```typescript
{
  level: PMLevelCode;
  competency_scores: { execution, customer_insight, strategy, influence };
  role_archetype_evidence: Record<RoleType, RoleArchetypeEvidence>;
  confidence: number;
  // ... many more fields
}
```

---

## Why Two Implementations Exist

### Historical Context

1. **Original**: Client-side service built first for MVP
2. **V2**: Edge Function pipeline added for:
   - Streaming progress updates
   - Background job processing
   - Reduced client-side cost
   - Server-side optimization

3. **Migration stalled**: 
   - Client-side still called as fallback
   - "Recalculate" still uses client-side
   - Edge Function only used for synthetic users (testing)

### Current Usage

**Synthetic users** (testing/evals):
- Triggers Edge Function
- Then re-runs client-side (wasteful)
- Uses client-side result

**Regular users**:
- Client-side ONLY
- No streaming
- No Edge Function

---

## Issues with Current State

### 1. **Inconsistent Results**
- Edge Function may assess as M2 (VP)
- Client-side caps at M1 (Group PM)
- User sees client-side result (lower level)

### 2. **Wasted Resources**
- Running analysis twice for synthetic users
- Edge Function cost + Client-side cost

### 3. **Maintenance Burden**
- Two codebases to maintain
- Bug fixes needed in both places
- Feature parity difficult

### 4. **Confusing Architecture**
- New developers don't know which to use
- Unclear which is "source of truth"
- Hard to debug issues

### 5. **Missing Features**
- Client-side didn't have specialization detection (we just added it)
- Edge Function has it but results aren't used
- M2 level only in Edge Function, not client-side (until we just added M1)

---

## Recommendation: Migrate to Edge Function Only

### Phase 1: Wire Up Edge Function for Regular Users (IMMEDIATE)

**Goal**: Stop using client-side for regular users

**Changes**:
1. `Assessment.tsx` line 354-373:
   ```typescript
   // OLD
   if (!activeProfileId) {
     await recalculate();  // client-side
     return;
   }
   
   // NEW
   await createPMJob('pmLevels', { profileId: activeProfileId });
   ```

2. `usePMLevel.ts` lines 119-136:
   ```typescript
   // Remove client-side analysis for synthetic users
   // Let Edge Function handle it via job queue
   ```

3. Add sync: When job completes, copy `jobs.result` → `user_levels`

### Phase 2: Schema Migration (1-2 weeks)

**Goal**: Align Edge Function output with `user_levels` schema

**Changes**:
1. Expand Edge Function result to include all fields client-side has:
   - `levelEvidence` (role titles, companies, experience)
   - `evidenceByCompetency` (stories, metrics per competency)
   - `roleArchetypeEvidence` (specialization evidence)

2. Update `executePMLevelsPipeline()` to call helper functions:
   - `collectLevelEvidence()`
   - `collectCompetencyEvidence()`
   - `collectRoleArchetypeEvidence()`

3. Test parity: Edge Function result === Client-side result

### Phase 3: Remove Client-Side (2-3 weeks)

**Goal**: Delete `pmLevelsService.ts` client-side analysis

**Changes**:
1. Keep only:
   - `getUserLevel()` - Read from cache
   - `saveLevelAssessment()` - Write to `user_levels`
   
2. Remove:
   - `analyzeUserLevel()` - ~2000 lines
   - All LLM service calls
   - Signal extraction, competency scoring, etc.

3. Update all callers to use Edge Function

### Phase 4: Background Processing (ongoing)

**Goal**: Auto-run PM Levels when content changes

**Keep**:
- `schedulePMLevelBackgroundRun()` - Creates job in queue
- Job processor picks up and runs Edge Function

---

## Migration Risk Assessment

### Low Risk
- Edge Function already works for synthetic users
- Schema migration can be done incrementally
- Can feature-flag rollout

### Medium Risk
- Need to ensure Edge Function has all features client-side has
- Caching strategy needs update
- Error handling for job failures

### High Risk
- If Edge Function fails, no fallback to client-side
- Migration must be complete before removing client-side

---

## Next Steps

1. **Immediate** (today):
   - Add TODO comments marking client-side for deprecation
   - Document this analysis for team

2. **This sprint**:
   - Wire up Edge Function for regular users (behind feature flag)
   - Test parity between both implementations

3. **Next sprint**:
   - Migrate schema to align outputs
   - Add evidence collection to Edge Function

4. **Following sprint**:
   - Remove client-side implementation
   - Update all callers
   - Remove fallback logic

---

## Questions to Resolve

1. **Should we keep client-side as emergency fallback?**
   - Pro: Safety net if Edge Function fails
   - Con: Maintenance burden, inconsistency risk
   - **Recommendation**: NO. Fix Edge Function reliability instead.

2. **What about synthetic users?**
   - Currently trigger both paths
   - **Recommendation**: Edge Function only, no special case

3. **Background updates?**
   - Currently client-side via `schedulePMLevelBackgroundRun()`
   - **Recommendation**: Job queue triggers Edge Function

4. **Caching strategy?**
   - Currently `user_levels` table
   - **Recommendation**: Keep same, Edge Function writes to it

---

## Conclusion

**We have TWO implementations producing DIFFERENT results.**

**Root cause**: Migration from client-side → Edge Function was never completed.

**Solution**: Complete the migration. Use Edge Function ONLY.

**Timeline**: 4-6 weeks to fully migrate and remove client-side.

**Immediate action**: Stop calling client-side for regular users. Use Edge Function.
