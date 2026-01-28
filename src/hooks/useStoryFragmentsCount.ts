import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { StoryFragmentService } from '@/services/storyFragmentService';

export function useStoryFragmentsCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCount(0);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);

    StoryFragmentService.countPending(user.id)
      .then((next) => {
        if (!isCancelled) {
          setCount(next);
        }
      })
      .catch((error) => {
        console.error('[useStoryFragmentsCount] Failed to load fragment count:', error);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.id]);

  return { count, isLoading };
}
