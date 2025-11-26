# COVER LETTER FRONTEND REFACTOR – THREE PHASE PLAN

**Goal**: Unify architecture, make streaming integration simple and robust  
**Date**: 2025-11-26  
**Branch**: `cover-letter-unify-arch`

---

## OVERVIEW

### Current Problems

- Editor logic is fragmented across multiple files (CreateModal, EditModal, DraftView, Skeleton, ViewModal, etc.)
- Streaming has no single "home" – wiring requires changes in 3+ places
- Skeleton is a separate layout instead of a "state" of the real editor

### Target Architecture

1. **`CoverLetterModal.tsx`** – Unified create/edit modal with tabs
2. **`CoverLetterDraftEditor.tsx`** – Single shared editor (ContentCards + metrics)
3. **`CoverLetterFinalizeDialog.tsx`** (optional) – Simple read-only preview

### Refactor Strategy

- **Phase 1**: Extract shared DraftEditor (no behavior change)
- **Phase 2**: Move skeleton + streaming behavior into DraftEditor
- **Phase 3**: Unify Create/Edit modals into a single CoverLetterModal

Each phase should end in a working, testable state.

---

## PHASE 1 – EXTRACT SHARED DRAFT EDITOR

### Goal

Create a single "Draft Editor" component used by both Create and Edit flows, without changing behavior yet. No streaming changes. No skeleton changes. Just consolidation.

### Files Involved

- `CoverLetterDraftView.tsx` (source for editor layout)
- `CoverLetterCreateModal.tsx`
- `CoverLetterEditModal.tsx`

### Phase 1 Constraints

- No backend changes
- No streaming behavior changes
- Modals should still behave exactly as before from a user perspective
- Commit after Phase 1 should be safe and shippable

---

### Step 1.1 – Duplicate and rename DraftView

1. Copy `CoverLetterDraftView.tsx` to a new file:
   - **New file**: `CoverLetterDraftEditor.tsx`

2. In `CoverLetterDraftEditor.tsx`:
   - Rename the component to `CoverLetterDraftEditor`
   - Update export to:
     ```typescript
     export function CoverLetterDraftEditor(props: CoverLetterDraftEditorProps) { … }
     ```

3. Leave existing `CoverLetterDraftView.tsx` untouched for now

---

### Step 1.2 – Define a clean props interface for DraftEditor

In `CoverLetterDraftEditor.tsx`:

1. At the top, define a props interface that includes all data the editor needs:

```typescript
interface CoverLetterDraftEditorProps {
  draft: CoverLetterDraft | null;
  isStreaming?: boolean;
  jobState?: JobState | null;
  // plus any callbacks already used:
  // onChangeDraft, onAddSection, onDeleteSection, onInsertFromLibrary, etc.
}
```

2. Update the component signature to accept props only and to NOT fetch its own draft state (for now, pass through what DraftView currently uses)

3. Inside the component, replace any direct references to parent state (if present) with props:
   - `draft` becomes `props.draft`
   - `isStreaming` becomes `props.isStreaming`
   - `jobState` becomes `props.jobState`

The goal is to make DraftEditor purely presentational and controlled by its parent.

---

### Step 1.3 – Use DraftEditor in CreateModal

In `CoverLetterCreateModal.tsx`:

1. Find where the editor UI is currently rendered (likely using `CoverLetterDraftView` or inlined JSX)

2. Replace that usage with:

```typescript
<CoverLetterDraftEditor
  draft={draft}
  isStreaming={isJobStreaming}  // or false for now if streaming not wired
  jobState={jobState}
  // pass all existing editor callbacks/props
/>
```

3. Ensure the necessary imports:

```typescript
import { CoverLetterDraftEditor } from "./CoverLetterDraftEditor";
```

---

### Step 1.4 – Use DraftEditor in EditModal

In `CoverLetterEditModal.tsx`:

1. Find the section where the draft editor is rendered

2. Replace it with:

