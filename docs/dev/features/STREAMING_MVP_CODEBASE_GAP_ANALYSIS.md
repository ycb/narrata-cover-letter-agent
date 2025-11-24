# Streaming MVP - Codebase vs Plan Gap Analysis

**Date**: 2025-11-24  
**Branch**: feat/streaming-mvp  
**Status**: Analysis complete, ready for implementation

---

## Executive Summary

The codebase has **some foundational pieces** for streaming but lacks the core SSE infrastructure described in the MVP plan. Previous attempts at streaming (Phase 2) failed due to React batching issues with callbacks.

### Key Findings

**✅ What Exists**:
- Supabase Edge Functions infrastructure
- Frontend streaming hook (`useStreamingProgress.ts`)
- Progress context (`UploadProgressContext.tsx`)  
- Job status tracking pattern (`GapsJobContext.tsx`)
- Long-running services ready for conversion

**❌ What's Missing**:
- Server-Sent Events (SSE) endpoints
- Unified job tracking table in database
- Staged pipeline execution architecture
- Backend job orchestration layer
- SSE-based frontend hook (current hook is LLM-streaming only)

**⚠️ Previous Failed Attempt**:
- Phase 2 tried callback-based streaming
- React batching broke progressive updates
- Documented in `PHASE_2_STATUS.md` and `PHASE_2_STREAMING_FAILURE_ANALYSIS.md`

---

## Detailed Gap Analysis

### 1. Database Layer

