# Debug: Goal Match State Not Showing Unknown Correctly

## Issue
All goals showing RED ❌ when they should show GRAY ❓ for unknown state.

## What Changed
1. Added `matchState: 'match' | 'no-match' | 'unknown'` to `GoalMatch` interface
2. Service now sets `matchState: 'unknown'` for both:
   - User hasn't set goal
   - User set goal but JD doesn't have data

## Current Behavior (from screenshot)
- All goals show RED X ❌ with pink/red background
- This indicates `matchState` is evaluating to `'no-match'` instead of `'unknown'`

## Likely Cause
The component logic defaults to `'no-match'` when `matchState` is undefined:

```typescript
const effectiveMatchState = matchState || (met === true ? 'match' : 'no-match');
```

**If `matchState` prop is undefined/null**, it falls through to checking `met`, and since `met=false`, it defaults to `'no-match'`.

## Next Steps
Need to verify in browser console what value `matchState` actually has when rendered.

### Debug Commands
```javascript
// In browser console, inspect the goalMatches array
// (assuming it's accessible or can be logged)
console.log(goalMatches);

// Check each match object
goalMatches.forEach(m => {
  console.log(m.goalType, 'matchState:', m.matchState, 'met:', m.met);
});
```

## Expected Values
For the goals shown in screenshot:
- Target Title: `matchState: 'unknown'`, `met: false`, `userValue: "Combine strategy..."`, `jobValue: null`
- Minimum Salary: `matchState: 'unknown'`, `met: false`, `userValue: "$180,000"`, `jobValue: null`
- Work Type: `matchState: 'unknown'`, `met: false`, `userValue: "remote"`, `jobValue: null`
- Company Maturity: `matchState: 'unknown'`, `met: false`, `userValue: null`, `jobValue: null`
- Industry: `matchState: 'unknown'`, `met: false`, `userValue: null`, `jobValue: null`
- Business Model: `matchState: 'unknown'`, `met: false`, `userValue: null`, `jobValue: null`

