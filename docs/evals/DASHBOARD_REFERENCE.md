# Evaluation Dashboards — Reference Guide

**Date:** December 4, 2025  
**Purpose:** Documentation for both evaluation dashboards in Narrata

---

## Overview

Narrata has **two separate evaluation dashboards**, each serving distinct purposes:

1. **`/evaluation-dashboard`** — File Upload & Content Quality Dashboard (Legacy)
2. **`/evals`** — Pipeline Performance & Reliability Dashboard (Evals V1.1)

---

## Dashboard 1: File Upload & Content Quality

**Route:** `/evaluation-dashboard`  
**Component:** `src/components/evaluation/EvaluationDashboard.tsx`  
**Data Source:** `evaluation_runs` table  
**Primary Use:** Content quality assessment and synthetic data validation

### Purpose

Evaluates the **quality and accuracy** of content generated from file uploads (resumes, LinkedIn profiles, cover letters). Uses **LLM-as-judge** for semantic evaluation and heuristic extraction validation.

### Key Features

#### 1. User Type Filtering
- **All Users** — Combined synthetic + real users
- **Synthetic Users** — Test data only
- **Real Users** — Production users only

#### 2. Metrics Displayed

**Performance Metrics:**
- Total evaluations count
- LLM latency (average processing time)
- Pipeline time (end-to-end)
- Go/No-Go rate (% of approved outputs)
- Accuracy rate (LLM-judged content quality)

**PM Level Metrics:**
- Total PM level runs
- Success rate
- Confidence scores
- Level change tracking (delta analysis)

#### 3. LLM-as-Judge Evaluation

For each evaluation run, displays:
- **Accuracy Score** — Content matches expected output
- **Relevance Score** — Output relevance to input
- **Personalization Score** — Tailoring quality
- **Clarity & Tone Score** — Writing quality
- **Framework Score** — Structural correctness
- **Go/No-Go Decision** — Final quality gate

#### 4. Heuristic Extraction Validation

Shows extracted data categories:
- **Skills** (count and list)
- **Stories** (count and list)
- **Company Names** (extracted from experience)
- **Job Titles** (role history)
- **Contact Info** (email, phone, location)
- **Education** (degrees, institutions)

#### 5. Input vs Output Comparison

Side-by-side view:
- **Input Text (Full)** — Original uploaded file content
- **LLM Output (Full)** — Generated structured JSON
- Expandable raw text view

#### 6. PM Levels Tracking

**Detailed PM level analysis:**
- Inferred level (IC3, IC4, IC5, etc.)
- Confidence score (0-100%)
- Previous level (if rerun)
- Level changed flag
- Delta (what changed between runs)
- Snapshot (full competency breakdown)
- Trigger reason (why PM levels ran)
- Run type (first-run, rerun, diff)

#### 7. Data Quality Flags

**Human-in-loop flagging system:**
- Flag individual data points for review
- Flag types: Missing Data, Incorrect Data, Format Issue, Other
- Comments/notes per flag
- Flags summary panel
- Persistent flag storage in `data_quality_flags` table

### Data Model

**Primary Table:** `evaluation_runs`

**Key Columns:**
- `id` — Unique evaluation ID
- `user_id` — User who uploaded
- `session_id` — Session context
- `source_id` — Reference to uploaded file
- `file_type` — resume, coverletter, linkedin
- `user_type` — synthetic | real
- Performance metrics (latencies, tokens)
- LLM-as-judge scores
- Heuristics data (JSONB)
- PM levels data (when applicable)

**Related Tables:**
- `sources` — Original file uploads
- `data_quality_flags` — User-reported issues
- `synthetic_profiles` — Synthetic test data

### Use Cases

✅ **Synthetic Data Validation**
- Test new LLM prompts with synthetic profiles
- Validate extraction accuracy across file types
- A/B test different models

✅ **Content Quality Review**
- Review generated cover letters for quality
- Check PM level inference accuracy
- Validate heuristic extraction (skills, stories)

✅ **Debugging**
- Compare input → output for errors
- Identify missing or incorrect extractions
- Flag data quality issues for review

✅ **Performance Monitoring**
- Track LLM latency trends
- Monitor Go/No-Go rates
- Analyze accuracy degradation

### Limitations

