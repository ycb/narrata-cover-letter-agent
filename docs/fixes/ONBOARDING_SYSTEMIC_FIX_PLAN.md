# Onboarding Flow - Systemic Fix Plan

**Problem**: Gap detection and PM levels analysis are not reliably triggered for new users during onboarding  
**Impact**: Users complete onboarding without critical profile data, degrading CL generation quality  
**Date**: 2026-01-17

---

## Root Cause Analysis (RCA)

### Problem 1: Gap Detection Not Running

#### Evidence
- ✅ Jungwon uploaded resume → 5 work items, 20 stories created
- ✅ Jungwon uploaded cover letter → 5 saved sections created
- ❌ **0 gaps detected** in `gaps` table
- ❌ Background generic gap judge **disabled by feature flag**

#### Code Path Analysis

**Resume Upload (Work History & Stories):**
```typescript
// src/services/fileUploadService.ts:1873-1880
if (isBackgroundGenericGapJudgeEnabled()) {
  this.runBackgroundGenericGapJudge(sourceId, userId, accessToken).catch((err) => {
    console.error('[GapDetection] Background generic gap judge failed:', err);
  });
} else {
  console.log('📌 Background generic gap judge disabled by feature flag (ENABLE_BACKGROUND_GENERIC_GAP_JUDGE=false)');
}
```

**Cover Letter Upload (Saved Sections):**
```typescript
// Current flow: src/services/fileUploadService.ts:929-1007
// 1. parseCoverLetter(extractedText) → ParsedCoverLetter
// 2. convertToSavedSections(parsed) → sections array
// 3. saveCoverLetterSections(sections, sourceId, accessToken) → direct DB insert
// 4. createDefaultTemplate(...) → template creation
// ❌ NO gap detection call in this flow

// Gap detection only exists in unused code path:
// src/services/coverLetterTemplateService.ts:1470-1488 (processUploadedCoverLetter)
// This function is NOT called during upload
```

#### Root Causes

| **Issue** | **Location** | **Impact** |
|-----------|--------------|------------|
| Feature flag OFF | `src/lib/flags.ts:89` (`isBackgroundGenericGapJudgeEnabled`) | Work history gaps never detected |
| Wrong code path | `fileUploadService.ts:929` uses `parseCoverLetter` + direct insert | Cover letter section gaps never detected |
| Error swallowing | `fileUploadService.ts:1875` `.catch()` logs but doesn't alert | Silent failures |

---

### Problem 2: PM Levels Not Running

#### Evidence
- ❌ **0 jobs** in `jobs` table with `type = 'pmLevels'` for Jungwon
- ❌ **0 entries** in `user_levels` table for Jungwon
- ✅ `schedulePMLevelBackgroundRun()` **is called** on line 1882 of `fileUploadService.ts`

#### Code Path Analysis

**Upload Flow:**
```typescript
// src/services/fileUploadService.ts:1882-1888
schedulePMLevelBackgroundRun({
  userId,
  syntheticProfileId: activeProfileId || undefined,
  delayMs: 6000,
  reason: `[FileUploadService] Structured data processed from ${sourceData.file_name || sourceId}`,
  triggerReason: 'content-update',
});
```

**Edge Function Call:**
```typescript
// src/services/pmLevelsEdgeClient.ts:23-44
const triggerJob = async () => {
  try {
    const { error } = await supabase.functions.invoke<{ jobId: string }>('create-job', {
      body: {
        type: 'pmLevels',
        input: {
          profileId: syntheticProfileId || undefined,
          forceRefresh: true,
          reason,
          triggerReason,  // ⚠️ Undefined! Not passed in function params
          runType,        // ⚠️ Undefined! Not passed in function params
        },
      },
    });

    if (error) {
      console.warn('[PMLevelsEdgeClient] Failed to enqueue PM Levels job:', error);
      // ❌ Error swallowed - no retry, no user notification
    }
  } catch (err) {
    console.warn('[PMLevelsEdgeClient] Error enqueuing PM Levels job:', err);
    // ❌ Exception swallowed - no retry, no user notification
  }
};

if (delayMs > 0) {
  setTimeout(triggerJob, delayMs);  // ⚠️ Async timeout - no way to track completion
} else {
  void triggerJob();  // ⚠️ Fire-and-forget - no way to track completion
}
```

