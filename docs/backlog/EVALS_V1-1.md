NARRATA EVALS DASHBOARD — MVP PLAN
=================================

Goal:
-----
Reconstitute a reliable evals dashboard using DB-backed metrics for latency,
structural quality, and reliability across all major LLM calls. Add optional
LLM-as-judge semantic scoring without making it a dependency. Ensure full
coverage, catch incomplete or questionable results, and create a stable
foundation for long-term monitoring.

------------------------------------------------------------
1. CORE PRINCIPLES FOR THE MVP
------------------------------------------------------------
• All critical telemetry originates from the DB.
• Structural checks must be deterministic and non-LLM.
• Latency and failure detection come directly from job logs.
• LLM-as-judge is optional and only used for semantic scoring.
• Never use LLM-as-judge for correctness or reliability.
• Focus on completeness, coverage, and stability.

------------------------------------------------------------
2. DATA TO TRACK (MVP)
------------------------------------------------------------
For each LLM-dependent stage, track:

A) LATENCY
   - job start/end
   - duration_ms
   - time_to_first_update_ms (for streaming)
   - stage_durations_ms (optional)

B) RELIABILITY
   - success: boolean
   - error_type
   - error_message (truncated)
   - pipeline_stage_failed
   - incomplete output flags (structural)

C) STRUCTURAL QUALITY CHECKS (non-LLM, deterministic)
   Examples:
   • JD Parser: title present, company present, >=1 core requirement
   • CL Draft: paragraph_count in [3,4], word_count < 500
   • PM Levels: 4 competencies present, specializations non-empty
   • Onboarding: resume extracted, LI URL validated, work history count > 0
   (Each job type should have 3–6 binary invariant checks)

D) SEMANTIC (OPTIONAL) LLM-AS-JUDGE CHECKS
   Only for mature flows and sampled in production.
   Example outputs:
   - coherence_score (0–1)
   - tone_score (0–1)
   - completeness_score (0–1)
   - hallucination_risk ("low" / "medium" / "high")
   - jd_alignment_score (0–1)
   (These feed into a semantic section of the dashboard but do not affect reliability)

------------------------------------------------------------
3. DB SCHEMA (MVP)
------------------------------------------------------------
Create table: evals_log

Columns:
- id (uuid)
- job_id (uuid)
- job_type (text)
- stage (text)
- user_id (uuid)
- environment (text)

- started_at (timestamp)
- completed_at (timestamp)
- duration_ms (int)
- ttfu_ms (int)

- success (boolean)
- error_type (text)
- error_message (text)

- quality_checks (jsonb)      // structural checks
- quality_score (int)         // aggregated 0-100 score (optional)

- semantic_checks (jsonb)     // LLM-as-judge output (optional)
- result_subset (jsonb)       // safe snippet

Indexes:
- job_id
- job_type
- created_at
- environment

------------------------------------------------------------
4. PIPELINE INSTRUMENTATION
------------------------------------------------------------
Every LLM-related pipeline stage should call:

logEval({
  job_id,
  job_type,
  stage,
  started_at,
  completed_at,
  duration_ms,
  ttfu_ms,
  success,
  error_type,
  error_message,
  quality_checks,
  quality_score,
  semantic_checks (optional),
  result_subset,
  user_id,
  environment
})

NOTE:
• semantic_checks should run AFTER structural checks pass.
• semantic_checks should be optional (on/off via env flag).
• synthetic fixture runs should populate initial rows.

------------------------------------------------------------
5. DASHBOARD UI (MVP)
------------------------------------------------------------
The dashboard consists of 4 panels:

PANEL A — GLOBAL HEALTH
- 7-day success rate by job type
- average latency (p50/p90/p99)
- failure rate
- incomplete structural outputs
- quality score distribution

PANEL B — LATENCY EXPLORER
Columns:
• job type
• p50 / p90 / p99 latency
• last run
• trend sparkline

PANEL C — QUALITY HEATMAP
Matrix of job types vs structural checks:
Example:
JD Parser: title=100%, core req=98%, shape_valid=96%, halluc_flag=99%, score=91
CL Draft:  paragraphs=100%, sections=94%, arc_valid=82%, halluc_flag=100%, score=92

PANEL D — RECENT FAILURES
List LLM job failures:
• job_type
• stage
• error_message
• structural validation failures
• truncated results
• low semantic scores (if captured)

------------------------------------------------------------
6. SEEDING + RECONSTITUTION
------------------------------------------------------------
A) Run synthetic fixtures for:
   - JD parsing
   - Cover letter creation
   - PM Levels
   - Onboarding partial flows
   (3–5 runs each)

B) Use existing jobs table to reconstruct historical metrics.

C) Begin logging new data immediately using evals_log.

------------------------------------------------------------
7. COVERAGE PLAN
------------------------------------------------------------
1. Enumerate all LLM touchpoints across pipelines:
   - JD parser
   - Template assembly
   - CL draft
   - PM Levels
   - Onboarding steps (resume, LI extraction, work history)

2. For each, verify:
   - An eval log is written
   - Structural checks run
   - Failure cases captured
   - Semantic judge optional

3. Cross-check jobs table vs evals_log:
   If job exists with no eval entry → missing coverage.

------------------------------------------------------------
8. USING LLM-AS-JUDGE (GUIDELINES)
------------------------------------------------------------
• Use only for semantic quality scoring.
• Never use for structural validation.
• Never use to detect failures.
• Cache results (no re-scoring).
• Run in dev/stage environments; optional sampling in prod.
• Store scores in semantic_checks with JSON output only.

------------------------------------------------------------
9. MVP DEVELOPMENT ORDER
------------------------------------------------------------
1. Rebuild dashboard UI from DB.
2. Add evals_log table + logEval helper.
3. Add structural validation for JD, CL, PM Levels.
4. Add latency + stage duration tracking.
5. Add semantic judge (optional, env-gated).
6. Seed baseline with synthetic fixtures.
7. Validate full coverage by cross-checking with jobs table.
8. Launch internal-only dashboard.

------------------------------------------------------------
10. OUTCOME
------------------------------------------------------------
A reliable, low-noise, DB-backed evaluation system with:
- clear latency trends
- reliable success/failure detection
- structural quality checks for every job
- optional LLM-based semantic scoring
- a user-facing dashboard that improves trust and debuggability
- full coverage of Narrata's major LLM workflows

(End)