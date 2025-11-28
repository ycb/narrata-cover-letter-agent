# A-Phase Insights Developer Guide

**Last Updated:** 2025-11-28  
**Feature:** Streaming A-Phase Insights (Tasks 4–7)

---

## Overview

A-phase insights are preliminary analysis data generated during the first 15–30 seconds of cover letter generation. This data provides early feedback to users while the full draft is being created.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Job Stream Pipeline                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  A-PHASE (15-30s)          │         B-PHASE (30-60s)        │
│  ─────────────────         │         ───────────────         │
│  • JD Analysis             │         • Draft Generation      │
│  • Requirement Analysis    │         • Gap Analysis          │
│  • Goals & Strengths       │         • Section Matching      │
│                            │                                 │
│  Output: jobState.stages   │   Output: draft.enhancedMatchData│
│         ↓                  │         ↓                       │
│    aPhaseInsights          │    matchMetrics                 │
│         ↓                  │         ↓                       │
│   Toolbar Accordions       │    Badge Counts                 │
│   Progress Banner          │    Gap Banners                  │
│                            │                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Streaming Job State
**Source:** `useJobStream()` hook (Task 4)  
**Location:** `src/hooks/useJobStream.ts`

```typescript
const { jobState, isJobStreaming } = useCoverLetterJobStream({
  userId,
  jobDescriptionId,
  templateId,
  enabled: shouldStartStream,
});
```

**Output:**
```typescript
interface JobStreamState {
  jobId: string;
  type: 'coverLetter';
  status: 'pending' | 'running' | 'complete' | 'failed';
  stages: {
    jdAnalysis?: StageState;
    requirementAnalysis?: StageState;
    goalsAndStrengths?: StageState;
  };
  error?: { message: string };
}
```

---

### 2. Normalized Insights
**Source:** `useAPhaseInsights()` hook (Task 5)  
**Location:** `src/hooks/useAPhaseInsights.ts`

```typescript
const aPhaseInsights = useAPhaseInsights(jobState);
```

**Output:**
```typescript
interface APhaseInsights {
  roleInsights?: {
    inferredRoleLevel?: 'APM' | 'PM' | 'Senior PM' | 'Staff' | 'Group';
    inferredRoleScope?: 'feature' | 'product' | 'product_line' | 'multiple_teams' | 'org';
    titleMatch?: { exactTitleMatch: boolean; adjacentTitleMatch: boolean };
    scopeMatch?: { scopeRelation: 'belowExperience' | 'goodFit' | 'stretch' | 'bigStretch' };
    goalAlignment?: { alignsWithTargetTitles: boolean; alignsWithTargetLevelBand: boolean };
  };
  jdRequirementSummary?: { coreTotal: number; preferredTotal: number };
  mws?: {
    summaryScore: 0 | 1 | 2 | 3;
    details: Array<{ label: string; strengthLevel: 'strong' | 'moderate' | 'light'; explanation: string }>;
  };
  companyContext?: {
    industry?: string;
    maturity?: string;
    businessModels?: string[];
    source?: 'jd' | 'web' | 'mixed';
  };
  stageFlags: {
    hasJdAnalysis: boolean;
    hasRequirementAnalysis: boolean;
    hasGoalsAndStrengths: boolean;
    hasRoleInsights: boolean;
    hasJdRequirementSummary: boolean;
    hasMws: boolean;
    hasCompanyContext: boolean;
    phaseComplete: boolean;
  };
}
```

---

### 3. UI Consumption

#### Progress Banner (Task 6)
**Location:** `CoverLetterDraftEditor.tsx`

```typescript
{showProgressBanner && (
  <Alert>
    <div className="space-y-2">
      <div className="w-full bg-muted rounded-full h-2">
        <div style={{ width: `${progressPercent}%` }} />
      </div>
      {progressState?.aPhaseInsights && (
        <div className="flex gap-2">
          <span className={aPhaseInsights.stageFlags.hasJdAnalysis ? 'text-primary' : 'text-muted'}>
            ✓ Analyzing job description
          </span>
          {/* ... more chips */}
        </div>
      )}
    </div>
  </Alert>
)}
```

