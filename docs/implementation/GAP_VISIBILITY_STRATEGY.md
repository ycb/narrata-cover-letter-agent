# Gap Visibility Strategy - Redesign

**Status:** Strategy & Planning  
**Goal:** Provide actionable gap visibility with ranked list of individual content items to review

---

## Problem Statement

The current design has a fundamental conceptual flaw:

1. **Shows content type counts** (e.g., "27 stories") which doesn't help users understand WHAT to act on
2. **Navigates to filtered table views** which just kicks the can - users still see a list, not a resolution point
3. **Doesn't answer two critical questions:**
   - **What to act on?** - Which specific items need attention?
   - **Where to resolve?** - Direct link to the content item where resolution happens

---

## Core Requirements

### Two Actions Users Need:

1. **What to act on?**
   - Show **individual content items** with gaps (not just counts)
   - Ranked by priority (severity + gap count)
   - Grouped by content type (Work History, Saved Sections, etc.)

2. **Resolving the gap**
   - Link directly to **individual content items** where gaps can be resolved
   - Resolution happens at the content item level (via dismiss, edit, or LLM generation)
   - Not filtered table views (which just show another list)

---

## Design Strategy

### Ranked List of Individual Items with Severity Tabs

**Proposed Design:**
```
┌─────────────────────────────────────────┐
│ Content Quality                         │
│ 27 items need attention                 │
│                                         │
│ [High] [Medium] [Low]  ← Tabs          │
│                                         │
│ Work History                           │
│ ─────────────────────────────────────  │
│ 1. PM @ Acme: Role Summary             │
│    🔴 High Priority                     │
│    [Review →] → Work History Detail    │
│                                         │
│ 2. PM @ Acme: Summary Metrics          │
│    🔴 High Priority                     │
│    [Review →] → Work History Detail    │
│                                         │
│ 3. PM @ Acme: Improved Sales Messaging │
│    🔴 High Priority                     │
│    [Review →] → Story Detail           │
│                                         │
│ Cover Letter Saved Sections            │
│ ─────────────────────────────────────  │
│ 4. Cover Letter - Introduction         │
│    🔴 High Priority                     │
│    [Review →] → Cover Letter Edit      │
│                                         │
│ [View All →]                            │
└─────────────────────────────────────────┘
```

**Key Features:**
- **Severity Tabs**: Filter by High / Medium / Low priority
- List of **individual content items** (not gap categories)
- Each item shows:
  - **Work History Format**: "Role Title @ Company: Item Type"
    - "PM @ Acme: Role Summary" (role description gap)
    - "PM @ Acme: Summary Metrics" (role metrics gap)
    - "PM @ Acme: Story Title" (story gap)
  - **Cover Letter Format**: "Cover Letter - Section Name"
  - Severity indicator (🔴 High, 🟡 Medium, 🔵 Low)
  - "Review" button linking directly to that item
- **No gap count displayed** - users only care about items needing attention
- Grouped by content type (Work History, Cover Letter Saved Sections)
- Ranked within severity (high → medium → low)
- Clicking "Review" navigates to that specific item's detail view where they can see and resolve gaps

---

## Data Structure Needed

### Individual Content Item with Gaps

```typescript
interface ContentItemWithGaps {
  // Content identification
  entity_id: string;
  entity_type: 'approved_content' | 'work_item' | 'saved_section';
  
  // Content metadata
  display_title: string; // Formatted title: "PM @ Acme: Role Summary" or "Cover Letter - Introduction"
  role_title?: string; // For work items: "PM"
  company_name?: string; // For work items: "Acme"
  item_type?: 'role_summary' | 'role_metrics' | 'story' | 'cover_letter_section';
  story_title?: string; // For story items: "Improved Sales Messaging"
  section_title?: string; // For saved sections: "Introduction"
  
  // Gap information
  max_severity: 'high' | 'medium' | 'low'; // Highest severity gap (used for tab filtering)
  gap_categories: string[]; // List of gap categories for this item
  
  // Navigation
  content_type_label: 'Work History' | 'Cover Letter Saved Sections';
  navigation_path: string; // Route to this item's detail view
  navigation_params: Record<string, string>; // Query params (storyId, roleId, sectionId, etc.)
}

interface GapSummaryByItem {
  total: number;
  byContentType: {
    workHistory: ContentItemWithGaps[];
    savedSections: ContentItemWithGaps[];
    stories?: ContentItemWithGaps[]; // If we want separate stories section
  };
}
```

### Service Method

