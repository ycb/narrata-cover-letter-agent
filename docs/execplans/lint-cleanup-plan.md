# Lint Cleanup ExecPlan

This ExecPlan is a living document governed by `PLANS.md` from the repository root (`PLANS.md`). Follow every section before, during, and after the clean-up so a novice can restart from this file alone.

## Purpose / Big Picture

After these steps, `npm run lint` will finish with zero mentions of unused disable directives and with `@typescript-eslint/no-explicit-any` either resolved or scoped to explicitly approved areas, restoring confidence that every TypeScript surface in the repo is getting the static quality check it deserves.

The work matters because the CI gate and developer pre-flight already run `npm run lint` with `--report-unused-disable-directives` and `--max-warnings 0`, so no developer can ship anything without the command passing. Right now thousands of lints hide the real blockers. Cleaning up the policy immediately reduces noise and puts the entire team back on a single quality signal.

## Progress

- [x] (2026-02-15 12:00Z) Described the lint surface and the planned clean-up cadence in this plan.
- [x] (2026-02-15 13:10Z) Ran `npm run lint` from the repo root to enumerate every remaining failure, recording unused disable directives from coverage outputs and `no-explicit-any` hits in notion-mcp-server, scripts, supabase functions, and tests.
- [x] (2026-02-15 13:40Z) Updated `eslint.config.js` to ignore coverage artifacts and to include flat-config overrides that temporarily relax `no-explicit-any`, `no-require-imports`, and `ban-ts-comment` for the script/service/test subsystems; reran lint to surface the remaining `src/` violations.
- [x] (2026-02-15 14:10Z) Replaced the `runTest` catch signature in `src/components/auth/AuthTestPanel.tsx` with an `unknown` guard so the component now complies with `@typescript-eslint/no-explicit-any`.
- [x] (2026-02-15 14:25Z) Updated `src/components/auth/NameCaptureModal.tsx` so its error handling now discriminates `unknown` errors and no longer uses `any`.
- [x] (2026-02-15 14:50Z) Reworked `src/components/auth/RLSTestPanel.tsx` to introduce typed results and guard all catches with `unknown`, eliminating `any` from the component while preserving the same behavior.
- [x] (2026-02-15 14:55Z) Adjusted `src/components/auth/ProfileCompletionModal.tsx` so its error handling now discriminates `unknown` errors instead of relying on `any`.
- [x] (2026-02-15 15:10Z) Typed `CoverLetterEditModal`’s `coverLetter` prop as `CoverLetterDraft` so the component no longer depends on `any`, and verified the wrapper passes local lint.
- [x] (2026-02-15 15:35Z) Simplified `LevelEvidenceModal`’s regex so the `-` no longer needs escaping, clearing the remaining `no-useless-escape` warning for that component.
- [x] (2026-02-15 16:00Z) Reworked `GoNoGoMetricsBar` so each summary section uses typed summary items (goals, strengths, core, preferred) instead of `any`, and verified the component passes lint independently.
- [x] (2026-02-15 16:15Z) Typed `CoverLetterViewModal`’s payload as `CoverLetterViewData` and hardened its clipboard/share helpers with `unknown` guards so the component now passes lint without `any`.
- [x] (2026-02-15 16:00Z) Reworked `GoNoGoMetricsBar` so each summary section uses typed summary items (goals, strengths, core, preferred) instead of `any`, and verified the component passes lint independently.
- [ ] Identify each directory that `npm run lint` currently touches (front-end `src/`, `supabase/`, `scripts/`, `notion-mcp-server`, etc.) and catalog the rule failures emitted today.
- [ ] Implement rule overrides or code fixes so that running `npm run lint` again passes without suppressing legitimate issues.

## Surprises & Discoveries

- Observation: ESLint reports thousands of unused disable directives coming from generated coverage artifacts and legacy JSON exports in `coverage/` and `coverage-core/`. Because `npm run lint` is run with `--report-unused-disable-directives`, those files now cause the command to fail even though the appearance of `/* eslint-disable */` there existed only for the coverage agent.
  Evidence: `npm run lint` on the existing tree stops before finishing and prints countless `(unused eslint-disable)` for the coverage `lcov-report` helpers plus trailing `unused disable` warnings in each generated JS file.
- Observation: The `notion-mcp-server`, `supabase/functions`, and `scripts/` directories all contain TypeScript files that default to or explicitly allow `any`, triggering `@typescript-eslint/no-explicit-any` everywhere once the rule is enabled globally.
  Evidence: `npm run lint` now exits after enumerating thousands of `@typescript-eslint/no-explicit-any` complaints across those directories, along with `@typescript-eslint/no-require-imports`, `ban-ts-comment`, and a handful of `no-inner-declarations`/`no-empty` warnings in script helpers.
