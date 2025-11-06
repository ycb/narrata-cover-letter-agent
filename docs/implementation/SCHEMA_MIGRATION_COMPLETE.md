# Schema Migration Complete: Metrics & Lineage Tracking

## Status: ✅ Migration Applied Successfully

**Migration:** `005_add_metrics_and_lineage.sql`  
**Applied:** ✅  
**Date:** 2025-01-19

---

## Changes Applied

### 1. `approved_content` Table Additions

| Column | Type | Purpose | Index |
|--------|------|---------|-------|
| `company_id` | UUID FK → companies | Denormalized for query performance | ✅ `idx_approved_content_company_id` |
| `metrics` | JSONB | Structured story-level metrics | ✅ GIN `idx_approved_content_metrics_gin` |
| `source_id` | UUID FK → sources | Data lineage tracking | ✅ `idx_approved_content_source_id` |

### 2. `work_items` Table Additions

| Column | Type | Purpose | Index |
|--------|------|---------|-------|
| `metrics` | JSONB | Structured role-level metrics | ✅ GIN `idx_work_items_metrics_gin` |
| `source_id` | UUID FK → sources | Data lineage tracking | ✅ `idx_work_items_source_id` |

---

## Code Updates

### `fileUploadService.ts` - Normalization Updates

1. **Role-Level Metrics** (work_items):
   ```typescript
   const roleMetrics = Array.isArray(workItem.roleMetrics) 
     ? workItem.roleMetrics.map((m: any) => ({
         ...m,
         parentType: m.parentType || 'role'
       }))
     : [];
   
   // Insert with metrics JSONB
   metrics: roleMetrics,
   source_id: sourceId
   ```

2. **Story-Level Metrics** (approved_content):
   ```typescript
   const storyMetrics = Array.isArray(story.metrics)
     ? story.metrics.map((m: any) => ({
         ...m,
         parentType: m.parentType || 'story'
       }))
     : [];
   
   // Insert with new columns
   company_id: companyId,
   metrics: storyMetrics,
   source_id: sourceId
   ```

**Note:** Removed `role` field from `approved_content` inserts (redundant via JOIN to `work_items.title`)

---

## Data Structure

### Metrics JSONB Format

**Role-Level Metrics** (`work_items.metrics`):
```json
[
  {
    "value": "+22%",
    "unit": "%",
    "context": "Week-2 activation",
    "type": "increase",
    "parentType": "role",
    "name": "Activation Rate",
    "period": "Q1 2024",
    "confidence": 0.95
  }
]
```

**Story-Level Metrics** (`approved_content.metrics`):
```json
[
  {
    "value": "+11%",
    "unit": "%",
    "context": "trial-to-paid conversion",
    "type": "increase",
    "parentType": "story",
    "name": "Conversion Rate",
    "period": "Q1 2024",
    "confidence": 0.90
  }
]
```

---

## Query Examples

### Get all stories for a company (fast, no JOIN)
```sql
SELECT * FROM approved_content 
WHERE company_id = 'company-uuid';
```

### Get role-level metrics
```sql
SELECT title, metrics 
FROM work_items 
WHERE metrics @> '[{"parentType": "role"}]';
```

### Get story-level metrics
```sql
SELECT title, metrics 
FROM approved_content 
WHERE metrics @> '[{"parentType": "story"}]';
```

### Find all content from a specific source
```sql
SELECT * FROM approved_content 
WHERE source_id = 'source-uuid';
```

### Get metrics by type (role or story)
```sql
-- Role-level increase metrics
SELECT * FROM work_items 
WHERE metrics @> '[{"type": "increase", "parentType": "role"}]';

-- Story-level increase metrics  
SELECT * FROM approved_content 
WHERE metrics @> '[{"type": "increase", "parentType": "story"}]';
```

---

## Backward Compatibility

- ✅ `work_items.achievements` TEXT[] column remains (for backward compatibility)
- ✅ Existing queries continue to work
- ✅ New metrics stored in JSONB alongside achievements
- ✅ Can migrate achievements to metrics later if needed

---

## Next Steps

1. ✅ Migration applied
2. ✅ Code updated to use new columns
3. ⏭️ Test normalization with sample data
4. ⏭️ Verify metrics are stored correctly
5. ⏭️ Update UI to display structured metrics

---

## Benefits

1. **Performance**: Company queries no longer require JOINs
2. **Structured Data**: Metrics stored as JSONB with full type information
3. **Queryability**: Can query metrics by type, value, unit, etc.
4. **Lineage**: Track which source file generated each piece of content
5. **Debugging**: Identify problematic sources easily

