# Cover Letter Generation Performance Optimization Plan (V2)

**Goal:** Reduce perceived wait time from 75 seconds to <5 seconds actionable, <30 seconds complete

**Current State:** Draft loads in 3s ✅, but metrics take 72s → Total 75s before actionable
**Target State:** Draft in 3s ✅ + Heuristic gaps in 5s ⚡ + Progressive LLM in 30s ✅

---

## Current Architecture (What's Already Done)

### ✅ Phase Split Already Exists
- `generateDraftFast()`: Creates draft in ~3s with placeholder metrics
- `calculateMetricsForDraft()`: Runs in background for full LLM analysis
- Hook orchestrates: Draft first, then metrics async

### ✅ UI Infrastructure Ready
- `pendingSectionInsights` prop wired in `CoverLetterDraftView`
- Agent D pattern supported (heuristic → LLM replacement)
- Skeleton UI exists (shows during generation)

### ❌ What's Missing
- **Heuristic gap generation** (instant feedback using existing data)
- **Progressive metrics streaming** (3 parallel LLM calls instead of 1 massive call)
- **Token/prompt optimization** (reduce latency per call)

---

## Problem Analysis

### Current Bottleneck Timeline
```
0-3s:    generateDraftFast() ✅
         - Load JD, template, stories, saved sections
         - Build sections with content matching
         - Insert draft with placeholder metrics

3-75s:   calculateMetricsForDraft() ❌ BLOCKING
         - Single massive LLM call (metricsStreamer)
         - Input: ~2000-3000 tokens
         - Output: up to 4000 tokens
         - Model: GPT-4
         - Returns: ALL metrics in one JSON blob

75s+:    UI finally shows gaps and actionable feedback
```

### Why It's Slow
1. **Token Volume**: Sends entire draft + all work history + section guidance in one prompt
2. **Response Complexity**: LLM must generate 6 metrics + 7 goal matches + N requirement details + section insights + 11 rating criteria + CTAs
3. **Single Blocking Call**: UI waits for complete response before showing anything
4. **No Heuristics**: Zero instant feedback using data we already have

---

## Solution Architecture

### New Timeline (Phased Rollout)
```
Phase 1: Heuristic Gaps (Quick Win)
0-3s:    generateDraftFast() ✅
3-5s:    HeuristicGapService ⚡ NEW
         - Keyword matching for metrics detection
         - STAR format checking
         - Requirement coverage analysis
         - Generate synthetic SectionGapInsights
5s+:     USER CAN START EDITING WITH GUIDANCE ⚡⚡⚡

Phase 2: Progressive LLM Streaming
5-10s:   Basic Metrics Call (parallel) ⚡ NEW
         - Input: draft + JD + goals (~800 tokens)
         - Output: goals + experience + rating (~1000 tokens)
         - Update sidebar immediately

5-15s:   Requirement Analysis Call (parallel) ⚡ NEW
         - Input: draft + requirements + work history (~1200 tokens)
         - Output: requirement details + experience validation (~1500 tokens)
         - Update requirement tags immediately

5-20s:   Gap Insights Call (parallel) ⚡ NEW
         - Input: draft + section guidance + requirements (~1500 tokens)
         - Output: sectionGapInsights + differentiators + CTAs (~2000 tokens)
         - Replace heuristic gaps with LLM insights

20-30s:  ALL METRICS COMPLETE ✅ (vs 75s current)

Phase 3: Token & Prompt Optimization
- Use actual tokenizer (vs char/3.5 estimation)
- Trim verbose prompts (50% reduction target)
- Smart context inclusion (only relevant data per call)
- Result: 30s → 20-25s
```

---

## Implementation Plan (4 Phases)

## PHASE 1: Heuristic Gap Detection (Agent D) 🎯
**Timeline:** 3-4 hours | **Priority:** HIGH | **Risk:** LOW

### What & Why
Generate instant gap insights using keyword matching and templates (no LLM calls). Provides actionable feedback in 5 seconds while waiting for LLM analysis.

### Files to Create/Modify
```
CREATE: src/services/heuristicGapService.ts
MODIFY: src/services/coverLetterDraftService.ts
MODIFY: src/hooks/useCoverLetterDraft.ts
MODIFY: Database schema (add heuristic_insights JSONB column)
```

### Implementation Tasks

