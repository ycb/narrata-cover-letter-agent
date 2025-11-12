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