#### Root Causes

| **Issue** | **Location** | **Impact** | **Likelihood** |
|-----------|--------------|------------|----------------|
| Undefined variables | `pmLevelsEdgeClient.ts:32-33` | Edge function receives `undefined` for `triggerReason` and `runType` | High |
| Silent failure | `pmLevelsEdgeClient.ts:39-42` | Errors logged to console but no user-facing indication | High |
| Auth/RLS blocking | Edge function call from client | Supabase RLS may block unauthenticated or improperly scoped requests | Medium |
| Edge function not deployed | Deployment issue | Function doesn't exist or is misconfigured | Low |
| Fire-and-forget pattern | `pmLevelsEdgeClient.ts:46-50` | No way to verify job was created successfully | High |

---

## Systemic Fix Plan

### Fix 1: Enable & Improve Gap Detection (Work History)

**Priority**: P0 (High Impact, Low Effort)

#### Changes Required

**1.1: Enable Feature Flag**

```bash
# .env or .env.local
ENABLE_BACKGROUND_GENERIC_GAP_JUDGE=true
VITE_ENABLE_BACKGROUND_GENERIC_GAP_JUDGE=true
```

**1.2: Add Error Tracking**

```typescript
// src/services/fileUploadService.ts:1873-1880
if (isBackgroundGenericGapJudgeEnabled()) {
  this.runBackgroundGenericGapJudge(sourceId, userId, accessToken)
    .then((gapCount) => {
      console.log(`✅ [GapDetection] Background judge created ${gapCount} gaps`);
    })
    .catch((err) => {
      console.error('❌ [GapDetection] Background generic gap judge FAILED:', err);
      // TODO: Log to monitoring service (Sentry, etc.)
      // TODO: Surface error to user? Or fallback to heuristic-only?
    });
} else {
  console.warn('⚠️ [GapDetection] Background generic gap judge disabled - work history gaps will not be detected');
}
```

**1.3: Return Gap Count from runBackgroundGenericGapJudge**

```typescript
// src/services/fileUploadService.ts:3599
private async runBackgroundGenericGapJudge(
  sourceId: string, 
  userId: string, 
  accessToken?: string
): Promise<number> {  // ✅ Return gap count
  try {
    // ... existing logic ...
    
    if (gaps.length > 0) {
      await GapDetectionService.saveGaps(gaps, accessToken);
      console.log(`[GapDetection] Background LLM judge created ${gaps.length} generic gap(s)`);
    }
    
    return gaps.length;  // ✅ Return count
  } catch (err) {
    console.error('[GapDetection] Background judge error:', err);
    throw err;  // ✅ Propagate error instead of swallowing
  }
}
```

---

### Fix 2: Add Gap Detection to Cover Letter Upload Flow

**Priority**: P0 (High Impact, Medium Effort)

#### Option A: Call Gap Detection After Section Save (Recommended)

```typescript
// src/services/fileUploadService.ts:937-954
const sections = convertToSavedSections(parsed);
await this.saveCoverLetterSections(sections, sourceId, accessToken);
saveSectionsMs = performance.now() - sectionsStart;
console.log(`⏱️  [TIMING] ✅ Saved CL sections: ${saveSectionsMs.toFixed(2)}ms (${sections.length} sections)`);

// ✅ NEW: Trigger gap detection for cover letter sections
try {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  if (userId) {
    const { GapDetectionService } = await import('./gapDetectionService');
    const { data: savedSections } = await supabase
      .from('saved_sections')
      .select('id, type, content, title')
      .eq('source_id', sourceId)
      .eq('user_id', userId);
    
    // ✅ Type mapping: database types (body/closer) -> expected types (paragraph/closer)
    const typeMapping: Record<string, 'intro' | 'paragraph' | 'closer' | 'signature'> = {
      'intro': 'intro',
      'body': 'paragraph',
      'closer': 'closer',
      'signature': 'signature'
    };
    
    const sectionGaps: any[] = [];
    for (const section of savedSections || []) {
      const mappedType = typeMapping[section.type] || 'paragraph';
      
      const gaps = await GapDetectionService.detectCoverLetterSectionGaps(userId, {
        id: section.id,
        type: mappedType,
        content: section.content,
        title: section.title
      });
      sectionGaps.push(...gaps);
    }
    
    if (sectionGaps.length > 0) {
      await GapDetectionService.saveGaps(sectionGaps, accessToken);
      console.log(`✅ [GapDetection] Created ${sectionGaps.length} cover letter section gaps`);
    }
  }
} catch (gapError) {
  console.error('⚠️ Failed to detect cover letter section gaps (non-blocking):', gapError);
  // Non-blocking - don't fail upload
}

// Continue with existing template creation logic...
```

