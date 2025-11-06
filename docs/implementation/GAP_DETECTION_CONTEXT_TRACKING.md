# Gap Detection Context Tracking (Future Enhancement)

**Status:** Design Decision - Not Yet Implemented  
**Priority:** P1 - Required for context-aware re-analysis  
**Related Features:** User goals, target role changes, level assessment updates

---

## Problem Statement

When a user dismisses a gap, it should not re-appear under the same conditions. However, when context changes (e.g., user updates target role from "PM" to "Sr PM" or changes job goals), the same content might need to be flagged again for a different reason.

**Example:**
- User dismisses "missing_role_metrics" gap for a PM role
- User updates target role to "Sr PM" 
- Re-analysis should flag the same content again, but now the context is different (Sr PM expectations vs PM expectations)

---

## Solution: Option B - Explicit Context Metadata

Add context metadata to the `gaps` table to explicitly track the context under which a gap was detected/dismissed.

### Database Schema Enhancement

Add a new column to the `gaps` table:

```sql
ALTER TABLE public.gaps 
  ADD COLUMN IF NOT EXISTS context_hash TEXT;
  -- Hash or structured JSON of context that influenced gap detection
  -- Examples: target_role_level, target_company_stage, target_industry, etc.

CREATE INDEX IF NOT EXISTS idx_gaps_context_hash ON public.gaps(context_hash);
```

### Context Hash Structure

The `context_hash` should include relevant context that affects gap detection:

```typescript
interface GapContext {
  target_role_level?: string;        // e.g., "PM", "Sr PM", "Lead PM"
  target_company_stage?: string;     // e.g., "startup", "growth", "enterprise"
  target_industry?: string[];        // e.g., ["SaaS", "Fintech"]
  assessment_level?: string;          // User's assessed level from assessment page
  // Add other relevant context as needed
}

// Hash the context for comparison
const contextHash = JSON.stringify(context).hashCode();
```

### Implementation Changes

#### 1. Gap Detection Service

When detecting gaps, include context hash:

```typescript
// In GapDetectionService.detectWorkItemGaps()
const context = await this.getGapDetectionContext(userId);
const contextHash = this.hashContext(context);

const gaps: Gap[] = [
  {
    // ... existing fields
    context_hash: contextHash
  }
];
```

#### 2. Deduplication Logic

When saving gaps, check for existing gaps with **same context**:

```typescript
// In GapDetectionService.saveGaps()
const existingGaps = await this.getExistingGaps(
  userId,
  entities,
  accessToken,
  true // include resolved
);

// Check both gap_category AND context_hash
const existingMap = new Map(
  existingGaps.map(g => [
    `${g.entity_type}:${g.entity_id}:${g.gap_category}:${g.context_hash || 'default'}`, 
    true
  ])
);
```

#### 3. Context Retrieval

Create a method to get current gap detection context:

```typescript
private static async getGapDetectionContext(userId: string): Promise<GapContext> {
  // Get user preferences (target role, goals, etc.)
  const preferences = await UserPreferencesService.getUserPreferences(userId);
  
  // Get current assessment level
  const assessment = await LevelAssessmentService.getUserAssessment(userId);
  
  return {
    target_role_level: preferences.targetRole?.level,
    target_company_stage: preferences.targetCompanyStage,
    target_industry: preferences.targetIndustries,
    assessment_level: assessment.level
  };
}
```

#### 4. Re-Analysis Trigger

When context changes (user updates goals, target role, etc.), trigger re-analysis:

```typescript
// When user updates target role
async function onTargetRoleChange(userId: string, newRole: string) {
  // Re-run gap detection with new context
  const workHistory = await fetchWorkHistory(userId);
  
  for (const company of workHistory) {
    for (const role of company.roles) {
      const gaps = await GapDetectionService.detectWorkItemGaps(
        userId,
        role.id,
        roleData,
        stories
      );
      
      // Save gaps - deduplication will check context_hash
      // Same gap_category but different context_hash = new gap created
      await GapDetectionService.saveGaps(gaps);
    }
  }
}
```

---

## Benefits of Option B

1. **Explicit Context Tracking**: Clear record of what context influenced gap detection
2. **Intelligence Insights**: Can analyze which contexts generate which gaps
3. **Precise Re-Detection**: Same content can be flagged again when context legitimately changes
4. **User Experience**: User understands why a dismissed gap reappeared (different context)
5. **Future-Proof**: Easy to add new context dimensions without breaking existing logic

---

## Migration Strategy

1. **Phase 1**: Add `context_hash` column (nullable, defaults to `NULL` for existing gaps)
2. **Phase 2**: Update gap detection to populate `context_hash` for new gaps
3. **Phase 3**: Update deduplication logic to check `context_hash`
4. **Phase 4**: Add context change detection and re-analysis triggers
5. **Phase 5**: (Optional) Backfill `context_hash` for existing resolved gaps

---

## Related Files

- `src/services/gapDetectionService.ts` - Gap detection logic
- `src/services/userPreferencesService.ts` - User goals/preferences
- `src/services/levelAssessmentService.ts` - Level assessment (if exists)
- `supabase/migrations/` - Database schema changes

---

## Notes

- Existing gaps without `context_hash` should be treated as "default context" for backward compatibility
- When comparing contexts, we can use exact match or allow for "default" context to match any context (for legacy gaps)
- Consider adding a `context_metadata` JSONB column for more flexible context storage if needed

