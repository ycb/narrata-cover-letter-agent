# PM Levels Script RLS Issue

**Date**: 2026-01-17  
**Issue**: `trigger-pm-levels.ts` script fails with "Fetched 0 work items" due to RLS

---

## Problem

The `PMLevelsService` is designed for **client-side use** (browser with user authentication). When run from a Node script:

1. Service uses `supabase` client from `@/lib/supabase` (client-side instance)
2. No user auth context → RLS blocks all queries
3. Result: Fetches 0 sources, 0 work items, 0 stories → "No content found"

```typescript
// From logs:
[PMLevelsService] Fetched 0 sources for user d3937780-28ec-4221-8bfb-2bb0f670fd52
[PMLevelsService] Fetched 0 work items for user d3937780-28ec-4221-8bfb-2bb0f670fd52
[PMLevelsService] No content found for user
```

---

## Why This Happens

**Client-Side Service Design**:
```typescript
// src/services/pmLevelsService.ts
import { supabase } from '@/lib/supabase';  // ❌ Client-side instance with RLS

private async fetchUserContent(userId: string) {
  const { data: sources } = await supabase  // ❌ Uses client instance
    .from('sources')
    .eq('user_id', userId);
  // ... RLS blocks this query if no auth context
}
```

**Node Script with Service Role**:
```typescript
// scripts/trigger-pm-levels.ts
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);  // ✅ Service role

const { PMLevelsService } = await import('../src/services/pmLevelsService.js');
const pmService = new PMLevelsService();  // ❌ Still uses client-side supabase internally
```

---

## Solutions

### Option 1: Use Edge Function (Recommended)

The proper approach is to trigger the **edge function** which is designed for server-side execution:

```bash
# This is what schedulePMLevelBackgroundRun() does
curl -X POST https://<project>.supabase.co/functions/v1/create-job \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "pmLevels",
    "input": {
      "userId": "d3937780-28ec-4221-8bfb-2bb0f670fd52",
      "forceRefresh": true,
      "triggerReason": "manual",
      "runType": "initial"
    }
  }'
```

**But**: We discovered earlier that this edge function call is **failing silently** (no jobs created). Need to debug edge function.

### Option 2: Refactor Service to Accept Custom Client

Modify `PMLevelsService` to accept an optional Supabase client:

```typescript
export class PMLevelsService {
  private llmService: LLMAnalysisService;
  private supabaseClient: any;  // ✅ Allow custom client

  constructor(supabaseClient?: any) {
    this.llmService = new LLMAnalysisService();
    this.supabaseClient = supabaseClient || supabase;  // ✅ Fall back to default
  }

  private async fetchUserContent(userId: string) {
    const { data: sources } = await this.supabaseClient  // ✅ Use injected client
      .from('sources')
      .eq('user_id', userId);
    // ...
  }
}
```

Then in script:
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const pmService = new PMLevelsService(supabase);  // ✅ Pass service role client
```

### Option 3: Temporarily Disable RLS for Script

**Not recommended** - security risk, but would work:

```sql
-- Temporarily allow service role to bypass RLS
ALTER TABLE work_items DISABLE ROW LEVEL SECURITY;
-- Run script
-- Re-enable
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
```

---

## Recommended Action

### Immediate (For Jungwon)

**Use browser console instead** (where user auth context exists):

1. Log in as Jungwon
2. Navigate to `/assessment`
3. Open browser console
4. Run:
```javascript
const { PMLevelsService } = await import('/src/services/pmLevelsService.ts');
const pmService = new PMLevelsService();
await pmService.analyzeUserLevel('d3937780-28ec-4221-8bfb-2bb0f670fd52');
```

This works because browser has user's auth token.

### Long-Term (For All Users)

1. **Fix edge function** (`create-job`) so `schedulePMLevelBackgroundRun()` works
2. **Debug why edge function is failing** (check edge function logs, RLS policies, auth)
3. **Add retry logic** if edge function fails
4. **Add monitoring** to track job creation success rate

---

## UI Race Condition Issue

> "It was in empty state, but then auto-updated to show full assessment. Any idea on why the lag?"

This happens because:

1. User visits `/assessment` → No cached result → Shows empty state
2. UI auto-triggers analysis in background (via edge function or client-side service)
3. Analysis takes 5-30 seconds
4. Result streams back → UI updates

**The lag is normal** (analysis is expensive), but **UX is bad** because:
- No loading indicator shown
- User sees empty state then sudden data appearance
- No way to know analysis is running

### Fix UI Race Condition

**Add loading states**:

```typescript
// src/pages/Assessment.tsx or usePMLevel hook
const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'running' | 'complete'>('idle');

useEffect(() => {
  if (!userLevel) {
    setAnalysisStatus('running');
    // Trigger analysis
    pmService.analyzeUserLevel(userId).then(() => {
      setAnalysisStatus('complete');
    });
  }
}, [userLevel]);

// In render:
if (analysisStatus === 'running') {
  return <LoadingSpinner message="Analyzing your work history..." />;
}
```

**Show progress indicators**:
- "Analyzing your work history..." (0-10s)
- "Evaluating competencies..." (10-20s)
- "Calculating level..." (20-30s)

**Add manual trigger button**:
```typescript
if (!userLevel && analysisStatus === 'idle') {
  return (
    <Button onClick={() => triggerAnalysis()}>
      Run PM Level Analysis
    </Button>
  );
}
```

---

## Next Steps

1. **Immediate**: Use browser console for Jungwon (workaround)
2. **Debug edge function**: Why is `create-job` failing?
3. **Add UX improvements**: Loading states, progress indicators
4. **Long-term**: Refactor service to accept custom client (Option 2)

---

## Related Issues

- Edge function `create-job` failing silently (no jobs created)
- No logging/monitoring for PM levels job creation
- UI shows empty state instead of loading state during analysis
- Service not designed for server-side execution (RLS issue)