```typescript
<CoverLetterDraftEditor
  draft={draft}
  isStreaming={false}   // Edit usually not streaming; can pass jobState later if needed
  jobState={undefined}
  // pass existing callbacks/props
/>
```

3. Import `CoverLetterDraftEditor` similarly

---

### Step 1.5 – Verify Phase 1

**Manual check:**

- Open Create flow:
  - Can see JD input (if present), template selection, and editor
  - Can edit sections, use library, HIL, gap banners, etc.
- Open Edit flow:
  - Can see existing draft in the editor
  - All actions (edit, duplicate, delete sections) still work

If everything looks identical to pre-refactor behavior, Phase 1 is successful.

---

## PHASE 2 – MOVE SKELETON + STREAMING INTO DRAFTEDITOR

### Goal

Make `CoverLetterDraftEditor` responsible for:

- Real skeleton (same layout, just loading state)
- Reading streaming data from `jobState.result`
- Hydrating metrics, requirements, gaps, and section content from streaming

### After Phase 2

- Create and Edit modals simply pass `draft + jobState + isStreaming`
- Skeleton is not a separate layout; it's just the editor in loading mode

### Files Involved

- `CoverLetterDraftEditor.tsx` (primary)
- `CoverLetterCreateModal.tsx` (light cleanup)
- `CoverLetterEditModal.tsx` (minor/no changes)

### Phase 2 Constraints

- No backend changes
- No new `generateDraft()` calls
- During streaming, DO NOT load drafts from Supabase using `jobState.result.draftId`
- All streaming data should be read from `jobState.result`

---

### Step 2.1 – Define streaming result view inside DraftEditor

At the top of `CoverLetterDraftEditor.tsx` (or near component):

1. Define interfaces (or reuse existing types) for the streaming result:

```typescript
interface CoverLetterDraftSection {
  id: string;
  title: string;
  slug: string;
  content: string;
}

interface CoverLetterJobResult {
  metrics?: any;
  requirements?: any;
  sectionGaps?: any;
  draft?: {
    sections: CoverLetterDraftSection[];
    // include other fields from backend result as needed
  };
}
```

Inside the component, derive:

```typescript
const coverLetterResult = props.jobState?.result as CoverLetterJobResult | undefined;
const draftFromStreaming = coverLetterResult?.draft;
const isStreaming = !!props.isStreaming;
const hasDraftFromStreaming =
  !!draftFromStreaming && !!draftFromStreaming.sections?.length;
const effectiveDraft = draftFromStreaming ?? props.draft ?? null;
```

This makes `effectiveDraft` the single draft source the UI uses.

---

### Step 2.2 – Define sections with placeholders

Inside DraftEditor, before mapping over sections:

```typescript
const sections: CoverLetterDraftSection[] =
  effectiveDraft?.sections && effectiveDraft.sections.length > 0
    ? effectiveDraft.sections
    : [
        { id: "intro-placeholder", title: "Introduction", slug: "intro", content: "" },
        { id: "body-placeholder", title: "Experience", slug: "body", content: "" },
        { id: "closing-placeholder", title: "Closing", slug: "closing", content: "" },
      ];
```

This ensures the editor always has 3 visible cards, even with no draft yet.

---

### Step 2.3 – Render ContentCards with loading state

Where you currently render ContentCards, change to:

```typescript
{sections.map(section => (
  <ContentCard
    key={section.id}
    title={section.title}
    content={section.content || ""}
    isLoading={isStreaming && !hasDraftFromStreaming}
    loadingMessage={
      isStreaming && !hasDraftFromStreaming
        ? `Drafting ${section.title.toLowerCase()}…`
        : undefined
    }
    // Keep all existing props and handlers
  />
))}
```

This gives:

- Real layout immediately
- Shimmer while streaming and no draft yet
- Real content appears once `draftFromStreaming` exists

---

### Step 2.4 – Wire metrics, requirements, and gaps from jobState.result

**Metrics for MatchMetricsToolbar:**

```typescript
const enhancedMatchData =
  coverLetterResult?.metrics ?? effectiveDraft?.enhancedMatchData;
```

