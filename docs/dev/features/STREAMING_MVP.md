MVP Implementation Plan for Streaming Across Onboarding, Cover Letters, and PM Levels

⸻

0. Purpose

Narrata currently has 45–70 second waits for major operations (Onboarding, Cover Letter Creation, PM Levels). This is too long for users. The objective is to implement a single, unified streaming architecture that delivers incremental results within the first 3–10 seconds and continues updating progressively until the job is complete.

This MVP must be:
	•	Simple
	•	Reliable
	•	Reusable across all long-running tasks
	•	Future-proof for additional services
	•	Safe to ship without architectural churn

⸻

1. Core Strategy — One Streaming Pipeline Using SSE

All long-running work (Onboarding, Cover Letter Creation, PM Levels) will run through:
	1.	A start job endpoint (POST)
	2.	A stream job endpoint (GET) using Server-Sent Events (SSE)
	3.	A staged backend pipeline that emits progress events
	4.	A single React hook that consumes streaming events
	5.	A unified in-memory job state model
	6.	One final persistence write to Supabase when the job completes

All progress is delivered over SSE, not via DB polling or callback-based DB writes.

⸻

2. High-Level Lifecycle

1) Client starts a job
	•	Calls POST /api/jobs/{type}
	•	Server creates job record in database and returns jobId

2) Client opens EventSource stream
	•	Calls GET /api/jobs/stream?jobId=XYZ
	•	Backend begins work immediately when stream starts (lazy execution)

3) Backend executes stages
	•	Each stage produces a progress event like:
	•	{ jobId, type, stage: "parsedInputs", data: {...} }
	•	UI updates as each stage arrives (work history, metrics, gaps, levels, etc.)

4) Final result persists to DB
	•	On final stage, pipeline merges results and writes once

5) Backend emits complete event
	•	Client closes the stream automatically

⸻

3. Backend Components

3.1 Job Table (Supabase)

A single table to track job lifecycle:
	•	id (UUID)
	•	type (onboarding, coverLetter, pmLevels)
	•	status (pending, running, complete, error)
	•	input (JSON)
	•	result (JSON)
	•	error_message (text)
	•	created_at
	•	updated_at

Important:
We do not write intermediate data to the DB.
The stream provides all partials.

⸻

4. API Endpoints

4.1 Start Job

POST /api/jobs/onboarding
POST /api/jobs/cover-letter
POST /api/jobs/pm-levels

Each:
	•	Validates input
	•	Creates row in DB (status = pending)
	•	Returns { jobId }

4.2 Stream Job

GET /api/jobs/stream?jobId=XYZ

Returns an SSE stream with headers:
	•	Content-Type: text/event-stream
	•	Cache-Control: no-cache
	•	Connection: keep-alive

Stream emits events:
	•	progress (payload includes stage & incremental data)
	•	complete
	•	error

Backend begins job execution upon client connecting.

⸻

5. Pipelines (Staged Execution)

5.1 Onboarding Pipeline (resume + cover letter + LinkedIn)

Stages:
	1.	parseInputs (3–8s)
	•	Extract rough jobs, basic profile fields
	2.	skeletonProfile (8–20s)
	•	Merge resume/LinkedIn
	•	Identify core stories, skills, themes
	3.	detailedProfile (20–60s)
	•	Inferred impact
	•	Suggested stories
	•	Confidence scoring
	4.	Final DB save + complete event

⸻

5.2 Cover Letter Creation Pipeline

Stages:
	1.	basicMetrics (5–10s)
	•	JD summary
	•	Top themes
	•	Initial fit score
	2.	requirementAnalysis (10–25s)
	•	Core/preferred requirements
	•	Matched evidence from user profile
	3.	sectionGaps (25–45s)
	•	Per-section gap analysis
	•	Recommendations
	4.	draftLetter (optional MVP step)
	•	Generate first-pass letter
	5.	Final DB save + complete event

⸻

5.3 PM Levels Pipeline

Stages:
	1.	baselineAssessment (5–10s)
	•	Role-to-level mapping
	•	Initial IC-band assessment
	2.	competencyBreakdown (10–30s)
	•	Execution, Strategy, Customer Insight, Influence
	3.	specializationAssessment (30–45s)
	•	Growth
	•	Platform
	•	AI/ML
	•	Founding
	4.	Final DB save + complete event

⸻

6. Frontend Architecture

6.1 Shared Hook: useStreamingJob(jobId, type)

Responsibilities:
	•	Open EventSource to stream endpoint
	•	Maintain jobState in React memory
	•	Merge partial results into correct subtrees
	•	Handle progress, complete, and error events
	•	Expose jobState to pages/components

6.2 Shared Job State

All job types share:
	•	jobId
	•	type
	•	status
	•	Job-type-specific data subtrees

E.g.:
	•	state.onboarding.skeleton
	•	state.coverLetter.requirementAnalysis
	•	state.pmLevels.competencyBreakdown

6.3 UI Behavior

Each UI page reacts to changes in jobState:
	•	Replace skeletons as soon as stage data arrives
	•	Render new info immediately
	•	Always remain responsive and visually active
	•	No 40+ second blank UI periods

⸻

7. Error Handling

Backend:
	•	Catch stage failures
	•	Emit error event
	•	Update DB with status "error"

Frontend:
	•	Detect error
	•	Show inline retry button
	•	Preserve any partial data delivered before failure

⸻

8. Rollout Plan

Phase 1 — Infrastructure (1–2 days)
	•	Create table
	•	Create POST /api/jobs/* endpoints
	•	Create GET /api/jobs/stream
	•	Create useStreamingJob hook
	•	Create shared job state model

Phase 2 — Onboarding Streaming (1–2 days)
	•	Implement 2–3 stages
	•	Wire onboarding page to job state
	•	Test full streaming flow end-to-end

Phase 3 — Cover Letter Streaming (2 days)
	•	Add 3–4 stages for CL creation
	•	Replace existing async logic with streaming
	•	Remove legacy callbacks/DB-refetch logic

Phase 4 — PM Levels Streaming (1–2 days)
	•	Add pipeline stages
	•	Connect PM Levels page

Phase 5 — Polish (1 day)
	•	Add progress indicators
	•	Add skeleton transitions
	•	Add telemetry (time-to-first-progress, time-per-stage)
	•	Add global error handling patterns

⸻

9. Success Criteria
	•	Time to first content < 10 seconds for all flows
	•	At least 2 visible UI updates per job
	•	No blank/idle screens
	•	Reduction in abandonment during onboarding and CL creation
	•	System handles 3 job types with a single streaming engine

⸻

10. Summary

This MVP establishes a unified streaming architecture using SSE and a staged pipeline model shared across Onboarding, Cover Letter creation, and PM Leveling. The architecture eliminates long idle waits, improves perceived performance massively, and creates a foundation for future Narrata services with real-time, incremental intelligence.

⸻
    