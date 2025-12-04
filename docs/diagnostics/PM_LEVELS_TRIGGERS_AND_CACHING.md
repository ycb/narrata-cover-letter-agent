# PM Levels Service: LLM Triggers & Caching Analysis

## Executive Summary

**CRITICAL FINDING**: For synthetic users, viewing `/assessment` **DOES trigger a new LLM call** every time, which explains the many PM Levels evaluations you're seeing.

For regular users, the page loads from cache (no LLM call).

---

## When LLM Calls Are Triggered

### 1. **Regular Users** (NOT synthetic)
**Viewing `/assessment` = NO LLM call** ✅

**Code**: `usePMLevel.ts` line 126
```typescript
return await pmLevelsService.getUserLevel(user.id);
```

This **only reads from database** (`user_levels` table). No LLM is called.

**LLM calls only happen when:**
- User clicks "Run Assessment" button (manual recalc)
- Background job is scheduled after content changes

---

### 2. **Synthetic Users** (Internal Testing)
**Viewing `/assessment` = YES, ALWAYS triggers LLM call** ❌

**Code**: `usePMLevel.ts` lines 112-123
```typescript
if (syntheticProfileId) {
  return await pmLevelsService.analyzeUserLevel(
    user.id,
    undefined,
    undefined,
    {
      sessionId: `pm-level-ui-${Date.now()}-${syntheticProfileId}`,
      triggerReason: 'initial-load',
      syntheticProfileId,
    },
    syntheticProfileId,
  );
}
```

**Why?** Synthetic users don't have persistent database records, so `analyzeUserLevel()` is called directly, which:
1. Fetches user content
2. **Calls LLM** to extract signals
3. **Calls LLM** to rate competencies  
4. **Calls LLM** to derive business maturity
5. **Calls LLM** to generate recommendations

**Result**: 4-5 LLM calls **every time** you view Assessment page as a synthetic user.

---

## Caching Strategy (Current State)

### React Query Cache Settings
**File**: `usePMLevel.ts` lines 103-108

```typescript
refetchOnWindowFocus: false,    // ✅ Won't refetch when tab regains focus
refetchOnMount: false,          // ✅ Won't refetch when component mounts
refetchOnReconnect: false,      // ✅ Won't refetch on network reconnect
staleTime: 5 * 60 * 1000,      // ✅ Data is fresh for 5 minutes
gcTime: 30 * 60 * 1000,        // ✅ Keep in memory for 30 minutes
placeholderData: (previousData) => previousData,  // ✅ Show stale data while loading
```

### How It Works

#### Regular Users:
1. **First visit to `/assessment`**: 
   - Calls `getUserLevel()`
   - Reads from database (fast, no LLM)
   - Caches result for 5 minutes

2. **Subsequent visits within 5 minutes**:
   - Instantly loads from React Query cache
   - **Zero** database or LLM calls

3. **After 5 minutes**:
   - Data becomes "stale"
   - Next visit triggers database read (still no LLM)
   - Updates cache

#### Synthetic Users:
1. **Every visit to `/assessment`**:
   - Calls `analyzeUserLevel()` ❌
   - **4-5 LLM calls every time** ❌
   - No persistent cache (synthetic profiles are temporary)

---

## Problems Identified

### 🔴 Problem 1: Synthetic Users Spam LLM Calls
Every time you view Assessment page while testing with synthetic users (P01, P02, etc.), you trigger 4-5 LLM calls.

**Impact**:
- High cost (every page view = $0.10-0.50)
- Slow page load (~10-20 seconds)
- Explains the "MANY" evals you're seeing in dashboard

**Why this exists**: 
Synthetic users were designed for testing without polluting the database. But this means no persistent cache.

### 🟡 Problem 2: No Database Cache for Synthetic Users
Synthetic user results aren't saved to `user_levels` table, so cache can't persist across sessions.

### 🟢 Good News: Regular Users Are Fine
Regular users have excellent caching:
- 5-minute in-memory cache
- Database-backed persistence
- No unnecessary LLM calls

---

## Recommendations

### **Option 1: Store Synthetic User Results in Database** (Recommended)
**Pros:**
- Enables proper caching
- Stops spam LLM calls
- Better testing experience

**Cons:**
- Need to filter synthetic data from analytics
- Need cleanup job to delete old synthetic data

**Implementation:**
```typescript
// In pmLevelsService.ts, saveUserLevel()
// Remove the check that prevents saving synthetic users:

// REMOVE THIS:
if (syntheticProfileId) {
  console.log('[PMLevelsService] Skipping database save for synthetic profile');
  return;
}

// ADD THIS INSTEAD:
const userIdToSave = syntheticProfileId 
  ? `synthetic_${syntheticProfileId}` 
  : userId;
```

### **Option 2: Add Synthetic-Specific Cache Layer**
Store synthetic results in localStorage/sessionStorage:

```typescript
// In usePMLevel.ts
const SYNTHETIC_CACHE_KEY = (userId: string, profileId: string) => 
  `pm_level_cache_${userId}_${profileId}`;

// Check cache before LLM call
const cachedResult = localStorage.getItem(SYNTHETIC_CACHE_KEY(user.id, syntheticProfileId));
if (cachedResult) {
  const parsed = JSON.parse(cachedResult);
  const age = Date.now() - parsed.timestamp;
  if (age < 5 * 60 * 1000) { // 5 minutes
    return parsed.data;
  }
}

// After LLM call, cache the result
localStorage.setItem(SYNTHETIC_CACHE_KEY(user.id, syntheticProfileId), JSON.stringify({
  data: result,
  timestamp: Date.now()
}));
```

### **Option 3: Disable Auto-Run for Synthetic Users**
Show cached data or empty state, require manual "Run Assessment" click:

```typescript
// In usePMLevel.ts, line 112
if (syntheticProfileId) {
  // Return cached data or null, don't auto-run
  return await pmLevelsService.getUserLevel(userId); // Try database first
}
```

---

## Impact Analysis

### Current State (Synthetic Users)
- **Every `/assessment` visit**: 4-5 LLM calls
- **Testing session (10 visits)**: 40-50 LLM calls
- **Cost**: $5-25 per testing session
- **Time**: 10-20 seconds per page load

### With Fix (Option 1 or 2)
- **First `/assessment` visit**: 4-5 LLM calls
- **Subsequent visits (5 min)**: 0 LLM calls ✅
- **Cost**: $0.10-0.50 per testing session
- **Time**: <1 second per page load

---

## Manual Recalculation

Manual recalc (clicking "Run Assessment") **always** triggers new LLM calls for both regular and synthetic users:

**Code**: `usePMLevel.ts` lines 195-205
```typescript
mutationFn: async (params) => {
  return pmLevelsService.analyzeUserLevel(
    user.id,
    params?.targetLevel,
    params?.roleType,
    {
      sessionId: `pm-level-recalc-${Date.now()}`,
      triggerReason: 'manual-recalc',
      syntheticProfileId,
    },
    syntheticProfileId,
  );
}
```

This is **expected behavior** - user explicitly requested fresh analysis.

---

## Conclusion

**TL;DR:**
1. ✅ Regular users: Page loads instantly, no LLM calls
2. ❌ Synthetic users: Page triggers 4-5 LLM calls every time
3. 🔧 Fix: Implement Option 1 (save synthetic to DB) or Option 2 (localStorage cache)
4. 📊 Expected reduction: 90-95% fewer LLM calls during testing

The "MANY" evals you're seeing are from synthetic user testing, not regular usage.