#### 1.1 Create Heuristic Gap Service
- [ ] **File**: `src/services/heuristicGapService.ts`
- [ ] **Exports**: `HeuristicGapService` class
- [ ] **Methods**:
  ```typescript
  class HeuristicGapService {
    // Analyze single section for gaps
    generateSectionGaps(
      section: CoverLetterDraftSection,
      jobDescription: ParsedJobDescription,
      sectionType: string
    ): SectionGapInsight

    // Analyze all sections in draft
    generateGapsForDraft(
      sections: CoverLetterDraftSection[],
      jobDescription: ParsedJobDescription
    ): Record<string, SectionGapInsight>
  }
  ```

#### 1.2 Implement Detection Logic
- [ ] **Metrics Detection**
  - Regex patterns: `/\d+%/`, `/\$[\d,]+/`, `/\d+[xX]/` (multipliers)
  - Count occurrences per section
  - If count < 1, flag as "missing_metrics" gap

- [ ] **STAR Format Checking**
  - Keywords: "led", "managed", "achieved", "resulted in", "improved"
  - Check for action verbs (beginning of sentences)
  - Flag if < 2 action verbs in experience sections

- [ ] **Requirement Coverage**
  - Use existing `matchRequirements()` from draft service
  - Compare matched IDs vs total requirements
  - Create gap for each unmatched core requirement

- [ ] **Section-Specific Rules**
  ```typescript
  // Introduction
  - Check for company name mention
  - Check for role-specific keywords
  - Check for metrics in first paragraph

  // Experience
  - Check for quantified results
  - Check for technical keywords from JD
  - Check for leadership indicators

  // Closing
  - Check for call-to-action keywords
  - Check for enthusiasm indicators ("excited", "eager")
  ```

#### 1.3 Generate SectionGapInsight Objects
- [ ] **Structure**:
  ```typescript
  {
    sectionId: string,
    sectionSlug: string,
    promptSummary: "Quick analysis (full AI insights loading...)",
    requirementGaps: [
      {
        id: string,
        label: string,
        severity: "high" | "medium" | "low",
        requirementType: "core" | "preferred" | "narrative",
        rationale: string,
        recommendation: string
      }
    ],
    recommendedMoves: string[],
    nextAction: "add-story" | "add-metrics" | null
  }
  ```

#### 1.4 Wire into generateDraftFast
- [ ] Call `HeuristicGapService.generateGapsForDraft()` after sections built
- [ ] Store in draft row: `heuristic_insights` JSONB column
- [ ] Return alongside draft in result object
- [ ] **Database Migration**:
  ```sql
  ALTER TABLE cover_letters
  ADD COLUMN heuristic_insights JSONB;
  ```

#### 1.5 Update useCoverLetterDraft Hook
- [ ] Extract `heuristicInsights` from draft result
- [ ] Set state: `setPendingSectionInsights(heuristicInsights)`
- [ ] Pass to `CoverLetterDraftView` component
- [ ] Clear when LLM insights arrive

#### 1.6 Validation
- [ ] Generate draft → verify gaps appear in UI within 5s
- [ ] Check gap quality (reasonable recommendations)
- [ ] Verify gaps are replaced when `enhancedMatchData.sectionGapInsights` arrives
- [ ] Test with empty work history (edge case)
- [ ] Test with sparse JD (few requirements)

**Acceptance Criteria:**
- [x] Gaps display in UI within 5 seconds of draft completion
- [x] Gap recommendations are relevant (not perfect, but helpful)
- [x] Heuristic gaps replaced seamlessly by LLM insights
- [x] No errors if work history or requirements missing
- [x] User can start editing immediately with guidance

**Deliverable:** Actionable feedback in 5 seconds (15x improvement over 75s)

---

## PHASE 2: Progressive LLM Streaming (3 Parallel Calls) 🚀
**Timeline:** 6-8 hours | **Priority:** HIGH | **Risk:** MEDIUM

### What & Why
Replace single 72s LLM call with 3 smaller parallel calls. Each call updates UI immediately when complete. Reduces max wait from 72s to ~30s.

### Architecture Overview
```
┌─────────────────────────────────────────────────┐
│ calculateMetricsForDraft() (current)            │
│ ├── Load data (draft, JD, goals, work history) │
│ └── Single metricsStreamer call (72s) ❌        │
└─────────────────────────────────────────────────┘

                    ↓ REPLACE WITH ↓

┌──────────────────────────────────────────────────────────┐
│ calculateMetricsProgressive() (new)                      │
│ ├── Load data (shared across all calls)                 │
│ └── Promise.all([                                        │
│     ├── basicMetricsCall() → 10-15s ⚡                   │
│     ├── requirementAnalysisCall() → 15-20s ⚡            │
│     └── gapInsightsCall() → 20-30s ⚡                    │
│    ])                                                     │
│ └── Merge results → return EnhancedMatchData             │
└──────────────────────────────────────────────────────────┘
```

