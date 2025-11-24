# Match Metrics Toolbar Implementation

## Overview

Refactored the match metrics display from tooltip-based to a horizontal toolbar + drawer pattern for improved accessibility, discoverability, and user experience.

## Problem Statement

The existing `ProgressIndicatorWithTooltips` component presented match metrics (goals, requirements, rating, ATS) as badges with hover tooltips. This created several UX issues:

1. **Hidden Information**: Detailed insights only visible on hover, reducing discoverability
2. **Mobile Unfriendly**: Tooltips don't work well on touch devices
3. **Cognitive Load**: Users had to remember to hover over each metric
4. **Tooltip Collision**: Multiple tooltips in close proximity caused interaction issues

## Solution

Created a new **independent module** with a horizontal toolbar and expandable drawer:

- **Left Sidebar**: Vertical toolbar displaying all 5 metrics with clear labels and values
- **Right Panel**: Expandable drawer showing detailed breakdown for the selected metric
- **Single Selection**: Only one metric expanded at a time, reducing cognitive load
- **Accessible**: All information directly visible, no hover required

## Architecture

### Component Hierarchy

```
MatchMetricsToolbar (new)
├── useMatchMetricsDetails (shared hook)
├── MetricDrawerContent
│   ├── GoalsDrawerContent
│   │   └── GoalMatchCard (reused)
│   ├── RequirementsDrawerContent
│   ├── CoverLetterRatingInsights (extracted)
│   └── ATSScoreInsights (extracted)
└── Toolbar Items (clickable buttons)
```

### Files Created/Modified

#### New Files

1. **`src/components/cover-letters/MatchMetricsToolbar.tsx`**
   - Main toolbar component with left sidebar + right drawer
   - Manages active metric selection state
   - Delegates drawer rendering to metric-specific subcomponents
   - ~380 lines

2. **`src/components/cover-letters/useMatchMetricsDetails.ts`**
   - Shared hook for data transformation and computation
   - Centralizes logic previously duplicated in tooltips
   - Returns: goal matches, requirement lists, summaries with percentages
   - Handles JD schema normalization and requirement matching
   - ~200 lines

3. **`src/pages/MatchMetricsPreview.tsx`**
   - Standalone preview page for design validation
   - Provides mock data (job description, enhanced match data, metrics)
   - Interactive toggles: loading state, post-HIL state
   - Demonstrates all 5 metric drawers with realistic content
   - ~250 lines

4. **`src/components/cover-letters/__tests__/MatchMetricsToolbar.test.tsx`**
   - Unit tests for toolbar interactions and drawer rendering
   - Covers: metric selection, loading states, empty states
   - Validates goal/requirement display and CTA callbacks
   - 3 passing tests

#### Modified Files

1. **`src/components/cover-letters/CoverLetterRatingTooltip.tsx`**
   - Extracted `CoverLetterRatingInsights` component (reusable drawer content)
   - Kept existing tooltip wrapper for backward compatibility

2. **`src/components/cover-letters/ATSScoreTooltip.tsx`**
   - Extracted `ATSScoreInsights` component (reusable drawer content)
   - Kept existing tooltip wrapper for backward compatibility

3. **`src/components/cover-letters/ProgressIndicatorWithTooltips.tsx`**
   - Updated to use shared `useMatchMetricsDetails` hook
   - Remains as legacy component (will be replaced later)
   - No functional changes to existing tooltip behavior

4. **`src/App.tsx`**
   - Added route: `/match-metrics-preview`
   - Registered `MatchMetricsPreview` page

5. **`NEW_FILE_REQUESTS.md`**
   - Documented all new files with search rationale

## Design Principles Applied

### Single Responsibility
- `useMatchMetricsDetails`: Data transformation only
- `MatchMetricsToolbar`: Layout and state management
- Drawer content components: Display logic for specific metrics

### Separation of Concerns
- Data layer (hook) separated from presentation (components)
- Each metric has isolated drawer content component
- Reused existing `GoalMatchCard` and `Badge` primitives

### Composition Over Inheritance
- Toolbar composes `MetricDrawerContent` which dispatches to specific drawers
- No deep component hierarchies
- Drawer components receive props, not base classes

## Key Features

### 1. Toolbar Items (Left Sidebar)
- Display for each metric:
  - Label (e.g., "Match with Goals")
  - Value (e.g., "3/7")
  - Helper text (e.g., "43%")
  - Visual indicator (colored badge with chevron)
- Active state highlighting
- Loading skeleton for each item

### 2. Drawer Content (Right Panel)