❌ Does **not** track:
- Pipeline stage-by-stage performance
- Long-term reliability trends
- Production error rates
- Stage-specific failures

❌ Does **not** support:
- Time-series analysis beyond basic sorting
- Stage latency breakdown
- Structural quality scoring (deterministic)

---

## Dashboard 2: Pipeline Performance & Reliability

**Route:** `/evals`  
**Component:** `src/components/evaluation/PipelineEvaluationDashboard.tsx`  
**Data Source:** `evals_log` table + DB aggregation functions  
**Primary Use:** Production performance monitoring and reliability tracking

### Purpose

Monitors **pipeline performance and reliability** for Cover Letter and PM Levels jobs. Tracks latency, success rates, and structural quality at each pipeline stage. Designed for production observability.

### Key Features

#### 1. Time Range Filtering
- **Last 24 hours** — Recent performance
- **Last 7 days** — Weekly trends (default)
- **Last 30 days** — Monthly overview

#### 2. Job Type Filtering
- **All Job Types** — Combined view
- **Cover Letter** — Cover letter pipeline only
- **PM Levels** — PM levels pipeline only

#### 3. Latency Overview Card

**Job-level metrics:**
- **P50 (Median)** — Typical execution time
- **P90** — 90th percentile latency
- **P99** — 99th percentile (worst case)
- **Success Rate** — % of jobs completing without errors
- **Total Runs** — Number of jobs executed
- **Avg Quality Score** — 0-100 structural quality

**Color-coded badges:**
- Green badge: Success rate ≥ 95%
- Red badge: Success rate < 95%

#### 4. Quality Score Distribution Card

**Histogram buckets:**
- **81-100 (Excellent)** — Green badge
- **61-80 (Good)** — Blue badge
- **41-60 (Fair)** — Yellow badge
- **21-40 (Weak)** — Orange badge
- **0-20 (Poor)** — Red badge

Shows:
- Count per bucket
- Percentage of total
- Progress bar visualization
- Grouped by job type

#### 5. Stage Latency Breakdown Chart

**Stage-by-stage performance:**
- Horizontal bar charts (pure CSS)
- Success rate per stage
- P50 and P90 latency
- TTFU (Time to First Update) for streaming stages
- Failure count

**Cover Letter Stages:**
- JD Analysis
- Requirement Analysis
- Goals & Strengths
- Section Gaps
- Structural Validation

**PM Levels Stages:**
- Baseline Assessment
- Competency Breakdown
- Specialization Assessment
- Structural Validation

#### 6. Recent Failures Table

**Error debugging:**
- Expandable rows for details
- Job ID (copyable)
- Error type (TimeoutError, ValidationError, etc.)
- Error message (full stack trace)
- Quality checks (if available)
- Timestamp (relative: "5m ago", "2h ago")

**Columns:**
- Job Type badge
- Stage name (formatted)
- Error type badge (red)
- Time (human-readable)

#### 7. Export to CSV

**Download functionality:**
- Full `evals_log` data for selected time range
- Filtered by job type (optional)
- Timestamped filename
- Proper CSV escaping

### Data Model

**Primary Table:** `evals_log`

**Key Columns:**
- `id` — Unique eval log ID
- `job_id` — Reference to jobs.id (soft link)
- `user_id` — User who ran the job
- `job_type` — coverLetter | pmLevels | onboarding
- `stage` — Pipeline stage name
- `environment` — dev | staging | prod
- Timing metrics (started_at, completed_at, duration_ms, ttfu_ms)
- Reliability metrics (success, error_type, error_message)
- Quality metrics (quality_checks JSONB, quality_score 0-100)
- Result snapshot (safe subset, no PII)

**Aggregate Functions:**
- `get_evals_aggregate_by_job_type(since_date)` — Job-level metrics
- `get_evals_aggregate_by_stage(since_date, filter_job_type)` — Stage metrics
- `get_evals_quality_score_distribution(since_date, filter_job_type)` — Histogram
- `get_evals_recent_failures(filter_job_type, result_limit)` — Error list

**Related Tables:**
- `jobs` — Job execution context

### Structural Quality Checks

