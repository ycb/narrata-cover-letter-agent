# Stage Naming Standardization Fix

## Problem

Inconsistent stage names in `evals_log` table cause analytics confusion:

### 1. Inconsistent goalsAndStrengths Logging
**Current behavior:**
- `goalsAndStrengths_mws` (1 run) - MWS sub-call
- `goalsAndStrengths_company_context` (1 run) - Company context sub-call  
- `goalsAndStrengths` (N runs) - Overall stage

**Issue:** Aggregations by stage show incomplete data. User can't trust phase breakdowns.

### 2. Partial Logging / Mixed Pipelines
**Symptoms:**
- `requirementAnalysis` (76 runs) vs `sectionGaps` (77 runs) vs `jd_analysis` (139 runs)
- Mismatch suggests:
  - Some jobs failed before completing all stages
  - Inconsistent naming (`jd_analysis` vs `jdAnalysis`)
  - Missing start/completion logging pairs

---

## Solution: Hierarchical Stage Names with Consistent Logging

### Canonical Stage Name Convention

```
<primary_stage>[.<sub_stage>]
```

**Examples:**
- `jdAnalysis` (primary)
- `requirementAnalysis` (primary)
- `goalsAndStrengths` (primary)
- `goalsAndStrengths.mws` (sub-stage for token tracking)
- `goalsAndStrengths.company_context` (sub-stage for token tracking)
- `sectionGaps` (primary)

### Key Rules

1. **Primary stages:** Use camelCase, singular
2. **Sub-stages:** Use dot notation (`.`) not underscore
3. **ALWAYS log both:**
   - Start event (`started_at` only, `success: true` placeholder)
   - Completion event (`started_at` + `completed_at` + `success` boolean)
4. **Normalize snake_case:** Replace all `_` with camelCase in stage names

---

## Implementation Changes

### Phase 1: Normalize Existing Stage Names

| Current | Normalized | Reason |
|---------|-----------|--------|
| `goalsAndStrengths_mws` | `goalsAndStrengths.mws` | Hierarchical clarity |
| `goalsAndStrengths_company_context` | `goalsAndStrengths.companyContext` | Hierarchical + camelCase |
| `jd_analysis` | `jdAnalysis` | camelCase consistency |
| `company_tags_extraction` | `companyTags` | Shorter, camelCase |
| `structural_checks` | `structuralChecks` | camelCase |

### Phase 2: Add Start Event Logging

**Pattern:**
```typescript
// BEFORE stage execution
const stageStart = Date.now();
voidLogEval(supabase, {
  job_id: job.id,
  job_type: 'coverLetter',
  stage: 'jdAnalysis', // Canonical name
  user_id: job.user_id,
  started_at: new Date(stageStart),
  success: true, // Placeholder (stage hasn't failed yet)
});

try {
  // ... stage execution ...
  
  // AFTER stage execution (success)
  voidLogEval(supabase, {
    job_id: job.id,
    job_type: 'coverLetter',
    stage: 'jdAnalysis',
    user_id: job.user_id,
    started_at: new Date(stageStart),
    completed_at: new Date(),
    duration_ms: Date.now() - stageStart,
    success: true,
    // ... metrics ...
  });
} catch (error) {
  // AFTER stage execution (failure)
  voidLogEval(supabase, {
    job_id: job.id,
    job_type: 'coverLetter',
    stage: 'jdAnalysis',
    user_id: job.user_id,
    started_at: new Date(stageStart),
    completed_at: new Date(),
    duration_ms: Date.now() - stageStart,
    success: false,
    error_type: error.constructor.name,
    error_message: error.message,
  });
  throw error;
}
```

### Phase 3: Update Dashboard Queries

**Before (fragile):**
```sql
SELECT stage, COUNT(*) FROM evals_log
WHERE job_type = 'coverLetter'
GROUP BY stage;
```

**After (robust):**
```sql
-- Primary stages only (exclude sub-stages)
SELECT 
  stage,
  COUNT(*) FILTER (WHERE success AND completed_at IS NOT NULL) as completed,
  COUNT(*) FILTER (WHERE success = false) as failed,
  COUNT(*) FILTER (WHERE completed_at IS NULL) as in_progress
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage NOT LIKE '%.%' -- Exclude sub-stages
GROUP BY stage
ORDER BY stage;

-- Sub-stage token tracking
SELECT 
  stage,
  SUM(prompt_tokens) as prompt_tokens,
  SUM(completion_tokens) as completion_tokens,
  SUM(total_tokens) as total_tokens
FROM evals_log
WHERE job_type = 'coverLetter'
  AND stage LIKE 'goalsAndStrengths.%'
GROUP BY stage;
```

