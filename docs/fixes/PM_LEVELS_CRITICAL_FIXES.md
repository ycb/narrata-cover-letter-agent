# PM Levels Critical Fixes - Second Pass

## Critical Issues Found

### 🚨 Issue 1: Pipeline Using Wrong Table for Stories
**Problem**: Specializations not detected, PM level lower than expected

**Root Cause**: The pipeline's `fetchStories()` was querying the **deprecated `approved_content` table** instead of the current `stories` table.

**Impact**:
- ❌ Pipeline received **ZERO stories** for analysis
- ❌ No specializations detected (Growth, Platform, AI/ML, Founding)
- ❌ Lower PM level assessment (missing all achievement evidence)

**Fix**: Updated `pipeline-utils.ts` line 291-304 to query `stories` table with both `approved` and `draft` statuses.

---

### 🚨 Issue 2: PM Role Detection Too Narrow
**Problem**: Showing "2.3 years PM experience" when actual is 8-10+ years

**Root Cause**: `isPMRole()` function was missing critical PM titles:
- ❌ VP of Product
- ❌ Vice President of Product  
- ❌ Head of Product
- ❌ Director of Product
- ❌ Product Lead
- ❌ Group Product Manager
- ❌ Principal UX Architect (highly relevant)
- ❌ Senior UX roles with product responsibility

**Fix**: Expanded `isPMRole()` in `pmLevelsService.ts` to include:
1. All VP/Head/Director product titles
2. All PM seniority levels
3. Highly-relevant adjacent roles (Principal/Staff/Lead UX, Product Design leadership)

**Rationale**: 
- Senior UX roles (Principal UX Architect, UX Lead) often perform PM-adjacent work
- Product Design leadership involves roadmap, strategy, stakeholder management
- These should count toward PM experience calculation

---

### 🚨 Issue 3: Pipeline Not Recognizing Leadership Titles
**Problem**: VP of Product assessed as Staff PM (IC6) instead of M2

**Root Cause**: Baseline assessment prompt didn't include management track (M1, M2) or guidance for leadership titles

**Fix**: Enhanced baseline assessment prompt to:
- Add M1 (Group PM/Director) and M2 (VP of Product) to the scale
- Explicitly map VP/Head/Director titles to M1-M2 range
- Add guidance: "Principal/Staff PM with company-level impact → IC6-IC8 range"
- Emphasize both years AND scope of impact (feature → product → company)

---

## Files Changed

### 1. `/Users/admin/narrata/supabase/functions/_shared/pipeline-utils.ts`
**Change**: Lines 291-304 - `fetchStories()` now queries `stories` table instead of `approved_content`

```typescript
// OLD (WRONG)
.from('approved_content')
.select('*, work_items!inner(*), companies(*)')
.eq('status', 'approved')

// NEW (CORRECT)
.from('stories')
.select('id, title, content, tags, work_item_id, source_id, metrics, created_at, updated_at')
.in('status', ['approved', 'draft'])
```

### 2. `/Users/admin/narrata/src/services/pmLevelsService.ts`
**Change**: Lines 1044-1093 - Expanded `isPMRole()` function

Now includes:
- VP of Product, Vice President of Product
- Head of Product, Director of Product, Product Director
- Product Lead, Group Product Manager
- All standard PM titles (Principal, Staff, Senior, Associate)
- Principal/Staff/Lead UX roles
- Principal/Lead Product Design roles

### 3. `/Users/admin/narrata/supabase/functions/_shared/pipelines/pm-levels.ts`
**Change**: Lines 59-77 - Enhanced baseline assessment prompt

Added:
- M1 and M2 levels to the scale
- Explicit mapping: VP/Head/Director → M1-M2
- Guidance on scope: feature → product → company
- Note on recognizing leadership titles

---

## Expected Results After Fix

### PM Experience Calculation
- **Before**: 2.3 years PM experience ❌
- **After**: 8-10+ years PM experience ✅
  - Includes: VP of Product, Senior PM, Product Lead, Principal UX Architect (product-focused)
  - Excludes: Pure front-end developer roles (unless product-adjacent)

### PM Level Assessment
- **Before**: Staff PM (IC6) ❌
- **After**: VP of Product (M2) or Principal PM (IC7-IC8) ✅
  - Based on VP title + company-level impact + years of experience

### Specializations
- **Before**: None detected ❌
- **After**: Should detect based on tags ✅
  - Growth PM: If tags include growth, activation, retention, experimentation
  - AI/ML PM: If tags include ai, ml, machine-learning
  - Founding PM: If tags include founding, 0-1, startup, launch
  - Platform PM: If tags include platform, api, sdk

---

## Testing Steps

1. **Clear any cached PM level data**
2. **Trigger new analysis** from `/assessment` page
3. **Check the Overall Level modal**:
   - Role titles: Should show ALL roles including VP of Product
   - Companies: Should show ALL companies
   - Experience: Should show "~X years total / ~Y years PM experience" where Y ≈ 8-10 years
4. **Check the main assessment card**:
   - Should show M2 (VP of Product) or IC7-IC8 (Principal PM)
   - NOT IC6 (Staff PM)
5. **Check Role Specializations section**:
   - Should show Growth, AI/ML, and/or Founding based on your tags
   - Each specialization should have a score and evidence

---

## Why This Matters

### Impact on User Experience
- **Career Positioning**: VP of Product is 2+ levels above Staff PM
- **Salary Expectations**: M2/VP level commands significantly higher compensation than IC6
- **Job Matching**: Being assessed as IC6 when you're M2 means missing relevant VP/Director roles
- **Credibility**: Showing 2.3 years experience when you have 10+ years damages profile credibility

### Root Cause Analysis
These bugs existed because:
1. **Table Migration**: `approved_content` → `stories` migration wasn't fully propagated to Edge Functions
2. **Narrow Assumptions**: PM role detection assumed standard titles, didn't account for leadership or adjacent roles
3. **Missing Context**: Baseline prompt lacked management track and leadership guidance

---

## Future Improvements

1. **Validation**: Add runtime check to warn if `fetchStories()` returns empty array
2. **Role Taxonomy**: Create standardized role classification system with confidence scores
3. **Experience Weighting**: Consider weighting PM-adjacent experience (UX Lead) at 0.8x vs direct PM at 1.0x
4. **Title Normalization**: Map variant titles (VP Product, VP of Product, Vice President - Product) to canonical forms
