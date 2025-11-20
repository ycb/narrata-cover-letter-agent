# Enhancement: Goals Tooltip - Complete View with Smart Sorting

## Requirement
User requested that the **Goals tooltip should show ALL goal categories** (not just the ones user has set), with proper states and smart prioritization.

### Key Requirements
1. **Show all goal categories** - even those not set by user
2. **Three states per goal:**
   - ✅ **Match** - User set it, job matches
   - ❌ **No match** - User set it, job doesn't match
   - ⚪ **Not set** - User hasn't configured this goal yet
3. **Smart sorting:**
   - Matched goals (green) at top
   - Unmatched goals (red) in middle
   - Not-set goals (gray) at bottom
4. **Parse JD content** - Match actual job description data against goals

## Solution Implemented

### 1. Smart Sorting Logic
**File:** `src/components/cover-letters/MatchGoalsTooltip.tsx`

Added sorting before rendering:

```typescript
// Sort goals: matched first, then unmatched, then not-set last
const sortedMatches = [...goalMatches].sort((a, b) => {
  // Not-set goals go to the bottom
  if (a.emptyState === 'goal-not-set' && b.emptyState !== 'goal-not-set') return 1;
  if (b.emptyState === 'goal-not-set' && a.emptyState !== 'goal-not-set') return -1;
  
  // Among set goals, matched ones come first
  if (a.met && !b.met) return -1;
  if (!a.met && b.met) return 1;
  
  return 0; // Maintain relative order otherwise
});
```

### 2. Existing Service Already Handles All Goals
**File:** `src/services/goalsMatchService.ts`

The service was already built correctly! It creates goal matches for **ALL** categories:

1. **Target Title** - matches job role
2. **Minimum Salary** - compares against JD salary data
3. **Work Type** (Remote/Hybrid/In-person) - matches location data
4. **Preferred Location** - matches city/geography
5. **Company Maturity** (Early-stage/Late-stage/Public) - flags for manual verification
6. **Industry** - flags for manual verification
7. **Business Model** (B2B SaaS, Marketplace, etc.) - flags for manual verification

For each goal, the service creates a `GoalMatch` with:
- `emptyState: 'goal-not-set'` if user hasn't set it
- `met: true/false` if user has set it
- `evidence` explaining the match/mismatch
- `requiresManualVerification` for goals that can't be auto-detected from JD

### 3. Visual States (Already Implemented)
**File:** `src/components/cover-letters/GoalMatchCard.tsx`

Three distinct visual states:

**A. Matched Goal (Green Card):**
```
✓ Target Title
  Your preference: Senior PM, Lead PM
  Job offers: Senior Product Manager
  Job title matches target
```

**B. Unmatched Goal (Red Card):**
```
✗ Minimum Salary
  Your preference: $180,000
  Job offers: Not specified
  Salary information not specified in JD
```

**C. Not-Set Goal (Gray Card - Bottom):**
```
? Industry
  Not specified in your career goals
```

## How It Works Now

### Tooltip Display Order

**When user HAS set some goals:**
```
┌─────────────────────────────────┐
│ ✓ Target Title            [TOP] │ ← Matches (green)
│   Senior PM matched              │
│                                  │
│ ✓ Work Type                      │
│   Remote matched                 │
├─────────────────────────────────┤
│ ✗ Minimum Salary      [MIDDLE]  │ ← No matches (red)
│   Not specified in JD            │
├─────────────────────────────────┤
│ ? Company Maturity    [BOTTOM]  │ ← Not set (gray)
│   Not specified in goals         │
│                                  │
│ ? Industry                       │
│   Not specified in goals         │
└─────────────────────────────────┘
```

**When user has NO goals set:**
```
┌─────────────────────────────────┐
│ ⚙️  No Career Goals Set          │
│                                  │
│ Configure your career goals to  │
│ see how well this job matches   │
│ your preferences                │
│                                  │
│ [Set Career Goals]              │
└─────────────────────────────────┘
```

## Benefits

### 1. Complete View
- Users see **all possible goal categories**
- Clear what they've set vs. what they haven't
- Encourages filling out complete profile

### 2. Prioritized Information
- Most relevant info (matches) at top
- Mismatches clearly visible in middle
- Not-set goals de-emphasized at bottom

### 3. Actionable
- Users can see exactly what goals they're missing
- Clear which goals match/don't match the current job
- Manual verification flagged for goals that require research

### 4. Data-Driven Matching
All matching logic pulls from actual JD content:
- **Title:** Fuzzy matches "Senior PM" with "Senior Product Manager"
- **Salary:** Parses salary ranges from JD text
- **Location:** Detects remote/hybrid/office from JD
- **Deal-breakers:** Flags mismatches that violate user's constraints

## Example Scenarios

### Scenario 1: Well-Matched Job
```
✓ Target Title - Senior Product Manager matches
✓ Minimum Salary - $200k meets your $180k requirement
✓ Work Type - Remote matches your preference
? Company Maturity - Not set
? Industry - Not set
```
**Result:** Shows 3 green, 0 red, 2 gray

### Scenario 2: Partially Matched Job
```
✓ Target Title - Matched
✗ Minimum Salary - Below your minimum
✗ Work Type - In-person, but you want Remote
? Company Maturity - Not set
? Industry - Not set
```
**Result:** Shows 1 green, 2 red, 2 gray

### Scenario 3: Minimal Goals Set
```
✓ Target Title - Matched
? Minimum Salary - Not set
? Work Type - Not set
? Company Maturity - Not set
? Industry - Not set
```
**Result:** Shows 1 green, 0 red, 4 gray (encourages user to set more goals)

## Files Modified
- `src/components/cover-letters/MatchGoalsTooltip.tsx` - Added sorting logic
- `src/services/goalsMatchService.ts` - Already complete (no changes needed)
- `src/components/cover-letters/GoalMatchCard.tsx` - Already complete (no changes needed)

## Testing Recommendations

### Test Cases
1. **User with complete goals + matched job**
   - Should see mostly green cards at top
   - Few/no gray cards

2. **User with complete goals + mismatched job**
   - Should see mix of red and green
   - Red cards clearly visible in middle

3. **User with minimal goals**
   - Should see 1-2 green/red cards at top
   - Many gray cards at bottom
   - Encourages setting more goals

4. **User with NO goals**
   - Should see single "No Career Goals Set" card
   - "Set Career Goals" button clickable

5. **Edge cases:**
   - Goals with manual verification (Industry, Business Model)
   - Goals with deal-breaker flags
   - Jobs with incomplete data (no salary, no location)

## Impact
- ✅ Users get **complete picture** of job fit
- ✅ **Smart prioritization** shows most important info first
- ✅ **Encourages profile completion** by showing what's missing
- ✅ **Data-driven** matching against actual JD content
- ✅ **Consistent UI** with other tooltips (card-based, evidence line)

