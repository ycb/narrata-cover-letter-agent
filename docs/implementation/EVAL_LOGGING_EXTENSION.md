# Evaluations Dashboard Extension – Draft Cover Letter MVP

## Objectives
- Provide full observability for draft cover letter generation and refinement.
- Track JD parsing quality, draft quality metrics, and HIL interactions.
- Feed existing evaluations dashboard with structured events so product/ML teams can analyze success metrics and regressions.

## Event Streams

| Event | Trigger | Required payload | Notes |
| --- | --- | --- | --- |
| `jd.parse.completed` | JD ingestion finishes (paste or future URL) | `userId`, `jobDescriptionId`, raw text checksum, structured insights (company, role, requirements), differentiator summary, timing metadata | Allows validation of parser quality; persists structured JD snapshot |
| `cover_letter.generate.started` | User clicks “Generate cover letter” | `userId`, `jobDescriptionId`, `templateId`, request id | Emit once before streaming tokens |
| `cover_letter.generate.tokens` | Each chunk streamed from LLM | `requestId`, `sequence`, partial text, timestamp | Optional sampling (e.g., log every Nth chunk) to keep payload size manageable |
| `cover_letter.generate.completed` | Draft + metrics persisted | `requestId`, `draftId`, metrics (ATS, goals, experience, rating, requirements), differentiator coverage, timing, success flag | Dashboard plots overall quality and latency |
| `hil.gap_analysis.completed` | Gap analysis re-run (initial + post edits) | `draftId`, `analysisId`, gap counts, applied suggestions, auto-tags, timing | Needed to understand remaining gaps |
| `hil.content.update` | Section edited via HIL (story/saved/paragraph) | `draftId`, `sectionId`, `contentSource`, action (`ai_suggest`, `manual_edit`, `apply_suggestion`), word deltas, gap coverage | Allows downstream evaluation of HIL effectiveness |
| `cover_letter.finalize.completed` | Draft finalized | `draftId`, metrics snapshot, differentiator coverage, word count | Compare final vs initial quality |

## Transport
- Reuse existing logging pipeline (`/api/internal/log-event` → warehouse).
- Add thin client wrappers in:
  - `JobDescriptionService.parseAndCreate`
  - `CoverLetterDraftService.generateDraft` & `finalizeDraft`
  - `useHilGapAnalysis` + HIL action handlers (MainHILInterface / panels)
- Ensure errors emit `...failed` events with `errorCode`.

## Dashboard Updates
1. **Generation Overview tab**
   - Success vs. failure rate per template
   - Median latency from click → draft
   - Box plots for ATS / rating before & after HIL edits

2. **JD Parser Quality**
   - Top differentiator tags frequency
   - Parser error rate
   - Heatmap of missing required fields

3. **HIL Effectiveness**
   - Number of gap suggestions vs. applied suggestions
   - Word count deltas by content source (story/saved/paragraph)
   - Gap closure rate (initial gaps vs. final gaps)

4. **Finalization Funnel**
   - Drop-off between draft generated → final saved
   - Average time spent in HIL workflow

## Recommendation
Implement logging in a **parallel instrumentation branch** to avoid blocking ongoing feature work:
- Feature branch continues to swap out mock metrics/gaps.
- Instrumentation branch adds logging hooks + dashboard queries.
- Merge both before QA freeze so dashboards represent real data during acceptance tests.

## Open Questions
- Do we need redaction of any JD content before logging? (If yes, apply hashing/PII scrub on payloads.)
- Should we sample token logs to reduce volume? (Default: log first token, every 10th token, and final token.)
- How do we correlate HIL events with user satisfaction? (Potential follow-up: integrate feedback prompts.)
