# EVALS V1.1 — IMPLEMENTATION SPECIFICATION

**Version:** 1.1  
**Date:** December 4, 2025  
**Status:** Ready for Implementation  
**Dependencies:** Audit complete, JOB_STAGES_REFERENCE.md, existing job infrastructure

---

## OVERVIEW

This document provides the complete implementation specification for Narrata's Evals V1.1 system, incorporating findings from the comprehensive audit and delta feedback.

**Scope:**
- ✅ Create `evals_log` table for pipeline evaluation tracking
- ✅ Build deterministic structural validators for `coverLetter` and `pmLevels`
- ✅ Implement `logEval` helper with best-effort, non-blocking semantics
- ✅ Instrument existing pipelines (cover letter, PM levels)
- ✅ Refactor `EvaluationDashboard.tsx` to use new data layer
- ❌ NO onboarding instrumentation (pipeline incomplete)
- ❌ NO LLM-as-judge semantic evals (future: Evals 1.2+)

---

## 1. DATABASE SCHEMA

### A. `evals_log` Table

**Migration:** `supabase/migrations/029_create_evals_log.sql`

```sql
-- Evals V1.1: Pipeline evaluation tracking
-- Migration: 029_create_evals_log.sql
-- Date: 2025-12-04

CREATE TABLE IF NOT EXISTS public.evals_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Job Context
  job_id UUID NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('coverLetter', 'pmLevels', 'onboarding')),
  stage TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  environment TEXT CHECK (environment IN ('dev', 'staging', 'prod')),
  
  -- Timing Metrics
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  ttfu_ms INTEGER, -- time to first update (for streaming stages)
  
  -- Reliability Metrics
  success BOOLEAN NOT NULL,
  error_type TEXT,
  error_message TEXT,
  
  -- Quality Metrics
  quality_checks JSONB, -- StructuralEvalResult
  quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
  
  -- Optional Semantic Checks (Future: Evals 1.2+)
  semantic_checks JSONB,
  
  -- Result Snapshot (safe subset)
  result_subset JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for dashboard queries
CREATE INDEX idx_evals_log_job_id ON public.evals_log(job_id);
CREATE INDEX idx_evals_log_created_at ON public.evals_log(created_at DESC);
CREATE INDEX idx_evals_log_job_type ON public.evals_log(job_type);
CREATE INDEX idx_evals_log_stage ON public.evals_log(stage);
CREATE INDEX idx_evals_log_success ON public.evals_log(success);
CREATE INDEX idx_evals_log_environment ON public.evals_log(environment) WHERE environment IS NOT NULL;

-- Composite index for dashboard aggregations
CREATE INDEX idx_evals_log_job_type_stage_env 
  ON public.evals_log(job_type, stage, environment, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.evals_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own eval logs"
  ON public.evals_log
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert eval logs"
  ON public.evals_log
  FOR INSERT
  WITH CHECK (true); -- Edge functions run as service role

-- Comments for documentation
COMMENT ON TABLE public.evals_log IS 'Pipeline evaluation tracking for cover letter, PM levels, and onboarding jobs';
COMMENT ON COLUMN public.evals_log.job_id IS 'Reference to jobs.id';
COMMENT ON COLUMN public.evals_log.stage IS 'Pipeline stage name (must match JOB_STAGES_REFERENCE.md)';
COMMENT ON COLUMN public.evals_log.quality_checks IS 'StructuralEvalResult: { passed: boolean, checks: EvalCheck[] }';
COMMENT ON COLUMN public.evals_log.quality_score IS 'Aggregated quality score (0-100), derived from quality_checks';
COMMENT ON COLUMN public.evals_log.semantic_checks IS 'Optional LLM-as-judge output (Evals 1.2+)';
COMMENT ON COLUMN public.evals_log.result_subset IS 'Safe subset of stage result (for debugging, no PII)';
COMMENT ON COLUMN public.evals_log.ttfu_ms IS 'Time to first update (ms) for streaming stages';
```

---

## 2. TYPE DEFINITIONS

### A. Structural Validator Types

