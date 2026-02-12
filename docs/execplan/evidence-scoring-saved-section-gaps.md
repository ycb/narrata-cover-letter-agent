# Saved Section Gap Evidence Scoring (Global Heuristic Upgrade)

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

This document follows `PLANS.md` from the repository root and must be maintained in accordance with its requirements.

## Purpose / Big Picture

Saved section gap quality currently over-relies on rigid pattern checks and can flag strong prose as missing metrics or structure. After this change, saved section gaps will be scored with a generalized evidence model that reduces false positives across all users without introducing user-specific exceptions. During beta, manual dismissal remains an intentional relief valve for edge cases, but it is no longer the primary strategy for quality.

Execution status for this plan is intentionally `ON HOLD` until explicit go-ahead. This document defines what to build and how to validate it, but no implementation is started under this plan yet.

## Progress

- [x] (2026-02-12 01:45Z) Established scope: solve saved section false positives with global logic, not per-user rules.
- [x] (2026-02-12 01:45Z) Confirmed current behavior and pain: unresolved saved section gaps rely on strict STAR and narrow metric regex checks.
- [x] (2026-02-12 01:45Z) Drafted implementation and validation plan with explicit beta manual-dismissal fallback.
- [ ] Implement evidence scoring helper and wire it into saved section gap detection.
- [ ] Add resolver and backfill/recompute path for stale saved section gaps.
- [ ] Add unit and integration tests for precision and regression safety.
- [ ] Roll out behind feature flag and compare before/after dismissal rates.

## Surprises & Discoveries

- Observation: Remaining saved section gaps for the target beta user were created on 2026-01-24 and persisted because content had not been re-evaluated through resolver paths.
  Evidence: `public.gaps` rows for `saved_section` show old `created_at`/`updated_at` timestamps with unresolved state.

- Observation: Saved section metric detection uses a narrow regex that favors explicit digits and misses some strong quantified language patterns.
  Evidence: `src/services/gapDetectionService.ts` `detectCoverLetterSectionGaps` checks `hasMetrics` with a small expression distinct from broader role/story signal logic.

- Observation: Saved section narrative quality currently depends on `checkStoryCompleteness` with strict STAR-style signals, which can classify concise high-quality prose as incomplete.
  Evidence: `src/services/gapDetectionService.ts` uses `checkStoryCompleteness` for `section.type === 'paragraph'`.

## Decision Log

- Decision: Build a global evidence scoring model for saved section gaps instead of expanding ad-hoc keyword lists.
  Rationale: Keyword growth is brittle and creates maintenance debt while still missing valid writing styles.
  Date/Author: 2026-02-12 / Codex + User

- Decision: Keep manual dismissal available in beta as a relief valve, but not as the primary quality mechanism.
  Rationale: Beta needs operational flexibility while core heuristics are improved.
  Date/Author: 2026-02-12 / Codex + User

- Decision: Gate rollout with a feature flag and measurable quality metrics before broad enablement.
  Rationale: Heuristic tuning has medium regression risk; controlled rollout protects users.
  Date/Author: 2026-02-12 / Codex

- Decision: Hold implementation until explicit user approval to proceed.
  Rationale: User requested plan creation only at this stage.
  Date/Author: 2026-02-12 / Codex + User

## Outcomes & Retrospective

Planning outcome: the problem is scoped to a global saved section detection upgrade with a clear rollout and rollback strategy. No code was implemented under this plan yet. Remaining work is implementation, tests, and staged rollout when hold is lifted.

## Context and Orientation

Gap detection is centralized in `src/services/gapDetectionService.ts`. Saved section paragraph gaps are produced by `detectCoverLetterSectionGaps`, which currently creates `incomplete_cover_letter_section` and `missing_metrics_cover_letter` using strict heuristics. Gap summary titles shown in UI come from `src/utils/gapSummaryGenerator.ts`, and unresolved rows from `public.gaps` drive banners in work history and saved section surfaces.

Key files and responsibilities:

- `src/services/gapDetectionService.ts`: source of gap creation rules and resolvers.
- `src/utils/gapSummaryGenerator.ts`: maps gap categories to banner copy.
- `src/components/work-history/WorkHistoryDetail.tsx`: consumes unresolved gaps and opens generation flows.
- `src/pages/SavedSections.tsx`: saved section editing and gap visibility surfaces.
- `supabase` `public.gaps` table: persistence for unresolved/resolved gap state.

Terms used in this plan:

- Evidence scoring: assigning a confidence score from multiple generalized signals (numeric, outcome, scope, action, structure) rather than one binary regex.
- False positive: a gap surfaced for content that is already sufficiently strong and should not require action.
- Relief valve: manual dismissal path used intentionally during beta when heuristics are uncertain.

