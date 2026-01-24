# Skill: Deploy via FTP

Use this when you need to deploy staging or production.

## Inputs

- GitHub Actions access to `Deploy (FTP)` workflow.
- Environment secrets in GitHub:
  - `STAGING_FTP_HOST`, `STAGING_FTP_USER`, `STAGING_FTP_PASS`
  - `PROD_FTP_HOST`, `PROD_FTP_USER`, `PROD_FTP_PASS`
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENAI_API_KEY`

## Staging

- Push to `main` or run `Deploy (FTP)` with target `staging`.
- Verify staging URL loads with no console errors.

## Production

- Tag the commit (recommended):
  - `git tag v1.0.0 && git push origin v1.0.0`
- Run `Deploy (FTP)` with target `production` and `ref` set to the tag.
- Verify production URL loads and core flow works.

## Rollback

- Redeploy the previous tag using `Deploy (FTP)` with `ref` set to that tag.
