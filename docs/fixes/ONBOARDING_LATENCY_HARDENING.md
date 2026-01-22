# Onboarding Latency & Flow Hardening Plan

**Date**: 2026-01-22  
**User Case**: Ben Shaw (015fa3cb-5f3b-4c64-be18-2c3ef811bcca)  
**Issue**: User experienced latency during file upload/processing, abandoned progress bar, tried multiple upload methods, breaking the flow

---

## Problem Summary

### What Happened
1. **23:17:53** - User uploaded resume (failed after extraction)
2. **23:20:19** - User uploaded cover letter (completed successfully)
3. **23:50:12** - User re-uploaded resume (failed again)
4. **23:58:13-29** - User made ~10 rapid attempts to upload manual cover letter text (all failed - empty content)
5. **23:58:27** - User re-uploaded resume again (failed)

### Root Causes
1. **Latency**: File processing took too long, user got impatient
2. **Poor Progress Feedback**: User "neglected the progress bar" - likely not visible/clear enough
3. **No Flow Locking**: User could jump around and retry uploads while processing was ongoing
4. **Validation Errors Not Clear**: Empty manual text inputs failed silently with generic "Text extraction failed"
5. **No Deduplication**: System allowed multiple uploads of the same file
6. **Failed State Not Recoverable**: Resume extracted text successfully (6,804 chars) but processing failed - no way to retry

---

## Immediate Fixes (Priority 1)

### 1. **Make Progress Bar Unmissable**
**Problem**: User ignored/missed the progress bar during processing

**Solution**:
- Make progress bar **full-width, sticky at top** of screen during processing
- Add **animated pulse/glow** to draw attention
- Show **estimated time remaining** (e.g., "~30 seconds remaining")
- Block all other UI interactions with semi-transparent overlay
- Add **"Processing your files..."** heading above progress bar

**Files to modify**:
- `src/pages/NewUserOnboarding.tsx` (lines 74-84: globalProgress state)
- Add new component: `src/components/onboarding/ProcessingOverlay.tsx`

**Implementation**:
```tsx
{isProcessing && (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20">
    <Card className="w-full max-w-2xl mx-4 shadow-2xl border-2 border-blue-500 animate-pulse-slow">
      <CardHeader>
        <CardTitle className="text-2xl">Processing Your Files...</CardTitle>
        <p className="text-muted-foreground">Please wait while we analyze your content</p>
      </CardHeader>
      <CardContent>
        <Progress value={globalProgress.percent} className="h-4 mb-2" />
        <p className="text-sm font-medium">{globalProgress.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {estimatedTimeRemaining > 0 ? `~${estimatedTimeRemaining}s remaining` : 'Almost done...'}
        </p>
      </CardContent>
    </Card>
  </div>
)}
```

---

### 2. **Lock UI During Processing**
**Problem**: User could upload files multiple times while processing was ongoing

**Solution**:
- Disable all upload buttons/inputs when `isProcessing === true`
- Show "Processing..." state on disabled buttons
- Prevent navigation away from page (add `beforeunload` handler)

**Files to modify**:
- `src/pages/NewUserOnboarding.tsx` (add `useEffect` for `beforeunload`)
- `src/components/onboarding/FileUploadCard.tsx` (disable inputs during processing)

**Implementation**:
```tsx
useEffect(() => {
  if (isProcessing) {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Your files are still processing. Are you sure you want to leave?';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }
}, [isProcessing]);
```

---

### 3. **Better Validation Error Messages**
**Problem**: "Text extraction failed" is too generic - doesn't tell user what went wrong

**Solution**:
- Show specific error reason from `getExtractionFailureReason`
- For empty manual text: "Please paste your cover letter text before submitting"
- For too-short text: "Cover letter must be at least 80 words (currently: X words)"
- Add inline validation before submission

**Files to modify**:
- `src/services/fileUploadService.ts` (lines 758-778: improve error messages)
- `src/components/onboarding/FileUploadCard.tsx` (show validation errors inline)

**Implementation**:
```typescript
// In fileUploadService.ts
private getExtractionFailureReason(text: string, type: FileType): string | null {
  const normalized = text.trim();
  if (!normalized) {
    return type === 'coverLetter' 
      ? 'Please paste your cover letter text before submitting'
      : 'No text extracted from file';
  }

  if (type === 'resume' || type === 'coverLetter') {
    const wordCount = normalized.split(/\s+/).filter(Boolean).length;
    const minWords = type === 'coverLetter' ? 80 : 50;
    if (wordCount < minWords) {
      return `${type === 'coverLetter' ? 'Cover letter' : 'Resume'} must be at least ${minWords} words (currently: ${wordCount} words)`;
    }
  }
  
  return null;
}
```

---

### 4. **File Deduplication**
**Problem**: User uploaded same resume 3 times, creating duplicate failed records

**Solution**:
- Check if file with same name already exists for user
- If exists and completed: show "Already uploaded" message
- If exists and failed: offer to "Retry" instead of re-uploading
- Use file hash for better deduplication (optional)

**Files to modify**:
- `src/services/fileUploadService.ts` (add `checkExistingFile` method)
- `src/components/onboarding/FileUploadCard.tsx` (show retry button for failed uploads)