### Files to Create/Modify
```
CREATE: src/services/progressiveMetricsService.ts
CREATE: src/prompts/basicMetricsAnalysis.ts
CREATE: src/prompts/requirementAnalysis.ts
CREATE: src/prompts/gapInsightsAnalysis.ts
MODIFY: src/services/coverLetterDraftService.ts
MODIFY: src/hooks/useCoverLetterDraft.ts
```

### Implementation Tasks

#### 2.1 Create Progressive Metrics Service
- [ ] **File**: `src/services/progressiveMetricsService.ts`
- [ ] **Class**: `ProgressiveMetricsService`
- [ ] **Dependencies**: OpenAI client, prompt builders, shared types

#### 2.2 Implement basicMetricsCall()
- [ ] **Input**: `{ draft, jobDescription, userGoals }`
- [ ] **Prompt**: Lightweight analysis for match quality only
- [ ] **Output Schema**:
  ```typescript
  {
    metrics: {
      goals: { strength, summary, tooltip, differentiatorHighlights },
      experience: { strength, summary, tooltip, differentiatorHighlights },
      rating: {
        score,
        summary,
        tooltip,
        criteria: [
          { id, label, met, evidence, suggestion } // All 11 criteria
        ]
      }
    }
  }
  ```
- [ ] **Estimated Tokens**: 800 input → 1000 output
- [ ] **Model**: GPT-4 or GPT-3.5-turbo (faster)
- [ ] **Completion Time**: 10-15s

#### 2.3 Implement requirementAnalysisCall()
- [ ] **Input**: `{ draft, jobDescription, workHistory, approvedContent }`
- [ ] **Prompt**: Focused on requirement matching + experience validation
- [ ] **Output Schema**:
  ```typescript
  {
    enhancedMatchData: {
      coreRequirementDetails: [
        { id, requirement, demonstrated, evidence, sectionIds, severity }
      ],
      preferredRequirementDetails: [...],
      coreExperienceDetails: [
        { requirement, confidence, matchedWorkItemIds, matchedStoryIds, evidence }
      ],
      preferredExperienceDetails: [...]
    }
  }
  ```
- [ ] **Estimated Tokens**: 1200 input → 1500 output
- [ ] **Completion Time**: 15-20s

#### 2.4 Implement gapInsightsCall()
- [ ] **Input**: `{ draft, sections, jobDescription, sectionGuidance }`
- [ ] **Prompt**: Deep section-level analysis with SECTION_GUIDANCE rubric
- [ ] **Output Schema**:
  ```typescript
  {
    enhancedMatchData: {
      sectionGapInsights: [
        {
          sectionId, sectionSlug, sectionType, sectionTitle,
          promptSummary,
          requirementGaps: [
            { id, label, severity, requirementType, rationale, recommendation }
          ],
          recommendedMoves,
          nextAction
        }
      ],
      differentiatorAnalysis: {
        summary, userPositioning, strengthAreas, gapAreas
      },
      ctaHooks: [
        { type, label, requirement, severity, actionPayload }
      ]
    }
  }
  ```
- [ ] **Estimated Tokens**: 1500 input → 2000 output
- [ ] **Completion Time**: 20-30s

#### 2.5 Implement Orchestrator
- [ ] **Method**: `calculateMetricsProgressive()`
- [ ] **Logic**:
  ```typescript
  async calculateMetricsProgressive(
    draftId: string,
    userId: string,
    jobDescriptionId: string,
    onProgressiveUpdate?: (partial: Partial<EnhancedMatchData>) => void
  ): Promise<EnhancedMatchData> {
    // 1. Load shared data
    const [draft, jobDescription, userGoals, workHistory, approvedContent] =
      await Promise.all([...]);

    // 2. Launch 3 calls in parallel
    const [basicMetrics, requirementAnalysis, gapInsights] = await Promise.all([
      this.basicMetricsCall(...).then(result => {
        // Update UI immediately
        onProgressiveUpdate?.({
          metrics: result.metrics
        });
        this.updateDraftPartial(draftId, { metrics: result.metrics });
        return result;
      }),

      this.requirementAnalysisCall(...).then(result => {
        onProgressiveUpdate?.({
          coreRequirementDetails: result.core,
          preferredRequirementDetails: result.preferred,
          coreExperienceDetails: result.coreExp,
          preferredExperienceDetails: result.prefExp
        });
        this.updateDraftPartial(draftId, { ...result });
        return result;
      }),

      this.gapInsightsCall(...).then(result => {
        onProgressiveUpdate?.({
          sectionGapInsights: result.insights,
          differentiatorAnalysis: result.differentiators,
          ctaHooks: result.ctas
        });
        this.updateDraftPartial(draftId, { ...result });
        return result;
      })
    ]);

    // 3. Merge all results
    const merged = this.mergeMetricsResults(basicMetrics, requirementAnalysis, gapInsights);

    // 4. Final update to draft
    await this.updateDraftFinal(draftId, merged);

    return merged;
  }
  ```

