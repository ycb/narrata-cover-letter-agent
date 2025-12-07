/**
 * Client-side aggregation utilities for evals_log data
 * 
 * Computes the same aggregates as the DB functions, but from raw rows.
 * Used by admin dashboards to avoid creating new Edge Functions.
 */

// Model costs per 1M tokens (Dec 2024)
const MODEL_COSTS = {
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.150, output: 0.600 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
} as const;

interface EvalLogRow {
  id: string;
  job_id: string;
  job_type: string;
  stage: string;
  duration_ms: number | null;
  success: boolean;
  quality_score: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  model: string | null;
  error_type: string | null;
  error_message: string | null;
  created_at: string;
}

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
}

export interface QualityBucket {
  job_type: string;
  score_bucket: string;
  count: number;
}

export interface TokenCostData {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  byModel: {
    model: string;
    tokens: number;
    cost: number;
  }[];
}

export interface RecentFailure {
  id: string;
  job_id: string;
  job_type: string;
  stage: string;
  error_type: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Compute percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = Math.ceil((p / 100) * sortedArray.length) - 1;
  return sortedArray[Math.max(0, index)] || 0;
}

/**
 * Aggregate by job type
 */
export function computeByJobType(rows: EvalLogRow[]): JobTypeAggregate[] {
  const grouped = new Map<string, EvalLogRow[]>();
  
  rows.forEach(row => {
    if (!grouped.has(row.job_type)) {
      grouped.set(row.job_type, []);
    }
    grouped.get(row.job_type)!.push(row);
  });
  
  const aggregates: JobTypeAggregate[] = [];
  
  grouped.forEach((jobRows, jobType) => {
    const successRows = jobRows.filter(r => r.success);
    const durations = jobRows
      .filter(r => r.duration_ms !== null)
      .map(r => r.duration_ms!)
      .sort((a, b) => a - b);
    
    const qualityScores = jobRows
      .filter(r => r.quality_score !== null)
      .map(r => r.quality_score!);
    
    aggregates.push({
      job_type: jobType,
      total_runs: jobRows.length,
      success_count: successRows.length,
      failure_count: jobRows.length - successRows.length,
      success_rate: jobRows.length > 0 ? successRows.length / jobRows.length : 0,
      avg_duration_ms: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      p50_duration_ms: percentile(durations, 50),
      p90_duration_ms: percentile(durations, 90),
      p99_duration_ms: percentile(durations, 99),
      avg_quality_score: qualityScores.length > 0
        ? qualityScores.reduce((sum, s) => sum + s, 0) / qualityScores.length
        : 0,
    });
  });
  
  return aggregates;
}

/**
 * Aggregate by stage
 */
export function computeByStage(rows: EvalLogRow[], filterJobType?: string): StageAggregate[] {
  let filteredRows = rows;
  if (filterJobType && filterJobType !== 'all') {
    filteredRows = rows.filter(r => r.job_type === filterJobType);
  }
  
  const grouped = new Map<string, EvalLogRow[]>();
  
  filteredRows.forEach(row => {
    const key = `${row.job_type}::${row.stage}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(row);
  });
  
  const aggregates: StageAggregate[] = [];
  
  grouped.forEach((stageRows, key) => {
    const [jobType, stage] = key.split('::');
    const successRows = stageRows.filter(r => r.success);
    const durations = stageRows
      .filter(r => r.duration_ms !== null)
      .map(r => r.duration_ms!)
      .sort((a, b) => a - b);
    
    aggregates.push({
      job_type: jobType,
      stage,
      total_runs: stageRows.length,
      success_count: successRows.length,
      failure_count: stageRows.length - successRows.length,
      success_rate: stageRows.length > 0 ? successRows.length / stageRows.length : 0,
      avg_duration_ms: durations.length > 0
        ? durations.reduce((sum, d) => sum + d, 0) / durations.length
        : 0,
      p50_duration_ms: percentile(durations, 50),
      p90_duration_ms: percentile(durations, 90),
    });
  });
  
  return aggregates.sort((a, b) => b.avg_duration_ms - a.avg_duration_ms);
}

/**
 * Compute quality score distribution
 */
export function computeQualityDistribution(rows: EvalLogRow[]): QualityBucket[] {
  const grouped = new Map<string, Map<string, number>>();
  
  rows.forEach(row => {
    if (row.quality_score === null) return;
    
    const bucket =
      row.quality_score >= 0.9 ? 'excellent' :
      row.quality_score >= 0.7 ? 'good' :
      row.quality_score >= 0.5 ? 'fair' :
      'poor';
    
    if (!grouped.has(row.job_type)) {
      grouped.set(row.job_type, new Map());
    }
    
    const jobBuckets = grouped.get(row.job_type)!;
    jobBuckets.set(bucket, (jobBuckets.get(bucket) || 0) + 1);
  });
  
  const buckets: QualityBucket[] = [];
  grouped.forEach((jobBuckets, jobType) => {
    jobBuckets.forEach((count, bucket) => {
      buckets.push({ job_type: jobType, score_bucket: bucket, count });
    });
  });
  
  return buckets;
}

/**
 * Get recent failures
 */
export function getRecentFailures(rows: EvalLogRow[], limit: number = 10): RecentFailure[] {
  return rows
    .filter(r => !r.success)
    .slice(0, limit)
    .map(r => ({
      id: r.id,
      job_id: r.job_id,
      job_type: r.job_type,
      stage: r.stage,
      error_type: r.error_type,
      error_message: r.error_message,
      created_at: r.created_at,
    }));
}

/**
 * Compute token usage and costs
 */
export function computeTokenCost(rows: EvalLogRow[]): TokenCostData {
  const byModel = new Map<string, { tokens: number; promptTokens: number; completionTokens: number }>();
  
  let totalTokens = 0;
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  
  rows.forEach(row => {
    if (!row.total_tokens || !row.model) return;
    
    const tokens = row.total_tokens;
    const promptTokens = row.prompt_tokens || 0;
    const completionTokens = row.completion_tokens || 0;
    
    totalTokens += tokens;
    totalPromptTokens += promptTokens;
    totalCompletionTokens += completionTokens;
    
    if (!byModel.has(row.model)) {
      byModel.set(row.model, { tokens: 0, promptTokens: 0, completionTokens: 0 });
    }
    
    const modelData = byModel.get(row.model)!;
    modelData.tokens += tokens;
    modelData.promptTokens += promptTokens;
    modelData.completionTokens += completionTokens;
  });
  
  // Calculate costs
  let totalCost = 0;
  const modelBreakdown: { model: string; tokens: number; cost: number }[] = [];
  
  byModel.forEach((data, model) => {
    const costs = MODEL_COSTS[model as keyof typeof MODEL_COSTS] || { input: 0, output: 0 };
    const modelCost = 
      (data.promptTokens / 1_000_000) * costs.input +
      (data.completionTokens / 1_000_000) * costs.output;
    
    totalCost += modelCost;
    modelBreakdown.push({ model, tokens: data.tokens, cost: modelCost });
  });
  
  return {
    totalTokens,
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    estimatedCost: totalCost,
    byModel: modelBreakdown.sort((a, b) => b.cost - a.cost),
  };
}

/**
 * Main aggregation function
 */
export function computeAllAggregates(rows: EvalLogRow[], jobTypeFilter?: string) {
  return {
    jobTypeAggregates: computeByJobType(rows),
    stageAggregates: computeByStage(rows, jobTypeFilter),
    qualityBuckets: computeQualityDistribution(rows),
    recentFailures: getRecentFailures(rows),
    tokenCost: computeTokenCost(rows),
  };
}

