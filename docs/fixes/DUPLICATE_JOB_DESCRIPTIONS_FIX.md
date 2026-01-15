# Duplicate Job Descriptions Fix

## Problem

Users were consistently getting duplicate job descriptions created for the same content. Analysis showed:

1. Duplicates were created **milliseconds apart** (not user double-clicks)
2. Always exactly **2 duplicates** per job
3. Happened frequently across many different jobs

### Root Cause: Race Condition

The `CoverLetterModal` component had two code paths that both called `findOrCreateJobDescription`:

1. **Pre-parse effect** (line 2038-2116):
   - Triggers automatically when user pastes job description
   - 1-second debounce after user stops typing
   - Calls `jobDescriptionService.findOrCreateJobDescription()`
   - Stores result in `preParsedJD` state

2. **Generate button handler** (line 2265-2337):
   - Checks if `preParsedJD` exists and content matches
   - If NOT, calls `jobDescriptionService.findOrCreateJobDescription()` again

### The Race Condition Scenario:

```
Time 0s:   User pastes job description
Time 1s:   Pre-parse effect starts parsing (takes 2-5 seconds)
Time 2s:   User clicks "Generate" (before pre-parse completes)
           preParsedJD is still null
           Generate handler starts its own parse
Time 2.1s: Both parses racing to create job description:
           - Parse 1: checks DB → no match → creates record A
           - Parse 2: checks DB → no match → creates record B
Result:    2 identical job descriptions created
```

The `findOrCreateJobDescription` method checks the database for existing records, but when both requests check simultaneously, both see "no existing record" and both create new ones.

## Solution

Modified the generate handler to **wait for in-progress pre-parse** instead of starting a new parse:

### Changes Made:

1. **Added promise tracking** (line 385):
   ```typescript
   const preParsePromiseRef = useRef<Promise<JobDescriptionRecord> | null>(null);
   ```

2. **Store promise in pre-parse effect** (line 2070-2076):
   ```typescript
   const parsePromise = jobDescriptionService.findOrCreateJobDescription(user.id, trimmed, {
     url: null,
     onProgress: () => {},
     onToken: () => {},
     signal: controller.signal,
   });
   
   preParsePromiseRef.current = parsePromise;
   const record = await parsePromise;
   ```

3. **Clear promise when done** (line 2107):
   ```typescript
   finally {
     if (preParseRequestIdRef.current === requestId) {
       setIsPreParsing(false);
       preParsePromiseRef.current = null;
     }
   }
   ```

4. **Wait for pre-parse in generate handler** (line 2278-2312):
   ```typescript
   // If pre-parse is in progress for the same content, wait for it to complete
   else if (isPreParsing && preParsePromiseRef.current) {
     console.log('[CoverLetterCreateModal] Pre-parse in progress, waiting for completion...');
     setJdStreamingMessages(['Analyzing job description...']);
     try {
       record = await preParsePromiseRef.current;
       console.log('[CoverLetterCreateModal] Pre-parse completed, using result:', record.id);
     } catch (error) {
       // Pre-parse failed or was aborted, fall through to fresh parse
       console.warn('[CoverLetterCreateModal] Pre-parse failed, parsing fresh', error);
       // ... parse fresh ...
     }
   }
   ```

### Flow After Fix:

```
Time 0s:   User pastes job description
Time 1s:   Pre-parse effect starts parsing (stored in preParsePromiseRef)
Time 2s:   User clicks "Generate"
           Sees isPreParsing=true and preParsePromiseRef exists
           Waits for pre-parse promise to complete
Time 3s:   Pre-parse completes, returns record
           Generate handler uses the same record
Result:    Only 1 job description created ✓
```

## Benefits

✅ **No duplicate job descriptions** - Only one database record created per unique content
✅ **Pre-parsing still works** - Users get fast response when they wait
✅ **Generate still fast** - Reuses pre-parse result when available
✅ **Graceful fallback** - If pre-parse fails, generate parses fresh

## Testing

To verify the fix:

1. Paste a job description
2. **Immediately** click Generate (before pre-parse indicator disappears)
3. Check database - should only see 1 job_description record created
4. Try multiple times - should never create duplicates

## Cleanup Performed

Also deleted duplicate job descriptions from database:
- All 225 Uplight jobs deleted
- Kept 1 most recent ClickUp job (deleted 64 duplicates)
- Kept 1 most recent SolarAPP Foundation job (deleted 22 duplicates)
- Remaining duplicates for other companies can be cleaned up using similar query

## Future Improvements

Consider adding a **unique constraint** in the database schema to prevent duplicates at the DB level:

```sql
CREATE UNIQUE INDEX idx_job_descriptions_user_content 
ON job_descriptions (user_id, md5(content));
```

This would provide a safety net even if application-level coordination fails.