**File:** `/supabase/functions/_shared/evals/types.ts`

```typescript
/**
 * Individual structural check result
 * Designed for UI-friendly display in dashboard
 */
export interface EvalCheck {
  /** Human-readable check name */
  name: string;
  
  /** Did this check pass? */
  passed: boolean;
  
  /** Severity level for prioritization */
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  /** Expected value (optional, for debugging) */
  expected?: string;
  
  /** Actual value (optional, for debugging) */
  actual?: string;
}

/**
 * Complete structural evaluation result
 * Passed = true ONLY if all critical checks pass
 */
export interface StructuralEvalResult {
  /** Overall pass/fail (true only if all critical checks pass) */
  passed: boolean;
  
  /** Individual check results */
  checks: EvalCheck[];
}

/**
 * Payload for logEval function
 */
export interface LogEvalPayload {
  job_id: string;
  job_type: 'coverLetter' | 'pmLevels' | 'onboarding';
  stage: string;
  user_id: string;
  environment?: 'dev' | 'staging' | 'prod';
  
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
  ttfu_ms?: number;
  
  success: boolean;
  error_type?: string;
  error_message?: string;
  
  quality_checks?: StructuralEvalResult;
  quality_score?: number; // 0-100
  
  semantic_checks?: Record<string, unknown>; // Future: Evals 1.2+
  result_subset?: Record<string, unknown>;
}
```

---

## 3. STRUCTURAL VALIDATORS

### A. Cover Letter Validator

**File:** `/supabase/functions/_shared/evals/validators.ts`

```typescript
import type { EvalCheck, StructuralEvalResult } from './types.ts';
import type { CoverLetterJobResult } from '../pipeline-utils.ts';

/**
 * Validate cover letter job result structure
 * 
 * Critical checks (must all pass):
 * - JD title/level inferred
 * - Core requirements extracted
 * - Requirement analysis completed
 * - MWS score valid
 * 
 * High checks (should pass):
 * - Company context available
 * - Section gaps identified
 * 
 * Medium checks (nice to have):
 * - Preferred requirements analyzed
 * - Goal alignment computed
 */
export function validateCoverLetterResult(
  result: CoverLetterJobResult
): StructuralEvalResult {
  const checks: EvalCheck[] = [];

  // CRITICAL: Role insights present
  checks.push({
    name: 'Role Insights Present',
    passed: !!result.roleInsights?.inferredRoleLevel,
    severity: 'critical',
    expected: 'Non-null inferredRoleLevel',
    actual: result.roleInsights?.inferredRoleLevel || 'null',
  });

  // CRITICAL: Core requirements extracted
  checks.push({
    name: 'Core Requirements Extracted',
    passed: (result.jdRequirementSummary?.coreTotal ?? 0) >= 1,
    severity: 'critical',
    expected: '>= 1 core requirement',
    actual: String(result.jdRequirementSummary?.coreTotal ?? 0),
  });

  // CRITICAL: Requirement analysis completed
  const coreReqsCount = result.requirements?.coreRequirements?.length ?? 0;
  checks.push({
    name: 'Requirement Analysis Completed',
    passed: coreReqsCount >= 1,
    severity: 'critical',
    expected: '>= 1 analyzed requirement',
    actual: String(coreReqsCount),
  });

  // CRITICAL: MWS score valid
  const mwsScore = result.mws?.summaryScore;
  const validMwsScore = mwsScore !== undefined && [0, 1, 2, 3].includes(mwsScore);
  checks.push({
    name: 'MWS Score Valid',
    passed: validMwsScore,
    severity: 'critical',
    expected: 'Score in [0, 1, 2, 3]',
    actual: String(mwsScore ?? 'null'),
  });

  // HIGH: Company context available
  checks.push({
    name: 'Company Context Available',
    passed: !!result.companyContext?.industry,
    severity: 'high',
    expected: 'Non-empty industry',
    actual: result.companyContext?.industry || 'null',
  });

  // HIGH: Section gaps identified
  checks.push({
    name: 'Section Gaps Identified',
    passed: (result.gapCount ?? 0) >= 0,
    severity: 'high',
    expected: 'Gap count computed',
    actual: String(result.gapCount ?? 'null'),
  });

  // MEDIUM: Total requirements count
  checks.push({
    name: 'Total Requirements Count',
    passed: (result.requirements?.totalRequirements ?? 0) >= 3,
    severity: 'medium',
    expected: '>= 3 total requirements',
    actual: String(result.requirements?.totalRequirements ?? 0),
  });

  // MEDIUM: Goal alignment computed
  checks.push({
    name: 'Goal Alignment Computed',
    passed: result.roleInsights?.goalAlignment !== undefined,
    severity: 'medium',
    expected: 'Non-null goalAlignment',
    actual: result.roleInsights?.goalAlignment ? 'present' : 'null',
  });

  // Determine overall pass/fail (all critical checks must pass)
  const criticalChecks = checks.filter(c => c.severity === 'critical');
  const passed = criticalChecks.every(c => c.passed);

  return {
    passed,
    checks,
  };
}
```