#### Toolbar Accordions (Task 7)
**Location:** `MatchMetricsToolbar.tsx`

```typescript
<MatchMetricsToolbar
  metrics={matchMetrics}         // Draft-based (B-phase)
  aPhaseInsights={aPhaseInsights} // Streaming (A-phase)
  // ...
/>
```

**Renders:**
- "Analysis Insights" accordion at bottom of toolbar
- Conditionally visible when `aPhaseInsights` has data
- Shows Role Alignment, JD Requirements, MWS, Company Context

---

## Critical Invariants

### ⚠️ NEVER Violate These Rules

1. **Draft is Single Source of Truth for Metrics**
   - Badge counts (core/pref/score) MUST come from `draft.enhancedMatchData`
   - Gap analysis MUST come from `draft.enhancedMatchData.sectionGapInsights`
   - Never replace with A-phase data after draft exists

2. **A-Phase Data is Streaming-Only**
   - Used ONLY for progress indication and preliminary insights
   - Labeled "preliminary" or "from JD" in UI
   - Never persisted to database
   - Never used for final scoring

3. **No jobState Direct Access in UI**
   - UI components MUST NOT read `jobState` directly
   - All A-phase data flows through `useAPhaseInsights()` hook
   - Centralizes normalization and null-handling

4. **Streaming Does Not Modify Draft**
   - A-phase pipeline does not touch draft content
   - B-phase (generateDraft) remains unchanged
   - No cross-contamination between phases

---

## Common Pitfalls

### ❌ DON'T: Read jobState in UI Components
```typescript
// BAD
function MyComponent({ jobState }) {
  const roleLevel = jobState?.stages?.jdAnalysis?.data?.roleInsights?.inferredRoleLevel;
  // Fragile, no type safety, breaks if structure changes
}
```

### ✅ DO: Use useAPhaseInsights Hook
```typescript
// GOOD
function MyComponent({ aPhaseInsights }) {
  const roleLevel = aPhaseInsights?.roleInsights?.inferredRoleLevel;
  // Type-safe, normalized, centralized
}
```

---

### ❌ DON'T: Replace Draft Counts with A-Phase
```typescript
// BAD
const coreCount = aPhaseInsights?.jdRequirementSummary?.coreTotal ?? 0;
// This ignores the actual draft analysis!
```

### ✅ DO: Keep Draft as Authority
```typescript
// GOOD
const coreCount = draft?.enhancedMatchData?.coreRequirementDetails?.length ?? 0;
const preliminaryCoreCount = aPhaseInsights?.jdRequirementSummary?.coreTotal; // Labeled "from JD"
```

---

### ❌ DON'T: Auto-Open/Close Based on Data
```typescript
// BAD
useEffect(() => {
  if (aPhaseInsights?.roleInsights) {
    setActiveMetric('a-phase'); // Auto-opens accordion
  }
}, [aPhaseInsights]);
```

### ✅ DO: Let User Control Accordion State
```typescript
// GOOD
const [activeMetric, setActiveMetric] = useState<MetricKey | null>(null);
// User clicks to open/close, no automatic behavior
```

---

## Adding New A-Phase Insights

If you need to add new A-phase data:

### 1. Update Pipeline (Edge Function)
**Location:** `supabase/functions/_shared/pipelines/cover-letter.ts`

```typescript
// Add new stage to A-phase
const newStage = await runNewAnalysis(jdText, userProfile);
await updateJobStage(jobId, 'newAnalysis', {
  status: 'complete',
  data: { myNewData: newStage },
});
```

### 2. Update JobStreamState Type
**Location:** `src/types/jobs.ts`

```typescript
export interface JobStreamState {
  // ...existing stages
  stages: {
    // ...existing
    newAnalysis?: StageState<{ myNewData: any }>;
  };
}
```

### 3. Update APhaseInsights Hook
**Location:** `src/hooks/useAPhaseInsights.ts`

```typescript
export function useAPhaseInsights(jobState: JobStreamState | null): APhaseInsights | null {
  const newAnalysisStage = stages.newAnalysis;
  const hasNewAnalysis = !!newAnalysisStage && newAnalysisStage.status === 'complete';

  return {
    // ...existing fields
    myNewData: newAnalysisStage?.data?.myNewData,
    stageFlags: {
      // ...existing flags
      hasNewAnalysis,
    },
  };
}
```

