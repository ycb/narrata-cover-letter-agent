# Schema Design Evaluation: work_items vs Modifications

## Current Schema Analysis

### Existing Structure
```
companies (id, name, tags, description)
  └── work_items (id, company_id, title, start_date, end_date, description, tags, achievements)
       └── approved_content (id, work_item_id, title, content, tags, status, confidence)
```

### Current Queries
- Get stories by company: `approved_content JOIN work_items JOIN companies WHERE company_id = X`
- Get role-level metrics: `work_items.achievements` (TEXT[] - stored as strings)
- Get story-level metrics: **NOT STORED** (missing)

---

## 1. Do We Need `company_id` in `approved_content`?

### Analysis

**Current Path to Company:**
```sql
SELECT ac.*, c.name as company_name
FROM approved_content ac
JOIN work_items wi ON ac.work_item_id = wi.id
JOIN companies c ON wi.company_id = c.id
WHERE c.id = 'company-uuid';
```

**With Denormalized `company_id`:**
```sql
SELECT ac.*, c.name as company_name
FROM approved_content ac
JOIN companies c ON ac.company_id = c.id
WHERE c.id = 'company-uuid';
```

### Recommendation: **YES, add `company_id`**

**Reasons:**
1. **Query Performance**: Eliminates JOIN for common queries (filter stories by company)
2. **Indexing**: Can create index on `approved_content(company_id)` for faster filtering
3. **Data Integrity**: FK constraint ensures company exists
4. **Common Use Case**: Users frequently filter stories by company
5. **Denormalization is Acceptable**: Company rarely changes, redundancy is minimal

**Trade-offs:**
- ✅ Faster queries
- ✅ Simpler queries (no JOIN needed)
- ⚠️ Redundancy (company_id exists in both tables)
- ⚠️ Need to maintain consistency (work_item.company_id must match approved_content.company_id)

**Implementation:**
```sql
ALTER TABLE public.approved_content 
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_approved_content_company_id ON public.approved_content(company_id);

-- Add constraint to ensure consistency
-- (work_item's company_id must match approved_content's company_id)
-- This is enforced by application logic, not DB constraint
```

---

## 2. Best Way to Store Metrics (Role-Level vs Story-Level)

