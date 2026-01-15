import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface FinalCheckResponse {
  suggestions: string;
  model?: string;
}

export const useFinalCheck = () => {
  const { session } = useAuth();
  const accessToken = session?.access_token;

  const mutation = useMutation<FinalCheckResponse, Error, { draftId: string }>(
    {
      mutationFn: async ({ draftId }) => {
        if (!draftId) {
          throw new Error('Draft ID is required for final check.');
        }
        if (!accessToken) {
          throw new Error('Missing access token for final check.');
        }

        const { data, error } = await supabase.functions.invoke('final-check', {
          body: { draftId },
        });

        if (error) {
          let errorBody: any = null;
          if (error.context && typeof error.context.json === 'function') {
            try {
              errorBody = await error.context.json();
            } catch {
              // ignore
            }
          }
          throw new Error(errorBody?.error || error.message || 'Final check failed');
        }

        if (!data) {
          throw new Error('No data returned from final check');
        }

        if (data.error) {
          throw new Error(data.error);
        }

        return {
          suggestions: typeof data.suggestions === 'string' ? data.suggestions : '',
          model: data.model,
        };
      },
    },
  );

  return {
    runFinalCheck: mutation.mutateAsync,
    data: mutation.data ?? null,
    isLoading: mutation.isPending,
    error: mutation.error ?? null,
    reset: mutation.reset,
  };
};
