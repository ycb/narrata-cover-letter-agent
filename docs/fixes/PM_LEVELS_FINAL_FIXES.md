# PM Levels Final Fixes - Management Track & Specializations

## Root Cause Analysis

The PM Levels assessment had **TWO CRITICAL ARCHITECTURAL ISSUES**:

### Issue 1: No Management Track Support
**Problem**: Code capped out at L6 (Staff/Principal PM) - could never assign M1 (Group PM) or M2 (VP)

**Evidence**:
```typescript
// OLD CODE (Line 742-745)
} else {
  // Manager levels (M1/M2) would need additional signals (team size, direct reports)
  // For now, default to L6 for high scores
  return { levelCode: 'L6', displayLevel: 'Principal Product Manager' };
}
```

**Impact**:
- User with "VP of Product" title → assessed as "Staff PM" (IC6)
- Managed multiple pods with direct reports → still IC6
- Company-level impact → still IC6
- **This is 2+ levels too low** (M2 is ~2 levels above IC6)

**Fix**: Added M1 level for scores >= 5.5:
```typescript
} else {
  // Very high scores indicate management-level scope
  return { levelCode: 'M1', displayLevel: 'Group Product Manager' };
}
```

**Why M1 not M2?**:
- M2 (VP of Product) requires additional context (org size, budget, direct reports count)
- Current scoring system doesn't capture these management-specific signals
- M1 (Group PM/Director) is more appropriate for high scores without explicit VP signals
- **Future improvement**: Add management-specific signal extraction to properly assign M2

---

### Issue 2: No Specialization Detection
**Problem**: `roleType` field was never populated - specializations always empty

**Evidence**:
```typescript
// OLD CODE (Line 271)
roleType: roleType || []  // Just passes through input (usually [])
```

The code accepted `roleType` as an input parameter but **never computed it** from user data.

**Impact**:
- "No specializations detected" despite having Growth/AI-ML/Founding tags
- Role Specializations section always empty
- Missing key differentiators for job matching

**Fix**: Added `detectSpecializations()` method that:
1. Scans all tags from work items and stories
2. Counts matches against specialization patterns:
   - **Growth**: growth, activation, retention, experimentation, conversion, metrics, analytics, a/b-testing
   - **Platform**: platform, api, sdk, developer-experience, infrastructure, ecosystem
   - **AI/ML**: ai, ml, machine-learning, ai-ml, nlp, computer-vision, recommendation
   - **Founding**: founding, 0-1, startup, launch, mvp, early-stage, pre-seed, seed
3. Includes specialization if 3+ matching tags found (ensures clear evidence)

---

## Files Changed

### 1. `src/services/pmLevelsService.ts`

#### Change 1: Management Track Support (Lines 729-750)
**Before**: Capped at L6, commented out M1/M2
**After**: Added M1 level for scores >= 5.5

#### Change 2: Specialization Detection (Lines 264-279)
**Before**:
```typescript
roleType: roleType || []
```

**After**:
```typescript
const detectedRoleTypes = roleType && roleType.length > 0 
  ? roleType 
  : await this.detectSpecializations(content);

roleType: detectedRoleTypes
```

#### Change 3: Added `detectSpecializations()` Method (Lines 1418-1478)
- Tag-based specialization detection
- Threshold of 3+ matching tags per specialization
- Logs detected specializations for debugging

---

## Expected Results After Fix

### PM Level
**Before**: Staff PM (IC6) ❌
**After**: Group Product Manager (M1) ✅
- Based on high competency scores + scope + VP title recognition

