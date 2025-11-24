# Match Metrics Toolbar Integration Plan

## Overview
Replace `ProgressIndicatorWithTooltips` with `MatchMetricsToolbar` in both Edit and Create Cover Letter flows.

## Current State Analysis

### Files Using ProgressIndicatorWithTooltips:
1. **`src/components/cover-letters/CoverLetterDraftView.tsx`** (line 295)
   - Used by both Edit and Create modals
   - Currently renders as horizontal bar above sections
   - Props: metrics, isPostHIL, goNoGoAnalysis, jobDescription, enhancedMatchData, callbacks

2. **`src/components/cover-letters/CoverLetterCreateModal.tsx`** (line 809)
   - Direct usage in draft tab
   - Same props structure

### Layout Changes Required:
- **Current**: Horizontal bar above content (grid layout)
- **New**: Left sidebar + right content area (like MatchMetricsPreview)

## Integration Steps

### Phase 1: Update CoverLetterDraftView.tsx

**File**: `src/components/cover-letters/CoverLetterDraftView.tsx`

**Changes**:
1. Replace import:
   ```tsx
   // OLD
   import { ProgressIndicatorWithTooltips } from './ProgressIndicatorWithTooltips';
   
   // NEW
   import { MatchMetricsToolbar } from './MatchMetricsToolbar';
   ```

2. Update layout structure (lines 291-306):
   ```tsx
   // OLD: Vertical stack
   <div className={cn('space-y-6', className)}>
     <ProgressIndicatorWithTooltips ... />
     {sections.map(...)}
   </div>
   
   // NEW: Sidebar + content layout
   <div className={cn('flex h-full overflow-hidden', className)}>
     {/* Left Sidebar - Toolbar */}
     <div className="border-r bg-card flex-shrink-0">
       <MatchMetricsToolbar
         metrics={hilProgressMetrics}
         isPostHIL={hilCompleted}
         isLoading={false}
         goNoGoAnalysis={goNoGoAnalysis}
         jobDescription={jobDescription}
         enhancedMatchData={enhancedMatchData}
         onEditGoals={onEditGoals}
         onEnhanceSection={onEnhanceSection}
         onAddMetrics={onAddMetrics}
         className="h-full border-0"
       />
     </div>
     
     {/* Right Content Area */}
     <div className="flex-1 overflow-y-auto">
       {sections.map(...)}
     </div>
   </div>
   ```

3. **Props mapping**: All props are compatible (same interface)

### Phase 2: Update CoverLetterCreateModal.tsx

**File**: `src/components/cover-letters/CoverLetterCreateModal.tsx`

**Changes**:
1. Replace import (line 55):
   ```tsx
   // OLD
   import { ProgressIndicatorWithTooltips } from './ProgressIndicatorWithTooltips';
   
   // NEW
   import { MatchMetricsToolbar } from './MatchMetricsToolbar';
   ```

2. Update layout in `renderDraftTab()` (around line 689-831):
   - Current: Metrics bar above sections in vertical stack
   - New: Sidebar + content layout similar to Phase 1
   
   ```tsx
   // Wrap draft content in flex layout
   <div className="flex h-full overflow-hidden">
     {/* Left Sidebar */}
     <div className="border-r bg-card flex-shrink-0">
       <MatchMetricsToolbar
         metrics={hilMetrics}
         isPostHIL={false}
         isLoading={metricsLoading}
         enhancedMatchData={draft.enhancedMatchData}
         goNoGoAnalysis={undefined}
         jobDescription={normalizedJobDescription ?? undefined}
         onEditGoals={() => setShowGoalsModal(true)}
         onEnhanceSection={(sectionId, requirement) => {
           // TODO: Implement
         }}
         onAddMetrics={(sectionId) => {
           // TODO: Implement
         }}
         className="h-full border-0"
       />
     </div>
     
     {/* Right Content */}
     <div className="flex-1 overflow-y-auto">
       {/* Existing sections rendering */}
     </div>
   </div>
   ```

### Phase 3: Update CoverLetterEditModal.tsx

**File**: `src/components/cover-letters/CoverLetterEditModal.tsx`

**Changes**:
1. The Edit modal uses `CoverLetterDraftView`, so changes in Phase 1 will automatically apply
2. **Verify layout**: Ensure DialogContent can accommodate sidebar layout
   - Current: `max-w-6xl h-[90vh] overflow-y-auto flex flex-col`
   - May need: Adjust to allow flex row layout for sidebar + content

3. **Update TabsContent layout** (line 177):
   - Remove `space-y-6` from TabsContent since CoverLetterDraftView now handles its own layout
   - Ensure proper height constraints

### Phase 4: Handle Container Heights

**Issue**: Modals/dialogs need proper height constraints for sidebar scrolling

**Solution**:
1. **CoverLetterEditModal**: 
   - DialogContent already has `h-[90vh]` - ensure flex children respect this
   - TabsContent should use `flex-1 min-h-0` to enable scrolling

2. **CoverLetterCreateModal**:
   - Check parent container height constraints
   - Ensure draft tab content area has proper overflow handling

### Phase 5: Remove onAddStory Prop (if not needed)

**Note**: `MatchMetricsToolbar` doesn't have `onAddStory` prop (only `onEnhanceSection` and `onAddMetrics`)
- Check if `onAddStory` is still needed or if it's handled elsewhere
- May need to add it to MatchMetricsToolbar if required

## Testing Checklist

- [ ] Edit modal: Toolbar appears on left, content scrolls on right
- [ ] Create modal: Toolbar appears on left, draft sections scroll on right
- [ ] All 5 metrics expand/collapse correctly
- [ ] Goals drawer: "Edit Goals" button opens goals modal
- [ ] Requirements drawers: "Enhance" and "Add Metrics" buttons work
- [ ] Loading states display correctly
- [ ] Post-HIL states show correct checkmarks/X's
- [ ] No layout overflow or cutoff issues
- [ ] Responsive behavior (mobile/tablet)

## Rollback Plan

If issues arise:
1. Revert imports back to `ProgressIndicatorWithTooltips`
2. Restore original layout structure
3. Keep `MatchMetricsToolbar` as separate component for future use

## Files to Modify

1. ✅ `src/components/cover-letters/CoverLetterDraftView.tsx`
2. ✅ `src/components/cover-letters/CoverLetterCreateModal.tsx`
3. ⚠️ `src/components/cover-letters/CoverLetterEditModal.tsx` (may need layout adjustments)

## Dependencies

- `MatchMetricsToolbar` component (already exists)
- `useMatchMetricsDetails` hook (already shared)
- All callback handlers (already exist)

## Estimated Effort

- Phase 1: 15 minutes
- Phase 2: 15 minutes  
- Phase 3: 10 minutes
- Phase 4: 10 minutes
- Testing: 20 minutes

**Total**: ~70 minutes

