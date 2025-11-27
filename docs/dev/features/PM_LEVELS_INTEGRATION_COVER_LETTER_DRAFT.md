PM_LEVELS_INTEGRATION_SPEC.txt

TITLE: PM Levels Integration into Cover Letter Streaming and Draft Analysis

PURPOSE:
Integrate PM Levels into the cover letter generation pipeline in two places:
	1.	Phase A – Streaming analysis
	2.	Phase C – Final draft analysis

The goal is to use PM Level expectations (competencies, scope, specialization signals) to enhance gap detection, weighting, and requirement matching. No backwards compatibility or legacy support is required.

⸻

	1.	DATA SOURCES (AFTER INTEGRATION)

⸻

The system will draw from 3 sources:

(1) Job Description (JD)
	•	Required qualifications
	•	Preferred qualifications
	•	Keywords and domains
	•	Seniority indicators

(2) User Data
	•	Saved stories
	•	Saved cover letter sections
	•	User goals (role, tone, target company traits)
	•	User profile (target PM level)

(3) PM Levels Data (NEW)
Pulled from pm_levels tables or precomputed JSON.

Required fields:
	•	targetLevel (e.g., L5)
	•	expected competencies at level:
Execution
Customer Insight
Strategy
Influence
	•	levelExpectations (scope, autonomy, org influence)
	•	specializationProfiles:
Growth
Platform
AI/ML
Founding

PM Levels become a FIRST-CLASS influence on analysis and gap generation.

⸻

	2.	WHERE PM LEVELS ENTER THE PIPELINE

⸻

PHASE A – STREAMING ANALYSIS
Inject PM Level data into all early analysis steps.

Four new uses:
	1.	Derived core requirements:
Convert PM Level expectations into derived requirements.
Example: For L6 Strategy, require roadmap ownership and cross-functional vision.
	2.	Gap heuristics:
Apply PM Level expectations directly to stories, sections, and JD matches.
Generates PM-level insight gaps early in streaming.
	3.	Weighting:
Apply weights per specialization:
Growth: Execution + Insight emphasis
Platform: Strategy + Influence
AI/ML: Strategy + Execution + ML-usability competencies
Founding: All four, plus ambiguity/narrative ownership
	4.	Streaming metrics:
Add the following to jobState.result:
	•	pmLevel (string)
	•	competencyCoverage (object with 4 scores)
	•	derivedCoreRequirements (array)

Example inserted object in jobState.result:
pmLevel: “L5”
competencyCoverage: { execution: 0.7, insight: 0.4, strategy: 0.8, influence: 0.6 }
derivedCoreRequirements: [ … list of derived requirements … ]

PHASE B – DRAFT GENERATION
Draft generation uses PM Level expectations implicitly to shape:
	•	tone
	•	seniority framing
	•	scope framing
	•	cross-functional leadership emphasis

No new UI. Only prompt-level influence.

PHASE C – FINAL GAP ANALYSIS
Inject PM-level gaps into draft.enhancedMatchData.sectionGapInsights.

Three gap types will exist simultaneously:
	1.	JD gaps
	2.	Story-based gaps
	3.	PM-Level gaps (NEW)

Example PM-level gap:
{
sectionId: “”,
gaps: [
{
id: “pm-level-strategy-ownership”,
title: “Strategic Ownership”,
description: “Your examples reflect feature-level decisions. L6 roles require multi-year roadmap ownership.”
}
]
}

This integrates cleanly into the existing canonical gap system implemented during your recent refactor.

⸻

	3.	DATA MODEL UPDATES

⸻

No schema changes.

Additions inside runtime objects:

A. jobState.result (streaming)
Add:
pmLevel
competencyCoverage
derivedCoreRequirements

B. draft.enhancedMatchData (final draft)
Add:
pmLevelSignals = {
targetLevel: “L5”,
competencyCoverage: { … },
levelExpectations: { … },
topMissingCompetencies: [ … ],
specializationRelevance: [ … ]
}

No tables need altering.

⸻

	4.	FRONTEND INTEGRATION

⸻

A. MatchMetricsToolbar
Show PM-level metrics if present:
	•	Competency alignment: X / 4
	•	Level match score (%)
All optional.

B. Gap Banners
No extra rules — PM-level gaps appear like any other.

C. No new components.

⸻

	5.	IMPLEMENTATION PHASES FOR AGENT

⸻

PHASE 1 — Backend (Streaming Integration)
	1.	Load PM Level data using userProfile.targetLevel.
	2.	Generate derived requirements.
	3.	Compute competency coverage vs stories and JD.
	4.	Insert into jobState.result:
pmLevel
competencyCoverage
derivedCoreRequirements

PHASE 2 — Backend (Final Draft Integration)
	1.	Reuse the same PM Level data.
	2.	Add PM-level gaps into sectionGapInsights.
	3.	Add pmLevelSignals into draft.enhancedMatchData.

PHASE 3 — Frontend Integration
	1.	In CoverLetterModal, read PM Level data from jobState and draft.enhancedMatchData.
	2.	Pass through existing unified data pipeline.
	3.	Display automatically through existing UI (no new UI needed).

⸻

	6.	ACCEPTANCE CRITERIA

⸻

Streaming:
	•	jobState.result contains pmLevel, competencyCoverage, derivedCoreRequirements.
	•	Streaming gap insights include PM-level items.

Final Draft:
	•	draft.enhancedMatchData contains pmLevelSignals.
	•	Gap banners include PM-level gaps.

User Experience:
	•	Early feedback incorporates PM Level expectations.
	•	Gaps appear reliably.
	•	No regressions in streaming or draft generation.

⸻

	7.	NON-GOALS

⸻

	•	No UI changes to PM Levels tool
	•	No new onboarding steps
	•	No rewriting of PM Levels rubric
	•	No auto-leveling the user during cover letter flow
	•	No ML competency scoring beyond simple heuristics

⸻
