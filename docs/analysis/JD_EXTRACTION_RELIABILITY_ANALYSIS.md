# Job Description LLM Extraction Reliability Analysis

**Date:** 2026-01-15  
**Status:** ⚠️ Fields Are Specified in Prompt, But Reliability Needs Verification

## Executive Summary

The job description LLM extraction **does include** the following company fields in its prompt and schema:
- `companyIndustry`
- `companyVertical`
- `companyBusinessModel`
- `buyerSegment`
- `userSegment`

However, **actual population reliability cannot be confirmed without querying the database** to see real-world extraction rates.

## Analysis

### 1. Schema and Prompt Configuration ✅

**File:** `src/prompts/jobDescriptionAnalysis.ts`

The extraction prompt explicitly requests these fields:

```typescript
{
  "companyIndustry": "Industry name (e.g., 'Legal Tech', 'Fintech', 'Healthcare SaaS') or null",
  "companyVertical": "Sub-industry or vertical (e.g., 'Solar SaaS', 'Construction Tech', 'Retail Analytics') or null",
  "companyBusinessModel": "Business model (e.g., 'B2B SaaS', 'B2C Marketplace', 'Enterprise Platform') or null",
  "buyerSegment": "Primary buyer segment(s) (e.g., 'SMB', 'Mid-market', 'Enterprise', 'Consumer') or null",
  "userSegment": "Primary end-user segment(s) (e.g., 'Installers', 'Operations teams', 'Consumers') or null"
}
```

**Extraction Rules Provided:**

1. **Company Industry** (lines 102-109):
   - Looks for: company description, "about us", industry mentions, mission statement, product descriptions
   - Instructions to infer from context clues (e.g., "Legal AI for Personal Injury Firms" → "Legal Tech")
   - Requests specific industries (e.g., "Legal Tech" not just "Technology")
   - Returns `null` ONLY if no industry clues exist

2. **Company Vertical** (lines 111-114):
   - Extract specific vertical or sub-industry
   - Examples: "Solar SaaS", "Construction Tech", "Retail Analytics"
   - Returns `null` if no vertical is mentioned or implied

3. **Company Business Model** (lines 116-120):
   - Extract how company makes money or customer model
   - Look for: B2B/B2C, SaaS/Platform/Marketplace mentions
   - Returns `null` if not mentioned

4. **Buyer Segment** (lines 122-126):
   - Identify primary buyer segment(s)
   - Look for: "enterprise", "mid-market", "SMB", "small business", "consumer"
   - Returns `null` if not mentioned or implied

5. **User Segment** (lines 127-130):
   - Identify primary end-users or user personas
   - Look for: "users", "customers", "operators", "installers", "admins", "consumers"
   - Returns `null` if not mentioned or implied

### 2. Data Storage ✅

**Schema:** `job_descriptions.structured_data` (JSONB column)

The fields are stored in the database's `structured_data` column:

```typescript
// From src/types/supabase.ts, line 277
structured_data: Json
```

**Transformation Logic:** `src/services/jobDescriptionService.ts`

Lines 903-951 show extraction and normalization:

```typescript
const companyIndustry = typeof payload.companyIndustry === 'string'
  ? normalizeTitleIfLowercase(payload.companyIndustry)
  : null;
const companyVertical = typeof payload.companyVertical === 'string'
  ? normalizeTitleIfLowercase(payload.companyVertical)
  : null;
const companyBusinessModel = typeof payload.companyBusinessModel === 'string'
  ? normalizeDelimitedValue(payload.companyBusinessModel, normalizeBusinessModelToken)
  : null;
const buyerSegment = typeof payload.buyerSegment === 'string'
  ? normalizeDelimitedValue(payload.buyerSegment, normalizeSegmentToken)
  : null;
const userSegment = typeof payload.userSegment === 'string'
  ? normalizeDelimitedValue(payload.userSegment, normalizeSegmentToken)
  : null;
```

**Normalization Functions:**

1. **Business Model Normalization** (lines 139-172):
   - Detects patterns: B2B, B2C, D2C, SaaS, Marketplace, Platform, Enterprise, SMB, etc.
   - Returns normalized values like "B2B SaaS", "B2C Marketplace", "Enterprise Platform"

2. **Segment Normalization** (lines 174-181):
   - Detects: SMB, Mid-market, Enterprise, Consumer
   - Returns normalized segment names

