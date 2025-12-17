# SSE Health Tracking - Implementation Summary

## Status: ✅ Complete

SSE (Server-Sent Events) health tracking is **already implemented** in `stream-job` and has been **added** to `stream-job-process`.

---

## What Was Done

### ✅ Already Existed in `stream-job` (SSE Streaming)
The SSE streaming function already had comprehensive health tracking:

**Stage Name:** `sse.streamJob`

**Tracked Events:**
- ✅ **Client Abort:** When user closes tab, navigates away, or network drops
- ✅ **Server Complete:** When pipeline finishes successfully
- ✅ **Server Error:** When pipeline throws an error

**Metrics:**
- Connection start/end timestamps
- Duration (ms)
- TTFU (Time to First Useful event) - excludes heartbeats
- Event count
- Close reason (`client_abort`, `server_complete`, `server_error`)
- Connection ID (UUID for debugging)

### ✅ Added to `stream-job-process` (Async Processing)
Added equivalent tracking for the async (non-SSE) job processor:

**Stage Name:** `async.streamJobProcess`

**Tracked Events:**
- ✅ **Processing Start:** Logged when job begins
- ✅ **Processing Complete:** Logged when pipeline finishes successfully
- ✅ **Processing Error:** Logged when pipeline throws an error

**Metrics:**
- Processing start/end timestamps
- Duration (ms)
- Error type & message (if failed)

**Changes:**
- Imported `voidLogEval` from `_shared/evals/log.ts`
- Added timing capture (`processingStartedAt`)
- Added start event logging
- Added completion event logging (success path)
- Added error event logging (failure path)

---

## Key Differences

| Feature | `sse.streamJob` | `async.streamJobProcess` |
|---------|-----------------|--------------------------|
| **Connection Type** | SSE (real-time streaming) | HTTP request/response |
| **Client Aborts** | ✅ Tracked | ❌ N/A (no persistent connection) |
| **Event Count** | ✅ Tracked | ❌ N/A (no events sent) |
| **TTFU** | ✅ Tracked | ❌ N/A (no streaming) |
| **Connection ID** | ✅ Tracked | ❌ N/A |
| **Processing Duration** | ✅ Tracked | ✅ Tracked |
| **Success/Failure** | ✅ Tracked | ✅ Tracked |

---

## Use Cases

### 1. Diagnose Client Disconnects
**Query:** How often do users close the tab before completion?

```sql
SELECT 
  COUNT(*) FILTER (WHERE error_type = 'ClientAbort') as client_aborts,
  COUNT(*) FILTER (WHERE success) as completions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE error_type = 'ClientAbort') / COUNT(*), 1) as abort_rate_pct
FROM evals_log
WHERE stage = 'sse.streamJob'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Interpretation:**
- < 10% = Good
- 10-20% = Warning (UX may be slow)
- \> 20% = Critical (investigate latency)

### 2. Track Time to First Update (TTFU)
**Query:** How long until users see progress?

```sql
SELECT 
  ROUND(AVG(ttfu_ms)) as avg_ttfu_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ttfu_ms)) as p95_ttfu_ms
FROM evals_log
WHERE stage = 'sse.streamJob'
  AND ttfu_ms IS NOT NULL
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Interpretation:**
- < 10s = Fast
- 10-20s = Acceptable
- \> 20s = Slow (investigate cold starts)

### 3. Monitor Server Error Rate
**Query:** How often do pipelines crash?

```sql
SELECT 
  error_type,
  COUNT(*) as error_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER(), 1) as error_pct
FROM evals_log
WHERE stage IN ('sse.streamJob', 'async.streamJobProcess')
  AND success = false
  AND error_type != 'ClientAbort'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY error_type
ORDER BY error_count DESC;
```

**Interpretation:**
- < 1% = Good
- 1-5% = Investigate
- \> 5% = Critical

---

## Files Changed

**Updated:**
- `supabase/functions/stream-job-process/index.ts` - Added health tracking

**Created:**
- `docs/evals/SSE_HEALTH_TRACKING.md` - Full documentation
- `docs/evals/SSE_HEALTH_TRACKING_SUMMARY.md` - This file

**Already Existed:**
- `supabase/functions/stream-job/index.ts` - Already had tracking (lines 186-222)

---

## Deployment

✅ **Deployed:** `stream-job-process` with health tracking

```bash
supabase functions deploy stream-job-process --no-verify-jwt
```

**Note:** `stream-job` does not need redeployment (tracking already exists).

---

## Verification Queries

### Check SSE Health (Last 24 Hours)
```sql
SELECT 
  stage,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE error_type = 'ClientAbort') as client_aborts,
  COUNT(*) FILTER (WHERE success = false AND error_type != 'ClientAbort') as server_errors,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 1) as success_rate_pct,
  ROUND(AVG(duration_ms) / 1000) as avg_duration_sec,
  ROUND(AVG(ttfu_ms) / 1000) as avg_ttfu_sec
FROM evals_log
WHERE stage IN ('sse.streamJob', 'async.streamJobProcess')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY stage;
```

**Expected:**
```
stage                | total | successful | client_aborts | server_errors | success_rate_pct | avg_duration_sec | avg_ttfu_sec
---------------------|-------|------------|---------------|---------------|------------------|------------------|-------------
sse.streamJob        |   50  |     45     |       3       |       2       |       90.0       |        65        |      8
async.streamJobProcess |   10  |      9     |       0       |       1       |       90.0       |        62        |     null
```

### Check Recent Client Aborts
```sql
SELECT 
  created_at,
  job_type,
  duration_ms / 1000 as duration_sec,
  (result_subset->>'eventCount')::int as events_sent,
  result_subset->>'closeReason' as close_reason
FROM evals_log
WHERE stage = 'sse.streamJob'
  AND error_type = 'ClientAbort'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Interpretation:**
- If `duration_sec` < 10: User likely closed tab immediately (impatient or wrong page)
- If `duration_sec` 10-30: User may have gotten bored waiting
- If `duration_sec` > 30: Network issue or user navigated away mid-process

---

## Monitoring Alerts

### Critical (Page Immediately)
- ❌ Server error rate > 10% (15-min window)
- ❌ TTFU p95 > 30s (1-hour window)
- ❌ Success rate < 80% (30-min window)

### Warning (Investigate Next Day)
- ⚠️ Client abort rate > 15% (1-hour window)
- ⚠️ TTFU p95 > 20s (24-hour average)
- ⚠️ Server error rate > 5% (24-hour average)

---

## Next Steps

1. **Monitor dashboards** using queries in `docs/evals/SSE_HEALTH_TRACKING.md`
2. **Set up alerts** for critical thresholds
3. **Analyze trends** weekly to identify UX issues
4. **Optimize TTFU** if p95 > 20s consistently

---

## Related Documentation
- `docs/evals/SSE_HEALTH_TRACKING.md` - Full guide with all queries
- `docs/evals/STAGE_NAMING_FIX.md` - Stage naming conventions
- `docs/evals/EVALS_V1_1_IMPLEMENTATION_SPEC.md` - Overall evals architecture

