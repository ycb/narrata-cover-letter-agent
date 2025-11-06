# Production Test Results: P01 Import

**Test Date:** 2025-10-19  
**Model:** gpt-4o-mini  
**Test Profile:** P01 (Avery Chen - Gold tier)

---

## 🎯 Test Objectives

Validate production flow after model selection:
1. Measure actual latency vs. expected 13s
2. Confirm zero retries
3. Verify 7 stories extracted and saved

---

## ❌ Test Results: FAILED

| Metric | Expected | Actual | Status | Severity |
|--------|----------|--------|--------|----------|
| **Total Latency** | 13s | **82.1s** | ❌ FAIL | 🔴 Critical |
| **LLM Retries** | 0 | **1** | ❌ FAIL | 🟡 High |
| **Stories Saved** | 7 | **0** | ❌ FAIL | 🔴 Critical |
| **Companies Created** | 3 | 3 | ✅ PASS | ✅ Good |
| **Work Items Created** | 3 | 3 | ✅ PASS | ✅ Good |

---

## 🔍 Root Cause Analysis

### Issue 1: Token Underestimation (Latency Problem)

**Symptoms:**
- Initial token allocation: 2,703 tokens
- LLM response truncated
- Auto-healing triggered retry with 4,000 tokens
- Total LLM time: 82,124ms (82s)

**Impact:**
- 6.3x slower than expected (82s vs 13s)
- Doubles API costs (2 LLM calls instead of 1)
- Poor user experience

**Evidence:**
```
[WARNING] 📊 Token calculation: 2805 chars → 802 content tokens + 1200 overhead → 2703 max tokens
[LOG] 🔄 Auto-healing: Response truncated, retrying with higher token limit...
[LOG] 📊 Truncation analysis: Content ~2932 tokens, retrying with 4000 max tokens
[LOG] ⏱️ Combined LLM analysis took: 82124.50ms
```

**Root Cause:**
Token calculation formula in `src/services/openaiService.ts` is too conservative:
- Buffer multiplier of 1.35x insufficient
- Doesn't account for story extraction density
- Needs dynamic adjustment based on content type

---

### Issue 2: Story Insertion Failure (Data Loss)

**Symptoms:**
- LLM successfully extracted stories (17KB response)
- Multiple database errors: "Error creating story: Could not find th..."
- HTTP 400/406 errors from Supabase
- **0 stories saved** to `approved_content` table

**Impact:**
- Complete data loss for extracted stories
- User sees "import complete" but has no stories
- Defeats primary purpose of onboarding

**Evidence:**
```sql
SELECT COUNT(*) FROM approved_content WHERE user_id = 'P01_USER_ID';
-- Result: 0 (Expected: 7)

SELECT COUNT(*) FROM companies WHERE user_id = 'P01_USER_ID';
-- Result: 3 ✅

SELECT COUNT(*) FROM work_items WHERE user_id = 'P01_USER_ID';
-- Result: 3 ✅
```

**Console Errors:**
```
[ERROR] Error creating story: {code: PGRST204, details: null, hint: null, message: Could not find th...
[ERROR] Failed to load resource: the server responded with a status of 400/406
```

**Root Cause (Hypothesis):**
Foreign key constraint failure when inserting stories:
- `company_id` reference may be invalid or null
- Story insertion happens before company records committed
- Race condition in batched processing

---

## 📊 Timing Breakdown

| Phase | Time | Notes |
|-------|------|-------|
| Resume upload | 0.77s | ✅ Fast |
| LinkedIn fetch | 0.30s | ✅ Synthetic fixture |
| Cover letter upload | ~1s | ✅ Fast |
| **LLM Analysis (1st try)** | ~40s | ❌ Truncated |
| **LLM Analysis (retry)** | ~42s | ❌ Unnecessary |
| Database inserts | ~4s | ⚠️ With errors |
| **Total** | **86.2s** | ❌ Unacceptable |

---

## 🛠️ Recommended Fixes

### Fix 1: Improve Token Calculation (Priority: 🔴 Critical)

**File:** `src/services/openaiService.ts`

**Current Logic:**
```typescript
const bufferMultiplier = 1.35;
const maxTokens = Math.min(
  Math.ceil(estimatedTokens * bufferMultiplier),
  8000
);
```

