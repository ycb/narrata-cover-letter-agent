# Gap Visibility Design - Dashboard & User Menu

**Status:** Design Phase  
**Goal:** Provide clear visibility of gaps across all content types with roll-up views

---

## A) New User Dashboard > Total Gaps + Gaps Per Content Type

### Design Questions

1. **Dashboard Placement**
   - Should gap summary appear on:
     - `NewUserDashboard.tsx` (onboarding) - ✅ Yes, users need to know what needs attention
     - `Dashboard.tsx` (post-onboarding) - ✅ Yes, ongoing visibility
     - Both? - ✅ Yes, but different messaging/placement
   - **Recommendation**: Both, with onboarding dashboard showing it more prominently as a task

2. **Card Design & Placement**
   - Should it be:
     - A dedicated "Content Quality" card (like StatsCard pattern)?
     - Part of the "Onboarding Progress" card?
     - A separate alert/warning banner?
   - **Recommendation**: Dedicated card above or alongside StatsCards, with warning styling if gaps exist

3. **Gap Breakdown Granularity**
   - Should we show:
     - By entity_type only (stories, saved sections, role descriptions)?
     - By gap_category (missing_metrics, incomplete_story, etc.)?
     - By severity (high/medium/low)?
     - By content type AND severity?
   - **Recommendation**: Primary by entity_type (what content needs fixing), with severity indicators

4. **Navigation & Actions**
   - When clicking on gap counts, should we:
     - Navigate to filtered table view (e.g., `/show-all-stories?filter=gap-detected`)?
     - Navigate to Work History with gap filter applied?
     - Open a dedicated "Review Gaps" page?
   - **Recommendation**: Navigate to filtered table view or Work History with appropriate filter

5. **Real-time Updates**
   - Should gaps update:
     - On page load only?
     - With polling/refresh?
     - Via real-time subscriptions?
   - **Recommendation**: On page load + manual refresh button, polling for MVP

6. **Empty State**
   - When no gaps exist, should we:
     - Hide the card entirely?
     - Show a success state ("All content looks great!")?
   - **Recommendation**: Show success state card - positive reinforcement

---

## B) Alert in User Profile Menu

### Design Questions

1. **Badge Design**
   - Should we show:
     - Notification dot (red/orange) when gaps exist?
     - Count badge (e.g., "5") on avatar?
     - Both (dot + count)?
   - **Recommendation**: Count badge (or "9+") on avatar, matching warning color

2. **Badge Placement**
   - Should badge be:
     - On the avatar image itself (top-right corner)?
     - On the menu trigger button?
     - Both?
   - **Recommendation**: On avatar (top-right corner), like notification badges

3. **Menu Item**
   - Should we add:
     - "Review Gaps (5)" menu item with count?
     - "Content Quality" section in menu?
     - Both?
   - **Recommendation**: "Review Gaps" menu item with count badge, positioned above separator

4. **Badge Behavior**
   - Should badge show:
     - Exact count always?
     - "9+" if count > 9?
     - Just presence indicator if count > threshold?
   - **Recommendation**: Exact count if ≤ 9, "9+" if > 9

5. **Performance**
   - Should gap count be:
     - Fetched on every render?
     - Cached with TTL?
     - Only fetched when menu opens?
   - **Recommendation**: Cached with 30-60s TTL, refresh on menu open

---

## Design Ideas & Recommendations

### A) Dashboard Gap Summary - Ranked List Widget

**Design Pattern**: Ranked list widget (not a card - cards are for individual content items)

**When Gaps Exist**:
```
┌─────────────────────────────────────┐
│ Content Quality                     │
│ 12 gaps detected                    │
│                                     │
│ 1. High Priority (5)               │
│    • Stories: 3                     │
│    • Role Descriptions: 2           │
│                                     │
│ 2. Medium Priority (4)              │
│    • Stories: 2                     │
│    • Saved Sections: 2             │
│                                     │
│ 3. Low Priority (3)                 │
│    • Role Metrics: 2                │
│    • Cover Letter Sections: 1       │
│                                     │
│ [Review All Gaps →]                │
└─────────────────────────────────────┘
```

**When No Gaps**:
```
┌─────────────────────────────────────┐
│ Content Quality                     │
│ ✓ All content looks great!          │
│                                     │
│ You've addressed all identified     │
│ gaps in your content.               │
└─────────────────────────────────────┘
```

**Implementation Notes**:
- Use a section/widget (not Card component - cards are for individual items)
- Ranked list by severity (high → medium → low)
- Each severity group shows content type breakdown
- Clickable items navigate to filtered table views
- Success state when no gaps
- Matches existing dashboard module patterns

### B) User Menu Badge

**Design Pattern**: Standard notification badge pattern

