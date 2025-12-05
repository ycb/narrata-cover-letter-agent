# Frontend LLM Migration to Edge Functions

**Status**: Backlog  
**Priority**: Medium  
**LOE**: 8-12 hours  
**Breaking Risk**: 20-25%  
**Owner**: TBD  
**Created**: 2025-12-05  

---

## Context

Two LLM calls currently run in the frontend during cover letter upload:
1. **My Voice Extraction** — Analyzes writing style to create voice profile
2. **Story Detection** — Extracts achievement-based stories from cover letter paragraphs

**Current Issues:**
- ❌ No evals instrumentation (can't track token usage or log to `evals_log`)
- ❌ OpenAI API key exposed in frontend (security concern)
- ❌ Can't aggregate with backend LLM metrics in `/evals` dashboard
- ❌ No retry logic, timeout handling, or rate limiting

**Goal:**
Move these calls to Edge Functions to enable full evals coverage, improve security, and centralize LLM orchestration.

---

## Current Architecture

### File: `src/services/coverLetterProcessingService.ts`

**Flow:**
```
User uploads cover letter
  → fileUploadService.ts (line 904)
    → processCoverLetter()
      → extractMyVoice() [LLM Call #1]
      → detectStoriesInParagraph() [LLM Call #2]
        → Insert to user_voice table
        → Insert to stories table
```

**LLM Call #1: My Voice Extraction** (lines 325-372)
- **Model**: `gpt-4o-mini`
- **Prompt**: Analyzes cover letter excerpt to extract writing profile
- **Input**: Intro + closing paragraphs (merged)
- **Output**: Single cohesive prompt string (plain text, no JSON)
- **Max Tokens**: 500
- **Temperature**: 0.3
- **Current Token Tracking**: ❌ None

**LLM Call #2: Story Detection** (lines 377-434)
- **Model**: `gpt-4o-mini`
- **Prompt**: Extracts achievement-based stories from body paragraphs
- **Input**: Single paragraph text
- **Output**: JSON array of story candidates
- **Max Tokens**: 800
- **Temperature**: 0.3
- **Response Format**: `{ type: 'json_object' }`
- **Current Token Tracking**: ❌ None
- **Called**: Once per body paragraph (typically 2-4 times per cover letter)

**Dependencies:**
- `user_voice` table (upsert with `onConflict: 'user_id'`)
- `stories` table (insert with `work_item_id`, `company_id`, `source_id`)
- `work_items` table (for story matching via `matchStoryToWorkItem()`)
- `companies` table (for story matching)

---

## Proposed Architecture

### New Edge Functions

#### 1. `supabase/functions/extract-my-voice/index.ts`

**Purpose**: Extract writing voice profile from cover letter text

**Request:**
```typescript
POST /extract-my-voice
Authorization: Bearer <user_token>

{
  "userId": string,
  "coverLetterText": string,  // Intro + closing paragraphs
  "sourceId": string           // Cover letter source ID
}
```

**Response:**
```typescript
{
  "success": boolean,
  "voicePrompt": string | null,
  "error"?: string
}
```

**Internal Flow:**
1. Validate user authentication
2. Call OpenAI API (same prompt as current)
3. Capture token usage from response
4. Log to `evals_log` via `voidLogEval`:
   ```typescript
   voidLogEval(supabase, {
     job_id: sourceId,
     job_type: 'coverLetter',
     stage: 'my_voice_extraction',
     user_id: userId,
     started_at: new Date(startTime),
     completed_at: new Date(),
     duration_ms: Date.now() - startTime,
     success: !!voicePrompt,
     prompt_name: 'extractMyVoicePrompt',
     model: usage?.model,
     prompt_tokens: usage?.prompt_tokens,
     completion_tokens: usage?.completion_tokens,
     total_tokens: usage?.total_tokens,
     result_subset: { hasVoicePrompt: !!voicePrompt }
   });
   ```
5. Upsert to `user_voice` table
6. Return result

**Error Handling:**
- Return `{ success: false, voicePrompt: null }` on failure (silent degradation)
- Log errors to `evals_log` with `success: false`
- Do NOT throw exceptions (maintain current silent failure mode)

---

#### 2. `supabase/functions/detect-cover-letter-stories/index.ts`

**Purpose**: Detect achievement stories from cover letter paragraphs

**Request:**
```typescript
POST /detect-cover-letter-stories
Authorization: Bearer <user_token>

{
  "userId": string,
  "paragraphs": Array<{
    "content": string,
    "type": "body" | "intro" | "closing"
  }>,
  "sourceId": string,
  "coverLetterText": string  // Full text for context (optional)
}
```

**Response:**
```typescript
{
  "success": boolean,
  "stories": Array<{
    "title": string,
    "content": string,
    "companyName"?: string,
    "roleTitle"?: string,
    "metrics": Array<{ value: string, context: string, type?: string }>,
    "tags": string[]
  }>,
  "storiesCreated": number,
  "errors": string[]
}
```

**Internal Flow:**
1. Validate user authentication
2. Filter to only `body` type paragraphs
3. For each paragraph:
   - Call OpenAI API (same prompt as current)
   - Capture token usage
   - Log to `evals_log` via `voidLogEval`
   - Try to match story to existing `work_item` (via company name + role title)
   - Insert to `stories` table
4. Return aggregated results

**Error Handling:**
- Skip individual paragraphs on error (partial success)
- Collect errors in array
- Return `{ success: true, stories: [], storiesCreated: 0, errors: [...] }`
- Log each LLM call individually to `evals_log`

---

### Frontend Service Refactor

#### File: `src/services/coverLetterProcessingService.ts`

**Changes:**

1. **Remove `extractMyVoice()` function** (lines 325-372)
2. **Remove `detectStoriesInParagraph()` function** (lines 377-434)
3. **Update `processCoverLetter()` to call Edge Functions:**

```typescript
export async function processCoverLetter(
  userId: string,
  sourceId: string,
  coverLetterText: string,
  openaiApiKey?: string  // REMOVE (no longer needed)
): Promise<{
  success: boolean;
  savedSectionsCreated: number;
  templateId: string | null;
  myVoiceCreated: boolean;
  storiesCreated: number;
  errors: string[];
}> {
  // ... existing code for parsing + sections ...

  // Step 4: Extract My Voice (NEW EDGE FUNCTION CALL)
  try {
    const introPara = paragraphs.find(p => p.type === 'intro');
    const closingPara = paragraphs.find(p => p.type === 'closing');
    const voiceText = [introPara?.content, closingPara?.content]
      .filter(Boolean)
      .join('\n\n');

    const { data: voiceResult, error: voiceError } = await supabase.functions.invoke(
      'extract-my-voice',
      {
        body: {
          userId,
          coverLetterText: voiceText,
          sourceId
        }
      }
    );

    if (voiceError) {
      errors.push(`My Voice extraction failed: ${voiceError.message}`);
    } else if (voiceResult?.success && voiceResult.voicePrompt) {
      myVoiceCreated = true;
      console.log(`[CLProcess] My Voice extracted via Edge Function`);
    }
  } catch (err) {
    errors.push(`My Voice extraction failed: ${err}`);
  }

  // Step 5: Detect and store stories (NEW EDGE FUNCTION CALL)
  try {
    const bodyParas = paragraphs
      .filter(p => p.type === 'body')
      .map(p => ({ content: p.content, type: 'body' as const }));

    const { data: storiesResult, error: storiesError } = await supabase.functions.invoke(
      'detect-cover-letter-stories',
      {
        body: {
          userId,
          paragraphs: bodyParas,
          sourceId,
          coverLetterText
        }
      }
    );

    if (storiesError) {
      errors.push(`Story detection failed: ${storiesError.message}`);
    } else if (storiesResult?.success) {
      storiesCreated = storiesResult.storiesCreated || 0;
      console.log(`[CLProcess] Detected ${storiesCreated} stories via Edge Function`);
      if (storiesResult.errors?.length > 0) {
        errors.push(...storiesResult.errors);
      }
    }
  } catch (err) {
    errors.push(`Story detection failed: ${err}`);
  }

  return {
    success: errors.length === 0,
    savedSectionsCreated,
    templateId,
    myVoiceCreated,
    storiesCreated,
    errors
  };
}
```

4. **Remove `openaiApiKey` parameter** from:
   - `processCoverLetter()` signature
   - `fileUploadService.ts` call (line 904)

---

## Implementation Checklist

### Phase 1: Edge Functions (4-5h)
- [ ] Create `supabase/functions/extract-my-voice/index.ts`
  - [ ] Copy prompt from `coverLetterProcessingService.ts` line 326-345
  - [ ] Use `callOpenAI` helper from `pipeline-utils.ts`
  - [ ] Add `voidLogEval` instrumentation
  - [ ] Add error handling (silent failure mode)
  - [ ] Upsert to `user_voice` table
- [ ] Create `supabase/functions/detect-cover-letter-stories/index.ts`
  - [ ] Copy prompt from `coverLetterProcessingService.ts` line 381-405
  - [ ] Use `streamJsonFromLLM` helper (for token tracking)
  - [ ] Add `voidLogEval` instrumentation for each paragraph
  - [ ] Implement `matchStoryToWorkItem` logic (lines 439-489)
  - [ ] Insert to `stories` table
  - [ ] Return aggregated results
- [ ] Add shared helper for story matching (move from frontend service)
- [ ] Write unit tests for both Edge Functions

### Phase 2: Frontend Refactor (2-3h)
- [ ] Update `coverLetterProcessingService.ts`
  - [ ] Remove `extractMyVoice()` function
  - [ ] Remove `detectStoriesInParagraph()` function
  - [ ] Remove `matchStoryToWorkItem()` function
  - [ ] Update `processCoverLetter()` to call Edge Functions
  - [ ] Remove `openaiApiKey` parameter
- [ ] Update `fileUploadService.ts`
  - [ ] Remove `openaiKey` extraction (lines 896-903)
  - [ ] Remove `openaiKey` parameter from `processCoverLetter()` call (line 908)

### Phase 3: Testing (2-3h)
- [ ] **Local Testing:**
  - [ ] Upload cover letter with intro + body + closing
  - [ ] Verify `user_voice` table populated
  - [ ] Verify `stories` table populated
  - [ ] Verify `evals_log` has 2+ entries (my_voice + N story detections)
  - [ ] Check token counts are captured
- [ ] **Error Testing:**
  - [ ] Test with OpenAI API failure (rate limit)
  - [ ] Test with malformed input
  - [ ] Test with cover letter missing body paragraphs
  - [ ] Verify errors are collected but don't break upload flow
- [ ] **Integration Testing:**
  - [ ] Full cover letter upload → template creation → My Voice + Stories
  - [ ] Verify `/evals` dashboard shows new LLM calls
  - [ ] Verify token costs are calculated

### Phase 4: Deployment (1h)
- [ ] Deploy Edge Functions: `supabase functions deploy extract-my-voice`
- [ ] Deploy Edge Functions: `supabase functions deploy detect-cover-letter-stories`
- [ ] Deploy frontend changes
- [ ] Monitor for errors in production
- [ ] Verify `evals_log` entries in production dashboard

---

## Rollback Plan

If Edge Functions cause issues in production:

1. **Immediate Rollback** (5 min):
   - Revert frontend changes to call old `extractMyVoice()` and `detectStoriesInParagraph()`
   - Add back `openaiApiKey` parameter
   - Deploy frontend

2. **Clean Up** (10 min):
   - Disable Edge Functions (don't delete — keep for debugging)
   - Check `evals_log` for error patterns
   - File bug report with logs

3. **Root Cause Analysis**:
   - Check Edge Function logs: `supabase functions logs extract-my-voice`
   - Check OpenAI API quota/rate limits
   - Check database RLS policies (ensure service key has write access)

---

## Success Metrics

**Before Migration:**
- ❌ 0 LLM calls tracked in `evals_log` for cover letter upload
- ❌ No token cost visibility for My Voice + Story Detection
- ❌ OpenAI key exposed in frontend

**After Migration:**
- ✅ 100% of My Voice + Story Detection calls logged to `evals_log`
- ✅ Token costs visible in `/evals` dashboard
- ✅ OpenAI key secured in Edge Function environment
- ✅ No breaking changes to cover letter upload flow (0 user-facing errors)

**KPIs to Track:**
- Cover letter upload success rate (should remain ~95%+)
- My Voice extraction success rate (currently unknown, target 90%+)
- Story detection per cover letter (currently unknown, baseline TBD)
- Average token cost per cover letter upload (baseline TBD)

---

## Related Documentation

- **Current Implementation**: `src/services/coverLetterProcessingService.ts`
- **Evals Instrumentation**: `docs/evals/QUICK_REFERENCE.md`
- **Edge Function Examples**: `supabase/functions/preanalyze-jd/index.ts`
- **Token Tracking**: `docs/evals/PHASE_1B_TOKEN_TRACKING_SUMMARY.md`

---

## Questions / Unknowns

1. **Story Matching**: `matchStoryToWorkItem()` uses fuzzy company name matching. Should this be moved to a shared helper in `_shared/` for reuse?
2. **Batching**: Currently calls OpenAI once per body paragraph (2-4 calls). Should we batch all paragraphs into a single call?
3. **Rate Limiting**: Should we add rate limiting to prevent abuse (e.g., max 10 cover letters per user per hour)?
4. **Caching**: Should we cache My Voice results per user (TTL 30 days) to avoid redundant LLM calls?

---

**Next Steps**: Schedule implementation after onboarding pipeline is stable (estimate: 2-3 weeks post-launch)

