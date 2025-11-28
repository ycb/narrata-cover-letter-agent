# W10 Task 5 — Telemetry & Logging for Draft Readiness (EF + FE)

**Worker Models:**  
- Backend telemetry: GPT‑5.1 Codex  
- Frontend telemetry: GPT‑5 (wiring) or Claude Sonnet 4.5  

**Parents:**  
- Spec: `docs/specs/W10_READINESS_METRIC.md`  
- Depends on: T2 (EF ready)  
- Can run in parallel with: T4 (FE UI), once T3 stabilizes API shape

---

## Purpose (One Sentence)
Add lightweight, privacy‑safe telemetry and structured logs for the Draft Readiness flow across Edge Function (backend) and UI (frontend) to measure latency, cache rate, rating distribution, and user interactions—without changing pipeline behavior.

---

## In Scope
- Backend (Edge Function `evaluate-draft-readiness`):
  - Emit start/complete logs with latency, cache usage, rating.
  - Count short‑draft guardrail hits (no LLM).
  - Feature‑flagged: disabled paths should log and return 403.
- Frontend:
  - Emit events when the “Readiness” accordion is viewed/expanded and when users finalize despite weak/adequate verdicts.
  - Log auto refresh ticks on TTL expiry (no button).
  - Dev‑only console breadcrumbs for diagnostics.
- Routing through existing logging/telemetry helpers:
  - EF: `elog` logger (already used in functions).
  - FE: `src/lib/telemetry.ts` with a small wrapper (`logAStreamEvent`‑style).

## Out of Scope
- Any A‑phase streaming changes.
- Any changes to draft schema, gaps, or metrics.
- Manual refresh UI.
- Third‑party analytics SDK rollout (we reuse existing plumbing).

---

## Events (Names + Payloads)
Backend (EF):
- `readiness_eval_started`
  - payload: `{ draftId, userId, hasCache: boolean }`
- `readiness_eval_cached`
  - payload: `{ draftId, userId, evaluatedAt, ttlExpiresAt }`
- `readiness_eval_completed`
  - payload: `{ draftId, userId, rating, latencyMs, evaluatedAt, ttlExpiresAt }`
- `readiness_eval_short_draft`
  - payload: `{ draftId, userId, wordCount }`
- `readiness_eval_disabled`
  - payload: `{ draftId?: string }`
- `readiness_eval_failed`
  - payload: `{ draftId, code: 'SCHEMA_VALIDATION_FAILED' | 'INTERNAL', message }`

Frontend (UI):
- `ui_readiness_card_viewed`
  - payload: `{ draftId, rating?: 'weak'|'adequate'|'strong'|'exceptional', fromCache?: boolean }`
- `ui_readiness_card_expanded`
  - payload: `{ draftId }`
- `ui_readiness_auto_refresh_tick`
  - payload: `{ draftId }`
- `ui_readiness_finalize_submit`
  - payload: `{ draftId, ratingAtSubmit?: 'weak'|'adequate'|'strong'|'exceptional' }`

Notes:
- FE events should be no‑ops when `ENABLE_DRAFT_READINESS` is false.
- Respect PII boundaries; don’t include draft content.

---

## Implementation Steps
1) Backend EF logging (T2 codebase)
   - In `supabase/functions/evaluate-draft-readiness/index.ts`:
     - Before TTL check: `elog.info('readiness_eval_started', {...})`.
     - On fresh cache return: `elog.info('readiness_eval_cached', {...})`.
     - On short draft: `elog.info('readiness_eval_short_draft', {...})`.
     - After successful upsert: `elog.info('readiness_eval_completed', {...})`.
     - On disabled flag: `elog.info('readiness_eval_disabled', {...})`.
     - On failures: `elog.error('readiness_eval_failed', {...})`.

2) Frontend telemetry wrapper
   - Extend `src/lib/telemetry.ts`:
     - Add `logReadinessEvent(name: string, payload?: Record<string, unknown>)`.
     - Dev‑only console output; production can route to existing analytics if enabled.

3) Toolbar integration (guarded)
   - In `MatchMetricsToolbar.tsx` (T4 will consume T3 API):
     - On accordion visible: fire `ui_readiness_card_viewed`.
     - On accordion expand: fire `ui_readiness_card_expanded`.
     - On TTL tick refresh: fire `ui_readiness_auto_refresh_tick`.
     - On finalization path (if shown): `ui_readiness_finalize_submit`.
   - Ensure `isDraftReadinessEnabled()` is used to avoid noise when disabled.

4) Docs
   - Add a short section to `evaluate-draft-readiness/README.md` documenting emitted EF telemetry lines and how to tail logs locally.
   - Document FE events in `docs/specs/W10_READINESS_METRIC.md` (footnote/link).

---

## Tests / Checklist
- [ ] EF logs: verify lines are emitted for cached, recomputed, short draft, and disabled cases (Deno tests may assert code paths; logs can be observed locally).
- [ ] FE: verify events fire only when flag enabled and relevant UI interactions occur (unit tests can mock `logReadinessEvent`).
- [ ] No personal content in payloads; only IDs/timestamps/ratings/booleans.
- [ ] Dev console noise behind dev guard; production remains minimal.

---

## Do NOT
- Do not block draft generation or UI actions if telemetry fails.
- Do not emit draft content or user PII beyond IDs already used.
- Do not trigger Edge Function from the browser—always go through T3 API.

---

## Parallelization
- Start BE telemetry immediately after T2 (can merge independently).
- FE telemetry can be wired in parallel with T4 once T3 response shape is stable.*** End Patch !*** End Patch``` }```  প্রতি~