#### Option B: Refactor to Use processUploadedCoverLetter (More Invasive)

- Replace `parseCoverLetter` + `convertToSavedSections` + direct insert flow
- Call `CoverLetterTemplateService.processUploadedCoverLetter()` instead
- **Pros**: Gap detection already built-in, cleaner architecture
- **Cons**: Requires adapting `processUploadedCoverLetter` to accept simple `ParsedCoverLetter` structure (currently expects rich structure with `paragraphs` array)

**Recommendation**: Start with Option A (simpler, less risky). Consider Option B as a future refactor.

---

### Fix 3: Make PM Levels Job Creation Reliable

**Priority**: P0 (High Impact, Medium Effort)

#### Changes Required

**3.1: Fix Undefined Variables**

```typescript
// src/services/pmLevelsEdgeClient.ts:12-17
export const schedulePMLevelBackgroundRun = ({
  userId,
  syntheticProfileId,
  delayMs = 0,
  reason,
  triggerReason = 'content-update',  // ✅ Add default
  runType = 'initial',               // ✅ Add default
}: SchedulePMLevelsOptions): void => {
```

Or update the caller:

```typescript
// src/services/fileUploadService.ts:1882-1888
schedulePMLevelBackgroundRun({
  userId,
  syntheticProfileId: activeProfileId || undefined,
  delayMs: 6000,
  reason: `[FileUploadService] Structured data processed from ${sourceData.file_name || sourceId}`,
  triggerReason: 'content-update',
  runType: 'initial',  // ✅ Add runType
});
```

**3.2: Return Promise & Track Success**

```typescript
// src/services/pmLevelsEdgeClient.ts:12-51
export const schedulePMLevelBackgroundRun = ({
  userId,
  syntheticProfileId,
  delayMs = 0,
  reason,
  triggerReason = 'content-update',
  runType = 'initial',
}: SchedulePMLevelsOptions): Promise<{ jobId?: string; error?: any }> => {  // ✅ Return Promise
  if (!userId) {
    console.warn('[PMLevelsEdgeClient] schedulePMLevelBackgroundRun called without userId');
    return Promise.resolve({ error: 'Missing userId' });  // ✅ Return error
  }

  const triggerJob = async (): Promise<{ jobId?: string; error?: any }> => {
    try {
      const { data, error } = await supabase.functions.invoke<{ jobId: string }>('create-job', {
        body: {
          type: 'pmLevels',
          input: {
            profileId: syntheticProfileId || undefined,
            forceRefresh: true,
            reason,
            triggerReason,
            runType,
          },
        },
      });

      if (error) {
        console.error('[PMLevelsEdgeClient] Failed to enqueue PM Levels job:', error);
        return { error };  // ✅ Return error for caller to handle
      }
      
      console.log(`✅ [PMLevelsEdgeClient] PM Levels job created: ${data?.jobId}`);
      return { jobId: data?.jobId };  // ✅ Return success
    } catch (err) {
      console.error('[PMLevelsEdgeClient] Error enqueuing PM Levels job:', err);
      return { error: err };  // ✅ Return error for caller to handle
    }
  };

  if (delayMs > 0) {
    return new Promise((resolve) => {
      setTimeout(() => {
        triggerJob().then(resolve);  // ✅ Resolve with result
      }, delayMs);
    });
  } else {
    return triggerJob();  // ✅ Return promise
  }
};
```

**3.3: Await Result in Upload Flow (Optional - Blocking)**

