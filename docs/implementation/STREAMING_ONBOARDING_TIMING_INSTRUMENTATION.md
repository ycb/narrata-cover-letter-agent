# Streaming Onboarding Timing Instrumentation

## Summary
Comprehensive timing instrumentation added to the streaming onboarding pipeline to measure end-to-end performance and identify bottlenecks. **Timing data now surfaces in `/admin/evaluation` dashboard** for persistent visibility and trend analysis.

**Date:** Dec 9, 2025  
**Status:** ✅ Complete (Console Logs + Dashboard Integration)

---

## Objectives
Instrument the streaming onboarding flow to measure:
1. **Upload → raw_text saved** - Text extraction latency
2. **raw_text → structured_data saved** - LLM analysis latency (staged)
3. **structured_data → DB processing complete** - Database operation latency
4. **DB processing → progress 100%** - Final progress emit
5. **End-to-end elapsed time** - Total upload to completion

---

## Files Modified

### 1. `/src/services/fileUploadService.ts`
**Main upload orchestration and database processing**

#### `processContent()` - End-to-End Upload Flow
- **START marker** - Logs timestamp and file type
- **STAGE 1: Text Extraction**
  - Checksum generation timing
  - Cache hit detection
  - Actual extraction latency
- **STAGE 2: LLM Analysis**
  - Rule-based CL parsing timing
  - Save CL sections timing
  - Fetch work history for linking
  - LLM call timing (delegated to `openaiService.ts`)
- **STAGE 3: Database Operations**
  - Save `structured_data` to sources
  - Heuristic checks timing
  - `processStructuredData` timing (company/work_item/story inserts)
  - CL data processing timing
  - Skills normalization timing
- **FINAL SUMMARY** - Complete breakdown with stage-by-stage and total time

#### `processStructuredData()` - Database Processing
- **Company Upserts** - Create/update timing per company
- **Work Item Upserts** - Create/update timing per role
- **Story Inserts** - Insert timing per story
- **Gap Detection** - Total time for gap checks
- **Background Gap Judge** - Queue notification (non-blocking)
- **TIMING SUMMARY** - Aggregated metrics with counts

**Tracked Metrics:**
- `extractionLatencyMs` - PDF/DOCX → text
- `llmLatencyMs` - Text → structured JSON
- `dbLatencyMs` - Structured JSON → DB writes
- `saveSectionsMs` - Cover letter sections save
- `normalizeSkillsMs` - Skills table updates
- `gapHeuristicsMs` - Code-driven quality checks
- `companyUpsertMs` - Company table operations
- `workItemUpsertMs` - Work item table operations
- `storyInsertMs` - Story table operations
- `gapDetectionMs` - Gap detection + saving
- `totalProcessingMs` - End-to-end time

---

### 2. `/src/services/openaiService.ts`
**LLM analysis timing for staged resume and cover letter processing**

#### `analyzeResumeStagedWithEvents()` - Staged Resume Analysis
- **START marker** - Input length logged
- **Stage 1: Work History Skeleton**
  - OpenAI call timing (maxTokens: 2000)
  - Roles found count
- **Stage 2+3: Parallel Stories + Skills**
  - Per-role LLM call timing (with index tracking)
  - Skills + education LLM call timing
  - Parallel completion summary
- **FINAL SUMMARY** - Total time with stage breakdown

#### `analyzeCoverLetterStories()` - CL Story Extraction
- **START marker** - Input length + work history count
- **Prompt Building** - Time to construct prompt
- **OpenAI Call** - LLM latency (maxTokens: 2500)
- **FINAL SUMMARY** - Total time

**Logged Metrics:**
- Input text length (chars)
- Stage-by-stage LLM timing
- Per-role story extraction timing
- Parallel execution savings

---

## Log Output Format

### Where Logs Appear
**All timing logs surface in the BROWSER CONSOLE** (not server logs), since the streaming onboarding flow runs entirely client-side:
- `src/services/fileUploadService.ts` → Browser Console
- `src/services/openaiService.ts` → Browser Console
- `src/services/gapDetectionService.ts` → Browser Console (if timing added)

**Why?** The current onboarding implementation processes files in the browser (text extraction, LLM calls, DB writes all happen client-side via Supabase client SDK).

**Production Considerations:**
- 🔴 These logs are **verbose** and will fill the console during uploads
- ⚠️ Consider adding a `VITE_ENABLE_TIMING_LOGS` env var to disable in production
- 💡 Alternatively, use `console.debug()` instead of `console.log()` so they can be filtered by log level

