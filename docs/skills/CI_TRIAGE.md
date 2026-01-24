# Skill: CI Triage

Use this when a CI run fails on a PR or push.

## Steps

1) Open the failed run and identify the failing step (lint, test, build).
2) Copy the first error line and the stack trace, if present.
3) Reproduce locally with the same command.
4) Fix the issue and push.

## Common Failures

- Missing env vars: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY` in CI.
- Lint errors: run `npm run lint` locally for the exact report.
- Test failures: run the specific test file (`npm test -- path/to/test.test.tsx`).

## Verification

- Confirm the re-run is green.
- If the failure is flaky, add a note to the PR describing the investigation.
