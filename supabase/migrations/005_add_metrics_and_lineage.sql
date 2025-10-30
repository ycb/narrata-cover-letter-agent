-- Migration: Add metrics JSONB columns and data lineage tracking
-- Migration: 005_add_metrics_and_lineage.sql
-- 
-- Adds:
-- 1. company_id to approved_content (denormalized for performance)
-- 2. metrics JSONB to work_items (structured role-level metrics)
-- 3. metrics JSONB to approved_content (structured story-level metrics)
-- 4. source_id to approved_content (data lineage tracking)
-- 5. source_id to work_items (optional role-level tracking)

-- 1. Add company_id to approved_content (denormalized for query performance)
ALTER TABLE public.approved_content 
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_approved_content_company_id ON public.approved_content(company_id);

-- Backfill company_id from work_items relationship
UPDATE public.approved_content ac
SET company_id = wi.company_id
FROM public.work_items wi
WHERE ac.work_item_id = wi.id
  AND ac.company_id IS NULL;

-- 2. Add metrics JSONB to work_items (structured role-level metrics)
ALTER TABLE public.work_items 
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_work_items_metrics_gin ON public.work_items USING GIN (metrics);

-- 3. Add metrics JSONB to approved_content (structured story-level metrics)
ALTER TABLE public.approved_content
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_approved_content_metrics_gin ON public.approved_content USING GIN (metrics);

-- 4. Add source_id to approved_content (data lineage tracking)
ALTER TABLE public.approved_content
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_approved_content_source_id ON public.approved_content(source_id);

-- 5. Add source_id to work_items (optional role-level tracking)
ALTER TABLE public.work_items
  ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.sources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_items_source_id ON public.work_items(source_id);

-- Add comments for documentation
COMMENT ON COLUMN public.approved_content.company_id IS 'Denormalized company reference for query performance. Can be accessed via work_item_id JOIN but stored here to avoid JOINs.';
COMMENT ON COLUMN public.approved_content.metrics IS 'Structured story-level metrics as JSONB array. Each metric includes value, unit, context, type, parentType ("story"), etc.';
COMMENT ON COLUMN public.approved_content.source_id IS 'References the source file/upload that generated this content. Enables data lineage tracking.';
COMMENT ON COLUMN public.work_items.metrics IS 'Structured role-level metrics as JSONB array. Each metric includes value, unit, context, type, parentType ("role"), etc.';
COMMENT ON COLUMN public.work_items.source_id IS 'References the source file/upload that generated this work item. Enables data lineage tracking.';

