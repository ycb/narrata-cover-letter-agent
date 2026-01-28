# Story Fragment Refactor ExecPlan

This ExecPlan is a living document and must be updated in lockstep with every change described below. It is written in accordance with `PLANS.md` at the repository root (`PLANS.md`) so that a novice developer can read the plan, follow it, and reproduce the behavior from start to finish without outside context.

## Purpose / Big Picture

Resume extraction currently floods gap detection with 25‑40 high‑severity “Missing STAR format” violations because each bullet is promoted to an `approved_content` story before the user has a chance to shape it. Splitting “potential stories” out into a new concept called **story fragments** lets us:

- Store each resume bullet as a lightweight fragment tied to its role without forcing a full STAR narrative.
- Surface those fragments inside Work History so users can review, convert, or trash them before the gap engine audits their final words.
- Keep legit `stories` (approved/shippable narratives) clean for cover–letter matching, PM level scoring, and dashboard health metrics.

After this work, fragments will appear as their own tab on the Work History detail pane, onboarding dashboards will mention how many fragments a user could finish, and gap detection will only count polished stories so totals remain manageable. Human‑in‑the‑loop (HIL) generation will use a fragment as the seed when the user says “finish this story” so the final content still flows through the existing story generation pipeline.

## Progress

- [x] (2026-02-17 16:30Z) Captured scope, constraints, and verification requirements for the story fragment refactor in this ExecPlan.
- [x] (2026-02-18 03:45Z) Added the `story_fragments` migration, Supabase typing, and `StoryFragmentService`, and mapped fragments into both merged and synthetic work history pipelines.
- [x] (2026-02-18 04:10Z) Added fragment fetching + map plumbing plus a new “Story Fragments” tab (with `StoryFragmentCard`) in `WorkHistoryDetail`, including toast-backed deletion handling.
- [x] (2026-02-27 21:00Z) Resume/LinkedIn story extraction now inserts into `story_fragments`, gap detection skips raw fragments, and dashboards show fragment-specific counts.
- [x] (2026-02-27 21:05Z) Fragment promotion flow seeds a new story record, marks the fragment promoted, runs `detectStoryGaps`, and queues PM level refresh; the UI exposes a bulk discard action.
- [x] (2026-02-27 21:10Z) Added `scripts/migrate-resume-stories-to-fragments.tsx` to convert legacy resume/linkedin rows into fragments and clean up associated gaps/variations.

## Surprises & Discoveries

- Observation: Gap detection now counts every resume-derived story as “approved_content,” causing 30+ gaps per user even when only a handful of polished stories exist. Segregating fragments should immediately shrink the gap list because the high‑severity STAR flag will no longer apply to the raw extraction.
  Evidence: Manual rerun for user `3636aac3-c28c-4443-b158-400e3e53839d` reports 30 stored gaps, of which 17 are “Missing narrative structure (STAR)” on resume stories.

## Decision Log

- Decision: Keep the existing `stories` table for polished, gap-counted content, and create a new `story_fragments` table for raw resume bullets. `stories` stay read-only for dashboards, while fragments are private drafts that can later seed approved stories.
  Rationale: Reusing `stories` would keep the high gap totals and distort dashboards; a dedicated table gives us a place to capture intermediate metadata (source text, narrative hints, status) and to record conversions.
  Date/Author: 2026-02-17 / Codex.

- Decision: Gap detection will keep using the `gaps` table but will not emit new rows for fragments; instead we will track fragment counts separately (new dashboard bucket). `StoryFragment` promotions will trigger a fresh `detectStoryGaps` pass so the final story is evaluated normally.
  Rationale: We do not yet need new gap rows for fragments, and leaving the existing `gaps` schema untouched avoids a big migration while still letting us describe fragment quality elsewhere.
  Date/Author: 2026-02-17 / Codex.

## Outcomes & Retrospective

When the plan is complete, the work history experience can show “Story fragments (extracted resumes)” alongside approved stories, the onboarding dashboard will highlight fragment counts, and gap totals will drop because only polished stories are counted. The HIL modal will accept either fragments or approved stories as its input, so the user can quickly finish a fragment and immediately see the generated completion in the work history list. We will need to revisit this plan once fragments are in the database to confirm the PM level job still has enough evidence and to ensure dashboards surface fragment-to-story conversion rates.

## Context and Orientation

Current state:

- Stories are persisted to `public.stories` (see `supabase/migrations/001_initial_schema.sql` and `supabase/migrations/20251214_onboarding_schema_fixes.sql`) and are joined into clusters via `src/services/workHistoryMergeService.ts`, which supplies `WorkHistoryDetail` with approved content.
- Gap Detection (`src/services/gapDetectionService.ts`) enumerates `approved_content`, `work_item`, and `saved_section` gaps; the dashboards (e.g., `src/components/dashboard/WorkHistoryGapsWidget.tsx` and `NewUserDashboard`) compute totals per content bucket using `GapDetectionService.getContentItemsWithGaps`.
- Work history data is staged through `useWorkHistory`, `WorkHistoryMaster`, and `WorkHistoryDetail`, with actions wired to `ContentGenerationModalV3Baseline`, `StoryCard`, and related components.

New concept:

- A **story fragment** is a resume-derived achievement placeholder stored in a new `public.story_fragments` table. Each fragment references a `work_item` (role), retains the original `source_id/source_type`, and tracks a lightweight `status` (pending/promoted/archived) plus optional narrative hints (tags, metrics). Fragments can be promoted to stories via the existing HIL content generation workflow or discarded via a bulk delete action.

## Plan of Work

### Milestone 1 – Data layer and persistence

Implement `public.story_fragments` with `story_fragments` supabase typings plus RLS triggers and indexes. This includes:

- `story_fragments` schema: UUID `id`, `user_id`, optional `work_item_id`, `source_id`, `source_type`, `title`, `content`, arrays for `tags`/`narrative_hints`, JSONB `metrics`, `status` enum, nullable `converted_story_id`, timestamps, and the standard `update_updated_at_column` trigger. Index `idx_story_fragments_user_id`, `idx_story_fragments_work_item_id`.
- Supabase type definitions (`src/types/supabase.ts`) get a `story_fragments` entry so the TypeScript `Database` mapping can read/write rows.
- Create `StoryFragment` interfaces in `src/types/workHistory.ts` and wire `WorkHistoryRole.fragments`.
- Add a backend helper `src/services/storyFragmentService.ts` that exposes `fetchAll(userId)`, `fetchByWorkItem(userId, workItemId)`, `insertFromResume`, `markPromoted`, and `delete` operations. Use `SoftDeleteService` when archiving.
- Update `useWorkHistory` to fetch fragments (ordered newest first), merge them into `data.storyFragments`, and expose helpers for insertion/deletion/promotions so the UI layer can reactively display the list.

### Milestone 2 – Work History + Dashboard UX

With fragments available, extend UI and hooks:

- Rework `WorkHistoryDetail`/`WorkHistoryDetailTabs` to add a “Story Fragments” tab alongside “Stories.” Each fragment card (see `StoryCard` for inspiration) should surface the snippet, relevant role, extracted metrics/tags, and actions (“Finish with HIL,” “Delete,” “Bulk select”).
- Update `WorkHistoryMaster` (and possibly `WorkHistoryDrawer`) to show a fragment badge per role so users know how many fragments remain.
- Create a new fragment-focused component/module (e.g., `src/components/work-history/StoryFragmentCard.tsx`) and hook it into the detail tabs, including selection controls for bulk deletion. Tie bulk delete to `StoryFragmentService.deleteFragments`.
- Update `NewUserDashboard`, `WorkHistoryGapsCountWidget`, and other dashboard cards to fetch fragment counts (via the service or a new hook) and show a CTA like “Finish (N) fragments → Work History.” The onboarding card should explain that fragments are resume extras waiting for review.

  Completed this milestone by adding a fragments count widget to the dashboard/onboarding gap section and embedding the same callout below the gaps table so fragments stay separate from actionable gaps.

### Milestone 3 – Gap detection, PM levels, and cover letter flows

Integrate fragments into the broader product:

- Keep gap detection scoring limited to `public.stories` by filtering fragments out of `GapDetectionService.getContentItemsWithGaps` and `detectStoryGaps`; fragments will not emit gaps unless/ until they become approved stories. Updates to `ContentItemWithGaps` should introduce a `storyFragments` bucket that dashboards can use to show counts without mislabeling them as “high severity.”
- Ensure PM level scoring (`src/services/pmLevelsService.ts`) excludes fragments when collecting evidence but continues to count stories. Runnable synthetic profile handling (via `workHistoryMergeService`) should optionally include fragments for context but not as final evidence.
- Cover letter draft matching should continue to pull from `public.stories`. If a fragment is converted to a story, run `GapDetectionService.detectStoryGaps` before `CoverLetterDraftService` caches to ensure the new story is ready.

### Milestone 4 – HIL and conversion workflow

