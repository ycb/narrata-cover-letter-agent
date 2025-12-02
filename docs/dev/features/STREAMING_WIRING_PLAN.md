BEGIN FILE: cover_letter_streaming_wiring_plan.txt

COVER LETTER STREAMING WIRING PLAN – USING NEW ARCHITECTURE
Goal: connect working streaming backend to unified frontend (CoverLetterModal + CoverLetterDraftEditor)
Date: 2025-11-26

==================================================
OVERVIEW

Assumptions:
	•	Backend streaming pipeline for cover letters is fully working and QA’d.
	•	Streaming job runs stages in order: basicMetrics → requirementAnalysis → sectionGaps → draftGeneration.
	•	Job results are exposed to the frontend via a generic streaming hook (for example: useJobStream or useCoverLetterJobStream).
	•	The refactor to the new architecture is complete or in progress:
	1.	CoverLetterModal.tsx – unified create/edit modal
	2.	CoverLetterDraftEditor.tsx – shared editor (ContentCards + metrics)
	3.	CoverLetterFinalizeDialog.tsx – read-only preview / finalize

High-level goals:
	•	Create flow: “Generate” starts a streaming job instead of a blocking call.
	•	DraftEditor: reads streaming data from jobState.result, and uses isStreaming to show skeleton, metrics, gaps, and final text.
	•	Edit flow: continues to work with existing drafts but can display updated gaps/metrics if a streaming job is run.
	•	All streaming logic is localized in two places:
	•	CoverLetterModal: job creation and owning jobState
	•	CoverLetterDraftEditor: rendering skeleton + streaming data

Phased plan:
	•	Phase 1: Wire streaming hook into CoverLetterModal (create mode)
	•	Phase 2: Make CoverLetterDraftEditor consume streaming jobState.result
	•	Phase 3: UX polish, error handling, and future extension hooks

Each phase should end in a working, testable state. Backend remains untouched.

==================================================
PHASE 1 – WIRE STREAMING HOOK INTO COVERLETTERMODAL

Goal:
CoverLetterModal in create mode should:
	•	Start a streaming job when the user clicks “Generate”.
	•	Hold jobState and isStreaming in its local state via the streaming hook.
	•	Pass jobState and isStreaming to CoverLetterDraftEditor.
	•	Stop using any legacy synchronous draft-generation call for the streaming path.

Files involved:
	•	CoverLetterModal.tsx (primary)
	•	Possibly a small wrapper hook: useCoverLetterJobStream (if not already wired)

Phase 1 constraints:
	•	Do not change any backend files.
	•	Do not modify the streaming pipeline definition.
	•	Do not introduce a second draft-generation call (no extra generateDraft invocation after streaming).

Step 1.1 – Import and initialize streaming hook in CoverLetterModal

In CoverLetterModal, add an import for the streaming hook (for example: useCoverLetterJobStream).

Inside the modal component, initialize the hook with appropriate polling interval and timeout. The hook should return:
	•	jobState: current JobState for this cover letter job
	•	isStreaming (or equivalent boolean): true while job is running or streaming
	•	createJob: function to start a cover letter streaming job
	•	error: any streaming-related error

This hook must be the single source of streaming state for the modal.

Step 1.2 – Replace blocking “Generate” call with streaming job

In create mode, find the handler that currently runs the blocking draft generation (for example: handleGenerateDraft). Replace or wrap its logic so that:
	•	When the user clicks “Generate”:
	•	Validate preconditions (user, job description, template).
	•	Call createJob with the necessary payload (for example, jobType: “coverLetter”, templateId, jobDescriptionId).
	•	Set any local flags such as isGenerating to true if needed.

Important:
	•	Do not call the old blocking draft generator in this path.
	•	Do not attempt to immediately load a draft from Supabase via a draftId from jobState.result.
	•	The streaming pipeline is responsible for producing the draft; the UI will react to jobState updates.

Step 1.3 – Pass streaming state into DraftEditor

CoverLetterModal should always render the draft tab with CoverLetterDraftEditor.

In the props passed to CoverLetterDraftEditor:
	•	Provide an existingDraft value (for example, existingDraft in edit mode, or locally managed draft state in create mode, if you still use one).
	•	Provide isStreaming (true when the streaming job is running).
	•	Provide jobState (so the editor can read jobState.result).

Example in words:
	•	DraftEditor should receive three core context props:
	•	draft: the existing draft object or null
	•	isStreaming: a boolean flag indicating whether the streaming job is currently in progress
	•	jobState: the full streaming job state from the hook, including the result subtree

At the end of Phase 1:
	•	Clicking “Generate” starts a streaming job.
	•	CoverLetterModal owns jobState and isStreaming.
	•	DraftEditor receives these values but may not yet react to them (that happens in Phase 2).
	•	The rest of the UI should still function using the old draft state.

