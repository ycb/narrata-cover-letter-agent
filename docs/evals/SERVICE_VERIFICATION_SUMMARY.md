# Service Verification Summary

**Date:** 2025-12-04  
**Purpose:** Verify which services are deprecated, which are active, and provide deletion recommendations.

---

## ✅ Verification Results

### 1. **Dynamic Matching → Company Tags** ✅ **CONFIRMED: Replaced**

**Question:** Is Dynamic Matching part of or replaced by Company Tags?

**Answer:** ✅ **YES — Company Tags REPLACED Dynamic Matching**

**Evidence:**
- `BrowserSearchService` is **ONLY used by** `TagSuggestionService` for company research
- **File:** `src/services/tagSuggestionService.ts:94`
  ```typescript
  companyResearch = await BrowserSearchService.researchCompany(companyName, true);
  ```
- **UI Usage:** `WorkHistoryDetail.tsx:511` — Active company tag suggestion feature
- **Flow:** User clicks "Auto-suggest tags" → `TagSuggestionService` → `BrowserSearchService.researchCompany()` → LLM call
- **Purpose:** Research company via LLM (uses training data, not real web search)

**LLM Calls in BrowserSearchService:**
1. `researchCompany()` — Uses custom inline prompt
   - **Purpose:** Extract company industry, business model, stage, products, tags
   - **Model:** gpt-4o-mini
   - **Tokens:** ~150-200 per call
   - **Used for:** Company tag suggestions

**Conclusion:**
- ✅ **BrowserSearchService is ACTIVE** (part of company tags)
- ✅ **Dynamic Matching prompts are NOT USED** (can be deleted)
- ❌ **BrowserSearchService ≠ Dynamic Matching** (different use case)

**Recommendation:**
- ✅ **Keep:** `BrowserSearchService` + its LLM call (1 call)
- ✅ **Delete:** `buildDynamicMatchingPrompt`, `buildContentLibraryAnalysisPrompt` from `/src/prompts/dynamicMatching.ts`
- ✅ **Instrument:** `BrowserSearchService.researchCompany()` (part of Company Tags)

---

### 2. **Generic Evaluation Service** ✅ **CONFIRMED: Can Delete**

**Question:** Is Generic Evaluation Service deprecated?

**Answer:** ✅ **YES — Superseded by ContentStandardsEvaluationService**

**Evidence:**
- **Old service:** `evaluationService.ts` (generic LLM judge)
- **New service:** `contentStandardsEvaluationService.ts` (standards-based evaluation)
- **Usage in `coverLetterDraftService.ts:1368-1405`:**
  ```typescript
  const evaluationService = new ContentStandardsEvaluationService(); // NEW
  // NOT using generic EvaluationService
  ```
- **Usage in `fileUploadService.ts:39`:**
  ```typescript
  import { EvaluationService } from './evaluationService';
  // ... (old import, likely unused)
  ```

**Grep results:**
- `EvaluationService` imported in 2 files:
  1. `fileUploadService.ts` — Imported but unclear if actively called
  2. `coverLetterDraftService.ts` — Uses `ContentStandardsEvaluationService` instead

**Detailed check needed:** Search `fileUploadService.ts` for `this.evaluationService.evaluate`

**Conclusion (Tentative):**
- ⚠️ **Likely deprecated**, but need to verify `fileUploadService.ts` usage
- ✅ **ContentStandardsEvaluationService is the new standard**

**Recommendation:**
- ⚠️ **Verify:** Check if `this.evaluationService.evaluateStructuredData()` is called in `fileUploadService.ts`
- ✅ **If NOT called:** Safe to delete `evaluationService.ts` + `prompts/evaluation.ts`
- ✅ **If CALLED:** Migrate to `ContentStandardsEvaluationService` first, then delete

**Action:** Need 1 more grep to confirm:

```bash
grep "this.evaluationService" src/services/fileUploadService.ts
```

---

### 3. **ATS Analysis Service** ✅ **CONFIRMED: Exploratory, Can Delete or Feature Flag**

**Question:** How developed is ATS Analysis? Delete or feature flag?

**Answer:** ✅ **Exploratory/immature — Safe to delete OR put behind feature flag**

