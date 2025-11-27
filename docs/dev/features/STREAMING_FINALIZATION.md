STREAMING_FINALIZATION_PLAN.txt

TITLE: Streaming Integration Plan (Backend + Frontend)
GOAL: Add streaming UX (skeleton + live metrics/gaps) WITHOUT changing draft generation or breaking existing Create/Edit flows.

STATUS: Approved design. Ready to execute.

⸻

PHASE 0 — BASELINE PRESERVATION (DO NOT BREAK)

OBJECTIVE:
Freeze the currently working Create/Edit cover-letter behavior as the baseline. Streaming must NOT change:
	•	How drafts are generated
	•	How sections are structured
	•	How enhancedMatchData is constructed
	•	How Edit and Create work today

ACCEPTANCE CRITERIA:
	1.	generateDraft(…) remains the single source of truth for creating cover-letter drafts.
	2.	The UI displays identical draft content and section structure with streaming disabled.
	3.	No backend stage writes to cover_letters except generateDraft.
	4.	Streaming pipeline IS NOT allowed to generate or insert section text.

AGENT STEPS:
	1.	Checkout a fresh branch from main.
	2.	Add a small test harness that calls generateDraft directly with known inputs.
	3.	Confirm that the resulting draft sections match the template exactly.
	4.	Confirm that enhancedMatchData is populated correctly.
	5.	Commit a minimal tag: BASELINE_CONFIRMED.

⸻

PHASE 1 — BACKEND PREPARATION (PIPELINE = ANALYSIS ONLY)

OBJECTIVE:
Fix the streaming pipeline so that it ONLY returns:
	•	metrics
	•	requirements
	•	gaps / section gap mapping
	•	match plan
It must NOT write a draft or create sections.

BEFORE:
draftGenerationStage incorrectly inserts 1 section with the entire LLM output.

AFTER:
Pipeline contains only:
	•	basicMetricsStage
	•	requirementAnalysisStage
	•	sectionGapsStage

ACCEPTANCE CRITERIA:
	1.	draftGenerationStage is removed from the pipeline.
	2.	Streaming job result contains ONLY analysis: metrics, requirements, gaps.
	3.	No new rows in cover_letters are created by the pipeline.
	4.	No section text is generated or saved by the backend.

AGENT STEPS:
	1.	Open supabase/functions/_shared/pipelines/cover-letter.ts.
	2.	Remove draftGenerationStage entirely.
	3.	Ensure the pipeline returns a JSON object shaped like:
{ metrics, requirements, sectionGaps, matchPlan }
	4.	Add logging for each stage completion.
	5.	Deploy functions.
	6.	Test locally via curl calling create-job; confirm 200 with expected structure.
	7.	Commit as PHASE1_BACKEND_ANALYSIS_ONLY.

⸻

PHASE 2 — FRONTEND: REAL SKELETON ARCHITECTURE

OBJECTIVE:
Render the actual Draft Editor layout during streaming using skeletons.
No alternate UI.
No “Generate your draft first…” dead states.

STRUCTURAL RULE:
CoverLetterDraftEditor ALWAYS renders.
Skeleton styling is driven by:
	•	isStreaming
	•	draft === null

ACCEPTANCE CRITERIA:
	1.	Remove early returns like “Generate a draft first…” from DraftEditor or Modal.
	2.	DraftEditor receives these props:
	•	draft (may be null)
	•	templateSections (from selected template)
	•	isStreaming
	•	jobState
	3.	When draft is NULL and isStreaming is TRUE:
	•	Render a skeleton using templateSections (correct titles)
	•	Each card has loading pulse + “Analyzing…” text
	4.	When draft arrives:
	•	Cards fill with real text with zero DOM swap (same component)
	5.	MatchMetricsToolbar, gap banners, requirements badges render skeleton or streaming values BEFORE draft exists.

AGENT STEPS:
	1.	Modify CoverLetterDraftEditor so it accepts:
draft, isStreaming, jobState, templateSections.
	2.	Implement safe fallback:
If draft exists → draft.sections
Else → templateSections with empty content
	3.	Replace content with shimmer placeholders when:
isStreaming == true AND draft == null
	4.	Ensure all subcomponents check both draft AND jobState.
	5.	Commit as PHASE2_REAL_SKELETON.

⸻

PHASE 3 — FRONTEND STREAMING WIRING (NO DRAFT GENERATION IN PIPELINE)

OBJECTIVE:
Wire streaming into Create flow without changing how drafts are generated.

CREATE FLOW RULES:
	1.	On Generate (BOTH START IMMEDIATELY):
	•	Start streaming job (analysis only)
	•	Start generateDraft(…) in parallel
	•	No dependencies between them
	2.	jobState will stream metrics and gaps into the UI.
	3.	generateDraft(…) produces the final draft sections/content.
	4.	UI updates in this sequence:
a. Immediately → Skeleton (based on template)
b. 1-10s → Metrics + Requirements arrive (from jobState)
c. 5-20s → Gaps arrive (from jobState)
d. 20-45s → Draft from generateDraft arrives → sections fill fully

DATA PRIORITY RULES:
	1.	Section text: ALWAYS from draft.sections (NEVER from jobState)
	2.	Metrics: draft.enhancedMatchData.metrics OR jobState.result.metrics (draft takes precedence)
	3.	Gaps: draft.enhancedMatchData.sectionGapInsights OR jobState.result.sectionGaps (draft takes precedence)
	4.	Streaming controls skeleton states; draft controls authoritative content

