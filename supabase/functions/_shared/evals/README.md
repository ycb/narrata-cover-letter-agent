# Evals V1.1: Structural Validators

**Created:** December 4, 2025  
**Purpose:** Deterministic quality validation for pipeline results

---

## Overview

This module provides **non-LLM structural validators** for pipeline results. Validators check result shape, required fields, and value ranges using pure TypeScript logic.

**No LLM calls** — fast, deterministic, and consistent.

---

## Files

### `types.ts` — Type Definitions

**Exports:**
- `EvalSeverity` — 'critical' | 'high' | 'medium' | 'low'
- `EvalCheck` — Individual check result
- `StructuralEvalResult` — Complete validation result
- `LogEvalPayload` — Payload for logEval helper
- `SEVERITY_WEIGHTS` — Weights for quality score calculation
- `getEnvironment()` — Detect dev/staging/prod

**Usage:**
```typescript
import type { EvalCheck, StructuralEvalResult } from './types.ts';
```

---

### `validators.ts` — Validation Logic

**Exports:**
- `validateCoverLetterResult(result)` — 8 structural checks for cover letter
- `validatePMLevelsResult(result)` — 5 structural checks for PM levels
- `calculateQualityScore(result)` — Weighted quality score (0-100)

**Usage:**
```typescript
import { validateCoverLetterResult, calculateQualityScore } from './validators.ts';

const validation = validateCoverLetterResult(pipelineResult);
const score = calculateQualityScore(validation);

console.log(`Passed: ${validation.passed}, Score: ${score}`);
```

---

### `__tests__/validators.test.ts` — Unit Tests

**Test Coverage:**
- ✅ Cover letter validator (6 tests)
- ✅ PM levels validator (5 tests)
- ✅ Quality score calculation (5 tests)
- ✅ Integration tests (2 tests)

**Total:** 18 tests

**Run Tests:**
```bash
cd /Users/admin/narrata/supabase/functions/_shared/evals
deno test --allow-env __tests__/validators.test.ts
```

**Expected Output:**
```
test validateCoverLetterResult - complete valid result passes all checks ... ok
test validateCoverLetterResult - missing critical fields fails overall ... ok
... (16 more)
test Integration: PM levels result from successful pipeline ... ok

ok | 18 passed | 0 failed
```

---

## Structural Checks

### Cover Letter (8 checks)

| Check | Severity | Rule |
|-------|----------|------|
| Role Insights Present | Critical | `roleInsights.inferredRoleLevel` exists |
| Core Requirements Extracted | Critical | `jdRequirementSummary.coreTotal >= 1` |
| Requirement Analysis Complete | Critical | `requirements.coreRequirements.length >= 1` |
| MWS Score Valid | Critical | `mws.summaryScore in [0,1,2,3]` |
| Company Context Present | High | `companyContext.industry` exists |
| Section Gaps Identified | High | `gapCount >= 0` |
| Total Requirements Count | Medium | `totalRequirements >= 3` |
| Goal Alignment Present | Medium | `mws.goalAlignment` exists |

**Overall passes:** All 4 critical checks must pass.

---

### PM Levels (5 checks)

| Check | Severity | Rule |
|-------|----------|------|
| IC Level Valid | Critical | `icLevel in [3-9]` |
| Four Competencies Present | Critical | All 4 keys: executionDelivery, leadershipInfluence, productStrategy, technicalDepth |
| Competency Values in Range | Critical | All values in [0-10] |
| Assessment ID Generated | High | `assessmentId` is non-empty string |
| Specializations Present | Medium | `specializations` is array |

**Overall passes:** All 3 critical checks must pass.

---

## Quality Score Calculation

**Formula:**
```
score = (sum of passed weights / sum of total weights) * 100
```

**Weights:**
- Critical: 3x
- High: 2x
- Medium: 1x
- Low: 0.5x

**Example:**
```typescript
// 4 critical checks (3x each) = 12 points
// 2 high checks (2x each) = 4 points
// 2 medium checks (1x each) = 2 points
// Total weight: 18

// If 3 critical + 2 high pass:
// (9 + 4) / 18 * 100 = 72.22 → 72
```

---

## Usage in Pipelines (Phase 3)

After pipeline completes, before `telemetry.complete()`:

```typescript
import {
  validateCoverLetterResult,
  calculateQualityScore,
} from '../evals/validators.ts';

// ... pipeline execution ...

// After all stages complete
const structuralResult = validateCoverLetterResult(finalResult);
const qualityScore = calculateQualityScore(structuralResult);

// Log to evals_log (Phase 3)
await logEval(supabase, {
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
```

---

## Testing Checklist

- [x] All 18 unit tests pass
- [x] Cover letter validator handles valid results
- [x] Cover letter validator handles missing critical fields
- [x] Cover letter validator handles invalid MWS score
- [x] PM levels validator handles valid results
- [x] PM levels validator handles invalid IC level
- [x] PM levels validator handles missing competencies
- [x] Quality score calculation is weighted correctly
- [x] Integration tests with realistic pipeline results

---

## Next Steps (Phase 3)

1. Create `logEval` helper in `/supabase/functions/_shared/evals/log.ts`
2. Instrument `cover-letter.ts` pipeline
3. Instrument `pm-levels.ts` pipeline
4. Test with synthetic jobs

---

**Phase 2 Complete** ✅

