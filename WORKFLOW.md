# Workflow

This document defines the team workflow for planning, building, testing, and deploying changes in this repository. It complements (does not replace) PLANS.md, which governs ExecPlans for agent-driven work.

## Sources of Truth

- Planning for larger changes: `PLANS.md` (ExecPlan rules and structure).
- Commands and tooling: `CLAUDE.md`.
- Quality bar and release guidance: `docs/workflow/`.
- Testing guides: `docs/testing/` and `docs/qa/`.
- Skills playbooks: `docs/skills/`.
- Setup and environment: `docs/setup/`.

If a detail is missing here but exists elsewhere, add a short pointer here so the workflow stays discoverable.

## When to Use an ExecPlan

Use an ExecPlan when any of the following are true:

- The change is user-facing or changes behavior.
- The change touches multiple modules/services or requires schema changes.
- The work has unclear requirements, dependencies, or rollout risk.
- The work needs coordinated testing or deployment steps.

Small, contained fixes can proceed without an ExecPlan, but should still state scope and acceptance in the PR description.

## Planning and Definition of Done

For ExecPlan work, follow `PLANS.md` exactly. For smaller changes, define:

- Goal: what the user can do after the change.
- Acceptance: how to verify it (commands and expected outputs).
- Tests: the minimum set to run.

### Agent-Driven Quality Checklist

Before opening a PR, agents should:
- Attach an ExecPlan link for non-trivial changes.
- Run local quality gates: `npm run lint`, `npm run test:core`, `npm run test:diff-coverage`, `npm run build`.
- Run `npm run test:e2e` when user flows or UI behavior are touched.
- Provide a test plan and risk level in the PR template.
- List milestone commits in the PR when an ExecPlan is used.
- Ensure local githooks are installed (auto via `postinstall` or run `npm run install:githooks`). Pushing to `main` runs `npm run preflight` and prompts for a manual override; `ALLOW_MAIN_PUSH=1` can be used for non-interactive automation.

## Branching and PRs

- Branch from `main`.
- Keep PRs focused and scoped.
- PR title format: `[narrata] <Title>` (per repo instructions).

Branch naming: keep it semantic and concise (e.g., `fix-upload-timeout`, `feat-gap-summary`, `chore-build-warnings`).
Review policy: first pass is an agent review; use Playwright MCP for UI verification when relevant. After agent confirmation, human approval is required before merge.

### Branch Protection (GitHub)

For `main`, configure a branch protection rule with:
- Require a pull request before merging.
- Require at least 1 approval (human approval).
- Require status checks to pass:
  - `CI` workflow (or the `CI / quality` job).
- Require branches to be up to date before merging.

## Build and Test Workflow

Use the commands in `CLAUDE.md` as the default toolchain:

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:8080)
- Lint: `npm run lint`
- Unit tests: `npm test` or `npm test -- path/to/test.test.tsx`
- Unit tests (CI + coverage): `npm run test:ci`
- Unit tests (core + coverage gate): `npm run test:core`
- Diff coverage (core changes): `npm run test:diff-coverage`
- UI tests: `npm run test:ui`
- Build: `npm run build`
- Preview: `npm run preview`

Suggested minimums:

- Code changes: run targeted tests for the area you touched.
- Structural changes (imports/moves): run `npm run lint`.
- User-facing changes: run `npm run build` and a manual smoke check.
- CI gates: `.github/workflows/ci.yml` runs lint, core unit tests with coverage, diff coverage, and build on PRs and `main`. Full unit tests run non-blocking for visibility.

Nightly coverage:
- `.github/workflows/nightly.yml` runs full unit tests + Playwright E2E on a schedule and uploads artifacts.

## Data, Migrations, and Edge Functions

- Schema changes go in `supabase/migrations/` following existing patterns.
- Use Supabase CLI or MCP tools for schema inspection and verification.
- Edge Functions live in `supabase/functions/` and must be deployed after code changes.

Define the exact migration/deploy commands and environments here once finalized.

## Deployment

Staging and production deploys use FTP and are automated via GitHub Actions.

### GitHub Actions (FTP)

Workflow: `.github/workflows/deploy.yml`

- Staging deploys on push to `main` and can also be triggered manually.
- Production deploys are manual via workflow dispatch and should be gated by a GitHub Environment approval.

Required GitHub Secrets:

- `STAGING_FTP_HOST`, `STAGING_FTP_USER`, `STAGING_FTP_PASS`
- `PROD_FTP_HOST`, `PROD_FTP_USER`, `PROD_FTP_PASS`

Notes:

- Both environments deploy to `/` (root) in their respective FTP accounts.
- If you need server-side backups (`backup-latest` / `backup-del`), add a pre-deploy step using `lftp` or switch to tag-based rollback.
- `.htaccess` and `robots.txt` are expected to be built into `dist/` on each deploy.
- For the marketing site, see `docs/marketing/DEPLOYMENT_GUIDE.md`.

### Rollback

Rollback is tag-based: redeploy a prior git tag via the production workflow.
No server-side backup rotation is used at this time.

To redeploy a tag:

- Create or identify the tag (e.g., `v1.2.3`).
- Example: `git tag v1.2.3 && git push origin v1.2.3`
- Run the `Deploy (FTP)` workflow manually.
- Select `production` and set `ref` to the tag (e.g., `v1.2.3`).

## Post-Deploy Verification

At minimum:

- Run a smoke test on the main user flows you changed.
- Verify any backend jobs or Edge Functions you touched.
- Check logs/monitoring for errors.

Specify exact checks and URLs once the deployment workflow is defined.

## Open Questions

- What is the staging environment URL and access flow?

Fill these in as decisions are made so the workflow remains actionable.
