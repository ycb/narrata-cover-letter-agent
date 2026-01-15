# Job Description Extraction - Actual Results

**Date:** 2026-01-15  
**Database Query Results:** Real production data from 406 job descriptions

---

## Executive Summary

### ✅ EXCELLENT: Industry & Business Model
- **`companyIndustry`:** 97.5% populated (396/406) - **Exceeds target of 70%**
- **`companyBusinessModel`:** 97.0% populated (394/406) - **Exceeds target of 60%**

### ❌ POOR: Vertical & Segments
- **`companyVertical`:** 2.2% populated (9/406) - **Well below target of 40%**
- **`buyerSegment`:** 2.5% populated (10/406) - **Well below target of 50%**
- **`userSegment`:** 2.0% populated (8/406) - **Well below target of 40%**

---

## Detailed Results

### 1. Aggregate Statistics

| Field | Count | Percentage | Target | Status |
|-------|-------|------------|--------|--------|
| `companyIndustry` | 396/406 | **97.5%** | ≥70% | ✅ Excellent |
| `companyBusinessModel` | 394/406 | **97.0%** | ≥60% | ✅ Excellent |
| `companyVertical` | 9/406 | **2.2%** | ≥40% | ❌ Poor |
| `buyerSegment` | 10/406 | **2.5%** | ≥50% | ❌ Poor |
| `userSegment` | 8/406 | **2.0%** | ≥40% | ❌ Poor |

### 2. Value Distribution

#### Company Industry (Top 15)

| Industry | Count | % of Total |
|----------|-------|------------|
| Legal Tech | 377 | 95.2% |
| Fintech | 3 | 0.8% |
| AI | 2 | 0.5% |
| Transportation Technology | 2 | 0.5% |
| Developer Tools | 2 | 0.5% |
| Energy Tech | 1 | 0.3% |
| Healthcare SaaS | 1 | 0.3% |
| Biotechnology | 1 | 0.3% |
| Others | 7 | 1.8% |

**Note:** The dominance of "Legal Tech" (95%) suggests this dataset is heavily weighted toward one industry, likely due to user testing focus.

#### Business Model (Top 5)

| Business Model | Count | % of Total |
|----------------|-------|------------|
| B2B SaaS | 389 | 98.7% |
| B2C Marketplace | 2 | 0.5% |
| B2B Marketplace | 1 | 0.3% |
| B2C | 1 | 0.3% |
| B2C SaaS | 1 | 0.3% |

**Quality Assessment:** Values are properly normalized (e.g., "B2B SaaS" vs "b2b saas").

### 3. Sample Recent Extractions

Recent job descriptions show:

**✅ Well-Extracted (With all/most fields):**
- **Mudflap** (Director, PM): Industry=Fintech, Vertical=Payments and Fuel Management, Model=B2B Marketplace, Buyer=SMB/Independent operators, User=Truckers/Fleet operators
- **Fieldguide** (Staff/Lead Agent PM): Industry=Audit Tech, Vertical=Cybersecurity and Financial Audit, Model=B2B SaaS, Buyer=Enterprise, User=Audit practitioners
- **GridCARE** (Head of PM): Industry=Energy Tech, Vertical=AI Infrastructure, Model=B2B SaaS, Buyer=Enterprise, User=Utilities/Data Center Developers

**⚠️ Partially Extracted (Missing segments):**
- **May Mobility** (Lead PM): Industry=Transportation Technology, Vertical=Autonomous Vehicles, Model=B2B SaaS, but Buyer=null, User=null
- **Workiva** (VP of PM): Industry=SaaS, Vertical=Sustainability Management, Model=B2B SaaS, but Buyer=null (should be Enterprise)
- **AI Fund** (Product Builder): Industry=AI, but Model=null, Buyer=null, User=null

**❌ Poorly Extracted:**
- **Unknown Company** (PM): All fields null (likely test data with minimal content)

---

## Root Cause Analysis

### Why Industry & Business Model Succeed (97%+)

