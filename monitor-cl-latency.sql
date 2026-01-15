-- ============================================================================
-- Cover Letter Draft Creation - Latency Monitoring Queries
-- ============================================================================
-- Run these queries regularly to monitor cover letter generation performance
-- ============================================================================

-- 1. DAILY LATENCY SUMMARY (Last 7 Days)
-- ============================================================================
-- Shows average and P95 latency by date for Phase A (main bottleneck)
SELECT 
  DATE(created_at) as date,
  COUNT(*) as drafts_created,
  ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as median_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as p95_seconds,
  ROUND(MIN(duration_ms)::numeric / 1000, 1) as min_seconds,
  ROUND(MAX(duration_ms)::numeric / 1000, 1) as max_seconds
FROM evals_log
WHERE job_type = 'coverLetter' 
  AND stage = 'coverLetter.phaseA'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;


-- 2. ALL STAGES LATENCY SUMMARY (Last 30 Days)
-- ============================================================================
-- Shows performance of all cover letter generation stages
SELECT 
  stage,
  COUNT(*) as executions,
  ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as median_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as p95_seconds,
  ROUND(AVG(ttfu_ms)::numeric / 1000, 1) as avg_ttfu_seconds
FROM evals_log
WHERE job_type = 'coverLetter'
  AND created_at >= NOW() - INTERVAL '30 days'
  AND duration_ms IS NOT NULL
GROUP BY stage
ORDER BY avg_seconds DESC;


-- 3. HOURLY LATENCY (Today)
-- ============================================================================
-- Useful for identifying performance degradation during specific hours
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  stage,
  COUNT(*) as count,
  ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as p95_seconds
FROM evals_log
WHERE job_type = 'coverLetter'
  AND created_at >= CURRENT_DATE
  AND stage IN ('coverLetter.phaseA', 'sectionGaps', 'requirementAnalysis')
GROUP BY DATE_TRUNC('hour', created_at), stage
ORDER BY hour DESC, stage;


-- 4. SLOW DRAFTS (P95+ Latency)
-- ============================================================================
-- Identifies drafts that took longer than P95 (55 seconds)
SELECT 
  job_id,
  stage,
  ROUND(duration_ms::numeric / 1000, 1) as duration_seconds,
  created_at,
  success,
  error_message
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage = 'coverLetter.phaseA'
  AND duration_ms > 55000  -- P95 threshold
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY duration_ms DESC
LIMIT 20;


-- 5. ERROR RATE BY STAGE
-- ============================================================================
-- Monitors failure rates for each stage
SELECT 
  stage,
  COUNT(*) as total,
  SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failures,
  ROUND(100.0 * SUM(CASE WHEN success = false THEN 1 ELSE 0 END) / COUNT(*), 1) as error_rate_pct,
  ARRAY_AGG(DISTINCT error_type) FILTER (WHERE error_type IS NOT NULL) as error_types
FROM evals_log
WHERE job_type = 'coverLetter'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY stage
ORDER BY error_rate_pct DESC;


-- 6. END-TO-END LATENCY (Complete Draft Creation)
-- ============================================================================
-- Calculates total time from JD analysis to draft completion per job
SELECT 
  COUNT(DISTINCT job_id) as total_drafts,
  ROUND(AVG(total_duration)::numeric / 1000, 1) as avg_total_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_duration)::numeric / 1000, 1) as median_total_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY total_duration)::numeric / 1000, 1) as p95_total_seconds,
  ROUND(MIN(total_duration)::numeric / 1000, 1) as min_seconds,
  ROUND(MAX(total_duration)::numeric / 1000, 1) as max_seconds
FROM (
  SELECT 
    job_id,
    SUM(duration_ms) as total_duration
  FROM evals_log
  WHERE job_type = 'coverLetter'
    AND created_at >= NOW() - INTERVAL '30 days'
    AND stage IN ('jdAnalysis', 'requirementAnalysis', 'sectionGaps', 'goalsAndStrengths')
  GROUP BY job_id
) as job_totals;


-- 7. LATENCY BY USER (Top 10 Users)
-- ============================================================================
-- Identifies if specific users experience slower performance
SELECT 
  user_id,
  COUNT(*) as drafts_created,
  ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as p95_seconds
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage = 'coverLetter.phaseA'
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING COUNT(*) >= 3  -- Only users with 3+ drafts
ORDER BY avg_seconds DESC
LIMIT 10;


