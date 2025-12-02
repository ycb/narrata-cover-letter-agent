    # Schema Redesign Proposal - Dec 2, 2024

    ## Problem Statement

    Current schema has architectural issues:
    1. **`approved_content` table is deprecated** - Stories should be inline with work_items
    2. **`linkedin_profiles` table duplicates `sources`** - Same data in two places
    3. **Inconsistent processing** - LinkedIn doesn't flow through same pipeline as resume
    4. **Schema doesn't match reality** - Import flow doesn't align with table structure

    ## Current Import Flow (Actual Behavior)

    ### What We Import:
    - **Resume** → Work History (companies + roles + basic achievements)
    - **LinkedIn** → Work History (companies + roles + dates + experience)  
    - **Cover Letter** → **SAVED SECTIONS** (reusable paragraphs) + Template + Stories (optional)

    ### Where It Goes (Priority Order):
    1. **Saved Sections** → `saved_sections` ✅ (PRIMARY - most valuable)
    2. **Template** → `cover_letter_templates` ✅ (SECONDARY - structure)
    3. **Stories** → `approved_content` → `stories` ✅ (TERTIARY - optional)
    4. **Work History** → `companies` + `work_items` ✅ (resume/LinkedIn primary)

    ## Proposed Schema (Clean)

    ### Key Insight: Different Sources Provide Different Data

    - **Resume/LinkedIn** = Work History foundation (companies, roles, dates)
    - **Cover Letter** = Reusable sections (modular paragraphs) + Template (structure)
    - **All Sources** = May contain stories/achievements (but cover letter sections are primary)

    ### Core Tables

    #### 1. `sources` - Universal Input Table
    ```sql
    CREATE TABLE sources (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    
    -- Source Classification
    source_type text NOT NULL CHECK (source_type IN (
        'resume', 'linkedin', 'cover_letter'
    )),
    source_method text NOT NULL CHECK (source_method IN (
        'file_upload', 'appify_api', 'oauth', 'manual'
    )),
    
    -- File Metadata (null for API sources)
    file_name text,
    file_size int,
    file_checksum text,
    storage_path text,
    
    -- Extracted Content
    raw_text text,
    structured_data jsonb,  -- Normalized format for ALL sources
    
    -- Processing State
    processing_status text DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'processing', 'completed', 'failed'
    )),
    processing_error text,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,  -- Soft delete
    is_deleted boolean DEFAULT false
    );

    CREATE INDEX idx_sources_user_type ON sources(user_id, source_type);
    CREATE INDEX idx_sources_processing ON sources(processing_status);
    ```

    **Changes from Current**:
    - ✅ Keep existing columns
    - ➕ Add `source_method` to distinguish file vs API
    - ➕ Expand `source_type` to include `'linkedin'`
    - ➖ Remove distinction between resume/cover_letter in separate tables

    #### 2. `work_items` - Extracted Work History (Resume/LinkedIn)
    ```sql
    CREATE TABLE work_items (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    company_id uuid NOT NULL REFERENCES companies(id),
    source_id uuid REFERENCES sources(id),  -- Which source created this
    
    -- Role Details
    title text NOT NULL,
    start_date date,
    end_date date,
    description text,  -- Basic role description
    
    -- Role-level metadata
    metrics jsonb DEFAULT '[]'::jsonb,
    tags text[] DEFAULT '{}',
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX idx_work_items_user ON work_items(user_id);
    CREATE INDEX idx_work_items_company ON work_items(company_id);
    CREATE INDEX idx_work_items_source ON work_items(source_id);
    ```

    **Changes from Current**:
    - ✅ Keep existing structure
    - ➖ Remove `achievements` array (stories are separate entities)
    - ✅ Keep simple and focused on work history facts

    #### 3. `stories` (rename from `approved_content`) - Extracted Stories
    ```sql
    CREATE TABLE stories (  -- Renamed from approved_content
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid NOT NULL REFERENCES profiles(id),
    work_item_id uuid REFERENCES work_items(id),  -- Links to company/role
    source_id uuid REFERENCES sources(id),  -- Which cover letter it came from
    
    -- Story Content
    title text NOT NULL,
    content text NOT NULL,  -- Full STAR narrative
    
    -- Story Metadata
    status text DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'needs-review')),
    confidence text DEFAULT 'medium' CHECK (confidence IN ('low', 'medium', 'high')),
    
    -- Story Classification
    metrics jsonb DEFAULT '[]'::jsonb,  -- Extracted impact metrics
    tags text[] DEFAULT '{}',  -- Topical tags
    
    -- Usage Tracking
    times_used int DEFAULT 0,
    last_used timestamptz,
    
    -- Timestamps
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
    );

    CREATE INDEX idx_stories_user ON stories(user_id);
    CREATE INDEX idx_stories_work_item ON stories(work_item_id);
    CREATE INDEX idx_stories_source ON stories(source_id);
    ```

    **Changes from Current**:
    - ✅ Rename `approved_content` → `stories` (clearer semantics)
    - ✅ Keep all existing columns
    - ✅ `source_id` now references unified `sources` table

    #### 4. `saved_sections` - Reusable Paragraphs
    ```sql
    -- NO CHANGES NEEDED
    -- This table is already correct
    ```

    #### 5. `cover_letter_templates` - Assembled Templates
    ```sql
    -- NO CHANGES NEEDED  
    -- This table is already correct
    ```

    ### Tables to RENAME

    #### ✅ `approved_content` → `stories`
    **Reason**: "Stories" is clearer and more intuitive than "approved_content".

    **Migration Path**:
    ```sql
    -- Simple rename
    ALTER TABLE approved_content RENAME TO stories;

    -- Update foreign key names for clarity
    ALTER TABLE stories 
    RENAME CONSTRAINT approved_content_user_id_fkey 
    TO stories_user_id_fkey;

    ALTER TABLE stories 
    RENAME CONSTRAINT approved_content_work_item_id_fkey 
    TO stories_work_item_id_fkey;

    -- Update indexes
    ALTER INDEX approved_content_pkey RENAME TO stories_pkey;
    ```

    #### ❌ `linkedin_profiles`
    **Reason**: LinkedIn data should flow through `sources` like resume/cover letter.

    **Migration Path**:
    ```sql
    -- Migrate linkedin_profiles → sources
    INSERT INTO sources (
    user_id, 
    source_type, 
    source_method,
    file_name,
    structured_data,
    processing_status,
    created_at,
    updated_at
    )
    SELECT 
    user_id,
    'linkedin' as source_type,
    'appify_api' as source_method,
    'LinkedIn Profile' as file_name,
    jsonb_build_object(
        'workHistory', experience,
        'education', education,
        'skills', skills,
        'certifications', certifications,
        'projects', projects,
        'summary', about,
        'profileUrl', profile_url,
        'linkedinId', linkedin_id
    ) as structured_data,
    'completed' as processing_status,
    created_at,
    updated_at
    FROM linkedin_profiles;

    -- Update work_items to reference new sources
    UPDATE work_items wi
    SET source_id = s.id
    FROM sources s
    WHERE wi.source_id IS NULL
    AND s.source_type = 'linkedin'
    AND s.user_id = wi.user_id;

    -- Then drop table
    DROP TABLE linkedin_profiles;
    ```

    ## Unified `structured_data` Schema

    All sources normalize to this format in `sources.structured_data`:

    ```typescript
    interface StructuredSourceData {
    // RESUME & LINKEDIN: Work History (PRIMARY for these sources)
    workHistory?: Array<{
        company: string;
        title: string;
        startDate: string;
        endDate?: string;
        current: boolean;
        description: string;  // Basic role description
        location?: string;
    }>;
    
    // COVER LETTER: Saved Sections (PRIMARY - most valuable!)
    savedSections?: Array<{
        title: string;
        content: string;  // Full paragraph text
        type: 'opening' | 'body' | 'closing' | 'custom';
        functionType?: string;  // 'introduction' | 'why_company' | 'achievement' | etc
        purposeTags?: string[];  // ['technical', 'leadership', 'data-driven']
        paragraphIndex?: number;  // Position in original letter
    }>;
    
    // COVER LETTER: Template (SECONDARY - structure pattern)
    template?: {
        name: string;
        sections: Array<{
        type: string;
        content?: string;  // May be empty if just structure
        order: number;
        }>;
    };
    
    // COVER LETTER: Stories (TERTIARY - optional, embedded in sections)
    stories?: Array<{
        title: string;
        content: string;  // Full STAR narrative
        metrics?: Metric[];
        tags?: string[];
        confidence?: 'low' | 'medium' | 'high';
        linkedWorkItem?: {  // Context linking
        company: string;
        role: string;
        dateRange: string;
        };
    }>;
    
    // RESUME & LINKEDIN: Profile Data
    education?: Education[];
    skills?: string[];
    certifications?: Certification[];
    projects?: Project[];
    contactInfo?: {
        email?: string;
        phone?: string;
        location?: string;
        linkedin?: string;
        website?: string;
    };
    summary?: string;
    
    // LinkedIn-specific
    profileUrl?: string;
    linkedinId?: string;
    }
    ```

    ## Processing Pipeline (Unified)

    ### Resume/LinkedIn Processing:
    ```typescript
    async function processWorkHistorySource(sourceId: uuid) {
    const source = await getSource(sourceId);
    const data = source.structured_data;
    
    // 1. Extract Work History → work_items
    if (data.workHistory) {
        for (const job of data.workHistory) {
        const company = await upsertCompany(job.company);
        await createWorkItem({
            companyId: company.id,
            sourceId: source.id,
            title: job.title,
            startDate: job.startDate,
            endDate: job.endDate,
            description: job.description,  // Basic description only
            metrics: []  // No metrics yet - those come from stories
        });
        }
    }
    
    // 2. Extract Skills
    if (data.skills) {
        for (const skill of data.skills) {
        await upsertUserSkill({
            userId: source.user_id,
            skill: skill,
            sourceType: source.source_type,
            sourceId: source.id
        });
        }
    }
    
    // 3. Extract Education (if any)
    if (data.education) {
        for (const edu of data.education) {
        await createEducation({
            userId: source.user_id,
            sourceId: source.id,
            institution: edu.institution,
            degree: edu.degree,
            ...edu
        });
        }
    }
    }
    ```

    ### Cover Letter Processing (Priority Order):
    ```typescript
    async function processCoverLetterSource(sourceId: uuid) {
    const source = await getSource(sourceId);
    const data = source.structured_data;
    
    // 1. PRIMARY: Extract Saved Sections (most valuable!)
    if (data.savedSections) {
        console.log(`📝 Extracting ${data.savedSections.length} saved sections`);
        
        for (const section of data.savedSections) {
        await createSavedSection({
            userId: source.user_id,
            sourceId: source.id,
            title: section.title,
            content: section.content,
            type: section.type,
            functionType: section.functionType,
            purposeTags: section.purposeTags,
            paragraphIndex: section.paragraphIndex
        });
        }
    }
    
    // 2. SECONDARY: Extract Template (structure pattern)
    if (data.template) {
        console.log(`📋 Extracting template: ${data.template.name}`);
        
        await upsertTemplate({
        userId: source.user_id,
        name: data.template.name,
        sections: data.template.sections
        });
    }
    
    // 3. TERTIARY: Extract Stories (optional, embedded in sections)
    if (data.stories && data.stories.length > 0) {
        console.log(`💡 Extracting ${data.stories.length} stories`);
        
        for (const story of data.stories) {
        // Match story to work_item by company/role
        const workItem = await findMatchingWorkItem(
            story.linkedWorkItem?.company,
            story.linkedWorkItem?.role
        );
        
        await createStory({
            userId: source.user_id,
            workItemId: workItem?.id,  // May be null if can't match
            sourceId: source.id,
            title: story.title,
            content: story.content,
            metrics: story.metrics || [],
            tags: story.tags || [],
            confidence: story.confidence || 'medium',
            status: 'draft'
        });
        }
    }
    
    // 4. RARE: Extract work history if mentioned
    if (data.workHistory && data.workHistory.length > 0) {
        console.warn('⚠️ Cover letter contains work history - unusual case');
        await processWorkHistorySource(sourceId);
    }
    }
    ```

    ## Benefits of This Design

    ### 1. **Single Source of Truth**
    - All imported data goes through `sources` table
    - Consistent processing pipeline for resume/LinkedIn/cover letter
    - Easy to trace: "Where did this work_item come from?" → `source_id`

    ### 2. **No Duplication**
    - LinkedIn doesn't have separate table
    - Stories don't have separate table
    - Skills deduplicated in `user_skills`

    ### 3. **Simpler UI**
    - Work History page queries: `work_items` (all sources combined)
    - LinkedIn panel queries: `sources WHERE source_type = 'linkedin'`
    - No need to check multiple tables

    ### 4. **Better Lineage Tracking**
    ```sql
    -- "Where did this work experience come from?"
    SELECT 
    wi.title,
    c.name as company,
    s.source_type,
    s.source_method,
    s.file_name,
    s.created_at
    FROM work_items wi
    JOIN companies c ON wi.company_id = c.id
    JOIN sources s ON wi.source_id = s.id
    WHERE wi.user_id = '[user-id]'
    ORDER BY s.created_at DESC;
    ```

    ### 5. **Easier to Extend**
    Want to add Google Docs import? Just add:
    ```sql
    INSERT INTO sources (
    source_type = 'google_doc',
    source_method = 'google_api',
    structured_data = { ... }
    )
    ```
    Processing pipeline handles it automatically.

    ## Migration Plan

    ### Phase 1: Extend `sources` (Non-Breaking)
    ```sql
    -- Add source_method column
    ALTER TABLE sources 
    ADD COLUMN source_method text 
    CHECK (source_method IN ('file_upload', 'appify_api', 'oauth', 'manual'));

    -- Backfill existing data
    UPDATE sources 
    SET source_method = 'file_upload' 
    WHERE source_method IS NULL;

    -- Add LinkedIn to source_type
    ALTER TABLE sources 
    DROP CONSTRAINT IF EXISTS sources_source_type_check;

    ALTER TABLE sources 
    ADD CONSTRAINT sources_source_type_check 
    CHECK (source_type IN ('resume', 'cover_letter', 'linkedin'));
    ```

    ### Phase 2: Migrate LinkedIn Data
    ```sql
    -- Copy linkedin_profiles → sources
    -- (See SQL above)

    -- Update work_items.source_id to point to new sources
    -- (See SQL above)

    -- Update UI to use sources instead of linkedin_profiles
    -- (Code changes in LinkedInDataSource.tsx)
    ```

    ### Phase 3: Rename Stories Table
    ```sql
    -- Simple rename for clarity
    ALTER TABLE approved_content RENAME TO stories;

    -- Update constraint names
    ALTER TABLE stories 
    RENAME CONSTRAINT approved_content_user_id_fkey TO stories_user_id_fkey;

    ALTER TABLE stories 
    RENAME CONSTRAINT approved_content_work_item_id_fkey TO stories_work_item_id_fkey;

    -- Add source_id if not exists
    ALTER TABLE stories 
    ADD COLUMN source_id uuid REFERENCES sources(id);

    -- Backfill source_id from existing data (if possible)
    -- This may require custom logic based on created_at timestamps
    ```

    ### Phase 4: Drop Deprecated Tables
    ```sql
    -- After confirming migration successful
    DROP TABLE linkedin_profiles CASCADE;

    -- Note: approved_content renamed to stories, not dropped
    ```

    ## Backward Compatibility

    During migration, support BOTH:
    - **Old path**: linkedin_profiles → UI
    - **New path**: sources (type=linkedin) → work_items → UI

    ```typescript
    // LinkedInDataSource.tsx
    const fetchLinkedInData = async () => {
    // NEW: Try sources first
    const { data: source } = await supabase
        .from('sources')
        .select('*')
        .eq('source_type', 'linkedin')
        .single();
    
    if (source) return source;
    
    // LEGACY: Fall back to linkedin_profiles
    const { data: profile } = await supabase
        .from('linkedin_profiles')
        .select('*')
        .single();
    
    return convertLegacyProfile(profile);
    };
    ```

    ## Resolved Questions

    1. **Stories as inline vs separate entities?**
    - ✅ **SEPARATE** - Cover letters contain rich standalone stories
    - Stories need their own table for reuse tracking, metrics, tags
    - Keep `approved_content` but rename to `stories`

    2. **Should `user_skills` also reference `source_id`?**
    - ✅ Yes - After migration, only references unified `sources` table
    - Remove `linkedin_profile_id` column after migration

    3. **How to handle story reuse?**
    - ✅ `stories.times_used` tracks usage count
    - ✅ `stories.last_used` tracks last usage timestamp
    - Cover letter generation increments these counters

    ## Recommendation

    **Start with Phase 1 + 2**:
    1. ✅ Extend `sources` to include LinkedIn
    2. ✅ Migrate `linkedin_profiles` → `sources`
    3. ✅ Update processing pipeline to handle all source types uniformly

    **Do Phase 3** (Simple rename):
    - ✅ `approved_content` → `stories` (just rename, keep structure)
    - ✅ Add `source_id` column to track which cover letter the story came from
    - ✅ Update UI to use new table name

    ## Files to Update

    ### Backend (Processing):
    - `src/services/fileUploadService.ts` - Unify processing pipeline
    - `src/services/appifyService.ts` - Output to `sources` not `linkedin_profiles`

    ### Frontend (UI):
    - `src/components/work-history/LinkedInDataSource.tsx` - Read from `sources`
    - `src/pages/WorkHistory.tsx` - Combine all work_items regardless of source

    ### Database:
    - `supabase/migrations/XXX_unify_sources.sql` - Schema changes
    - `supabase/migrations/XXX_migrate_linkedin.sql` - Data migration