### Example: Conditional Timing Logs
```typescript
// In fileUploadService.ts
const TIMING_ENABLED = import.meta.env?.VITE_ENABLE_TIMING_LOGS === 'true' || import.meta.env.DEV;

if (TIMING_ENABLED) {
  console.log(`⏱️  [TIMING] processContent START...`);
}
```

---

### processContent() Summary
```
═══════════════════════════════════════════════════════════
⏱️  [TIMING] processContent COMPLETE - FULL BREAKDOWN:
═══════════════════════════════════════════════════════════
⏱️  [TIMING] ├─ STAGE 1: Text Extraction        1234.56ms
⏱️  [TIMING] ├─ STAGE 2: LLM Analysis          15678.90ms
⏱️  [TIMING] │   ├─ Save CL Sections             123.45ms
⏱️  [TIMING] │   └─ (LLM call details in openaiService.ts)
⏱️  [TIMING] ├─ STAGE 3: Database Operations    5678.90ms
⏱️  [TIMING] │   ├─ Heuristic Checks             123.45ms
⏱️  [TIMING] │   ├─ Skills Normalization         234.56ms
⏱️  [TIMING] │   └─ (processStructuredData details below)
⏱️  [TIMING] ├─────────────────────────────────────────────
⏱️  [TIMING] └─ 🎯 TOTAL END-TO-END TIME:      22592.36ms (22.6s)
⏱️  [TIMING] Completed at: 2025-12-09T...
═══════════════════════════════════════════════════════════
```

### processStructuredData() Summary
```
═══════════════════════════════════════════════════════════
⏱️  [TIMING] processStructuredData COMPLETE - BREAKDOWN:
═══════════════════════════════════════════════════════════
⏱️  [TIMING] ├─ Company Upserts              234.56ms (3 created, 2 updated)
⏱️  [TIMING] ├─ Work Item Upserts           1234.56ms (5 created, 1 updated)
⏱️  [TIMING] ├─ Story Inserts               2345.67ms (12 created, 0 failed)
⏱️  [TIMING] ├─ Gap Detection                 567.89ms
⏱️  [TIMING] ├─────────────────────────────────────────────
⏱️  [TIMING] └─ 🎯 TOTAL processStructuredData: 4382.68ms (4.4s)
═══════════════════════════════════════════════════════════
```

### LLM Staged Analysis Summary
```
═══════════════════════════════════════════════════════════
⏱️  [TIMING] 🎉 analyzeResumeStagedWithEvents COMPLETE
⏱️  [TIMING] Total time: 15234ms (15.2s)
═══════════════════════════════════════════════════════════
```

---

## Key Insights Enabled

### Performance Bottleneck Identification
1. **Text Extraction** - Identify slow PDF/DOCX parsing
2. **LLM Calls** - Measure staged vs single-call performance
3. **Database Writes** - Identify N+1 queries or slow inserts
4. **Gap Detection** - Measure heuristic vs LLM judge overhead

### Optimization Opportunities
- **Cache Hits** - Track pre-extracted text usage
- **Parallel Execution** - Measure speedup from parallel LLM stages
- **Batch Operations** - Identify opportunities for bulk inserts

### User Experience Metrics
- **Upload → First Progress** - Time to first meaningful UI update
- **Upload → 100% Complete** - Total perceived latency
- **LinkedIn Detection** - Early signal for UI enhancement

---

## Testing Recommendations

### Manual Testing
1. Upload a resume and watch console for timing breakdown
2. Upload a cover letter and compare CL-specific timings
3. Upload resume + cover letter simultaneously (if batched)
4. Test with pre-extracted text (cache hit scenario)

### Metrics to Monitor
- **Resume (3-5 roles):** Should complete in 20-40s
- **Resume (10+ roles):** May take 60-90s due to parallel LLM calls
- **Cover Letter:** Should complete in 10-20s
- **Text Extraction:** Should be <3s for most files
- **processStructuredData:** Should scale linearly with work history count

### Performance Regression Detection
If any stage exceeds expected time:
- **Extraction >5s** - Check file size/format
- **LLM >30s per role** - Check OpenAI API latency
- **DB >10s for 5 roles** - Check database indexing
- **Gap Detection >5s** - Check LLM judge usage flag

---

## Implementation Details

### Timing Precision
- Uses `performance.now()` for sub-millisecond precision
- Tracks both stage-level and sub-operation timing
- Aggregates parallel operations correctly

### Non-Blocking Operations
- Background gap judge is queued but not measured in critical path
- Evaluation run logging happens asynchronously

### Error Handling
- Timing continues even if individual stages fail
- Failed operations still log their duration

