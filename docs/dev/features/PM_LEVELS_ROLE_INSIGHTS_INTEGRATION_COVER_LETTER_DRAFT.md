STREAMING_SPEC_V2_ROLE_PM_LEVELS_AND_EARLY_INSIGHTS.txt

TITLE
Streaming Spec V2 – Role Insights + PM Levels + Early JD Insights (Cover Letter Draft)

REPLACES
PM_LEVELS_ROLE_INSIGHTS_INTEGRATION_COVER_LETTER_DRAFT

GOAL
Use AISDK streaming to give users immediate, draft-independent insights about role fit and context while their cover letter draft is generating, without touching or destabilizing existing draft-based metrics, requirements, or gaps.

NON-GOALS
	•	Do not change how gaps are computed from the draft.
	•	Do not stream section text yet; sections still appear “chunky” when B-phase completes.
	•	Do not introduce any new ID mapping layers or canonical ID complexity.
	•	Do not change the existing cover letter template structure or draft story selection logic, beyond what’s explicitly described here.

CURRENT BASELINE (STABLE BEHAVIOR)
	•	Unified “Drafting your cover letter…” banner and skeleton basically work.
	•	Progress bar and stage labels are driven by jobState / streaming pipeline.
	•	Toolbar currently relies on draft.enhancedMatchData only.
	•	Toolbar DOES NOT yet stream; all streaming into the toolbar is net-new in this spec.
	•	Gaps, requirement counts, and scores are all draft-based.

HIGH-LEVEL ARCHITECTURE

We keep the pipeline split:

A-phase (JD + user-level insights, draft-independent)
A1: Analyze job description and extract core/pref requirements.
A2: Match JD against user profile, PM Levels, and work history.
A3: Infer company maturity / industry / business model, using JD first and web search (company tags) as a fallback.

B-phase (draft + gap analysis, draft-dependent)
B1: Choose best matching stories / saved sections for dynamic template sections.
B2: Analyze gaps between JD requirements and the generated draft.

Streaming behavior:
	•	AISDK streams partial A-phase results back as they are available.
	•	Frontend uses streaming outputs only for:
	•	Role and level alignment (PM Levels).
	•	Match with Goals–style insights.
	•	Company context chips (maturity, industry, business model).
	•	MWS (Match with Strengths: strengths and specialties from PM Levels).
	•	Draft-based metrics, requirements, and gaps remain draft-only and are not overwritten by streaming.

PHASE LABELS (USER-FACING)

Banner stage labels should reflect actual A-phase work:

Stage 1: Analyzing job description
Stage 2: Extracting requirements
Stage 3: Matching with goals and strengths

Internally, A3 (company context lookup) can be folded into these stages; we don’t need a separate user-visible label for “searching the web”, but the logic is part of A-phase.

UX OVERVIEW

Entry point: Draft Cover Letter modal, Cover Letter tab.
	1.	t+0 after clicking Generate

	•	Banner:
	•	Title: “Drafting your cover letter…”
	•	Subtext: “This may take 60–90 seconds…”
	•	Progress bar begins at 0–10%.
	•	Stage labels:
“Analyzing job description” (Stage 1),
“Extracting requirements” (Stage 2),
“Matching with goals and strengths” (Stage 3).
	•	Template rendering:
	•	ALL STATIC TEMPLATE SECTIONS render immediately with their static text.
	•	DYNAMIC TEMPLATE SECTIONS render as skeletons (no content yet).
	•	This gives the user the true final structure (static + dynamic) from the first frame.
	•	Toolbar:
	•	Frame is visible with these slots:
	•	Match with Goals
	•	Core Requirements
	•	Pref Requirements
	•	Overall Score
	•	Match with Strengths (MWS)
	•	All sections initially show placeholders (e.g., “–” or skeleton chips).
	•	No streaming values yet, but the structure is present.

	2.	As A-phase streaming runs (no draft yet)

	•	Banner:
	•	Progress bar and stage checkmarks update from AISDK / jobState.
	•	Stage 1 completes when JD parsing is done.
	•	Stage 2 completes when core/pref req extraction is done.
	•	Stage 3 completes when role/strengths/goals insights and company context are ready (or time out).
	•	Toolbar behavior during A-phase:
	•	Match with Goals:
	•	Streams in high-level statements like “5 of 7 target titles aligned” or “This role is a strong match to your Growth focus.”
	•	Summary score (if any) can appear after the details or not at all in A-phase; draft remains source of truth for final numeric match.
	•	Core Requirements / Pref Requirements:
	•	Streams counts based on JD analysis: total core / total pref.
	•	These counts are A-phase estimates and may later be refined by draft-analysis if desired, but the draft is still the primary source of truth for requirements met.
	•	Overall Score:
	•	May stay blank or show an A-phase “preliminary fit” estimate.
	•	Final numeric score remains draft-based.
	•	Match with Strengths (MWS):
	•	Streams in a summary of how the role aligns with PM Level strengths and specializations.
	•	Example: “Strong match on Growth and AI/ML; moderate on Strategy; lower on Influence.”
	•	Includes small detail cards, each representing a specialty / competency.
	•	Toolbar accordions:
	•	User can open any combination of:
	•	Match with Goals
	•	Core Requirements
	•	Pref Requirements
	•	Match with Strengths
	•	Streaming updates fill in content inside the open accordions.
	•	Accordion open/closed state is controlled ONLY by user interaction; streaming never auto-closes or auto-opens anything.

	3.	When B-phase completes

	•	Sections:
	•	DYNAMIC sections are filled with actual draft text.
	•	STATIC sections keep their original content (unchanged).
	•	Layout remains stable; skeletons simply give way to real text.
	•	Draft-based analytics:
	•	Gaps are computed exactly as they are today (JD vs draft).
	•	Draft.enhancedMatchData.metrics, coreRequirementDetails, preferredRequirementDetails remain the source of truth for:
	•	Counts in the toolbar (requirements met).
	•	Per-section gap banners.
	•	Overall score.
	•	Streaming vs draft precedence:
	•	For toolbar numeric counts and final score:
	•	Use draft-based values once available.
	•	A-phase estimates can be shown as “preliminary” while draft is loading but should not contradict final numbers.
	•	For role insights, company context, and MWS:
	•	A-phase output remains the canonical source (since it doesn’t depend on draft).
	•	Draft does not overwrite these fields.

DATA SOURCES

User-level:
	•	Career Goals:
	•	Target job titles.
	•	Preferred industries, business models, company maturity.
	•	Target work type and cities.
	•	PM Levels:
	•	Current level and target next level.
	•	Competency scores: Execution, Customer Insight, Strategy, Influence.
	•	Specializations: Growth, Platform, AI/ML, Founding, etc.
	•	Work history:
	•	Titles, companies, tenure.
	•	Inferred scope per role (feature, product, product line, group/organization).

JD-level:
	•	Full job description text.
	•	Parsed core/pref requirements (existing).
	•	Inferred role level and scope (new).
	•	Parsed hints for maturity, industry, business model (new).

Company-level:
	•	JD-derived context (first pass).
	•	Company tags function (fallback):
	•	Input: company name + optional URL/LinkedIn slug.
	•	Output: maturity, industry, businessModels[].

ROLE INSIGHTS LOGIC

A1 – Analyze JD and extract requirements
	•	Extend existing JD parsing to also infer:
	•	inferredRoleLevel (APM, PM, Senior PM, Staff/Principal, Group/Director).
	•	inferredRoleScope (feature, product, product line, multiple teams, org/company-wide).
	•	Use an LLM prompt referencing our PM Levels framework to classify level/scope.

A2 – Match JD vs user profile, PM Levels, work history
	•	Inputs:
	•	Career goals target titles.
	•	PM Levels current and target levels.
	•	Work history with inferred scope.
	•	Outputs:
	•	titleMatch:
	•	exactTitleMatch: boolean.
	•	adjacentTitleMatch: boolean (e.g., you’re Senior PM, role is Staff).
	•	scopeMatch:
	•	scopeRelation: belowExperience | goodFit | stretch | bigStretch.
	•	goalAlignment:
	•	alignsWithTargetTitles: boolean.
	•	alignsWithTargetLevelBand: boolean.

A3 – Company context with JD-first, web-second
	•	Step 1 (JD inference):
	•	Extract explicit or implied industry, maturity, and business model from the job description.
	•	Mark confidence per field.
	•	Step 2 (fallback to company tags):
	•	For any missing or low-confidence field, call company tags function.
	•	Output:
	•	industry, maturity, businessModels[], and source: “jd”, “web”, or “mixed”.