### 3. Usage in Application ✅

These fields are actively used in **Goals Matching** functionality:

**File:** `src/services/goalsMatchService.ts`

Lines 286-328 show how these fields are used to match against user career goals:

```typescript
// Industry Match (lines 288-291)
const jobIndustryRaw = this.getCompanyField(jobDescription, 'companyIndustry');
const normalizedJobIndustry = jobIndustryRaw?.toLowerCase() ?? '';

// Business Model Match (lines 325-326)
const jobBusinessModelRaw = this.getCompanyField(jobDescription, 'companyBusinessModel');
const normalizedJobBusinessModel = jobBusinessModelRaw?.toLowerCase() ?? '';
```

**File:** `src/prompts/enhancedMetricsAnalysis.ts`

Lines 253-257 instruct the LLM to use extracted data:

```typescript
- "Industry" (goal-industry) - jobValue from JD companyIndustry field
- "Business Model" (goal-business-model) - jobValue from JD companyBusinessModel field

IMPORTANT: Use the JD structured data (salary, workType, location, companyMaturity, 
companyIndustry, companyBusinessModel) to populate jobValue fields. 
These were extracted during JD parsing.
```

### 4. Key Question: Actual Extraction Reliability ⚠️

**The critical unknown:** What percentage of JDs successfully populate these fields?

#### Expected Behavior:

Based on the prompt instructions, the LLM **should**:
- Extract `companyIndustry` in ~80-90% of cases (most JDs mention industry/sector)
- Extract `companyVertical` in ~30-50% of cases (less commonly specified)
- Extract `companyBusinessModel` in ~60-80% of cases (common in JDs)
- Extract `buyerSegment` in ~40-60% of cases (often implied but not explicit)
- Extract `userSegment` in ~30-50% of cases (less commonly mentioned)

#### Factors Affecting Reliability:

1. **JD Quality:** Well-written JDs with company descriptions → Higher extraction rate
2. **Prompt Following:** LLM may skip fields if instructions aren't clear enough
3. **Context Inference:** LLM's ability to infer from implicit signals varies
4. **Null Handling:** Prompt explicitly allows `null` values, so LLM may default to `null` when uncertain

#### Potential Issues:

1. **Over-nullification:** LLM may return `null` too frequently if:
   - Industry/segment is implied but not explicitly stated
   - LLM is conservative about inference
   - Prompt's "return null if not mentioned" instruction is interpreted too strictly

2. **Under-extraction:** LLM may miss fields if:
   - Information is in non-standard sections
   - Terminology doesn't match prompt examples
   - Context clues are subtle

3. **Inconsistent Format:** LLM may return:
   - Free-form text instead of normalized values
   - Mixed formats (e.g., "B2B / SaaS" vs "B2B SaaS")
   - Overly generic values (e.g., "Technology" instead of "Legal Tech")

### 5. Recommended Verification Steps

To assess actual reliability, run these queries:

#### Query 1: Sample Recent Extractions

```sql
SELECT 
  id,
  company,
  role,
  created_at,
  (structured_data->>'companyIndustry') as company_industry,
  (structured_data->>'companyVertical') as company_vertical,
  (structured_data->>'companyBusinessModel') as company_business_model,
  (structured_data->>'buyerSegment') as buyer_segment,
  (structured_data->>'userSegment') as user_segment,
  LENGTH(content) as jd_length
FROM job_descriptions
ORDER BY created_at DESC
LIMIT 20;
```

#### Query 2: Aggregate Population Rates

```sql
SELECT 
  COUNT(*) as total_jobs,
  COUNT(structured_data->>'companyIndustry') as has_industry,
  COUNT(structured_data->>'companyVertical') as has_vertical,
  COUNT(structured_data->>'companyBusinessModel') as has_business_model,
  COUNT(structured_data->>'buyerSegment') as has_buyer_segment,
  COUNT(structured_data->>'userSegment') as has_user_segment,
  ROUND(100.0 * COUNT(structured_data->>'companyIndustry') / COUNT(*), 1) as pct_industry,
  ROUND(100.0 * COUNT(structured_data->>'companyVertical') / COUNT(*), 1) as pct_vertical,
  ROUND(100.0 * COUNT(structured_data->>'companyBusinessModel') / COUNT(*), 1) as pct_business_model,
  ROUND(100.0 * COUNT(structured_data->>'buyerSegment') / COUNT(*), 1) as pct_buyer_segment,
  ROUND(100.0 * COUNT(structured_data->>'userSegment') / COUNT(*), 1) as pct_user_segment
FROM job_descriptions;
```

