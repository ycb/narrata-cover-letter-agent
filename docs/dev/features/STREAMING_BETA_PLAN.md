# PRAGMATIC BETA PLAN — REAL SKELETON + STREAMING

**Modular solution for Cover Letters, Onboarding, PM Levels**

**Last Updated**: 2025-11-25 (Beta Prep Cycle)

---

## 1. PURPOSE

This document defines a pragmatic, shippable beta strategy for:
- **Cover Letter Generation**
- **Onboarding Recommendations**
- **PM Leveling**

It solves two urgent problems:

1. **Perceived latency**: 40–90 second waits
2. **Poor loading UX**: skeleton disappears, no live updates, broken interim views

This plan delivers:
- ✅ A **REAL skeleton** using the final layout (no preview view)
- ✅ **Modular streaming** behavior across all job types
- ✅ A backend strategy for **reducing true latency** (parallel LLM calls)
- ✅ A safe **Phase 1 for beta**
- ✅ A structured **Phase 2 for performance improvement**

---

## 2. CORE PRINCIPLES

### 2.1. ONE LAYOUT, MULTIPLE STATES

Every job type uses a **single final layout** that supports:
- `isStreaming: true`
- `isStreaming: false`
- `artifacts: undefined | {...}`

**Skeleton = same editor component with placeholder states.**

### 2.2. MODULAR JOB ARCHITECTURE

All jobs adopt a unified `JobState` shape:

```typescript
type JobType = 'coverLetter' | 'onboarding' | 'pmLevels';

interface JobStageState {
  id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  startedAt?: string;
  finishedAt?: string;
}

interface JobResultEnvelope {
  summary?: string;
  metrics?: any;
  artifacts?: any;
}

interface JobState {
  id: string;
  jobType: JobType;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  stages: Record<string, JobStageState>;
  result?: JobResultEnvelope;
}
```

### 2.3. SHARED STREAMING HOOK

`useJobStream` is the single interface for all modular streaming:

```typescript
const { jobState, isJobStreaming } = useJobStream({ jobId, jobType });
```

---

## 3. PHASE 1 (BETA): REAL SKELETON + STREAMING

**This is the pragmatic beta**: low risk, high impact.

**User sees immediate UI. Updates flow as the job runs. Text arrives all at once at the end.**

### 3.1. ALWAYS RENDER THE FINAL LAYOUT

Replace skeleton components with:
- `CoverLetterEditor`
- `OnboardingChecklist`
- `PmLevelReport`

Each supports:

```typescript
<Editor
  isStreaming={isJobStreaming}
  jobState={jobState}
  artifacts={jobState?.result?.artifacts}
/>
```

Where:
- `isStreaming` toggles shimmer states
- `jobState` drives progress indicator and preliminary metrics
- `artifacts` are injected once ready

**No DOM swapping. No preview mode.**

### 3.2. COVER LETTERS — BETA UX FLOW

**When user clicks Generate:**

#### IMMEDIATE:
- Render all section cards (intro, body, closing)
- Textareas show shimmer or "Drafting section…"
- Gap banners show "Analyzing gaps…"
- Requirements badges visible but empty
- Metrics toolbar shows placeholders with "Calculating…"

#### STREAMING:
- Progress bar updates using `jobState.stages`
- Examples:
  - *"Working on: Analyzing job description…"*
  - *"Working on: Mapping your experience…"*
  - *"Working on: Drafting intro…"*
- Section-level status labels update to: `Queued / Analyzing / Drafting / Done`
- Preliminary metrics appear if provided:
  - `matchScore`
  - `gapCount`

#### FINAL:
- Hydrate all text at once from draft record
- Hydrate gaps and requirements met
- Enable full HIL and editing

### 3.3. ONBOARDING — BETA UX FLOW

**Streaming skeleton:**
- All steps visible
- Shimmer placeholders for text and toggles
- Disabled toggles
- Messaging: *"Analyzing your profile…"*

**Final:**
- Fill steps with recommended actions, priorities, and deadlines

### 3.4. PM LEVELS — BETA UX FLOW

**Streaming skeleton:**
- Full rubric grid visible
- Cells show shimmer or spinner
- Messaging: *"Scoring your experience…"*

**Final:**
- Populate each competency with level and explanation

### 3.5. STREAMING METRICS (FAST, CHEAP WIN)

Recommend writing **early metrics** after initial analysis:

```typescript
jobState.result.metrics = {
  matchScore: 0.42,
  gapCount: 7,
  levelRange: "L5–L6"
};
```

UI uses these to provide **real progress** during streaming:
- Preliminary scores
- "Updating…" badges
- Dynamic metric progress

