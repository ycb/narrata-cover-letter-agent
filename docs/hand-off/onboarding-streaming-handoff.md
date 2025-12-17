## Onboarding Streaming — Hand‑off Brief

Audience: next implementing agent/engineer
Scope: Resume streaming MVP (Edge), LinkedIn merge, Stories generation, latency instrumentation, and related onboarding UI


### 1) Current Status (as of hand‑off)

- Streaming (Edge) is live for resume parsing
  - Function: `supabase/functions/process-resume/index.ts` (v7)
  - Stages: extracting → skeleton (roles) → skills → complete
  - CORS/preflight fixed; blocking onboarding UX polls `sources.processing_stage`
- Database writes
  - `work_items` insert works again (per‑role, ensures `company_id`, normalized dates)
  - `user_skills` insert works (simple insert; no ON CONFLICT path)
- UI/Counts
  - Companies card now scoped to the latest run (distinct `company_id` from `work_items` for the latest resume `source_id`); shows 7 in the latest test
  - Roles show 7 (from the latest run)
  - Stories currently 0 (pipeline not firing on this branch)
  - LinkedIn tile only turns green on successful Connect (no longer auto‑green)
- Latency
  - Resume total recorded on `sources` (latest ~19.1s: llm ~18.3s, db ~0.6s)
  - Client writes for `cover_letter`, `linkedin`, `onboarding_total` have been added (to `evaluation_runs`) but need verification + dashboard surfacing


### 2) What Changed in This Branch (high level)

1. Edge function created/fixed
   - New function: `process-resume` with stricter CORS, JSON parsing, error handling
   - Replaced batch `work_items` insert with per‑role insert + `ensureCompanyId()` to avoid batch failure
   - Normalizes dates (YYYY → YYYY-01-01; YYYY-MM → YYYY-MM-01)
2. RLS/Storage fixes (previously)
   - `storage.objects` policies for bucket `user-files` resume path
   - `public.sources` trigger `set_user_id_from_auth()` for inserts
   - `processing_stage` column + realtime publication
3. UI fixes
   - Companies card now queries distinct companies from `work_items` for the latest `source_id`
   - LinkedIn tile only green after a successful Connect
4. Latency instrumentation
   - Resume timings on `sources` (llm, db, total)
   - Client app logs `cover_letter`, `linkedin`, `onboarding_total` to `evaluation_runs` (needs confirmation + dashboard display)


### 3) What’s Missing / Not Working

1. LinkedIn merge is not wired post‑streaming completion on this branch
   - Main has a working flow that merges LI data into roles; this branch doesn’t trigger it after Edge completes
2. Stories generation is not invoked
   - No active code path writing to `stories` after `work_items` are inserted
3. Per‑stage latency visibility is partial
   - Resume is visible; CL/LI/Total rows exist in code but need verification and dashboard display
4. Optional (queued): My Voice population from CL (async)
   - Documented in `docs/my-voice-population-diagnostic.md`; needs transform from structured `{tone,style,persona}` → `UserVoice.prompt`


### 4) Repeated Failures / Where Time Was Lost

- Broke `work_items` insertion by switching to a bulk upsert → company map miss → `company_id` null → batch failure (fixed by per‑role insert and `ensureCompanyId`)
- Telemetry changes briefly introduced NOT NULL violations (`evaluation_runs.session_id`); now writing a safe fallback
- Companies count used the global companies table instead of user/source‑scoped `work_items`
- LinkedIn tile incorrectly turned green from auto‑detected URL; corrected to green only after Connect success
- Did not diff early enough with `main` for LI merge + stories; missed existing, battle‑tested paths
- Over‑promised ETAs without landing a working end‑to‑end (lack of quick reversion to known‑good paths)


### 5) Root Cause Hypotheses (System + Agent)

- System RCA
  - Data writes refactor (batch upsert) assumed ON CONFLICT/return semantics that didn’t hold for existing rows → missing `company_id` → hard failure
  - No feature flag or adapter to call main’s finalize pipeline after Edge completion → LI merge and stories silently skipped
  - No integration test/e2e check to ensure “resume→roles→stories” remained intact after streaming

- Agent RCA
  - Did not cherry‑pick main’s LI merge/stories immediately; attempted live refactors under time pressure
  - Inadequate initial scoping of counts (Companies) and telemetry schema (session_id)
  - Communication drift (repeated short ETAs); insufficient “restore first, improve later” discipline


### 6) Top Priorities to Finish (Keep Streaming; Preserve Main Behavior)

