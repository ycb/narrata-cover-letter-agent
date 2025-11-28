# W10 Task 3 — Service Hook & API for Draft Readiness

**Worker Model:** GPT‑5.1 Codex  
**Parent Spec:** `docs/specs/W10_READINESS_METRIC.md`

---

## Purpose (One Sentence)
Expose the readiness evaluation through our application services: add a typed service wrapper plus an authenticated REST endpoint (`/api/drafts/:id/readiness`) so the frontend can fetch verdicts securely, honoring feature flags and TTL caching. This task consumes the Edge Function from T2 (no EF changes here).

---

## In Scope
- `CoverLetterDraftService`: finalize `getReadinessEvaluation` helper (pure, flag-guarded) and export it for API use. Service must run on the server and call the EF/DB—do not call Supabase functions from the browser.
- New API route `src/pages/api/drafts/[id]/readiness.ts` (Next.js) that:
  - Authenticates the request (supabase auth or session).
  - Verifies the draft belongs to the current user.
  - Calls `CoverLetterDraftService.getReadinessEvaluation`.
  - Returns a normalized payload `{ rating, scoreBreakdown, feedback, evaluatedAt, ttlExpiresAt, fromCache }`.
- Error handling (4xx for auth/ownership, 503 for disabled flag, 500 for unexpected errors).
- Wiring for client consumption (hook or fetch util) that hits this endpoint instead of invoking Supabase/Edge directly.

## Out of Scope
- Edge Function logic (already delivered in Task 2).
- Database schema changes.
- Frontend UI rendering (handled in later tasks).
- Telemetry/analytics (Task 5).
- Manual refresh button behavior (still auto-only per spec).

---

## Inputs & Outputs
### Inputs
- HTTP request with authenticated session (existing Next auth helpers).
- Draft ID from URL.
- Feature flag `ENABLE_DRAFT_READINESS`.

### Outputs
```
{
  "rating": "weak" | "adequate" | "strong" | "exceptional",
  "scoreBreakdown": { ... per spec ... },
  "feedback": { summary: string, improvements: string[] },
  "evaluatedAt": string | null,
  "ttlExpiresAt": string | null,
  "fromCache": boolean
}
```
Errors return `{ error: string }` with appropriate HTTP status.

---

## Implementation Steps
1. **Service Refinement**
   - Ensure `CoverLetterDraftService.getReadinessEvaluation` lives in `/src/services/coverLetterDraftService.ts`, accepts `draftId`, uses a server-side Supabase client (injected), and delegates TTL + EF invocation to the backend (do not duplicate TTL logic). Export for API use. Include `fromCache` passthrough.

2. **API Route Scaffolding**
   - Create `src/pages/api/drafts/[draftId]/readiness.ts`.
   - Use existing API auth helper (`withApiAuth` or similar) to load user context.
   - Validate `draftId` param; return 400 if missing.

3. **Feature Flag Guard**
   - Import `isDraftReadinessEnabled` (`src/lib/flags.ts`). If false, respond with `503` + `{ error: 'disabled' }`. If the underlying EF responds `403 FEATURE_DISABLED`, translate to `503` for the client and do not expose EF internals.

4. **Ownership & Fetch**
   - Instantiate `CoverLetterDraftService` with server-side Supabase client.
   - Call `getReadinessEvaluation(draftId)`.
   - If null, return 204 (no content). The FE can treat 204 as “no readiness available yet.”

5. **Response Normalization**
   - Map service payload into camelCase JSON (matching spec).
   - Include `fromCache` boolean (true if TTL still valid), as forwarded from EF.

6. **Client Hook**
   - Add `useDraftReadiness(draftId)` hook in `src/hooks/useDraftReadiness.ts` that fetches `/api/drafts/:id/readiness` (SWR/React Query). The toolbar will call this later.

7. **Tests**
   - Add API route tests using our existing Next API test harness (if available) or unit test the handler:
     - Flag disabled → 503 (EF may be 403; ensure translation).
     - Missing draftId → 400.
     - Not owner → 403.
     - Happy path returns payload with 200.
   - Add hook test (using MSW or mocked fetch) verifying caching/invalidation.

8. **Docs**
   - Update `docs/dev/tasks/W10_T2_BACKEND_READINESS.md` status note referencing API availability.

---

## Test / Checklist
- [ ] `pnpm vitest tests/readiness.service.test.ts` (regression).
- [ ] New API handler tests pass.
- [ ] Hook tests (if added) pass.
- [ ] Manual curl against `/api/drafts/:id/readiness` returns expected payload when flag enabled.
 - [ ] Requests fail fast with 503 when flag disabled (translate EF 403).

---

## Do NOT
- Do not expose Supabase service role keys to the client.
- Do not bypass ownership checks or return readiness for other users.
- Do not mutate drafts or enhancedMatchData.
- Do not add new SSE streams or A-phase hooks.
- Do not introduce manual refresh endpoints beyond this GET route.

---

After this task, frontend work (Task 4) can consume the API/hook rather than calling Supabase directly.

