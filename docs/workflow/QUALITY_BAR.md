# Quality Bar

This is the minimum standard for changes merged into `main`.

## Required Before Merge

- Agent review first (use Playwright MCP when UI behavior matters).
- Human approval after agent confirmation.
- CI passes: lint, unit tests with coverage, and build.
- A clear test plan in the PR (what was run and what was not).
- Branch protection should require the CI workflow to pass before merge.

## Definition of Done

- The change solves the user-facing problem described in the PR.
- Tests cover the primary behavior or the regression being fixed.
- No new lint errors or TypeScript failures.
- Build succeeds (`npm run build`).

## Coverage Policy

- CI runs `npm run test:ci` to collect coverage on every PR and push.
- Coverage thresholds are intentionally low at first to avoid blocking the team.
- Raise thresholds over time (“ratchet up”) as coverage improves.

Use `docs/workflow/TEST_MATRIX.md` to decide which tests are expected for a change.
