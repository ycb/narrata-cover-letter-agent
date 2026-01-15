# Job Description Extraction Reliability - Quick Summary

**Question:** Is the LLM reliably populating `companyIndustry`, `companyVertical`, `companyBusinessModel`, `buyerSegment`, and `userSegment` fields?

**Answer:** 
- ✅ **`companyIndustry`:** 97.5% populated - EXCELLENT
- ✅ **`companyBusinessModel`:** 97.0% populated - EXCELLENT
- ❌ **`companyVertical`:** 2.2% populated - POOR
- ❌ **`buyerSegment`:** 2.5% populated - POOR
- ❌ **`userSegment`:** 2.0% populated - POOR

---

## Actual Results (from 406 JDs in production)

### ✅ What's Working Excellently

| Field | Population Rate | Status |
|-------|----------------|--------|
| `companyIndustry` | **97.5%** (396/406) | ✅ Excellent |
| `companyBusinessModel` | **97.0%** (394/406) | ✅ Excellent |

**Quality:** Values are properly normalized (e.g., "B2B SaaS", "Legal Tech", "Fintech")

### ❌ What's Failing

| Field | Population Rate | Status |
|-------|----------------|--------|
| `companyVertical` | **2.2%** (9/406) | ❌ Poor |
| `buyerSegment` | **2.5%** (10/406) | ❌ Poor |
| `userSegment` | **2.0%** (8/406) | ❌ Poor |

**Root Cause:** LLM is defaulting to `null` instead of inferring from context clues.

---

## Why the Disparity?

**Industry & Business Model succeed because:**
- Explicitly stated in most JDs
- Clear prompt instructions
- Strong normalization logic

**Vertical & Segments fail because:**
- Less explicit in JDs (often implied)
- Prompt allows `null` too easily ("return null if not mentioned")
- LLM is conservative - defaults to `null` when uncertain

---

## Recommended Fix: Strengthen Prompt

### Problem
Current prompt says: **"Return null if not mentioned or implied"**

LLM interprets this as: "Default to null unless explicitly stated"

### Solution
Change to: **"STRONGLY ENCOURAGED - Infer from context. Return null ONLY if absolutely no clues exist"**

### Specific Changes Needed (in `src/prompts/jobDescriptionAnalysis.ts`)

**Lines 122-130:** Update buyer/user segment instructions to emphasize inference:

```typescript
7. BUYER SEGMENT:
   - STRONGLY ENCOURAGED: Infer the primary buyer segment(s) from context
   - Look for explicit mentions: "enterprise", "mid-market", "SMB"
   - INFER from context clues:
     * "Enterprise platform" → "Enterprise"
     * "Small business software" → "SMB"
     * "Consumer app" → "Consumer"
   - Return null ONLY if absolutely no clues exist
```

**Lines 111-114:** Improve vertical extraction guidance with inference examples

### Expected Impact

After prompt changes:

| Field | Current | Expected |
|-------|---------|----------|
| `buyerSegment` | 2.5% → **60-70%** |
| `userSegment` | 2.0% → **50-60%** |
| `companyVertical` | 2.2% → **40-50%** |

---

## Sample Extractions (from real data)

**✅ Well-Extracted:**
- **Mudflap** (Director, PM): Industry=Fintech, Vertical=Payments and Fuel Management, Model=B2B Marketplace, Buyer=SMB/Independent operators, User=Truckers/Fleet operators
- **Fieldguide** (Staff PM): Industry=Audit Tech, Vertical=Cybersecurity and Financial Audit, Model=B2B SaaS, Buyer=Enterprise, User=Audit practitioners

**⚠️ Partially Extracted (common pattern):**
- **May Mobility** (Lead PM): Industry=Transportation Technology, Vertical=Autonomous Vehicles, Model=B2B SaaS, but Buyer=**null**, User=**null**
- **GitHub** (Principal PM): Industry=Developer Tools, Model=B2B SaaS, Buyer=Enterprise, User=Developers, but Vertical=**null**

---

## Documentation

- **Results & Recommendations:** `docs/analysis/JD_EXTRACTION_ACTUAL_RESULTS.md` (FULL DETAILS)
- **Original Analysis:** `docs/analysis/JD_EXTRACTION_RELIABILITY_ANALYSIS.md`
- **Prompt File:** `src/prompts/jobDescriptionAnalysis.ts` (lines 111-130 need updating)
- **Service Logic:** `src/services/jobDescriptionService.ts` (lines 903-951)

---

## TL;DR

✅ **Industry & Business Model:** 97%+ extraction - EXCELLENT  
❌ **Vertical & Segments:** 2-3% extraction - NEEDS FIX  
✅ **FIXED:** Prompt updated on 2026-01-15 to strengthen inference  
📊 **See full analysis:** `docs/analysis/JD_EXTRACTION_ACTUAL_RESULTS.md`

---

## ✅ Changes Implemented (2026-01-15)

**File:** `src/prompts/jobDescriptionAnalysis.ts`

**What changed:**
1. Added 5 real-world inference examples (lines 84-120)
2. Updated vertical extraction to emphasize inference (lines 148-158)
3. Updated buyer segment with 7 inference patterns (lines 166-178)
4. Updated user segment with 8+ inference patterns (lines 180-194)
5. Changed null conditions to "ONLY if absolutely no clues exist"

**Expected improvement:**
- Vertical: 2.2% → **50-60%**
- Buyer Segment: 2.5% → **70-80%**
- User Segment: 2.0% → **60-70%**

**Verification:** Monitor extraction rates over next 1-2 weeks  
**Full details:** `docs/analysis/JD_EXTRACTION_PROMPT_IMPROVEMENTS.md`
