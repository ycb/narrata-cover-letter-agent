# Bug Fix: Goals Match Tooltip Not Reflecting Current Goals

## Problem
The "Match with Goals" tooltip was showing "No Career Goals Set" even when the user had goals configured in the Career Goals modal. This was happening because the tooltip was displaying **cached data** from when the draft was originally created, not the **current goals** from the user context.

## Root Cause
1. When a cover letter draft is generated, the `enhancedMatchData.goalMatches` is calculated using the goals available **at that time**
2. This data is persisted to the database along with the draft
3. The `ProgressIndicatorWithTooltips` component was displaying this cached `goalMatches` array
4. When users updated their goals after draft creation, the tooltip continued showing the old analysis

## Solution
Implemented **dynamic goal match recalculation** in `ProgressIndicatorWithTooltips.tsx`:

1. **Added imports** for:
   - `useUserGoals` hook to access current goals from context
   - `GoalsMatchService` to recalculate matches
   - `useMemo` for performance optimization

2. **Recalculate on-the-fly** using `useMemo`:
   - Fetches current goals from `useUserGoals()` context
   - Calls `GoalsMatchService.analyzeGoalsMatch()` with:
     - Current goals from context (not cached data)
     - Job description from props
     - Go/No-Go analysis if available
   - Falls back to cached `enhancedMatchData.goalMatches` if job description is unavailable

3. **Dependencies** for `useMemo`:
   - `goals` - triggers recalculation when goals change
   - `jobDescription` - triggers recalculation if JD changes
   - `enhancedMatchData?.goalMatches` - fallback data
   - `goNoGoAnalysis` - additional context

## Code Changes

### `src/components/cover-letters/ProgressIndicatorWithTooltips.tsx`

```typescript
// Added imports
import { useUserGoals } from '@/contexts/UserGoalsContext';
import { GoalsMatchService } from '@/services/goalsMatchService';
import { useMemo } from 'react';

// In component body
export function ProgressIndicatorWithTooltips({...}) {
  // Get current goals from context
  const { goals } = useUserGoals();

  // ... other code ...

  // Recalculate goal matches using current goals from context
  const goalMatches = useMemo(() => {
    if (!jobDescription) {
      // Fallback to cached data if no job description available
      return enhancedMatchData?.goalMatches || [];
    }

    // Recalculate using current goals from context
    const goalsMatchService = new GoalsMatchService();
    const freshAnalysis = goalsMatchService.analyzeGoalsMatch(
      goals || null,
      jobDescription,
      goNoGoAnalysis
    );
    
    return freshAnalysis.matches;
  }, [goals, jobDescription, enhancedMatchData?.goalMatches, goNoGoAnalysis]);

  // Rest of component uses the recalculated goalMatches
}
```

## Impact
- ✅ Tooltip now reflects current goals immediately after saving in the Career Goals modal
- ✅ No need to regenerate the entire draft to see updated goal matches
- ✅ Maintains backward compatibility with existing drafts (falls back to cached data if needed)
- ✅ Performance-optimized with `useMemo` to only recalculate when dependencies change

## Testing
1. Open an existing cover letter draft
2. Hover over "Match with Goals" badge → shows "No Career Goals Set"
3. Click "Set Career Goals" button
4. Add target titles and salary
5. Click "Save Goals"
6. Hover over "Match with Goals" badge again → now shows the actual goal matches with current goals

## Related Files
- `src/components/cover-letters/ProgressIndicatorWithTooltips.tsx` - Main fix
- `src/services/goalsMatchService.ts` - Service used for recalculation
- `src/contexts/UserGoalsContext.tsx` - Provides current goals
- `src/components/cover-letters/MatchGoalsTooltip.tsx` - Displays the goal matches
- `src/components/cover-letters/GoalMatchCard.tsx` - Individual goal match display