```typescript
static async getContentItemsWithGaps(userId: string): Promise<GapSummaryByItem> {
  // 1. Query all unresolved gaps for user
  // 2. Group gaps by entity_id + entity_type
  // 3. For each unique entity, fetch:
  //    - Content metadata (title, subtitle, etc.)
  //    - Gap count and severities
  //    - Gap categories
  // 4. Build navigation paths based on entity_type
  // 5. Rank by severity (high → medium → low), then by gap count
  // 6. Group by content type
  // 7. Return ranked list
}
```

---

## UI Design

### Widget Architecture

**Multiple Focused Widgets** (instead of single unified widget):

1. **Gap Summary Widget** - Overview metrics (total gaps, gaps per content type, gaps by severity)
2. **Work History Widget** - Ranked list of work history items with gaps
3. **Cover Letter Saved Sections Widget** - Ranked list of saved sections with gaps
4. **Cover Letter Widget** - (Future: cover letter creation tracking)

**Note:** Onboarding Progress (task completion: "0 of 9 tasks completed") is a **separate** concept from Gap Summaries. These are distinct widgets.

**Integration with Existing 2x2 Grid:**
- Keep existing task categories in 2x2 grid
- Enhance category cards with gap badges and counts
- Add dedicated gap widgets below or alongside

### Gap Summary Widget

```
┌─────────────────────────────────────────┐
│ Content Quality                         │
│ ─────────────────────────────────────  │
│ Total Gaps: 27                          │
│                                         │
│ Gaps by Content Type:                  │
│ [Work History] 18                       │
│ [Saved Sections] 9                     │
│                                         │
│ Gaps by Severity:                      │
│ [High] 12  [Medium] 10  [Low] 5        │
└─────────────────────────────────────────┘
```

**Features:**
- Total gap count
- Badges for content types (Work History, Saved Sections)
- Badges for severity levels (High, Medium, Low)
- Clickable badges to filter/navigate to respective widgets

### Work History Widget

```
┌─────────────────────────────────────────┐
│ Work History                            │
│ [High] [Medium] [Low]  ← Tabs          │
│                                         │
│ 1. PM @ Acme: Role Summary             │
│    🔴 High Priority                     │
│    [Review →]                          │
│                                         │
│ 2. PM @ Acme: Summary Metrics          │
│    🔴 High Priority                     │
│    [Review →]                          │
│                                         │
│ 3. PM @ Acme: Improved Sales Messaging│
│    🔴 High Priority                     │
│    [Review →]                          │
│                                         │
│ [View All →]                            │
└─────────────────────────────────────────┘
```

### Cover Letter Saved Sections Widget

```
┌─────────────────────────────────────────┐
│ Cover Letter Saved Sections            │
│ [High] [Medium] [Low]  ← Tabs          │
│                                         │
│ 1. Cover Letter - Introduction         │
│    🔴 High Priority                     │
│    [Review →]                          │
│                                         │
│ 2. Cover Letter - Experience           │
│    🟡 Medium Priority                   │
│    [Review →]                          │
│                                         │
│ [View All →]                            │
└─────────────────────────────────────────┘
```

### Enhanced 2x2 Grid Cards

**Existing Categories Enhanced with Badges:**

```
┌─────────────────────────────────────┐
│ Review Work History                  │
│ [Work History] 18  [High] 12        │
│ ─────────────────────────────────── │
│ ✓ Add/revise Metrics                │
│ ✓ Add/revise core Stories           │
│ [Review Work History →]             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Review Cover Letter Template        │
│ [Saved Sections] 9  [High] 5        │
│ ─────────────────────────────────── │
│ ✓ Customize your Template           │
│ ✓ Add/revise Saved Sections         │
│ [Review Template →]                 │
└─────────────────────────────────────┘
```

**Design Notes:**
- **Badges for Content Types**: Visual indicators for Work History, Saved Sections
  - Use distinct colors/icons to reinforce Information Architecture
  - Show gap count on badge
- **Severity Badges**: Show severity breakdown on category cards
- **Severity Tabs**: Filter list by High / Medium / Low priority (within each widget)
- Numbered list (1, 2, 3...) for ranking within severity
- **Work History format**: "Role Title @ Company: Item Type"
  - Item types: "Role Summary", "Summary Metrics", or story title
- **Cover Letter format**: "Cover Letter - Section Name"
- Each item shows:
  - Display title (formatted as above)
  - Severity indicator (color/icon) - **NO gap count**
  - "Review" button
- Limit to top N items (e.g., 10) with "View All" option
- Clicking "Review" navigates to that specific item's detail view where gaps are visible

---

## Navigation Strategy

