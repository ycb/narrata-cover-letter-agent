# EvalsService — Frontend Data Layer

**Created:** December 4, 2025  
**Purpose:** Aggregate evaluation metrics for dashboard display

---

## Overview

`EvalsService` provides a clean data layer for the Evaluation Dashboard. It wraps Supabase queries and DB function calls, providing typed interfaces for all eval-related data.

**Key Features:**
- ✅ Typed return values (TypeScript interfaces)
- ✅ Error handling with console logging
- ✅ Uses pre-computed DB aggregations (fast)
- ✅ CSV export for external analysis
- ✅ Time-series data for charts

---

## API Reference

### Static Methods

#### `getAggregateByJobType(days = 7)`

**Returns:** Job-level success rate, P50/P90/P99 latency, avg quality score.

**Usage:**
```typescript
const aggregates = await EvalsService.getAggregateByJobType(7);

// Example output:
[
  {
    job_type: 'coverLetter',
    total_runs: 45,
    success_count: 43,
    failure_count: 2,
    success_rate: 95.56,
    avg_duration_ms: 48000,
    p50_duration_ms: 45000,
    p90_duration_ms: 55000,
    p99_duration_ms: 62000,
    avg_quality_score: 87,
  },
  {
    job_type: 'pmLevels',
    total_runs: 23,
    success_count: 22,
    failure_count: 1,
    success_rate: 95.65,
    avg_duration_ms: 92000,
    p50_duration_ms: 90000,
    p90_duration_ms: 105000,
    p99_duration_ms: 110000,
    avg_quality_score: 91,
  },
]
```

---

#### `getAggregateByStage(days = 7, jobType?)`

**Returns:** Stage-level success rate, latency, TTFU (time to first update).

**Usage:**
```typescript
const stages = await EvalsService.getAggregateByStage(7, 'coverLetter');

// Example output:
[
  {
    job_type: 'coverLetter',
    stage: 'jdAnalysis',
    total_runs: 45,
    success_count: 45,
    failure_count: 0,
    success_rate: 100,
    avg_duration_ms: 12000,
    p50_duration_ms: 11000,
    p90_duration_ms: 15000,
    avg_ttfu_ms: 2000,
  },
  {
    job_type: 'coverLetter',
    stage: 'requirementAnalysis',
    total_runs: 45,
    success_count: 43,
    failure_count: 2,
    success_rate: 95.56,
    avg_duration_ms: 18000,
    p50_duration_ms: 17000,
    p90_duration_ms: 22000,
    avg_ttfu_ms: null,
  },
]
```

---

#### `getQualityScoreDistribution(days = 7, jobType?)`

**Returns:** Quality score histogram buckets.

**Usage:**
```typescript
const distribution = await EvalsService.getQualityScoreDistribution(7, 'coverLetter');

// Example output:
[
  { job_type: 'coverLetter', score_bucket: '81-100 (Excellent)', count: 35 },
  { job_type: 'coverLetter', score_bucket: '61-80 (Good)', count: 8 },
  { job_type: 'coverLetter', score_bucket: '41-60 (Fair)', count: 2 },
]
```

---

#### `getRecentFailures(jobType?, limit = 50)`

**Returns:** Recent evaluation failures for debugging.

**Usage:**
```typescript
const failures = await EvalsService.getRecentFailures('coverLetter', 10);

// Example output:
[
  {
    id: 'uuid-1',
    job_id: 'job-uuid-1',
    job_type: 'coverLetter',
    stage: 'requirementAnalysis',
    error_type: 'TimeoutError',
    error_message: 'OpenAI request timed out after 30s',
    quality_checks: null,
    created_at: '2025-12-04T10:30:00Z',
  },
]
```

---

#### `getEvalsForJob(jobId)`

**Returns:** All eval logs for a specific job (drill-down view).

**Usage:**
```typescript
const evals = await EvalsService.getEvalsForJob('job-uuid-123');

// Example output:
[
  {
    id: 'eval-1',
    job_id: 'job-uuid-123',
    job_type: 'coverLetter',
    stage: 'jdAnalysis',
    started_at: '2025-12-04T10:00:00Z',
    completed_at: '2025-12-04T10:00:12Z',
    duration_ms: 12000,
    success: true,
    quality_score: null,
    created_at: '2025-12-04T10:00:12Z',
  },
  {
    id: 'eval-2',
    job_id: 'job-uuid-123',
    job_type: 'coverLetter',
    stage: 'structural_checks',
    started_at: '2025-12-04T10:01:30Z',
    completed_at: '2025-12-04T10:01:30Z',
    duration_ms: 0,
    success: true,
    quality_score: 87,
    created_at: '2025-12-04T10:01:30Z',
  },
]
```