1) Reattach LinkedIn merge from main (no logic changes; add minimal adapter)
   - Where: the same function(s) main uses to map LI → roles
   - When: trigger immediately after Edge sets `sources.processing_stage='complete'` (same moment the UI transitions)
   - Output: `work_items` updated/augmented; dedupe identical to main

2) Re‑enable stories generation from main’s code path
   - Where: main’s story creation routine/prompt/service
   - When: run after roles exist (immediately following LI merge; or after resume complete if LI not connected)
   - Output: non‑zero `stories` for this onboarding run

3) Verify latency rows in `evaluation_runs` and surface on dashboard
   - `resume_parse_extract`, `cover_letter_parse_extract`, `linkedin_fetch_enrich`, `onboarding_total`
   - Show on `EvaluationDashboard` and/or `/evaluation-dashboard`

4) (Queued) Async My Voice population on CL upload
   - Transform `{tone,style,persona}` → `UserVoice.prompt` string (Recommended: Option A in diagnostic doc)


### 7) Concrete Implementation Notes (preserve existing code)

- Streaming adapter (only)
  - After Edge updates `sources.processing_stage = 'complete'`, call the same finalize path that `main` uses:
    - LI merge: same function(s) invoked by the legacy flow post‑connect
    - Stories: same creation routine used today in main (no prompt/schema changes)
  - This can be a small serverless function or a client‑side call to the existing “onboarding” job endpoint (whichever `main` currently calls)

- Companies card (already fixed)
  - Query: distinct `company_id` from `work_items` scoped to latest resume `source_id` (fallback to user scope)
  - File: `src/components/onboarding/ImportSummaryStep.tsx`

- Files touched recently
  - Edge: `supabase/functions/process-resume/index.ts`
  - Onboarding page: `src/pages/NewUserOnboarding.tsx` (polling, progress, custom upload path)
  - Summary counts: `src/components/onboarding/ImportSummaryStep.tsx`


### 8) Test Plan (fast manual checks)

1. Resume only
   - Upload resume; wait for Edge to complete
   - Expect: `work_items` > 0; Companies == distinct companies from `work_items` (for the latest source)
   - Timings present on `sources` and `evaluation_runs` (resume stage)

2. Resume + LinkedIn
   - Connect LinkedIn after resume completion
   - Expect: roles augmented via main’s merge routine; dedupe behavior matches production

3. Stories
   - After roles present, expect non‑zero `stories` (matching main’s generator)

4. Counts
   - Companies = distinct from `work_items` for latest source
   - Roles = `work_items` count for latest source
   - Stories > 0
   - LinkedIn tile = green only after successful Connect


### 9) Business/Product Goals & Success Metrics

- Goals
  - Keep onboarding blocking but fast (Edge under the hood) and consistent with existing design
  - Preserve data quality (same LI merge + stories as main) with clearer progress
  - Provide measurable latency across stages to guide optimization

- Success Metrics (targets)
  - Resume parse→extract time: ≤ 60s p95 (goal 45–60s)
  - End‑to‑end onboarding (resume→LI/CL→summary): ≤ 5 min p95 with clear UI progress
  - Data completeness: Roles ≥ main baseline; Stories ≥ main baseline on same inputs
  - Error rate: < 2% of runs with RLS/insert failures
  - Latency observability: `evaluation_runs` rows present for resume, CL, LI, total for ≥ 95% of onboarding runs


### 10) Quick RCAs by Symptom (for future regressions)

- Roles = 0, Companies high
  - Likely `work_items` insert failure (check Postgres logs for NOT NULL on `company_id`) or Companies card mis‑scoped
- Stories = 0 with Roles > 0
  - Story pipeline not invoked; verify post‑resume/LI finalize hooks
- LinkedIn tile green prematurely
  - Ensure green only on successful Connect callback; no auto‑green from detected URL
- Resume 400/401
  - CORS headers or missing Authorization/apikey; check function logs for preflight + 401s


### 11) Ownership Pointers

- Edge: `supabase/functions/process-resume/index.ts`
- Onboarding (blocking flow, upload): `src/pages/NewUserOnboarding.tsx`
- Counts summary: `src/components/onboarding/ImportSummaryStep.tsx`
- Evaluation dashboard: `src/components/evaluation/EvaluationDashboard.tsx`
- Policies/migrations (already applied): `supabase/migrations/*_sources_*`, storage policies
- Voice diagnostic: `docs/my-voice-population-diagnostic.md`


### 12) Final Notes

- Do not redesign LI merge or Stories—restore main’s code paths as‑is and only add a minimal trigger after Edge completion.
- Keep streaming (Edge) under the hood; users still see the same blocking UI and summary.
- Add stage timings to the dashboard once CL/LI rows are confirmed landing in `evaluation_runs`.












