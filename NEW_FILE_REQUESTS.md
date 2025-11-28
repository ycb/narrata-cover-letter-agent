# New File Requests

## 2025-11-12

- `supabase/migrations/20251112_cover_letter_mvp_updates.sql`: Searched existing cover-letter migrations in `supabase/migrations` (`*cover*letter*`, `*job_description*`) and confirmed none add structured job description data or cover letter analytics fields. Needed to add structured JSON, differentiator tagging metadata, workpad cache, and supporting indexes.

- `src/services/jobDescriptionService.ts`: Reviewed `src/services`, `src/lib`, and `src/utils` for any job description ingestion modules (`jobDescription`, `jobDescriptionService`, `parseJobPosting`) and found only `coverLetterParser.ts` plus resume parsers. New service required for streaming OpenAI parsing, requirement tagging, and persistence.

- `src/services/coverLetterDraftService.ts`: Checked `src/services` and `src/modules` for cover letter draft orchestration (`coverLetterDraft`, `draftService`, `generateCoverLetter`) and located only template CRUD utilities. Need a dedicated orchestrator handling matching, metrics, and resilience checkpoints.

- `src/hooks/useCoverLetterDraft.ts`: Searched `src/hooks` and `src/features/cover-letters` (`useCoverLetter`, `useDraft`, `useCoverLetterDraft`) and found no hook managing draft lifecycle. Adding a specialized hook to coordinate services, streaming progress, and regeneration.

- `src/components/cover-letters/MatchComponent.tsx`: Reviewed `src/components/cover-letters`, `src/components/metrics`, and `src/components/ui` for reusable match or ATS scorecards (`Match`, `Scorecard`, `MetricsSummary`) and confirmed only resume-focused widgets. Need a cover-letter-specific metrics component with tooltip insights.

- `src/services/__tests__/jobDescriptionService.test.ts`: Checked `src/services/__tests__` for coverage of job description parsing (`jobDescription`, `jdService`) and found none. Creating targeted unit tests for the new service.

- `src/services/__tests__/coverLetterDraftService.test.ts`: Looked under `src/services/__tests__` for draft generation tests (`coverLetterDraft`, `draftService`) and confirmed absence. Adding unit tests for the draft service logic.

- `src/hooks/__tests__/useCoverLetterDraft.test.tsx`: Searched `src/hooks/__tests__` and `src/features/cover-letters` for hook tests (`useCoverLetter`, `useDraft`) and found none. Need coverage for hook orchestration and streaming state.

- `src/components/cover-letters/__tests__/MatchComponent.test.tsx`: Reviewed `src/components/cover-letters/__tests__` and `src/components/__tests__` for match component tests and found no relevant files. Adding tests to validate metrics rendering and tooltips.

- `src/types/coverLetters.ts`: Checked `src/types` for cover letter domain models (`coverLetters`, `coverLetter`, `draftSections`) and found only resume/work history structures. Adding shared interfaces for draft sections, metrics, and job description parsing results.

- `src/services/evaluationLoggingService.ts`: Searched `src/services` and `src/utils` for centralized evaluation logging (`evaluationLogging`, `evalLogging`, `logEvaluation`) and found only direct Supabase inserts in FileUploadService and PMLevelsService. New service required for composition-friendly evaluation run creation, updates, token sampling, and failure tracking to support cover letter draft logging.

## 2025-11-15

- `src/components/cover-letters/useMatchMetricsDetails.ts`: Reviewed `src/components/cover-letters`, `src/hooks`, and `src/components/ui` for shared helpers or hooks around match metric data prep (`matchMetrics`, `metricsHook`, `useMatch`) and confirmed only inline logic inside `ProgressIndicatorWithTooltips`. Need a reusable hook that normalizes goal matches and requirement lists so multiple components can share identical data.

- `src/components/cover-letters/MatchMetricsToolbar.tsx`: Looked through `src/components/cover-letters` and `src/components/metrics` for toolbar/drawer-style match summaries (`Toolbar`, `Drawer`, `MatchToolbar`) and found only the tooltip-based `ProgressIndicatorWithTooltips`. A separate component is required to prototype the new horizontal toolbar with expandable drawers before swapping the legacy UI.

- `src/components/cover-letters/__tests__/MatchMetricsToolbar.test.tsx`: Checked `src/components/cover-letters/__tests__` for coverage of match metric UIs (`Match`, `MetricsToolbar`) and only saw modal/finalization tests. Need a dedicated test to verify toolbar interactions and drawer content rendering.

- `src/components/cover-letters/MatchMetricsToolbar.tsx`: Reviewed `src/components/cover-letters` and `src/components/ui` for horizontal toolbar + expandable drawer implementations (`Toolbar`, `MetricsPanel`, `Drawer`) and only found vertical tooltip-based UX. New component required to display metrics in a left toolbar with content drawers, replacing tooltip overlays for better accessibility and discoverability.

