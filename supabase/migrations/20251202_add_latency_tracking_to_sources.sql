-- Add latency tracking columns to sources table for performance monitoring
-- These columns track processing time for each stage of file upload

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS extraction_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS llm_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS db_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS total_processing_ms INTEGER;

-- Add index for querying latency trends
CREATE INDEX IF NOT EXISTS idx_sources_processing_latency
  ON public.sources(created_at, total_processing_ms)
  WHERE total_processing_ms IS NOT NULL;

COMMENT ON COLUMN public.sources.extraction_latency_ms IS 'Time to extract text from PDF/DOCX in milliseconds';
COMMENT ON COLUMN public.sources.llm_latency_ms IS 'Time for LLM analysis (resume/cover letter parsing) in milliseconds';
COMMENT ON COLUMN public.sources.db_latency_ms IS 'Time to save structured data to database in milliseconds';
COMMENT ON COLUMN public.sources.total_processing_ms IS 'Total processing time from upload start to completion in milliseconds';

