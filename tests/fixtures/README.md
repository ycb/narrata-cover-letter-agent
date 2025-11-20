# Test Fixtures

This directory contains mock data for testing UI components and E2E scenarios.

## Available Fixtures

### `mockSectionGapInsights.json`

Mock data for section-specific gap insights feature. Contains 5 scenarios:

#### 1. `complete`
All sections with various gap scenarios. Use for testing:
- LLM-generated insights with rubric summaries
- Multiple gaps per section
- Different severity levels (high, medium, low)
- Structured gap format (title + description)

**Example:**
```typescript
import mockData from '@/tests/fixtures/mockSectionGapInsights.json';
const enhancedMatchData = mockData.complete.enhancedMatchData;
```

#### 2. `heuristic`
Heuristic-only insights (no LLM data). Use for testing:
- Fallback mode when LLM unavailable
- Fast, rule-based gap detection
- Loading state indicators

**Example:**
```typescript
const pendingSectionInsights = mockData.heuristic.pendingSectionInsights;
```

#### 3. `minimal`
Single section with single gap. Use for testing:
- Minimal UI rendering
- Simple gap display
- Edge case: very short drafts

#### 4. `noGaps`
All sections clean (no gaps). Use for testing:
- Ideal end state
- No gap banner display
- Full requirements coverage

#### 5. `edgeCases`
Collection of edge cases. Use for testing:
- Missing JD fields
- Single-section drafts
- Custom section types

## Usage in Tests

### Component Tests (Jest/Vitest)
```typescript
import { render } from '@testing-library/react';
import mockData from '@/tests/fixtures/mockSectionGapInsights.json';
import { CoverLetterDraftView } from '@/components/cover-letters/CoverLetterDraftView';

it('should render gap banner with LLM insights', () => {
  const { getByText } = render(
    <CoverLetterDraftView
      sections={[...]}
      enhancedMatchData={mockData.complete.enhancedMatchData}
    />
  );
  expect(getByText('Missing quantified impact')).toBeInTheDocument();
});
```

### Storybook Stories
```typescript
import mockData from '@/tests/fixtures/mockSectionGapInsights.json';

export const WithLLMInsights: Story = {
  args: {
    enhancedMatchData: mockData.complete.enhancedMatchData
  }
};

export const WithHeuristicInsights: Story = {
  args: {
    pendingSectionInsights: mockData.heuristic.pendingSectionInsights
  }
};
```

### E2E Tests (Cypress/Playwright)
```typescript
// Mock API response with fixture data
cy.intercept('POST', '/api/cover-letters/*/metrics', {
  body: mockData.complete.enhancedMatchData
});
```

## Updating Fixtures

When adding new gap types or section types:

1. Update `mockSectionGapInsights.json` with new scenario
2. Add description field explaining the scenario
3. Update this README with usage example
4. Run tests to verify new fixture works

## Related Documentation

- **QA Plan:** `QA_DOCUMENTATION_PLAN.md`
- **Test Report:** `AGENT_E_TEST_REPORT.md`
- **Feature Docs:** `TAG_IMPROVEMENT_PLAN.md#section-specific-gap-insights`

---

**Last Updated:** November 15, 2025

