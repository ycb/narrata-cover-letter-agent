# Phase 2: Structural Validators — PR Summary

**Status:** ✅ Ready for Review  
**Date:** December 4, 2025  
**Scope:** Deterministic structural validation for pipeline results

---

## Changes

### New Files

1. **`supabase/functions/_shared/evals/types.ts`** (120 lines)
   - `EvalSeverity` type
   - `EvalCheck` interface
   - `StructuralEvalResult` interface
   - `LogEvalPayload` interface
   - `SEVERITY_WEIGHTS` constant
   - `getEnvironment()` helper

2. **`supabase/functions/_shared/evals/validators.ts`** (280 lines)
   - `validateCoverLetterResult()` — 8 structural checks
   - `validatePMLevelsResult()` — 5 structural checks
   - `calculateQualityScore()` — weighted scoring (0-100)

3. **`supabase/functions/_shared/evals/__tests__/validators.test.ts`** (380 lines)
   - 17 unit tests covering all validators
   - Edge cases (missing fields, invalid values)
   - Integration tests with realistic pipeline results

4. **`supabase/functions/_shared/evals/README.md`** (200 lines)
   - Documentation for validators
   - Usage examples
   - Structural checks reference table
   - Testing instructions

---

## Test Results

### All Tests Pass ✅

```bash
cd /Users/admin/narrata/supabase/functions/_shared/evals
deno test --allow-env __tests__/validators.test.ts
```

**Output:**
```
running 17 tests from ./__tests__/validators.test.ts
validateCoverLetterResult - complete valid result passes all checks ... ok
validateCoverLetterResult - missing critical fields fails overall ... ok
validateCoverLetterResult - invalid MWS score fails ... ok
validateCoverLetterResult - zero core requirements fails ... ok
validateCoverLetterResult - missing non-critical fields still passes overall ... ok
validatePMLevelsResult - complete valid result passes all checks ... ok
validatePMLevelsResult - invalid IC level fails ... ok
validatePMLevelsResult - missing competency fails ... ok
validatePMLevelsResult - competency value out of range fails ... ok
validatePMLevelsResult - missing non-critical fields still passes overall ... ok
calculateQualityScore - all checks pass = 100 ... ok
calculateQualityScore - all checks fail = 0 ... ok
calculateQualityScore - weighted correctly for mixed results ... ok
calculateQualityScore - empty checks = 0 ... ok
calculateQualityScore - low severity weighted correctly ... ok
Integration: Cover letter result from successful pipeline ... ok
Integration: PM levels result from successful pipeline ... ok

ok | 17 passed | 0 failed (61ms)
```

---

## Implementation Details

### Cover Letter Validator (8 Checks)

**Critical (4):**
1. Role Insights Present — `roleInsights.inferredRoleLevel` exists
2. Core Requirements Extracted — `jdRequirementSummary.coreTotal >= 1`
3. Requirement Analysis Complete — `requirements.coreRequirements.length >= 1`
4. MWS Score Valid — `mws.summaryScore in [0,1,2,3]`

**High (2):**
5. Company Context Present — `companyContext.industry` exists
6. Section Gaps Identified — `gapCount >= 0`

**Medium (2):**
7. Total Requirements Count — `totalRequirements >= 3`
8. Goal Alignment Present — `mws.goalAlignment` exists

**Overall passes:** All 4 critical checks must pass.

---

### PM Levels Validator (5 Checks)

**Critical (3):**
1. IC Level Valid — `icLevel in [3-9]`
2. Four Competencies Present — All 4 keys exist
3. Competency Values in Range — All values in [0-10]

**High (1):**
4. Assessment ID Generated — `assessmentId` is non-empty string

**Medium (1):**
5. Specializations Present — `specializations` is array

**Overall passes:** All 3 critical checks must pass.

---

### Quality Score Calculation

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
- 4 critical checks (12 total weight)
- 2 high checks (4 total weight)
- 2 medium checks (2 total weight)
- **Total weight:** 18

**If 3 critical + 2 high + 1 medium pass:**
- Passed weight: 9 + 4 + 1 = 14
- Score: 14/18 * 100 = **78**