#### 2.6 Create Lightweight Prompts
- [ ] **basicMetricsAnalysis.ts**
  - Strip down ENHANCED_METRICS_SYSTEM_PROMPT
  - Remove: requirement details, experience details, gap insights, CTAs
  - Keep: goals, experience, rating criteria
  - Target: 295 lines → ~80 lines (70% reduction)

- [ ] **requirementAnalysis.ts**
  - Focus on requirement matching logic
  - Remove: basic metrics, gaps, differentiators
  - Keep: requirement details, experience validation
  - Target: 295 lines → ~100 lines (66% reduction)

- [ ] **gapInsightsAnalysis.ts**
  - Include SECTION_GUIDANCE rubric
  - Remove: basic metrics, requirement matching
  - Keep: sectionGapInsights, differentiatorAnalysis, ctaHooks
  - Target: 295 lines → ~120 lines (59% reduction)

#### 2.7 Integrate into Draft Service
- [ ] Update `calculateMetricsForDraft()`
- [ ] Replace `this.metricsStreamer()` with `ProgressiveMetricsService.calculateMetricsProgressive()`
- [ ] Add progressive update handler:
  ```typescript
  const enhancedMatchData = await progressiveService.calculateMetricsProgressive(
    draftId,
    userId,
    jobDescriptionId,
    (partialMetrics) => {
      // Pass progressive updates to hook via callback
      onProgress?.('metrics', 'Partial metrics calculated');
      onProgressiveMetrics?.(partialMetrics);
    }
  );
  ```

#### 2.8 Update useCoverLetterDraft Hook
- [ ] Add `onProgressiveMetrics` callback to draft service call
- [ ] Update state incrementally:
  ```typescript
  const handleProgressiveMetrics = (partial: Partial<EnhancedMatchData>) => {
    setState(prev => ({
      ...prev,
      draft: prev.draft ? {
        ...prev.draft,
        enhancedMatchData: {
          ...prev.draft.enhancedMatchData,
          ...partial
        }
      } : prev.draft
    }));
  };
  ```

#### 2.9 Validation
- [ ] **Test Parallel Execution**
  - Verify all 3 calls start simultaneously
  - Check max completion time (~30s, not 72s)
  - Monitor network tab for parallel requests

- [ ] **Test Progressive UI Updates**
  - Basic metrics appear ~10-15s
  - Requirement tags populate ~15-20s
  - Heuristic gaps replaced with LLM insights ~20-30s

- [ ] **Test Error Handling**
  - Kill 1 of 3 calls → others still complete
  - Verify partial results are usable
  - Fallback to heuristics if all calls fail

- [ ] **Test Merge Logic**
  - No duplicate data in merged result
  - Schema validation passes
  - No TypeScript errors

**Acceptance Criteria:**
- [x] Metrics calculation reduced from 72s to ~30s
- [x] UI updates progressively (3 stages)
- [x] Partial failures don't break entire flow
- [x] Merged result matches quality of original single call
- [x] No race conditions in state updates

**Deliverable:** 72s → 30s reduction (2.4x speedup)

---

## PHASE 3: Token & Prompt Optimization 🔧
**Timeline:** 4-5 hours | **Priority:** MEDIUM | **Risk:** LOW

### What & Why
Reduce per-call latency by optimizing token usage and prompts. Target 20-30% reduction in completion time per call.

### Implementation Tasks

#### 3.1 Use Actual Tokenizer
- [ ] Install: `npm install gpt-tokenizer`
- [ ] Replace estimation logic in `metricsStreamer`:
  ```typescript
  // OLD
  const contentTokens = Math.ceil(contentForAnalysis.length / 3.5);

  // NEW
  import { encode } from 'gpt-tokenizer';
  const contentTokens = encode(contentForAnalysis).length;
  ```