### B. PM Levels Validator

```typescript
import type { PMLevelsJobResult } from '../pipeline-utils.ts';

/**
 * Validate PM levels job result structure
 * 
 * Critical checks (must all pass):
 * - IC level in valid range [3-9]
 * - All 4 competencies present
 * - Competency values in range [0-10]
 * 
 * High checks (should pass):
 * - Assessment ID generated
 * 
 * Medium checks (nice to have):
 * - Specializations array present (may be empty)
 */
export function validatePMLevelsResult(
  result: PMLevelsJobResult
): StructuralEvalResult {
  const checks: EvalCheck[] = [];

  // CRITICAL: IC level in valid range
  const icLevel = result.icLevel;
  const validIcLevel = icLevel !== undefined && icLevel >= 3 && icLevel <= 9;
  checks.push({
    name: 'IC Level Valid',
    passed: validIcLevel,
    severity: 'critical',
    expected: 'IC level in [3-9]',
    actual: String(icLevel ?? 'null'),
  });

  // CRITICAL: All 4 competencies present
  const competencies = result.competencies || {};
  const requiredCompetencies = ['execution', 'strategy', 'customerInsight', 'influence'];
  const hasAllCompetencies = requiredCompetencies.every(key => key in competencies);
  checks.push({
    name: 'All Competencies Present',
    passed: hasAllCompetencies,
    severity: 'critical',
    expected: '4 competencies (execution, strategy, customerInsight, influence)',
    actual: Object.keys(competencies).join(', ') || 'none',
  });

  // CRITICAL: Competency values in valid range [0-10]
  const competencyValues = Object.values(competencies);
  const validCompetencyValues = competencyValues.every(
    (val: any) => typeof val === 'number' && val >= 0 && val <= 10
  );
  checks.push({
    name: 'Competency Values Valid',
    passed: validCompetencyValues,
    severity: 'critical',
    expected: 'All values in [0-10]',
    actual: competencyValues.join(', ') || 'none',
  });

  // HIGH: Assessment ID generated
  checks.push({
    name: 'Assessment ID Generated',
    passed: !!result.assessmentId,
    severity: 'high',
    expected: 'Non-empty assessmentId',
    actual: result.assessmentId || 'null',
  });

  // MEDIUM: Specializations array present (may be empty)
  checks.push({
    name: 'Specializations Array Present',
    passed: Array.isArray(result.specializations),
    severity: 'medium',
    expected: 'Array (may be empty)',
    actual: Array.isArray(result.specializations)
      ? `[${result.specializations.length} items]`
      : 'null',
  });

  // Determine overall pass/fail
  const criticalChecks = checks.filter(c => c.severity === 'critical');
  const passed = criticalChecks.every(c => c.passed);

  return {
    passed,
    checks,
  };
}

/**
 * Calculate quality score from structural eval result
 * Score = (passed checks / total checks) * 100
 * Weighted by severity: critical = 3x, high = 2x, medium = 1x
 */
export function calculateQualityScore(result: StructuralEvalResult): number {
  let totalWeight = 0;
  let passedWeight = 0;

  const weights = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0.5,
  };

  for (const check of result.checks) {
    const weight = weights[check.severity];
    totalWeight += weight;
    if (check.passed) {
      passedWeight += weight;
    }
  }

  if (totalWeight === 0) return 0;
  return Math.round((passedWeight / totalWeight) * 100);
}
```