---

## 4. PHASE 2: ACTUAL LATENCY REDUCTION

If skeleton + streaming feels good but generation still takes 60+ seconds, implement Phase 2.

### 4.1. MEASURE PER-STAGE DURATIONS

Add logs for:
- Total job time
- Stage-level durations
- JobType-level aggregation

### 4.2. PARALLEL LLM CALL EXECUTION (BIGGEST WIN)

**Cover letters:**
- Parallelize draft stages:
  - `draft_intro`
  - `draft_body1`
  - `draft_body2`
  - `draft_closing`
- Combine results, then run `score_match`

**Onboarding:**
- Parallelize `analyze_profile`, `analyze_applications`, `analyze_goals`

**PM levels:**
- Parallelize `score_execution`, `score_strategy`, `score_customer_insight`, `score_influence`

**Impact**: Turns multiple 15–20s calls into one 15–20s batch.

### 4.3. SCOPE CONTROL SWITCHES

Per jobType:
- Use faster models for analysis stages
- Slim prompts
- Limit stories
- Reduce output length (shorter drafts in beta)
- Skip deep checks (toggleable)

### 4.4. DECISION GATE (RELEASE BLOCKER OR NOT)

Evaluate p50 / p90 / p95 latency after parallelization.

**If p95 > 60s AND UX still feels frozen:**
- **Release blocker** with evidence
- Options:
  - a) Simplify pipeline
  - b) Drop some match metrics for beta
  - c) Prioritize jobTypes with best latency profiles

**If p95 < 45s and UX is smooth:**
- Ship beta confidently ✅

---

## 5. PHASE 3: TRUE GRANULAR STREAMING (POST-BETA)

Possible advanced features:
- Per-section text streaming
- Incremental gap/requirement streaming
- Editing intro while outro still generating

Requires:
- Partial artifacts in `jobState.result.artifacts.sections`
- Merge logic in editor
- More complex pipeline contract

**Not required for beta.**

---

## 6. DEVELOPMENT TASKS (ORDERED)

### FRONTEND — PHASE 1 (BETA)

1. ✅ Remove `streamingSections` bypass
2. ✅ Always render real editors. Add `isStreaming` state
3. ✅ Update `useJobStream` to expose full `jobState`
4. ⏳ Implement placeholder/shimmer modes for all editors
5. ⏳ Metrics toolbar: handle preliminary metrics
6. ✅ Progress indicator from `jobState.stages`
7. ⏳ Ensure editor never unmounts between states

### BACKEND — PHASE 1 (BETA)

1. ✅ Ensure stages update reliably during execution
2. ⏳ Add fast early metrics after analysis
3. ✅ Ensure final artifacts write once at end
4. ⏳ Populate `jobState.result.metrics` when possible

### BACKEND — PHASE 2 (LATENCY)

1. ⏳ Add per-stage timing logs
2. ⏳ Implement parallel LLM execution
3. ⏳ Add model-choice and prompt-length configuration
4. ⏳ Reduce output length temporarily if needed

---

## 7. ACCEPTANCE CRITERIA (BETA)

### Skeleton UX:
- ✅ Editor layout renders immediately
- ✅ Placeholders and shimmer appear instantly
- ✅ Stage progress updates live

### Metrics UX:
- ⏳ Preliminary metrics update via streaming
- ⏳ "Updating…" badge visible during generation

### Final Output:
- ⏳ Artifacts hydrate cleanly without layout jump
- ⏳ Editing and HIL functionality remain intact

### Latency:
- ⏳ Stage logs recorded
- ⏳ Evidence-based decision on release viability

---

## 8. SUMMARY

### Phase 1 (Beta)
- ✅ Real skeleton with streaming progress
- ✅ Same layout for all states
- ✅ Modular streaming across cover letters, onboarding, PM levels
- ✅ Low engineering risk and high UX impact

### Phase 2
- ⏳ True latency reduction via parallel LLM calls and scope control
- ⏳ Measured decision on release blocking

### Phase 3
- ⏳ Optional granular streaming post-beta

**This approach unblocks beta, improves perceived performance, and sets the foundation for future speedups.**

---

## Current Status

**As of 2025-11-25:**
- ✅ Core streaming infrastructure deployed
- ✅ `useJobStream` hook operational
- ✅ Progress bars and stage tracking working
- ❌ **CRITICAL REGRESSION**: `streamingSections` bypass broke ContentCards UI
- ⏳ **IN PROGRESS**: Restoring full editor layout with streaming integration

**Next Steps:** Execute Phase 1 frontend tasks to restore ContentCards + streaming integration.

