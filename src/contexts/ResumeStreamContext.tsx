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