---

## 4. logEval HELPER

**File:** `/supabase/functions/_shared/evals/log.ts`

```typescript
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import type { LogEvalPayload } from './types.ts';

/**
 * Log pipeline evaluation event to evals_log table
 * 
 * BEHAVIOR:
 * - Non-blocking with best-effort semantics
 * - Wraps DB insert in try/catch
 * - Does NOT throw inside pipelines
 * - Logs failures via elog utility
 * - Async pattern: void logEval(...).catch(...)
 * 
 * USAGE:
 * - Stage start: logEval({ stage: 'jdAnalysis', started_at, success: true })
 * - Stage end: logEval({ stage: 'jdAnalysis', completed_at, duration_ms, success: true })
 * - Structural checks: logEval({ stage: 'structural_checks', quality_checks, quality_score })
 */
export async function logEval(
  supabase: SupabaseClient,
  payload: LogEvalPayload
): Promise<void> {
  try {
    const { data, error } = await supabase.from('evals_log').insert({
      job_id: payload.job_id,
      job_type: payload.job_type,
      stage: payload.stage,
      user_id: payload.user_id,
      environment: payload.environment || getEnvironment(),
      
      started_at: payload.started_at.toISOString(),
      completed_at: payload.completed_at?.toISOString(),
      duration_ms: payload.duration_ms,
      ttfu_ms: payload.ttfu_ms,
      
      success: payload.success,
      error_type: payload.error_type,
      error_message: payload.error_message,
      
      quality_checks: payload.quality_checks,
      quality_score: payload.quality_score,
      
      semantic_checks: payload.semantic_checks,
      result_subset: payload.result_subset,
    });

    if (error) {
      // Best-effort: log error but don't throw
      try {
        const { elog } = await import('../log.ts');
        elog.error('[logEval] Failed to insert eval log', {
          error: error.message,
          jobId: payload.job_id,
          stage: payload.stage,
        });
      } catch (_) {
        console.error('[logEval] Failed to insert eval log:', error);
      }
    }
  } catch (err) {
    // Best-effort: catch all errors
    try {
      const { elog } = await import('../log.ts');
      elog.error('[logEval] Unexpected error', {
        error: err instanceof Error ? err.message : String(err),
        jobId: payload.job_id,
        stage: payload.stage,
      });
    } catch (_) {
      console.error('[logEval] Unexpected error:', err);
    }
  }
}

/**
 * Helper: void pattern for non-blocking calls
 * 
 * Usage:
 * voidLogEval(supabase, { ... });
 */
export function voidLogEval(
  supabase: SupabaseClient,
  payload: LogEvalPayload
): void {
  void logEval(supabase, payload).catch(err => {
    try {
      const { elog } = import('../log.ts').then(mod => {
        mod.elog.error('[voidLogEval] Async error', {
          error: err instanceof Error ? err.message : String(err),
          jobId: payload.job_id,
          stage: payload.stage,
        });
      });
    } catch (_) {
      console.error('[voidLogEval] Async error:', err);
    }
  });
}

/**
 * Detect environment (dev/staging/prod)
 */
function getEnvironment(): 'dev' | 'staging' | 'prod' {
  const env = Deno.env.get('ENVIRONMENT') || Deno.env.get('DENO_ENV') || 'dev';
  if (env === 'production' || env === 'prod') return 'prod';
  if (env === 'staging') return 'staging';
  return 'dev';
}
```

---

## 5. PIPELINE INSTRUMENTATION

### A. Cover Letter Pipeline Integration

**File:** `/supabase/functions/_shared/pipelines/cover-letter.ts`

**Changes:**