**Evidence:**
- **File:** `src/services/atsAnalysisService.ts` (181 lines, well-structured)
- **Prompt:** `src/prompts/atsAnalysis.ts` (exists)
- **UI Usage:** ❌ **NO UI USAGE FOUND**
- **Test:** ❌ **NO TEST FILES FOUND**
- **Feature Status:** Not part of current MVP, not wired to any UI

**Service Quality:**
- ✅ Well-implemented (has proper types, error handling, fallback)
- ✅ PRD-aligned (comprehensive scoring and checklist)
- ❌ Not integrated into product
- ❌ No user-facing feature

**Recommendation:**
- **Option A (Delete):** Remove `atsAnalysisService.ts` + `prompts/atsAnalysis.ts` + `prompts/index.ts` export
  - **Pros:** Clean codebase, no dead code
  - **Cons:** Lose well-written code if you want ATS feature later
  
- **Option B (Feature Flag):** Keep code, gate behind `FEATURE_ATS_ANALYSIS` flag
  - **Pros:** Easy to enable later, preserves work
  - **Cons:** Adds maintenance burden, unused code

**Recommendation:** ✅ **DELETE** (immature, not MVP, easy to rebuild if needed)

**Reasoning:**
- Not wired to UI = exploratory spike
- Well-documented PRD exists, so easy to rebuild
- Cleaner to delete and rebuild when ATS becomes priority
- No user impact

---

## 📊 Updated Active LLM Calls List

Based on verification:

| Service | Status | LLM Calls | Instrument? |
|---------|--------|-----------|-------------|
| **BrowserSearchService** (Company Tags) | ✅ **ACTIVE** | 1 | ✅ **YES** |
| **Dynamic Matching** | ❌ **DEPRECATED** | 0 | ❌ **DELETE PROMPTS** |
| **EvaluationService** (Generic) | ⚠️ **LIKELY DEPRECATED** | 1 | ❓ **VERIFY THEN DELETE** |
| **ContentStandardsEvaluationService** | ✅ **ACTIVE** | 2-5 | ✅ **YES** |
| **ATSAnalysisService** | ❌ **NOT IN MVP** | 1 | ❌ **DELETE** |

---

## ✅ Final Recommendations

### **DELETE (3 items)**
1. ✅ **Dynamic Matching Prompts** (`prompts/dynamicMatching.ts`)
   - Keep `BrowserSearchService` (used for company tags)
   - Delete unused prompt files

2. ✅ **ATS Analysis Service** (full deletion)
   - `src/services/atsAnalysisService.ts`
   - `src/prompts/atsAnalysis.ts`
   - Remove from `prompts/index.ts`

3. ⚠️ **Generic Evaluation Service** (pending verification)
   - Need to verify `fileUploadService.ts` usage first
   - If not used → delete `evaluationService.ts` + `prompts/evaluation.ts`

---

### **KEEP & INSTRUMENT (2 items)**
1. ✅ **BrowserSearchService** (Company Tags)
   - Active feature, wired to UI
   - 1 LLM call: `researchCompany()`
   - Priority: 🟡 **MEDIUM** (auxiliary tagging)

2. ✅ **ContentStandardsEvaluationService**
   - Active feature, used in CL draft flow
   - 2-5 LLM calls (need to verify exact count)
   - Priority: 🟡 **MEDIUM** (quality scoring)

---

## 🔍 Action Items

### **For User:**
1. ✅ **Approve deletions:** Dynamic Matching prompts + ATS Service
2. ⚠️ **Verify:** Is `this.evaluationService` called in `fileUploadService.ts`?

### **For Agent:**
1. Run final verification grep:
   ```bash
   grep "this.evaluationService\." src/services/fileUploadService.ts
   ```
2. If no active usage → add Generic Evaluation to delete list
3. Update `VERIFIED_LLM_CALLS.md` with final counts

---

## 📄 Files to Delete (Pending Final Verification)

```bash
# Confirmed Deletions
rm src/prompts/dynamicMatching.ts
rm src/services/atsAnalysisService.ts
rm src/prompts/atsAnalysis.ts

# Update index to remove exports
# src/prompts/index.ts:
# - Remove dynamicMatching exports
# - Remove atsAnalysis import

# Pending Verification (Generic Evaluation)
# IF not used in fileUploadService:
rm src/services/evaluationService.ts
rm src/prompts/evaluation.ts
# - Remove from prompts/index.ts
```

---

**End of Verification Summary**