#### MVP Plan Requirements
```sql
-- Single unified job table
CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  type TEXT, -- onboarding | coverLetter | pmLevels
  status TEXT, -- pending | running | complete | error
  input JSONB,
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### Current State
❌ **NO job tracking table exists**

**Evidence**: Searched all migrations, no `jobs` table found.

**Closest Match**: `GapsJobContext.tsx` (lines 5-45)
- Has realtime channel subscription pattern
- Broadcasts job status via Supabase realtime
- But no backing table, just in-memory state

**Gap**: Need to create the jobs table migration

---

### 2. Backend - SSE Endpoints

#### MVP Plan Requirements

**POST Endpoints** (create job):
- `/api/jobs/onboarding`
- `/api/jobs/cover-letter`
- `/api/jobs/pm-levels`

**GET Endpoint** (stream job):
- `/api/jobs/stream?jobId=XYZ`
- Returns `Content-Type: text/event-stream`
- Emits: `progress`, `complete`, `error` events

#### Current State
❌ **NO SSE endpoints exist**

**Evidence**: 
- `supabase/functions/` has only 3 functions:
  - `linkedin-exchange-token/`
  - `linkedin-fetch-data/`
  - `send-support-email/`
- None implement SSE or job streaming

**Gap**: Need to create Supabase Edge Functions for:
1. Job creation endpoints
2. SSE streaming endpoint with EventSource support

---

### 3. Backend - Staged Pipelines

#### MVP Plan Requirements

**Onboarding Pipeline** (3 stages):
1. `parseInputs` (3-8s) - Extract basic data
2. `skeletonProfile` (8-20s) - Merge resume/LinkedIn
3. `detailedProfile` (20-60s) - Full analysis

**Cover Letter Pipeline** (4 stages):
1. `basicMetrics` (5-10s) - JD summary, fit score
2. `requirementAnalysis` (10-25s) - Core/preferred reqs
3. `sectionGaps` (25-45s) - Gap analysis
4. `draftLetter` (optional) - Generate first draft

**PM Levels Pipeline** (4 stages):
1. `baselineAssessment` (5-10s)
2. `competencyBreakdown` (10-30s)
3. `specializationAssessment` (30-45s)
4. Final save

#### Current State
⚠️ **PARTIALLY EXISTS** but not structured as staged pipelines

**Cover Letter (Closest Match)**:
- `src/services/coverLetterDraftService.ts` (2,636 lines)
  - Has `generateDraftFast()` - ✅ Creates draft quickly
  - Has `calculateMetricsForDraft()` - ⚠️ Single monolithic call
  - Three parallel prompts exist:
    - `src/prompts/basicMetrics.ts` ✅
    - `src/prompts/requirementAnalysis.ts` ✅
    - `src/prompts/sectionGaps.ts` ✅
  - But they run via callbacks, not SSE
  - **Phase 2 failure**: Callbacks fired but React batched them

**Onboarding**:
- `src/services/fileUploadService.ts`
  - Has progress events: `window.dispatchEvent()` (lines 47+)
  - Stages: "Batching" → "Analyzing" → "Saving" → "Complete"
  - But NOT structured as streaming pipeline
  - Uses `UploadProgressContext` (frontend-only)

**PM Levels**:
- `src/services/pmLevelsService.ts` likely exists
- No staged pipeline structure found

**Gap**: Need to:
1. Restructure services into **staged execution models**
2. Each stage emits to SSE stream instead of DB writes
3. Backend orchestrates stage progression
4. Frontend receives incremental updates via EventSource

---

### 4. Frontend - SSE Hook

#### MVP Plan Requirements

**Hook**: `useStreamingJob(jobId, type)`
- Opens `EventSource` to `/api/jobs/stream?jobId=X`
- Maintains `jobState` in React memory
- Merges partial results from each stage
- Exposes unified state to pages

**State Shape**:
```typescript
{
  jobId: string;
  type: 'onboarding' | 'coverLetter' | 'pmLevels';
  status: 'pending' | 'running' | 'complete' | 'error';
  onboarding?: { skeleton?: any; detailed?: any; };
  coverLetter?: { basicMetrics?: any; requirements?: any; gaps?: any; };
  pmLevels?: { baseline?: any; competency?: any; specialization?: any; };
}
```

#### Current State
❌ **Does NOT exist for SSE job streaming**

**What DOES Exist**:
- `src/hooks/useStreamingProgress.ts` (lines 119-470)
  - Generic streaming hook for **LLM token streaming**
  - Handles text deltas, reasoning, steps
  - NOT designed for SSE job orchestration
  - Used for OpenAI `streamText()` responses

**Gap**: Need to create NEW hook:
- `useJobStream(jobId)` or similar
- Specific to SSE EventSource pattern
- Manages job lifecycle (pending → running → complete)
- Merges stage data into unified state tree

---

### 5. Frontend - UI Integration

#### MVP Plan Requirements

Pages should:
- Start job with POST
- Open stream with GET
- Replace skeletons as stages arrive
- Always remain responsive

#### Current State
⚠️ **SKELETON PATTERN EXISTS** but tied to old callback approach

**Cover Letter** (`src/components/cover-letters/CoverLetterDraftView.tsx`):
- Has `pendingSectionInsights` prop ✅
- Shows skeleton during generation ✅
- But waits for full metrics to complete ❌
- **Phase 2 issue**: Tried to update progressively but failed

**Onboarding** (`src/pages/NewUserOnboarding.tsx`):
- Uses `UploadProgressContext` ✅
- Shows `ProgressIndicator` component ✅
- But context uses DOM events, not SSE ❌

**Gap**: 
- Wire pages to new `useJobStream()` hook
- Replace callback logic with SSE event handlers
- Update skeletons as each stage data arrives

---

### 6. Error Handling

#### MVP Plan Requirements

- Backend catches stage failures → emits `error` event
- Frontend shows inline retry button
- Preserves partial data before failure

#### Current State
⚠️ **BASIC ERROR HANDLING** exists but not streaming-aware

**Examples**:
- `src/utils/retryWithBackoff.ts` - Generic retry logic ✅
- Services have try/catch blocks ✅
- But no SSE error event pattern ❌
- No partial data preservation on failure ❌

**Gap**: 
- Add error event emission in staged pipelines
- Frontend hook handles `error` events
- Show retry UI with preserved partial data

---

## Previous Attempts: What We Learned

### Phase 2 Streaming (November 2024)
**Doc**: `docs/dev/phases/PHASE_2_STATUS.md`

**What They Tried**:
1. Split `calculateMetricsForDraft()` into 3 parallel calls
2. Added `onMetricsProgress` callback parameter
3. Expected: 3 separate UI updates at 13s, 41s, 45s
4. Actual: All 3 callbacks batched into single update at 60s

**Root Cause**: React 18 automatic batching
- Async callbacks during event handlers get batched
- No way to force immediate renders with callbacks
- Documented in `PHASE_2_STREAMING_FAILURE_ANALYSIS.md` (288 lines!)

**Why SSE Will Work**:
- EventSource events are NOT React-controlled
- Each SSE message triggers immediate state update
- React sees distinct external events, not batched callbacks
- Industry-standard solution for server push

**Key Quote from PHASE_2_STATUS.md**:
> "Option 3: Implement True Streaming (SSE)
> - True progressive streaming
> - No React batching issues
> - Professional solution
> - **Effort: 8-16 hours**"

---

## Architecture Decisions

### Why SSE Instead of WebSockets?

**SSE Advantages**:
1. **Simpler protocol** - HTTP-based, no handshake
2. **Auto-reconnect** - Built into EventSource API
3. **Unidirectional** - Perfect for server → client updates
4. **No extra infrastructure** - Works with standard HTTP
5. **Supabase Edge Functions support** - Native streaming

**WebSocket would be overkill**:
- We don't need bidirectional communication
- Job updates only flow server → client
- No real-time collaboration needed

### Why Single Job Table?

**MVP Principle**: Start simple, expand later

**Single table benefits**:
1. One API endpoint pattern
2. Shared job lifecycle logic
3. Easy to add new job types (just add to enum)
4. Simple queries (`WHERE user_id = X AND type = 'coverLetter'`)

**Type-specific data** goes in `input`/`result` JSONB:
- No schema churn when job types evolve
- Flexible for rapid iteration
- Can add structured columns later if needed

### Why Memory-Based Streaming (No Intermediate DB Writes)?

**Performance**:
- Writing to DB on each stage = slow (network + disk I/O)
- SSE messages are instant (HTTP chunked response)
- Only write once at completion = 1 DB transaction instead of N

**Reliability**:
- If stream disconnects, client can poll final result from DB
- Job row tracks status (running/complete/error)
- Idempotent: Reconnecting client gets same job ID

---

## Implementation Roadmap

### Phase 1: Infrastructure (2-3 days)

**1.1 Database Migration**
```sql
-- File: supabase/migrations/028_create_jobs_table.sql
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('onboarding', 'coverLetter', 'pmLevels')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'complete', 'error')),
  input JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(type);

