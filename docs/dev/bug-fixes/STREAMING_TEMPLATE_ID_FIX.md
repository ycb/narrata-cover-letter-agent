# Streaming Bug Fix: template_id Constraint Violation

**Date**: 2025-01-25  
**Issue**: Cover letter draft generation failing with database constraint error  
**Status**: ✅ **FIXED**

---

## Problem

### Error Message
```
null value in column "template_id" of relation "cover_letters" violates not-null constraint
```

### Symptoms
- User clicks "Generate Cover Letter"
- Progress spinner shows "Generating..."
- After pipeline completes, page returns to JD input screen
- Draft never appears
- 500 error in Edge Function

### Root Cause

The `cover_letters` table schema has a `NOT NULL` constraint on `template_id`:

```sql
CREATE TABLE public.cover_letters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  template_id UUID REFERENCES public.cover_letter_templates(id) NOT NULL, -- ❌ PROBLEM
  job_description_id UUID REFERENCES public.job_descriptions(id) NOT NULL,
  sections JSONB NOT NULL,
  -- ...
);
```

However, the streaming MVP doesn't implement the template system yet. The pipeline tries to insert:

```typescript
// supabase/functions/_shared/pipelines/cover-letter.ts
.insert({
  user_id: job.user_id,
  job_description_id: jobDescriptionId,
  template_id: job.input.templateId || null, // ❌ null when no template
  sections: [...]
})
```

When `job.input.templateId` is undefined, it inserts `null`, violating the constraint.

---

## Solution

### Migration: Make template_id Nullable

**File**: `supabase/migrations/030_make_template_id_nullable.sql`

```sql
-- Make template_id nullable in cover_letters table
-- Streaming MVP doesn't use templates yet, so this allows draft generation without a template

ALTER TABLE public.cover_letters
  ALTER COLUMN template_id DROP NOT NULL;

COMMENT ON COLUMN public.cover_letters.template_id IS 'Optional reference to cover letter template. Null for AI-generated drafts without a specific template.';
```

### Deployment

✅ Migration applied to hosted Supabase using MCP tool  
✅ Migration file committed to repo  
✅ Ready for production deployment  

---

## Testing

### Before Fix
```
❌ Generate cover letter → 500 error
❌ template_id constraint violation
❌ No draft created
```

### After Fix
```
✅ Generate cover letter → Success
✅ Draft saved with template_id = null
✅ Draft loads in UI
```

---

## Future Considerations

### When Template System is Implemented

1. **Create default template**: 
   ```sql
   INSERT INTO cover_letter_templates (user_id, template_name, template_type)
   VALUES (system_user_id, 'Default', 'standard')
   RETURNING id;
   ```

2. **Use default template in pipeline**:
   ```typescript
   template_id: job.input.templateId || defaultTemplateId
   ```

3. **Optional**: Add back `NOT NULL` constraint with default

### Schema Evolution Path

```
Phase 1 (Current): template_id NULLABLE ✅
  ↓
Phase 2: Create default templates per user
  ↓
Phase 3: Allow user to select template
  ↓
Phase 4 (Optional): Make template_id NOT NULL with DEFAULT
```

---

## Related Files

- **Migration**: `supabase/migrations/030_make_template_id_nullable.sql`
- **Pipeline**: `supabase/functions/_shared/pipelines/cover-letter.ts` (line 265)
- **Schema**: `supabase/migrations/001_initial_schema.sql` (line 115-125)

---

## Commit

```
6be53d5 - fix(streaming): make template_id nullable in cover_letters table
```

---

## Summary

The `template_id NOT NULL` constraint was a blocker for the streaming MVP. Making it nullable allows draft generation without implementing the full template system. This is a safe change that aligns with the MVP approach and can be evolved later when templates are implemented.

**Impact**: Unblocks cover letter streaming  
**Risk**: Low (nullable FK is standard pattern)  
**Reversibility**: High (can add constraint back later)

