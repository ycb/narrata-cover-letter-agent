# Bug Fix: "Set Career Goals" Button Does Nothing

## Problem
User reported: "clicking set Career Goals button doesn't do anything"

The button in the goals tooltip displayed "Set Career Goals" but was just a placeholder `console.log` with no actual functionality.

## Root Cause
The `onEditGoals` handler in `CoverLetterCreateModal.tsx` was a TODO placeholder:

```typescript
onEditGoals={() => {
  // TODO: Open goals modal
  console.log('Open goals modal');
}}
```

## Solution Implemented

### 1. Added UserGoalsModal Component & Context

**Imports Added:**
```typescript
import { UserGoalsModal } from '@/components/user-goals/UserGoalsModal';
import { useUserGoals } from '@/contexts/UserGoalsContext';
```

### 2. Added State for Goals Modal

```typescript
const { goals, setGoals } = useUserGoals();
const [showGoalsModal, setShowGoalsModal] = useState(false);
```

### 3. Wired Up the CTA Handler

**Before:**
```typescript
onEditGoals={() => {
  // TODO: Open goals modal
  console.log('Open goals modal');
}}
```

**After:**
```typescript
onEditGoals={() => setShowGoalsModal(true)}
```

### 4. Added UserGoalsModal Component

Added the modal at the end of the Dialog (before closing `</Dialog>` tag):

```typescript
{/* User Goals Modal */}
<UserGoalsModal
  isOpen={showGoalsModal}
  onClose={() => setShowGoalsModal(false)}
  onSave={async (updatedGoals) => {
    await setGoals(updatedGoals);
    setShowGoalsModal(false);
  }}
  initialGoals={goals || undefined}
/>
```

## How It Works Now

1. **User hovers over "MATCH WITH GOALS" badge** → Tooltip appears
2. **User clicks "Set Career Goals" button** → Goals modal opens
3. **User edits their goals** → Form is populated with current values
4. **User clicks "Save"** → Goals are saved to Supabase via `setGoals`
5. **Modal closes** → User returns to cover letter creation

## Benefits

✅ **Functional CTA**: Button now actually opens the goals modal
✅ **Seamless UX**: Modal opens without leaving the cover letter creation flow
✅ **Real-time Update**: Goals changes are persisted immediately
✅ **Pre-populated Form**: Existing goals are loaded into the form automatically
✅ **Context-aware**: Uses the same goals context as the rest of the app

## Testing

### Test Steps:
1. Open cover letter creation modal
2. Generate a draft (so metrics appear)
3. Hover over "MATCH WITH GOALS" badge
4. Click "Set Career Goals" button in tooltip
5. **Verify:** Goals modal opens
6. Edit any goal (e.g., change target title)
7. Click "Save"
8. **Verify:** Modal closes
9. Re-open tooltip
10. **Verify:** Updated goals are reflected in the match data (after regenerating draft)

## Files Modified

- `src/components/cover-letters/CoverLetterCreateModal.tsx`
  - Added `UserGoalsModal` and `useUserGoals` imports
  - Added `showGoalsModal` state
  - Wired up `onEditGoals` handler to open modal
  - Added `UserGoalsModal` component at end of Dialog

## Related Work

This completes the goals CTA wiring. Still TODO:
- [ ] Wire up "Add Story" CTA → Story creation modal
- [ ] Wire up "Enhance Section" CTA → HIL content flow
- [ ] Wire up "Add Metrics" CTA → Metrics addition flow

All CTAs follow the same pattern:
1. Add modal component import
2. Add state for modal visibility
3. Wire up handler to set state
4. Render modal component with appropriate props

