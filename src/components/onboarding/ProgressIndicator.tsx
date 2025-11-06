import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface ProgressUpdate {
  step: string;
  progress: number;
  message: string;
  details?: string;
}

export function ProgressIndicator() {
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [history, setHistory] = useState<ProgressUpdate[]>([]);

  useEffect(() => {
    const handleProgress = (event: CustomEvent<ProgressUpdate>) => {
      const update = event.detail;
      setCurrentProgress(update);
      setHistory(prev => [...prev, update]);
    };

    window.addEventListener('upload:progress' as any, handleProgress);

    return () => {
      window.removeEventListener('upload:progress' as any, handleProgress);
    };
  }, []);

  if (!currentProgress) {
    return null;
  }

  const isComplete = currentProgress.progress >= 1;

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      {/* Current Step */}
      <div className="flex items-center gap-3">
        {isComplete ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {currentProgress.message}
          </p>
          {currentProgress.details && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentProgress.details}
            </p>
          )}
        </div>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">
          {Math.round(currentProgress.progress * 100)}%
        </span>
      </div>

      {/* Progress Bar */}
      <Progress value={currentProgress.progress * 100} className="h-2" />

      {/* Recent Steps (last 3, excluding current) */}
      {history.length > 1 && !isComplete && (
        <div className="space-y-1.5 pt-2 border-t">
          {history.slice(-4, -1).map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
              <span className="text-muted-foreground">{step.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