### Route Patterns

**For Stories (approved_content):**
```
/show-all-stories?storyId={entity_id}
→ Opens story detail modal/view
→ Gap banners visible on that story
```

**For Work Items:**
```
/work-history?companyId={company_id}&roleId={entity_id}
→ Opens work history detail view
→ Gap banners visible on that role
```

**For Saved Sections:**
```
/cover-letter-template?sectionId={entity_id}
→ Opens cover letter section with gap banner
```

### Resolution Flow

1. User sees ranked list of items with gaps
2. Clicks "Review" on specific item
3. Navigates to that item's detail view
4. Gap banner(s) visible on that item
5. User can:
   - **Dismiss** gap (not a real issue)
   - **Edit** content manually
   - **Generate Content** via LLM (HIL)
6. After resolution, return to dashboard (list updates)

---

## Data Fetching Strategy

### For Work Items (work_item entity_type)

**Role Description Gaps:**
```sql
SELECT 
  g.entity_id,
  wi.title as role_title,
  c.name as company_name,
  MAX(g.severity) as max_severity,
  array_agg(DISTINCT g.gap_category) as gap_categories,
  'role_summary' as item_type
FROM gaps g
JOIN work_items wi ON g.entity_id = wi.id
LEFT JOIN companies c ON wi.company_id = c.id
WHERE g.user_id = ? AND g.resolved = false
  AND g.entity_type = 'work_item'
  AND g.gap_category IN ('missing_role_description', 'generic_role_description')
GROUP BY g.entity_id, wi.title, c.name, 'role_summary'
ORDER BY 
  CASE MAX(g.severity) 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END;
```

**Role Metrics Gaps:**
```sql
SELECT 
  g.entity_id,
  wi.title as role_title,
  c.name as company_name,
  MAX(g.severity) as max_severity,
  array_agg(DISTINCT g.gap_category) as gap_categories,
  'role_metrics' as item_type
FROM gaps g
JOIN work_items wi ON g.entity_id = wi.id
LEFT JOIN companies c ON wi.company_id = c.id
WHERE g.user_id = ? AND g.resolved = false
  AND g.entity_type = 'work_item'
  AND g.gap_category IN ('missing_role_metrics', 'insufficient_role_metrics')
GROUP BY g.entity_id, wi.title, c.name, 'role_metrics'
ORDER BY 
  CASE MAX(g.severity) 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END;
```

### For Stories (approved_content entity_type)

**Note:** Stories are linked to work items, so we need to join to get role + company info

```sql
SELECT 
  g.entity_id,
  ac.title as story_title,
  wi.title as role_title,
  c.name as company_name,
  MAX(g.severity) as max_severity,
  array_agg(DISTINCT g.gap_category) as gap_categories,
  'story' as item_type
FROM gaps g
JOIN approved_content ac ON g.entity_id = ac.id
LEFT JOIN work_items wi ON ac.work_item_id = wi.id
LEFT JOIN companies c ON wi.company_id = c.id
WHERE g.user_id = ? AND g.resolved = false
  AND g.entity_type = 'approved_content'
GROUP BY g.entity_id, ac.title, wi.title, c.name, 'story'
ORDER BY 
  CASE MAX(g.severity) 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END;
```

### For Saved Sections (saved_section entity_type)

**Note:** Saved sections are cover letter sections

```sql
SELECT 
  g.entity_id,
  ss.title as section_title,
  ss.type as section_type,
  MAX(g.severity) as max_severity,
  array_agg(DISTINCT g.gap_category) as gap_categories,
  'cover_letter_section' as item_type
FROM gaps g
JOIN saved_sections ss ON g.entity_id = ss.id
WHERE g.user_id = ? AND g.resolved = false
  AND g.entity_type = 'saved_section'
GROUP BY g.entity_id, ss.title, ss.type, 'cover_letter_section'
ORDER BY 
  CASE MAX(g.severity) 
    WHEN 'high' THEN 1 
    WHEN 'medium' THEN 2 
    WHEN 'low' THEN 3 
  END;
```

---

## Implementation Details

### Work History Item Formatting

**Display Title Format:** `"{Role Title} @ {Company Name}: {Item Type}"`

- **Role Summary**: `"PM @ Acme: Role Summary"`
  - Gap category: `missing_role_description` or `generic_role_description`
  - Entity: `work_item`
  
- **Summary Metrics**: `"PM @ Acme: Summary Metrics"`
  - Gap category: `missing_role_metrics` or `insufficient_role_metrics`
  - Entity: `work_item`
  