==================================================
PHASE 2 – MAKE DRAFTEDITOR CONSUME STREAMING RESULT

Goal:
CoverLetterDraftEditor should:
	•	Show a real skeleton by default (same layout, but loading state) when isStreaming is true and no streaming draft exists yet.
	•	Read data directly from jobState.result:
	•	metrics for MatchMetricsToolbar
	•	requirements for requirement badges
	•	gaps for gap banners
	•	draft sections for ContentCards
	•	Use a clear priority order for the draft:
	•	Use streaming draft (from jobState.result.draft) if present
	•	Otherwise use existingDraft passed from CoverLetterModal
	•	Avoid loading drafts from Supabase during streaming.

Files involved:
	•	CoverLetterDraftEditor.tsx (primary)
	•	Minor cleanup in CoverLetterModal.tsx (if old skeleton logic exists there)

Phase 2 constraints:
	•	No backend changes.
	•	No separate draft load from the database based on jobState.result.
	•	No redundant generation call in the frontend.
	•	All streaming-related UI logic must live in DraftEditor, not scattered across multiple components.

Step 2.1 – Derive streaming result inside DraftEditor

Inside CoverLetterDraftEditor, use the jobState prop to derive:
	•	coverLetterResult: a typed view of jobState.result (for example, containing metrics, requirements, sectionGaps, and draft).
	•	draftFromStreaming: coverLetterResult.draft if present.
	•	effectiveDraft: streaming draft if present; otherwise the draft passed in by parent; otherwise null.
	•	a boolean hasDraftFromStreaming: true when streaming draft exists and has at least one section.
	•	a local isStreaming flag: true when props.isStreaming is true.

This gives the editor a single, coherent view:
	•	effectiveDraft is what the editor should render when it has content.
	•	coverLetterResult is where all streaming data (metrics, gaps, etc.) comes from.

Step 2.2 – Always define sections, with placeholders

Before mapping over sections, derive a sections array:
	•	If effectiveDraft has sections, use those sections.
	•	If not, create a placeholder list (for example: Introduction, Experience, Closing) with empty content.

The editor should always render section cards, even with no draft data yet. This is the basis for the real skeleton.

Step 2.3 – Render ContentCards with skeleton behavior

For each section in sections, render a ContentCard with:
	•	The section title and content from the section.
	•	Loading behavior based on streaming state:
	•	Use isStreaming and hasDraftFromStreaming to decide whether this card is in loading mode.
	•	In loading mode, ContentCard should show shimmer or “Drafting …” text, but keep the same layout.

Example rule in words:
	•	If isStreaming is true and there is no streaming draft yet, ContentCards should show their loading state instead of real text.
	•	Once the streaming draft appears in jobState.result, effectiveDraft is populated, and ContentCards should show real content.

Step 2.4 – Bind metrics from streaming result

Where the editor currently uses draft.enhancedMatchData or similar for metrics:
	•	Define enhancedMatchData as:
	•	First preference: coverLetterResult.metrics
	•	Second preference: effectiveDraft.enhancedMatchData (for legacy or non-streaming paths)

Pass this enhancedMatchData into MatchMetricsToolbar, along with an isLoading flag derived as:
	•	true if isStreaming is true and coverLetterResult.metrics is not yet available.
	•	false otherwise.

This allows the metrics toolbar to:
	•	Show a loading state during early stages of streaming.
	•	Automatically update when the basicMetrics stage completes.
	•	Fall back to legacy draft-based metrics when no streaming job is running.

Step 2.5 – Bind requirements and gaps from streaming result

Similarly, for requirements and gaps:
	•	Define requirementData as:
	•	First preference: coverLetterResult.requirements
	•	Second preference: effectiveDraft.requirements
	•	For gaps (sectionGapInsights or similar), use coverLetterResult.sectionGaps first.
	•	If no sectionGaps are available and isStreaming is true, return a loading state for that section (for example, an empty gaps list with an isLoading flag).
	•	Once sectionGaps arrive, render gap banners from that data.

Where you have helper functions such as getSectionGapInsights, ensure they:
	•	Use coverLetterResult.sectionGaps as the primary data source.
	•	Have a clear default path when no gaps are present yet (isStreaming determines whether this is loading vs “no gaps”).

Step 2.6 – Remove separate skeleton logic from modal

If CoverLetterModal or any other component still contains early-return logic such as:
	•	“if (!draft && isGenerating) show a separate skeleton component”,

remove this logic. The editor itself should always render and handle the skeleton state.

After this change:
	•	CoverLetterModal simply passes draft, isStreaming, and jobState to DraftEditor.
	•	DraftEditor is the single place that knows how to show loading vs loaded UI.

