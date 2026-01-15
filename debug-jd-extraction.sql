-- ============================================================================
-- Job Description Extraction Reliability Check
-- ============================================================================
-- Run this against your Supabase database to assess how well the LLM is
-- populating company fields (companyIndustry, companyVertical, etc.)
--
-- USAGE: Copy/paste into Supabase SQL Editor and run
-- ============================================================================

-- 1. AGGREGATE STATS: What percentage of JDs have each field populated?
-- ============================================================================
SELECT 
  COUNT(*) as total_jobs,
  COUNT(structured_data->>'companyIndustry') as has_industry,
  COUNT(structured_data->>'companyVertical') as has_vertical,
  COUNT(structured_data->>'companyBusinessModel') as has_business_model,
  COUNT(structured_data->>'buyerSegment') as has_buyer_segment,
  COUNT(structured_data->>'userSegment') as has_user_segment,
  ROUND(100.0 * COUNT(structured_data->>'companyIndustry') / NULLIF(COUNT(*), 0), 1) as pct_industry,
  ROUND(100.0 * COUNT(structured_data->>'companyVertical') / NULLIF(COUNT(*), 0), 1) as pct_vertical,
  ROUND(100.0 * COUNT(structured_data->>'companyBusinessModel') / NULLIF(COUNT(*), 0), 1) as pct_business_model,
  ROUND(100.0 * COUNT(structured_data->>'buyerSegment') / NULLIF(COUNT(*), 0), 1) as pct_buyer_segment,
  ROUND(100.0 * COUNT(structured_data->>'userSegment') / NULLIF(COUNT(*), 0), 1) as pct_user_segment
FROM job_descriptions;


-- 2. SAMPLE RECENT EXTRACTIONS: See actual values for most recent 20 JDs
-- ============================================================================
SELECT 
  id,
  company,
  role,
  created_at,
  (structured_data->>'companyIndustry') as industry,
  (structured_data->>'companyVertical') as vertical,
  (structured_data->>'companyBusinessModel') as business_model,
  (structured_data->>'buyerSegment') as buyer_segment,
  (structured_data->>'userSegment') as user_segment,
  (structured_data->>'companyMaturity') as maturity,
  (structured_data->>'salary') as salary,
  (structured_data->>'workType') as work_type,
  (structured_data->>'location') as location,
  LENGTH(content) as jd_length_chars
FROM job_descriptions
ORDER BY created_at DESC
LIMIT 20;


-- 3. IDENTIFY NULLS: JDs where companyIndustry is missing (should be rare)
-- ============================================================================
-- These are cases where the LLM failed to extract industry - review manually
SELECT 
  id,
  company,
  role,
  created_at,
  SUBSTRING(content, 1, 300) as content_preview,
  LENGTH(content) as jd_length
FROM job_descriptions
WHERE (structured_data->>'companyIndustry') IS NULL
   OR (structured_data->>'companyIndustry') = ''
   OR (structured_data->>'companyIndustry') = 'null'
ORDER BY created_at DESC
LIMIT 10;


-- 4. VALUE DISTRIBUTION: See most common values extracted
-- ============================================================================
-- Company Industry distribution
SELECT 
  (structured_data->>'companyIndustry') as industry,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM job_descriptions
WHERE (structured_data->>'companyIndustry') IS NOT NULL
GROUP BY (structured_data->>'companyIndustry')
ORDER BY count DESC
LIMIT 15;

-- Business Model distribution
SELECT 
  (structured_data->>'companyBusinessModel') as business_model,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM job_descriptions
WHERE (structured_data->>'companyBusinessModel') IS NOT NULL
GROUP BY (structured_data->>'companyBusinessModel')
ORDER BY count DESC
LIMIT 15;


-- 5. QUALITY CHECK: Multi-field population rate
-- ============================================================================
-- How many JDs have at least 3 of the 5 key fields populated?
SELECT 
  CASE
    WHEN field_count >= 4 THEN 'Excellent (4-5 fields)'
    WHEN field_count = 3 THEN 'Good (3 fields)'
    WHEN field_count = 2 THEN 'Fair (2 fields)'
    WHEN field_count = 1 THEN 'Poor (1 field)'
    ELSE 'Failed (0 fields)'
  END as extraction_quality,
  COUNT(*) as job_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM (
  SELECT 
    id,
    (CASE WHEN (structured_data->>'companyIndustry') IS NOT NULL AND (structured_data->>'companyIndustry') != '' THEN 1 ELSE 0 END +
     CASE WHEN (structured_data->>'companyVertical') IS NOT NULL AND (structured_data->>'companyVertical') != '' THEN 1 ELSE 0 END +
     CASE WHEN (structured_data->>'companyBusinessModel') IS NOT NULL AND (structured_data->>'companyBusinessModel') != '' THEN 1 ELSE 0 END +
     CASE WHEN (structured_data->>'buyerSegment') IS NOT NULL AND (structured_data->>'buyerSegment') != '' THEN 1 ELSE 0 END +
     CASE WHEN (structured_data->>'userSegment') IS NOT NULL AND (structured_data->>'userSegment') != '' THEN 1 ELSE 0 END
    ) as field_count
  FROM job_descriptions
) subquery
GROUP BY extraction_quality
ORDER BY 
  CASE extraction_quality
    WHEN 'Excellent (4-5 fields)' THEN 1
    WHEN 'Good (3 fields)' THEN 2
    WHEN 'Fair (2 fields)' THEN 3
    WHEN 'Poor (1 field)' THEN 4
    ELSE 5
  END;


-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================
-- 
-- Query 1 (Aggregate Stats):
--   - Target: companyIndustry ≥70%, companyBusinessModel ≥60%
--   - Acceptable: companyVertical ≥40%, buyerSegment ≥50%, userSegment ≥40%
--
-- Query 2 (Sample Recent):
--   - Manual review: Do extracted values look accurate?
--   - Check for: Empty fields, generic values, incorrect categorization
--
-- Query 3 (Identify Nulls):
--   - Review content_preview to see if industry info was present
--   - If industry info exists but wasn't extracted → Prompt needs improvement
--
-- Query 4 (Value Distribution):
--   - Are values normalized consistently? (e.g., "B2B SaaS" vs "b2b saas")
--   - Are values specific enough? (e.g., "Legal Tech" vs "Technology")
--
-- Query 5 (Quality Check):
--   - Target: ≥70% of JDs should be "Good" or "Excellent"
--   - If most are "Fair" or below → Prompt needs strengthening
--
-- ============================================================================