ACCEPTANCE CRITERIA:
	1.	useCoverLetterJobStream is called only once per Generate click.
	2.	generateDraft(…) is called EXACTLY as before (no new parameters).
	3.	Both start immediately in parallel (no waiting).
	4.	jobState updates visually update:
	•	MatchMetricsToolbar
	•	Gap banners
	•	Section-level "requirements met" counts
	5.	When generateDraft finishes:
	•	draft is stored in state
	•	isStreaming may still be true if some analysis remains, but draft takes precedence for all content
	6.	No breakage in Edit:
	•	DraftEditor receives draft immediately
	•	No skeleton unless the user triggers "re-analyze" manually

AGENT STEPS:
	1.	In CoverLetterModal’s handleGenerate:
	•	Call createJob(…) with jobDescriptionId, templateId.
	•	Immediately call generateDraft(…) and set draft upon completion.
	2.	Pass isStreaming and jobState to DraftEditor.
	3.	In DraftEditor:
	•	If draft exists → ignore jobState for section text
	•	If draft missing → jobState drives skeleton and metrics
	4.	In MatchMetricsToolbar:
	•	If draft.enhancedMatchData exists, use it.
	•	Else if jobState.result exists, use streaming metrics.
	•	Else show skeleton badges.
	5.	Commit as PHASE3_STREAMING_WIRED.

⸻

PHASE 4 — EDIT FLOW PRESERVATION

OBJECTIVE:
Ensure Edit Cover Letter remains fully functional and unaffected by streaming.

RULES:
	•	Edit should load draft immediately.
	•	Edit should not show skeleton unless “Re-analyze JD” is manually triggered.
	•	No forced re-analysis on open.

ACCEPTANCE CRITERIA:
	1.	Opening Edit loads:
	•	Stored draft.sections
	•	Stored enhancedMatchData
	•	Stored requirements and gaps
	2.	No streaming job is started by default.
	3.	User MAY trigger re-analysis:
	•	Sections momentarily show skeleton
	•	jobState refreshes metrics/gaps
	•	Draft content stays unchanged (unless HIL is used).

AGENT STEPS:
	1.	Review CoverLetterEditModal.
	2.	Ensure no useCoverLetterJobStream is called automatically.
	3.	Expose a manual “Reanalyze” button (optional).
	4.	Test full Edit flow with no regressions.
	5.	Commit as PHASE4_EDIT_PRESERVATION.

⸻

PHASE 5 — VALIDATION AND PARITY CHECK

OBJECTIVE:
Guarantee that final system produces STRUCTURALLY EQUIVALENT drafts as today.

STRUCTURAL EQUIVALENCE DEFINED:
	•	Same number of sections
	•	Same section ordering and types (intro/body/closing)
	•	Same section IDs/slugs
	•	Same template structure
	•	Same enhancedMatchData shape (metrics, gaps, requirement IDs)
	•	Content may vary slightly in wording (LLM variance is acceptable)

ACCEPTANCE CRITERIA:
	1.	generateDraft with the same JD + template produces:
	•	Structurally identical sections
	•	Semantically equivalent content
	•	Same enhancedMatchData structure
	2.	Streaming does NOT modify draft contents.
	3.	UI displays the same result once the draft has loaded.
	4.	No new DB rows from streaming pipeline.

AGENT STEPS:
	1.	Run generateDraft for a few known inputs.
	2.	Compare output structure (not byte-for-byte text) with baseline.
	3.	Test Create with streaming enabled → confirm same structure.
	4.	Test Edit → confirm identical draft rendering.
	5.	Commit as PHASE5_VALIDATED.

⸻

PHASE 5.5 — FUTURE OPTIMIZATION (NOT FOR MVP)

OBJECTIVE:
Optional enhancement for later: allow generateDraft to reuse streaming analysis results.

STATUS: DEFERRED - DO NOT IMPLEMENT BEFORE STREAMING MVP IS STABLE

WHY DEFERRED:
	•	generateDraft already produces metrics, gaps, and enhancedMatchData
	•	Passing streaming results creates new coupling between FE and BE
	•	Increases regression risk and debugging complexity
	•	Not needed for streaming UX functionality
	•	Only provides optimization, not new capability

IF IMPLEMENTED LATER:
	1.	Add optional parameter: generateDraft(jd, template, precomputedAnalysis?)
	2.	If precomputedAnalysis exists, skip redundant analysis steps
	3.	If not provided, compute analysis as today (backward compatible)
	4.	MUST NOT change output structure or semantics
	5.	Test both code paths produce structurally equivalent results

AGENT RULE:
DO NOT implement Phase 5.5 until:
	•	All other phases are complete and stable
	•	MVP has been in production for at least 2 weeks
	•	Explicit approval is given to proceed

⸻

PHASE 6 — CLEANUP AND LOGGING

OBJECTIVE:
Remove cruft and ensure logging isn’t noisy.

AGENT STEPS:
	1.	Remove temporary console logs.
	2.	Keep INFO logs in useJobStream only for:
	•	job creation
	•	job state updates
	•	final results
	3.	Remove old skeleton components if unused.
	4.	Ensure one skeleton logic pathway exists (inside DraftEditor).

⸻

PHASE 7 — READY FOR BETA

SUCCESS CRITERIA:
	•	Streaming + skeleton UI feels responsive.
	•	Draft generation produces EXACTLY the same result as before.
	•	Edit and Create are both stable.
	•	No regressions in HIL, Insert from Library, gap banners, match metrics.