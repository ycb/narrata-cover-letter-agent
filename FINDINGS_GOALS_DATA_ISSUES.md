# Findings: Goals Match Data Issues

## Issue 1: Corrupted Target Titles Data

### Observed Behavior
The "Target Title" goal match shows:
```
Target Title: Combine strategy, execution, and learning, Staff Product Manager, Growth Product Manager, Principal Product Manager
```

### Expected Behavior
Should show only job titles:
```
Target Title: Principal Product Manager, Staff Product Manager, Growth Product Manager
```

### Root Cause
The user's `targetTitles` array in their career goals has corrupted data. Instead of:
```typescript
targetTitles: ["Principal Product Manager", "Staff Product Manager", "Growth Product Manager"]
```

It contains:
```typescript
targetTitles: ["Combine strategy, execution, and learning", "Staff Product Manager", "Growth Product Manager", "Principal Product Manager"]
```

The phrase "Combine strategy, execution, and learning" is NOT a job title and somehow got added to the array.

### Solution
**User Action Required:**
1. Open "My Goals" modal
2. Review the "Target Job Titles" field
3. Remove the "Combine strategy, execution, and learning" text
4. Save goals

This will clean up the data and the goal match will display correctly.

---

## Issue 2: Salary Showing "Unknown"

### Observed Behavior
The job description states:
```
Base salary $160,000-200,000
```

But the "Minimum Salary" goal match shows:
```
Minimum Salary: $180,000
This job: Unknown
```

### Root Cause
The Supio job description was parsed with the **old JD analysis prompt** (before we added salary extraction on 2025-11-15). The database shows:

```sql
SELECT 
  structured_data->>'salary' as salary
FROM job_descriptions
WHERE company = 'Supio';

-- Result: salary = null
```

The `salary`, `workType`, `companyIndustry`, `companyBusinessModel`, and `companyMaturity` fields were added to the JD parser prompt, but existing JDs in the database were not re-parsed.

### Why It Happens
When you edit an existing cover letter:
1. The system loads the existing `job_description` record from the database
2. That record has `null` for the new salary fields
3. The `GoalsMatchService` sees `null` and correctly sets `matchState: 'unknown'`
4. The UI displays "Unknown" (gray question mark) ✅ **This is correct behavior!**

### Solution Options

**Option A: Create a NEW cover letter for testing (RECOMMENDED)**
1. Go to "All Cover Letters"
2. Click "Create New Letter"
3. Paste in a job description with salary information
4. The updated JD parser will extract the salary
5. The goal match will show the correct salary value

**Option B: Re-parse existing JDs (Future Enhancement)**
We could add a "Re-analyze Job Description" button to cover letter edit modal that re-runs the JD parser with the latest prompt. This would update the `structured_data` fields for existing JDs.

**Option C: Database Migration to Re-Parse All JDs**
Run a one-time script to re-parse all job descriptions with the updated prompt. This would be expensive (LLM calls for every JD) but would update all existing data.

---

## Issue 3: matchState Was Not Being Passed (FIXED ✅)

### Problem
The `matchState` prop was not being passed from `MatchGoalsTooltip` to `GoalMatchCard`, causing all goals to show RED X instead of GRAY ? for unknown states.

### Fix Applied
Updated `src/components/cover-letters/MatchGoalsTooltip.tsx` line 55 to pass `matchState={match.matchState}` to the `GoalMatchCard` component.

### Verification
Console logs showed:
```
[GoalMatchCard] Target Title: {matchState: undefined, met: false, ...}  // BEFORE
[GoalMatchCard] Target Title: {matchState: 'unknown', met: false, ...}  // AFTER
```

All goals now correctly show **GRAY ? (unknown)** when job data is missing.

---

## Summary

| Issue | Status | Action Required |
|-------|--------|----------------|
| Corrupted target titles data | 🟡 User Action | Clean up goals in "My Goals" modal |
| Salary showing "Unknown" | ✅ Working As Intended | Create NEW cover letter to test updated JD parser |
| matchState not passed to component | ✅ Fixed | None - code updated |

---

## Testing Checklist

To verify the fixes:

1. **Fix matchState rendering (DONE)**
   - [x] Open existing Supio cover letter
   - [x] Hover over "Match with Goals"
   - [x] Verify all goals show GRAY ? instead of RED X
   - [x] Verify tooltip says "This job: Unknown"

2. **Test salary extraction (NEW JD REQUIRED)**
   - [ ] Create NEW cover letter with JD containing salary
   - [ ] Example JD text: "Base salary: $160,000-200,000"
   - [ ] Verify goal match shows "This job: $160,000-200,000"

3. **Clean up target titles (USER ACTION)**
   - [ ] Open "My Goals" modal
   - [ ] Remove "Combine strategy, execution, and learning" from target titles
   - [ ] Save goals
   - [ ] Verify goal match shows only job titles

