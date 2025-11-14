# E2E Tests for Evaluation Logging

## Overview

These tests verify that evaluation logging functionality works end-to-end:
- JD parsing events are logged correctly
- HIL story events are logged correctly
- HIL saved section events are logged correctly
- Database queries work as expected

## Running Tests

```bash
# Run all E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test file
npx playwright test evaluation-logging

# Run in headed mode (see browser)
npx playwright test --headed
```

## Prerequisites

1. Dev server must be running (or will auto-start)
2. Supabase connection must be configured
3. Test database should have evaluation_runs table with migrations applied

## Test Structure

- `evaluation-logging.spec.ts` - Main test suite for evaluation logging
  - Verifies table structure
  - Tests querying events by type/status
  - Verifies event data structure
  - Tests performance (indexes)

## Notes

- Tests use direct Supabase queries (not browser automation) for database verification
- Browser automation can be added for UI flow testing when needed
- Tests are designed to work with existing data or create test data