---

## Next Steps

### Phase 1: Monitor Production Metrics ✅
- [x] Instrument all critical paths
- [x] Add comprehensive logging
- [ ] Collect baseline performance data from real uploads
- [ ] **Consider adding env var to disable timing logs in production** (see "Production Considerations" above)

### Phase 2: Identify Bottlenecks
- [ ] Analyze 90th percentile latencies from dev/staging environments
- [ ] Identify slow outliers
- [ ] Correlate performance with file characteristics (size, format, complexity)

### Phase 3: Optimize
- [ ] Reduce extraction time (switch to faster PDF parser?)
- [ ] Optimize LLM prompts for speed (reduce tokens, simplify instructions)
- [ ] Batch database operations more aggressively
- [ ] Cache more aggressively (expand pre-extraction cache)
- [ ] Optionally: Switch `console.log()` → `console.debug()` for production log filtering

---

## Related Documentation
- `/docs/onboarding-streaming-plan.md` - Original streaming architecture
- `/docs/hand-off/onboarding-streaming-handoff.md` - Implementation handoff
- `/docs/implementation/FIXES_APPLIED_SUMMARY.md` - Recent fixes and improvements

---

## Appendix: Log Search Patterns

### Find End-to-End Times
```
grep "TOTAL END-TO-END TIME" console.log
```

### Find Slow Extractions (>3s)
```
grep "Text extraction took" console.log | awk '$7 > 3000'
```

### Find Slow LLM Calls (>20s)
```
grep "LLM analysis took" console.log | awk '$7 > 20000'
```

### Find Database Bottlenecks (>10s)
```
grep "Database operations took" console.log | awk '$7 > 10000'
```

### Track processStructuredData Performance
```
grep "processStructuredData complete" console.log
```

---

## Dashboard Integration ✅

### Where Timing Data Appears
**1. Console Logs (Browser)** - Real-time debugging during upload
- Detailed stage-by-stage breakdown
- Sub-operation timing (checksum, cache hits, per-role LLM calls)
- Color-coded with `⏱️ [TIMING]` prefix

**2. `/admin/evaluation` Dashboard** - Persistent visibility and analysis
- **Pipeline column** now shows `total_latency_ms` for ALL file types (resume, coverLetter)
- Previously only showed for coverLetters, now fixed to show for all uploads
- Sortable table for identifying slow uploads
- Individual run detail view shows LLM + Pipeline timing

**3. Database Tables** - Long-term storage for analytics
- `evaluation_runs.total_latency_ms` - End-to-end time
- `evaluation_runs.llm_analysis_latency_ms` - LLM call time
- `evaluation_runs.text_extraction_latency_ms` - PDF/DOCX parsing time
- `evaluation_runs.database_save_latency_ms` - DB write time
- `evaluation_runs.timing_breakdown` (NEW) - Detailed JSONB breakdown

### New: Timing Breakdown Column (JSONB)
Added `timing_breakdown` JSONB column to `evaluation_runs` for granular metrics:

```json
{
  "extraction": {
    "extraction_ms": 1234,
    "cache_hit": false
  },
  "llm": {
    "total_ms": 16924
  },
  "database": {
    "save_sections_ms": 123,
    "normalize_skills_ms": 234,
    "gap_heuristics_ms": 567,
    "total_ms": 4737
  }
}
```

**Migration:** `20251227_add_timing_breakdown_to_evaluation_runs.sql`

---

## Production Deployment Checklist

Before deploying to production, consider:

- [ ] **Volume:** Are timing logs too verbose for production console?
- [ ] **Toggle:** Add `VITE_ENABLE_TIMING_LOGS` env var to disable/enable
- [ ] **Log Level:** Switch from `console.log()` to `console.debug()` for easier filtering
- [ ] **Monitoring:** Set up client-side error tracking (Sentry, LogRocket) to capture timing data
- [ ] **Baseline:** Establish performance baselines in staging before launch

### Recommended: Conditional Timing
Add this to the top of `fileUploadService.ts` and `openaiService.ts`:

```typescript
const TIMING_ENABLED = import.meta.env?.VITE_ENABLE_TIMING_LOGS === 'true' || import.meta.env.DEV;

// Then wrap all timing logs:
if (TIMING_ENABLED) {
  console.log(`⏱️  [TIMING] ...`);
}
```

This ensures timing logs only appear in development by default, but can be enabled in production for debugging.

---

**Implementation Complete** ✅  
All timing instrumentation is now live in the streaming onboarding pipeline.  
**Remember:** Logs appear in **browser console** and may be verbose in production.

