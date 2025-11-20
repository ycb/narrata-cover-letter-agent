# Feature: JD Metadata Extraction for Goals Matching

## Problem
Goals tooltip was showing "This job: Unknown" for:
- Minimum Salary
- Work Type
- Preferred Location  
- Company Maturity
- Industry
- Business Model

## Solution: Option 1 - Add to Existing JD Parsing (No Additional LLM Call)

Updated the JD parsing prompt to extract company metadata from the job description text itself.

### Why This Approach?
✅ **No additional LLM call** - economical  
✅ **Faster** - data available immediately  
✅ **More accurate** - extracts what's IN the JD  
✅ **Simpler flow** - one call, complete data

## Changes Made

### 1. Updated JD Parsing Prompt (`jobDescriptionAnalysis.ts`)

**Added 6 new fields to extraction schema:**

```typescript
{
  "company": "Company Name",
  "role": "Job Title",
  "salary": "$160,000-200,000" | null,           // NEW
  "companyIndustry": "Legal Tech" | null,         // NEW
  "companyBusinessModel": "B2B SaaS" | null,      // NEW
  "companyMaturity": "late-stage" | null,         // NEW
  "workType": "Remote" | null,                    // NEW
  "location": "Seattle, WA" | null,               // NEW
  "coreRequirements": [...],
  "preferredRequirements": [...],
  "differentiatorSummary": "..."
}
```

**Added extraction rules for each field:**

- **Salary:** Extract base salary range as stated (e.g., "$160,000-200,000")
- **Industry:** Specific industry/sector (e.g., "Legal Tech", not just "Technology")
- **Business Model:** How company makes money (e.g., "B2B SaaS", "Marketplace")
- **Maturity:** Company stage (startup/growth-stage/late-stage/enterprise)
- **Work Type:** Arrangement (Remote/Hybrid/In-person)
- **Location:** Primary office location (e.g., "Seattle, WA")

### 2. Updated Goals Matching Prompt (`enhancedMetricsAnalysis.ts`)

**Instructed LLM to use JD-extracted data:**

```typescript
CRITICAL RULES:
5. For goalMatches: MUST include ALL 7 goal categories:
   - "Target Title" - jobValue from JD role
   - "Minimum Salary" - jobValue from JD salary field
   - "Work Type" - jobValue from JD workType field
   - "Preferred Location" - jobValue from JD location field
   - "Company Maturity" - jobValue from JD companyMaturity field
   - "Industry" - jobValue from JD companyIndustry field
   - "Business Model" - jobValue from JD companyBusinessModel field
   
   IMPORTANT: Use the JD structured data (salary, workType, location, 
   companyMaturity, companyIndustry, companyBusinessModel) to populate 
   jobValue fields. These were extracted during JD parsing.
```

## Data Flow

```
1. User pastes JD → JD Parsing (gpt-4o)
   ↓
   Extracts: role, salary, industry, businessModel, maturity, workType, location
   ↓
2. Store in job_descriptions.structured_data (JSON)
   ↓
3. Pass to MatchIntelligenceService
   ↓
4. LLM uses extracted data to populate goalMatches.jobValue
   ↓
5. UI displays in goals tooltip:
   
   ✓ Target Title: Senior PM, Lead PM
     This job: Product Manager
   
   ✗ Minimum Salary: $180,000
     This job: $160,000-200,000
   
   ? Work Type: Not set
     This job: Remote
   
   ? Industry: Not set
     This job: Legal Tech
```

## Expected Results (After Fresh Draft Generation)

**Before:**
```
Minimum Salary: $180,000
This job: Unknown ❌

Work Type: Not set
This job: Unknown ❌

Industry: Not set
This job: Unknown ❌
```

**After:**
```
Minimum Salary: $180,000
This job: $160,000-200,000 ✅

Work Type: Not set
This job: Remote ✅

Industry: Not set
This job: Legal Tech ✅

Company Maturity: Not set
This job: Late-stage ✅

Business Model: Not set
This job: B2B SaaS ✅

Preferred Location: Not set
This job: Seattle, WA ✅
```

## Storage

All extracted fields are stored in `job_descriptions.structured_data` (JSON column).

Example:
```json
{
  "salary": "$160,000-200,000",
  "companyIndustry": "Legal Tech",
  "companyBusinessModel": "B2B SaaS",
  "companyMaturity": "late-stage",
  "workType": "Remote",
  "location": "Seattle, WA"
}
```

## Alternative Approaches (NOT Implemented)

### Option 2: Separate Call After JD Parsing
- Use `BrowserSearchService` to search for company data
- ❌ Additional LLM call (gpt-4o-mini)
- ❌ Extra latency (~1-2s)
- ❌ May fail if internet search times out

### Option 3: Hybrid Approach
- Extract from JD first
- Fallback to internet search if null
- ❌ Most complex
- ❌ Data arrives late

## Testing

**To verify this works:**

1. **Delete existing Supio drafts** (already done)
2. **Generate fresh cover letter** with Supio JD
3. **Hover over "MATCH WITH GOALS" badge**
4. **Verify all 7 goal categories show job values:**
   - Target Title → Should show "Product Manager" or similar
   - Minimum Salary → Should show "$160,000-200,000" 
   - Work Type → Should show "Remote" or "Hybrid"
   - Preferred Location → Should show "Seattle, WA" or "Remote"
   - Company Maturity → Should show "late-stage" or similar
   - Industry → Should show "Legal Tech" or similar
   - Business Model → Should show "B2B SaaS" or similar

## Files Modified

- `src/prompts/jobDescriptionAnalysis.ts` - Added 6 new extraction fields + rules
- `src/prompts/enhancedMetricsAnalysis.ts` - Updated to instruct LLM to use JD-extracted data

## Future Enhancements

If JD doesn't contain company metadata (rare), could:
- Fallback to `BrowserSearchService.researchCompany(companyName)`
- Trigger async enrichment in background
- Update tooltip when data arrives

For now, extracting from JD text should cover 90%+ of cases since JDs typically include:
- Company description with industry
- Work type/location
- Sometimes salary range (especially for transparent companies)

