# Job Description Extraction - Prompt Improvements

**Date:** 2026-01-15  
**Status:** ✅ Implemented  
**File Updated:** `src/prompts/jobDescriptionAnalysis.ts`

---

## Changes Summary

### Problem Identified
- **`companyVertical`:** 2.2% extraction rate (target: ≥40%)
- **`buyerSegment`:** 2.5% extraction rate (target: ≥50%)
- **`userSegment`:** 2.0% extraction rate (target: ≥40%)

**Root cause:** Prompt allowed LLM to default to `null` too easily with phrase "Return null if not mentioned or implied"

### Solution Implemented

**Strategy:** Strengthen prompt instructions to emphasize inference from context clues

---

## Detailed Changes

### 1. Added Comprehensive Inference Examples (Lines 84-125)

Added 5 real-world examples showing inference patterns:

```typescript
INFERENCE EXAMPLES - Learn these patterns:

Example 1: Mudflap (Fintech for Truckers)
  → buyerSegment: "SMB / Independent operators" (inferred from "owner-operators")
  → userSegment: "Truckers / Fleet operators"

Example 2: Fieldguide (Audit Software)
  → buyerSegment: "Enterprise" (inferred from "enterprise audit teams")
  → userSegment: "Audit practitioners"

Example 3: GitHub (Developer Platform)
  → buyerSegment: "Enterprise"
  → userSegment: "Developers"

Example 4: Headspace (Mental Health App)
  → buyerSegment: "Consumer" (inferred from "consumer subscription")
  → userSegment: "Members / Consumers"

Example 5: May Mobility (Autonomous Vehicles)
  → buyerSegment: "Enterprise / Government" (inferred from "transit agencies")
  → userSegment: "Transit operators / Passengers"
```

**Impact:** Teaches LLM specific inference patterns before extraction rules.

### 2. Updated Company Vertical Section (Lines 111-121)

**Before:**
```
5. COMPANY VERTICAL:
   - Extract the specific vertical or sub-industry the company serves
   - Examples: "Solar SaaS", "Construction Tech"
   - Return null if no vertical is mentioned or implied ❌
```

**After:**
```
5. COMPANY VERTICAL:
   - Extract the specific vertical or sub-industry (more specific than industry)
   - STRONGLY ENCOURAGED: Infer from product descriptions and company mission ✅
   - Look for explicit mentions OR infer from context:
     * Industry=Legal Tech + "personal injury" → "Personal Injury Tech"
     * Industry=Fintech + "fuel payments" → "Payments and Fuel Management"
     * Industry=Energy Tech + "AI for grid" → "AI Infrastructure"
   - Examples: "Solar SaaS", "Construction Tech", "Cybersecurity and Financial Audit"
   - Return null ONLY if industry is already maximally specific ✅
```

**Key changes:**
- Added "STRONGLY ENCOURAGED: Infer from context"
- Provided 5 concrete inference examples
- Changed "return null if not mentioned" to "return null ONLY if maximally specific"

### 3. Updated Buyer Segment Section (Lines 129-141)

**Before:**
```
7. BUYER SEGMENT:
   - Identify the primary buyer segment(s)
   - Look for: "enterprise", "mid-market", "SMB"
   - Return null if not mentioned or implied ❌
```

**After:**
```
7. BUYER SEGMENT:
   - STRONGLY ENCOURAGED: Infer from context clues ✅
   - Look for explicit mentions: "enterprise", "mid-market", "SMB"
   - INFER from context when not explicit:
     * "Enterprise platform" / "Fortune 500" → "Enterprise"
     * "Small business software" → "SMB"
     * "Consumer app" / "millions of users" → "Consumer"
     * Business model includes "B2C" → "Consumer"
     * Business model includes "B2B" + large companies → "Enterprise"
     * "Independent operators" → "SMB / Independent operators"
   - Can return combined segments (e.g., "SMB / Mid-market") ✅
   - Return null ONLY if absolutely no clues exist ✅
```

**Key changes:**
- Added "STRONGLY ENCOURAGED: Infer from context"
- Provided 7 inference patterns with examples
- Explicitly allows combined segments
- Changed to "return null ONLY if absolutely no clues"

### 4. Updated User Segment Section (Lines 143-157)