-- 8. TTFU (Time to First Update) ANALYSIS
-- ============================================================================
-- Monitors streaming performance (how quickly users see first results)
SELECT 
  stage,
  COUNT(*) as count,
  ROUND(AVG(ttfu_ms)::numeric / 1000, 1) as avg_ttfu_seconds,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ttfu_ms)::numeric / 1000, 1) as median_ttfu_seconds,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ttfu_ms)::numeric / 1000, 1) as p95_ttfu_seconds
FROM evals_log
WHERE job_type = 'coverLetter'
  AND ttfu_ms IS NOT NULL
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY stage
ORDER BY avg_ttfu_seconds DESC;


-- 9. PERFORMANCE ALERTS (Last 24 Hours)
-- ============================================================================
-- Identifies performance issues requiring immediate attention
SELECT 
  'Phase A P95 > 60s' as alert_type,
  COUNT(*) as affected_drafts,
  ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage = 'coverLetter.phaseA'
  AND duration_ms > 60000
  AND created_at >= NOW() - INTERVAL '24 hours'
UNION ALL
SELECT 
  'Phase A Avg > 45s' as alert_type,
  COUNT(*) as affected_drafts,
  ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage = 'coverLetter.phaseA'
  AND created_at >= NOW() - INTERVAL '24 hours'
HAVING AVG(duration_ms) > 45000
UNION ALL
SELECT 
  'Error Rate > 5%' as alert_type,
  COUNT(*) as affected_drafts,
  ROUND(100.0 * SUM(CASE WHEN success = false THEN 1 ELSE 0 END) / COUNT(*), 1) as error_rate_pct
FROM evals_log
WHERE job_type = 'coverLetter'
  AND created_at >= NOW() - INTERVAL '24 hours'
HAVING 100.0 * SUM(CASE WHEN success = false THEN 1 ELSE 0 END) / COUNT(*) > 5;


-- 10. WEEK-OVER-WEEK COMPARISON
-- ============================================================================
-- Compares current week vs previous week performance
WITH current_week AS (
  SELECT 
    stage,
    ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as p95_seconds
  FROM evals_log
  WHERE job_type = 'coverLetter'
    AND created_at >= DATE_TRUNC('week', NOW())
  GROUP BY stage
),
previous_week AS (
  SELECT 
    stage,
    ROUND(AVG(duration_ms)::numeric / 1000, 1) as avg_seconds,
    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::numeric / 1000, 1) as p95_seconds
  FROM evals_log
  WHERE job_type = 'coverLetter'
    AND created_at >= DATE_TRUNC('week', NOW()) - INTERVAL '7 days'
    AND created_at < DATE_TRUNC('week', NOW())
  GROUP BY stage
)
SELECT 
  cw.stage,
  cw.avg_seconds as current_avg,
  pw.avg_seconds as previous_avg,
  ROUND(((cw.avg_seconds - pw.avg_seconds) / pw.avg_seconds * 100)::numeric, 1) as avg_change_pct,
  cw.p95_seconds as current_p95,
  pw.p95_seconds as previous_p95,
  ROUND(((cw.p95_seconds - pw.p95_seconds) / pw.p95_seconds * 100)::numeric, 1) as p95_change_pct
FROM current_week cw
JOIN previous_week pw ON cw.stage = pw.stage
ORDER BY cw.avg_seconds DESC;


-- ============================================================================
-- ALERT THRESHOLDS
-- ============================================================================
-- 
-- Set up alerts for:
-- 1. Phase A P95 > 60 seconds (query #9)
-- 2. Phase A Average > 45 seconds (query #9)
-- 3. Error rate > 5% (query #9)
-- 4. TTFU > 5 seconds for any stage (query #8)
-- 5. Week-over-week degradation > 20% (query #10)
--
-- ============================================================================

-- ============================================================================
-- RECOMMENDED MONITORING SCHEDULE
-- ============================================================================
--
-- Daily (automated):
--   - Query #1: Daily latency summary
--   - Query #9: Performance alerts
--
-- Weekly (manual review):
--   - Query #2: All stages summary
--   - Query #5: Error rate analysis
--   - Query #10: Week-over-week comparison
--
-- Monthly (deep dive):
--   - Query #4: Slow drafts analysis
--   - Query #7: Latency by user
--   - Query #8: TTFU analysis
--
-- ============================================================================
