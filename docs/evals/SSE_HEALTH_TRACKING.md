# SSE Stream Health Tracking

## Overview

SSE (Server-Sent Events) health tracking logs the lifecycle of streaming connections to diagnose client disconnects, server errors, and successful completions.

## Stage Names

### `sse.streamJob`
Real-time SSE streaming connection (used by frontend for live updates).

**Location:** `supabase/functions/stream-job/index.ts`

**Logged Events:**
1. **Start:** When SSE connection opens
2. **Complete:** When pipeline completes successfully and stream closes
3. **Client Abort:** When client disconnects (user closes tab, navigates away, network drop)
4. **Server Error:** When pipeline throws an error

### `async.streamJobProcess`
Async job processing (no SSE, used for background jobs).

**Location:** `supabase/functions/stream-job-process/index.ts`

**Logged Events:**
1. **Start:** When job processing begins
2. **Complete:** When pipeline completes successfully
3. **Server Error:** When pipeline throws an error

---

## Tracked Metrics

### Timing Metrics
- `started_at` - Connection/job start time
- `completed_at` - Connection/job end time  
- `duration_ms` - Total duration (ms)
- `ttfu_ms` - Time to first useful event (excludes heartbeats) - **SSE only**

### Success/Failure
- `success` - Boolean (true = completed successfully)
- `error_type` - Error class name (`ClientAbort`, `PipelineError`, `TimeoutError`, etc.)
- `error_message` - Human-readable error description (truncated to 500 chars)

### Additional Context
- `job_id` - Job UUID
- `job_type` - `'coverLetter'`, `'pmLevels'`, or `'onboarding'`
- `user_id` - User UUID
- `result_subset` - JSONB with connection metadata:
  - `connectionId` - Unique connection UUID (**SSE only**)
  - `closeReason` - `'client_abort'`, `'server_error'`, or `'server_complete'` (**SSE only**)
  - `aborted` - Boolean (**SSE only**)
  - `eventCount` - Number of SSE events sent (**SSE only**)
  - `ttfu_ms` - Time to first useful event (**SSE only**)
  - `firstProgressMs` - Time to first progress event (**SSE only**)

---

## Use Cases

### 1. Client Disconnect Rate
**Question:** How often do users close the tab before completion?

```sql
SELECT 
  job_type,
  COUNT(*) FILTER (WHERE error_type = 'ClientAbort') as client_aborts,
  COUNT(*) FILTER (WHERE success) as completions,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE error_type = 'ClientAbort') / COUNT(*), 1) as abort_rate_pct
FROM evals_log
WHERE stage = 'sse.streamJob'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type;
```

**Expected:**
```
job_type    | client_aborts | completions | total | abort_rate_pct
------------|---------------|-------------|-------|---------------
coverLetter |       12      |     150     |  162  |      7.4%
pmLevels    |        3      |      45     |   48  |      6.3%
```

**Interpretation:**
- ✅ < 10% = Good (acceptable disconnect rate)
- ⚠️ 10-20% = Warning (UX may be slow, users impatient)
- ❌ > 20% = Critical (investigate latency, progress feedback)

---

### 2. Time to First Update (TTFU)
**Question:** How long until users see the first progress event?

```sql
SELECT 
  job_type,
  ROUND(AVG(ttfu_ms)) as avg_ttfu_ms,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ttfu_ms)) as p50_ttfu_ms,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ttfu_ms)) as p95_ttfu_ms,
  COUNT(*) as samples
FROM evals_log
WHERE stage = 'sse.streamJob'
  AND ttfu_ms IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type;
```

**Expected:**
```
job_type    | avg_ttfu_ms | p50_ttfu_ms | p95_ttfu_ms | samples
------------|-------------|-------------|-------------|--------
coverLetter |    8500     |    7200     |   15000     |   150
pmLevels    |   12000     |   10500     |   22000     |    45
```

**Interpretation:**
- ✅ < 10s = Fast (good perceived performance)
- ⚠️ 10-20s = Acceptable (users might get impatient)
- ❌ > 20s = Slow (investigate cold starts, slow stages)

---

### 3. Server Error Rate
**Question:** How often do pipelines crash?

```sql
SELECT 
  job_type,
  error_type,
  COUNT(*) as error_count,
  ARRAY_AGG(DISTINCT LEFT(error_message, 100)) as sample_messages
FROM evals_log
WHERE stage IN ('sse.streamJob', 'async.streamJobProcess')
  AND success = false
  AND error_type != 'ClientAbort'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type, error_type
ORDER BY error_count DESC;
```

**Expected:**
```
job_type    | error_type      | error_count | sample_messages
------------|-----------------|-------------|------------------
coverLetter | TimeoutError    |      3      | ["LLM call timeout after 60s"]
pmLevels    | ValidationError |      1      | ["Invalid workHistory data"]
```

**Interpretation:**
- ✅ < 1% error rate = Good
- ⚠️ 1-5% error rate = Investigate (may be transient)
- ❌ > 5% error rate = Critical (fix ASAP)

---

### 4. SSE Connection Duration Distribution
**Question:** How long do streaming connections stay open?

```sql
SELECT 
  job_type,
  ROUND(AVG(duration_ms) / 1000) as avg_duration_sec,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) / 1000) as p50_duration_sec,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) / 1000) as p95_duration_sec,
  COUNT(*) as connections
FROM evals_log
WHERE stage = 'sse.streamJob'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type;
```

