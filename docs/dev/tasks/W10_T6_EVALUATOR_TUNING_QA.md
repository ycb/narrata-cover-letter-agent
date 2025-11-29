# W10 Task 6 — Evaluator Tuning, Rubric Weights, and QA Sign‑off

Owner: PM + BE/FE (tuning + QA)  
Depends on: T2 (EF), T3 (API), T4 (UI), T5 (Telemetry)

---

## Purpose (One Sentence)
Finalize the Draft Readiness evaluator: lock rating subtitles, apply weighted scoring across the 10 dimensions, define mapping thresholds and expected distributions, and run a focused QA to validate behavior prior to release.

---

## Finalized Rating Copy (Subtitles)
- Weak: Major structural/gaps; not ready to send; needs substantial revision.
- Adequate: Professional and coherent; OK to send to a recruiter; polish recommended.
- Strong: Persuasive and tailored; confident to send to a hiring manager; minor edits only.
- Exceptional: Polished, evidence‑rich, crisply aligned; ready to send as‑is.

---

## Dimension Weights (Sum = 100)
- Company Alignment: 15
- Role Alignment: 15
- Specific Examples: 12
- Quantified Impact: 12
- Personalization: 10
- Clarity & Structure: 10
- Writing Quality: 8
- Opening: 8
- Length & Efficiency: 5
- Executive Maturity: 5

Scoring mapping per dimension:
- strong = 1.0
- sufficient = 0.6
- insufficient = 0.2

Overall score = Σ(weight_i × value_i) / 100 (in [0,1]).

Rating thresholds (mapping weighted score → enum):
- Exceptional: ≥ 0.85
- Strong: ≥ 0.72 and < 0.85
- Adequate: ≥ 0.55 and < 0.72
- Weak: < 0.55

Notes:
- These thresholds are initial and can be nudged ±0.03 in T6 if QA indicates systematic harshness/generosity.

---

## Distribution Expectations (for QA sanity)
First auto‑drafts (B‑phase immediately completed):
- Weak: 15–25%
- Adequate: 55–65%
- Strong: 10–20%
- Exceptional: <5%

“Normal” edited drafts (after 1–2 iterations):
- Weak: <5–10%
- Adequate: 45–55%
- Strong: 25–40%
- Exceptional: 5–10%

First‑draft target: “Adequate” is acceptable baseline; “Strong” is possible but not required on first pass.

---

## Engineering Checklist
1) Update evaluator prompt (EF helper)
   - Add final subtitles for all ratings.
   - Include the weight table and scoring mapping (1.0/0.6/0.2).
   - Add thresholds and distribution notes as guidance (non‑binding).
   - Add “first‑draft target is Adequate” statement for calibration.
   - Implement the rating mapping logic (score → enum) explicitly in the prompt or post‑validation step.

2) Zod schema (no change)
   - Rating strings remain: 'weak' | 'adequate' | 'strong' | 'exceptional'.

3) FE copy constants (UI)
   - Replace placeholder subtitles with the PM‑approved copy above in the UI surfaces (toolbar drawer + finalization card).

4) QA plan (this task)
   - Use distributions and thresholds as pass/fail heuristics across curated datasets.

---

## T6 QA Plan
Datasets:
- Gold‑standard curated draft (expected Exceptional).
- Typical user‑quality edited draft (Adequate/Strong).
- Three‑sentence nonsense draft (Weak).
- Over‑personal storytelling draft (should not exceed Strong unless aligned and evidenced).
- Keyword‑dense but poorly written draft (Adequate or lower).
- Non‑PM role draft (if tested: ensure alignment dims penalize).

Steps:
1. Run EF with flag enabled in staging; ensure migration present.
2. For each dataset, gather:
   - Rating, breakdown, feedback.
   - EvaluatedAt, TTL behavior.
3. Validate rating against expectations and dimensions:
   - Company/Role Alignment materially pull rating when misaligned.
   - Writing Quality/Clarity penalize verbose/poor text.
4. Check distributions:
   - Run 20–30 drafts (mixed) and verify ranges are within expected bands.
5. UI verification:
   - Toolbar + finalization card render correct subtitles and breakdown.
   - Feature flag off → no UI / no calls.
6. Telemetry:
   - Confirm EF events (started/cached/completed/short_draft) and FE events (viewed/expanded/ttl_tick).

Acceptance criteria:
- Ratings align with expected outcomes per dataset above.
- Aggregated distribution over the test set lands within stated ranges (±5% tolerance).
- No schema/typing regressions; UI shows finalized copy.
- No blocking behavior; failures degrade to “unavailable” without crashes.

---

## Risks & Mitigations
- Model variance → Use clear schema/thresholds; allow ±0.03 threshold tuning in T6 if needed.
- Over‑weighting alignment dims → Post‑QA adjust weights ±2–3 points if anomalies observed.
- Cost/latency → TTL reuse remains 10 minutes; short‑draft guard prevents waste.

---

## Rollout
- Soft‑launch behind `ENABLE_DRAFT_READINESS` to a QA/dogfood cohort.
- Monitor rating distribution + failure rates; adjust thresholds if out of band.

---

## Approvals Needed
- Confirm final subtitles, weights, thresholds, and first‑draft target.
- Approve T6 QA plan and acceptance criteria.


