# Gap Detection Improvements

This document outlines three gap detection improvements to be implemented before continuing with the MVP build.

## Overview

Gap detection is currently functional for:
- ✅ Stories (work history)
- ✅ Saved sections
- ✅ Role descriptions
- ✅ Role-level metrics
- ✅ Cover letter sections (basic implementation)

## Improvements to Implement

### 1. Visibility Enhancements

#### 1A. New User Dashboard > Total Gaps + Gaps Per Content Type

**Location**: Dashboard/Onboarding dashboard

**Requirements**:
- Display total count of unresolved gaps across all content types
- Break down by content type:
  - Stories (work history)
  - Saved sections
  - Role descriptions
  - Role-level metrics
  - Cover letter sections (if applicable)
- Visual indicator (badge/alert) showing gap count
- Clicking should navigate to the appropriate section or filtered view

**Implementation Notes**:
- Query `gaps` table: `WHERE user_id = ? AND resolved = false`
- Group by `entity_type`:
  - `approved_content` → Stories/Saved sections
  - `work_items` → Role descriptions/metrics
  - `saved_sections` → Cover letter sections
- Count distinct `entity_id` per type to get unique items with gaps
- Consider caching this data with refresh triggers

**Files to Create/Modify**:
- `src/components/dashboard/GapSummaryCard.tsx` (new)
- `src/pages/Dashboard.tsx` or relevant onboarding dashboard component
- `src/services/gapDetectionService.ts` - add `getGapSummary(userId)` method

**Example UI**:
```
┌─────────────────────────────────────┐
│ Content Quality                    │
│ 12 gaps detected                   │
│                                     │
│ • Stories: 5                        │
│ • Saved Sections: 3                 │
│ • Role Descriptions: 2              │
│ • Role Metrics: 2                   │
│                                     │
│ [Review All Gaps →]                │
└─────────────────────────────────────┘
```

#### 1B. Alert in User Profile Menu

**Location**: User menu dropdown (top right)

**Requirements**:
- Small badge/indicator on user menu icon if gaps exist
- Badge should show gap count (or just presence indicator if count > 10)
- Clicking menu should highlight gap-related items
- Option: Add a dedicated "Review Gaps" menu item

**Implementation Notes**:
- Use same gap summary query as 1A
- Show badge only when `totalGaps > 0`
- Badge color: warning/orange to match gap banner styling
- Consider performance: this query should be lightweight/cached

**Files to Create/Modify**:
- `src/components/layout/UserMenu.tsx` or user menu component
- Reuse gap summary logic from `gapDetectionService.ts`

**Example UI**:
```
User Avatar [🔴] (red dot if gaps exist)
  ↓
┌──────────────────┐
│ Profile          │
│ Settings         │
│ Review Gaps (5)  │ ← New item with count
│ ──────────────   │
│ Sign Out         │
└──────────────────┘
```

---

### 2. Apply Card Component to Cover Letter Draft

**Current State**:
- Cover letter draft sections exist but don't use the standard `ContentCard` component
- Gap detection may be partially implemented for cover letter sections
- Tags are not currently shown/used in cover letter drafts

**Requirements**:
- Apply `ContentCard` component to cover letter draft sections
- Show gap banners when gaps are detected (using `ContentGapBanner`)
- Display tags on each section card
- Tags should indicate which requirements the content addresses
- Maintain inline editing capability for cover letter content

**Implementation Notes**:
- Review current cover letter draft implementation:
  - `src/components/cover-letters/CoverLetterCreateModal.tsx`
  - `src/components/cover-letters/CoverLetterEditModal.tsx`
- Ensure gap detection runs for cover letter sections
- Map cover letter sections to saved sections in database
- Tags structure:
  - Source: Could be extracted from job description requirements
  - Could be auto-suggested based on content analysis
  - User can manually add/remove tags
- Use same tag component/suggestion flow as stories

**Files to Create/Modify**:
- `src/components/cover-letters/CoverLetterCreateModal.tsx`
- `src/components/cover-letters/CoverLetterEditModal.tsx`
- `src/components/cover-letters/CoverLetterSectionCard.tsx` (new wrapper, or extend ContentCard)
- `src/services/gapDetectionService.ts` - ensure cover letter section gaps are detected
- `src/services/contentService.ts` - handle tags for cover letter sections

**Design Considerations**:
- Cover letter sections may have different metadata than stories (e.g., section type: intro, body, closing)
- Tags could indicate which job requirements are addressed:
  - Example: "SQL Experience", "Product Management", "Data Analysis"
- Gap detection should align with job requirements if available

**Example UI**:
```
┌─────────────────────────────────────┐
│ INTRODUCTION                        │
│ [Overflow Menu]                     │
│                                     │
│ Used 2 times                        │
│                                     │
│ [Content text here...]              │
│                                     │
│ Tags:                               │
│ [SQL] [PM Experience] [Data]       │
│ [+ Auto-suggest tags]               │
│                                     │
│ ─────────────────────────────────  │
│ [⚠️] Gap Detected                   │
│ Missing quantified metrics           │
│ [Generate Content]                 │
└─────────────────────────────────────┘
```

---

### 3. Gap Dismissal and Filtering

**Current Issue**:
- When a gap is dismissed in Work History, it is marked as `resolved = true` in the database
- However, the "All Stories" table view filter for "No gaps" does not correctly exclude dismissed gaps
- Users expect to filter by "No gaps" and see items where gaps have been dismissed

**Root Cause Analysis Needed**:
1. Check how gaps are fetched for table view filtering
2. Verify that `resolved = true` gaps are excluded from gap detection queries
3. Ensure `hasGaps` property is correctly updated when gaps are dismissed
4. Check if gap dismissal triggers a refresh of the table view data