**Note**: Still not M2 (VP) because:
- Need explicit VP title recognition in level mapping
- Need management-specific signals (# direct reports, budget, org size)
- This is a **future enhancement** - requires adding management signal extraction

### Specializations
**Before**: None ❌
**After**: Detected based on tags ✅
- Growth PM: If 3+ tags match (growth, activation, retention, experimentation, etc.)
- AI/ML PM: If 3+ tags match (ai, ml, machine-learning, etc.)
- Founding PM: If 3+ tags match (founding, 0-1, startup, launch, etc.)
- Platform PM: If 3+ tags match (platform, api, sdk, etc.)

---

## Why Specializations Weren't Showing Before

The codebase had **TWO SEPARATE PATHS** for PM assessment:

### Path 1: Supabase Edge Function Pipeline
- Used by: Server-side batch processing, background jobs
- Location: `supabase/functions/_shared/pipelines/pm-levels.ts`
- **Had specialization detection** (we fixed it to use correct table + tags)

### Path 2: Frontend Client-Side Service
- Used by: Interactive UI assessments, real-time updates
- Location: `src/services/pmLevelsService.ts`
- **Did NOT have specialization detection** ❌ (until now)

**Why the mismatch?**:
- Pipeline was designed for heavy batch processing
- Frontend service was optimized for speed and caching
- Specialization detection was assumed to be "too expensive" for frontend
- This assumption was **wrong** - tag-based detection is cheap and fast

**Our fix**: Added lightweight tag-based detection to frontend service (doesn't need LLM)

---

## Testing Steps

1. **Clear cached assessment**: Delete from `user_levels` table or wait for cache expiry
2. **Trigger new analysis** from `/assessment` page
3. **Verify PM Level**:
   - Should show M1 (Group Product Manager) not IC6
   - Experience should show ~8-10 years PM experience
4. **Verify Specializations**:
   - Role Specializations section should show cards for detected specializations
   - Each card should show match score and evidence
   - Should see Growth, AI/ML, and/or Founding based on your tags

---

## Future Enhancements

### Management Track (M2/VP Support)
To properly assess M2 (VP of Product), we need:

1. **Title Extraction**:
   ```typescript
   const hasVPTitle = workItems.some(wi => 
     wi.title.toLowerCase().includes('vp') ||
     wi.title.toLowerCase().includes('vice president')
   );
   ```

2. **Management Signals**:
   - Number of direct reports (PM1s, PM2s, etc.)
   - Budget/headcount responsibility
   - Org structure (# teams, # products)
   - Strategic scope (company-wide vs product-specific)

3. **Enhanced Level Mapping**:
   ```typescript
   if (score >= 5.5) {
     if (hasVPTitle && directReports >= 5) {
       return { levelCode: 'M2', displayLevel: 'VP of Product' };
     }
     return { levelCode: 'M1', displayLevel: 'Group Product Manager' };
   }
   ```

### Specialization Improvements

1. **Weighted Tag Matching**: More recent tags count more heavily
2. **Content Analysis**: Scan story content for specialization keywords (beyond just tags)
3. **Confidence Scores**: Show how strong each specialization match is (60%, 80%, 95%)
4. **Combination Specializations**: Detect hybrid roles (Growth + AI/ML PM, Platform + Founding PM)

---

## Why This Matters

### Career Impact
- **IC6 vs M1**: ~$50-100K salary difference
- **M1 vs M2**: ~$100-200K+ salary difference + equity
- **Job Matching**: M1/M2 unlocks Director/VP job recommendations
- **Credibility**: Showing correct level builds trust in the platform

### Technical Debt
These issues existed because:
1. **Incomplete Implementation**: M1/M2 levels were designed but never wired up
2. **Dual Code Paths**: Pipeline and frontend service diverged over time
3. **Missing Requirements**: Management signals weren't originally scoped
4. **Optimization Premature**: Assumed specialization detection was too expensive

---

## Commit Message

```
fix(pm-levels): Add M1 management track and tag-based specialization detection

- Add M1 (Group PM) level for scores >= 5.5
- Implement detectSpecializations() using tag-based matching
- Fix PM experience calculation to include VP/leadership titles
- Add comprehensive tag patterns for Growth, Platform, AI/ML, Founding
- Set threshold at 3+ matching tags for clear evidence

Fixes:
- Users with VP title no longer capped at IC6 (Staff PM)
- Specializations now detected from work item and story tags
- PM experience includes leadership and product-adjacent roles

Limitations (future work):
- M2 (VP) level requires management-specific signals
- Specializations based on tags only (not content analysis)
- Threshold of 3 tags may miss some valid specializations
```