```
┌─────────────────────┐
│ [Avatar] [5]        │ ← Badge on avatar
│ User Name           │
│ user@email.com      │
└─────────────────────┘
         ↓
┌──────────────────┐
│ My Data          │
│ My Goals         │
│ My Voice         │
│ Review Gaps (5)  │ ← Menu item with count
│ ──────────────   │
│ Log out          │
└──────────────────┘
```

**Implementation Notes**:
- Badge component: `Badge` with `variant="destructive"` or custom warning style
- Position: `absolute top-0 right-0` on avatar container
- Menu item: Show count badge, navigate to filtered view or dedicated gaps page

---

## Implementation Plan

### Phase 1: Gap Summary Service Method

**File**: `src/services/gapDetectionService.ts`

```typescript
interface GapSummary {
  total: number;
  byContentType: {
    stories: number;
    savedSections: number;
    roleDescriptions: number;
    roleMetrics: number;
    coverLetterSections?: number;
  };
  bySeverity: {
    high: number;
    medium: number;
    low: number;
  };
}

static async getGapSummary(userId: string): Promise<GapSummary> {
  // Query gaps with resolved = false
  // Group by entity_type and severity
  // Return aggregated counts
}
```

### Phase 2: Dashboard Ranked List Widget

**File**: `src/components/dashboard/GapSummaryWidget.tsx` (new)

**Props**:
- `gapSummary: GapSummary`
- `onReviewGaps?: () => void` - Navigate to dashboard (for user menu)
- `onNavigateToContent?: (contentType: string, severity?: string) => void` - Navigate to filtered views

**Features**:
- Ranked list by severity (high → medium → low)
- Each severity group shows content type breakdown with counts
- Clickable items navigate to filtered table views
- Success state when no gaps
- Matches existing dashboard module patterns (similar to TopRolesTargeted card)

### Phase 3: User Menu Integration

**File**: `src/components/layout/Header.tsx`

**Changes**:
- Fetch gap summary on mount (cached with TTL)
- Add badge to avatar when `totalGaps > 0` (count or "9+")
- Add single "Review Gaps" CTA menu item that navigates to dashboard
- Badge: exact count if ≤9, "9+" if >9

### Phase 4: Navigation & Filtering

**Strategy**: 
- Dashboard widget shows ranked list with clickable items
- Clicking a gap count/item navigates to filtered table view (e.g., `/show-all-stories?filter=gap-detected&severity=high`)
- User menu CTA links to dashboard (where user can see full gap summary)
- No dedicated gaps page needed for MVP
- Table view filtering is TBD (leverage existing infrastructure)

---

## Questions for Discussion

1. **Dashboard Placement Priority**
   - Should gap summary be more prominent on onboarding dashboard vs. main dashboard?
   - Should it be dismissible/dismissible after onboarding?

2. **Gap Severity Display**
   - Should we show severity breakdown in the summary card?
   - Should "Review Gaps" prioritize high-severity gaps?

3. **Navigation Strategy**
   - Do we want a dedicated `/gaps` page, or use filtered table views?
   - Should clicking a gap count navigate to that specific content item?

4. **Refresh Strategy**
   - Should gap counts update automatically when gaps are resolved/dismissed?
   - Should we use Supabase real-time subscriptions for live updates?

5. **Cover Letter Sections**
   - Should cover letter section gaps be included in the summary?
   - (Note: Gap detection not yet implemented for cover letters)

6. **Performance Considerations**
   - Should we cache gap summary with TTL?
   - Should we lazy-load gap summary (only when dashboard/menu is visible)?

7. **User Experience**
   - Should we show a "You're all set!" message when no gaps exist?
   - Should gap summary be collapsible/expandable?

---

## Next Steps

1. **Confirm design decisions** based on questions above
2. **Implement `getGapSummary()` method** in gapDetectionService
3. **Create `GapSummaryCard` component** with conditional styling
4. **Integrate into Dashboard.tsx and NewUserDashboard.tsx**
5. **Add badge and menu item** to Header.tsx
6. **Implement navigation** to filtered views
7. **Add refresh/update mechanisms** for real-time updates

---

## Files to Create/Modify

### New Files
- `src/components/dashboard/GapSummaryWidget.tsx` - Ranked list widget component

### Modified Files
- `src/services/gapDetectionService.ts` - Add `getGapSummary()` method with caching
- `src/pages/NewUserDashboard.tsx` - Add GapSummaryWidget (primary focus)
- `src/pages/Dashboard.tsx` - Add GapSummaryWidget (secondary)
- `src/components/layout/Header.tsx` - Add badge to avatar and "Review Gaps" menu item (navigates to dashboard)
- `src/hooks/useGapSummary.ts` (new) - Hook for fetching and caching gap summary