### Current State
- **Role-level metrics**: Stored in `work_items.achievements` as `TEXT[]`
  - Example: `["+22% Week-2 activation", "+11% trial-to-paid conversion"]`
  - **Problem**: Loses structured data (can't query by metric type, value, unit separately)
  
- **Story-level metrics**: **NOT STORED** (code tries to insert but column doesn't exist)

### Metrics Structure (from LLM)
```typescript
{
  value: "+22%" | "30" | "$2M",
  unit: "%" | "users" | "$" | null,
  context: "Week-2 activation" | "tests per year",
  name: "MAUs" | "Revenue" | "Conversion",
  type: "increase" | "decrease" | "absolute",
  parentType: "role" | "story",  // Critical: distinguishes level
  period: "30d" | "Q1 2024" | "YoY" | null,
  direction: "up" | "down" | null,
  confidence: 0.0-1.0
}
```

### Recommendation: **Use JSONB for Both Levels**

**Rationale:**
1. **Structured Querying**: Can query metrics by type, value range, unit, etc.
2. **Type Safety**: Preserves number/string/enum types
3. **Future-Proof**: Easy to add new metric fields
4. **Indexing**: Postgres GIN indexes support JSONB queries
5. **Storage Efficiency**: JSONB is more compact than TEXT arrays for structured data

### Implementation Options

#### Option A: Separate Columns (Recommended)

```sql
-- Update work_items
ALTER TABLE public.work_items 
  ADD COLUMN metrics JSONB DEFAULT '[]'::jsonb;

-- Update approved_content  
ALTER TABLE public.approved_content
  ADD COLUMN metrics JSONB DEFAULT '[]'::jsonb;

-- Migrate existing achievements to metrics
UPDATE public.work_items 
SET metrics = (
  SELECT jsonb_agg(jsonb_build_object(
    'value', unnest(string_to_array(value, ' '))[1],
    'context', substring(value from position(' ' in value))
  ))
  FROM unnest(achievements) AS value
)
WHERE achievements IS NOT NULL AND achievements != '{}';

-- Add indexes for performance
CREATE INDEX idx_work_items_metrics_gin ON public.work_items USING GIN (metrics);
CREATE INDEX idx_approved_content_metrics_gin ON public.approved_content USING GIN (metrics);
```

**Benefits:**
- ✅ Clear separation: role metrics vs story metrics
- ✅ Easy to query: `WHERE metrics @> '[{"type": "increase"}]'`
- ✅ Preserves parentType distinction
- ✅ Can query across levels: `SELECT * FROM work_items WHERE metrics @> '[{"parentType": "role"}]'`

#### Option B: Separate Metrics Table (Over-engineered)

```sql
CREATE TABLE public.metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  parent_type TEXT NOT NULL CHECK (parent_type IN ('role', 'story')),
  parent_id UUID NOT NULL,  -- work_item_id or approved_content_id
  value TEXT,
  unit TEXT,
  context TEXT,
  type TEXT,
  -- ... other fields
);
```

**Why NOT this:**
- ❌ Over-normalization for a small, closely-related data structure
- ❌ Adds JOIN complexity
- ❌ Metrics are rarely queried independently of their parent

---

## 3. `source_id` Evaluation

### Current Usage
- Code attempts to insert: `source_id: sourceId` (references `sources.id`)
- Column doesn't exist in schema
- **LLM already includes `parentType`** to distinguish role vs story level

### Recommendation: **YES, add `source_id`**

**Reasons:**
1. **Data Lineage**: Track which file upload generated each story
2. **Debugging**: Identify problematic sources (low quality extractions)
3. **Data Management**: 
   - "Delete all content from source X"
   - "Re-import from source Y"
   - "Show version history"
4. **Quality Tracking**: Correlate source quality with extraction quality
5. **Audit Trail**: Know when/how data was imported

**Implementation:**
```sql
ALTER TABLE public.approved_content
  ADD COLUMN source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;

-- Add index for source-based queries
CREATE INDEX idx_approved_content_source_id ON public.approved_content(source_id);

-- Optional: Also add to work_items if you want to track role-level source
ALTER TABLE public.work_items
  ADD COLUMN source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;
CREATE INDEX idx_work_items_source_id ON public.work_items(source_id);
```

**Why `ON DELETE SET NULL`?**
- If source is deleted, keep the normalized data (stories/work items)
- Maintains referential integrity while preserving data

---

## 4. `role` Field in `approved_content`

### Analysis
- Code tries to insert: `role: workItem.position || workItem.title`
- This is redundant: `work_item.title` already contains the role name
- Can be accessed via JOIN: `approved_content → work_item → title`

### Recommendation: **NO, don't add `role`**

**Reasons:**
1. **Redundancy**: Already available via `work_item_id → work_items.title`
2. **Data Consistency Risk**: Could diverge from `work_items.title`
3. **Not Queryable**: Role filtering happens via `work_item_id` or JOIN
4. **Minimal Benefit**: One less JOIN is not worth the redundancy

**If Needed for Performance:**
- Use a database view or materialized view for role-based queries
- Or use application-level caching

---

## Final Recommendations

### Migration Script

```sql
-- 1. Add company_id to approved_content
ALTER TABLE public.approved_content 
  ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_approved_content_company_id ON public.approved_content(company_id);

-- 2. Add metrics JSONB to work_items
ALTER TABLE public.work_items 
  ADD COLUMN metrics JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_work_items_metrics_gin ON public.work_items USING GIN (metrics);

-- 3. Add metrics JSONB to approved_content
ALTER TABLE public.approved_content
  ADD COLUMN metrics JSONB DEFAULT '[]'::jsonb;

CREATE INDEX idx_approved_content_metrics_gin ON public.approved_content USING GIN (metrics);

-- 4. Add source_id to approved_content
ALTER TABLE public.approved_content
  ADD COLUMN source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;

CREATE INDEX idx_approved_content_source_id ON public.approved_content(source_id);

-- 5. Optional: Add source_id to work_items (for role-level tracking)
ALTER TABLE public.work_items
  ADD COLUMN source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;

CREATE INDEX idx_work_items_source_id ON public.work_items(source_id);

-- 6. Backfill company_id in approved_content (if data exists)
UPDATE public.approved_content ac
SET company_id = wi.company_id
FROM public.work_items wi
WHERE ac.work_item_id = wi.id
  AND ac.company_id IS NULL;
```

### Updated Schema

```sql
-- Work items (with metrics JSONB)
CREATE TABLE public.work_items (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',  -- Keep for backward compatibility
  metrics JSONB DEFAULT '[]'::jsonb,  -- NEW: Structured role-level metrics
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,  -- NEW
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Approved content (with company_id, metrics, source_id)
CREATE TABLE public.approved_content (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  work_item_id UUID NOT NULL REFERENCES public.work_items(id),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,  -- NEW: Denormalized
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status content_status DEFAULT 'draft',
  confidence confidence_level DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  metrics JSONB DEFAULT '[]'::jsonb,  -- NEW: Structured story-level metrics
  source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL,  -- NEW: Data lineage
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMP WITH TIME ZONE,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## Query Examples After Migration

### Get all stories for a company (fast, no JOIN needed)
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

## Summary

| Field | Add? | Reason |
|-------|------|--------|
| `company_id` in `approved_content` | ✅ **YES** | Performance, simpler queries, common use case |
| `metrics` JSONB in `work_items` | ✅ **YES** | Structured role-level metrics (replace TEXT[] achievements) |
| `metrics` JSONB in `approved_content` | ✅ **YES** | Story-level metrics currently missing |
| `source_id` in `approved_content` | ✅ **YES** | Data lineage, debugging, quality tracking |
| `source_id` in `work_items` | ⚠️ **OPTIONAL** | Useful but less critical than story-level |
| `role` in `approved_content` | ❌ **NO** | Redundant, can JOIN to work_items.title |

**Verdict: Use `work_items` structure as-is, add recommended columns above.**