-- RLS policies
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own jobs" ON jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own jobs" ON jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own jobs" ON jobs FOR UPDATE USING (auth.uid() = user_id);
```

**1.2 Supabase Edge Function - Job Creation**
```typescript
// File: supabase/functions/create-job/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  // Parse request
  const { type, input } = await req.json();
  
  // Validate type
  if (!['onboarding', 'coverLetter', 'pmLevels'].includes(type)) {
    return new Response(JSON.stringify({ error: 'Invalid job type' }), { status: 400 });
  }
  
  // Create job record
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  const { data, error } = await supabase
    .from('jobs')
    .insert({ type, input, user_id: req.headers.get('x-user-id') })
    .select()
    .single();
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  
  return new Response(JSON.stringify({ jobId: data.id }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

**1.3 Supabase Edge Function - SSE Streaming**
```typescript
// File: supabase/functions/stream-job/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('jobId');
  
  if (!jobId) {
    return new Response('Missing jobId', { status: 400 });
  }
  
  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      try {
        // Fetch job from DB
        const job = await fetchJob(jobId);
        
        // Execute staged pipeline based on job.type
        if (job.type === 'coverLetter') {
          await executeCoverLetterPipeline(job, (stage, data) => {
            const event = `data: ${JSON.stringify({ stage, data })}\n\n`;
            controller.enqueue(encoder.encode(event));
          });
        }
        // ... other job types
        
        // Send complete event
        controller.enqueue(encoder.encode('event: complete\ndata: {}\n\n'));
        controller.close();
      } catch (error) {
        const errorEvent = `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      }
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
});
```

**1.4 Frontend Hook - SSE Job Streaming**
```typescript
// File: src/hooks/useJobStream.ts
export function useJobStream(jobId: string) {
  const [jobState, setJobState] = useState<JobState>({
    jobId,
    status: 'pending',
    data: {}
  });
  
  useEffect(() => {
    const eventSource = new EventSource(`/api/stream-job?jobId=${jobId}`);
    
    eventSource.addEventListener('progress', (e) => {
      const { stage, data } = JSON.parse(e.data);
      setJobState(prev => ({
        ...prev,
        status: 'running',
        data: {
          ...prev.data,
          [stage]: data
        }
      }));
    });
    
    eventSource.addEventListener('complete', () => {
      setJobState(prev => ({ ...prev, status: 'complete' }));
      eventSource.close();
    });
    
    eventSource.addEventListener('error', (e) => {
      const { message } = JSON.parse(e.data);
      setJobState(prev => ({ ...prev, status: 'error', error: message }));
      eventSource.close();
    });
    
    return () => eventSource.close();
  }, [jobId]);
  
  return jobState;
}
```

---

### Phase 2: Cover Letter Streaming (3-4 days)

**Why Start Here**:
- Most complex flow (4 stages)
- Already has parallel prompt structure
- Immediate user impact (45s → <10s perceived)
- Can reuse patterns for other job types

**2.1 Restructure coverLetterDraftService**
- Extract stage functions:
  - `executeBasicMetrics()`
  - `executeRequirementAnalysis()`
  - `executeSectionGaps()`
  - `executeDraftGeneration()` (optional)
- Each stage returns data + metadata
- Remove callback-based progress (Phase 2 failed approach)

**2.2 Create Cover Letter Pipeline Orchestrator**
```typescript
// In Supabase Edge Function
async function executeCoverLetterPipeline(job, emit) {
  const { jobDescriptionId, templateId } = job.input;
  
  // Stage 1: Basic Metrics (5-10s)
  emit('progress', {
    stage: 'basicMetrics',
    data: await calculateBasicMetrics(jobDescriptionId)
  });
  
  // Stage 2: Requirement Analysis (10-25s)
  emit('progress', {
    stage: 'requirementAnalysis',
    data: await analyzeRequirements(jobDescriptionId)
  });
  
  // Stage 3: Section Gaps (25-45s)
  emit('progress', {
    stage: 'sectionGaps',
    data: await analyzeSectionGaps(jobDescriptionId, templateId)
  });
  
  // Save final result to DB
  await saveJobResult(job.id, { /* merged data */ });
}
```

**2.3 Wire UI to SSE Stream**
- Update `useCoverLetterDraft` hook
- Replace `calculateMetricsForDraft()` with SSE stream
- Merge stage data into draft state as it arrives
- Update `CoverLetterDraftView` to show progressive updates

---

### Phase 3: Onboarding Streaming (2-3 days)

**3.1 Restructure File Upload Service**
- Extract: `parseInputs()`, `skeletonProfile()`, `detailedProfile()`
- Replace `window.dispatchEvent()` with SSE emit

**3.2 Create Onboarding Pipeline**
- Similar orchestrator pattern as Cover Letter
- 3 stages with incremental work history display

**3.3 Wire UI**
- Replace `UploadProgressContext` with `useJobStream()`
- Update `NewUserOnboarding` page

---

### Phase 4: PM Levels Streaming (2-3 days)

**4.1 Restructure PM Levels Service**
- Extract: `baselineAssessment()`, `competencyBreakdown()`, `specializationAssessment()`

**4.2 Create PM Levels Pipeline**
- 4 stages following MVP plan

**4.3 Wire UI**
- Update Assessment page with progressive rendering

---

### Phase 5: Polish & Monitoring (1-2 days)

**5.1 Add Telemetry**
- Time to first progress
- Time per stage
- Completion rates
- Error rates

**5.2 Add Progress Indicators**
- Animated progress bars
- Stage-specific messages ("Analyzing requirements...")
- Smooth skeleton → data transitions

**5.3 Error Handling**
- Inline retry buttons
- Partial data preservation
- Clear error messages

---

## Success Criteria

### Performance Metrics
- ✅ Time to first content < 10 seconds (all flows)
- ✅ At least 2 visible UI updates per job
- ✅ No blank/idle screens > 5 seconds

### User Experience
- ✅ Reduction in abandonment during onboarding
- ✅ Positive user feedback on "feels faster"
- ✅ No regression in completion rates

### Technical
- ✅ Single streaming architecture for all job types
- ✅ No React batching issues (SSE solves this)
- ✅ Maintainable: Adding new job types is simple

---

## Risks & Mitigation

### Risk 1: Supabase Edge Function Timeout
**Issue**: Edge Functions have 60s timeout, some jobs take longer

**Mitigation**:
- Extend timeout (Supabase supports up to 5 minutes with config)
- Or: Use Supabase Realtime Broadcast as fallback
- Or: Split very long jobs into multiple sub-jobs

### Risk 2: SSE Connection Drops
**Issue**: User refreshes page or network interruption

**Mitigation**:
- Job status in DB persists
- Frontend can poll job table for final result
- Resume from last completed stage (future enhancement)

### Risk 3: Staging Complexity
**Issue**: Breaking monolithic services into stages = more code

**Mitigation**:
- Start with Cover Letter (highest impact)
- Reuse pipeline orchestrator pattern
- Each stage is independently testable

---

## Key Differences from Previous Attempts

| Aspect | Phase 2 (Failed) | Streaming MVP (This Plan) |
|--------|------------------|---------------------------|
| **Transport** | Callbacks | Server-Sent Events |
| **Backend** | Frontend service | Supabase Edge Functions |
| **State** | React hooks | SSE + React state |
| **Batching** | React batched callbacks | SSE events fire immediately |
| **Persistence** | DB write per stage | Single write at end |
| **Complexity** | Callback orchestration | Staged pipeline pattern |

**Why SSE Will Succeed**:
1. EventSource API is designed for server push
2. React doesn't batch external events
3. Industry-standard solution (GitHub, X/Twitter use it)
4. Proven pattern in Supabase ecosystem

---

## Next Steps

1. **Create migration** for jobs table
2. **Create Edge Functions** for job creation + streaming
3. **Create frontend hook** for SSE consumption
4. **Test with Cover Letter** (highest ROI)
5. **Expand to other flows** once proven

**Estimated Total Effort**: 8-12 days (1.5-2 sprint)

**Expected User Impact**:
- Perceived wait time: 45-60s → <10s
- Engagement: Higher (continuous feedback)
- Abandonment: Lower (no long idle periods)

---

## References

- **MVP Plan**: `docs/dev/features/STREAMING_MVP.md`
- **Phase 2 Failure**: `docs/dev/phases/PHASE_2_STATUS.md`
- **Phase 2 Analysis**: `docs/dev/phases/PHASE_2_STREAMING_FAILURE_ANALYSIS.md`
- **Current Hook**: `src/hooks/useStreamingProgress.ts`
- **Job Context**: `src/contexts/GapsJobContext.tsx`
- **Draft Service**: `src/services/coverLetterDraftService.ts`

---

**Last Updated**: 2025-11-24  
**Branch**: feat/streaming-mvp  
**Status**: Analysis complete, ready for implementation  
**Next**: Create Phase 1 infrastructure

