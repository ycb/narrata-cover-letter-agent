# Phase 5: Database Schema - Analysis & Decision
**Date**: November 14, 2025  
**Branch**: `feature/my-prompts-goals-voice-integration`  
**Status**: ✅ **NOT NEEDED FOR MVP** (Deferred to Future)

---

## Current Schema Assessment

### Existing Structure
**Migration**: `009_add_profile_columns.sql`

```sql
-- profiles table has:
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goals TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_voice TEXT;
```

**Current Usage**:
- `profiles.goals` → Stores user career goals as JSON
- `profiles.user_voice` → Stores writing style prompt as JSON: `{ prompt: string, lastUpdated: string }`

---

## MVP Analysis

### What MVP Requires
For the My Prompts MVP, we only have:
1. **Writing Style** - User's voice/tone for content generation

### Current Storage
- ✅ Writing Style is stored in `profiles.user_voice`
- ✅ Data structure supports the prompt format
- ✅ UserPreferencesService already handles load/save
- ✅ UI reads from and writes to this column

### Conclusion for MVP
**NO SCHEMA CHANGES NEEDED** ✅

The existing `profiles.user_voice` column is sufficient for MVP with a single editable prompt.

---

## Future Considerations

When we add more user-editable prompts (Phase 2+), we have two options:

### Option A: Add More Columns to Profiles (Simple)
**Pros**:
- Easy to implement
- No migration complexity
- Direct access per prompt type

**Cons**:
- Schema changes needed for each new prompt type
- Less flexible
- Profiles table becomes cluttered

**Example**:
```sql
ALTER TABLE profiles ADD COLUMN story_generation_prompt TEXT;
ALTER TABLE profiles ADD COLUMN job_matching_prompt TEXT;
ALTER TABLE profiles ADD COLUMN gap_detection_prompt TEXT;
```

### Option B: Create User Prompts Table (Scalable) ⭐ RECOMMENDED
**Pros**:
- Highly flexible - add prompts without schema changes
- Clean separation of concerns
- Supports versioning and history
- Can add metadata (created_at, updated_at, version)

**Cons**:
- Slightly more complex queries
- Requires migration and RLS policies
- Need to handle prompt type enum

**Schema Design**:
```sql
-- Create enum for prompt types
CREATE TYPE prompt_type AS ENUM (
  'writing-style',
  'story-generation',
  'role-description',
  'saved-section',
  'job-matching',
  'gap-detection'
);

-- Create user_prompts table
CREATE TABLE user_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_type prompt_type NOT NULL,
  prompt_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one active prompt per type per user
  UNIQUE(user_id, prompt_type, is_active) WHERE is_active = true
);

-- Add RLS policies
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prompts"
  ON user_prompts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts"
  ON user_prompts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts"
  ON user_prompts FOR UPDATE
  USING (auth.uid() = user_id);

-- Add indexes
CREATE INDEX idx_user_prompts_user_id ON user_prompts(user_id);
CREATE INDEX idx_user_prompts_type ON user_prompts(prompt_type);
CREATE INDEX idx_user_prompts_active ON user_prompts(user_id, prompt_type) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_user_prompts_updated_at
  BEFORE UPDATE ON user_prompts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Migration Strategy (When Adding More Prompts)

### Step 1: Create User Prompts Table
Apply the migration above to create `user_prompts` table.

### Step 2: Migrate Existing Data
```sql
-- Migrate writing style prompts from profiles.user_voice
INSERT INTO user_prompts (user_id, prompt_type, prompt_content, created_at)
SELECT 
  id,
  'writing-style'::prompt_type,
  user_voice,
  NOW()
FROM profiles
WHERE user_voice IS NOT NULL AND user_voice != '';
```

### Step 3: Update Service Layer
- Create `UserPromptsService` to handle CRUD operations
- Update `UserPreferencesService` to use new table
- Keep backward compatibility with profiles.user_voice during transition

### Step 4: Update UI
- MyPromptsModal already supports multiple prompts
- Just add new prompt definitions to `AVAILABLE_PROMPTS` array
- Update `handleSave()` to save to user_prompts table

---

## Benefits of Deferred Approach

### Why Wait?
1. **YAGNI Principle**: You Aren't Gonna Need It (yet)
   - We don't have other prompts to store
   - Premature optimization wastes effort

2. **Validation Period**: 
   - Test Writing Style prompt with users first
   - Gather feedback on what other prompts are needed
   - Understand usage patterns before committing to schema

3. **Risk Reduction**:
   - Avoid migration complexity until necessary
   - Less chance of schema design mistakes
   - Can incorporate user feedback into final design

4. **Development Velocity**:
   - Ship MVP faster without extra work
   - Iterate based on real usage
   - Add complexity only when justified

---

## Decision Matrix

| Approach | When to Use | Complexity | Flexibility |
|----------|-------------|------------|-------------|
| **Current (MVP)** | 1 prompt | Low ✅ | N/A |
| **Option A: Add Columns** | 2-3 prompts | Medium | Low |
| **Option B: User Prompts Table** | 4+ prompts | High | High ⭐ |

---

## Recommendations

### For Current MVP (Phase 5)
✅ **NO ACTION REQUIRED**
- Use existing `profiles.user_voice` column
- Ship with Writing Style prompt only
- Monitor user feedback and usage

### For Future (When Adding Prompts 2-4+)
⭐ **IMPLEMENT OPTION B: User Prompts Table**
- Create dedicated table for scalability
- Migrate existing data
- Update services to use new table
- Maintain backward compatibility during transition

### Threshold for Action
**Trigger**: When we decide to add 2nd or 3rd user-editable prompt
**Lead Time**: 1-2 days for migration + testing
**Risk**: Low (can migrate data safely)

---

## Phase 5 Summary

**Status**: ✅ **Deferred - Not Needed for MVP**

**Current State**:
- `profiles.user_voice` sufficient for Writing Style prompt
- No schema changes required
- UI already extensible for future prompts

**Future State** (when needed):
- Create `user_prompts` table
- Migrate existing data
- Update services
- Unlock unlimited prompt customization

**Action Items**: None for MVP ✅

---

**Phase 5: Analysis Complete - No Work Required** 🎉

MVP ships with existing schema. Future expansion path is documented and ready when needed.