- When the user clicks “Finish with HIL” on a fragment, open `ContentGenerationModalV3Baseline` with the fragment’s text as `existingContent`, pass a synthetic gap description, and make the resulting write-up both inserted into `public.stories` and linked back to the fragment (`converted_story_id`). Optionally auto‑resolve the fragment (status = `promoted`).
- Use `StoryFragmentService.markPromoted` to store the new story ID and trigger `schedulePMLevelBackgroundRun` + `GapDetectionService.detectStoryGaps` so totals stay accurate.
- If the user deletes a fragment (individually or bulk), archive it via `SoftDeleteService` so analytics reflect the discard.

### Milestone 5 – Backfill and cleanup

- Write a backfill script (e.g., `scripts/migrate-resume-stories-to-fragments.tsx`) that:
  1. Reads every row in `public.stories` with `source_type = 'resume'`.
  2. Inserts a corresponding fragment, referencing `work_item_id`, storing the original `content`, `title`, `tags`, `metrics`, and marking the story as `converted`.
  3. Optionally leaves the original story intact for now but marks the fragment’s `converted_story_id`.
 4. Re-runs `GapDetectionService.detectStoryGaps` for those stories so the new fragmentation still leaves them gap scored.
- Update documentation (this ExecPlan and `WORKFLOW.md`) with the new fragment vocabulary and the user flows (role tab, dashboard CTA, HIL conversion).

## Concrete Steps

    cd /Users/admin/narrata
    npm run lint
    npm test
    npm run test:ui
    npm run test:e2e

Each command is run from the repo root. `npm run lint` verifies the TypeScript changes, `npm test` covers unit logic (gap detection/service helpers), and the UI/E2E checks confirm the new Work History fragments render and behave as expected. After migrating fragments, rerun the `scripts/trigger-gap-detection.ts` job for affected users if needed.

## Validation and Acceptance

- `npm run lint` succeeds with zero errors, demonstrating valid Typescript footprints for the new service, hooks, and components.
- `npm test` passes, covering the service helper logic plus any new unit tests you add for fragments.
- Manual UI validation: start `npm run dev`, upload a resume, open Work History, confirm the new FRAGMENTS tab appears, clicking “Finish with HIL” opens the existing modal seeded with the fragment text, and the story list reflects the promotion afterward.

## Idempotence and Recovery

- The new migration is additive; rerunning it is safe because it checks for existing constraints before applying. Fragments are tied to `source_id`, so duplicate resume uploads don’t create identical fragments.
- Bulk delete simply archives fragments via `SoftDeleteService`; they can be restored by re-running the migration or by copying them from `deleted_records` if needed.
- If a promotion fails, the fragment’s status remains `pending`, and rerunning the conversion simply retries the `insert` + `markPromoted` logic.

## Artifacts and Notes

    INSERT INTO public.story_fragments (user_id, work_item_id, source_type, title, content, tags, metrics)
    VALUES ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'resume', 'Fragment from Resume', 'Snippety snippet', ARRAY['leadership'], '[{"value":"50%","context":"YOY"}]');

The log above shows how a fragment is stored; future queries will JOIN `work_items` on `work_item_id` for display and include `status = 'pending'` filters for user dashboards.

## Interfaces and Dependencies

- **Supabase table**: `public.story_fragments`. Row shape includes `{ id, user_id, work_item_id, source_id, source_type, title, content, narrative_hints, metrics, tags, status, converted_story_id, created_at, updated_at }`.
- **TypeScript types**: `StoryFragment` in `src/types/workHistory.ts` and the new entry in `src/types/supabase.ts`. `WorkHistoryRole.fragments` will contain `StoryFragment` records so Work History components can iterate.
- **Service**: `src/services/storyFragmentService.ts` exposes CRUD helpers plus `markPromoted`/`deleteFragments`. It depends on `supabase` and `SoftDeleteService` and will be used by `useWorkHistory` plus the new UI components.
- **UI components**: `StoryFragmentCard` (new) in `src/components/work-history/`, a “Story Fragments” tab in `WorkHistoryDetailTabs`, fragment selection management inside `WorkHistoryDetail`, and dashboard widgets (NewUserDashboard + WorkHistoryGaps counts) that display fragment totals.
- **Work history pipeline**: `useWorkHistory` fetches fragments, `workHistoryMergeService` optionally surfaces summary counts, and `GapDetectionService` ensures only approved stories emit gaps. `ContentGenerationModalV3Baseline` receives fragments when the user asks it to finish one, and `ContentGenerationService` adds the resulting story to `public.stories`.

### Post-change note

This plan was created to align story fragments with the existing Narrata architecture (gap detection, cover letters, HIL generation). Any deviation or additional insight should be documented here, updating the progress record and decision log so future contributors can trace the rationale.
