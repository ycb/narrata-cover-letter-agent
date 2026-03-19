# Cover Letter Phase B Recovery ExecPlan

This ExecPlan documents the RCA-driven recovery of cover letter Phase B so the implementation, verification, and rollout are traceable inside the repo.

## Purpose / Big Picture

Cover letter generation regressed in four connected ways:

- Browser-side OpenAI calls left `[LLM: ...]` tokens unresolved once `VITE_OPENAI_API_KEY` was removed.
- Phase B persisted success-shaped empty payloads, which made gap count `0` and overall score `null` look like valid results.
- Readiness failures rendered as permanent skeleton UI instead of explicit unavailable/error states.
- Story selection allowed reuse and hid diagnostics, so repeated stories appeared without an explainable selection trail.

This recovery moves all Phase B post-processing to a Supabase Edge Function, makes stage status explicit, enforces no story reuse inside a draft, and adds regression tests for the failing paths.

## Progress

- [x] (2026-03-19) Added `cover-letter-phase-b` edge function scaffolding plus shared server helper for slot fill, metrics, requirement analysis, section gaps, and content standards.
- [ ] Wire `CoverLetterDraftService` to invoke Phase B server-side for `full`, `section-gaps`, and `slots-only` flows.
- [ ] Replace readiness and toolbar null/skeleton heuristics with explicit pending/error/disabled states.
- [ ] Enforce hard no-reuse story selection and persist diagnostics on every selected or fallback dynamic section.
- [ ] Add regression tests and run targeted verification.

## Plan Of Work

### Milestone 1: Server-side Phase B

- Keep all OpenAI-dependent cover-letter post-processing on the server.
- Use one edge function, `supabase/functions/cover-letter-phase-b`, to run template slot fill and Phase B analyses.
- Persist `llm_feedback.phaseB` with `pending | success | error | skipped` stage states.

### Milestone 2: Browser integration

- Update `src/services/coverLetterDraftService.ts` so browser code invokes the edge function instead of calling OpenAI directly.
- Preserve explicit error persistence when the edge function invocation itself fails before the server can update draft state.
- Keep background draft polling aware of terminal `phaseB.sectionGaps.status` so the UI stops loading on both success and failure.

### Milestone 3: UX correctness

- Update `src/hooks/useDraftReadiness.ts` to expose `ready | pending | error | disabled`.
- Update `src/components/cover-letters/MatchMetricsToolbar.tsx` so:
  - pending renders skeletons,
  - success shows real values,
  - failures show `Unavailable`,
  - disabled readiness is hidden/disabled consistently.
- Add a collapsed diagnostics surface in `src/components/cover-letters/CoverLetterDraftEditor.tsx` for story selection metadata.

### Milestone 4: Story selection

- Enforce strict no-reuse in `buildSections` / `pickBestStory`.
- Persist diagnostics for all dynamic sections, including fallback cases.
- Record degraded JD context in diagnostics so low-signal matching is explainable.

### Milestone 5: Verification

- Add unit coverage for:
  - server-side readiness status handling,
  - overall score/gaps unavailable states,
  - strict no-reuse story selection.
- Run the targeted Vitest suite for the touched hooks/components/services.

## Validation

- No browser OpenAI key is required for cover-letter slot fill or Phase B.
- A failed section-gap run does not persist `sectionGapInsights: []` as a fallback success.
- Overall Score and Readiness render either a real value, a skeleton while pending, or an explicit unavailable state on failure.
- Dynamic sections never reuse the same story inside one draft.
