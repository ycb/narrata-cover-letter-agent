# Bug Fix: Goal Match States - Active vs Match vs Unknown

## Problem
The goals tooltip was showing incorrect visual states:
- **Work Type: remote** was showing GREEN ✅ (match) when job value was "Unknown"
- Other goals (Company Maturity, Industry, Business Model) were also showing GREEN when they should show UNKNOWN

The issue: The code was conflating **"Has user set this goal?"** (active/inactive) with **"Does the job match the goal?"** (match/no-match/unknown).

## Root Cause
The `goalsMatchService.ts` was setting `met=true` in two incorrect scenarios:
1. When `jobValue` was unknown/null but there was no explicit mismatch from Go/No-Go analysis
2. For goals that require manual verification (industry, business model, company maturity), it was defaulting to `met=true`

## Solution
Introduced a **third visual state** to distinguish between:
1. ✅ **GREEN (match)** - User set goal, JD has data, they match
2. ❌ **RED (no-match)** - User set goal, JD has data, they DON'T match  
3. ❓ **GRAY (unknown)** - User set goal, JD has NO data (can't determine match)

### Code Changes

#### 1. Added `matchState` to GoalMatch interface

**File**: `src/services/goalsMatchService.ts`

```typescript
export interface GoalMatch {
  // ... existing fields ...
  matchState?: 'match' | 'no-match' | 'unknown'; // Explicit match state
}
```

#### 2. Updated match logic for Salary and Work Type

**File**: `src/services/goalsMatchService.ts`

```typescript
// Example: Work Type matching
const hasJobData = jobDescription.location && jobDescription.location.toLowerCase() !== 'unknown';
const matchState = !hasJobData ? 'unknown' : geoMismatch ? 'no-match' : 'match';
const isMatch = matchState === 'match';

matches.push({
  id: 'goal-worktype',
  goalType: 'Work Type',
  userValue: `${userGoals.workType.join(', ')}`,
  jobValue: jobDescription.location || null,
  met: isMatch,
  matchState, // ← New field
  evidence: geoMismatch?.description || (hasJobData ? 'Work type matches your preferences' : 'Work type not specified in JD'),
});
```

**Key logic**:
- If NO job data → `matchState: 'unknown'`
- If job data AND mismatch detected → `matchState: 'no-match'`
- If job data AND no mismatch → `matchState: 'match'`

#### 3. Fixed Company Maturity, Industry, Business Model

These now correctly use `matchState: 'unknown'` and `met: false` instead of incorrectly defaulting to `met: true`.

```typescript
// Example: Company Maturity
matches.push({
  id: 'goal-maturity',
  goalType: 'Company Maturity',
  userValue: `${userGoals.companyMaturity.join(', ')}`,
  jobValue: null, // Not available in JD yet
  met: false, // ← Changed from true
  matchState: 'unknown', // ← New field
  evidence: 'Company maturity not specified in job description - requires manual research',
  requiresManualVerification: true,
});
```

#### 4. Updated GoalMatchCard component

**File**: `src/components/cover-letters/GoalMatchCard.tsx`

Added support for the `matchState` prop and visual rendering for the unknown state:

```typescript
const effectiveMatchState = matchState || (met === true ? 'match' : 'no-match');
const isMatch = effectiveMatchState === 'match';
const isUnknown = effectiveMatchState === 'unknown';

const cardBgClass = isMatch
  ? 'bg-success/10 border-success/20'  // Green
  : isUnknown
  ? 'bg-muted/10 border-muted/40'      // Gray
  : 'bg-destructive/10 border-destructive/20'; // Red

// Icon logic
{isMatch ? (
  <Check className="h-4 w-4 text-success" />
) : isUnknown ? (
  <HelpCircle className="h-4 w-4 text-muted-foreground" />
) : (
  <X className="h-4 w-4 text-destructive" />
)}
```

## Visual States

### Before (Incorrect)
- Minimum Salary: $180,000 → ✅ GREEN (but job salary was Unknown)
- Work Type: remote → ✅ GREEN (but job work type was Unknown)
- Company Maturity: Not set → ❓ GRAY (correct)
- Industry: Not set → ❓ GRAY (correct)

### After (Correct)
- Minimum Salary: $180,000 → ❓ GRAY (job salary Unknown)
- Work Type: remote → ❓ GRAY (job work type Unknown)
- Company Maturity: Not set → ❓ GRAY (user hasn't set goal)
- Industry: Not set → ❓ GRAY (user hasn't set goal)

## Impact
- ✅ Goals now correctly show UNKNOWN (gray) when job data is missing
- ✅ No more false-positive matches (green checkmarks)
- ✅ Users can distinguish between "doesn't match" vs "can't determine"
- ✅ Clear visual hierarchy: Active goals with unknown data show differently from goals not set

## Files Changed
1. `src/services/goalsMatchService.ts` - Added `matchState` logic
2. `src/components/cover-letters/GoalMatchCard.tsx` - Added `matchState` rendering
3. `src/components/cover-letters/CoverLetterEditModal.tsx` - Fixed `saveGoals` → `setGoals` typo (unrelated bug)

## Testing
1. Open existing cover letter draft (e.g., Supio)
2. Set goals (e.g., Work Type: Remote, Salary: $180,000)
3. Hover over "Match with Goals" badge
4. **Expected**: Goals with unknown job data show GRAY ❓ with "Unknown"
5. **Previous**: Goals with unknown job data showed GREEN ✅ (incorrect)

