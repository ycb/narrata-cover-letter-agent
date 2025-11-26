-- Make template_id nullable in cover_letters table
-- Streaming MVP doesn't use templates yet, so this allows draft generation without a template

ALTER TABLE public.cover_letters
  ALTER COLUMN template_id DROP NOT NULL;

COMMENT ON COLUMN public.cover_letters.template_id IS 'Optional reference to cover letter template. Null for AI-generated drafts without a specific template.';