```typescript
import { validateCoverLetterResult, calculateQualityScore } from '../evals/validators.ts';
import { voidLogEval } from '../evals/log.ts';

export async function executeCoverLetterPipeline(
  job: any,
  supabase: any,
  send: (event: string, data: any) => void
) {
  const telemetry = new PipelineTelemetry(job.id, job.type);
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const context: PipelineContext = {
    job,
    supabase,
    send,
    openaiApiKey,
    telemetry,
  };

  try {
    const results: Record<string, any> = {};

    // LAYER 1: JD Analysis
    const jdStart = Date.now();
    try {
      telemetry?.startStage('jdAnalysis');
      results.jdAnalysis = await jdAnalysisStage.execute(context);
      telemetry?.endStage(true);
      
      // Log stage completion
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'coverLetter',
        stage: 'jdAnalysis',
        user_id: job.user_id,
        started_at: new Date(jdStart),
        completed_at: new Date(),
        duration_ms: Date.now() - jdStart,
        success: true,
        result_subset: {
          hasRoleInsights: !!results.jdAnalysis?.data?.roleInsights,
          hasRequirementSummary: !!results.jdAnalysis?.data?.jdRequirementSummary,
        },
      });
    } catch (error) {
      telemetry?.endStage(false);
      results.jdAnalysis = { status: 'failed', error: error.message };
      
      // Log stage failure
      voidLogEval(supabase, {
        job_id: job.id,
        job_type: 'coverLetter',
        stage: 'jdAnalysis',
        user_id: job.user_id,
        started_at: new Date(jdStart),
        completed_at: new Date(),
        duration_ms: Date.now() - jdStart,
        success: false,
        error_type: error.name || 'UnknownError',
        error_message: error.message,
      });
    }

    // LAYER 2: Parallel execution (similar pattern for other stages)
    // ... existing parallel execution code ...

    // STRUCTURAL VALIDATION (after all stages complete, before telemetry.complete)
    const finalResult = {
      metrics: [...],
      gapCount: results.sectionGaps?.totalGaps || 0,
      requirements: results.requirementAnalysis || null,
      sectionGaps: results.sectionGaps || null,
      roleInsights: results.jdAnalysis?.data?.roleInsights || null,
      jdRequirementSummary: results.jdAnalysis?.data?.jdRequirementSummary || null,
      goalsAndStrengths: results.goalsAndStrengths || null,
      mws: results.goalsAndStrengths?.data?.mws || null,
      companyContext: results.goalsAndStrengths?.data?.companyContext || null,
    };

    // Run structural validation
    const structuralResult = validateCoverLetterResult(finalResult);
    const qualityScore = calculateQualityScore(structuralResult);

    // Log structural checks
    voidLogEval(supabase, {
      job_id: job.id,
      job_type: 'coverLetter',
      stage: 'structural_checks',
      user_id: job.user_id,
      started_at: new Date(),
      completed_at: new Date(),
      success: structuralResult.passed,
      quality_checks: structuralResult,
      quality_score: qualityScore,
    });

    // Save final result to job
    await supabase
      .from('jobs')
      .update({
        status: 'complete',
        result: finalResult,
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id);

    // Mark telemetry as complete
    telemetry.complete(true);

    return finalResult;
  } catch (error) {
    telemetry.complete(false, error.message);
    throw error;
  }
}
```

**Pattern for all stages:**
1. Record `startTime = Date.now()`
2. Execute stage logic
3. On success: `voidLogEval({ started_at, completed_at, duration_ms, success: true })`
4. On failure: `voidLogEval({ started_at, completed_at, success: false, error_type, error_message })`

---

### B. PM Levels Pipeline Integration

**Similar pattern as cover letter, using `validatePMLevelsResult`**

---

## 6. DASHBOARD REFACTOR

### A. Service Layer

**File:** `/src/services/evalsService.ts`