---

## Usage Example

```typescript
import {
  validateCoverLetterResult,
  calculateQualityScore,
} from '../evals/validators.ts';

// After pipeline completes
const validation = validateCoverLetterResult(pipelineResult);
const score = calculateQualityScore(validation);

console.log(`Passed: ${validation.passed}`);
console.log(`Score: ${score}/100`);

// Log failed checks
const failedChecks = validation.checks.filter(c => !c.passed);
failedChecks.forEach(check => {
  console.log(`❌ ${check.name} (${check.severity})`);
  console.log(`   Expected: ${check.expected}`);
  console.log(`   Actual: ${check.actual}`);
});
```

---

## Test Coverage

### Unit Tests (15)

**Cover Letter Validator (5 tests):**
- ✅ Complete valid result passes all checks
- ✅ Missing critical fields fails overall
- ✅ Invalid MWS score fails
- ✅ Zero core requirements fails
- ✅ Missing non-critical fields still passes overall

**PM Levels Validator (5 tests):**
- ✅ Complete valid result passes all checks
- ✅ Invalid IC level fails
- ✅ Missing competency fails
- ✅ Competency value out of range fails
- ✅ Missing non-critical fields still passes overall

**Quality Score Calculation (5 tests):**
- ✅ All checks pass = 100
- ✅ All checks fail = 0
- ✅ Weighted correctly for mixed results
- ✅ Empty checks = 0
- ✅ Low severity weighted correctly

### Integration Tests (2)

- ✅ Cover letter result from successful pipeline
- ✅ PM levels result from successful pipeline

---

## Type Safety

All functions are fully typed with TypeScript:

```typescript
export function validateCoverLetterResult(result: any): StructuralEvalResult;
export function validatePMLevelsResult(result: any): StructuralEvalResult;
export function calculateQualityScore(result: StructuralEvalResult): number;
```

**Note:** `result: any` is intentional — validators handle partially formed or invalid results gracefully.

---

## No Breaking Changes

- ✅ No modifications to existing pipelines
- ✅ No modifications to database schema
- ✅ No modifications to frontend
- ✅ Pure functions with no side effects
- ✅ Can be imported and tested independently

---

## Next Steps (After Merge)

1. Run tests locally: `deno test --allow-env supabase/functions/_shared/evals/__tests__/validators.test.ts`
2. Verify all 17 tests pass
3. Proceed to Phase 3 (Pipeline Instrumentation)

---

## Checklist

- [x] Types defined (`types.ts`)
- [x] Validators implemented (`validators.ts`)
- [x] Unit tests created (`__tests__/validators.test.ts`)
- [x] All 17 tests pass locally
- [x] Documentation added (`README.md`)
- [x] Cover letter: 8 checks (4 critical, 2 high, 2 medium)
- [x] PM levels: 5 checks (3 critical, 1 high, 1 medium)
- [x] Quality score calculation weighted correctly
- [x] No breaking changes
- [x] No pipeline modifications (Phase 3)

---

## Commit Message

```
evals: Phase 2 - Add structural validators and quality scoring

Creates deterministic validation logic for pipeline results:

- Add EvalCheck, StructuralEvalResult, and LogEvalPayload types
- Add validateCoverLetterResult() with 8 structural checks
- Add validatePMLevelsResult() with 5 structural checks
- Add calculateQualityScore() with severity-weighted scoring
- Add 17 unit tests (all passing)

Validators check result shape, required fields, and value ranges
using pure TypeScript (no LLM calls). Overall pass/fail determined
by all critical checks passing.

Quality score formula: (passed weight / total weight) * 100
Weights: critical=3x, high=2x, medium=1x, low=0.5x

Part of Evals V1.1 implementation (Phase 2 of 5).

Related: EVALS_V1_1_IMPLEMENTATION_SPEC.md
```

---

**Phase 2 Status:** ✅ Complete and Ready for Review

**Test Command:**
```bash
deno test --allow-env supabase/functions/_shared/evals/__tests__/validators.test.ts
```

**Expected:** All 17 tests pass ✅

