-- Migration: add_processing_stage_to_sources

ALTER TABLE sources 
ADD COLUMN IF NOT EXISTS processing_stage TEXT DEFAULT 'pending';

-- MVP values: 'pending', 'extracting', 'skeleton', 'skills', 'complete', 'error'

CREATE INDEX IF NOT EXISTS idx_sources_processing_stage 
ON sources(processing_stage);