- Observation: After the overrides were applied, the client/`src/` tree and shared service modules still expose hundreds of `@typescript-eslint/no-explicit-any`, `no-mixed-spaces-and-tabs`, and `no-inner-declarations` errors, so those folders will need targeted work to bring them in line.
  Evidence: `npm run lint` now stops with 2,465 problems mostly inside `src/components`, `src/services`, and `src/utils`, plus a few `no-useless-escape`/`no-constant-condition`/`no-empty` failures that remain unmatched by the current overrides.

## Decision Log

- Decision: Treat generated coverage artifacts and exported reports as out-of-scope for linting by excluding them in the ESLint configuration instead of removing the disable directives from every generated file.
  Rationale: Those files are machine generated and will continue to reappear; adjusting the config keeps the command focused on source code.
  Date/Author: 2026-02-15 / Codex.
- Decision: Create per-directory overrides (or even separate `npm run lint:server` scripts) to progressively migrate `notion-mcp-server`, `scripts`, and `supabase/functions` from implicit `any` to typed APIs rather than dropping the rule globally.
  Rationale: These service layers are critical to correctness and must eventually obey the same linting discipline; targeted overrides let us unblock the CI without ignoring the cleanup entirely.
  Date/Author: 2026-02-15 / Codex.

## Outcomes & Retrospective

When this plan is complete, `npm run lint` reports zero errors and zero unused disable alerts. The remaining gaps will include a short list of explicitly documented no-explicit-any overrides that are scheduled for replacement. The work keeps the lint command as a single source of truth and restores the developer feedback loop that currently logs thousands of noise-level failures.

## Context and Orientation

The lint command in `package.json` runs from the repo root with `eslint . --report-unused-disable-directives --max-warnings 0`. ESLint is configured in `eslint.config.js`, which presently only applies to `.ts` and `.tsx` files and enables `react-hooks` plus a handful of overrides. The TypeScript sections live in `src/` (client), `supabase/` (Edge functions + migrations), `scripts/` (CLI helpers), and `notion-mcp-server/` (Notion integration). Coverage and artifacts land in `coverage/`, `coverage-core/`, and `dist/`.

This plan assumes that `node_modules` is large but already excluded via default ESLint ignores (the CLI adds them) and that the repo uses the `@/` alias from `tsconfig.json` for imports. The key files we will edit are `eslint.config.js`, possible new ESLint override files, and the TypeScript files that currently mention `any` or `eslint-disable` comments. 

## Plan of Work

First, rerun `npm run lint` from the repo root to capture every rule failure; copy the first few hundred lines of output into a scratch doc so we can group them by category (unused disable, explicit any, other typed exceptions). Next, update `eslint.config.js` to ignore non-source artifacts such as `coverage/` and `coverage-core/` and to add flat-config overrides for `supabase`, `scripts`, `notion-mcp-server`, and the shared tests so that we can deliberate on a per-directory roadmap while still letting the CI command succeed.

After applying those overrides, the remaining failures now live in `src/` and the shared service/utility libraries. Audit the `no-explicit-any` hits in `src/` first: identify the modules that cause the most noise (`src/components/cover-letters`, `src/services/*`, `src/utils/*`), introduce typed interfaces or helper guards to replace broad `any` usage, and normalize any indentation or other stylistic complaints such as `no-mixed-spaces-and-tabs` before moving on. Each cleanup batch should be followed by `npm run lint` to prove the error count shrinks and to document the new baseline for the next pass.

Finally, create a stabilization checklist within this plan describing what needs to exist before we can rotate the `no-explicit-any` override from an exception to a rule. Document that list in the plan's text (under `Plan of Work` or `Artifacts & Notes`) so future contributors can find it even after the lint code changes happen.

## Directory Prioritization

The remaining lint noise is concentrated in a few directory clusters. We will walk through them in this fixed order, cleaning enough files in each cluster so that rerunning `npm run lint` shows a measurable reduction before moving on.

1. **`src/components/cover-letters`** – This folder hosts the heaviest bundle of `@typescript-eslint/no-explicit-any`, `no-mixed-spaces-and-tabs`, and styling issues that trigger dozens of the remaining errors. We already touched the modal wrapper; next we will add domain types for the data flowing through `CoverLetterModal`, `CoverLetterDraftView`, `CoverLetterDraftEditor`, and associated hooks so the majority of cover-letter UI files become type-safe.
2. **`src/components/auth` and related onboarding widgets** – After cover-letter components, finish any remaining `any` usages in auth/onboarding helpers (`AuthTestPanel`, `NameCaptureModal`, `ProfileCompletionModal`, `RLSTestPanel`) by introducing typed result bags or helper guards and by cleaning up mixed indentation warnings.
3. **`src/services` (core client services)** – Transition service layers like `fileUploadService`, `gapDetectionService`, `providerService`, and the synthetic data helpers from `any` to explicit request/response models, reusing shared types from `src/types` wherever possible. Each service cleanup should be followed by `npm run lint -- <service>` to confirm progress before moving to the next service.
4. **`src/utils` and shared helpers** – Once services are typed, focus on the utility modules (`evaluationExport`, `gaps`, `linkedinUtils`, `retryWithBackoff`, `rlsTest`, etc.) by defining precise argument/return types or switching to `unknown` + narrowers where full typing is too heavy.
5. **`supabase/` + `notion-mcp-server` + `scripts`** – Keep these directories inside the temporary overrides for now but document a migration backlog for each; after client-side cleanup, revert the overrides one directory at a time while introducing the same typed helpers used elsewhere so we can eventually run lint without per-directory relaxations.
6. **`tests/` and `playwright` fixtures** – Finally ensure test helpers, fixtures, and E2E mocks respect the cleaned types so lint stops flagging `any` in spec files; keep targeted `npx eslint <test-file>` runs to prove each file is clean before declaring the directory done.