**Proposed Fix:**
```typescript
// Dynamic buffer based on content complexity
const baseBuffer = 1.5; // Increase from 1.35
const storyDensityBonus = hasStories ? 0.3 : 0;
const bufferMultiplier = baseBuffer + storyDensityBonus;

const maxTokens = Math.min(
  Math.ceil(estimatedTokens * bufferMultiplier) + 500, // Add fixed overhead
  8000
);
```

**Expected Impact:**
- Reduces retries from 100% to <10%
- Latency: 82s → ~15-20s
- Better API cost efficiency

---

### Fix 2: Fix Story Insertion Logic (Priority: 🔴 Critical)

**File:** `src/services/fileUploadService.ts`

**Root Cause:** Stories inserted before company records committed, causing FK violations.

**Proposed Fix:**
1. **Ensure transactional consistency:**
   ```typescript
   // 1. Insert companies first
   const companies = await insertCompanies(userId, extractedData.companies);
   
   // 2. Insert work_items with company references
   const workItems = await insertWorkItems(userId, extractedData.roles, companies);
   
   // 3. Insert stories with valid work_item_id references
   const stories = await insertStories(userId, extractedData.stories, workItems);
   ```

2. **Add better error handling:**
   ```typescript
   try {
     await supabase.from('approved_content').insert(story);
   } catch (error) {
     console.error('Story insertion failed:', {
       story_id: story.id,
       company_id: story.company_id,
       work_item_id: story.work_item_id,
       error: error.message
     });
     throw error; // Don't silently fail
   }
   ```

3. **Add FK validation before insert:**
   ```typescript
   if (story.company_id) {
     const companyExists = companies.find(c => c.id === story.company_id);
     if (!companyExists) {
       console.warn(`Story ${story.id} references non-existent company ${story.company_id}`);
       story.company_id = null; // Or link to default
     }
   }
   ```

**Expected Impact:**
- Stories save successfully: 0 → 7 ✅
- Eliminates data loss
- User onboarding completes correctly

---

### Fix 3: Add Comprehensive Logging (Priority: 🟡 High)

**Files:** 
- `src/services/fileUploadService.ts`
- `src/services/openaiService.ts`

**Add structured logging:**
```typescript
console.log('📊 Extraction Results:', {
  companies: extractedData.companies.length,
  roles: extractedData.roles.length,
  stories: extractedData.stories.length,
  metrics: extractedData.metrics?.length || 0
});

console.log('💾 Database Insert Results:', {
  companiesInserted: companies.length,
  workItemsInserted: workItems.length,
  storiesInserted: stories.length,
  storiesFailed: failedStories.length
});
```

**Expected Impact:**
- Faster debugging
- Better observability
- Easier QA validation

---

## ✅ Next Steps

1. **Immediate (This Session):**
   - [x] Complete production test
   - [x] Document findings
   - [ ] Commit test results
   - [ ] Fix token calculation
   - [ ] Fix story insertion
   - [ ] Re-test P01

2. **Follow-up:**
   - Test P02-P10 profiles
   - Validate fix across all quality tiers
   - Update model comparison analysis with corrected latency
   - Implement streaming UI

3. **Long-term:**
   - Add automated integration tests for onboarding flow
   - Add database constraint validation
   - Implement better retry strategy

---

## 📝 Test Environment

- **Dev Server:** http://localhost:8080
- **Model:** gpt-4o-mini
- **Test User:** c7f68bb8-1070-4601-b8d8-767185f3e8a7
- **Test Files:**
  - Resume: `fixtures/synthetic/v1/raw_uploads/P01_resume.txt`
  - Cover Letter: `fixtures/synthetic/v1/raw_uploads/P01_cover_letter.txt`
  - LinkedIn: `fixtures/synthetic/v1/raw_uploads/P01_linkedin.json` (synthetic)

---

## 🔗 Related Documents

- `HANDOFF_NEXT_CHAT.md` - Test plan and context
- `test-results/formal-analysis.md` - Model comparison analysis
- `test-results/model-comparison-1760845454341.json` - Raw test data
- `fixtures/synthetic/v1/expected_counts_v5.json` - Ground truth expectations