#### Query 3: Identify Empty Cases for Manual Review

```sql
SELECT 
  id,
  company,
  role,
  SUBSTRING(content, 1, 200) as content_preview,
  (structured_data->>'companyIndustry') as company_industry
FROM job_descriptions
WHERE (structured_data->>'companyIndustry') IS NULL
  OR (structured_data->>'companyIndustry') = ''
ORDER BY created_at DESC
LIMIT 10;
```

### 6. Improvement Recommendations

If extraction rates are below expectations:

#### Option 1: Strengthen Prompt Instructions

**Current approach:** Prompt says "return null if not mentioned"

**Proposed change:** Encourage inference more strongly:

```
COMPANY INDUSTRY:
- REQUIRED FIELD - Do not return null unless absolutely no industry clues exist
- Extract the industry or sector the company operates in
- INFER from context if not explicitly stated:
  * Product descriptions → Industry
  * Customer mentions → Industry vertical
  * Technology focus → Tech category
- Examples: "Legal Tech" (not just "Technology"), "Healthcare SaaS" (not just "Healthcare")
- Only return null if the JD provides ZERO context about what the company does
```

#### Option 2: Add Post-Processing Enrichment

If LLM extraction rates are consistently low, add a fallback:

```typescript
// In jobDescriptionService.ts, after parseJobDescription
if (!parsed.companyIndustry || !parsed.companyBusinessModel) {
  // Fallback: Use BrowserSearchService to research company
  const enrichedData = await browserSearchService.researchCompany(parsed.company);
  parsed.companyIndustry = parsed.companyIndustry || enrichedData.industry;
  parsed.companyBusinessModel = parsed.companyBusinessModel || enrichedData.businessModel;
}
```

**Trade-off:** Adds latency (~1-2s) and cost (additional LLM call), but increases coverage.

#### Option 3: Structured Output Mode

Use OpenAI's Structured Output mode to enforce field population:

```typescript
// In parseJobDescription
const result = await streamText({
  model: this.openAIClient.chat(OPENAI_CONFIG.MODEL),
  messages: [...],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "job_description_analysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          companyIndustry: { type: "string" },
          companyBusinessModel: { type: "string" },
          // ... other fields
        },
        required: ["companyIndustry", "companyBusinessModel"] // Enforce non-null
      }
    }
  }
});
```

**Trade-off:** LLM must provide values (may generate low-confidence guesses instead of null).

## Conclusion

### Current State: ✅ Schema Complete, ⚠️ Reliability Unknown

**What's Working:**
- Fields are properly defined in prompt schema
- Extraction logic exists with normalization functions
- Fields are stored in database correctly
- Fields are actively used in Goals Matching feature

**What's Unknown:**
- Actual extraction success rates in production
- Quality/accuracy of extracted values
- Frequency of null values vs populated fields

### Next Steps:

1. **Run database queries** (provided above) to measure actual extraction rates
2. **Manual review** of 10-20 recent JDs to assess extraction quality
3. **If extraction rates < 70%:** Strengthen prompt instructions (Option 1)
4. **If extraction rates < 50%:** Consider post-processing enrichment (Option 2)
5. **Monitor over time:** Track extraction rates as part of evaluation logging

### Success Criteria:

- `companyIndustry`: **Target ≥70%** populated
- `companyBusinessModel`: **Target ≥60%** populated  
- `companyVertical`: **Target ≥40%** populated (acceptable - less common in JDs)
- `buyerSegment`: **Target ≥50%** populated
- `userSegment`: **Target ≥40%** populated (acceptable - less common in JDs)

### Related Documentation:

- Feature spec: `docs/dev/features/FEATURE_JD_METADATA_EXTRACTION.md`
- Prompt file: `src/prompts/jobDescriptionAnalysis.ts`
- Service logic: `src/services/jobDescriptionService.ts` (lines 903-951)
- Usage: `src/services/goalsMatchService.ts` (lines 286-328)

---

**SQL Queries to Run:** Saved in this document (Section 5)  
**Recommended Action:** Execute Query 2 (Aggregate Population Rates) to get immediate insight into reliability.
