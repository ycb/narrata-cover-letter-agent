## Summary
Create a provider to ensure a single shared instance of `useResumeStream` across the onboarding page so multiple components share realtime state.

## Problem
If multiple components instantiate the hook independently, the realtime state fragments. We need a single source of truth.

## Files to create/modify
- Create: `src/contexts/ResumeStreamContext.tsx`

## Step-by-step implementation details
1) Create `src/contexts/ResumeStreamContext.tsx`.
2) Implement a thin provider that instantiates the hook once and exposes it via React Context.

```typescript
import { createContext, useContext, ReactNode } from 'react';
import { useResumeStream } from '@/hooks/useResumeStream';

type ResumeStreamContextType = ReturnType<typeof useResumeStream>;

const ResumeStreamContext = createContext<ResumeStreamContextType | null>(null);

export function ResumeStreamProvider({ children }: { children: ReactNode }) {
  const resumeStream = useResumeStream();
  return (
    <ResumeStreamContext.Provider value={resumeStream}>
      {children}
    </ResumeStreamContext.Provider>
  );
}

export function useResumeStreamContext(): ResumeStreamContextType {
  const context = useContext(ResumeStreamContext);
  if (!context) {
    throw new Error('useResumeStreamContext must be used within ResumeStreamProvider');
  }
  return context;
}
```

## Acceptance criteria
- Components under the provider can call `useResumeStreamContext()` to share state.
- Only a single subscription is held for a given `sourceId`.

## QA steps
- Wrap the onboarding page/layout with `ResumeStreamProvider`.
- Confirm that both Global Progress and Work History reflect the same streaming state without duplicating subscriptions.

