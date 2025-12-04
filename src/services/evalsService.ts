/**
 * Evals V1.1: Frontend Service Layer
 * 
 * Aggregates evaluation metrics from jobs and evals_log tables.
 * Provides data layer for EvaluationDashboard components.
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// TYPES
// ============================================================================

export interface JobTypeAggregate {
  job_type: string;
  total_runs: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p90_duration_ms: number;
  p99_duration_ms: number;
  avg_quality_score: number;
}

export interface StageAggregate {
  job_type: string;
  stage: string;
  total_runs: number;
  success_count: number;
  failure_count: number;
  success_rate: number;
  avg_duration_ms: number;
  p50_duration_ms: number;
  p90_duration_ms: number;
  avg_ttfu_ms: number | null;
}

export interface QualityScoreBucket {
  job_type: string;
  score_bucket: string;
  count: number;
}

export interface RecentFailure {
  id: string;
  job_id: string;
  job_type: string;
  stage: string;
  error_type: string | null;
  error_message: string | null;
  quality_checks: any; // JSONB
  created_at: string;
}

export interface EvalLogEntry {
  id: string;
  job_id: string;
  job_type: string;
  stage: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  success: boolean;
  quality_score: number | null;
  created_at: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class EvalsService {
  /**
   * Get aggregated metrics by job type.
   * 
   * Calls DB function `get_evals_aggregate_by_job_type()` which provides:
   * - Success rate
   * - P50/P90/P99 latency
   * - Average quality score
   * 
   * @param days - Number of days to look back (default: 7)
   * @returns Array of job type aggregates
   */
  static async getAggregateByJobType(
    days: number = 7
  ): Promise<JobTypeAggregate[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data, error } = await supabase.rpc('get_evals_aggregate_by_job_type', {
      since_date: sinceDate.toISOString(),
    });

    if (error) {
      console.error('[EvalsService] getAggregateByJobType failed:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get aggregated metrics by stage.
   * 
   * Calls DB function `get_evals_aggregate_by_stage()` which provides:
   * - Stage-level success rate
   * - Stage-level latency (P50/P90)
   * - Time to first update (TTFU) for streaming stages
   * 
   * @param days - Number of days to look back (default: 7)
   * @param jobType - Optional filter by job type (coverLetter, pmLevels)
   * @returns Array of stage aggregates
   */
  static async getAggregateByStage(
    days: number = 7,
    jobType?: string
  ): Promise<StageAggregate[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data, error } = await supabase.rpc('get_evals_aggregate_by_stage', {
      since_date: sinceDate.toISOString(),
      filter_job_type: jobType || null,
    });

    if (error) {
      console.error('[EvalsService] getAggregateByStage failed:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get quality score distribution (histogram buckets).
   * 
   * Calls DB function `get_evals_quality_score_distribution()` which provides:
   * - Score buckets: 0-20, 21-40, 41-60, 61-80, 81-100
   * - Count per bucket
   * 
   * @param days - Number of days to look back (default: 7)
   * @param jobType - Optional filter by job type
   * @returns Array of score buckets with counts
   */
  static async getQualityScoreDistribution(
    days: number = 7,
    jobType?: string
  ): Promise<QualityScoreBucket[]> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const { data, error } = await supabase.rpc('get_evals_quality_score_distribution', {
      since_date: sinceDate.toISOString(),
      filter_job_type: jobType || null,
    });

    if (error) {
      console.error('[EvalsService] getQualityScoreDistribution failed:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get recent failures for debugging.
   * 
   * Calls DB function `get_evals_recent_failures()` which provides:
   * - Most recent failed evaluations
   * - Error type and message
   * - Quality checks (if available)
   * 
   * @param jobType - Optional filter by job type
   * @param limit - Max number of failures to return (default: 50)
   * @returns Array of recent failures
   */
  static async getRecentFailures(
    jobType?: string,
    limit: number = 50
  ): Promise<RecentFailure[]> {
    const { data, error } = await supabase.rpc('get_evals_recent_failures', {
      filter_job_type: jobType || null,
      result_limit: limit,
    });

    if (error) {
      console.error('[EvalsService] getRecentFailures failed:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get all eval logs for a specific job.
   * 
   * Useful for drill-down views in the dashboard.
   * Returns all stages + structural validation for one job.
   * 
   * @param jobId - Job ID to fetch evals for
   * @returns Array of eval log entries for the job
   */
  static async getEvalsForJob(jobId: string): Promise<EvalLogEntry[]> {
    const { data, error } = await supabase
      .from('evals_log')
      .select('id, job_id, job_type, stage, started_at, completed_at, duration_ms, success, quality_score, created_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[EvalsService] getEvalsForJob failed:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get job details with eval summary.
   * 
   * Joins jobs table with evals_log to provide:
   * - Job metadata (type, status, created_at)
   * - Eval summary (total stages, success count, avg quality score)
   * 
   * @param jobId - Job ID to fetch
   * @returns Job details with eval summary
   */
  static async getJobWithEvalSummary(jobId: string): Promise<{
    job: any;
    evalSummary: {
      totalStages: number;
      successfulStages: number;
      failedStages: number;
      avgQualityScore: number | null;
      totalDurationMs: number;
    };
  } | null> {
    // Fetch job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError) {
      console.error('[EvalsService] getJobWithEvalSummary - job fetch failed:', jobError);
      throw jobError;
    }

    // Fetch eval logs
    const { data: evals, error: evalsError } = await supabase
      .from('evals_log')
      .select('success, quality_score, duration_ms')
      .eq('job_id', jobId);

    if (evalsError) {
      console.error('[EvalsService] getJobWithEvalSummary - evals fetch failed:', evalsError);
      // Don't throw - return job without eval summary
      return {
        job,
        evalSummary: {
          totalStages: 0,
          successfulStages: 0,
          failedStages: 0,
          avgQualityScore: null,
          totalDurationMs: 0,
        },
      };
    }

    const totalStages = evals.length;
    const successfulStages = evals.filter(e => e.success).length;
    const failedStages = evals.filter(e => !e.success).length;
    const qualityScores = evals
      .map(e => e.quality_score)
      .filter((score): score is number => score !== null);
    const avgQualityScore = qualityScores.length > 0
      ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
      : null;
    const totalDurationMs = evals
      .map(e => e.duration_ms || 0)
      .reduce((sum, duration) => sum + duration, 0);

    return {
      job,
      evalSummary: {
        totalStages,
        successfulStages,
        failedStages,
        avgQualityScore: avgQualityScore ? Math.round(avgQualityScore) : null,
        totalDurationMs,
      },
    };
  }

  /**
   * Export evals data as CSV.
   * 
   * Fetches raw evals_log data and converts to CSV format.
   * Useful for external analysis in Excel/Sheets.
   * 
   * @param days - Number of days to look back (default: 7)
   * @param jobType - Optional filter by job type
   * @returns CSV string
   */
  static async exportToCSV(
    days: number = 7,
    jobType?: string
  ): Promise<string> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    let query = supabase
      .from('evals_log')
      .select('*')
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: false });

    if (jobType) {
      query = query.eq('job_type', jobType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EvalsService] exportToCSV failed:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return 'No data available for export';
    }

    // CSV header
    const headers = [
      'id',
      'job_id',
      'job_type',
      'stage',
      'started_at',
      'completed_at',
      'duration_ms',
      'success',
      'quality_score',
      'error_type',
      'error_message',
      'created_at',
    ];

    // CSV rows
    const rows = data.map(row => [
      row.id,
      row.job_id,
      row.job_type,
      row.stage,
      row.started_at,
      row.completed_at || '',
      row.duration_ms || '',
      row.success,
      row.quality_score || '',
      row.error_type || '',
      row.error_message || '',
      row.created_at,
    ]);

    // Convert to CSV
    const csvLines = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => {
          // Escape cells containing commas or quotes
          const cellStr = String(cell);
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`;
          }
          return cellStr;
        }).join(',')
      ),
    ];

    return csvLines.join('\n');
  }

  /**
   * Get time-series data for charting.
   * 
   * Groups evals by day and provides daily aggregates.
   * Useful for trend charts in dashboard.
   * 
   * @param days - Number of days to look back (default: 7)
   * @param jobType - Optional filter by job type
   * @returns Array of daily aggregates
   */
  static async getTimeSeriesData(
    days: number = 7,
    jobType?: string
  ): Promise<Array<{
    date: string;
    total_runs: number;
    success_rate: number;
    avg_quality_score: number | null;
    avg_duration_ms: number | null;
  }>> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    let query = supabase
      .from('evals_log')
      .select('created_at, success, quality_score, duration_ms')
      .gte('created_at', sinceDate.toISOString())
      .order('created_at', { ascending: true });

    if (jobType) {
      query = query.eq('job_type', jobType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EvalsService] getTimeSeriesData failed:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by date
    const groupedByDate = data.reduce((acc, row) => {
      const date = row.created_at.split('T')[0]; // YYYY-MM-DD
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(row);
      return acc;
    }, {} as Record<string, typeof data>);

    // Calculate daily aggregates
    return Object.entries(groupedByDate).map(([date, rows]) => {
      const totalRuns = rows.length;
      const successCount = rows.filter(r => r.success).length;
      const successRate = (successCount / totalRuns) * 100;
      const qualityScores = rows
        .map(r => r.quality_score)
        .filter((score): score is number => score !== null);
      const avgQualityScore = qualityScores.length > 0
        ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length
        : null;
      const durations = rows
        .map(r => r.duration_ms)
        .filter((d): d is number => d !== null);
      const avgDurationMs = durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : null;

      return {
        date,
        total_runs: totalRuns,
        success_rate: Math.round(successRate * 100) / 100,
        avg_quality_score: avgQualityScore ? Math.round(avgQualityScore) : null,
        avg_duration_ms: avgDurationMs ? Math.round(avgDurationMs) : null,
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }
}