- `src/components/cover-letters/useMatchMetricsDetails.ts`: Checked `src/hooks` and `src/components/cover-letters` for shared logic to compute metric summaries and display data (`useMetrics`, `useMatchSummary`) and found logic duplicated across `ProgressIndicatorWithTooltips` and tooltip components. New hook required to centralize data transformation for goals, requirements, ratings, and ATS scores with consistent typing.

- `src/pages/MatchMetricsPreview.tsx`: Searched `src/pages` for preview/demo pages (`Preview`, `MetricsDemo`, `ComponentShowcase`) and found only `TooltipDemo` and `HILDemo`. New preview page required to showcase the toolbar + drawer UX with mock data, toggles for loading/post-HIL states, and interactive demonstrations for design validation before replacing existing tooltip-based match component.

- `src/lib/coverLetters/sectionGapHeuristics.ts`: Reviewed `src/lib`, `src/services`, and `src/utils` for deterministic gap detection logic (`gapHeuristics`, `sectionAnalysis`, `fallbackEvaluation`) and found only LLM-based analysis in `coverLetterDraftService` and `gapTransformService`. New heuristic engine required as fallback using regex/NLP-lite checks for metrics, keywords, and structural elements in introduction/experience/closing sections, with severity scoring and batch evaluation support.

- `src/lib/coverLetters/__tests__/sectionGapHeuristics.test.ts`: Checked `src/lib/__tests__` and `src/services/__tests__` for coverage of section gap analysis and found none targeting deterministic heuristics. Need comprehensive Jest tests covering hit/miss scenarios for each section type.

- `tests/fixtures/mockSectionGapInsights.json`: Reviewed `tests/fixtures` and `src/lib/mockData` for gap insight fixtures and found none. Created comprehensive fixture with example LLM responses for introduction, experience, closing, and signature sections covering various gap scenarios (missing metrics, weak alignment, vague language, etc.) for use in UI component tests and Storybook stories.

- `cypress/e2e/coverLetterGapFlow.cy.ts` or `tests/e2e/coverLetterGapFlow.spec.ts`: Checked `cypress/e2e` and `tests/e2e` directories for cover letter gap banner tests and found only basic creation flow tests. Need E2E scenario covering: (1) generate draft, (2) wait for metrics, (3) verify gap banners appear, (4) edit section, (5) verify heuristic update, (6) trigger refresh, (7) verify LLM insights replace heuristics. Placeholder test scenario provided in QA_DOCUMENTATION_PLAN.md.

- `QA_DOCUMENTATION_PLAN.md`: Created comprehensive QA plan covering test matrix (happy path, fallback mode, edit flow, edge cases), regression checklist (tags, CTA, export), documentation updates to TAG_IMPROVEMENT_PLAN.md, and tooling (mock fixtures, E2E tests). Provides complete testing strategy for sectionGapInsights feature with expected UI states, data contracts, and flow diagrams.

- `src/lib/jobDescriptionCleaning.ts`: Reviewed `src/lib`, `src/services`, and `src/utils` for job description preprocessing or cleaning utilities (`jdCleaning`, `textCleaning`, `jobPostingNormalization`) and found only parsing/analysis in `jobDescriptionService.ts`. New Phase 1 cleaning service required to remove high-confidence UI noise (navigation, metadata, job board chrome) from raw job postings before LLM parsing, with platform-specific pattern matching (LinkedIn, Indeed, Levels, etc.), confidence scoring, and removal logging for analytics.

- `src/lib/__tests__/jobDescriptionCleaning.test.ts`: Checked `src/lib/__tests__` for coverage of text cleaning and found none. Created comprehensive test suite with 34 test cases covering: basic functionality, exact/startsWith/regex pattern matching, platform-specific cleaning (all 8 platforms), confidence calculation, edge cases (unicode, whitespace, long lines), and real-world job posting scenarios.

## 2025-11-28

- `supabase/functions/_shared/readiness.ts`: Searched `_shared` utilities (`rg readiness`, inspected `pipeline-utils.ts`, `pm-levels.ts`) and confirmed there was no helper responsible for loading draft text + JD context or for schema-validating readiness verdicts. Added a dedicated module that composes existing pipeline helpers (`streamJsonFromLLM`) to (1) load/guard draft context, (2) expose the readiness Zod schema, and (3) wrap the JSON-LLM call so multiple Edge Functions can share the same implementation.
- `src/hooks/useDraftReadiness.ts`: Checked `src/hooks`, `src/components/cover-letters`, and `src/lib` for any reusable client helper that fetches the readiness API, attaches Supabase auth tokens, and handles TTL refetching—found only direct `CoverLetterDraftService` usage inside `MatchMetricsToolbar` (browser-side Supabase). Added a hook that encapsulates the new `/api/drafts/:id/readiness` flow, translates status codes (200/204/503), schedules TTL-based refetches, and surfaces a `featureDisabled` flag so UI consumers can gate rendering without duplicating the networking logic.

