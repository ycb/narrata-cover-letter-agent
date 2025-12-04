# QA Documentation Guide

**Purpose:** Onboarding-ready QA documentation for engineers, PMs, and QA team members.

**Last Updated:** December 4, 2025

---

## Overview

This directory contains all QA documentation, test status reports, and quality metrics for the Narrata codebase.

**Key Principle:** QA is ongoing, not a phase. Continuous testing, classification, and documentation ensure codebase stability.

---

## Directory Structure

```
/docs/qa/
├── QA_README.md                          # This file - QA guide & onboarding
├── REFINEMENTS_SUMMARY.md                # Executive summary of Phase 1 refinements
├── PHASE_1_REFINEMENTS.md                # Detailed refinement log
├── PHASE_1_COMPLETION_SUMMARY.md         # Phase 1 QA completion report
├── TEST_STATUS.md                        # Test suite classification & status
└── (future) /                            # Additional QA reports as needed
```

**Quick Navigation:**
- **New to QA?** Start with this file (`QA_README.md`)
- **Phase 1 Results?** See `REFINEMENTS_SUMMARY.md` for executive summary
- **Test Status?** See `TEST_STATUS.md` for current test health
- **Phase 2 Planning?** See `PHASE_1_COMPLETION_SUMMARY.md` for next steps

---

## How QA is Organized

### 1. Test Suite Classification System

All tests are classified using file-level comments:

**`// TEST STATUS: STILL VALID`**
- Test logic is correct and relevant
- Test is failing due to a bug or missing feature
- **Action:** Fix the code or add missing dependencies

**`// TEST STATUS: UI OUTDATED`**
- Test logic is correct but UI/component has changed
- Test needs updated expectations or wrapper setup
- **Action:** Update test expectations or add missing wrappers

**`// TEST STATUS: PASSING - HIGH VALUE`**
- Test is passing and provides strategic value
- Covers core pipelines, services, or critical utilities
- **Action:** KEEP - Do not remove or modify without discussion

**`// TEST STATUS: DEPRECATED`**
- Test covers removed features or outdated logic
- Safe to remove
- **Action:** Delete test file and remove from test suite

---

## Where Docs Live

| Document | Purpose | Audience |
|----------|---------|----------|
| `TEST_STATUS.md` | Test suite health, pass/fail counts, classification | Engineering, QA |
| `PHASE_1_COMPLETION_SUMMARY.md` | Phase 1 QA deliverables, metrics, next steps | PM, Engineering, QA |
| `/docs/architecture/JOB_STAGES_REFERENCE.md` | Job types, stages, result shapes | Engineering, QA |
| `/docs/architecture/COVER_LETTER_TEMPLATES.md` | Template implementation spec | Engineering, PM |

---

## How to Run Test Suite

### Full Test Suite

```bash
cd /Users/admin/narrata
npx vitest run
```

**Output:** Summary of passing/failing tests, duration, coverage

### Watch Mode (During Development)

```bash
npx vitest
```

**Behavior:** Re-runs tests on file changes

### Run Specific Test File

```bash
npx vitest run src/services/__tests__/coverLetterDraftService.test.ts
```

### Run Tests Matching Pattern

```bash
npx vitest run --grep "cover letter"
```

---

## How Tests Are Classified

### Step 1: Run Test Suite

```bash
npx vitest run --reporter=verbose > test-output.txt 2>&1
```

### Step 2: Analyze Failures

For each failing test:
1. **Identify root cause:**
   - Missing dependency (e.g., QueryClient wrapper)
   - Database table mismatch (e.g., `stories` table)
   - Feature flag disabled (e.g., readiness API)
   - Component UI changed (e.g., "Story Tags" label)
2. **Classify:**
   - `STILL VALID` - Bug or missing feature
   - `UI OUTDATED` - Test needs update
   - `DEPRECATED` - Feature removed

### Step 3: Document in TEST_STATUS.md

Add failing test to appropriate section with:
- File path
- Failure reason
- Classification
- Fix recommendation
- Priority (HIGH, MEDIUM, LOW)

### Step 4: Add File-Level Comment

At the top of each test file:

```typescript
// TEST STATUS: STILL VALID
// Issue: Missing stories table in test DB
// Priority: HIGH
// Fix: Add stories table to test schema setup
```

---

## How to Update Job Stages

Job types, stages, and result shapes are documented in:

**`/docs/architecture/JOB_STAGES_REFERENCE.md`**

### When to Update

1. **New Job Type Added:**
   - Add new section to `JOB_STAGES_REFERENCE.md`
   - Document all stages, result shape, and performance characteristics

2. **New Stage Added to Existing Job:**
   - Update stage list in relevant job type section
   - Add stage data shape and expected output

3. **Result Shape Changed:**
   - Update TypeScript interface in `JOB_STAGES_REFERENCE.md`
   - Update example in document

### Update Process

1. **Edit:** `/docs/architecture/JOB_STAGES_REFERENCE.md`
2. **Sync:** Update `src/types/jobs.ts` if TypeScript types changed
3. **Test:** Run pipeline tests to verify changes
4. **Document:** Add note to changelog or PR description

---

## Test Patterns & Standards

### Component Tests: QueryClient Wrapper

**Problem:** React Query hooks require `QueryClientProvider`

**Solution:** Use centralized test utils

```typescript
// tests/utils/test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';

export function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

// In component test:
import { renderWithQueryClient } from '@/tests/utils/test-utils';

test('my component', () => {
  renderWithQueryClient(<MyComponent />);
  // assertions...
});
```