**Expected:**
```
job_type    | avg_duration_sec | p50_duration_sec | p95_duration_sec | connections
------------|------------------|------------------|------------------|------------
coverLetter |        65        |        60        |       120        |     162
pmLevels    |        45        |        42        |        75        |      48
```

**Interpretation:**
- Connections should match pipeline latency
- Long tail (p95) shows worst-case UX
- Compare with pipeline stage durations to identify bottlenecks

---

### 5. Event Count Distribution
**Question:** How many SSE events do we send per connection?

```sql
SELECT 
  job_type,
  ROUND(AVG((result_subset->>'eventCount')::int)) as avg_events,
  MIN((result_subset->>'eventCount')::int) as min_events,
  MAX((result_subset->>'eventCount')::int) as max_events,
  COUNT(*) as connections
FROM evals_log
WHERE stage = 'sse.streamJob'
  AND result_subset->>'eventCount' IS NOT NULL
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY job_type;
```

**Expected:**
```
job_type    | avg_events | min_events | max_events | connections
------------|------------|------------|------------|------------
coverLetter |     25     |     10     |     45     |     162
pmLevels    |     18     |      8     |     30     |      48
```

**Interpretation:**
- More events = more granular progress updates
- Too many events (>50) = may overwhelm client
- Too few events (<5) = poor perceived performance

---

## Implementation Details

### `stream-job/index.ts` (SSE)

```typescript
// Start tracking
const connectionStartedAt = Date.now();

// Log on client abort
const onAbort = () => {
  void logConnection({ 
    success: false, 
    errorType: 'ClientAbort', 
    errorMessage: 'SSE connection aborted by client' 
  });
};
req.signal?.addEventListener('abort', onAbort, { once: true });

// Log on success
closeReason = 'server_complete';
await logConnection({ success: true });

// Log on error
closeReason = 'server_error';
await logConnection({
  success: false,
  errorType: err.name || 'PipelineError',
  errorMessage: err.message,
});
```

### `stream-job-process/index.ts` (Async)

```typescript
// Start tracking
const processingStartedAt = Date.now();

// Log start
voidLogEval(supabase, {
  job_id: jobId,
  job_type: job.type,
  stage: 'async.streamJobProcess',
  user_id: job.user_id,
  started_at: new Date(processingStartedAt),
  success: true, // Placeholder
});

// Log on success
voidLogEval(supabase, {
  /* ... */
  success: true,
});

// Log on error
voidLogEval(supabase, {
  /* ... */
  success: false,
  error_type: err.name,
  error_message: err.message,
});
```

---

## Monitoring Dashboard Queries

### Health Overview (Last 24 Hours)
```sql
SELECT 
  stage,
  job_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE success) as successful,
  COUNT(*) FILTER (WHERE error_type = 'ClientAbort') as client_aborts,
  COUNT(*) FILTER (WHERE success = false AND error_type != 'ClientAbort') as server_errors,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 1) as success_rate_pct,
  ROUND(AVG(duration_ms)) as avg_duration_ms,
  ROUND(AVG(ttfu_ms)) as avg_ttfu_ms
FROM evals_log
WHERE stage IN ('sse.streamJob', 'async.streamJobProcess')
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY stage, job_type
ORDER BY stage, job_type;
```

### Recent Failures (Last Hour)
```sql
SELECT 
  created_at,
  stage,
  job_type,
  error_type,
  LEFT(error_message, 200) as error_message_preview,
  duration_ms,
  result_subset->>'connectionId' as connection_id
FROM evals_log
WHERE stage IN ('sse.streamJob', 'async.streamJobProcess')
  AND success = false
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 20;
```

### Connection Metrics Trend (7-Day)
```sql
SELECT 
  DATE_TRUNC('day', created_at) as day,
  stage,
  job_type,
  COUNT(*) as connections,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success) / COUNT(*), 1) as success_rate_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE error_type = 'ClientAbort') / COUNT(*), 1) as abort_rate_pct,
  ROUND(AVG(duration_ms) / 1000) as avg_duration_sec
FROM evals_log
WHERE stage IN ('sse.streamJob', 'async.streamJobProcess')
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY day, stage, job_type
ORDER BY day DESC, stage, job_type;
```

---

## Alerts & Thresholds

### Critical Alerts (Page Immediately)
- ❌ Server error rate > 10% (any 15-min window)
- ❌ TTFU p95 > 30s (any 1-hour window)
- ❌ Success rate < 80% (any 30-min window)

### Warning Alerts (Investigate Next Day)
- ⚠️ Client abort rate > 15% (any 1-hour window)
- ⚠️ TTFU p95 > 20s (24-hour average)
- ⚠️ Server error rate > 5% (24-hour average)

### Info Alerts (Track Trend)
- ℹ️ Client abort rate trend increasing
- ℹ️ TTFU trend increasing
- ℹ️ Event count trend increasing (may indicate code bloat)

---

## Related Documentation
- `docs/evals/STAGE_NAMING_FIX.md` - Stage naming conventions
- `docs/evals/EVALS_V1_1_IMPLEMENTATION_SPEC.md` - Overall evals architecture
- `supabase/functions/stream-job/index.ts` - SSE implementation
- `supabase/functions/stream-job-process/index.ts` - Async implementation

