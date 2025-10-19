import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export interface ProgressUpdate {
  step: string;
  progress: number; // 0-1
  message: string;
  details?: string;
  timestamp: number;
}

interface UploadProgressContextType {
  currentProgress: ProgressUpdate | null;
  progressHistory: ProgressUpdate[];
  updateProgress: (step: string, progress: number, message: string, details?: string) => void;
  resetProgress: () => void;
  isProcessing: boolean;
}

const UploadProgressContext = createContext<UploadProgressContextType | undefined>(undefined);

export function UploadProgressProvider({ children }: { children: ReactNode }) {
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressUpdate[]>([]);

  const updateProgress = useCallback((step: string, progress: number, message: string, details?: string) => {
    const update: ProgressUpdate = {
      step,
      progress: Math.min(Math.max(progress, 0), 1), // Clamp between 0-1
      message,
      details,
      timestamp: Date.now()
    };

    setCurrentProgress(update);
    setProgressHistory(prev => [...prev, update]);

    console.log(`📊 Progress: ${(progress * 100).toFixed(0)}% - ${message}`, details || '');
  }, []);

  const resetProgress = useCallback(() => {
    setCurrentProgress(null);
    setProgressHistory([]);
  }, []);

  const isProcessing = currentProgress !== null && currentProgress.progress < 1;

  return (
    <UploadProgressContext.Provider
      value={{
        currentProgress,
        progressHistory,
        updateProgress,
        resetProgress,
        isProcessing
      }}
    >
      {children}
    </UploadProgressContext.Provider>
  );
}

export function useUploadProgress() {
  const context = useContext(UploadProgressContext);
  if (!context) {
    throw new Error('useUploadProgress must be used within UploadProgressProvider');
  }
  return context;
}