1. **Clear prompt instructions** with specific examples
2. **Explicit in most JDs** - Companies typically describe "what they do" and "who they serve"
3. **Strong normalization logic** - Business model patterns are well-defined

### Why Vertical, Buyer, and User Segments Fail (2-3%)

#### Likely Causes:

1. **Prompt allows null too easily:**
   ```
   "companyVertical": "... or null"
   "buyerSegment": "... or null"
   "userSegment": "... or null"
   ```
   The LLM interprets "or null" as "default to null if not explicitly stated".

2. **Less explicit in JDs:**
   - Vertical is often implied rather than stated (e.g., "solar installer software" → Solar SaaS)
   - Buyer segment is often implied by company description (e.g., "enterprise platform" → Enterprise)
   - User segment requires reading between the lines

3. **Conservative LLM behavior:**
   - When uncertain, LLM defaults to `null` rather than inferring

4. **Insufficient emphasis in prompt:**
   - Prompt treats these fields equally, but doesn't emphasize inference

---

## Recommendations

### Priority 1: Strengthen Prompt for Segments (Quick Win)

**Change the instruction tone from permissive to directive:**

**Current (lines 122-130):**
```
7. BUYER SEGMENT:
   - Identify the primary buyer segment(s)
   - Look for: "enterprise", "mid-market", "SMB", "small business", "consumer"
   - Return null if not mentioned or implied

8. USER SEGMENT:
   - Identify the primary end-users or user personas
   - Look for: "users", "customers", "operators", "installers", "admins", "consumers"
   - Return null if not mentioned or implied
```

**Proposed (more directive):**

```
7. BUYER SEGMENT:
   - STRONGLY ENCOURAGED: Infer the primary buyer segment(s) from context
   - Look for explicit mentions: "enterprise", "mid-market", "SMB", "small business", "consumer"
   - INFER from context clues:
     * "Enterprise platform" → "Enterprise"
     * "Small business software" → "SMB"
     * "Consumer app" → "Consumer"
     * Company size mentions (e.g., "Fortune 500 clients" → "Enterprise")
   - Return null ONLY if absolutely no clues exist about who buys the product

8. USER SEGMENT:
   - STRONGLY ENCOURAGED: Infer the primary end-users from context
   - Look for explicit mentions: "users", "customers", "operators", "installers", "admins"
   - INFER from job responsibilities:
     * "Partner with sales teams to understand SMB needs" → "SMB operators"
     * "Design features for enterprise admins" → "Enterprise admins"
     * "Consumer-facing mobile app" → "Consumers"
   - Extract from product descriptions (e.g., "software for truckers" → "Truckers")
   - Return null ONLY if absolutely no clues exist about who uses the product
```

### Priority 2: Add Inference Examples to Prompt

Add a dedicated section showing inference patterns:

```
INFERENCE EXAMPLES FOR SEGMENTS:

Example 1: JD mentions "enterprise-grade platform for Fortune 500"
  → buyerSegment: "Enterprise"
  → userSegment: Infer from job responsibilities (e.g., "IT admins", "Operations teams")

Example 2: JD mentions "helping truckers save on fuel costs"
  → buyerSegment: "SMB / Independent operators" (truckers are often small businesses)
  → userSegment: "Truckers / Fleet operators"

Example 3: JD mentions "consumer mobile app with millions of users"
  → buyerSegment: "Consumer"
  → userSegment: "Consumers"

Example 4: JD mentions "B2B SaaS for small businesses"
  → buyerSegment: "SMB"
  → userSegment: Infer from product description (e.g., "Small business owners", "Accountants")
```

### Priority 3: Improve Vertical Extraction

**Current instruction (lines 111-114):**
```
5. COMPANY VERTICAL:
   - Extract the specific vertical or sub-industry the company serves
   - Examples: "Solar SaaS", "Construction Tech", "Retail Analytics", "Healthcare Billing"
   - Return null if no vertical is mentioned or implied
```