#### Cover Letter (8 Checks)
1. Overall Requirements Structure (critical)
2. Minimum Core Requirements (critical)
3. MWS Summary Score (critical)
4. Section Gaps Structure (critical)
5. Role Insights Presence (high)
6. Company Context Presence (high)
7. At Least One Section Gap (medium)
8. JD Requirement Summary (medium)

#### PM Levels (5 Checks)
1. Overall Structure Valid (critical)
2. Minimum Competency Count (critical)
3. Inferred Level Present (critical)
4. Specializations Present (high)
5. Assessment Text Length (medium)

**Quality Score Calculation:**
- Weighted by severity: critical=3x, high=2x, medium=1x
- Normalized to 0-100 scale

### Use Cases

✅ **Production Monitoring**
- Real-time performance tracking
- Identify slow/failing stages
- Monitor success rates

✅ **Performance Debugging**
- Drill down to specific job failures
- Analyze stage-by-stage latency
- Identify bottlenecks

✅ **Reliability Tracking**
- Long-term success rate trends
- Error rate monitoring
- Quality degradation detection

✅ **Optimization**
- Compare P50/P90/P99 before/after changes
- Identify stages to optimize
- Track improvement over time

### Limitations

❌ Does **not** track:
- LLM-as-judge semantic evaluations
- File upload events
- Heuristic extraction details
- Synthetic vs Real user split

❌ Does **not** support:
- Input vs Output comparison
- Content review workflow
- Data quality flagging

---

## Comparison Matrix

| Feature | `/evaluation-dashboard` | `/evals` |
|---------|-------------------------|----------|
| **Purpose** | Content quality | Performance monitoring |
| **Data Source** | `evaluation_runs` | `evals_log` |
| **LLM-as-Judge** | ✅ Yes | ❌ No |
| **Structural Quality** | ❌ No | ✅ Yes (0-100 score) |
| **User Type Filter** | ✅ Synthetic/Real | ❌ No |
| **Stage Breakdown** | ❌ No | ✅ Yes |
| **Latency Percentiles** | ❌ No | ✅ P50/P90/P99 |
| **Success Rate** | ✅ Go/No-Go | ✅ % Complete |
| **Error Debugging** | ❌ Limited | ✅ Full stack traces |
| **Time-Series** | ❌ No | ✅ 24h/7d/30d |
| **CSV Export** | ✅ Yes | ✅ Yes |
| **Input/Output Compare** | ✅ Yes | ❌ No |
| **Heuristics View** | ✅ Skills, Stories, etc. | ❌ No |
| **Data Flags** | ✅ Human-in-loop | ❌ No |
| **PM Level Delta** | ✅ Full history | ❌ No |
| **Real-time** | ❌ Batch updates | ✅ Live metrics |

---

## When to Use Which Dashboard

### Use `/evaluation-dashboard` When:
- Testing synthetic data quality
- Reviewing file upload accuracy
- Validating heuristic extraction
- Flagging data quality issues
- Comparing input → output content
- Tracking PM level changes over time
- Development/testing workflows

### Use `/evals` When:
- Monitoring production performance
- Debugging pipeline failures
- Tracking reliability trends
- Optimizing stage latency
- Identifying slow stages
- Exporting metrics for analysis
- Production observability

---

## Future Consolidation Options

### Option A: Unified Dashboard
Merge both dashboards into one view with tabs:
- **Quality Tab** — LLM-as-judge + heuristics (current `/evaluation-dashboard`)
- **Performance Tab** — Latency + reliability (current `/evals`)
- **Shared filters** — Time range, job type, user type

### Option B: Extend `/evals` with Content Quality
Add to pipeline dashboard:
- LLM-as-judge semantic scores
- Input vs output comparison
- Heuristic extraction validation
- Data quality flagging

### Option C: Keep Separate (Current)
Maintain two dashboards with distinct purposes:
- Content quality ↔ Performance monitoring
- Best separation of concerns
- Specialized tooling for each use case

---

## Related Documentation

- `EVALS_V1_1_IMPLEMENTATION_SPEC.md` — Technical spec for `/evals`
- `EVALS_V1_1_COMPLETE.md` — Implementation completion summary
- `QUICK_REFERENCE.md` — Developer quick reference
- `PHASE_5_PR_SUMMARY.md` — Dashboard component details

---

**Last Updated:** December 4, 2025  
**Maintained By:** Engineering Team