- [ ] Calculate optimal `maxTokens` per call (not 4000 for all):
  ```typescript
  basicMetricsCall:      maxTokens: 1200
  requirementAnalysis:   maxTokens: 2000
  gapInsightsCall:       maxTokens: 2500
  ```

#### 3.2 Audit & Trim Prompts
- [ ] Remove redundant examples from system prompts
- [ ] Use bullet points instead of verbose paragraphs
- [ ] Consolidate overlapping instructions
- [ ] Target: 20-30% token reduction per prompt

#### 3.3 Smart Context Inclusion
- [ ] **basicMetricsCall**: Don't send work history (not needed for match quality)
- [ ] **requirementAnalysisCall**: Don't send section guidance (not needed for requirement matching)
- [ ] **gapInsightsCall**: Don't send full work history (only needed for requirement analysis)

#### 3.4 Retry Logic Optimization
- [ ] Per-call retries (already achieved in Phase 2)
- [ ] Tune exponential backoff:
  ```typescript
  // Current: [750ms, 1500ms]
  // Optimized: [500ms, 1000ms, 2000ms]
  const RETRY_DELAYS_MS = [500, 1000, 2000];
  const MAX_RETRIES = 2; // 3 total attempts
  ```

#### 3.5 Smarter Failure Handling
- [ ] If `basicMetricsCall` fails → use heuristic strength estimates
- [ ] If `requirementAnalysisCall` fails → use keyword matching
- [ ] If `gapInsightsCall` fails → keep heuristic gaps
- [ ] **Result**: Never show empty state to user

#### 3.6 Prompt Optimization Techniques
- [ ] Remove verbose examples (keep 1-2 concise ones)
- [ ] Use JSON Schema mode if available (structured outputs)
- [ ] Simplify rating criteria (11 → 6 grouped categories)
- [ ] Estimated savings: ~500 output tokens

#### 3.7 Validation
- [ ] Measure token counts before/after optimization
- [ ] Compare completion times (baseline vs optimized)
- [ ] Verify output quality unchanged
- [ ] Run quality regression tests

**Acceptance Criteria:**
- [x] 20-30% token reduction per prompt
- [x] 30s → 20-25s completion time
- [x] Output quality maintained
- [x] Retry penalties reduced (smaller calls = faster retries)

**Deliverable:** 30s → 20-25s further reduction (1.2x speedup)

---

## PHASE 4: Testing & Validation ✅
**Timeline:** 2-3 hours | **Priority:** HIGH | **Risk:** LOW

### Performance Benchmarks
- [ ] Measure end-to-end timeline (3 test drafts)
- [ ] Compare against baseline (75s)
- [ ] Target: <30s to full completion, <5s to actionable
- [ ] Document results in spreadsheet

### Quality Validation
- [ ] Compare heuristic gaps vs LLM gaps (accuracy check)
  - Sample: 10 drafts
  - Metric: % of heuristic gaps that match LLM gaps
  - Target: >60% alignment

- [ ] Verify progressive updates don't show stale data
  - Check: Heuristic gaps are replaced (not duplicated)
  - Check: Metrics update without flicker

- [ ] Validate merged metrics match quality of original
  - Schema validation
  - Manual review of 5 sample outputs

### Edge Case Testing
- [ ] Empty work history (no experience data)
- [ ] Sparse JD (< 3 requirements)
- [ ] Network failure during background calculation
- [ ] User edits section while LLM gaps calculating
- [ ] User closes modal before metrics complete

### User Experience Review
- [ ] Gap banners update smoothly (no flicker)
- [ ] Loading states are clear and helpful
- [ ] Progressive updates feel natural (not jarring)
- [ ] Error messages are user-friendly

**Acceptance Criteria:**
- [x] All performance targets met
- [x] Quality maintained (>60% heuristic alignment)
- [x] Edge cases handled gracefully
- [x] UX polish complete

**Deliverable:** Production-ready optimized flow

---

## Success Metrics

| Metric | Baseline | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|----------|----------------|----------------|----------------|
| Time to actionable feedback | 75s | **5s** ⚡ | 5s | 5s |
| Time to basic metrics | 75s | 75s | **15s** ⚡ | **12s** ⚡ |
| Time to requirement tags | 75s | 75s | **20s** ⚡ | **16s** ⚡ |
| Time to full analysis | 75s | 75s | **30s** ⚡ | **25s** ⚡ |
| User can start editing | After 75s | **After 5s** | After 5s | After 5s |
| Failed LLM recovery | Empty state | Heuristics | Partial results | Partial results |

