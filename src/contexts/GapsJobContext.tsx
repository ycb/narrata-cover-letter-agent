import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface GapsJobContextValue {
  isRunning: boolean;
  setIsRunning: (v: boolean) => void;
}

const GapsJobContext = createContext<GapsJobContextValue | undefined>(undefined);

export function GapsJobProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsRunning(false);
      return;
    }
    // Subscribe to a realtime channel for gap job status updates, if available later
    // Convention: broadcast on channel `gaps_jobs:user:{userId}` with payload { status: 'queued'|'running'|'succeeded'|'failed' }
    const channel = supabase
      .channel(`gaps_jobs:user:${user.id}`)
      .on('broadcast', { event: 'job_status' }, (payload: any) => {
        const status = payload?.payload?.status;
        if (status === 'running' || status === 'queued') setIsRunning(true);
        if (status === 'succeeded' || status === 'failed') setIsRunning(false);
      })
      .subscribe();

    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [user?.id]);

  const value = useMemo(() => ({ isRunning, setIsRunning }), [isRunning]);
  return <GapsJobContext.Provider value={value}>{children}</GapsJobContext.Provider>;
}

export function useGapsJob() {
  const ctx = useContext(GapsJobContext);
  if (!ctx) throw new Error('useGapsJob must be used within GapsJobProvider');
  return ctx;
}
