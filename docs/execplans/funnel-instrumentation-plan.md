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
