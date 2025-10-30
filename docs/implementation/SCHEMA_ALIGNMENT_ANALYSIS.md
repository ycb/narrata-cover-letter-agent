# Schema Alignment Analysis: LLM Output vs Supabase Schema

## Executive Summary

**Critical Issues Found:**
1. ✅ **No unsupported fields** in LLM output (all fields are valid JSONB and supported)
2. ❌ **Missing database columns** - Code attempts to insert fields that don't exist in schema
3. ⚠️ **Unused LLM fields** - Some fields from LLM output are not stored anywhere

---

## 1. Critical Schema Mismatches

### Issue 1: `approved_content` Table Missing Columns

**Code tries to insert** (fileUploadService.ts:789-799):
```typescript
.insert({
  user_id: userId,
  work_item_id: newWorkItem.id,
  company_id: companyId,        // ❌ COLUMN DOES NOT EXIST
  role: workItem.position,       // ❌ COLUMN DOES NOT EXIST
  title: story.title,
  content: story.content || '',
  tags: story.tags || [],
  metrics: story.metrics || [], // ❌ COLUMN DOES NOT EXIST
  source_id: sourceId            // ❌ COLUMN DOES NOT EXIST
})
```

**Actual Schema** (001_initial_schema.sql:61-75):
```sql
CREATE TABLE public.approved_content (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  work_item_id UUID NOT NULL,  -- ✅ EXISTS
  title TEXT NOT NULL,          -- ✅ EXISTS
  content TEXT NOT NULL,        -- ✅ EXISTS
  status content_status DEFAULT 'draft',
  confidence confidence_level DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',     -- ✅ EXISTS
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- ❌ MISSING: company_id, role, metrics, source_id
);
```

**Impact:** Database inserts will fail silently or throw errors.

**Resolution:** ✅ Migration created (`005_add_metrics_and_lineage.sql`) to add:
- `company_id` - Denormalized for query performance
- `metrics` JSONB - Structured story-level metrics
- `source_id` - Data lineage tracking

**Recommendation:** Apply migration `005_add_metrics_and_lineage.sql` before running normalization.

---

### Issue 2: `work_items` Table Missing Fields

**LLM Output Includes:**
- `location` - stored in JSONB only, not normalized
- `companyTags` - stored in `companies.tags` only
- `roleSummary` - mapped to `description` (alternate: `description`)
- `roleMetrics` - mapped to `achievements` array (role-level metrics)
- `roleTags` - mapped to `tags` array ✅

**Actual Schema** (001_initial_schema.sql:46-58):
```sql
CREATE TABLE public.work_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,             -- ✅ Used for roleSummary
  tags TEXT[] DEFAULT '{}',       -- ✅ Used for roleTags
  achievements TEXT[] DEFAULT '{}', -- ✅ Used for roleMetrics
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  -- ❌ MISSING: location (stored only in JSONB)
);
```

**Impact:** Location information is stored in `sources.structured_data` JSONB but not queryable via normalized table.

**Recommendation:** Consider adding `location TEXT` column if location filtering/querying is needed.

---

## 2. Field Mapping Analysis

### Resume Analysis Prompt → Database Mapping

| LLM Field | Storage Location | Status |
|-----------|------------------|--------|
| `contactInfo.*` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `summary` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `workHistory[].company` | `companies.name` | ✅ Normalized |
| `workHistory[].position` | `work_items.title` | ✅ Normalized |
| `workHistory[].startDate` | `work_items.start_date` | ✅ Normalized |
| `workHistory[].endDate` | `work_items.end_date` | ✅ Normalized |
| `workHistory[].location` | `sources.structured_data` JSONB only | ⚠️ Not normalized |
| `workHistory[].companyTags` | `companies.tags` | ✅ Normalized |
| `workHistory[].roleTags` | `work_items.tags` | ✅ Normalized |
| `workHistory[].roleSummary` | `work_items.description` | ✅ Normalized |
| `workHistory[].roleMetrics[]` | `work_items.achievements` | ✅ Normalized (as array) |
| `workHistory[].stories[].title` | `approved_content.title` | ✅ Normalized |
| `workHistory[].stories[].content` | `approved_content.content` | ✅ Normalized |
| `workHistory[].stories[].tags` | `approved_content.tags` | ✅ Normalized |
| `workHistory[].stories[].metrics[]` | ❌ **NOT STORED** | ❌ Missing column |
| `education[]` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `skills[]` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `certifications[]` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `projects[]` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |

