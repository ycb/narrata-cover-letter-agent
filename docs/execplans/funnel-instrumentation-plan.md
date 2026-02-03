# Funnel Instrumentation Exec Plan

## Context / Why
- The admin funnel dashboard currently only reflects `account_created`; downstream stages are untrustworthy because the underlying `user_events` entries (email verification, first login, onboarding phases, tour/checklist) are noisy or miss duplicates.
- We need a reliable, documented signal for each stage to surface meaningful conversion metrics and surface-stage visibility for future product tracking.
- Work covers both instrumentation (frontend/services emitting events) and data hygiene (migrations/backfills). This warrants an ExecPlan to coordinate context, implementation, and verification.

## Objectives
1. Define trustworthy data sources for each funnel stage, document where the event is emitted, and capture any guardrails (feature flags, dedup logic, demo skips).
2. Implement instrumentation (services / hooks / Supabase functions) that write `user_events` rows consistently using the new `userEventsService`.
3. Backfill or clean existing event data to match the desired behavior, add migrations if needed, and verify the dashboard shows the expected progression.

## Steps
1. **Source mapping and documentation** – Outline each funnel stage, the canonical trigger, and how to avoid duplicates. Capture this in `docs/execplans/funnel-instrumentation-plan.md` (current file) and ensure future contributors can follow it.  
2. **Instrumentation work** – Update the auth context, onboarding flows, feature-flagged tour, and any Supabase edge functions so only reliable events are emitted. Collate existing migrations/cleanups, add tests if feasible, and double-check no UI changes are required.  
3. **Data hygiene & verification** – Write/adjust migrations (backfills, deletes) to align stored events with the planned instrumentation, run `supabase db push`, and sample `/admin/funnel` (possibly via staging) to ensure counts reflect reality.

## Status
- Step 1 (documentation) – **In progress** (this ExecPlan).  
- Step 2 (instrumentation) – **Pending** (dependent on finalizing requirements).  
- Step 3 (data hygiene) – **Pending** (can run once instrumentation is complete).

## Funnel stage definitions
- **Onboard**: Account created (new user row), onboarding complete (assigned when user finishes the new-user checklist and narrative selection), viewed dashboard (serves as indication that onboarding flows were skipped/finished). Events should originate from backend hooks after validating profile data; dedupe by user_id + stage.
- **Setup**: Edited any work history (profile updates with `hasWorkHistory` flag), edited saved section (story drafts/tips), viewed or edited cover letter template (template interactions). Track via `user_events` entries emitted from the profile service and cover-letter editor services, guarding against bot/demo accounts.
- **Usage**: Created cover letter (persisted cover), saved cover letter (each save operation that is not auto-save). Emit these with explicit `action` fields and ensure feature flag gating (if `VITE_PRODUCT_TOUR_ENABLED` is off, stage is suppressed entirely because tour-derived events were noise).
- **Stalled users**: Derived view that joins cleaned `user_events` with profile metadata (email, acquisition source, geo, first visit timestamp) so the dashboard can list who has reached but not advanced past each stage.

## Implementation tasks
- **Instrumentation** – Replace email-verified / product-tour events with the new trusted stage emitters. Ensure events include stage name, timestamp, acquisition metadata, and user_id. Feature flags should gate optional phases (product tour, demo flows). Tests (unit or integration) should confirm that instrumentation writes the expected rows.
- **Data migrations/backfills** – Add migrations that (a) remove noisy `user_events` rows outside the Onboard/Setup/Usage list, (b) populate `first_visit_timestamp`, `acquisition_source`, and `geo` columns by joining LogRocket/IP analytics data for existing users, and (c) create the derived `stalled_users` view (per stage) used by the dashboard. Run `supabase db push --include-all` after verifying local and remote migration order.
- **UI/dashboard** – Rebuild `/admin/funnel` to consume the derived stage metrics instead of the legacy counts. Replace the funnel steps list with the three workflow groups, show per-stage counts, and add clickable links (or expandable rows) that surface the `stalled_users` view for that stage including email, acquisition source, geo, first visit timestamp, and stage timestamp.
- **Verification** – Once UI is wired, run Playwright (per workflow instructions) to confirm the funnel renders expected stage data and the user lists load. Also manually spot-check `/admin/funnel` to ensure product tour/email verified rows no longer appear and counts match the cleaned data.

## Next steps
1. Finalize instrumentation requirements (confirm which services emit each stage and what metadata is required).
2. Implement/adjust migrations and run `supabase db push --include-all` so the staging data is reliable.
3. Update the dashboard UI to use the new metrics and ensure stage drop-off lists surface the agreed metadata.
4. Execute Playwright verification and capture any remaining follow-up items (e.g., automation triggers once the stage lists are reliable).