```typescript
// src/services/fileUploadService.ts:1882-1888
const pmJobResult = await schedulePMLevelBackgroundRun({
  userId,
  syntheticProfileId: activeProfileId || undefined,
  delayMs: 6000,
  reason: `[FileUploadService] Structured data processed from ${sourceData.file_name || sourceId}`,
  triggerReason: 'content-update',
  runType: 'initial',
});

if (pmJobResult.error) {
  console.error('⚠️ [PMLevels] Failed to schedule background job:', pmJobResult.error);
  // TODO: Log to monitoring, surface to user, or retry?
} else {
  console.log(`✅ [PMLevels] Background job scheduled: ${pmJobResult.jobId}`);
}
```

**Alternative 3.3: Fire-and-Forget with Logging (Non-Blocking)**

```typescript
// src/services/fileUploadService.ts:1882-1888
schedulePMLevelBackgroundRun({
  userId,
  syntheticProfileId: activeProfileId || undefined,
  delayMs: 6000,
  reason: `[FileUploadService] Structured data processed from ${sourceData.file_name || sourceId}`,
  triggerReason: 'content-update',
  runType: 'initial',
})
  .then((result) => {
    if (result.error) {
      console.error('⚠️ [PMLevels] Failed to schedule background job:', result.error);
      // TODO: Log to monitoring service
    } else {
      console.log(`✅ [PMLevels] Background job scheduled: ${result.jobId}`);
    }
  })
  .catch((err) => {
    console.error('❌ [PMLevels] Unexpected error scheduling job:', err);
  });
```

**Recommendation**: Use fire-and-forget with logging (non-blocking) to avoid adding latency to upload flow.

---

### Fix 4: Add Observability & Monitoring

**Priority**: P1 (Medium Impact, Low Effort)

#### Changes Required

**4.1: Log to evals_log for Tracking**

```typescript
// src/services/fileUploadService.ts (after schedulePMLevelBackgroundRun call)
await this.evalsLogger.logEvalsLog({
  jobType: 'pmLevels',
  durationMs: 0,  // Job scheduled, not completed yet
  stageName: 'job_scheduled',
  userId,
  resultSubset: {
    job_id: pmJobResult.jobId,
    trigger_reason: 'content-update',
    source_id: sourceId,
  },
});
```

**4.2: Add Health Check Endpoint**

```typescript
// New: src/pages/admin/OnboardingHealthCheck.tsx
// Query recent uploads and check if gaps + PM levels were created
// Display dashboard showing success rate over time
```

**4.3: Add User-Facing Indicators**

```typescript
// Show loading state on dashboard: "Analyzing your profile..."
// Show error state if gap detection or PM levels failed
// Provide "Retry Analysis" button
```

---

## Implementation Roadmap

### Phase 1: Critical Fixes (P0) - Do First
1. **Enable gap detection feature flag** (`.env` change) → 1 min
2. **Fix undefined variables in PM levels** (`pmLevelsEdgeClient.ts`) → 5 min
3. **Add gap detection to cover letter upload** (`fileUploadService.ts`) → 20 min
4. **Add error logging for PM levels job** (`fileUploadService.ts` + `pmLevelsEdgeClient.ts`) → 10 min

**Total**: ~35 minutes

### Phase 2: Reliability Improvements (P0-P1) - Do Next
5. **Return gap count from background judge** (`fileUploadService.ts`) → 5 min
6. **Make PM levels job creation return Promise** (`pmLevelsEdgeClient.ts`) → 15 min
7. **Add evals_log tracking for job creation** (`fileUploadService.ts`) → 10 min

**Total**: ~30 minutes

### Phase 3: Monitoring & UX (P1) - Do Later
8. **Create onboarding health check dashboard** (new page) → 2 hours
9. **Add user-facing loading/error states** (dashboard components) → 1 hour
10. **Add "Retry Analysis" functionality** (dashboard + services) → 1 hour

**Total**: ~4 hours

---

## Testing Plan

### Manual Testing Checklist

**Test User Setup:**
- [ ] Create fresh test user account
- [ ] Upload resume (PDF or DOCX)
- [ ] Upload cover letter (DOCX)

**Verify Gap Detection:**
- [ ] Check `gaps` table has entries for test user
- [ ] Verify gaps appear on Work History page
- [ ] Verify gaps appear on Saved Sections page

