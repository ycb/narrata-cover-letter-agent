# Task 9 — A+B Phase Interaction Tests ✅

**Status**: COMPLETE  
**Test File**: `tests/a-b-phase-interaction.test.tsx`  
**Test Count**: 26 tests, all passing  
**Branch**: `feat/streaming-mvp`

## Overview

Comprehensive test suite ensuring streaming insights (A-phase) don't regress draft-based behavior (B-phase).

## Test Coverage

### ✅ Bucket 1: t+0 Static vs Skeleton Dynamic (3 tests)
- Renders skeleton for all sections when no draft exists
- Renders static template sections at t+0 (before streaming starts)
- Shows progress banner at t+0

### ✅ Bucket 2: A-Phase Accordions Render Pre-Draft (6 tests)
- Renders A-phase accordions in toolbar when insights are available
- Displays role insights in A-phase accordion
- Displays JD requirement summary in A-phase accordion (preliminary)
- Displays Match with Strengths in A-phase accordion
- Displays company context in A-phase accordion
- Does NOT show A-phase accordion when insights are null (legacy behavior)

### ✅ Bucket 3: Draft Completion Flips Badges to Draft Data (4 tests)
- Shows draft-based scores once draft exists
- Shows gaps count from draft enhancedMatchData
- Hides progress banner once draft exists
- Renders textareas for editing once draft exists

### ✅ Bucket 4: A-Phase Accordions Remain Visible Post-Draft (2 tests)
- Shows both A-phase accordions and draft-based badges after draft exists
- Does NOT change draft-based counts when A-phase data is present

### ✅ Bucket 5: Edge Cases (6 tests)
- Handles missing company context gracefully
- Handles missing PM Levels (roleInsights) gracefully
- Handles sparse JD (minimal requirements) gracefully
- Handles A-phase stage in progress (partial data)
- Handles draft without enhancedMatchData gracefully

### ✅ Bucket 6: Feature Flag Behavior (3 tests)
- Does NOT show A-phase accordion when aPhaseInsights is null
- Does NOT show preliminary JD counts when A-phase disabled
- Shows legacy behavior (no streaming data) when flag disabled

### ✅ Bucket 7: Progress State Transitions (3 tests)
- Shows stage chips during A-phase streaming
- Updates progress bar as stages complete
- Completes progress at 100% when draft arrives

## Key Test Patterns

### Mocked Components
- **jobState**: Mocked streaming state with A-phase stages
- **aPhaseInsights**: Normalized insights from `useAPhaseInsights` hook
- **draft**: Mock draft with B-phase enhancedMatchData
- **templateSections**: Mock template structure for skeleton state

### Test Helpers
```typescript
createMockAPhaseInsights(overrides?)    // A-phase streaming insights
createMockJobState(status, stages?)     // Job streaming state
createMockTemplateSections()            // Template sections for skeleton
createMockDraft(overrides?)             // Draft with B-phase data
createMockMatchMetrics(overrides?)      // Match metrics data
```

### Provider Wrapper
All tests wrapped in `TestWrapper` with:
- `AuthProvider` (mock user context)
- `UserGoalsProvider` (required by useMatchMetricsDetails hook)

## Design Principles Verified

### ✅ Separation of Concerns
- A-phase insights (streaming) are read-only
- B-phase draft data is the single source of truth for badges
- No mixing of A-phase and B-phase data in UI

### ✅ Feature Flag Behavior
- Tests verify both `ENABLE_A_PHASE_INSIGHTS=true` and `false`
- Legacy behavior maintained when flag disabled
- Graceful degradation when insights unavailable

### ✅ Progressive Enhancement
- Static sections render immediately
- Skeleton shown for dynamic sections pre-draft
- A-phase insights provide early feedback during 60-90s draft window
- Draft data overrides streaming data once available

## Test Execution

```bash
# Run all A+B phase tests
npm test -- a-b-phase-interaction.test.tsx

# Run with watch mode
npm test -- a-b-phase-interaction.test.tsx --watch

# Run specific test
npm test -- a-b-phase-interaction.test.tsx -t "should render A-phase accordions"
```

## Dependencies

- **vitest**: Test framework
- **@testing-library/react**: React component testing
- **@testing-library/jest-dom**: DOM matchers

## Related Files

### Components Under Test
- `src/components/cover-letters/CoverLetterDraftEditor.tsx`
- `src/components/cover-letters/MatchMetricsToolbar.tsx`

### Hooks Under Test
- `src/hooks/useAPhaseInsights.ts`
- `src/hooks/useJobStream.ts` (indirectly via mocked state)

### Types
- `src/types/jobs.ts` (APhaseInsights, JobStreamState)
- `src/types/coverLetters.ts` (CoverLetterDraft, EnhancedMatchData)

## Notes

- **No backend dependency**: All tests use mocked jobState
- **No E2E coverage**: These are unit/integration tests only
- **Feature flag coverage**: Tests verify both enabled and disabled states
- **Edge case coverage**: Missing data, partial data, sparse JD scenarios

## Next Steps

For E2E testing of A+B phase interaction:
1. See `tests/e2e/draft-cover-letter-mvp.spec.ts` for Playwright E2E tests
2. Requires backend services running
3. Tests actual streaming behavior end-to-end

---

**Ticket**: Task 9 — Tests: A + B interaction (Sonnet)  
**Completed**: 2025-01-XX  
**Test Results**: ✅ 26/26 passing