```typescript
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/supabase';

type EvalLogRow = Database['public']['Tables']['evals_log']['Row'];

export interface EvalsAggregateByJobType {
  job_type: 'coverLetter' | 'pmLevels' | 'onboarding';
  total_runs: number;
  success_count: number;
  failure_count: number;
  success_rate: number; // 0-100
  avg_duration_ms: number;
  p50_duration_ms: number;
  p90_duration_ms: number;
  p99_duration_ms: number;
  avg_quality_score: number; // 0-100
}

export interface EvalsAggregateByStage {
  job_type: string;
  stage: string;
  total_runs: number;
  success_count: number;
  avg_duration_ms: number;
  p90_duration_ms: number;
}

export interface EvalsRecentFailure {
  id: string;
  job_id: string;
  job_type: string;
  stage: string;
  error_type: string;
  error_message: string;
  quality_checks: any;
  created_at: string;
}

/**
 * Evals Service — Data layer for evaluation dashboard
 * 
 * All queries join jobs + evals_log tables
 * Provides aggregate views by job_type, stage, environment
 */
export class EvalsService {
  /**
   * Get aggregate metrics by job type (last 7 days)
   */
  static async getAggregateByJobType(
    days: number = 7
  ): Promise<EvalsAggregateByJobType[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase.rpc('get_evals_aggregate_by_job_type', {
      since_date: since.toISOString(),
    });

    if (error) {
      console.error('[EvalsService] Failed to fetch aggregate by job type:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get aggregate metrics by stage (last 7 days)
   */
  static async getAggregateByStage(
    jobType?: string,
    days: number = 7
  ): Promise<EvalsAggregateByStage[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase.rpc('get_evals_aggregate_by_stage', {
      since_date: since.toISOString(),
      filter_job_type: jobType || null,
    });

    if (error) {
      console.error('[EvalsService] Failed to fetch aggregate by stage:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get recent failures (last 50)
   */
  static async getRecentFailures(
    jobType?: string,
    limit: number = 50
  ): Promise<EvalsRecentFailure[]> {
    let query = supabase
      .from('evals_log')
      .select('id, job_id, job_type, stage, error_type, error_message, quality_checks, created_at')
      .eq('success', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (jobType) {
      query = query.eq('job_type', jobType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EvalsService] Failed to fetch recent failures:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get detailed eval logs for a specific job
   */
  static async getEvalsForJob(jobId: string): Promise<EvalLogRow[]> {
    const { data, error } = await supabase
      .from('evals_log')
      .select('*')
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[EvalsService] Failed to fetch evals for job:', error);
      return [];
    }

    return data || [];
  }
}
```

---

### B. Database Functions (for aggregations)

**File:** `supabase/migrations/030_add_evals_aggregate_functions.sql`

```sql
-- Aggregate evals by job type
CREATE OR REPLACE FUNCTION get_evals_aggregate_by_job_type(since_date TIMESTAMPTZ)
RETURNS TABLE (
  job_type TEXT,
  total_runs BIGINT,
  success_count BIGINT,
  failure_count BIGINT,
  success_rate NUMERIC,
  avg_duration_ms NUMERIC,
  p50_duration_ms NUMERIC,
  p90_duration_ms NUMERIC,
  p99_duration_ms NUMERIC,
  avg_quality_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.job_type,
    COUNT(DISTINCT el.job_id) AS total_runs,
    COUNT(DISTINCT el.job_id) FILTER (WHERE el.success = true) AS success_count,
    COUNT(DISTINCT el.job_id) FILTER (WHERE el.success = false) AS failure_count,
    ROUND((COUNT(DISTINCT el.job_id) FILTER (WHERE el.success = true)::NUMERIC / 
           NULLIF(COUNT(DISTINCT el.job_id), 0)) * 100, 2) AS success_rate,
    ROUND(AVG(el.duration_ms)) AS avg_duration_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY el.duration_ms) AS p50_duration_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY el.duration_ms) AS p90_duration_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY el.duration_ms) AS p99_duration_ms,
    ROUND(AVG(el.quality_score)) AS avg_quality_score
  FROM evals_log el
  WHERE el.created_at >= since_date
    AND el.completed_at IS NOT NULL
  GROUP BY el.job_type;
END;
$$ LANGUAGE plpgsql;

-- Aggregate evals by stage
CREATE OR REPLACE FUNCTION get_evals_aggregate_by_stage(
  since_date TIMESTAMPTZ,
  filter_job_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  job_type TEXT,
  stage TEXT,
  total_runs BIGINT,
  success_count BIGINT,
  avg_duration_ms NUMERIC,
  p90_duration_ms NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    el.job_type,
    el.stage,
    COUNT(*) AS total_runs,
    COUNT(*) FILTER (WHERE el.success = true) AS success_count,
    ROUND(AVG(el.duration_ms)) AS avg_duration_ms,
    PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY el.duration_ms) AS p90_duration_ms
  FROM evals_log el
  WHERE el.created_at >= since_date
    AND el.completed_at IS NOT NULL
    AND (filter_job_type IS NULL OR el.job_type = filter_job_type)
  GROUP BY el.job_type, el.stage;
END;
$$ LANGUAGE plpgsql;
```

