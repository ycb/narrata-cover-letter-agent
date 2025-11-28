NTEGRATED_ROLE_INSIGHTS_AND_PM_LEVELS_STREAMING.txt

TITLE: Integrated Phase-A Streaming: Role Insights + PM Level Signals
GOAL: Deliver immediate, high-value insights during the long 60–90 second draft-generation period, without interfering with draft quality, gap stability, or template section IDs.

PREREQUISITES (MUST BE TRUE BEFORE IMPLEMENTATION)
	1.	Section-level gaps appear only after draft generation (Phase B) and never appear during streaming (Phase A).
	2.	Toolbar correctly streams ATS score, goals match, requirement counts using jobState.stages..data.
	3.	Canonical section IDs are stabilized: sec-0, sec-1, etc., and used exclusively across frontend and LLM output.
	4.	No undefined logs for gap or metric transformations.
	5.	Unified banner + single skeleton is working.

SYSTEM ARCHITECTURE OVERVIEW
Phase A (Streaming):
	•	JD parsing
	•	Requirement extraction
	•	Metrics calculation (ATS, goals match, experience match)
	•	Role Insight Generation (NEW INTEGRATION)
	•	PM-Level Alignment Insights (NEW INTEGRATION)

Phase B (Post-Draft):
	•	Draft-generation LLM call
	•	Draft-level gap detection
	•	Enhanced gap insights
	•	Final metrics and requirement counts
	•	Final gap summary

Phase A and B stay logically separate.
No Phase-A gap data affects Phase-B draft-level gaps.

SECTION 1 — DATA DESIGN
	1.	Extend jobState.stages with two new stages:
stages.roleInsights
stages.pmLevelInsights
	2.	Each stage returns a simple object shape, designed to be stable and easy to render:
roleInsights: {
seniorityFit: “weak” | “moderate” | “strong”
domainFit: “weak” | “moderate” | “strong”
businessModelFit: “weak” | “moderate” | “strong”
topReasons: [
{ reason: string, strength: “strong” | “moderate” }
]
}
pmLevelInsights: {
competencyFit: {
execution: number,
strategy: number,
insight: number,
influence: number
},
mismatchFlags: [
{ competency: string, message: string }
],
levelingNotes: string[]
}
	3.	Requirements for stability:
	•	Structures must remain constant after initial design.
	•	No variable key names.
	•	All values must be primitives or flat arrays to avoid transformation errors.

SECTION 2 — PIPELINE LOGIC

PHASE A PIPELINE ORDER:
	1.	metrics stage (existing)
	2.	requirementAnalysis stage (existing)
	3.	roleInsights stage (NEW)
	4.	pmLevelInsights stage (NEW)

Each stage writes:
jobState.stages..status
jobState.stages..data

No gaps appear in Phase A.

PHASE B:
Draft stage runs after all Phase-A stages finish.
Draft transforms do not overwrite Phase-A insights.
Phase-B gaps populate separately as draft-level insights.

SECTION 3 — STREAMING UI BEHAVIOR

Toolbar expands into a 2-row layout during streaming:

TOP ROW:
ATS score (streaming)
Match with Goals (streaming)
Core Requirements Met (streaming)
Preferred Requirements Met (streaming)

BOTTOM ROW (NEW):
Seniority Fit (roleInsights.seniorityFit)
Domain Fit (roleInsights.domainFit)
PM-Level Fit (averaged competencyFit score)

Appearance behavior:
	•	Toolbar appears immediately during streaming.
	•	Values stream in as stages complete.
	•	No flicker, no shrink, no collapse.
	•	No section-level gaps during Phase A.

SECTION 4 — DRAFT EDITOR BEHAVIOR

During streaming:
	•	Only skeleton + unified banner appear.
	•	Toolbar shows streaming insights.
	•	Section gap banners do not render.

After draft:
	•	Section gaps appear using enhancedMatchData.sectionGapInsights.
	•	Role insights and PM-level insights remain visible but visually distinguished as “overall fit”.

SECTION 5 — FRONTEND IMPLEMENTATION
	1.	Add two new selectors:
useRoleInsights(): returns streaming role insights (or null)
usePMLevelInsights(): returns streaming pm level insights (or null)
	2.	Make toolbar getters:
effectiveRoleInsights:
stages.roleInsights.data or null

effectivePMLevelInsights:
stages.pmLevelInsights.data or null
	3.	Rendering rules:
If loading → show placeholders for new fields.
If streaming → show streaming values.
If draft → keep streaming values, do not override unless we explicitly add draft-level refinements later.

SECTION 6 — BACKEND IMPLEMENTATION

Add two new pipeline stages:

Stage: roleInsights
Input:
	•	JD parsed requirements
	•	User profile (goals)
	•	Target job titles
Output:
	•	seniorityFit
	•	domainFit
	•	businessModelFit
	•	topReasons[]

Stage: pmLevelInsights
Input:
	•	PM Level assessment data
	•	JD competency expectations
Output:
	•	competencyFit (execution, strategy, insight, influence)
	•	mismatchFlags[]
	•	levelingNotes[]

These stages must produce output in < 1 second LLM wall-clock time.

SECTION 7 — GUARANTEES AND RULES
	1.	No section-level gaps are allowed in Phase A.
	2.	No draft-level gaps may override Phase-A role/PM-level insights.
	3.	No hallucinated section IDs matter anymore since gaps are Phase B only.
	4.	Phase-A insights must never cause flicker — data should only appear, never disappear.
	5.	Users should receive actionable value within 5 seconds (goal match, seniority fit, domain fit).

SECTION 8 — QA CHECKLIST BEFORE ENABLEMENT
	1.	Streaming toolbar shows all early insights (metrics + role + pm-level).
	2.	No section-level gaps appear during streaming.
	3.	After draft, all section-level gaps appear exactly once.
	4.	No warnings or “undefined” logs.
	5.	Pipeline staging order is respected.
	6.	LLM outputs always conform to guaranteed structure.
	7.	No regressions in draft generation.

SECTION 9 — POST-LAUNCH ENHANCEMENTS (OPTIONAL)
	•	Highlight role mismatch inside section gap banners post-draft
	•	Add PM-level tailored suggestions for each gap
	•	Add “fit summary” modal combining Phase-A and Phase-B insights
	•	Use PM level + JD to refine which template variant we choose for the draft