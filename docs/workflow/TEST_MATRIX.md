# Test Matrix

Use this matrix to decide what to run for a change.

## Unit Tests (Vitest)

Best for:
- Services, hooks, utilities, and data transforms.
- Logic-heavy components with minimal UI behavior.

Run:
- `npm test -- path/to/test.test.tsx` (targeted)
- `npm run test:core` (core suite + coverage gate)
- `npm run test:diff-coverage` (diff coverage gate for core changes)
- `npm run test:ci` (full run with coverage, non-blocking in CI)

## Component Tests (Testing Library)

Best for:
- UI state changes, modals, and form flows.
- Rendering logic and user interactions.

Run:
- `npm test -- path/to/component.test.tsx`
- `npm run test:ui` for interactive debugging

## E2E Tests (Playwright)

Best for:
- Critical user workflows (onboarding, drafting, uploads).
- Cross-service integration flows.

Run:
- `npm run test:e2e`
- `npm run test:e2e:ui` for interactive debugging

## Scripts / Manual Checks

Best for:
- One-off data migrations or operational scripts.
- End-to-end smoke checks on staging/prod.

Run:
- Script-specific commands in `package.json`
- Manual QA steps in `docs/qa/`
