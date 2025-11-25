# Streaming Integration - Corrected Approach

**Date**: 2025-11-25  
**Status**: 🔴 CRITICAL FIX NEEDED  
**Branch**: `feat/streaming-mvp`

---

## CRITICAL ISSUE IDENTIFIED

The streaming "integration" REPLACED the entire `CoverLetterCreateModal.tsx` file (739 lines → 1490 lines) instead of integrating streaming into the existing UI.

**Lost Functionality**:
- ✅ **RESTORED**: "Add section" button and section management
- ✅ **RESTORED**: "Insert from Library" functionality  
- ✅ **RESTORED**: Proper ContentCards with all HIL flows
- ✅ **RESTORED**: All existing gap resolution features

**File Restored**: `git checkout main -- src/components/cover-letters/CoverLetterCreateModal.tsx`

---

## Correct Approach: MINIMAL Integration

### Principle: **DO NOT REWRITE. ADD ONLY.**

The existing UI in `main` is **correct and complete**. We need to:
1. **Keep 100% of existing code**
2. **Add** streaming hooks
3. **Add** progress UI
4. **Wire** existing components to streaming state

---

## Implementation Plan

### Step 1: Add Streaming Hook (NO UI CHANGES)

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Add** after existing hooks (around line 100):

```typescript
// ADD: Streaming integration
const {
  state: jobState,
  createJob: createCoverLetterJob,
  isStreaming: isJobStreaming,
  error: jobError,
} = useCoverLetterJobStream({ pollIntervalMs: 2000, timeout: 300000 });
```

**DO NOT** modify any existing code yet.

---

### Step 2: Wire Streaming to Existing `handleGenerateDraft`

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Find**: The existing `handleGenerateDraft` function (around line 200-250)

**Modify**: Replace the synchronous draft generation with streaming job creation:

```typescript
const handleGenerateDraft = async () => {
  if (!user?.id || !jobDescriptionId || !selectedTemplate) return;
  
  setIsGenerating(true);
  setGenerationError(null);
  
  try {
    // CREATE STREAMING JOB instead of synchronous call
    await createCoverLetterJob({
      userId: user.id,
      jobDescriptionId,
      templateId: selectedTemplate.id,
    });
    
    // Job will complete asynchronously, draft will auto-load via useEffect
  } catch (error) {
    console.error('[CoverLetterCreateModal] Failed to create streaming job:', error);
    setGenerationError(error instanceof Error ? error.message : 'Unknown error');
    setIsGenerating(false);
  }
};
```

---

### Step 3: Add useEffect to Auto-Load Draft

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Add** new useEffect after existing ones:

```typescript
// AUTO-LOAD draft when streaming job completes
useEffect(() => {
  const loadDraftFromJob = async () => {
    if (jobState?.status === 'complete' && jobState?.result?.draftId) {
      const draftId = jobState.result.draftId as string;
      
      const { data: draft, error } = await supabase
        .from('cover_letters')
        .select('*')
        .eq('id', draftId)
        .single();
      
      if (!error && draft) {
        setDraft(draft);
        setIsGenerating(false);
      }
    }
    
    if (jobState?.status === 'error') {
      setGenerationError(jobState.error?.message || 'Job failed');
      setIsGenerating(false);
    }
  };
  
  loadDraftFromJob();
}, [jobState?.status, jobState?.result?.draftId]);
```

---

### Step 4: Add Progress Banner (EXISTING UI + NEW BANNER)

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Find**: Where the existing skeleton or loading UI shows (around line 400-500)

**Add** streaming progress banner ABOVE existing content:

```typescript
// ADD: Show streaming progress if job is running
{isJobStreaming && jobState && (
  <Alert className="mb-4">
    <AlertTitle>Generating cover letter… {Math.round((jobState.progress || 0) * 100)}%</AlertTitle>
    <AlertDescription>
      <StageStepper 
        stages={Object.entries(jobState.stages || {}).map(([key, stage]: any) => ({
          key,
          label: key,
        }))}
        statusByKey={jobState.stages || {}}
        percent={Math.round((jobState.progress || 0) * 100)}
      />
    </AlertDescription>
  </Alert>
)}
```

**DO NOT** modify the existing skeleton/loading UI below it.

---

## Files to Modify

1. **`src/components/cover-letters/CoverLetterCreateModal.tsx`**
   - Add streaming hook import
   - Add streaming state variables  
   - Modify `handleGenerateDraft` to use streaming
   - Add useEffect for auto-loading draft
   - Add progress banner above existing UI

**Total Changes**: ~50 lines added, ~10 lines modified

**NO DELETIONS**. **NO REWRITES**.

---

## Testing Checklist

After implementation:

- [ ] Existing UI still works (all buttons, sections, ContentCards)
- [ ] "Add section" button visible and functional
- [ ] "Insert from Library" works
- [ ] Clicking "Generate" starts streaming job
- [ ] Progress banner appears with stages
- [ ] Draft auto-loads when complete
- [ ] All existing editing features work
- [ ] HIL "Generate content" CTAs work
- [ ] Gap resolution works

---

## Rollback Strategy

If issues occur:
```bash
git checkout main -- src/components/cover-letters/CoverLetterCreateModal.tsx
```

This restores the working UI immediately.

---

## Critical Success Criteria

✅ **BEFORE streaming integration**:
- Original UI from `main` is intact
- All features work as before

✅ **AFTER streaming integration**:
- Original UI still intact (100% preserved)
- Progress banner appears during generation
- Draft auto-loads when complete
- NO regressions in existing features

---

## What Went Wrong

The previous approach:
1. ❌ Rewrote entire file (1490 lines vs 739 lines)
2. ❌ Replaced ContentCards with different implementation
3. ❌ Lost "Add section" functionality
4. ❌ Lost "Insert from Library" functionality
5. ❌ Changed fundamental UI structure

**The correct approach**: Add ~50 lines, modify ~10 lines. Keep everything else exactly as is.

