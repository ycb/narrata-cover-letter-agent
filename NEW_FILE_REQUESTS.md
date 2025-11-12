# New File Requests

## 2025-11-11

- `src/utils/supportEmail.ts`: Searched in `src/services` and `src/utils` for existing email or support contact utilities and found none. Creating a shared helper to route PM level dispute submissions to `support@narrata.co`.

- `supabase/functions/send-support-email/index.ts`: Checked existing edge functions in `supabase/functions` and found only LinkedIn handlers; no support-email function exists. Adding a dedicated function to forward dispute submissions to support.

- `supabase/migrations/20251111_add_pm_level_eval_fields.sql`: Checked existing migrations for `evaluation_runs` columns and confirmed no PM level fields. Need a dedicated migration to add PM level tracking columns used by the expanded evaluations dashboard.

- `src/hooks/useStreamingProgress.ts`: Searched `src/hooks` and `src/lib` for existing streaming or progress hooks (`useStreaming`, `useProgressStream`) and found none. Need a dedicated hook to consume AI SDK `streamText` results and translate them into UI-friendly progress updates.

- `src/components/shared/StreamingProgress.tsx`: Reviewed `src/components/shared` and `src/components/ui` for reusable streaming/step loaders (looked for `Streaming`, `ProgressTimeline`, `StepLoader`) and confirmed only generic `LoadingState`/`EmptyState` exist. Creating a composable timeline component that renders updates from `useStreamingProgress`.

- `supabase/migrations/20251111_update_eval_file_type_pm_levels.sql`: Searched existing migrations for `evaluation_runs_file_type_check` and confirmed it only allowed resume/coverLetter/linkedin. Need a migration to include `pm_level` so PM Level analyses can be logged without constraint failures.

- `docs/compliance/PM_RESUME_SOURCE_COMPLIANCE.md`: Reviewed `docs/` (including `architecture`, `features`, `implementation`, `qa`, `setup`, `testing`, `troubleshooting`) and found no compliance or sourcing documentation for resume acquisition. Need a dedicated compliance log to capture licensing, permissions, and legal review notes per resume source.

- `src/services/realDataPipeline.ts`: Searched `src/services`, `src/utils`, and `src/lib` for real-data ingestion or anonymization logic (keywords: `realData`, `ingest`, `resumePipeline`) and found only synthetic/test scripts. Need a dedicated service module orchestrating real resume ingestion, parsing, and anonymization.

- `scripts/run-real-data-pipeline.ts`: Checked `scripts/` for pipeline runners (`ingest`, `real-data`, `resume`) and only found synthetic upload/test scripts. Need a CLI entry point to invoke the real data pipeline with provenance logging and Supabase sync.

- `docs/implementation/REAL_DATA_PARSING_ENRICHMENT.md`: Searched `docs/implementation` for parsing or enrichment specs (looked for `parsing`, `enrichment`, `resume schema`) and found none covering real-data ingestion. Need documentation that defines the standardized schema, parsing heuristics, and LinkedIn enrichment workflow introduced for the real data pipeline.

- `docs/implementation/REAL_DATA_ANONYMIZATION_SYNC.md`: Reviewed `docs/implementation` and `docs/setup` for anonymization or Supabase sync SOPs (`anonymization`, `Supabase sync`, `PII`) and found only synthetic-data notes. Need a dedicated reference describing the anonymization policy, reversible mapping storage, and Supabase upload procedure for the real data pipeline.

- `docs/implementation/COVER_LETTER_REAL_DATA_STRATEGY.md`: Looked through `docs/implementation`, `docs/features`, and `docs/prd` for cover-letter sourcing strategies (searched `cover letter`, `real data`, `sourcing`) and found only synthetic generation references. Need a plan that inventories real cover-letter sources, evaluates legal viability, and defines the synthetic fallback path.

- `docs/implementation/REAL_DATA_MVP_VALIDATION.md`: Searched `docs/implementation`, `docs/testing`, and `docs/qa` for real-data validation frameworks (`validation`, `context engineering`, `MVP`) and found only synthetic evaluation plans. Need a roadmap that defines experiments, metrics, and context-engineering automation steps for the real-data MVP.

- `docs/implementation/REAL_DATA_GTM_INSIGHTS.md`: Reviewed `docs/features`, `docs/prd`, and `docs/implementation` for GTM playbooks tied to real datasets (`GTM`, `real data`, `persona`) and found only high-level product docs. Need an insights brief translating anonymized resume findings into user segments, acquisition channels, and lookalike opportunities.

- `supabase/migrations/20251111_add_pm_level_snapshots.sql`: Checked existing migrations and confirmed no columns capture PM level evidence payloads. Adding snapshot columns so the dashboard can display previous/current evidence without overloading other fields.


## 2025-11-12

- `supabase/migrations/20251112_allow_null_source_id_in_evaluation_runs.sql`: Searched prior migrations touching `evaluation_runs` and confirmed `source_id` remained `NOT NULL`. PM Levels logging inserts rows without an associated source, so the constraint prevented new runs from appearing. Adding a migration to drop the `NOT NULL` constraint so PM Level runs can be recorded.

- `src/services/jobDescriptionService.ts`: Searched `src/services`, `src/lib`, and `src/utils` for existing job description ingestion modules (`jobDescription`, `jobDescriptionService`, `parseJobPosting`) and found none. Owner: Draft Cover Letters MVP squad. Needed for OpenAI-assisted parsing and persistence of pasted job descriptions prior to draft generation.

- `src/services/coverLetterDraftService.ts`: Searched `src/services`, `src/modules`, and `src/domain` for cover letter draft generators or services (`coverLetterDraft`, `draftService`, `generateCoverLetter`) and found only template CRUD facilities. Owner: Draft Cover Letters MVP squad. Provides orchestrated draft assembly, section matching, and persistence atop existing templates and work history content.

- `src/components/cover-letters/MatchComponent.tsx`: Reviewed `src/components/cover-letters`, `src/components/metrics`, and `src/components/ui` for reusable match or scorecard components (`Match`, `Scorecard`, `MetricsSummary`) and confirmed only resume-focused metrics exist. Owner: Draft Cover Letters MVP squad. Required to render the six draft quality metrics with tooltips inside the cover letter creation flow.

- `src/hooks/useCoverLetterDraft.ts`: Searched `src/hooks` and `src/features/cover-letters` for hooks coordinating draft generation (`useCoverLetter`, `useDraft`, `useCoverLetterDraft`) and found none. Owner: Draft Cover Letters MVP squad. Centralizes draft state management, service orchestration, and regeneration workflows for the modal experience.

