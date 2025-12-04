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