---

## Migration Plan

### Step 1: Update Pipeline Code ✅
- Cover letter pipeline: `supabase/functions/_shared/pipelines/cover-letter.ts`
- PM levels pipeline: `supabase/functions/_shared/pipelines/pm-levels.ts`

### Step 2: Backfill Historical Data (Optional)
```sql
-- Normalize historical stage names
UPDATE evals_log 
SET stage = CASE
  WHEN stage = 'goalsAndStrengths_mws' THEN 'goalsAndStrengths.mws'
  WHEN stage = 'goalsAndStrengths_company_context' THEN 'goalsAndStrengths.companyContext'
  WHEN stage = 'jd_analysis' THEN 'jdAnalysis'
  WHEN stage = 'company_tags_extraction' THEN 'companyTags'
  WHEN stage = 'structural_checks' THEN 'structuralChecks'
  ELSE stage
END
WHERE stage IN (
  'goalsAndStrengths_mws',
  'goalsAndStrengths_company_context',
  'jd_analysis',
  'company_tags_extraction',
  'structural_checks'
);
```

### Step 3: Update Dashboard Components
- `AdminEvalsDashboard.tsx`: Update stage filters
- `PipelineEvaluationDashboard.tsx`: Update stage breakdown logic
- `evalsAggregates.ts`: Update stage name constants

### Step 4: Add Stage Name Validation
Add to `supabase/functions/_shared/evals/log.ts`:

```typescript
const VALID_STAGES = {
  coverLetter: [
    'jdAnalysis',
    'requirementAnalysis', 
    'goalsAndStrengths',
    'goalsAndStrengths.mws',
    'goalsAndStrengths.companyContext',
    'sectionGaps',
    'companyTags',
    'structuralChecks'
  ],
  pmLevels: [
    'baselineAssessment',
    'competencyBreakdown',
    'specializationAssessment',
    'structuralChecks'
  ],
  onboarding: [
    'extraction',
    'llmAnalysis',
    'databaseSave',
    'gapHeuristics',
    'skillsNormalization'
  ]
} as const;

// In logEval():
if (!VALID_STAGES[payload.job_type]?.includes(payload.stage)) {
  elog.warn('invalid_stage_name', {
    job_type: payload.job_type,
    stage: payload.stage,
    valid_stages: VALID_STAGES[payload.job_type]
  });
}
```

---

## Verification Checklist

After deployment:

- [ ] Query shows consistent stage names (no `_` in names except sub-stages with `.`)
- [ ] Each primary stage has matching start/completion pairs (within 1% tolerance)
- [ ] Sub-stage counts match parent stage counts
- [ ] Phase breakdown charts show accurate data
- [ ] No "Unknown" or "Mixed" stages in aggregations

**Query to verify:**
```sql
WITH stage_pairs AS (
  SELECT
    stage,
    job_type,
    COUNT(*) FILTER (WHERE completed_at IS NULL) as started_only,
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as completed,
    COUNT(*) as total
  FROM evals_log
  WHERE created_at > NOW() - INTERVAL '7 days'
    AND stage NOT LIKE '%.%' -- Primary stages only
  GROUP BY stage, job_type
)
SELECT 
  *,
  CASE 
    WHEN started_only > total * 0.01 THEN '⚠️ High incomplete rate'
    ELSE '✅ OK'
  END as health
FROM stage_pairs
ORDER BY job_type, stage;
```

---

## Expected Outcomes

1. **Accurate aggregations:** Dashboard stage breakdowns show true distribution
2. **Consistent naming:** All stages use camelCase, sub-stages use dot notation
3. **Complete tracking:** Start/completion pairs for all stages (99%+ match rate)
4. **Clear hierarchy:** Primary stages vs. sub-stages (for detailed token tracking)
5. **Debugging confidence:** Analytics are trustworthy for performance optimization

---

## Related Files

- Implementation: `supabase/functions/_shared/pipelines/cover-letter.ts`
- Implementation: `supabase/functions/_shared/pipelines/pm-levels.ts`
- Logging: `supabase/functions/_shared/evals/log.ts`
- UI: `src/pages/admin/AdminEvalsDashboard.tsx`
- UI: `src/pages/admin/PipelineEvaluationDashboard.tsx`
- Utils: `src/utils/evalsAggregates.ts`

