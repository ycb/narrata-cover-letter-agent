# JSONB Fields Normalization Analysis

## Current State: Fields Stored Only in JSONB

### Resume Fields (stored in `sources.structured_data` JSONB)
1. `contactInfo` - Contact information (name, email, phone, location, linkedin)
2. `summary` - Professional summary (1-2 sentences)
3. `education[]` - Education entries array
4. `skills[]` - Skills array (category + items)
5. `certifications[]` - Certifications array
6. `projects[]` - Projects array
7. `workHistory[].location` - Location per work history entry

### Cover Letter Fields (stored in `sources.structured_data` JSONB)
- All fields (paragraphs, stories, templateSignals, skillsMentioned, entityRefs, metadata)

---

## Analysis by Field

### 1. `contactInfo` (Resume)

**Current Usage:**
- Displayed in evaluation dashboard (contact info dropdown)
- Used in `unifiedProfileService` for profile merging
- Used in `peopleDataLabsService` for enrichment

**Query Patterns:**
- ❌ Not queried/filtered by contact info
- ❌ Not searched by email/phone
- ✅ Only displayed when viewing source

**Normalization Decision: ❌ NO**

**Reasoning:**
- Single record per user (doesn't change per source)
- Display-only, no filtering needed
- Already exists in `profiles` table (email, full_name)
- Redundant normalization would add complexity without benefit

**Recommendation:** Keep in JSONB only. If needed later, sync to `profiles` table on import.

---

### 2. `summary` (Resume)

**Current Usage:**
- Used in `unifiedProfileService` for profile merging
- Displayed in evaluation dashboard (as part of full JSONB output)
- Could be displayed in user profile/dashboard

**Query Patterns:**
- ❌ Not queried by summary content
- ❌ Not searched/filtered
- ✅ Only displayed when viewing source

**Normalization Decision: ❌ NO**

**Reasoning:**
- Single record per user (doesn't change per source)
- Text field, not structured/queryable
- If needed in profile, add `summary TEXT` to `profiles` table
- JSONB storage is sufficient for source-level storage

**Recommendation:** Keep in JSONB. Optionally add `summary` to `profiles` table if needed for user-facing display.

---

### 3. `education[]` (Resume)

**Current Usage:**
- ✅ Displayed in evaluation dashboard (has collapsible dropdown)
- Used in `unifiedProfileService` for profile merging
- Could be used for matching requirements (job descriptions)

**Structure:**
```json
{
  "id": "1",
  "institution": "University Name",
  "degree": "MS/BS/PhD",
  "field": "Major/Field of Study",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "gpa": "GPA or null"
}
```

**Query Patterns:**
- ⚠️ Potentially queryable: "Find users with degree X" or "from institution Y"
- ⚠️ Could filter by field of study
- ⚠️ Could match against job requirements

**Normalization Decision: ⚠️ MAYBE (Low Priority)**

**Reasoning:**
- ✅ Structured data with clear schema
- ✅ Could be useful for job matching (degree requirements)
- ⚠️ Currently only displayed, not queried
- ⚠️ Multiple entries per user (normalization adds complexity)
- ⚠️ Would need `education` table + FK to `profiles`

**Recommendation:** 
- **Short-term:** Keep in JSONB (current approach)
- **Long-term:** Consider normalization if:
  - Job matching by education becomes a feature
  - Search/filter by degree/institution is needed
  - Analytics on education patterns are required

**If Normalizing:**
```sql
CREATE TABLE public.education (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field TEXT,
  start_date DATE,
  end_date DATE,
  gpa TEXT,
  source_id UUID REFERENCES sources(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 4. `skills[]` (Resume)

**Current Usage:**
- ✅ Displayed in evaluation dashboard (has collapsible dropdown)
- Used in `unifiedProfileService` for profile merging
- ✅ **LinkedIn profiles already normalize skills** (`linkedin_profiles.skills TEXT[]`)
- Used for matching requirements (job descriptions)

**Structure:**
```json
[
  {"category": "Product Management", "items": ["A/B Testing", "Data Analysis"]},
  {"category": "Technical", "items": ["SQL", "Python"]}
]
```

**Current Storage Inconsistency:**
- `linkedin_profiles.skills` → `TEXT[]` (normalized)
- `sources.structured_data.skills` → JSONB (not normalized)

**Query Patterns:**
- ✅ **Frequently queried:** Job matching, skills coverage, gap analysis
- ✅ **Filtered:** "Show users with skill X"
- ✅ **Searched:** Skills search in dashboard

**Normalization Decision: ✅ YES (High Priority)**

**Reasoning:**
- ✅ Already partially normalized (LinkedIn)
- ✅ Frequently queried for job matching
- ✅ Used in gap analysis and coverage mapping
- ⚠️ Need to resolve inconsistency between LinkedIn and resume sources

**Recommendation:** 
1. **Create unified `user_skills` table:**
   ```sql
   CREATE TABLE public.user_skills (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES profiles(id),
     skill TEXT NOT NULL,
     category TEXT,
     source_type TEXT, -- 'resume' | 'linkedin' | 'manual'
     source_id UUID REFERENCES sources(id),
     proficiency TEXT, -- 'beginner' | 'intermediate' | 'advanced' | 'expert'
     created_at TIMESTAMPTZ DEFAULT NOW(),
     UNIQUE(user_id, skill, source_type)
   );
   ```

2. **Migrate existing data:**
   - From `linkedin_profiles.skills` (TEXT[])
   - From `sources.structured_data.skills` (JSONB)

3. **Normalize on import:**
   - Extract skills from resume → `user_skills`
   - Extract skills from LinkedIn → `user_skills`
   - De-duplicate by `(user_id, skill)`

**Benefits:**
- Unified skills view across all sources
- Fast queries for job matching
- Consistent with LinkedIn normalization
- Enables skills-based analytics

---

### 5. `certifications[]` (Resume)

**Current Usage:**
- Used in `peopleDataLabsService` for enrichment
- **LinkedIn profiles already normalize** (`linkedin_profiles.certifications JSONB`)
- Not actively displayed in UI
- Could be used for matching requirements

**Structure:**
```json
[
  {
    "name": "Certification Name",
    "issuer": "Issuing Organization",
    "date": "YYYY-MM-DD",
    "expiry": "YYYY-MM-DD or null"
  }
]
```

**Query Patterns:**
- ⚠️ Potentially queryable: "Find users with certification X"
- ⚠️ Could filter by certification type
- ❌ Currently not queried

**Normalization Decision: ⚠️ MAYBE (Low Priority)**

**Reasoning:**
- ✅ Structured data
- ⚠️ Already normalized in LinkedIn table (but as JSONB)
- ⚠️ Not actively used in UI
- ⚠️ Could be useful for job matching
- ⚠️ Lower volume than skills

**Recommendation:**
- **Short-term:** Keep in JSONB (current approach)
- **Long-term:** Consider normalization if:
  - Certification-based job matching becomes important
  - UI shows certifications prominently
  - Analytics on certifications needed

**If Normalizing:**
```sql
CREATE TABLE public.certifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  name TEXT NOT NULL,
  issuer TEXT,
  date DATE,
  expiry DATE,
  source_id UUID REFERENCES sources(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 6. `projects[]` (Resume)

**Current Usage:**
- Used in LinkedIn integration
- **LinkedIn profiles already normalize** (`linkedin_profiles.projects JSONB`)
- Not actively displayed in UI
- Could be displayed in portfolio/profile

**Structure:**
```json
[
  {
    "name": "Project Name",
    "description": "Project description",
    "url": "Project URL",
    "technologies": ["Tech1", "Tech2"],
    "date": "YYYY-MM-DD"
  }
]
```

**Query Patterns:**
- ❌ Not queried/filtered
- ❌ Not searched
- ✅ Only displayed (if UI added)

**Normalization Decision: ❌ NO**

**Reasoning:**
- ⚠️ Already in `linkedin_profiles.projects` JSONB (inconsistent storage)
- ❌ Not actively used
- ❌ Less critical than work history/stories
- ⚠️ Could stay in JSONB even if displayed

**Recommendation:** Keep in JSONB. If projects become important:
- Add `projects` JSONB column to `profiles` table (unified view)
- OR create `projects` table if portfolio becomes a core feature

---

### 7. `workHistory[].location` (Resume)

**Current Usage:**
- ✅ Displayed in `ContentReviewStep` (shows location icon 📍)
- ✅ Displayed in evaluation dashboard (work history entry)
- Used in `peopleDataLabsService` for enrichment
- Could be useful for location-based filtering

**Current Storage:**
- ❌ Not normalized (only in JSONB)
- ❌ Not in `work_items` table

**Query Patterns:**
- ⚠️ Potentially queryable: "Find users who worked in location X"
- ⚠️ Could filter by location for remote/local matching
- ⚠️ Currently not queried

**Normalization Decision: ⚠️ MAYBE (Medium Priority)**

**Reasoning:**
- ✅ Simple field (TEXT)
- ✅ Useful for location-based job matching
- ⚠️ Not currently queried
- ⚠️ Would require adding column to `work_items` table

**Recommendation:**
- **Short-term:** Keep in JSONB (current approach)
- **Medium-term:** Add `location TEXT` to `work_items` table if:
  - Location-based filtering becomes a feature
  - Remote/local job matching is needed
  - Geographic analytics are required

**If Normalizing:**
```sql
ALTER TABLE public.work_items 
  ADD COLUMN location TEXT;

-- Backfill from JSONB
UPDATE public.work_items wi
SET location = (
  SELECT (s.structured_data->'workHistory'->wi.title->>'location')
  FROM sources s
  WHERE s.id = wi.source_id
  LIMIT 1
);
```

**Benefits:**
- Fast location-based queries
- Enable geographic analytics
- Support remote/local job matching

---

### 8. Cover Letter Fields (All JSONB)

**Current Usage:**
- `paragraphs[]` - Template structure analysis
- `stories[]` - Reusable stories (similar to resume stories)
- `templateSignals` - Tone, persona, structure metadata
- `skillsMentioned[]` - Skills extracted from cover letter
- `entityRefs` - References to education/work history

**Query Patterns:**
- ❌ Not queried/filtered
- ✅ Only displayed in evaluation dashboard
- ✅ Used for template generation

**Normalization Decision: ❌ NO (By Design)**

**Reasoning:**
- ✅ Cover letters are source documents, not normalized data
- ✅ Stories from cover letters are stored in `approved_content` (via normalization)
- ✅ Template metadata is analysis-only, not queryable
- ✅ Skills mentioned can be extracted to `user_skills` if needed
- ✅ Entity references are pointers, not data to normalize

**Recommendation:** Keep all cover letter fields in JSONB. This is correct by design:
- Cover letters are source documents
- Extracted stories go to `approved_content` (normalized)
- Template metadata stays in JSONB for analysis
- Skills can be extracted to `user_skills` if normalization is needed

---

## Summary Recommendations

### High Priority ✅ Normalize

| Field | Table | Reason |
|-------|-------|--------|
| `skills[]` | `user_skills` | Frequently queried, job matching, inconsistency with LinkedIn |

### Medium Priority ⚠️ Consider Normalizing

| Field | Table | Reason |
|-------|-------|--------|
| `workHistory[].location` | `work_items.location` | Location-based filtering, geographic analytics |

### Low Priority ⚠️ Maybe Normalize Later

| Field | Table | Reason |
|-------|-------|--------|
| `education[]` | `education` | Job matching by degree/institution |
| `certifications[]` | `certifications` | Certification-based matching |

### Keep in JSONB ❌

| Field | Reason |
|-------|--------|
| `contactInfo` | Single record, display-only, redundant with profiles |
| `summary` | Single record, text field, display-only |
| `projects[]` | Not actively used, display-only |
| **All cover letter fields** | Source documents, by design |

---

## Implementation Priority

### Phase 1: Skills Normalization (High Priority)

**Impact:** Resolves inconsistency, enables job matching

1. Create `user_skills` table
2. Migrate `linkedin_profiles.skills` → `user_skills`
3. Extract `sources.structured_data.skills` → `user_skills` on import
4. Update UI to query `user_skills` instead of JSONB

### Phase 2: Location Normalization (Medium Priority)

**Impact:** Enables location-based filtering

1. Add `location TEXT` to `work_items` table
2. Backfill from existing JSONB data
3. Update normalization to store location

### Phase 3: Education/Certifications (Low Priority)

**Impact:** Job matching by credentials

- Only if job matching becomes a core feature
- Low ROI until matching is needed

---

## Query Performance Comparison

### Current (JSONB Only)
```sql
-- Skills search (slow, requires JSONB parsing)
SELECT * FROM sources 
WHERE structured_data->'skills' @> '[{"items": ["SQL"]}]';
-- No index, full table scan
```

### Normalized (Proposed)
```sql
-- Skills search (fast, indexed)
SELECT DISTINCT user_id FROM user_skills 
WHERE skill = 'SQL';
-- Indexed lookup, O(log n)
```

**Performance Gain:** 10-100x faster for skills queries

---

## Storage Comparison

### Current (JSONB Only)
- Skills: ~200 bytes per source (in JSONB)
- No deduplication
- Duplicate storage across sources

### Normalized
- Skills: ~50 bytes per skill (normalized row)
- Deduplication by `(user_id, skill)`
- Single source of truth

**Storage Efficiency:** 2-4x reduction for skills (with deduplication)

