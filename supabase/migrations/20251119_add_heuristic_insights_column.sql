-- Add heuristic_insights column to cover_letters table
-- Phase 1: Agent D - Heuristic Gap Detection
-- Stores instant gap feedback generated using keyword matching and templates (no LLM calls)
-- Provides actionable feedback in ~5 seconds while waiting for full LLM analysis

ALTER TABLE cover_letters
ADD COLUMN IF NOT EXISTS heuristic_insights JSONB;

COMMENT ON COLUMN cover_letters.heuristic_insights IS 'Instant gap insights generated using heuristic analysis (keyword matching, STAR format detection, requirement coverage). Provides fast feedback while LLM metrics are calculating.';