**Verify PM Levels:**
- [ ] Check `jobs` table has `pmLevels` job for test user
- [ ] Check `user_levels` table has entry for test user
- [ ] Verify PM level badge appears on Assessment page
- [ ] Verify level recommendations appear on Dashboard

**Error Scenarios:**
- [ ] Test with LLM API down (mock failure)
- [ ] Test with edge function down (mock failure)
- [ ] Verify errors are logged and surfaced appropriately

### Automated Testing

```typescript
// tests/onboarding-flow.test.ts
describe('Onboarding Flow - Gap Detection & PM Levels', () => {
  it('should create gaps after resume upload', async () => {
    const userId = await uploadTestResume();
    await waitForProcessing(5000);
    
    const gaps = await supabase
      .from('gaps')
      .select('id')
      .eq('user_id', userId);
    
    expect(gaps.data.length).toBeGreaterThan(0);
  });
  
  it('should create PM levels job after resume upload', async () => {
    const userId = await uploadTestResume();
    await waitForProcessing(10000);
    
    const jobs = await supabase
      .from('jobs')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'pmLevels');
    
    expect(jobs.data.length).toBeGreaterThan(0);
  });
  
  // ... more tests
});
```

---

## Rollout Strategy

### Stage 1: Fix + Deploy to Staging
1. Apply Phase 1 fixes
2. Deploy to staging environment
3. Run manual testing checklist
4. Fix any issues found

### Stage 2: Test with Real Users
1. Deploy to production
2. Monitor first 10 new user signups
3. Verify gaps + PM levels created for all users
4. Check error logs for any failures

### Stage 3: Backfill Existing Users
1. Identify users with missing gaps or PM levels
2. Run backfill script (similar to Jungwon manual fix)
3. Verify backfill successful for all users

### Stage 4: Add Monitoring
1. Implement Phase 3 monitoring features
2. Set up alerts for onboarding failures
3. Create weekly report of onboarding health metrics

---

## Success Metrics

### Before Fix (Baseline)
- Gap detection success rate: **0%** (feature flag disabled)
- PM levels success rate: **Unknown** (no tracking)
- User-facing error indicators: **None**

### After Fix (Target)
- Gap detection success rate: **>95%** for all uploads
- PM levels job creation success rate: **>95%** for all uploads
- PM levels completion success rate: **>90%** of created jobs
- Error visibility: **100%** of failures logged and tracked
- User-facing indicators: **100%** of users see loading/error states

---

## Related Issues

- [JUNGWON_ONBOARDING_GAPS_PLAN.md](./JUNGWON_ONBOARDING_GAPS_PLAN.md) - Immediate manual fix for Jungwon
- `docs/implementation/GAP_DETECTION_MATRIX.csv` - Gap detection system overview
- `docs/backlog/HIDDEN_FEATURES.md` - Feature flag documentation
- `supabase/functions/create-job/index.ts` - Edge function for job creation
- `supabase/functions/stream-job-process/index.ts` - Job processor

---

## Open Questions

1. **Should gap detection be blocking or non-blocking?**
   - Current: Non-blocking (upload succeeds even if gap detection fails)
   - Pros: Better UX, no upload failures due to gap detection
   - Cons: Users may proceed without seeing important gaps
   - **Recommendation**: Keep non-blocking, but add retry functionality

2. **Should PM levels analysis be immediate or delayed?**
   - Current: 6-second delay (fire-and-forget)
   - Alternative: Immediate but async (user sees "Analyzing..." state)
   - **Recommendation**: Keep delayed but add tracking so user can see status

3. **What should happen if edge function fails?**
   - Current: Silent failure
   - Options: 
     - Retry automatically (with exponential backoff)
     - Surface error to user with "Retry" button
     - Fall back to client-side analysis
   - **Recommendation**: Combination - auto-retry once, then surface error with manual retry option

---

## Next Steps

1. **Review plan with team** - Get feedback on approach
2. **Prioritize fixes** - Confirm P0 vs P1 classification
3. **Implement Phase 1** - Critical fixes first
4. **Test on staging** - Validate fixes work
5. **Deploy to production** - Monitor closely
6. **Fix Jungwon** - Run manual fix from Part 1
7. **Implement Phases 2-3** - Monitoring and UX improvements