**Overall Improvement:**
- **Perceived performance**: 75s → 5s (15x faster)
- **Full completion**: 75s → 25s (3x faster)
- **Resilience**: Empty on fail → Useful fallbacks

---

## Implementation Order

### ✅ Sprint 1: Quick Win (Phase 1 - Heuristic Gaps)
- **Duration**: 3-4 hours
- **Goal**: Actionable feedback in 5 seconds
- **Risk**: LOW (pure addition, no existing changes)
- **Validation**: Generate draft → verify gaps appear in 5s
- **Rollout**: Feature flag → gradual rollout

### ✅ Sprint 2: Core Optimization (Phase 2 - Progressive LLM)
- **Duration**: 6-8 hours
- **Goal**: 72s → 30s completion time
- **Risk**: MEDIUM (replacing core metrics flow)
- **Validation**: Parallel execution, progressive updates, error handling
- **Rollout**: Feature flag → beta users → all users

### ✅ Sprint 3: Polish (Phase 3 - Token/Prompt Optimization)
- **Duration**: 4-5 hours
- **Goal**: 30s → 25s completion time
- **Risk**: LOW (refinement only)
- **Validation**: Token audits, quality checks
- **Rollout**: Enable for all users

### ✅ Sprint 4: Verification (Phase 4 - Testing)
- **Duration**: 2-3 hours
- **Goal**: Production readiness
- **Risk**: LOW (testing only)
- **Validation**: Comprehensive test suite
- **Rollout**: Monitor production metrics

**Total Timeline**: 15-20 hours over 4 sprints

---

## Risk Mitigation

### Risk: Heuristic gaps are too low quality
- **Mitigation**: Label as "Quick Analysis (AI refining...)" in UI
- **Fallback**: Make heuristics optional (feature flag)
- **Monitoring**: Track user engagement with heuristic vs LLM gaps

### Risk: 3 parallel calls hit OpenAI rate limits
- **Mitigation**: Add stagger delay (0ms, 100ms, 200ms)
- **Fallback**: Sequential execution with same optimized prompts
- **Monitoring**: Log rate limit errors, auto-fallback if detected

### Risk: Progressive updates cause UI jank/flicker
- **Mitigation**: Debounce updates (100ms)
- **Fallback**: Batch updates, only show when complete
- **Monitoring**: Track render counts, performance profiling

### Risk: Merged metrics have inconsistencies
- **Mitigation**: Schema validation before merge
- **Fallback**: Full recalculation if merge fails
- **Monitoring**: Log merge failures, alert if >1% failure rate

---

## Notes

- **JD Parsing**: Already non-blocking (done in `generateDraftFast`) ✅
- **Existing 2-phase split**: Keep and enhance (don't rebuild) ✅
- **Caching**: Skipped (not real-world scenario)
- **Streaming**: Already enabled for content generation, now adding for metrics
- **Agent D Infrastructure**: Already exists (`pendingSectionInsights` prop), just needs heuristic service

---

## Next Steps

1. ✅ Review and approve plan
2. ⏳ Confirm phasing (Quick Win → Core → Polish → Verify)
3. ⏳ Start Phase 1 implementation (heuristic gaps)
4. ⏳ Validate each phase before proceeding to next

---

## Appendix: Technical Details

### Database Schema Changes
```sql
-- Phase 1: Add heuristic insights column
ALTER TABLE cover_letters
ADD COLUMN heuristic_insights JSONB;

-- No other schema changes needed (reuse existing columns)
```

### Type Definitions
```typescript
// Phase 1: Heuristic insights match LLM structure
interface SectionGapInsight {
  sectionId: string;
  sectionSlug: string;
  promptSummary: string;
  requirementGaps: RequirementGap[];
  recommendedMoves: string[];
  nextAction: 'add-story' | 'add-metrics' | null;
}

// Phase 2: Progressive metrics callbacks
type ProgressiveMetricsCallback = (partial: Partial<EnhancedMatchData>) => void;

interface ProgressiveMetricsService {
  calculateMetricsProgressive(
    draftId: string,
    userId: string,
    jobDescriptionId: string,
    onProgressiveUpdate?: ProgressiveMetricsCallback
  ): Promise<EnhancedMatchData>;
}
```