Step 2.7 – Verify Phase 2

Manual checks (create flow):
	•	Click “Generate”:
	•	The draft tab shows the editor layout immediately (no blank screen).
	•	Section cards show skeleton/shimmer while streaming is in progress.
	•	As the job progresses:
	•	Metrics appear/refresh when the basicMetrics stage completes.
	•	Requirements and gaps appear as their stages complete.
	•	Final section content appears when draftGeneration completes.
	•	There is no layout “jump” from a skeleton component to a different editor layout.
	•	Existing editing behavior (editing cards, using library, etc.) continues to work once the draft is available.

Manual checks (edit flow):
	•	Existing drafts load and render through DraftEditor as before.
	•	If you trigger a streaming job for an existing draft (if such flows exist), streaming updates from jobState.result should reflect in the metrics/gaps without breaking the editor.

==================================================
PHASE 3 – UX POLISH, ERROR HANDLING, AND FUTURE EXTENSION

Goal:
Refine the streaming UX and prepare the pattern for reuse in other job types (onboarding, PM levels).

Files involved:
	•	CoverLetterModal.tsx
	•	CoverLetterDraftEditor.tsx
	•	Optional: a shared status or debug component (for example: StreamingProgressBanner)

Constraints:
	•	No backend changes.
	•	Keep streaming wiring localized.

Step 3.1 – Progress banner and stage visualization

In CoverLetterModal (or directly above the editor within the modal):
	•	Render a progress banner when isStreaming is true and jobState exists.
	•	Show:
	•	A spinner icon or subtle animation.
	•	A human-readable label indicating the current stage (for example: “Analyzing requirements…”, “Finding section gaps…”, “Drafting intro and body…”).
	•	A percentage if jobState.progress is provided.

Use jobState.stages to derive which stage is currently running, succeeded, or pending.

This gives users frequent feedback, even before the draft content arrives.

Step 3.2 – Error handling

Use the error value from the streaming hook and any jobState.error fields to:
	•	Display an inline Alert when the job fails.
	•	Provide a clear message (for example: “We couldn’t generate your draft. Please try again.”).
	•	Stop isStreaming and allow the user to retry or edit manually.

Avoid leaving the UI in a “half-loading” state when an error occurs.

Step 3.3 – Fallback behavior

Decide and implement a fallback strategy such as:
	•	If the streaming job fails before draftGeneration:
	•	Keep any metrics/gaps that did arrive (if partial results are acceptable).
	•	Optionally allow a user to run a manual (non-streaming) draft generation as a backup.
	•	If the streaming job fails after the draft exists:
	•	Maintain the draft in the editor.
	•	Only show an error regarding incomplete analysis/metrics, if relevant.

The fallback logic should live in CoverLetterModal, with DraftEditor remaining mostly presentational.

Step 3.4 – Prepare pattern for other job types

Once streaming is successfully wired and stable for cover letters:
	•	Confirm that useJobStream or equivalent is generic enough to support other job types (for example: “onboarding” and “pmLevels”).
	•	Record the pattern in a short internal note:
	•	Parent component owns jobState and job creation.
	•	Child “editor” component consumes jobState.result and isStreaming, using a consistent skeleton pattern (placeholders + streaming result).
	•	Use the same pattern for:
	•	Onboarding: OnboardingModal + OnboardingEditor
	•	PM Levels: PmLevelsModal + PmLevelsReport

This avoids re-inventing streaming logic for each flow.

Step 3.5 – Final verification
	•	Confirm that the create flow:
	•	Feels responsive (layout appears immediately).
	•	Shows progressive, understandable updates.
	•	Ends with a complete, editable draft and correct metrics.
	•	Confirm that the edit flow:
	•	Is unaffected or improved (if metrics can be refreshed via streaming).
	•	Confirm that error states:
	•	Are visible but not catastrophic for the user.
	•	Allow recovery (retry, manual edit, etc.).

==================================================
SUMMARY

Phase 1:
	•	Wire the streaming hook into CoverLetterModal.
	•	Start streaming jobs on “Generate”.
	•	Pass jobState and isStreaming down to CoverLetterDraftEditor.

Phase 2:
	•	Make DraftEditor consume jobState.result for metrics, requirements, gaps, and draft sections.
	•	Implement real skeleton behavior inside DraftEditor (same layout, multiple states).
	•	Remove separate skeleton components from the modals.

Phase 3:
	•	Add progress banners, error handling, and fallback behavior.
	•	Document and reuse the pattern for onboarding and PM levels.

Outcome:
	•	Single editor component handles both loading and loaded states.
	•	Streaming integration is localized and maintainable.
	•	Backend stays untouched; frontend behavior becomes predictable and extensible.