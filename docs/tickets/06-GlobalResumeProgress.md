## Summary
Create a global progress indicator that displays current stage and percent while the resume is being processed.

## Problem
Users need immediate, non-blocking feedback showing progress through the pipeline stages.

## Files to create/modify
- Create: `src/components/GlobalResumeProgress.tsx`

## Step-by-step implementation details
1) Create `src/components/GlobalResumeProgress.tsx`.
2) Implement a top banner that reads `processingStage` from context and maps it to label/percent.
3) Render only while processing or immediately after completion; hide when idle.

```typescript
import { useResumeStreamContext } from '@/contexts/ResumeStreamContext';
import { Progress } from '@/components/ui/progress';

const stageConfig: Record<string, { label: string; percent: number }> = {
  pending: { label: 'Preparing...', percent: 5 },
  extracting: { label: 'Reading resume...', percent: 15 },
  skeleton: { label: 'Identifying roles...', percent: 50 },
  skills: { label: 'Analyzing skills...', percent: 85 },
  complete: { label: 'Profile ready!', percent: 100 },
  error: { label: 'Processing failed', percent: 0 }
};

export function GlobalResumeProgress() {
  const { processingStage, isProcessing, isComplete } = useResumeStreamContext();
  if (!isProcessing && !isComplete) return null;

  const config = stageConfig[processingStage] || stageConfig.pending;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 border-b px-4 py-2">
      <div className="max-w-2xl mx-auto flex items-center gap-4">
        <Progress value={config.percent} className="flex-1 h-2" />
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {config.label}
        </span>
      </div>
    </div>
  );
}
```

## Acceptance criteria
- Banner appears when processing starts and updates based on stage.
- Banner hides when idle (not processing and not just completed).

## QA steps
- Trigger `startProcessing(file)` and confirm label/percent transitions for `extracting`, `skeleton`, `skills`, and `complete`.