B1 – Dynamic section matching (stories + saved sections)
	•	Keep the “dump” approach for now (no embeddings):
	•	Provide the LLM with:
	•	List of dynamic sections (id, type, title, optional hint).
	•	List of stories (id, title, text, tags, specializations).
	•	List of saved sections (id, title, text, tags).
	•	Ask the LLM to pick the best content for each dynamic section, considering:
	•	JD requirements.
	•	JD inferred level/scope.
	•	PM Level specializations (Growth, AI/ML, etc.).

B2 – JD vs draft gap analysis
	•	No change. Use existing implementation.
	•	Gaps remain draft-based and are not influenced by A-phase streaming.

MWS (MATCH WITH STRENGTHS) LOGIC
	•	Inputs:
	•	PM Levels specialization tags.
	•	PM Levels competency strengths (e.g., Execution: Proficient).
	•	JD requirements and tags (e.g., Growth, Platform, AI/ML).
	•	Output:
	•	mws.summaryScore (0–3 or similar small ordinal band).
	•	mws.details[]:
	•	Each detail includes:
	•	label (e.g., “Growth product work”, “AI/ML usability”).
	•	strengthLevel (strong, moderate, light).
	•	short explanation tying user strengths to JD.

FRONTEND CHANGES

Central streaming state (high-level)
	•	One hook (useJobStream) / AISDK handler receives streaming updates.
	•	We normalize A-phase outputs into a single object, e.g.:
coverLetterStreamingState = {
basicMetricsStage: {…},
requirementAnalysisStage: {…},  // includes inferredRoleLevel/scope
roleInsights: {…},              // titleMatch, scopeMatch, goalAlignment, mws
companyContext: {…},            // industry, maturity, businessModels
}
	•	This state is provided to:
	•	Banner + progress bar.
	•	Toolbar (summary and child cards).
	•	Any future A-phase components.

	1.	Toolbar Layout

New/clarified sections (left column):
	•	MATCH WITH GOALS
	•	CORE REQUIREMENTS
	•	PREF REQUIREMENTS
	•	OVERALL SCORE
	•	MATCH WITH STRENGTHS  (MWS)

For each section:
	•	Summary strip (always visible):
	•	For now, summary counts and score remain draft-based once draft is available.
	•	Before draft: summary strip can show “–” or a simple A-phase hint like “Analyzing…”.
	•	Accordion (expandable panel):
	•	Shows streaming A-phase content (where applicable).
	•	Examples:
	•	Match with Goals:
	•	“This role matches 2 of your 3 primary target titles.”
	•	“Level: Senior PM; you’re targeting Staff/Principal (stretch).”
	•	Core/Pref Requirements:
	•	Early counts (“JD lists 11 core requirements and 2 preferred.”).
	•	Match with Strengths:
	•	One card per strength area explaining alignment.

Props to toolbar component should at minimum include:
	•	draftMetrics:
	•	metrics: draft.enhancedMatchData.metrics
	•	coreRequirementDetails: draft.enhancedMatchData.coreRequirementDetails
	•	preferredRequirementDetails: draft.enhancedMatchData.preferredRequirementDetails
	•	streamingInsights:
	•	roleInsights: coverLetterStreamingState.roleInsights (optional).
	•	companyContext: coverLetterStreamingState.companyContext (optional).
	•	jdRequirementSummary: counts computed from A-phase requirementAnalysis (optional).

Toolbar rendering rules:
	•	Numeric badge counts for requirements and score:
	•	Use draft values once draft is present.
	•	Before draft, either:
	•	show “–”, or
	•	display a muted A-phase count labeled as “from JD” if we want to be explicit.
	•	Streaming details:
	•	Render as soon as streaming data is available.
	•	Never interfere with draft-based counts once those exist.

	2.	Accordion Behavior

	•	Each section’s accordion is controlled by local state:
	•	isGoalsOpen, isCoreReqsOpen, isPrefReqsOpen, isMwsOpen.
	•	Streaming updates:
	•	Only update the data inside the accordion.
	•	Do not change open/closed booleans.

	3.	Banner and Progress Bar

	•	Continue to use jobState + stage completion for:
	•	Banner text.
	•	Stage labels: “Analyzing job description”, “Extracting requirements”, “Matching with goals and strengths”.
	•	Progress percentage.
	•	Ensure banner is independent from toolbar:
	•	If streaming roleInsights fails, progress still shows accurate pipeline progress.

