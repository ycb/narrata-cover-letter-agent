import { supabase } from '@/lib/supabase';

interface SchedulePMLevelsOptions {
  userId: string;
  syntheticProfileId?: string | null;
  delayMs?: number;
  reason?: string;
  triggerReason?: string;
  runType?: string;
}

export const schedulePMLevelBackgroundRun = ({
  userId,
  syntheticProfileId,
  delayMs = 0,
  reason,
}: SchedulePMLevelsOptions): void => {
  if (!userId) {
    console.warn('[PMLevelsEdgeClient] schedulePMLevelBackgroundRun called without userId');
    return;
  }

  const triggerJob = async () => {
    try {
      const { error } = await supabase.functions.invoke<{ jobId: string }>('create-job', {
        body: {
          type: 'pmLevels',
      input: {
        profileId: syntheticProfileId || undefined,
        forceRefresh: true,
        reason,
        triggerReason,
        runType,
      },
    },
  });

      if (error) {
        console.warn('[PMLevelsEdgeClient] Failed to enqueue PM Levels job:', error);
      }
    } catch (err) {
      console.warn('[PMLevelsEdgeClient] Error enqueuing PM Levels job:', err);
    }
  };

  if (delayMs > 0) {
    setTimeout(triggerJob, delayMs);
  } else {
    void triggerJob();
  }
};