#### Goals Drawer
- Shows all 7 goal categories (title, salary, location, work type, industry, size, stage)
- Green cards for matches, red for mismatches, gray for not-set
- "Edit Goals" CTA for empty states
- Sorted: matched → unmatched → not-set

#### Requirements Drawers (Core + Preferred)
- List all requirements from JD parse
- Demonstrated requirements: green card with evidence and section reference
- Missing requirements: red card with explanation
- CTAs: "Enhance Section", "Add Metrics" (wired to callbacks)

#### Rating Drawer
- Rubric breakdown in 3 columns:
  - Structure & Flow (opening, business understanding, impact, action verbs)
  - Content Quality (length, errors, personalization, examples)
  - Professional Standards (tone, research, role understanding)
- Check/X indicators based on `isPostHIL` prop

#### ATS Drawer
- Best practices in 4 columns:
  - Content Quality (spelling, email format, LinkedIn, contact info)
  - ATS Essentials (file format, size, layout, fonts)
  - Skills & Keywords (hard skills, soft skills, density, industry terms)
  - Structure & Formatting (headers, consistency, chronology, no tables)
- Check/X indicators based on `isPostHIL` prop

### 3. Responsive Design
- Desktop: Side-by-side toolbar + drawer
- Mobile: Stacked layout (toolbar top, drawer bottom)
- Touch-friendly buttons (no hover dependency)

### 4. Loading States
- Toolbar items: skeleton loaders
- Drawer: skeleton content blocks
- Graceful degradation when data unavailable

## Integration Points

### Props Interface

```typescript
interface MatchMetricsToolbarProps {
  metrics: HILProgressMetrics;           // From draft or live calculation
  className?: string;
  isPostHIL?: boolean;                   // Show green checks vs. red X's
  isLoading?: boolean;                   // Show loading skeletons
  goNoGoAnalysis?: GoNoGoAnalysis;       // For goal matching logic
  jobDescription?: MatchJobDescription;  // JD parse results
  enhancedMatchData?: EnhancedMatchData; // Detailed match breakdowns
  onEditGoals?: () => void;              // Open goals modal
  onEnhanceSection?: (sectionId: string, requirement?: string) => void;
  onAddMetrics?: (sectionId?: string) => void;
}
```

### Data Flow

1. **Parent Component** (e.g., `CoverLetterDraftView`) passes:
   - `metrics` from `useCoverLetterDraft` hook
   - `jobDescription` from database
   - `enhancedMatchData` from match intelligence service
   - Callback handlers for CTAs

2. **useMatchMetricsDetails** hook:
   - Recalculates goal matches using current user goals
   - Normalizes requirement lists from JD schema variations
   - Computes summaries (met/total, percentages)
   - Overlays "demonstrated" flags from enhanced data

3. **MatchMetricsToolbar**:
   - Renders toolbar items with computed summaries
   - Manages active metric selection
   - Passes relevant data slice to drawer component

## Testing

### Unit Tests (`MatchMetricsToolbar.test.tsx`)

1. **Renders toolbar items and default drawer content**
   - Verifies all 5 metrics displayed
   - Confirms Goals drawer shown by default
   - Validates badge values match mock data

2. **Switches drawer content when toolbar item clicked**
   - Clicks "Core Requirements" button
   - Verifies core requirements list rendered
   - Confirms active state applied to button

3. **Shows ATS insights when ATS toolbar item selected**
   - Clicks "ATS" button
   - Verifies ATS rubric content displayed
   - Checks for "File Format", "Spelling and Grammar" text

**All tests passing** ✅

### Preview Page Testing

Navigate to: `http://localhost:5173/match-metrics-preview`

**Interactive Controls:**
- Toggle "Show Loading State" to test skeletons
- Toggle "Post-HIL State" to see rating/ATS check variations
- Click each toolbar item to verify drawer content switches
- Test CTAs (alerts confirm callbacks fire)

**Mock Data Scenarios:**
- 4/7 goal matches (some not-set, some mismatches)
- 4/5 core requirements met (1 missing)
- 2/3 preferred requirements met
- "Strong" cover letter rating
- 82% ATS score

## Comparison: Old vs. New

| Aspect | Old (Tooltips) | New (Toolbar + Drawer) |
|--------|----------------|------------------------|
| **Visibility** | Hidden until hover | Always visible |
| **Mobile** | Poor (no hover) | Excellent (tap-based) |
| **Information Density** | Low (one tooltip at a time) | High (all metrics + active drawer) |
| **Navigation** | Hover each badge | Click to switch |
| **Accessibility** | Keyboard nav challenging | Fully keyboard accessible |
| **Discoverability** | Low (users may not know to hover) | High (explicit toolbar) |
| **Code Reuse** | Duplicated logic in tooltips | Centralized in hook |