**Before:**
```
8. USER SEGMENT:
   - Identify the primary end-users or user personas
   - Look for: "users", "customers", "operators"
   - Return null if not mentioned or implied ❌
```

**After:**
```
8. USER SEGMENT:
   - STRONGLY ENCOURAGED: Infer from context clues ✅
   - Look for explicit mentions: "users", "customers", "operators"
   - INFER from job responsibilities and product descriptions:
     * "Partner with sales teams for SMB needs" → "SMB operators"
     * "Design for enterprise admins" → "Enterprise admins"
     * "Consumer-facing mobile app" → "Consumers"
     * "Software for truckers" → "Truckers / Fleet operators"
     * "Helping contractors" → "Contractors / Integrators"
     * "Platform for developers" → "Developers"
     * "Audit software" → "Audit practitioners"
   - Extract from product descriptions (e.g., "helping injured people" → "Personal injury victims")
   - Can return combined segments (e.g., "Developers / Operations teams") ✅
   - Return null ONLY if absolutely no clues exist ✅
```

**Key changes:**
- Added "STRONGLY ENCOURAGED: Infer from context"
- Provided 7+ inference patterns from job responsibilities
- Added example of extracting from product descriptions
- Explicitly allows combined segments
- Changed to "return null ONLY if absolutely no clues"

---

## Expected Impact

### Optimistic Scenario (70-80% inference success)

| Field | Current | Target | Expected After Fix |
|-------|---------|--------|--------------------|
| `companyVertical` | 2.2% | ≥40% | **50-60%** ✅ |
| `buyerSegment` | 2.5% | ≥50% | **70-80%** ✅ |
| `userSegment` | 2.0% | ≥40% | **60-70%** ✅ |

### Conservative Scenario (50-60% inference success)

| Field | Current | Expected |
|-------|---------|----------|
| `companyVertical` | 2.2% | **35-45%** |
| `buyerSegment` | 2.5% | **50-60%** |
| `userSegment` | 2.0% | **45-55%** |

**Reasoning:**
- Buyer segment should improve most (often inferrable from business model + company description)
- User segment should improve significantly (often mentioned in job responsibilities)
- Vertical requires more inference, so moderate improvement expected

---

## Verification Steps

### Step 1: Test with Known JDs (Before Deploy)

Run extraction on 5-10 recent JDs that previously returned null:

```typescript
// Test cases from production (previously returned null)
const testCases = [
  {
    company: 'May Mobility',
    jdContent: '...autonomous vehicle technology for transit agencies...',
    expectedBuyerSegment: 'Enterprise / Government',
    expectedUserSegment: 'Transit operators / Passengers',
  },
  {
    company: 'AI Fund',
    jdContent: '...building AI products for various industries...',
    expectedBusinessModel: 'B2B SaaS', // Should infer from context
  },
  // Add more test cases
];
```

### Step 2: Monitor Extraction Rates (After Deploy)

Run this SQL query daily for 1 week:

```sql
-- Compare extraction rates before/after prompt changes
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_jds,
  COUNT(structured_data->>'companyVertical') as has_vertical,
  COUNT(structured_data->>'buyerSegment') as has_buyer,
  COUNT(structured_data->>'userSegment') as has_user,
  ROUND(100.0 * COUNT(structured_data->>'companyVertical') / COUNT(*), 1) as pct_vertical,
  ROUND(100.0 * COUNT(structured_data->>'buyerSegment') / COUNT(*), 1) as pct_buyer,
  ROUND(100.0 * COUNT(structured_data->>'userSegment') / COUNT(*), 1) as pct_user
FROM job_descriptions
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Step 3: Manual Quality Review

Sample 20 recent JDs and verify:
1. **Accuracy:** Are inferred values correct?
2. **Specificity:** Are values specific enough? (e.g., "Legal Tech" vs "Personal Injury Tech")
3. **Consistency:** Are similar JDs getting similar values?

### Step 4: A/B Test (Optional)

If concerned about accuracy:
1. Keep old prompt for 50% of users
2. Use new prompt for 50% of users
3. Compare extraction rates and user feedback

---

## Rollback Plan

If extraction rates don't improve OR accuracy degrades:

### Option 1: Revert Prompt Changes
```bash
git revert <commit-hash>
```

### Option 2: Tune Prompt Further
- Reduce emphasis on inference if too aggressive
- Add more specific examples for edge cases
- Adjust "STRONGLY ENCOURAGED" to "Consider inferring when appropriate"

### Option 3: Add Post-Processing Heuristics
```typescript
// Fallback: Simple heuristics if LLM returns null
if (!parsed.buyerSegment && parsed.companyBusinessModel) {
  if (parsed.companyBusinessModel.includes('Enterprise')) {
    parsed.buyerSegment = 'Enterprise';
  } else if (parsed.companyBusinessModel.includes('B2C') || 
             parsed.companyBusinessModel.includes('Consumer')) {
    parsed.buyerSegment = 'Consumer';
  } else if (parsed.companyBusinessModel.includes('SMB')) {
    parsed.buyerSegment = 'SMB';
  }
}
```

---

## Success Metrics

### Primary Metrics (Week 1)

- [ ] `buyerSegment` extraction rate: **≥50%** (up from 2.5%)
- [ ] `userSegment` extraction rate: **≥40%** (up from 2.0%)
- [ ] `companyVertical` extraction rate: **≥35%** (up from 2.2%)

### Secondary Metrics (Week 2-4)

- [ ] User feedback: No increase in "incorrect industry/segment" complaints
- [ ] Goals matching accuracy: Improved match quality in tooltip
- [ ] Manual review: ≥85% accuracy on inferred values

### Stretch Goals

- [ ] `buyerSegment`: ≥70% extraction rate
- [ ] `userSegment`: ≥60% extraction rate
- [ ] `companyVertical`: ≥50% extraction rate

---

## Related Changes

### Potential Follow-up Improvements

1. **Add evaluation logging** to track extraction quality:
   ```typescript
   await EvaluationEventLogger.logFieldExtraction({
     userId,
     jobDescriptionId,
     field: 'buyerSegment',
     value: parsed.buyerSegment,
     wasInferred: !jdContent.toLowerCase().includes('enterprise'),
     confidence: 'high',
   });
   ```

2. **Use structured output mode** for more consistent extraction:
   ```typescript
   response_format: {
     type: "json_schema",
     json_schema: { /* enforce schema */ }
   }
   ```

3. **Add user feedback mechanism** for incorrect extractions:
   - "Was this industry/segment correct?" button in UI
   - Track corrections to improve future prompts

4. **Create extraction quality dashboard:**
   - Track extraction rates over time
   - Identify JDs with low extraction quality
   - Monitor inference accuracy

---

## Testing Checklist

Before deploying:

- [ ] Read through updated prompt for clarity and consistency
- [ ] Test with 5 known JDs that previously returned null
- [ ] Verify no regressions in `companyIndustry` or `companyBusinessModel` extraction
- [ ] Check that normalization logic still works correctly
- [ ] Run existing test suite: `npm test src/services/__tests__/jobDescriptionService.test.ts`

After deploying:

- [ ] Monitor extraction rates for 3 days
- [ ] Manual review of 20 recent extractions
- [ ] Check for any error rate increases
- [ ] Verify Goals Matching tooltip shows actual values (not "Unknown")

---

## Files Modified

- ✅ `src/prompts/jobDescriptionAnalysis.ts` (lines 84-157)
  - Added inference examples section (lines 84-125)
  - Updated vertical extraction (lines 111-121)
  - Updated buyer segment extraction (lines 129-141)
  - Updated user segment extraction (lines 143-157)

---

## Summary

**What changed:**
- Added 5 real-world inference examples at the top
- Changed tone from permissive ("return null if not mentioned") to directive ("STRONGLY ENCOURAGED to infer")
- Provided 15+ specific inference patterns with examples
- Changed null condition to "ONLY if absolutely no clues exist"

**Expected outcome:**
- 20-30x improvement in extraction rates for vertical, buyer, and user segments
- From 2-3% → 50-70% extraction rate

**Risk:** Potential for lower-confidence inferences (LLM may guess when uncertain)

**Mitigation:** Monitor accuracy via manual review and user feedback

---

**Next Steps:**
1. Deploy changes
2. Run verification SQL queries (Step 2 above)
3. Manual quality review after 50 new JDs processed
4. Document results in follow-up analysis doc
