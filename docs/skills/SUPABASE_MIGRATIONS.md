# Skill: Supabase Migrations

Use this when you need to change the database schema.

## Steps

1) Create a migration in `supabase/migrations/` following existing naming patterns.
2) Apply the migration locally or in a dev branch (use Supabase CLI or MCP tools).
3) Update any affected services, types, and tests.
4) Verify behavior with targeted tests and a manual check.

## Notes

- Keep migrations additive where possible.
- If you need a destructive change, document the rollback path.
- Use `mcp__supabase__apply_migration` for safe DDL changes when working via MCP.