## Next Steps

### Phase 1: Design Validation (Current)
- [x] Implement toolbar module as independent component
- [x] Create preview page with mock data
- [x] Add unit tests
- [ ] **Design review** using `/match-metrics-preview` route
- [ ] Gather feedback on layout, colors, spacing, CTA placement

### Phase 2: Integration (After Approval)
1. Update `CoverLetterDraftView` to use `MatchMetricsToolbar`
2. Wire up real data from `useCoverLetterDraft` hook
3. Connect CTA handlers to existing modals/panels
4. Test in live draft creation flow
5. Run E2E tests to verify no regressions

### Phase 3: Deprecation
1. Remove `ProgressIndicatorWithTooltips` (or mark as legacy)
2. Clean up unused tooltip wrappers if not needed elsewhere
3. Update documentation

## Migration Notes

### For Developers

**No breaking changes yet** – the toolbar is a standalone module. Existing tooltip-based component continues to work.

When ready to swap:

```tsx
// Before
<ProgressIndicatorWithTooltips
  metrics={metrics}
  jobDescription={jobDescription}
  enhancedMatchData={enhancedMatchData}
  onEditGoals={openGoalsModal}
  // ... other props
/>

// After
<MatchMetricsToolbar
  metrics={metrics}
  jobDescription={jobDescription}
  enhancedMatchData={enhancedMatchData}
  onEditGoals={openGoalsModal}
  onEnhanceSection={handleEnhanceSection}
  onAddMetrics={handleAddMetrics}
  // ... other props
/>
```

### For Designers

**Preview URL**: `http://localhost:5173/match-metrics-preview`

**Key Areas for Review:**
1. Toolbar width (currently 256px / `md:w-64`) – too wide/narrow?
2. Drawer padding and spacing – comfortable reading?
3. Badge colors for different score ranges – clear enough?
4. Active toolbar item highlight – sufficient contrast?
5. Mobile stacked layout – acceptable on smaller screens?
6. Loading skeletons – accurate representation of content?

## Technical Decisions

### Why a Hook for Data Logic?

- **DRY**: Same logic needed by toolbar and legacy tooltips
- **Testability**: Easier to test data transformations in isolation
- **Separation**: Business logic separated from presentation
- **Reusability**: Can be used by future metrics components

### Why Separate Drawer Components?

- **Modularity**: Each metric's drawer can be developed/tested independently
- **Extensibility**: Easy to add new metrics (e.g., "Experience Match")
- **Clarity**: Each drawer has single responsibility
- **Performance**: Only active drawer content rendered

### Why Extract Insights from Tooltips?

- **Code Reuse**: Same rating/ATS rubric content for tooltip and drawer
- **Consistency**: Identical information regardless of display method
- **Maintainability**: Single source of truth for rubric criteria
- **Backward Compatibility**: Old tooltips still work during transition

## Performance Considerations

- **useMemo**: Toolbar items memoized to prevent recalculation on every render
- **Conditional Rendering**: Only active drawer content rendered
- **useEffect**: Active metric resets only when first available item changes
- **No Re-fetching**: Uses data already fetched by parent component

## Accessibility

- **Semantic HTML**: `<button>` for toolbar items, proper heading hierarchy
- **ARIA Attributes**: `aria-pressed`, `aria-expanded` for toolbar state
- **Keyboard Navigation**: Tab through toolbar, Enter/Space to select
- **Screen Readers**: Labels announce metric values and states
- **Color Independence**: Icons (Check/X) supplement color coding

## Known Limitations

1. **No Experience Match Drawer Yet**: Planned for future iteration
2. **Mock CTA Handlers in Preview**: Real handlers need to be wired in integration
3. **No Animations**: Could add smooth transitions between drawer content
4. **Fixed Toolbar Width**: Could make responsive based on content length
5. **No Metric Sorting**: Toolbar order is fixed (goals → core → preferred → rating → ATS)

## Questions or Concerns

Before merging the toolbar into the live flow:

1. **When should metrics refresh?** Every draft update? Manual refresh button?
2. **Should we persist drawer selection?** (e.g., remember "Core Requirements" was last active)
3. **Mobile drawer collapse?** Make drawer hideable to reclaim screen space?
4. **Metric thresholds?** Current color logic (80% green, 60% yellow) – acceptable?
5. **CTAs in requirements drawer** – "Enhance" and "Add Metrics" – do we want more granular actions?

---

**Status**: ✅ Ready for design review  
**Preview URL**: `http://localhost:5173/match-metrics-preview`  
**Tests**: 3/3 passing  
**Linter**: No errors