## Plan of Work

Milestone 1 defines a new saved section evidence scorer in `gapDetectionService` and routes paragraph gap decisions through that scorer. The scorer outputs two independent confidence values: metric sufficiency and narrative sufficiency. Each value is based on generalized signals instead of one phrase list. Numeric evidence remains highest-confidence, but non-numeric outcome structure contributes meaningfully.

Milestone 2 updates gap creation thresholds. High-confidence deficiencies still produce current categories. Borderline cases either downgrade severity or skip gap creation. This preserves actionable quality alerts while reducing noisy banners.

Milestone 3 adds resolver/backfill behavior. Existing unresolved saved section gaps must be re-evaluated so users do not remain blocked by stale rows. The re-evaluation path should resolve outdated rows with `no_longer_applicable` and preserve valid gaps.

Milestone 4 introduces tests and a guarded rollout. Unit tests validate scorer behavior across strong prose, weak prose, and ambiguous prose. Integration tests validate end-to-end gap persistence behavior. Rollout begins behind a flag and uses observed dismissal rate and resolution patterns to tune thresholds.

## Open Questions for Alignment

No blocking questions for plan readiness. Threshold calibration choices can be finalized during implementation using fixture outcomes and beta telemetry.

## Concrete Steps

From `/Users/admin/narrata`, execute implementation in this order after hold is lifted:

1. Add generalized saved section evidence scorer to `src/services/gapDetectionService.ts`.
2. Replace direct paragraph metric/narrative binary checks in `detectCoverLetterSectionGaps` with scorer outputs.
3. Add resolver helper for saved section gaps that can close stale rows after content updates or recompute.
4. Add a recompute script or service entrypoint to re-evaluate unresolved saved section gaps for all users.
5. Add tests in `src/services` test suite for scoring and gap creation/regression scenarios.
6. Add rollout flag checks and default flag-off behavior.

Run validation commands:

    cd /Users/admin/narrata
    npm test -- src/services/gapDetectionService.test.ts src/services/__tests__/fileUploadService.test.ts
    npm run lint
    npm run build

If adding dedicated scorer tests:

    cd /Users/admin/narrata
    npm test -- src/services/gapDetectionService.savedSections.test.ts

## Validation and Acceptance

Acceptance criteria for this plan:

- Saved section paragraphs with clear outcome evidence no longer receive frequent false-positive metric gaps.
- Strong concise paragraphs are not systematically flagged as incomplete narrative solely for not matching strict STAR markers.
- Truly weak sections still produce actionable `incomplete_cover_letter_section` and/or `missing_metrics_cover_letter` gaps.
- Existing unresolved stale saved section gaps are resolved after recompute when content evidence is sufficient.
- Manual dismissal continues to work unchanged during beta as a fallback, not as the main quality control mechanism.
- Rollout can be disabled quickly via feature flag with no schema rollback required.

## Idempotence and Recovery

Scoring changes are code-only and idempotent. Recompute/resolution routines must be safe to run multiple times and should only mutate unresolved rows that no longer meet gap criteria. If rollout quality regresses, disable the feature flag and keep legacy logic active while preserving user data.

For database safety, recompute should only update `public.gaps` row status fields and never delete rows. Recovery is to re-run recompute with previous thresholds or revert scorer logic and recompute again.

## Artifacts and Notes

Initial benchmark targets for beta evaluation:

- Reduce manual dismissal rate for saved section gaps by at least 30 percent.
- Keep true-positive gap surfacing stable by monitoring content updates that resolve gaps after generation.
- Ensure no significant increase in user reports of missing guidance.

This plan intentionally does not include user-specific logic. All heuristic behavior applies globally.

## Interfaces and Dependencies

Planned interfaces in `src/services/gapDetectionService.ts`:

- Add a scorer function for saved section paragraphs, returning normalized confidence fields:
  - `metricEvidenceScore: number`
  - `narrativeEvidenceScore: number`
  - `confidence: 'high' | 'medium' | 'low'`
  - `signals: string[]` for debug/test observability

- Update `detectCoverLetterSectionGaps` to consume the scorer and map score thresholds to existing gap categories.

- Add resolver/recompute entrypoint for unresolved saved section gaps that uses scorer outputs to resolve stale rows.

No new external dependencies are required. Existing Supabase service access patterns and test tooling are sufficient.

---

Revision note (2026-02-12): Initial ExecPlan created and set to `ON HOLD` per user request. Added beta policy that manual dismissal remains acceptable as interim relief while global scorer work is pending.