Each directory milestone should be accompanied by a short note in the Progress log and the Artifacts section describing the lint commands run, command outputs, and any lingering blockers so the living plan stays synchronized with the cleanup work.

## Concrete Steps

    npm run lint
    npm run lint -- src/
    npm run lint -- notion-mcp-server
    grep -R "eslint-disable" coverage coverage-core | head -n 20
    rg --files --iglob "*.ts" notion-mcp-server | head -n 10

Each command is run from `/Users/admin/narrata` and captures context around the current failures or serves as a verification point.

## Validation and Acceptance

Run `npm run lint` from the repository root. Acceptance is when the command prints only:

    ✔ No lint warnings.
    0 errors

and it exits with status 0. Optionally, rerun `npm run lint -- src/` and `npm run lint -- notion-mcp-server` after the server changes to show both subsystems are clean. A second verification is to run `npm run test:core` to confirm that type changes introduced during the cleanup do not degrade critical logic.

## Idempotence and Recovery

All steps modify ESLint configuration and source code in a way that can be re-applied safely. Format-preserving edits ensure rerunning `npm run lint` on the same revision will succeed, and Git can revert any malfunctioning change. If a new override makes lint too permissive, remove that override and rerun `npm run lint` to show the previously failing files are again flagged before deciding whether to keep the change.

## Artifacts and Notes

    $ npm run lint
    > eslint . --report-unused-disable-directives --max-warnings 0
    /Users/admin/narrata/src/components/cover-letters/CoverLetterModal.tsx:361:1 error no-mixed-spaces-and-tabs
    /Users/admin/narrata/src/components/auth/RLSTestPanel.tsx:56:21 error @typescript-eslint/no-explicit-any
    /Users/admin/narrata/scripts/dedupe-content-variations.ts:109:10 error no-constant-condition
    ✖ 2465 problems (2354 errors, 111 warnings)
    2 errors and 0 warnings potentially fixable with the `--fix` option.

    $ rg "no-explicit-any" src | head -n 5
    src/services/fileUploadService.ts:84:12
    (the actual output will list the offending files; capture them in a reference doc for follow-up)

The plan will include any diff snippets or command transcripts that prove a step worked once we start editing.

    Notably, running `npm run lint -- src/components/auth/AuthTestPanel.tsx` or `npm run lint -- src/components/auth/NameCaptureModal.tsx` now only fails because the rest of the repo is still noisy; the targeted files themselves no longer produce `@typescript-eslint/no-explicit-any`.
    $ npx eslint src/components/auth/RLSTestPanel.tsx
    $ npx eslint src/components/auth/ProfileCompletionModal.tsx
    $ npx eslint src/components/cover-letters/CoverLetterEditModal.tsx
    $ npx eslint src/components/cover-letters/GoNoGoMetricsBar.tsx
    $ npx eslint src/components/cover-letters/CoverLetterViewModal.tsx
    $ npx eslint src/components/assessment/LevelEvidenceModal.tsx

## Interfaces and Dependencies

The changes will touch:

- `eslint.config.js`: update the root config, add `ignorePatterns`, and define targeted overrides that can be refined later.
- `supabase/functions/**/*.ts` and `scripts/**/*.ts`: convert their `any` usage into explicit request/response types or shared helper types imported from `src/types/` or new helpers.
- `notion-mcp-server/**/*.ts`: same as above but paying attention to the Notion API models defined inside that service, ensuring we import the existing DTOs.
- `src/` modules that interface with the services above: align their exported types so the server-coded overrides can consume consistent shapes without `any`.

If new helper files are required, ensure they live under `src/types` or `supabase/types` and are referenced by `tsconfig.json` paths.

Note: This update captures the current git state after applying the flat-config overrides (ignoring coverage artefacts and relaxing `no-explicit-any` in the service/test layers), so the remaining work in `src/` can be tracked in the same living document without losing the context behind those overrides.