---

### C. Dashboard Component Structure

**Refactored structure:**

```
/src/components/evaluation/
├── EvaluationDashboard.tsx         (Root, filters, layout)
├── JobTypeFilter.tsx               (Job type selector)
├── LatencyOverviewCard.tsx         (P50/P90/P99 metrics)
├── StageLatencyChart.tsx           (Recharts bar chart)
├── StructuralChecksCard.tsx        (Quality checks table)
├── ErrorTable.tsx                  (Recent failures)
├── ExportButton.tsx                (CSV export)
└── hooks/
    └── useEvalsData.ts             (Data fetching hook)
```

**Example: LatencyOverviewCard.tsx**

```typescript
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import type { EvalsAggregateByJobType } from '@/services/evalsService';

interface Props {
  data: EvalsAggregateByJobType[];
  loading: boolean;
}

export const LatencyOverviewCard: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return <Card><CardContent>Loading...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Latency Overview (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map(row => (
            <div key={row.job_type} className="border-b pb-2">
              <h4 className="font-semibold">{row.job_type}</h4>
              <div className="grid grid-cols-4 gap-2 text-sm mt-1">
                <div>
                  <span className="text-muted-foreground">P50:</span>{' '}
                  {Math.round(row.p50_duration_ms)}ms
                </div>
                <div>
                  <span className="text-muted-foreground">P90:</span>{' '}
                  {Math.round(row.p90_duration_ms)}ms
                </div>
                <div>
                  <span className="text-muted-foreground">P99:</span>{' '}
                  {Math.round(row.p99_duration_ms)}ms
                </div>
                <div>
                  <span className="text-muted-foreground">Success:</span>{' '}
                  {row.success_rate.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## 7. IMPLEMENTATION CHECKLIST

### Phase 1: Database & Types ✅

- [ ] Create `029_create_evals_log.sql` migration
- [ ] Create `030_add_evals_aggregate_functions.sql` migration
- [ ] Run migrations on dev environment
- [ ] Create `/supabase/functions/_shared/evals/types.ts`
- [ ] Update `/src/types/supabase.ts` (regenerate from schema)

### Phase 2: Validators & Logger ✅

- [ ] Create `/supabase/functions/_shared/evals/validators.ts`
  - [ ] `validateCoverLetterResult()`
  - [ ] `validatePMLevelsResult()`
  - [ ] `calculateQualityScore()`
- [ ] Create `/supabase/functions/_shared/evals/log.ts`
  - [ ] `logEval()`
  - [ ] `voidLogEval()`
  - [ ] `getEnvironment()`

### Phase 3: Pipeline Instrumentation ✅

- [ ] Update `/supabase/functions/_shared/pipelines/cover-letter.ts`
  - [ ] Import validators and logger
  - [ ] Add stage start/end logging
  - [ ] Add structural validation after result assembly
  - [ ] Test with dev job
- [ ] Update `/supabase/functions/_shared/pipelines/pm-levels.ts`
  - [ ] Same pattern as cover letter
  - [ ] Test with dev job

### Phase 4: Service Layer ✅

- [ ] Create `/src/services/evalsService.ts`
  - [ ] `getAggregateByJobType()`
  - [ ] `getAggregateByStage()`
  - [ ] `getRecentFailures()`
  - [ ] `getEvalsForJob()`
- [ ] Test service methods in dev console

### Phase 5: Dashboard Refactor ✅

- [ ] Create `/src/components/evaluation/hooks/useEvalsData.ts`
- [ ] Create modular dashboard components:
  - [ ] `JobTypeFilter.tsx`
  - [ ] `LatencyOverviewCard.tsx`
  - [ ] `StageLatencyChart.tsx`
  - [ ] `StructuralChecksCard.tsx`
  - [ ] `ErrorTable.tsx`
  - [ ] `ExportButton.tsx`
- [ ] Refactor `EvaluationDashboard.tsx` to use new components
- [ ] Test in dev environment

### Phase 6: Testing & Validation ✅

- [ ] Run synthetic cover letter jobs
- [ ] Run synthetic PM levels jobs
- [ ] Verify `evals_log` rows created
- [ ] Verify structural checks populate
- [ ] Verify dashboard renders correctly
- [ ] Export CSV and verify data

---

## 8. NON-GOALS (EXPLICIT GUARDRAILS)

### DO NOT:

- ❌ Add LLM-based semantic evals (Evals 1.2+ concern)
- ❌ Extend `evaluation_runs` table to mirror `evals_log`
- ❌ Add additional job types or stages
- ❌ Instrument onboarding pipeline (incomplete)
- ❌ Modify `jobs` table schema
- ❌ Rewrite `useJobStream` hook
- ❌ Change job type or stage names
- ❌ Delete existing `EvaluationDashboard.tsx` before migration complete

### FUTURE (Evals 1.2+):

- Semantic checks (LLM-as-judge)
- Cross-job correlation analysis
- Alerting on quality score drops
- Historical trending beyond 7 days
- A/B test result tracking

---

## 9. ROLLOUT PLAN

### Dev Environment

1. Run migrations
2. Deploy instrumented pipelines
3. Run 5-10 synthetic jobs
4. Verify `evals_log` populates correctly
5. Launch dashboard, verify charts/tables

### Staging Environment

1. Run migrations
2. Deploy instrumented pipelines
3. Monitor real user jobs (7 days)
4. Validate quality scores
5. Fix any bugs before prod

### Production Environment

1. Run migrations during low-traffic window
2. Deploy instrumented pipelines
3. Monitor for 24 hours
4. Enable dashboard for internal team
5. Iterate based on feedback

---

## 10. SUCCESS CRITERIA

### Functional Requirements ✅

- [ ] `evals_log` table created and indexed
- [ ] Structural validators return `StructuralEvalResult`
- [ ] `logEval` helper logs to DB without blocking pipelines
- [ ] Cover letter + PM levels pipelines instrumented
- [ ] Dashboard shows:
  - [ ] Latency (P50/P90/P99) by job type
  - [ ] Success rate by job type
  - [ ] Stage-level latency breakdown
  - [ ] Recent failures with error details
  - [ ] Quality score distribution

### Non-Functional Requirements ✅

- [ ] Eval logging adds < 50ms overhead per stage
- [ ] Dashboard loads in < 2s for 7-day view
- [ ] No pipeline failures caused by eval logging
- [ ] CSV export works for all views

---

## APPENDIX: STAGE NAME REFERENCE

**Source:** `/docs/architecture/JOB_STAGES_REFERENCE.md`

### Cover Letter Stages

- `jdAnalysis`
- `requirementAnalysis`
- `goalsAndStrengths`
- `sectionGaps`
- `structural_checks` (added for evals)

### PM Levels Stages

- `baselineAssessment`
- `competencyBreakdown`
- `specializationAssessment`
- `structural_checks` (added for evals)

**Critical:** Stage names in `logEval()` calls MUST exactly match these identifiers.

---

**Document Version:** 1.1  
**Last Updated:** December 4, 2025  
**Status:** Ready for Implementation  
**Next Review:** After Evals V1.1 deployment to staging

---

**END OF SPECIFICATION**

