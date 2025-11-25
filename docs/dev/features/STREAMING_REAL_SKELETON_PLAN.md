# REAL SKELETON + STREAMING - Correct Implementation

**Date**: 2025-11-25  
**Status**: 🎯 Ready to Execute  
**Aligns with**: [STREAMING_BETA_PLAN.md](./STREAMING_BETA_PLAN.md)

---

## THE REAL GOAL

**"Real skeleton = same editor layout with live updates"**

Not two separate UIs (skeleton → editor). ONE UI that handles both states:
- `isStreaming: true` → show placeholders/shimmers
- `isStreaming: false` → show real data

This is the **ONE LAYOUT, MULTIPLE STATES** principle from the beta plan.

---

## Current State (What We Have)

```typescript
// CURRENT (WRONG):
if (isGenerating) {
  return <CoverLetterSkeleton />; // Separate component
}

if (draft) {
  return <ContentCards />; // Different component
}
```

**Problem**: Two different UIs. When streaming completes, DOM swaps from skeleton → ContentCards.

---

## Target State (What We Need)

```typescript
// TARGET (CORRECT):
return (
  <CoverLetterEditor
    draft={draft}
    isStreaming={isJobStreaming}
    jobState={jobState}
  />
);

// Inside CoverLetterEditor:
// - If isStreaming && !draft: show shimmer placeholders
// - If isStreaming && draft: show real data with "Updating..." badges
// - If !isStreaming && draft: show fully interactive UI
```

**Benefit**: NO DOM swap. Same ContentCards render throughout. Just data/state changes.

---

## Implementation Plan

### Phase 1: Make ContentCards Accept `isStreaming` Prop

**Goal**: ContentCards can render in "loading" mode with shimmers instead of waiting for draft.

#### Step 1.1: Update ContentCard Component

**File**: `src/components/shared/ContentCard.tsx`

**Add props**:
```typescript
interface ContentCardProps {
  // ... existing props
  isLoading?: boolean; // NEW
  loadingMessage?: string; // NEW: "Drafting section..." or "Analyzing gaps..."
}
```

**Render logic**:
```typescript
if (isLoading) {
  return (
    <Card className={cn("animate-pulse", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingMessage || "Loading..."}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </CardContent>
    </Card>
  );
}

// ... rest of normal rendering
```

#### Step 1.2: Render ContentCards Before Draft Exists

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Current** (around line 400):
```typescript
if (!draft) {
  return <div>Generate a draft first...</div>;
}

// Later: render ContentCards
return draft.sections.map(section => <ContentCard ... />);
```

**Change to**:
```typescript
// ALWAYS render section cards (3 sections: intro, body, closing)
const sections = draft?.sections || [
  { id: 'intro-placeholder', title: 'Introduction', type: 'intro' },
  { id: 'body-placeholder', title: 'Experience', type: 'body' },
  { id: 'closing-placeholder', title: 'Closing', type: 'closing' },
];

return sections.map(section => (
  <ContentCard
    key={section.id}
    title={section.title}
    content={section.content}
    isLoading={isJobStreaming && !draft} // ← NEW
    loadingMessage={
      isJobStreaming 
        ? `Drafting ${section.title.toLowerCase()}...` 
        : undefined
    }
    // ... all other existing props
  />
));
```

**Result**: ContentCards render immediately, show shimmers while streaming, fill with data when ready.

---

### Phase 2: Wire Streaming Hook (Minimal Integration)

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

#### Step 2.1: Add Hook

**After existing hooks** (around line 100):
```typescript
const {
  state: jobState,
  createJob: createCoverLetterJob,
  isStreaming: isJobStreaming,
  error: jobError,
} = useCoverLetterJobStream({ 
  pollIntervalMs: 2000, 
  timeout: 300000 
});
```

#### Step 2.2: Update `handleGenerateDraft`

**Find** (around line 200-250):
```typescript
const handleGenerateDraft = async () => {
  // ... existing validation
  
  setIsGenerating(true);
  
  // OLD: const result = await generateDraft(...);
  
  // NEW:
  await createCoverLetterJob({
    userId: user.id,
    jobDescriptionId,
    templateId: selectedTemplate.id,
  });
};
```

#### Step 2.3: Auto-Load Draft When Job Completes

**Add useEffect**:
```typescript
useEffect(() => {
  const loadDraft = async () => {
    if (jobState?.status === 'complete' && jobState?.result?.draftId) {
      const { data } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('id', jobState.result.draftId)
        .single();
      
      if (data) {
        setDraft(data);
        setIsGenerating(false);
      }
    }
  };
  
  loadDraft();
}, [jobState?.status, jobState?.result?.draftId]);
```

---

### Phase 3: Add Progress Banner (Above ContentCards)

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Before ContentCards render**:
```typescript
{isJobStreaming && jobState && (
  <Alert className="mb-4 border-primary/20 bg-primary/5">
    <AlertTitle className="flex items-center gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      Generating cover letter… {Math.round((jobState.progress || 0) * 100)}%
    </AlertTitle>
    <AlertDescription>
      <StageStepper 
        stages={[
          { key: 'basicMetrics', label: 'Basic metrics' },
          { key: 'requirementAnalysis', label: 'Requirements' },
          { key: 'sectionGaps', label: 'Section gaps' },
          { key: 'draftGeneration', label: 'Draft generation' },
        ]}
        statusByKey={jobState.stages || {}}
        percent={Math.round((jobState.progress || 0) * 100)}
      />
    </AlertDescription>
  </Alert>
)}

{/* ContentCards render below - they're ALWAYS here, just in loading state initially */}
{sections.map(section => <ContentCard ... />)}
```