**Proposed (more directive):**
```
5. COMPANY VERTICAL:
   - Extract the specific vertical or sub-industry (more specific than industry)
   - INFER from product descriptions and company mission:
     * Industry=Legal Tech + "personal injury case management" → "Personal Injury Tech"
     * Industry=Fintech + "fuel payments for truckers" → "Payments and Fuel Management"
     * Industry=Energy Tech + "AI for grid infrastructure" → "AI Infrastructure"
     * Industry=Healthcare SaaS + "mental health and meditation" → "Mental Health and Wellness"
   - Examples: "Solar SaaS", "Construction Tech", "Retail Analytics", "Healthcare Billing"
   - Return null ONLY if industry is already maximally specific (e.g., "Legal Tech" with no sub-vertical)
```

---

## Expected Impact of Changes

### Optimistic Scenario (Strong Prompt + Examples)

| Field | Current | Target | Expected After Fix |
|-------|---------|--------|-------------------|
| `companyVertical` | 2.2% | ≥40% | **50-60%** |
| `buyerSegment` | 2.5% | ≥50% | **70-80%** |
| `userSegment` | 2.0% | ≥40% | **60-70%** |

**Reasoning:**
- Buyer segment is often inferrable from business model + company description
- User segment is often inferrable from job responsibilities and product descriptions
- Vertical requires more inference, so lower expected gain

### Conservative Scenario (Prompt Changes Only)

| Field | Current | Expected |
|-------|---------|----------|
| `companyVertical` | 2.2% | **30-40%** |
| `buyerSegment` | 2.5% | **50-60%** |
| `userSegment` | 2.0% | **40-50%** |

---

## Alternative Approach: Post-Processing Inference

If prompt changes don't achieve targets, add a post-processing step in `jobDescriptionService.ts`:

```typescript
// After LLM extraction, apply heuristics
if (!parsed.buyerSegment && parsed.companyBusinessModel) {
  if (parsed.companyBusinessModel.includes('Enterprise')) {
    parsed.buyerSegment = 'Enterprise';
  } else if (parsed.companyBusinessModel.includes('SMB')) {
    parsed.buyerSegment = 'SMB';
  } else if (parsed.companyBusinessModel.includes('Consumer') || parsed.companyBusinessModel.includes('B2C')) {
    parsed.buyerSegment = 'Consumer';
  }
}

if (!parsed.userSegment && parsed.buyerSegment) {
  // Default user segment to match buyer segment if not specified
  parsed.userSegment = parsed.buyerSegment;
}
```

**Trade-off:** Less accurate than LLM inference, but ensures higher coverage.

---

## Action Items

### Immediate (Next Deploy)

1. ✅ **Update prompt** in `src/prompts/jobDescriptionAnalysis.ts`:
   - Lines 122-130: Strengthen buyer/user segment instructions
   - Lines 111-114: Improve vertical extraction guidance
   - Add inference examples section

2. ✅ **Test with sample JDs** to verify improved extraction

### Short-term (Next Week)

3. **Monitor extraction rates** after prompt changes:
   - Run `debug-jd-extraction.sql` weekly
   - Target: 60%+ for buyer/user segments within 2 weeks

4. **If rates remain low**, implement post-processing heuristics

### Long-term (Future Enhancement)

5. **Add evaluation logging** to track extraction quality over time
6. **Consider structured output mode** if extraction quality is inconsistent

---

## Summary

### What's Working ✅
- **Industry extraction:** 97.5% (excellent)
- **Business model extraction:** 97.0% (excellent)
- **Value normalization:** Consistent, clean output

### What Needs Fixing ❌
- **Vertical extraction:** 2.2% (needs prompt improvement)
- **Buyer segment extraction:** 2.5% (needs prompt improvement)
- **User segment extraction:** 2.0% (needs prompt improvement)

### Root Cause
LLM is being too conservative - defaulting to `null` instead of inferring from context clues.

### Solution
Strengthen prompt instructions to encourage inference, with specific examples and patterns.

### Files to Update
- `src/prompts/jobDescriptionAnalysis.ts` (lines 111-130)
