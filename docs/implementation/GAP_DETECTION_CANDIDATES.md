# Gap Detection Candidates Analysis

## Currently Implemented

### ✅ Stories (approved_content)
- **Story Completeness**: Missing STAR format or narrative structure
- **Missing Metrics**: No quantified metrics
- **Generic Content**: LLM-as-judge for "too generic" descriptions

### ✅ Role-Level Summary (work_items.description)
- **Status**: Referenced in UI (`role-description-gap`) but implementation unclear
- **Gap Type**: Likely checks for empty/missing description
- **Location**: `WorkHistoryDetail.tsx` line 1075

### ✅ Saved Sections (saved_sections)
- **Entity Type**: Already supported in `gaps` table (`entity_type: 'saved_section'`)
- **Gap Detection**: Should work same as stories (same structure: title, content)

---

## Strong Candidates for Gap Detection

### 1. **Role-Level Metrics (work_items.metrics)**
**Priority: HIGH**

**Why:**
- Role-level metrics are critical for demonstrating impact
- Currently extracted but not validated for completeness
- Users should be encouraged to add quantified outcomes at role level

**Gap Types:**
- **Missing Metrics**: No role-level metrics present
- **Insufficient Metrics**: Only 1-2 metrics when role had significant impact
- **Unquantified Metrics**: Metrics exist but lack numbers/percentages

**Implementation:**
```typescript
// In gapDetectionService.ts
static async detectRoleMetricsGaps(
  userId: string,
  workItemId: string,
  roleMetrics: RoleMetric[]
): Promise<Gap[]> {
  const gaps: Gap[] = [];
  
  if (!roleMetrics || roleMetrics.length === 0) {
    gaps.push({
      user_id: userId,
      entity_type: 'work_item',
      entity_id: workItemId,
      gap_type: 'best_practice',
      gap_category: 'missing_role_metrics',
      severity: 'medium',
      description: 'No role-level metrics'
    });
  } else if (roleMetrics.length < 3) {
    // Flag if only 1-2 metrics for roles with multiple stories or long tenure
    gaps.push({
      gap_category: 'insufficient_role_metrics',
      severity: 'low',
      description: 'Few role-level metrics'
    });
  }
  
  return gaps;
}
```

---

### 2. **Company Description (companies.description)**
**Priority: MEDIUM (User is on the fence for MVP)**

**Why:**
- Good practice to explain what company does/division worked in
- Helps recruiters understand context
- Even for well-known companies (Amazon, Apple), division context matters

**Gap Type:**
- **Missing Description**: Empty/null description
  - Severity: `low` (not critical, but helpful)
  - Description: "Missing company description"
  - Note: User leaning toward leaving for MVP

**Recommendation:** 
- ✅ **Skip for MVP** (as user suggested)
- 🔮 **Future enhancement**: Could detect if company is well-known (lookup table) and lower severity, or prompt for division-specific context

---

### 3. **Role Tags (work_items.tags)**
**Priority: MEDIUM**

**Why:**
- Tags help with content matching and search
- Missing tags could indicate incomplete categorization
- But tags are optional/supplementary, not critical

**Gap Types:**
- **Missing Tags**: No tags present (when role has stories/metrics suggesting tags should exist)
- **Insufficient Tags**: Very few tags (< 3) for roles with rich content

**Considerations:**
- Lower priority than metrics
- Could be combined with "Auto-suggest tags" feature (already exists in UI)
- More of a completeness check than critical gap

**Implementation:**
```typescript
static async detectRoleTagsGaps(
  userId: string,
  workItemId: string,
  tags: string[],
  hasStories: boolean,
  hasMetrics: boolean
): Promise<Gap[]> {
  const gaps: Gap[] = [];
  
  if ((hasStories || hasMetrics) && (!tags || tags.length === 0)) {
    gaps.push({
      gap_category: 'missing_role_tags',
      severity: 'low',
      description: 'No role tags'
    });
  }
  
  return gaps;
}
```

---

### 4. **Skills Evidence/Substantiation (user_skills)**
**Priority: MEDIUM**

**Why:**
- Skills should be backed by work history evidence
- Empty `context` field means skill isn't substantiated
- Missing evidence makes skills less credible

**Gap Types:**
- **Unsubstantiated Skills**: Skills without work history evidence
- **Missing Context**: Skills with no `context` explaining where demonstrated

**Considerations:**
- Requires cross-table analysis (skills vs. work_items)
- Could flag skills that appear in resume/LinkedIn but not mentioned in any role
- Lower severity (skills can be added manually without evidence)

**Implementation:**
```typescript
static async detectSkillsGaps(
  userId: string,
  skills: UserSkill[],
  workItems: WorkItem[]
): Promise<Gap[]> {
  // Check if skills have evidence in work items
  // Flag skills without context or evidence
}
```

---

### 5. **Education Details**
**Priority: LOW**

**Why:**
- Education is typically complete at parse time
- Less variable than work history
- Gap detection would be minimal value

**Recommendation:** Skip for MVP

---

### 6. **Contact Info Completeness**
**Priority: LOW**

**Why:**
- Contact info is binary (present/not present)
- Not a quality issue, just data completeness
- Less actionable than content gaps

**Recommendation:** Skip for MVP

---

## Summary Recommendations

### For MVP:
1. ✅ **Role-Level Metrics** - HIGH priority
   - Detects missing/insufficient role metrics
   - Complements story-level metric detection
   - Actionable: user can add metrics via UI

2. ⏸️ **Company Description** - Skip for MVP (per user preference)

3. ✅ **Role Tags** - MEDIUM priority (optional)
   - Low severity
   - Complements existing "Auto-suggest tags" feature
   - Can be deferred if needed

### Future Enhancements:
- Skills substantiation gaps
- Education gap detection (if needed)
- Company description with smart detection (well-known vs. division-specific)

---

## Implementation Notes

### Integration Points:
- **FileUploadService**: After processing structured data, call role-level gap detection
- **GapDetectionService**: Extend to support work_item-level gaps
- **WorkHistory UI**: Display role-level gaps in master component (already has gap count display)

### Gap Display:
- Role-level gaps should appear:
  1. In WorkHistory master component (gap count badge)
  2. In WorkHistoryDetail role tab (gap banner if metrics missing)
  3. Similar to story gaps: orange border, gap banner at bottom

### Database:
- Already supports `entity_type: 'work_item'` in `gaps` table ✅
- No schema changes needed

---

## Questions for Discussion

1. **Role Metrics Gap**: Should we detect insufficient metrics (1-2 metrics when role deserves more), or just missing metrics?
   - Recommendation: Start with missing only, add insufficient later if needed

2. **Tags Gap**: Is this valuable enough for MVP, or defer?
   - Recommendation: Low severity, defer if needed

3. **Company Description**: Confirm skip for MVP?
   - User preference: Skip for MVP ✅

