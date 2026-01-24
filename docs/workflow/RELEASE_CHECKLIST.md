# Release Checklist

## Pre-Release

- CI green on `main` (lint, tests, build).
- Confirm required env secrets are present for staging/prod.
- Identify the commit or tag to deploy.

## Staging Deploy

- Trigger deploy:
  - push to `main`, or
  - Actions → `Deploy (FTP)` → target `staging`.
- Verify:
  - App loads and renders expected route.
  - No console errors for missing env vars.
  - Smoke test the workflows you changed.
- Run smoke script:
  - `SMOKE_BASE_URL=<staging-url> npm run smoke:release`

## Production Deploy

- Recommended: tag the commit.
  - Example: `git tag v1.0.0 && git push origin v1.0.0`
- Deploy via Actions:
  - Actions → `Deploy (FTP)` → target `production` → `ref` = tag
- Verify:
  - Main user flow works.
  - No console errors or runtime config failures.
- Run smoke script:
  - `SMOKE_BASE_URL=<production-url> npm run smoke:release`

## Rollback

- Redeploy the previous tag via `Deploy (FTP)` with `ref` set to that tag.