**Implementation**:
```typescript
private async checkExistingFile(
  userId: string,
  fileName: string,
  type: FileType
): Promise<{ exists: boolean; status: string; sourceId?: string }> {
  const { data, error } = await supabase
    .from('sources')
    .select('id, processing_status')
    .eq('user_id', userId)
    .eq('file_name', fileName)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { exists: false, status: 'none' };
  }

  return {
    exists: true,
    status: data.processing_status,
    sourceId: data.id,
  };
}
```

---

### 5. **Retry Failed Processing**
**Problem**: Resume extracted text successfully but processing failed - no way to recover

**Solution**:
- Add "Retry" button for failed uploads that have extracted text
- Reuse existing `sourceId` instead of re-uploading
- Show what went wrong and offer to retry

**Files to modify**:
- `src/components/onboarding/FileUploadCard.tsx` (add retry UI)
- `src/services/fileUploadService.ts` (add `retryProcessing` method)

---

## Secondary Improvements (Priority 2)

### 6. **Latency Optimization**
**Problem**: Processing takes too long, causing user impatience

**Solutions**:
- **Parallel Processing**: Process resume + cover letter simultaneously (currently sequential?)
- **Streaming UI**: Show intermediate results as they come in (stories, work history)
- **Reduce LLM Calls**: Batch operations where possible
- **Add Caching**: Cache common extractions (company names, role titles)

**Metrics to Track**:
- Time to first story extracted
- Time to complete resume analysis
- Time to complete cover letter analysis
- Total onboarding time

---

### 7. **Progress Estimation**
**Problem**: Progress bar shows percent but no time estimate

**Solutions**:
- Track historical processing times per file type/size
- Show estimated time remaining based on averages
- Update estimate as processing progresses
- Show "faster than average" / "slower than average" feedback

---

### 8. **Graceful Degradation**
**Problem**: If one file fails, entire onboarding might feel broken

**Solutions**:
- Allow partial completion (resume only, or cover letter only)
- Show "Skip this step" option after timeout
- Continue to next step even if one file fails
- Show clear summary of what succeeded/failed

---

### 9. **Better Empty State Handling**
**Problem**: Manual text input allowed empty submissions

**Solutions**:
- Disable submit button until text is entered
- Show character/word count in real-time
- Add placeholder text with example
- Validate on blur, not just on submit

---

### 10. **Add Onboarding Analytics**
**Problem**: No visibility into where users get stuck

**Solutions**:
- Track time spent on each step
- Track abandonment rate per step
- Track retry attempts
- Track error rates by file type
- Send to `user_events` table

---

## Implementation Plan

### Phase 1: Critical UX Fixes (1-2 days)
1. ✅ Processing overlay with prominent progress bar
2. ✅ UI locking during processing
3. ✅ Better validation error messages
4. ✅ File deduplication check

### Phase 2: Recovery & Retry (1 day)
5. ✅ Retry failed processing
6. ✅ Partial completion support

### Phase 3: Performance (2-3 days)
7. ⏳ Parallel processing
8. ⏳ Streaming intermediate results
9. ⏳ Progress time estimation

### Phase 4: Analytics & Monitoring (1 day)
10. ⏳ Onboarding analytics tracking
11. ⏳ Error rate dashboards

---

## Success Metrics

### Before (Current State)
- **Ben Shaw's Experience**:
  - 3 failed resume uploads
  - 10+ failed manual cover letter attempts
  - ~40 minutes from first upload to abandonment
  - No successful onboarding completion

### After (Target State)
- **< 2 minutes** total onboarding time (95th percentile)
- **< 5%** abandonment rate during processing
- **< 1%** duplicate upload rate
- **> 95%** first-attempt success rate
- **0** silent failures (all errors shown to user)

---

## Testing Plan

### Manual Testing
1. Upload large resume (>5MB) - verify progress bar is visible
2. Try to navigate away during processing - verify warning
3. Upload empty cover letter text - verify clear error message
4. Upload same file twice - verify deduplication
5. Simulate processing failure - verify retry button appears

### Automated Testing
1. Add E2E test for full onboarding flow
2. Add test for duplicate file detection
3. Add test for validation error messages
4. Add test for retry functionality

---

## Related Documents
- `docs/fixes/ONBOARDING_SYSTEMIC_FIX_PLAN.md` - Broader onboarding improvements
- `docs/analysis/COVER_LETTER_LATENCY_REPORT.md` - Cover letter performance analysis
- `COVER_LETTER_LATENCY_CORRECTION.md` - Cover letter optimization work

---

## Notes for Ben Shaw's Recovery

**Immediate Action**:
1. ✅ Set resume source to `pending` status
2. ✅ Created onboarding job: `44949a81-b083-45d8-8464-a99981bf3a6e`
3. ✅ Created cover letter job: `620c44c5-c465-4846-a4d2-0499a7840d2e`
4. ⏳ **User needs to reload onboarding page** to trigger processing

**Data Status**:
- Resume: 6,804 chars extracted ✅
- Cover Letter: 2,782 chars extracted ✅
- Both files have valid text, just need to be processed

**Manual Recovery** (if reload doesn't work):
```sql
-- Check job status
SELECT id, type, status, created_at FROM jobs 
WHERE user_id = '015fa3cb-5f3b-4c64-be18-2c3ef811bcca' 
ORDER BY created_at DESC;

-- If jobs are still pending, trigger from frontend or run edge function manually
```
