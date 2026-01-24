# Quality Bar

This is the minimum standard for changes merged into `main`.

## Required Before Merge

- Agent review first (use Playwright MCP when UI behavior matters).
- Human approval after agent confirmation.
- CI passes: lint, core unit tests with coverage (`npm run test:core`), and build.
- A clear test plan in the PR (what was run and what was not).
- Branch protection should require the CI workflow to pass before merge.
- Local agent enforcement: a pre-push hook runs `npm run preflight` on pushes to `main` and prompts for a manual override (install via `npm run install:githooks`, use `ALLOW_MAIN_PUSH=1` for non-interactive automation).

## Definition of Done

- The change solves the user-facing problem described in the PR.
- Tests cover the primary behavior or the regression being fixed.
- No new lint errors or TypeScript failures.
- Build succeeds (`npm run build`).

## Coverage Policy (Forward-Looking)

Core scope is `src/services/`, `src/hooks/`, `src/lib/`, `src/pages/api/`, and `src/utils/`. This is the scope enforced by `npm run test:core`.

Policy:
- CI must pass `npm run test:core` (tests + coverage) and `npm run build`.
- Coverage thresholds are enforced for core scope and will be ratcheted up on a fixed schedule.
- New or modified core code must be exercised by at least one test in the same PR.
- A diff-coverage gate enforces a minimum of 80% for changed core lines (`npm run test:diff-coverage`).
- Full suite (`npm run test:ci`) remains non-blocking for visibility until UI refresh work is complete.
- PRs must include a test plan and risk level (see PR template).
- Agent review is required for every PR; use Playwright MCP when UI behavior changes.
- ExecPlan work must include milestone commits listed in the PR.

Ratcheting plan:
- Raise core thresholds each sprint by a small, fixed increment until targets are met.
- Target end state: core lines >= 80%, functions >= 70%, branches >= 60%.
- Thresholds live in `vitest.core.config.ts`.

Exceptions:
- Only allowed with a time-boxed waiver in the PR description and a follow-up ticket.

Use `docs/workflow/TEST_MATRIX.md` to decide which tests are expected for a change.
