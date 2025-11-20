# Phase 2: Progressive LLM Streaming - Design Document

## Current State (Single 72s Blocking Call)

**Single LLM Call** (`calculateMetricsForDraft`) returns:
- Basic Metrics (6 metrics: goals, experience, rating, ats, coreRequirements, preferredRequirements)
- Enhanced Match Data (goalMatches, requirement details, experience details, differentiator analysis)
- Section Gap Insights (per-section gaps with recommendations)
- Rating Criteria (11 quality criteria with evidence)
- CTA Hooks (actionable suggestions)

**Problem**: 72-second wait for all data before any UI updates

## Proposed 3-Way Split

### Call 1: Basic Metrics (10-15s, fastest)
**Purpose**: Get core scores and summaries to populate the metrics toolbar ASAP

**Returns**:
```typescript
{
  metrics: {
    goals: { strength, summary, tooltip },
    experience: { strength, summary, tooltip },
    rating: { score, summary, tooltip },
    ats: { score, summary, tooltip },
    coreRequirements: { met, total, summary, tooltip },
    preferredRequirements: { met, total, summary, tooltip }
  }
}
```

**Prompt Focus**:
- Lightweight, focused only on top-level scores
- No detailed breakdowns
- No section-by-section analysis
- Skip rating criteria details
- Skip CTA hooks

**Token Budget**: ~1500 max output tokens (vs 4000 current)

---

### Call 2: Requirement Analysis (15-20s, medium)
**Purpose**: Detailed requirement matching and goal alignment

**Returns**:
```typescript
{
  enhancedMatchData: {
    goalMatches: [...],
    coreRequirementDetails: [...],
    preferredRequirementDetails: [...],
    coreExperienceDetails: [...],
    preferredExperienceDetails: [...],
    differentiatorAnalysis: {...}
  }
}
```

**Prompt Focus**:
- Deep dive on requirement-by-requirement matching
- Goal alignment analysis (all 7 goal categories)
- Work history cross-references
- Differentiator positioning
- Skip section gaps (handled in Call 3)

**Token Budget**: ~2000 max output tokens

---

### Call 3: Section Gap Insights + Rating Criteria (20-30s, slowest)
**Purpose**: Granular per-section feedback with actionable CTAs

**Returns**:
```typescript
{
  enhancedMatchData: {
    sectionGapInsights: [...],
    ctaHooks: [...]
  },
  ratingCriteria: [...]
}
```

**Prompt Focus**:
- Section-by-section gap analysis
- 11 quality criteria with evidence
- Actionable CTA hooks
- Detailed recommendations
- Skip basic metrics (already computed in Call 1)

**Token Budget**: ~3000 max output tokens

---

## Implementation Strategy

### 1. Create 3 New Prompt Files

**File**: `src/prompts/basicMetrics.ts`
- Stripped-down version of enhancedMetricsAnalysis
- Only returns top-level metrics object
- Skip enhancedMatchData entirely

**File**: `src/prompts/requirementAnalysis.ts`
- Returns only enhancedMatchData fields: goalMatches, requirement details, experience details, differentiatorAnalysis
- Skip sectionGapInsights and ctaHooks

**File**: `src/prompts/sectionGaps.ts`
- Returns only sectionGapInsights, ctaHooks, and rating criteria
- Skip top-level metrics

### 2. Create 3 New Service Methods

In `coverLetterDraftService.ts`:

```typescript
private async calculateBasicMetrics(...): Promise<BasicMetricsResult>
private async calculateRequirementAnalysis(...): Promise<RequirementAnalysisResult>
private async calculateSectionGaps(...): Promise<SectionGapsResult>
```

### 3. Update `calculateMetricsForDraft` to Run in Parallel

```typescript
async calculateMetricsForDraft(...) {
  // Fire all 3 calls in parallel
  const [basicResult, reqResult, gapResult] = await Promise.all([
    this.calculateBasicMetrics(...),
    this.calculateRequirementAnalysis(...),
    this.calculateSectionGaps(...)
  ]);

  // Merge results
  const mergedEnhancedMatchData = {
    ...reqResult.enhancedMatchData,
    ...gapResult.enhancedMatchData
  };

  // Update database with progressive results as they arrive
  // (Will implement in hook layer)

  return mergedEnhancedMatchData;
}
```

### 4. Update Hook to Stream Results

In `useCoverLetterDraft.ts`:

```typescript
// Add new state for progressive loading
const [partialMetrics, setPartialMetrics] = useState<{
  basic?: BasicMetrics;
  requirements?: RequirementAnalysis;
  gaps?: SectionGaps;
}>({});

// Update UI as each result arrives
```

### 5. Update UI to Show Progressive Loading

In `CoverLetterCreateModal.tsx`:
- Show basic metrics immediately (10-15s)
- Show "Analyzing requirements..." for 5-10s
- Show "Calculating gaps..." for final 10-20s

---

## Expected Performance Gains

**Current**: 72s total (blocking)

**With Parallel Calls**:
- Basic Metrics: 10-15s ✅ **USER SEES SCORES**
- Requirement Analysis: 15-20s (parallel) ✅ **USER SEES REQUIREMENT DETAILS**
- Section Gaps: 20-30s (parallel) ✅ **USER SEES GAP INSIGHTS**

**Total Time**: ~20-30s (longest parallel call)
**Time to First Metrics**: 10-15s (vs 72s)
**Speedup**: ~2.4-3.6x faster to completion, ~4.8-7.2x faster to first useful data

---

## Data Flow

```
User clicks "Generate Cover Letter"
  ↓
generateDraftFast() - 3-5s
  ↓
Draft visible, metrics loading...
  ↓
[PARALLEL STARTS]
  ├─ Call 1: Basic Metrics (10-15s) → Update UI immediately
  ├─ Call 2: Requirement Analysis (15-20s) → Update UI when ready
  └─ Call 3: Section Gaps (20-30s) → Update UI when ready
  ↓
All metrics complete (~20-30s total)
```

---

## Risks & Mitigation

### Risk 1: Increased API Costs (3 calls vs 1)
**Mitigation**: Token optimization in Phase 3 will reduce total tokens across all 3 calls

### Risk 2: More complex error handling
**Mitigation**: Each call has independent retry logic; if one fails, others still succeed

### Risk 3: Race conditions in state updates
**Mitigation**: Use atomic state updates with proper merging logic

### Risk 4: Inconsistent analysis across calls
**Mitigation**: Each call gets same input data; prompts designed to be non-overlapping

---

## Success Criteria

1. ✅ Basic metrics appear within 15s of draft generation
2. ✅ Total time reduced from 72s to <30s
3. ✅ User can see progressive loading states
4. ✅ All 3 calls run in parallel (not sequential)
5. ✅ Error in one call doesn't block others
6. ✅ Final merged result identical to current single-call approach

---

## Next Steps

1. Create `basicMetrics.ts` prompt file
2. Create `requirementAnalysis.ts` prompt file
3. Create `sectionGaps.ts` prompt file
4. Add 3 new service methods to `coverLetterDraftService.ts`
5. Update `calculateMetricsForDraft` to run parallel calls
6. Update hook to handle progressive results
7. Update UI components to show progressive loading
8. Test end-to-end with real cover letter generation