Pass to toolbar:

```typescript
<MatchMetricsToolbar
  enhancedMatchData={enhancedMatchData}
  isLoading={isStreaming && !coverLetterResult?.metrics}
  // preserve existing props
/>
```

**Requirements:**

```typescript
const requirementData =
  coverLetterResult?.requirements ?? effectiveDraft?.requirements;
// Pass requirementData wherever requirements are needed.
```

**Section gaps** (inside helper such as `getSectionGapInsights`):

```typescript
const getSectionGapInsights = (sectionId: string, sectionSlug: string) => {
  if (!coverLetterResult?.sectionGaps) {
    return {
      promptSummary: null,
      gaps: [],
      isLoading: isStreaming,
    };
  }
  
  // Existing logic to map sectionSlug/sectionId into gaps,
  // but driven by coverLetterResult.sectionGaps instead of draft.enhancedMatchData
};
```

**Important:**

- Prefer `coverLetterResult` (streaming) data
- Fall back to `effectiveDraft` for non-streaming paths

---

### Step 2.5 – Remove separate skeletons from CreateModal/EditModal

In `CoverLetterCreateModal.tsx` and `CoverLetterEditModal.tsx`:

1. Remove early returns that render a separate skeleton, such as:

```typescript
if (!draft && isGenerating) {
  return <CoverLetterSkeleton … />;
}
```

2. Ensure these modals always render:

```typescript
<CoverLetterDraftEditor
  draft={draft}
  isStreaming={isJobStreaming}
  jobState={jobState}
  // callbacks
/>
```

DraftEditor now owns skeleton behavior via `isStreaming` and `jobState`.

---

### Step 2.6 – Verify Phase 2

**Manual checks:**

- Start streaming generation:
  - Editor layout appears immediately
  - ContentCards show shimmer and loading messages
  - Metrics and gap banners update as streaming stages complete
  - Final draft text appears without a layout jump
- Existing features (edit, library, add/remove sections) still work once draft is available

If all of this works and no crashes occur (null guards in place), Phase 2 is complete.

---

## PHASE 3 – UNIFY CREATE AND EDIT MODALS

### Goal

Replace separate Create and Edit modals with a single `CoverLetterModal` component that:

- Has a `mode` prop: `"create" | "edit"`
- Shows "Job Description" tab only in create mode
- Always shows "Draft" tab with `CoverLetterDraftEditor`

### Files Involved

- `CoverLetterCreateModal.tsx`
- `CoverLetterEditModal.tsx`
- **New**: `CoverLetterModal.tsx`
- **Optional**: `CoverLetterFinalizeDialog.tsx` (for preview/copy/export)

### Phase 3 Constraints

- No backend changes
- Do not remove DraftEditor
- Callers should be able to swap to CoverLetterModal without huge changes

---

### Step 3.1 – Create unified CoverLetterModal.tsx

**New file**: `CoverLetterModal.tsx`

Define:

```typescript
interface CoverLetterModalProps {
  mode: "create" | "edit";
  existingDraft?: CoverLetterDraft | null;
  jobDescription?: JobDescriptionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  // other props as needed (user, jobDescriptionId, etc.)
}

export function CoverLetterModal({
  mode,
  existingDraft,
  jobDescription,
  isOpen,
  onClose,
  ...rest
}: CoverLetterModalProps) {
  // Manage shared state used by both modes:
  // - local draft state (if needed)
  // - selectedTemplateId
  // - jobState, isJobStreaming
  // - isGenerating, errors, etc.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <Tabs defaultValue={mode === "create" ? "job-description" : "draft"}>
        {mode === "create" && (
          <TabsContent value="job-description">
            {/* Job description entry, parse, and "Generate" button that starts streaming */}
          </TabsContent>
        )}
        <TabsContent value="draft">
          <CoverLetterDraftEditor
            draft={existingDraft ?? draft}
            isStreaming={isJobStreaming}
            jobState={jobState}
            // pass all editor callbacks
          />
        </TabsContent>
      </Tabs>
    </Dialog>
  );
}
```