### Cover Letter Analysis Prompt → Database Mapping

| LLM Field | Storage Location | Status |
|-----------|------------------|--------|
| `paragraphs[]` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `stories[]` | `sources.structured_data` JSONB only | ✅ Stored but not normalized (cover letters don't normalize to work_items) |
| `templateSignals` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `skillsMentioned[]` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `entityRefs` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |
| `metadata` | `sources.structured_data` JSONB only | ✅ Stored but not normalized |

---

## 3. Unused Fields in LLM Output

### Resume Analysis - Fields Not Used Anywhere

These fields are extracted by LLM but not actively used in normalization or UI:

1. **`workHistory[].id`** - Generated by LLM but not used (database generates UUIDs)
2. **`workHistory[].stories[].id`** - Generated by LLM but not used
3. **`workHistory[].stories[].problem`** - Optional field, not stored separately
4. **`workHistory[].stories[].action`** - Optional field, not stored separately
5. **`workHistory[].stories[].outcome`** - Optional field, not stored separately
6. **`workHistory[].stories[].linkedToRole`** - Not stored (relationship implicit via work_item_id)
7. **`workHistory[].stories[].company`** - Redundant (stored via work_item → company relationship)
8. **`workHistory[].stories[].position`** - Redundant (stored via work_item)
9. **`education[].id`** - Generated by LLM but not used
10. **`skills[].category`** - Structured but may not be used in UI/normalization

**Impact:** Low - Fields are stored in JSONB for future use, just not normalized.

---

## 4. Recommendations

### High Priority (Breaking Issues)

1. ✅ **Fix `approved_content` inserts:**
   - **Status:** Migration `005_add_metrics_and_lineage.sql` created
   - **Adds:** `company_id`, `metrics` JSONB, `source_id`
   - **Decision:** Added `company_id` for performance, `metrics` for structured data, `source_id` for lineage
   - **Note:** `role` field NOT added (redundant via JOIN to `work_items.title`)

2. **Verify normalization works:**
   - Apply migration `005_add_metrics_and_lineage.sql`
   - Test that `processStructuredData` completes without errors
   - Verify metrics are stored as JSONB (not TEXT[])

### Medium Priority (Data Completeness)

3. **Consider normalizing `education`, `skills`, `certifications`:**
   - Currently only stored in JSONB
   - May want separate tables if filtering/querying needed

4. **Add `location` to `work_items` table:**
   - If location-based filtering/querying is needed
   - Currently only accessible via JSONB parsing

### Low Priority (Schema Optimization)

5. **Remove unused LLM fields from prompts:**
   - Fields like `workHistory[].id`, `stories[].id` are redundant
   - But keeping them doesn't hurt (stored in JSONB)

6. **Consider adding indexes on JSONB fields:**
   - If querying `structured_data` frequently
   - Example: `CREATE INDEX idx_sources_structured_data_gin ON sources USING GIN (structured_data);`

---

## 5. Summary Checklist

- [x] **LLM output fields are all valid JSON** - No unsupported types
- [x] **All LLM fields are stored in `sources.structured_data` JSONB** - Safe fallback
- [ ] **Normalization code matches database schema** - ❌ MISSING COLUMNS
- [x] **Field mappings are logical** - Most mappings make sense
- [ ] **No data loss from unused fields** - ⚠️ Some fields not normalized but stored in JSONB

---

## 6. Next Steps

1. **Immediate:** Fix `approved_content` insert to match actual schema
2. **Testing:** Verify normalization works end-to-end
3. **Decide:** Add missing columns OR remove from inserts
4. **Document:** Update code comments to reflect actual schema

