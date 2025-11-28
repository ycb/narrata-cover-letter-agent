# W10 Task 2 — Backend Readiness Evaluator

**Worker Model:** GPT‑5.1 Codex  
**Parent Spec:** `docs/specs/W10_READINESS_METRIC.md`

---

## Purpose (One Sentence)
Create the backend foundation for Draft Readiness by adding the `draft_quality_evaluations` store and the `evaluate-draft-readiness` Supabase Edge Function that computes, caches, and returns readiness verdicts with TTL + feature flag protection. Limit scope to Supabase + Edge Function + shared helpers (no app services/types here).

---

## In Scope
- Supabase migration for `draft_quality_evaluations` table.
- New shared helper module: `supabase/functions/_shared/readiness.ts` exporting:
  - `loadDraftReadinessContext(draftId)` → merged draft text, JD/company context; guard rails (min 150 words, safe truncation).
  - `draftReadinessSchema` (Zod) matching spec JSON.
  - `callReadinessJudge(context)` → wraps `streamJsonFromLLM`, validates with schema.
- Edge Function: `supabase/functions/evaluate-draft-readiness/index.ts` with README.
- Feature-flag enforcement (canonical `ENABLE_DRAFT_READINESS`) returning 403 on disabled.
- TTL logic (10‑minute cache) and upsert semantics per draft; compute `fromCache` in the response (do NOT persist).
- EF-local tests ( colocated under `supabase/functions/evaluate-draft-readiness/` or `_shared/` ).

## Out of Scope
- Any changes to draft schema, `enhancedMatchData`, requirement analysis, or gap logic.
- Cover letter generation pipeline (B-phase) ordering.
- Frontend/UI wiring (handled in later tasks).
- App-level types/services/tests (moved to Task 3).
- Telemetry wiring beyond lightweight logging (reserved for Task 5).
- Manual refresh endpoints/UI triggers.

---

## Inputs & Outputs
### Inputs
- Draft ID (UUID) passed to Edge Function/API.
- Draft content + merged sections (retrieved via existing services).
- JD/company context per spec (pull from existing job records).
- Feature flag value and env secrets for AI provider.

### Outputs
- Table row `{ draft_id, rating, score_breakdown json, feedback_summary, improvements[], evaluated_at, ttl_expires_at, metadata }`.
- Edge Function JSON response:
  - `{ rating, scoreBreakdown, feedback, evaluatedAt, ttlExpiresAt, fromCache }`
  - `fromCache` is response-only (not stored).
- Errors return structured 4xx/5xx with reason; failures must not block draft flow.

---

## Implementation Steps
1. **Migration**
   - Create `draft_quality_evaluations` table with columns specified in spec.
   - Add unique index on `draft_id`.
   - Include `metadata` jsonb (store model name, latency).

2. **Shared Helper**
   - Add `supabase/functions/_shared/readiness.ts` with:
     - `loadDraftReadinessContext(draftId)` using existing loaders; enforce min word count (150) and truncation.
     - `draftReadinessSchema` via Zod (exact spec).
     - `callReadinessJudge(context)` using AI‑SDK JSON streaming and schema validation.
   - Register in `NEW_FILE_REQUESTS.md` (log rationale and where we looked for reuse).

3. **Edge Function Scaffolding**
   - New directory `supabase/functions/evaluate-draft-readiness`.
   - Wire Supabase client + environment config (feature flag, AI credentials).
   - Add README with invocation, required env, example payloads, and error codes.

4. **Short-Draft Guardrail**
   - If draft < 150 words: skip LLM, emit synthetic `weak` verdict with concise feedback, upsert row, return `fromCache: false`.

5. **Feature Flag + Ownership**
   - If `ENABLE_DRAFT_READINESS` is not 'true' → return 403 `{ error: 'FEATURE_DISABLED' }` without DB/LLM calls.
   - Validate auth and draft ownership before any evaluation.
   - Downstream API route (Task 3) must translate this 403 into a 503 surface error so the client sees a consistent `disabled` status without leaking Edge implementation details.

6. **TTL + Upsert Logic**
   - If existing row and `ttl_expires_at > now` → return cached with `fromCache: true` (no LLM).
   - Else call judge, upsert row with `evaluated_at = now`, `ttl_expires_at = now + 10 min`, `metadata = { model, latencyMs }`, and return `fromCache: false`.

7. **Response Envelope**
   - Return `{ rating, scoreBreakdown, feedback, evaluatedAt, ttlExpiresAt, fromCache }`.

8. **EF-Local Tests**
   - Add tests co-located with the EF/helpers covering:
     - Flag disabled → 403, no DB upsert.
     - No row + valid draft → LLM call, write row, `fromCache: false`.
     - Fresh row → returns cached, `fromCache: true`.
     - Expired row → LLM call, overwrite, `fromCache: false`.
     - Short draft (<150 words) → no LLM, `weak` verdict with feedback.
     - Schema validation failure → 500, no DB write.

9. **Docs & Logging**
   - README in EF folder with curl examples and env notes.
   - Lightweight telemetry/log hooks (elog.info/error) for Task 5 compatibility.

---

## Test / Checklist
- [ ] `supabase db lint` passes.
- [ ] Feature flag OFF → 403 (`FEATURE_DISABLED`), no writes.
- [ ] Fresh cache path → returns row with `fromCache: true`.
- [ ] Expired cache path → recompute, upsert, `fromCache: false`.
- [ ] Short draft guardrail path → `weak` verdict without LLM.
- [ ] Schema failure → 500, no DB write, error logged.
- [ ] EF/helper tests green locally.

---

## Do NOT
- Do not touch `generateDraft`, requirement analysis, or gap engines.
- Do not mutate draft content or enhancedMatchData.
- Do not emit new SSE events or modify A-phase pipeline.
- Do not add manual refresh endpoints or UI triggers.
- Do not bypass schema validation or store unstructured AI responses.

---

When complete, hand off API/service integration (Task 3) with response contract and migration notes. App-level types (`DraftReadinessEvaluation`, `fromCache`) and service tests are explicitly deferred to Task 3.