This component owns:

- Starting the streaming job in create mode
- Passing `jobState`/`isStreaming`/`draft` down to DraftEditor
- Toggling tabs

---

### Step 3.2 – Update existing usages to wrap new CoverLetterModal

**Option A (incremental):**

1. In `CoverLetterCreateModal.tsx`:

```typescript
export function CoverLetterCreateModal(props) {
  return (
    <CoverLetterModal
      mode="create"
      jobDescription={props.jobDescription}
      existingDraft={null}
      isOpen={props.isOpen}
      onClose={props.onClose}
      // map any other props as needed
    />
  );
}
```

2. In `CoverLetterEditModal.tsx`:

```typescript
export function CoverLetterEditModal(props) {
  return (
    <CoverLetterModal
      mode="edit"
      existingDraft={props.draft}
      jobDescription={props.jobDescription}
      isOpen={props.isOpen}
      onClose={props.onClose}
      // map any other props as needed
    />
  );
}
```

This keeps external callers unchanged while internally routing everything through `CoverLetterModal`.

**Option B (direct):**

- Replace all usages of `CoverLetterCreateModal` and `CoverLetterEditModal` in the app with direct `CoverLetterModal` calls
- Then delete the old wrappers

---

### Step 3.3 – Simplify or remove redundant components

After `CoverLetterModal` is stable:

**Delete or deprecate:**

- `CoverLetterRatingTooltip.tsx` (replaced by MatchMetricsToolbar)
- `CoverLetterViewModal.tsx` (finalization should be a simpler dialog)
- `CoverLetterSkeleton.tsx` (skeleton is now inline in DraftEditor)

**Create `CoverLetterFinalizeDialog.tsx`** (if needed) as a small, read-only preview:

- Uses the same draft data to show final text
- Provides copy/download/share actions
- No editing, no streaming

---

### Step 3.4 – Verify Phase 3

**Manual checks:**

- Create flow:
  - Can enter/parse JD
  - Can generate streaming draft
  - Can switch between "Job Description" and "Draft" tabs
  - DraftEditor behaves as in Phase 2
- Edit flow:
  - Opens directly to "Draft" tab
  - Loads `existingDraft` properly
  - All editing features available
- Streaming still works exactly as in Phase 2
- No regressions in finalize/export behavior

If all of the above checks out, the refactor is complete: one modal, one editor, clean streaming integration.

---

## SUMMARY

**Phase 1** – Extract shared DraftEditor without changing behavior.

**Phase 2** – Move skeleton + streaming logic into DraftEditor so it's one layout with multiple states and a single source of truth (`jobState.result` + `effectiveDraft`).

**Phase 3** – Unify Create and Edit into `CoverLetterModal` that uses the shared editor, and clean up redundant components.

### Total Outcome

- 3–4 core files instead of 7+
- Streaming wired in exactly one place (DraftEditor)
- Skeleton is no longer a separate UI; it's just the editor in "loading" mode
- Much simpler mental model for future changes

---

## File Structure Before vs After

### Before (Current)
```
src/components/cover-letters/
├── CoverLetterCreateModal.tsx    (1765 lines)
├── CoverLetterEditModal.tsx      (1033 lines)
├── CoverLetterDraftView.tsx      (shared editor logic)
├── CoverLetterSkeleton.tsx       (separate loading UI)
├── CoverLetterViewModal.tsx      (preview/finalize)
├── CoverLetterRatingTooltip.tsx  (deprecated metrics)
├── CoverLetterFinalization.tsx   (export/finalize logic)
```

### After (Target)
```
src/components/cover-letters/
├── CoverLetterModal.tsx          (unified create/edit, ~400 lines)
├── CoverLetterDraftEditor.tsx    (all editor logic, ~600 lines)
├── CoverLetterFinalizeDialog.tsx (simple preview, ~200 lines)
```

**Lines saved**: ~2000 lines  
**Complexity reduction**: ~60%  
**Streaming integration points**: 1 (vs 3+)

