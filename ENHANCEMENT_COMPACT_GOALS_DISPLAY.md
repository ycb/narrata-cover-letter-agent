# Enhancement: Compact Goals Tooltip Display

## User Feedback
"Better! This might make more sense and be condensed with:
- Target Title: Senior PM
- This job: Senior PM
- Minimum Salary: $180,000
- This job: Unknown"

## Problem
The previous format was too verbose and took up too much space:

```
Target Title
  Your preference:
  Senior PM, Lead PM
  
  Job offers:
  Product Manager
  
  Job title matches target
```

## Solution
Updated `GoalMatchCard.tsx` to use a more compact, side-by-side format:

### New Format

```
✓ Target Title
  Target Title: Senior PM, Lead PM
  This job: Product Manager

✗ Minimum Salary
  Minimum Salary: $180,000
  This job: Unknown
```

## Changes Made

**File:** `src/components/cover-letters/GoalMatchCard.tsx`

### Before:
```typescript
<div className="ml-6 space-y-2">
  <div>
    <div className="text-xs font-medium text-muted-foreground mb-0.5">
      Your preference:
    </div>
    <div className="text-xs text-foreground/90">
      {userValue}
    </div>
  </div>

  {jobValue && (
    <div>
      <div className="text-xs font-medium text-muted-foreground mb-0.5">
        Job offers:
      </div>
      <div className="text-xs text-foreground/90">
        {jobValue}
      </div>
    </div>
  )}
  
  {/* Evidence */}
</div>
```

### After:
```typescript
<div className="ml-6 space-y-1.5 text-xs">
  <div>
    <span className="font-medium text-foreground/90">{goalType}:</span>{' '}
    <span className="text-foreground/80">{userValue}</span>
  </div>

  <div>
    <span className="font-medium text-foreground/90">This job:</span>{' '}
    <span className="text-foreground/80">
      {jobValue || 'Unknown'}
    </span>
  </div>

  {/* Evidence - only if not redundant */}
</div>
```

## Benefits

✅ **More compact:** Takes up ~40% less vertical space
✅ **Easier to scan:** Side-by-side labels make comparison instant
✅ **Consistent "Unknown":** Always shows "This job: Unknown" when no data available
✅ **Less redundant:** Hides evidence like "matches target" or "not specified" that's already obvious from the labels
✅ **Cleaner hierarchy:** Goal type as label, not separate field name

## Visual Comparison

### Before (Verbose):
```
┌─────────────────────────────────────┐
│ ✓ Target Title                      │
│                                     │
│   Your preference:                  │
│   Senior PM, Lead PM                │
│                                     │
│   Job offers:                       │
│   Product Manager                   │
│                                     │
│   Job title matches target          │
└─────────────────────────────────────┘
```

### After (Compact):
```
┌─────────────────────────────────────┐
│ ✓ Target Title                      │
│   Target Title: Senior PM, Lead PM  │
│   This job: Product Manager         │
└─────────────────────────────────────┘
```

## Edge Cases Handled

1. **Missing job value:** Shows "Unknown" instead of hiding the field
2. **Redundant evidence:** Filters out obvious statements like "matches target"
3. **Manual verification:** Still shows when needed
4. **Unique evidence:** Preserves non-redundant insights (e.g., "Based on location section...")

## Testing

**To verify:**
1. Hover over "MATCH WITH GOALS" badge
2. Check each goal card uses the new compact format:
   - `{Goal Type}: {User Value}`
   - `This job: {Job Value or "Unknown"}`
3. Verify spacing is tighter and easier to scan
4. Check that unique evidence still appears (if any)

## Files Modified
- `src/components/cover-letters/GoalMatchCard.tsx` - Updated normal state display format