### 4. Update APhaseInsights Type
**Location:** `src/types/jobs.ts`

```typescript
export interface APhaseInsights {
  // ...existing fields
  myNewData?: { /* your structure */ };
  stageFlags: {
    // ...existing flags
    hasNewAnalysis: boolean;
  };
}
```

### 5. Update UI Components
**Location:** `src/components/cover-letters/MatchMetricsToolbar.tsx`

```typescript
function APhaseDrawerContent({ insights }: APhaseDrawerContentProps) {
  return (
    <div className="space-y-3">
      {/* Existing sections */}
      
      {/* New section */}
      {insights.stageFlags.hasNewAnalysis && insights.myNewData && (
        <div className="p-2 border-t border-border/30">
          <h4 className="text-sm font-medium">My New Insight</h4>
          {/* Render your data */}
        </div>
      )}
    </div>
  );
}
```

---

## Debugging

### Enable Verbose Logging

**In CoverLetterModal:**
```typescript
useEffect(() => {
  if (jobState) {
    console.log('[A-PHASE DEBUG] Job State:', jobState);
    console.log('[A-PHASE DEBUG] Insights:', aPhaseInsights);
  }
}, [jobState, aPhaseInsights]);
```

### Check Stage Completion
```typescript
console.log('Stage Flags:', aPhaseInsights?.stageFlags);
// Verify which stages have completed
```

### Verify Data Presence
```typescript
if (aPhaseInsights?.roleInsights) {
  console.log('Role Insights Available:', aPhaseInsights.roleInsights);
} else {
  console.warn('Role Insights Missing - check jdAnalysis stage');
}
```

---

## Performance Considerations

1. **useMemo for Expensive Computations**
   - `useAPhaseInsights` uses `useMemo` internally
   - Only recomputes when `jobState` changes

2. **Conditional Rendering**
   - Accordion only renders when data present
   - Avoids empty DOM nodes

3. **No Polling**
   - Uses Supabase Realtime for job updates
   - No unnecessary network requests

---

## Testing

### Unit Tests
```typescript
describe('useAPhaseInsights', () => {
  it('returns null when jobState is null', () => {
    const { result } = renderHook(() => useAPhaseInsights(null));
    expect(result.current).toBeNull();
  });

  it('normalizes roleInsights correctly', () => {
    const mockJobState = { /* ... */ };
    const { result } = renderHook(() => useAPhaseInsights(mockJobState));
    expect(result.current?.roleInsights?.inferredRoleLevel).toBe('Senior PM');
  });
});
```

### Integration Tests
- Test complete flow: streaming → insights → UI update
- Verify accordion appears when data arrives
- Verify draft-based badges remain unchanged

---

## Feature Flag

**Location:** `src/components/cover-letters/CoverLetterModal.tsx`

```typescript
const ENABLE_A_PHASE_INSIGHTS = true;
```

To disable:
```typescript
const ENABLE_A_PHASE_INSIGHTS = false;
```

This prevents `useAPhaseInsights` from running and hides all A-phase UI.

---

## Related Documentation

- [Task 4: Job Streaming](./TASK_4_JOB_STREAMING_COMPLETE.md)
- [Task 5: A-Phase Insights Hook](./TASK_5_A_PHASE_INSIGHTS_IMPLEMENTATION.md)
- [Task 6: Progress Banner](./TASK_6_PROGRESS_BANNER_COMPLETE.md)
- [Task 7: Toolbar Accordions](./TASK_7_TOOLBAR_A_PHASE_ACCORDIONS_COMPLETE.md)
- [QA Test Plan](../qa/TASK_7_TOOLBAR_A_PHASE_ACCORDIONS_QA.md)

---

## Support

For questions or issues:
1. Check console logs for errors
2. Verify feature flag is enabled
3. Confirm jobState is populating correctly
4. Review type definitions in `src/types/jobs.ts`
5. Check edge function logs for pipeline issues

---

**Maintainer:** Engineering Team  
**Last Review:** 2025-11-28