---

## Modular Architecture (Shared Across Job Types)

### Current (Not Modular)

- `useCoverLetterJobStream` (specific to cover letters)
- Different implementations for onboarding, PM levels

### Target (Modular)

**File**: `src/hooks/useJobStream.ts`

**Already exists** but needs to be used correctly:

```typescript
// Generic hook
export function useJobStream<T = any>({ 
  jobType, 
  pollIntervalMs = 1000, 
  timeout = 300000 
}: {
  jobType: 'coverLetter' | 'onboarding' | 'pmLevels';
  pollIntervalMs?: number;
  timeout?: number;
}) {
  // ... implementation returns JobState<T>
}

// Type-safe wrappers (optional, for convenience)
export const useCoverLetterJobStream = (opts) => 
  useJobStream<CoverLetterResult>({ jobType: 'coverLetter', ...opts });

export const useOnboardingJobStream = (opts) => 
  useJobStream<OnboardingResult>({ jobType: 'onboarding', ...opts });

export const usePMLevelsJobStream = (opts) => 
  useJobStream<PMLevelsResult>({ jobType: 'pmLevels', ...opts });
```

**Usage in each UI**:

```typescript
// Cover Letters
const { jobState, isStreaming, createJob } = useCoverLetterJobStream();

// Onboarding
const { jobState, isStreaming, createJob } = useOnboardingJobStream();

// PM Levels
const { jobState, isStreaming, createJob } = usePMLevelsJobStream();
```

**Benefit**: Same pattern everywhere. Easy to maintain.

---

## Files to Modify (Minimal Changes)

### 1. `src/components/shared/ContentCard.tsx`
- **Add**: `isLoading` prop
- **Add**: Shimmer rendering when `isLoading: true`
- **Lines**: ~30 lines added

### 2. `src/components/cover-letters/CoverLetterCreateModal.tsx`
- **Add**: `useCoverLetterJobStream` hook (5 lines)
- **Modify**: `handleGenerateDraft` to use streaming (10 lines)
- **Add**: Auto-load useEffect (15 lines)
- **Modify**: Always render ContentCards with placeholder sections (20 lines)
- **Add**: Progress banner above ContentCards (15 lines)
- **Total**: ~65 lines added/modified

### 3. `src/hooks/useJobStream.ts`
- **Verify**: Generic `useJobStream` exports exist
- **Add**: Type-safe wrapper functions (15 lines)

---

## Testing Checklist

### Cover Letters

- [ ] Click "Generate" → ContentCards appear immediately with shimmers
- [ ] Progress banner shows stages updating
- [ ] Shimmers transition to real content as draft loads
- [ ] "Add section" button works
- [ ] "Insert from Library" works
- [ ] All existing features preserved

### Onboarding (Future)

- [ ] Same pattern: immediate layout with shimmers
- [ ] Progress shows stages
- [ ] Data fills in progressively

### PM Levels (Future)

- [ ] Same pattern: immediate rubric grid with shimmers
- [ ] Progress shows stages
- [ ] Scores fill in progressively

---

## Acceptance Criteria

✅ **Real Skeleton Achieved When**:
- ContentCards render immediately (before draft exists)
- Shimmers show during streaming
- NO DOM swap between loading → loaded states
- Same component handles both states

✅ **Modular Architecture Achieved When**:
- `useJobStream` generic hook works for all job types
- Cover letters, onboarding, PM levels use same pattern
- Easy to add new job types

✅ **Beta Ready When**:
- All existing features preserved
- Streaming enhances UX without regressions
- Progress feedback within 3-10 seconds

---

## Comparison to Previous Approach

### Previous (WRONG)
- ❌ Separate skeleton component
- ❌ DOM swap on completion
- ❌ Lost existing features
- ❌ Not modular

### Current (CORRECT)
- ✅ ONE layout (ContentCards)
- ✅ `isStreaming` state toggles shimmers
- ✅ NO DOM swap
- ✅ 100% feature preservation
- ✅ Modular `useJobStream` for all job types

---

## Next Steps

1. **Execute Phase 1**: Make ContentCards accept `isLoading`
2. **Execute Phase 2**: Wire streaming hook with minimal changes
3. **Execute Phase 3**: Add progress banner
4. **Test**: Verify all existing features work + streaming UX
5. **Replicate**: Apply same pattern to onboarding and PM levels

Total implementation: ~2-3 hours for cover letters, then 1 hour each for onboarding/PM levels.

---

## Success Criteria Summary

This plan achieves the **pragmatic beta** vision:

1. ✅ **Real skeleton**: ContentCards with `isLoading` state
2. ✅ **Live updates**: Progress banner + shimmer transitions
3. ✅ **Modular**: `useJobStream` for all job types
4. ✅ **Minimal changes**: ~65 lines in cover letter UI
5. ✅ **Zero regressions**: All existing features preserved
6. ✅ **Replicable**: Same pattern for onboarding + PM levels