**Requirements**:
- When a gap is dismissed (marked `resolved = true`):
  - The gap should not count toward "has gaps" for that content item
  - Filtering by "No gaps" should include items with only resolved/dismissed gaps
  - Filtering by "Gap detected" should only show items with unresolved gaps
- Dismissal should immediately update the table view (if open)
- Gap count should update in real-time when dismissing gaps

**Implementation Notes**:

**File: `src/pages/ShowAllStories.tsx`**
- Check `fetchStories` function - ensure it queries gaps with `resolved = false`
- Verify `storyGapsMap` only includes unresolved gaps
- Ensure `hasGaps` property is set based on unresolved gaps only

**File: `src/components/shared/ShowAllTemplate.tsx`**
- Verify gap filter logic correctly checks `hasGaps` property
- Filter should work as:
  - "Gap detected" → `hasGaps === true`
  - "No gaps" → `hasGaps === false || hasGaps === undefined`

**File: `src/components/work-history/WorkHistoryDetail.tsx`**
- When gap is dismissed via `handleResolveGap`:
  - Should trigger a refresh of parent component data
  - Parent should refetch gaps to update UI
  - If table view is open, it should refresh

**Database Queries to Verify**:
```sql
-- Gaps query should exclude resolved
SELECT * FROM gaps 
WHERE user_id = ? 
  AND entity_type = 'approved_content'
  AND resolved = false;  -- ✅ Must be false

-- Gap count per content item
SELECT entity_id, COUNT(*) as gap_count
FROM gaps
WHERE user_id = ?
  AND entity_type = 'approved_content'
  AND resolved = false
GROUP BY entity_id;
```

**Files to Modify**:
- `src/pages/ShowAllStories.tsx` - Fix gap filtering logic
- `src/components/shared/ShowAllTemplate.tsx` - Verify filter implementation
- `src/components/work-history/WorkHistoryDetail.tsx` - Ensure dismissal triggers refresh
- `src/components/work-history/WorkHistory.tsx` - Ensure parent refreshes on gap dismissal
- `src/services/gapDetectionService.ts` - Verify gap queries exclude resolved

**Testing Scenarios**:
1. Dismiss a gap in Work History → Switch to table view → Filter "No gaps" → Item should appear
2. Dismiss a gap in table view modal → Filter should update immediately
3. Dismiss all gaps for an item → "No gaps" filter should include it
4. Dismiss some but not all gaps → "Gap detected" filter should still show it

---

## Implementation Order

Recommended sequence:
1. **#3 (Gap Dismissal and Filtering)** - Fix existing functionality first
2. **#1 (Visibility Enhancements)** - Add dashboard and menu indicators
3. **#2 (Cover Letter Draft Cards)** - Apply standard component pattern

## Dependencies

- Existing gap detection infrastructure (`gapDetectionService.ts`)
- `ContentCard` component (already created)
- `ContentGapBanner` component (already created)
- Database schema: `gaps` table with `resolved` boolean field

## Related Files

### Existing Components
- `src/components/shared/ContentCard.tsx` - Standard card component
- `src/components/shared/ContentGapBanner.tsx` - Gap banner component
- `src/components/work-history/WorkHistoryDetail.tsx` - Work history detail view
- `src/pages/ShowAllStories.tsx` - Table view for stories
- `src/components/shared/ShowAllTemplate.tsx` - Generic table template

### Services
- `src/services/gapDetectionService.ts` - Gap detection logic
- `src/services/fileUploadService.ts` - May need updates for gap detection triggers

### Database
- `supabase/migrations/` - Check for `gaps` table schema
- Table: `gaps` with columns: `id`, `user_id`, `entity_type`, `entity_id`, `gap_type`, `gap_category`, `severity`, `description`, `suggestions`, `resolved`, `created_at`

## Questions to Resolve

1. **Cover Letter Tags**: Should tags be extracted from job description requirements automatically, or manually added by user?
2. **Gap Summary Caching**: Should gap counts be cached with TTL, or always fresh?
3. **Dashboard Location**: Which dashboard component should display gap summary? (Onboarding vs. Main dashboard)
4. **Menu Badge**: Should badge show exact count or just indicator if count > threshold (e.g., "9+")?
5. **Cover Letter Gap Types**: Are there cover-letter-specific gap types beyond story completeness and metrics?

## Acceptance Criteria

### #1 Visibility
- [ ] Dashboard shows total gap count
- [ ] Dashboard breaks down gaps by content type
- [ ] User menu shows gap indicator when gaps exist
- [ ] Clicking gap indicators navigates to appropriate view
- [ ] Gap counts update in real-time when gaps are resolved

### #2 Cover Letter Cards
- [ ] Cover letter sections use `ContentCard` component
- [ ] Gap banners appear on sections with gaps
- [ ] Tags are displayed and editable on each section
- [ ] Tags indicate which requirements content addresses
- [ ] "Generate Content" works for cover letter sections
- [ ] Gap detection runs for cover letter sections

### #3 Gap Dismissal & Filtering
- [ ] Dismissed gaps don't count toward "has gaps"
- [ ] "No gaps" filter includes items with only dismissed gaps
- [ ] "Gap detected" filter excludes items with only dismissed gaps
- [ ] Filter updates immediately after dismissing gaps
- [ ] Table view refreshes when gaps are dismissed in Work History

## Notes

- All gap detection improvements should maintain consistency with existing design system
- Use existing `ContentCard` and `ContentGapBanner` components where possible
- Follow DRY principles - avoid duplicating gap detection/display logic
- Consider performance implications of gap queries, especially for dashboard summaries

