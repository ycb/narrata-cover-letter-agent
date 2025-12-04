## Summary
Wire the onboarding page to the streaming system: wrap with `ResumeStreamProvider`, add `GlobalResumeProgress`, and invoke `startProcessing(file)` from context. Ensure Work History uses the shared context state.

## Problem
Onboarding currently blocks and/or relies on client-side parsing. We need to switch to the new streaming flow and non-blocking UI.

## Files to create/modify
- Modify: `src/pages/NewUserOnboarding.tsx`
- Ensure Work History list component imports the context (Issue 7)

## Step-by-step implementation details
1) Mount points:
   - Wrap the onboarding page/layout with `<ResumeStreamProvider> ... </ResumeStreamProvider>`.
   - Render `<GlobalResumeProgress />` at the top of the onboarding page so it’s visible during the flow.
2) Upload handler:
   - On resume upload, call `const { startProcessing } = useResumeStreamContext()` and then `await startProcessing(file)`.
   - Do not block the page; allow immediate navigation and skeletons to show.
3) Work History:
   - Ensure the Work History list component is the one from Issue 7 and reads from `useResumeStreamContext()`.
4) Remove any legacy blocking upload UI paths that previously assumed in-browser parsing.

### Sketch
```tsx
// src/pages/NewUserOnboarding.tsx
import { ResumeStreamProvider } from '@/contexts/ResumeStreamContext';
import { GlobalResumeProgress } from '@/components/GlobalResumeProgress';
import { useResumeStreamContext } from '@/contexts/ResumeStreamContext';

function UploadControl() {
  const { startProcessing } = useResumeStreamContext();
  return (
    <input
      type="file"
      accept=".pdf,.doc,.docx"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (file) await startProcessing(file);
      }}
    />
  );
}

export default function NewUserOnboarding() {
  return (
    <ResumeStreamProvider>
      <GlobalResumeProgress />
      <div className="max-w-3xl mx-auto space-y-6">
        <UploadControl />
        <WorkHistoryList />
        {/* Other onboarding content */}
      </div>
    </ResumeStreamProvider>
  );
}
```

## Acceptance criteria
- User can upload a resume and continue interacting with the page within seconds.
- Global progress bar appears and updates stages.
- Work History skeletons appear quickly; real cards stream in as items are inserted.

## QA steps
- Upload a known resume.
- Confirm non-blocking UX (<5s), skeletons within ~15s, and final `processing_stage='complete'`.

