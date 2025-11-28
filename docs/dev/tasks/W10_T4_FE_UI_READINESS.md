# W10 Task 4 — Frontend Readiness UI (Toolbar + Optional Modal)

**Worker Model:** Claude Sonnet 4.5  
**Parent Specs:**  
- `docs/specs/W10_READINESS_METRIC.md`  
- Depends on: T2 (EF ready) → T3 (Service + API ready)

---

## Purpose (One Sentence)
Surface the Draft Readiness verdict in the UI: primary surface in the Match Metrics toolbar as an accordion with verdict, score breakdown, and improvements; optional secondary surface in the finalization modal. Fully gated by `ENABLE_DRAFT_READINESS`, non-blocking, and read-only.

---

## In Scope
- Hook to consume the API: `src/hooks/useDraftReadiness.ts` (React Query/SWR).
- Wire the toolbar accordion (primary surface) to use the hook:
  - Collapsed: badge + verdict (Weak/Adequate/Strong/Exceptional).
  - Expanded: score breakdown (10 dimensions) + feedback summary + up to 3 improvements.
  - Loading/skeleton and soft-failure copy.
  - Auto-refresh alignment with TTL via T3 API responses.
- Optional: lightweight display in finalization modal (“Preliminary editorial verdict”).
- Feature-flag gating via `ENABLE_DRAFT_READINESS` (use `isDraftReadinessEnabled()`).
- Accessibility: semantic headings, aria-expanded, keyboard traversal.

## Out of Scope
- Edge Function implementation (T2).
- API/service creation or server auth (T3).
- Any modification to draft schema, metrics, gaps, or A-phase.
- Manual refresh UI; evaluation remains auto-only (per spec).

---

## Inputs & Outputs
### Inputs
- `draftId` and `draftUpdatedAt` (for invalidation).
- `GET /api/drafts/:id/readiness` (T3): returns `{ rating, scoreBreakdown, feedback, evaluatedAt, ttlExpiresAt, fromCache }`, or 204 when unavailable, 503 when disabled.

### Outputs
- UI states: loading, verdict view, expanded details, soft error when unavailable.
- No mutations; read-only rendering.

---

## Implementation Steps
1. Hook: `src/hooks/useDraftReadiness.ts`
   - Uses React Query or SWR to fetch `/api/drafts/:id/readiness`.
   - Keys on `[draftId, draftUpdatedAt]` to revalidate after saves.
   - Treat 204 as “no readiness yet”; 503 as disabled; other 5xx soft-fail.
   - Expose `{ data, isLoading, isError, fromCache, ttlExpiresAt }`.

2. Toolbar wiring
   - Update `src/components/cover-letters/MatchMetricsToolbar.tsx` to consume the hook (replace any direct service calls).
   - Gate display with `isDraftReadinessEnabled()` and `isPostHIL`.
   - Collapsed chip uses verdict label capitalization and status color:
     - Exceptional → success
     - Strong → primary
     - Adequate → warning
     - Weak/unknown → muted
   - Expanded content:
     - Feedback summary (short sentence).
     - Table/grid of 10 dimensions with icons/colors for strong/sufficient/insufficient.
     - Improvements list (max 3, simple bullets).
   - Loading: subtle skeleton bars; Error: small caption “Readiness unavailable.”

3. Optional finalization modal
   - Add a compact card reflecting the latest verdict (no breakdown table).
   - Same gating/flags; reuse hook.

4. TTL-driven refresh alignment
   - If `ttlExpiresAt` is present, schedule a passive refresh tick after expiry (no visible spinner unless user opens the accordion).
   - Do not add manual refresh UI in W10.

5. Flag handling
   - Use `src/lib/flags.ts:isDraftReadinessEnabled()` exclusively.
   - When disabled, hide the accordion entirely and avoid network calls.

6. Styles & a11y
   - Follow existing toolbar patterns (badge, accordion).
   - Ensure aria attributes on the toggle button and focus visibility.

---

## Tests / Checklist
- [ ] Hook returns null on 204, disabled on 503, and data on 200.
- [ ] Toolbar shows verdict badge when enabled and data present.
- [ ] Breakdown & improvements render correctly (10 keys, ≤3 bullets).
- [ ] Loading and soft-error states render predictably.
- [ ] No UI appears when flag disabled; no fetch is performed.
- [ ] Auto-revalidation triggers on `draftUpdatedAt` change.
- [ ] TTL expiry re-fetches and updates verdict without flicker.

---

## Do NOT
- Do not calculate metrics client-side or alter draft/enhancedMatchData.
- Do not implement manual refresh.
- Do not call Supabase Edge Functions directly from the browser; use T3 API only.
- Do not auto-open/close the accordion on updates.

---

## Handoff / Parallelization
- May run in parallel with T5 (frontend telemetry only) once T3 stabilizes API shape.
- Blocked on T3 implementation; safe to prototype hook with mocked 200/204/503 responses until T3 is ready.

