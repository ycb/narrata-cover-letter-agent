# Supabase Backups

Nightly database dumps are committed here by GitHub Actions.

## Schedule
- Runs nightly at 00:00 America/Los_Angeles (cron `0 8 * * *` UTC).
- Manual runs are supported via `workflow_dispatch`.

## Folder layout
Each run creates a date-stamped folder:

```
backups/supabase/YYYY-MM-DD/
  schema.sql.gz
  data.sql.gz
  roles.sql.gz
```

All files are gzip-compressed SQL dumps produced by the Supabase CLI.

## Retention policy
- 14 daily
- 8 weekly
- 12 monthly

Retention is calculated in America/Los_Angeles time. Folders outside the policy
are removed on each run.

## Notes
- The Supabase CLI excludes Supabase-managed schemas (for example `auth` and
  `storage`) by default. If you customize those schemas, plan separate backups.
- Dumps are generated from `SUPABASE_DB_URL`, stored as a GitHub Actions secret.

## Restore (example)
```
gunzip -c schema.sql.gz | psql "$DB_URL"
gunzip -c data.sql.gz | psql "$DB_URL"
gunzip -c roles.sql.gz | psql "$DB_URL"
```
