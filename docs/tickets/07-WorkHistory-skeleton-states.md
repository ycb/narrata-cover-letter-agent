## Summary
Render skeleton placeholders in the Work History list while processing and no `work_items` have arrived yet; switch to real cards as items stream in.

## Problem
Users should see content quickly without waiting for the full pipeline to finish.

## Files to create/modify
- Modify: Work History list component (e.g., `src/components/work-history/WorkHistoryList.tsx`)

## Step-by-step implementation details
1) Import and use `useResumeStreamContext` to read `isProcessing`, `hasWorkHistory`, and `workItems`.
2) If `isProcessing && !hasWorkHistory`, render skeleton cards.
3) Otherwise, map `workItems` to your existing `WorkHistoryCard` component.

```typescript
import { useResumeStreamContext } from '@/contexts/ResumeStreamContext';
import { Skeleton } from '@/components/ui/skeleton';

export function WorkHistoryList() {
  const { isProcessing, hasWorkHistory, workItems } = useResumeStreamContext();

  if (isProcessing && !hasWorkHistory) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="border rounded-lg p-4 animate-pulse">
            <Skeleton className="h-5 w-48 mb-2" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workItems.map(item => (
        <WorkHistoryCard key={item.id} item={item} />
      ))}
    </div>
  );
}
```

## Acceptance criteria
- Skeletons render during processing until first `work_items` insert arrives.
- Real cards render incrementally as items stream in.

## QA steps
- Upload a resume and observe skeletons followed by real cards as data is inserted by the edge function.