LOGGING AND DIAGNOSTICS
	•	Log when each A-phase component becomes available:
	•	“[STREAM] roleInsights ready”
	•	“[STREAM] companyContext ready”
	•	Log a small summary when toolbar renders:
	•	hasDraftMetrics, hasRoleInsights, hasCompanyContext.
	•	At job completion:
	•	Log if roleInsights or companyContext are unexpectedly missing.

TEST PLAN (FOCUSED ON NEW BEHAVIOR)
	1.	Static template sections at t+0

	•	Generate a cover letter for a template that includes static sections (e.g., header, closing) and dynamic sections.
	•	Confirm:
	•	All static sections render immediately with real content.
	•	Dynamic sections show skeletons.
	•	Banner and toolbar frame appear.

	2.	A-phase streaming without draft

	•	Observe toolbar while draft is still generating.
	•	Confirm:
	•	Match with Goals accordion gets populated with JD vs goals/levels insights.
	•	Match with Strengths accordion shows at least a basic alignment summary using PM Levels.
	•	Company chips (industry, maturity, business model) appear in one of the accordions or as chips in the toolbar header.

	3.	Transition to draft

	•	When draft text appears:
	•	Requirement counts and overall score show correct draft-based values.
	•	A-phase insights (title match, scope match, MWS, company context) remain visible.
	•	No gaps or counts disappear.

	4.	Edge cases

	•	JD with little company info:
	•	Confirm we see JD-derived context first and then (if needed) web-derived context.
	•	User whose target level >> JD level:
	•	MWS and Match with Goals clearly indicate “this may be underscoped”.
	•	PM Levels with no specializations:
	•	Match with Strengths accordion degrades gracefully (e.g., “We don’t yet have enough specialization data; add more stories to improve this insight.”).

CONSTRAINTS AND GUARDRAILS
	•	Draft.enhancedMatchData remains the sole source of truth for:
	•	Requirements met counts.
	•	Final overall score.
	•	Section gaps.
	•	Streaming roleInsights and companyContext must live in separate fields and must not overwrite draft data.
	•	No introduction of new section ID systems; we rely on existing IDs from template/draft for any section-level interactions.

---

## IMPLEMENTATION STATUS

### Branch & Feature Flag
- **Branch**: `streaming-mvp` (do NOT sync with main)
- **Feature Flag**: `ENABLE_A_PHASE_INSIGHTS` (gates all A-phase UI)

### Task 3: PM Levels Profile Loader (BE, Sonnet) ✅ COMPLETE

**Status**: Implemented and documented

**Files Created**:
- `supabase/functions/_shared/pm-levels.ts` - Main loader implementation
- `supabase/functions/_shared/README.md` - Documentation
- `supabase/functions/_shared/examples/pm-levels-usage.ts` - Usage examples
- `supabase/functions/_shared/__tests__/pm-levels.test.ts` - Test harness

**Files Modified**:
- `supabase/functions/_shared/pipeline-utils.ts` - Re-exports for convenience

**API Summary**:
```typescript
import { getPMLevelsProfile } from './_shared/pm-levels.ts';

const profile = await getPMLevelsProfile(supabase, userId);
// Returns: PMLevelsProfile {
//   inferredLevel: string | null,           // "L4", "L5", etc.
//   targetLevelBand: string | null,         // "L5-L6", "L6", etc.
//   inferredLevelTitle: string | null,      // "Senior Product Manager"
//   specializations: string[],              // ["growth", "platform"]
//   confidence: number | null,              // 0-1
//   lastAnalyzedAt: string | null           // ISO timestamp
// }
```

**Key Design Decisions**:
1. ✅ Queries canonical `user_levels` table (same source as PM Levels UI)
2. ✅ Never throws on "not found" - returns null-safe structure
3. ✅ Derives target level band algorithmically (1-2 levels up from current)
4. ✅ Light logging for dev diagnostics only
5. ✅ No new tables, stores, or data writes
6. ✅ No rubric computation or scoring logic

**Testing**:
- Manual test harness: `supabase/functions/_shared/__tests__/pm-levels.test.ts`
- Run with: `deno run --allow-env --allow-net pm-levels.test.ts <user-id>`
- Tests: existing user shape, null-safe behavior, target band logic

**Next Steps**:
- Task 4 (FE): Integrate into JD analysis pipeline stage
- Task 5 (FE): Integrate into goals and strengths pipeline stage
- Task 6 (FE): Stream insights to toolbar accordions

END OF FILE