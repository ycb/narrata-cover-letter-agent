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
  triggerReason = 'content-update',  // ✅ Add default value
  runType = 'initial',                // ✅ Add default value
}: SchedulePMLevelsOptions): Promise<{ jobId?: string; error?: any }> => {  // ✅ Return Promise
  if (!userId) {
    console.warn('[PMLevelsEdgeClient] schedulePMLevelBackgroundRun called without userId');
    return Promise.resolve({ error: 'Missing userId' });  // ✅ Return error
  }

  const triggerJob = async (): Promise<{ jobId?: string; error?: any }> => {
    try {
      const { data, error } = await supabase.functions.invoke<{ jobId: string }>('create-job', {
        body: {
          type: 'pmLevels',
          input: {
            profileId: syntheticProfileId || undefined,
            forceRefresh: true,
            reason,
            triggerReason,  // ✅ Now defined
            runType,        // ✅ Now defined
          },
        },
      });

      if (error) {
        console.error('[PMLevelsEdgeClient] Failed to enqueue PM Levels job:', error);
        return { error };  // ✅ Return error for caller to handle
      }
      
      console.log(`✅ [PMLevelsEdgeClient] PM Levels job created: ${data?.jobId}`);
      return { jobId: data?.jobId };  // ✅ Return success
    } catch (err) {
      console.error('[PMLevelsEdgeClient] Error enqueuing PM Levels job:', err);
      return { error: err };  // ✅ Return error for caller to handle
    }
  };

  if (delayMs > 0) {
    return new Promise((resolve) => {
      setTimeout(() => {
        triggerJob().then(resolve);  // ✅ Resolve with result
      }, delayMs);
    });
  } else {
    return triggerJob();  // ✅ Return promise
  }
};
