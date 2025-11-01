# Manual Migration 009 Application

## Migration: Add goals and user_voice columns to profiles table

This migration needs to be applied manually in your Supabase SQL Editor.

## Steps:

1. Go to your Supabase Dashboard → SQL Editor
2. Create a new query
3. Paste and run this SQL:

```sql
-- Migration: Add goals and user_voice columns to profiles table
-- Migration: 009_add_profile_columns.sql
--
-- Cover letters and user input can contain:
-- - Goals: Career goals, job search preferences, relocation preferences
-- - User voice: Writing style, tone, preferences for how they communicate

-- Add goals column (TEXT - can store structured JSON or plain text)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS goals TEXT;

-- Add user_voice column (TEXT - can store structured JSON or plain text)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_voice TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.goals IS 'User career goals, job search preferences, and preferences (e.g., relocation, industry focus). Can be structured JSON or plain text.';
COMMENT ON COLUMN public.profiles.user_voice IS 'User writing style, tone, and communication preferences extracted from cover letters and user input. Can be structured JSON or plain text.';
```

## Verification:

After applying, verify with:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('goals', 'user_voice');
```

You should see both columns listed.

