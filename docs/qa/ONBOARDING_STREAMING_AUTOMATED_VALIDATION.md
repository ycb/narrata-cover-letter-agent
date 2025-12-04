# Onboarding Streaming — Automated Validation

## Prerequisites
- `.env` with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TEST_EMAIL`, `VITE_TEST_PASSWORD`, `VITE_OPENAI_API_KEY`
- Fixture files: `fixtures/synthetic/v1/raw_uploads/P01_resume.txt` and `_cover_letter.txt` (or set `--profile`)
- Test user id (optional): `TEST_USER_ID` to scope DB queries

## Scripts
- `npx tsx scripts/validate-onboarding-streaming.ts --user-id <uuid> [--output ./report.md]`  
  Checks latest resume/CL/LinkedIn sources, latency rows, stories linkage, saved sections/template, and My Voice format. Prints markdown summary (optionally writes to file).

- `npx tsx scripts/test-onboarding-idempotency.ts --profile P01`  
  Uploads the same resume + cover letter twice using `FileUploadService` and asserts no duplicate growth in work_items/stories/sections/template/voice after the second run. Fails the process on duplicate growth.

## Playwright
- `npx playwright test onboarding-streaming` (uses `tests/e2e/onboarding-streaming.spec.ts`)  
  Seeds a Supabase session, loads `/onboarding`, verifies cards render, and checks `evaluation_runs` contains the expected onboarding file_types.

## Outputs
- Validation script: markdown report to stdout (or `--output`) with ✅/❌ per check.
- Idempotency script: table deltas printed to stdout; exits non-zero on duplicate growth.
- Playwright: standard Playwright report (HTML in `playwright-report/` when run with default config).