- **Story**: `"PM @ Acme: {Story Title}"`
  - Example: `"PM @ Acme: Improved Sales Messaging"`
  - Gap category: `missing_metrics`, `incomplete_story`, `too_generic`
  - Entity: `approved_content`

### Cover Letter Saved Sections Formatting

**Display Title Format:** `"Cover Letter - {Section Title}"`

- Example: `"Cover Letter - Introduction"`
- Entity: `saved_section`

### Severity Tabs

- **Tab Filtering**: Separate tabs for High / Medium / Low priority
- **Default Tab**: Show "High" tab by default
- **Tab Badge**: Show count of items in each severity level
- **Empty Tab State**: Show message when no items in that severity

### No Gap Count Display

- **Rationale**: Users only care about items needing attention, not how many gaps each has
- **Display**: Show severity indicator only (🔴 High, 🟡 Medium, 🔵 Low)
- **Gap Details**: Visible when user clicks "Review" and goes to item detail view

### List Limit

- **Recommendation**: Top 10 items per severity tab
- **"View All"**: Links to filtered table view showing all items of that severity

### Empty State

- Show success state when no gaps exist: "All content looks great!"
- Show per-tab empty state: "No {severity} priority items" when tab is empty

### Refresh Strategy

- Refresh immediately after resolving a gap
- Cache with 60s TTL otherwise
- Invalidate cache on gap resolution

---

## Next Steps

1. **Update `getContentItemsWithGaps()` method** in gapDetectionService
   - Query gaps grouped by entity
   - Join with content tables to get titles
   - Rank by severity and gap count
   - Group by content type

2. **Redesign `ContentQualityActionItems` component**
   - Show ranked list of individual items
   - Group by content type sections
   - Add "Review" buttons linking to specific items

3. **Update navigation handlers**
   - Support direct navigation to items with query params
   - Handle storyId, roleId, sectionId params

4. **Test resolution flow** end-to-end

---

## Files to Create/Modify

### New Components
- `src/components/dashboard/GapSummaryWidget.tsx`
  - Shows total gaps, gaps per content type, gaps by severity
  - Uses badges for visual IA reinforcement
  - **Note:** This is separate from Onboarding Progress (task completion)
  
- `src/components/dashboard/WorkHistoryGapsWidget.tsx`
  - Ranked list of work history items with gaps
  - Severity tabs (High/Medium/Low)
  - Format: "Role Title @ Company: Item Type"
  
- `src/components/dashboard/CoverLetterSavedSectionsWidget.tsx`
  - Ranked list of cover letter saved sections with gaps
  - Severity tabs (High/Medium/Low)
  - Format: "Cover Letter - Section Name"

### Service Layer
- `src/services/gapDetectionService.ts`
  - Add `getContentItemsWithGaps()` method
  - Add SQL queries to fetch content metadata with gaps
  - Keep `getGapSummary()` for overview metrics

### Modified Components
- `src/pages/NewUserDashboard.tsx`
  - Add GapSummaryWidget at top (separate from Onboarding Progress)
  - Replace ContentQualityActionItems with WorkHistoryGapsWidget and CoverLetterSavedSectionsWidget
  - Enhance 2x2 grid cards with gap badges
  - Badges show gap counts and link to respective widgets
  - **Note:** Onboarding Progress (task completion) remains separate

### Navigation
- `src/pages/ShowAllStories.tsx` - Handle `storyId` query param
- `src/pages/WorkHistory.tsx` - Handle `roleId` query param
- Update routing to support direct navigation to items

---

## Alignment Check

Before proceeding, confirm:
1. ✅ Multiple focused widgets (Gap Summary, Work History, Cover Letter Saved Sections)
2. ✅ **Onboarding Progress (task completion) is separate** from Gap Summary widgets
3. ✅ Badges for content types (Work History, Saved Sections) to reinforce IA
4. ✅ Gap Summary Widget: total gaps, gaps per content type, gaps by severity
5. ✅ Work History Widget: ranked list with severity tabs
6. ✅ Cover Letter Saved Sections Widget: ranked list with severity tabs
7. ✅ Keep existing 2x2 grid with enhanced cards (badges showing gap counts)
8. ✅ Work History format: "Role Title @ Company: Item Type"
   - Item types: "Role Summary", "Summary Metrics", or story title
9. ✅ Cover Letter format: "Cover Letter - Section Name"
10. ✅ No gap count displayed on individual items (only severity indicator)
11. ✅ "Review" button links directly to that item's detail view
12. ✅ Ranked within severity (high → medium → low)
13. ✅ Work History includes: role descriptions, role metrics, and stories
