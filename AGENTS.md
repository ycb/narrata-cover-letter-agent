# AGENTS.md

## Project overview
- Narrata is an AI-powered cover letter agent for PMs and other knowledge workers.
- Core product principles: truth fidelity, human-in-the-loop control, and strategic storytelling.
- Positioning: reusable story library + intelligent matching + fast, high-quality letters.
- Orientation docs: `CLAUDE.md`, `NARRATA_BUSINESS_CONTEXT_COMPREHENSIVE.md`, and Notion MCP (see `CLAUDE.md` for setup and usage).

## Repo map (high-signal areas)
- `src/services/` houses most business logic (notably `fileUploadService.ts` and `gapDetectionService.ts`).
- `src/hooks/` is the main integration layer for data + UI; avoid direct Supabase calls in components.
- `src/prompts/` contains all AI prompt text; update these instead of hardcoding in services.
- `src/components/` follows shadcn/Radix patterns; reuse `ContentCard` and `ContentGapBanner`.
- `supabase/` contains migrations and functions; follow existing patterns before adding new schema.

## Dev environment tips
- Install deps: `npm install`
- Start dev server: `npm run dev` (Vite, port 8080)
- Build: `npm run build` (TypeScript + Vite)
- Preview build: `npm run preview`

## Testing instructions
- Unit tests: `npm test` (Vitest)
- UI tests: `npm run test:ui`
- E2E tests: `npm run test:e2e` or `npm run test:e2e:ui`
- Targeted runs: `npm test -- path/to/test.test.tsx`
- After moving files/imports, run `npm run lint`

## Environment variables and secrets
- `.env` currently includes live keys (Supabase, OpenAI, analytics, Notion, Apify). Treat as sensitive.
- Prefer adding a `.env.example` with redacted placeholders for onboarding.
- Feature flags and analytics toggles are split into `.env.development` and `.env.production`.

## Code patterns and guardrails
- Use `@/` path alias for imports.
- Keep Supabase operations in service layer; components should consume hooks.
- For AI behavior changes, edit `src/prompts/` first.
- Before adding new files, check `NEW_FILE_REQUESTS.md` to avoid duplication.

## MCP and tooling context
- Project MCP servers: Supabase + Notion (see `CLAUDE.md` for usage).
- GitHub CLI is available and authenticated (see `CLAUDE.md`).

## PR instructions
- Title format: `[narrata] <Title>`
- Run `npm run lint` and `npm test` before committing.
