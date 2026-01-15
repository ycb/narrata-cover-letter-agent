# Job Description Extraction - Visual Results

**Database:** 406 job descriptions analyzed  
**Date:** 2026-01-15

---

## 📊 Extraction Success Rates

```
companyIndustry        ████████████████████████████████████████ 97.5% ✅ EXCELLENT
companyBusinessModel   ████████████████████████████████████████ 97.0% ✅ EXCELLENT
─────────────────────────────────────────────────────────────────────────────
companyVertical        █                                          2.2% ❌ POOR
buyerSegment           █                                          2.5% ❌ POOR
userSegment            █                                          2.0% ❌ POOR
```

**Legend:**  
- ✅ **Excellent:** Exceeds target  
- ❌ **Poor:** Well below target (needs immediate fix)

---

## 🎯 Success vs Target

| Field | Current | Target | Gap | Status |
|-------|---------|--------|-----|--------|
| **companyIndustry** | 97.5% | ≥70% | +27.5% | ✅ **Exceeds** |
| **companyBusinessModel** | 97.0% | ≥60% | +37.0% | ✅ **Exceeds** |
| **companyVertical** | 2.2% | ≥40% | **-37.8%** | ❌ **Critical** |
| **buyerSegment** | 2.5% | ≥50% | **-47.5%** | ❌ **Critical** |
| **userSegment** | 2.0% | ≥40% | **-38.0%** | ❌ **Critical** |

---

## 📈 Value Distribution (Top Values)

### Company Industry
```
Legal Tech                 ████████████████████████████████████████  95.2% (377)
Fintech                    █                                          0.8% (3)
AI                         █                                          0.5% (2)
Transportation Tech        █                                          0.5% (2)
Developer Tools            █                                          0.5% (2)
Others                     █                                          1.8% (7)
```
*Note: Dataset is heavily weighted toward Legal Tech (likely test user focus)*

### Business Model
```
B2B SaaS                   ████████████████████████████████████████  98.7% (389)
B2C Marketplace            █                                          0.5% (2)
B2B Marketplace            █                                          0.3% (1)
B2C                        █                                          0.3% (1)
B2C SaaS                   █                                          0.3% (1)
```

---

## 🔍 Sample Extractions

### ✅ Excellent Extraction (All Fields)

**Mudflap - Director, Product Management**
```yaml
Industry:       Fintech ✅
Vertical:       Payments and Fuel Management ✅
Business Model: B2B Marketplace ✅
Buyer Segment:  SMB / Independent operators ✅
User Segment:   Truckers / Fleet operators ✅
```

**Fieldguide - Staff/Lead Agent PM**
```yaml
Industry:       Audit Tech ✅
Vertical:       Cybersecurity and Financial Audit ✅
Business Model: B2B SaaS ✅
Buyer Segment:  Enterprise ✅
User Segment:   Audit practitioners ✅
```

### ⚠️ Partial Extraction (Common Pattern)

**May Mobility - Lead Product Manager**
```yaml
Industry:       Transportation Technology ✅
Vertical:       Autonomous Vehicles ✅
Business Model: B2B SaaS ✅
Buyer Segment:  null ❌  <-- Should infer from context
User Segment:   null ❌  <-- Should infer from context
```

**GitHub - Principal Product Manager**
```yaml
Industry:       Developer Tools ✅
Vertical:       null ❌  <-- Could infer "Developer Platform"
Business Model: B2B SaaS ✅
Buyer Segment:  Enterprise ✅
User Segment:   Developers ✅
```

### ❌ Poor Extraction

**AI Fund - Product Builder**
```yaml
Industry:       AI ✅
Vertical:       null ❌
Business Model: null ❌  <-- Should infer from company description
Buyer Segment:  null ❌
User Segment:   null ❌
```

---

## 🔧 Root Cause Analysis

### Why Industry & Business Model Succeed (97%+)

✅ **Explicitly stated** in most JDs  
✅ **Clear prompt instructions** with examples  
✅ **Strong normalization logic** (e.g., "B2B SaaS")  
✅ **Company descriptions** typically include this info

### Why Vertical & Segments Fail (2-3%)

❌ **Less explicit** in JDs (often implied, not stated)  
❌ **Prompt allows null too easily** ("return null if not mentioned")  
❌ **LLM is conservative** - defaults to `null` when uncertain  
❌ **Insufficient inference examples** in prompt

---

## 💡 Recommended Fix

### Current Prompt (Too Permissive)
```
BUYER SEGMENT:
- Identify the primary buyer segment(s)
- Look for: "enterprise", "mid-market", "SMB"
- Return null if not mentioned or implied ❌ <-- Too easy to return null
```

### Proposed Prompt (Encourages Inference)
```
BUYER SEGMENT:
- STRONGLY ENCOURAGED: Infer from context ✅
- Look for explicit mentions: "enterprise", "mid-market", "SMB"
- INFER from clues:
  * "Enterprise platform" → "Enterprise"
  * "Small business software" → "SMB"
  * "Consumer app" → "Consumer"
- Return null ONLY if absolutely no clues exist ✅
```

---

## 📊 Expected Impact After Fix

### Optimistic Scenario (Strong Inference + Examples)

```
buyerSegment:  2.5% → 70-80%  ████████████████████████████████
userSegment:   2.0% → 60-70%  ████████████████████████
vertical:      2.2% → 50-60%  ████████████████████
```

### Conservative Scenario (Prompt Only)

```
buyerSegment:  2.5% → 50-60%  ████████████████████
userSegment:   2.0% → 40-50%  ████████████
vertical:      2.2% → 30-40%  ████████
```

---

## 🎯 Action Items

### Immediate (This Week)
1. ✅ Update prompt in `src/prompts/jobDescriptionAnalysis.ts` (lines 111-130)
2. ✅ Add inference examples to prompt
3. ✅ Test with 5-10 sample JDs

### Short-term (Next 2 Weeks)
4. Monitor extraction rates after deploy
5. If rates remain low (<50%), add post-processing heuristics

### Long-term
6. Add evaluation logging to track extraction quality
7. Consider structured output mode for consistency

---

## 📁 Documentation

- **Full Analysis:** `docs/analysis/JD_EXTRACTION_ACTUAL_RESULTS.md`
- **Quick Summary:** `JD_EXTRACTION_SUMMARY.md`
- **Prompt File:** `src/prompts/jobDescriptionAnalysis.ts`
- **SQL Queries:** `debug-jd-extraction.sql`

---

## Summary

✅ **2 of 5 fields working excellently** (Industry, Business Model)  
❌ **3 of 5 fields failing critically** (Vertical, Buyer/User Segments)  
🔧 **Root cause identified:** LLM defaulting to null instead of inferring  
💡 **Solution:** Strengthen prompt to encourage context-based inference  
📈 **Expected improvement:** 50-80% extraction rates after fix