### Service Tests: Mocking Supabase

**Pattern:**

```typescript
import { vi } from 'vitest';

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: mockData, error: null })
    })
  })
};

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase
}));
```

### API Tests: Feature Flag Mocking

**Pattern:**

```typescript
import { vi } from 'vitest';

beforeEach(() => {
  vi.mock('@/lib/flags', () => ({
    isDraftReadinessEnabled: () => true
  }));
});
```

---

## QA Metrics Dashboard (Baseline)

### Test Suite Health (as of Dec 4, 2025)

| Metric | Value | Status |
|--------|-------|--------|
| Total Tests | 446 | ✅ |
| Passing Tests | 361 | ✅ |
| Failing Tests | 85 | ⚠️ |
| Pass Rate | 80.9% | ⚠️ YELLOW |
| Test Files | 51 | ✅ |
| Passing Test Files | 21 | ✅ |
| Failing Test Files | 30 | ⚠️ |

**Target:** 95%+ pass rate

**Current Status:** YELLOW - High-value tests passing, component tests need wrapper updates

---

## Common QA Tasks

### Task: Add New Test

1. Create test file: `src/[feature]/__tests__/[feature].test.ts`
2. Add classification comment: `// TEST STATUS: PASSING - HIGH VALUE`
3. Run test: `npx vitest run src/[feature]/__tests__/[feature].test.ts`
4. Update `TEST_STATUS.md` if relevant

### Task: Fix Failing Test

1. Identify test in `TEST_STATUS.md`
2. Check classification (`STILL VALID` vs `UI OUTDATED`)
3. Fix code or update test expectations
4. Run test: `npx vitest run [file]`
5. Update `TEST_STATUS.md` when green

### Task: Remove Deprecated Test

1. Verify classification: `// TEST STATUS: DEPRECATED`
2. Confirm feature is removed
3. Delete test file
4. Update `TEST_STATUS.md` to remove from failing tests list

### Task: Document New Job Stage

1. Open `/docs/architecture/JOB_STAGES_REFERENCE.md`
2. Add stage to relevant job type section
3. Document:
   - Stage name
   - Stage data shape
   - Expected output
   - Performance characteristics
4. Update `src/types/jobs.ts` if needed

---

## QA Best Practices

### 1. Keep Tests Green

- Fix failing tests within 1 sprint
- Don't commit code that breaks existing tests
- If a test is blocking, classify as `DEPRECATED` and remove

### 2. Classify Tests Early

- Add `// TEST STATUS` comment when creating test
- Update classification when test fails
- Document in `TEST_STATUS.md` if failure is not immediately fixed

### 3. Document Test Patterns

- Reusable patterns go in `tests/utils/`
- Complex setup goes in test utils, not individual tests
- Mock patterns should be consistent across test files

### 4. Test Coverage Priorities

**HIGH PRIORITY:**
- Core pipelines (onboarding, cover letter, PM levels)
- Service layer (draft generation, template assembly)
- Utility functions (JD parsing, gap detection)

**MEDIUM PRIORITY:**
- Component tests (UI logic)
- Hook tests (React hooks)

**LOW PRIORITY:**
- E2E tests (expensive, run manually or in CI)
- Visual regression tests (run on-demand)

### 5. QA Documentation Hygiene

- Update `TEST_STATUS.md` after any test fixes
- Update `JOB_STAGES_REFERENCE.md` when pipeline changes
- Keep QA reports up to date (monthly review)

---

## Escalation & Support

### Test Failures

**When to escalate:**
- Test failure root cause unknown after 1h investigation
- Test failure blocks feature development
- Test suite pass rate drops below 75%

**Who to escalate to:**
- Engineering Lead: Test infrastructure issues
- PM: Test expectations vs. product requirements
- QA Lead: Test classification or strategy questions

### Documentation Questions

**When to escalate:**
- Unclear how to classify a failing test
- Unsure if test is deprecated or still valid
- Need guidance on test coverage priorities

**Who to escalate to:**
- QA Lead: Test classification
- Engineering Lead: Test architecture
- PM: Product behavior expectations

---

## Future QA Enhancements

### Planned Improvements

1. **Automated Test Classification:**
   - Script to auto-classify tests based on error patterns
   - Reduce manual classification effort

2. **Test Coverage Dashboard:**
   - Visual dashboard for test metrics
   - Track pass rate over time
   - Identify flaky tests

3. **Integration Test Suite:**
   - End-to-end pipeline tests
   - Cover onboarding → cover letter → finalization flow

4. **Performance Benchmarks:**
   - Track job duration over time
   - Alert if pipeline performance degrades

---

## Related Documentation

- **Architecture Docs:** `/docs/architecture/`
- **Implementation Plans:** `/docs/implementation/`
- **Testing Docs:** `/docs/testing/`
- **Troubleshooting:** `/docs/troubleshooting/`

---

**QA Lead:** Cursor AI Agent  
**Last Review:** December 4, 2025  
**Next Review:** Monthly (1st of each month)

---

**Quick Links:**
- [Test Status Report](./TEST_STATUS.md)
- [Phase 1 Completion Summary](./PHASE_1_COMPLETION_SUMMARY.md)
- [Job Stages Reference](/docs/architecture/JOB_STAGES_REFERENCE.md)
- [Cover Letter Templates Spec](/docs/architecture/COVER_LETTER_TEMPLATES.md)