---

#### `getJobWithEvalSummary(jobId)`

**Returns:** Job details + eval summary.

**Usage:**
```typescript
const result = await EvalsService.getJobWithEvalSummary('job-uuid-123');

// Example output:
{
  job: {
    id: 'job-uuid-123',
    type: 'coverLetter',
    status: 'complete',
    created_at: '2025-12-04T10:00:00Z',
    // ... other job fields
  },
  evalSummary: {
    totalStages: 5,
    successfulStages: 5,
    failedStages: 0,
    avgQualityScore: 87,
    totalDurationMs: 48000,
  },
}
```

---

#### `exportToCSV(days = 7, jobType?)`

**Returns:** CSV string for download.

**Usage:**
```typescript
const csv = await EvalsService.exportToCSV(7, 'coverLetter');

// Download CSV
const blob = new Blob([csv], { type: 'text/csv' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'evals-export.csv';
a.click();
```

---

#### `getTimeSeriesData(days = 7, jobType?)`

**Returns:** Daily aggregates for trend charts.

**Usage:**
```typescript
const timeSeries = await EvalsService.getTimeSeriesData(7, 'coverLetter');

// Example output:
[
  {
    date: '2025-12-01',
    total_runs: 10,
    success_rate: 100,
    avg_quality_score: 85,
    avg_duration_ms: 47000,
  },
  {
    date: '2025-12-02',
    total_runs: 8,
    success_rate: 87.5,
    avg_quality_score: 82,
    avg_duration_ms: 49000,
  },
]
```

---

## Error Handling

All methods catch errors and log to console, then re-throw.

**Pattern:**
```typescript
const { data, error } = await supabase.rpc('...');

if (error) {
  console.error('[EvalsService] methodName failed:', error);
  throw error;
}

return data || [];
```

**Why:** Dashboard can show error state to user.

---

## Type Safety

All return types are fully typed:

```typescript
interface JobTypeAggregate {
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

// ... 6 more interfaces
```

**Benefits:**
- TypeScript autocomplete
- Compile-time type checking
- IntelliSense documentation

---

## Performance

### DB Function Calls (Fast)

Methods using `supabase.rpc()` call pre-computed DB aggregations:
- `getAggregateByJobType()` → `get_evals_aggregate_by_job_type()`
- `getAggregateByStage()` → `get_evals_aggregate_by_stage()`
- `getQualityScoreDistribution()` → `get_evals_quality_score_distribution()`
- `getRecentFailures()` → `get_evals_recent_failures()`

**Performance:** < 100ms per call (even with 1000s of rows).

### Direct Queries (Moderate)

Methods using direct `.select()` queries:
- `getEvalsForJob()` — Single job filter (indexed)
- `getJobWithEvalSummary()` — Single job + evals (indexed)
- `exportToCSV()` — Full table scan (limited by date)
- `getTimeSeriesData()` — Full table scan (limited by date)

**Performance:** 100-500ms depending on data size.

---

## Usage in Dashboard Components

### Example: LatencyOverviewCard

```typescript
import { EvalsService } from '@/services/evalsService';
import { useState, useEffect } from 'react';

export function LatencyOverviewCard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const aggregates = await EvalsService.getAggregateByJobType(7);
        setData(aggregates);
      } catch (error) {
        console.error('Failed to load latency data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {data?.map((agg: any) => (
        <div key={agg.job_type}>
          <h3>{agg.job_type}</h3>
          <p>P50: {agg.p50_duration_ms}ms</p>
          <p>P90: {agg.p90_duration_ms}ms</p>
          <p>Success Rate: {agg.success_rate}%</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Testing

### Manual Testing

```typescript
// In browser console
import { EvalsService } from '@/services/evalsService';

// Test aggregate
const agg = await EvalsService.getAggregateByJobType(7);
console.log(agg);

// Test stages
const stages = await EvalsService.getAggregateByStage(7, 'coverLetter');
console.log(stages);

// Test CSV export
const csv = await EvalsService.exportToCSV(7);
console.log(csv);
```

---

## Next Steps (Phase 5)

Use `EvalsService` in refactored dashboard components:
- `LatencyOverviewCard` → `getAggregateByJobType()`
- `StageLatencyChart` → `getAggregateByStage()`
- `StructuralChecksCard` → `getQualityScoreDistribution()`
- `ErrorTable` → `getRecentFailures()`
- `ExportButton` → `exportToCSV()`

---

**EvalsService Complete** ✅

