import { supabase } from '@/lib/supabase';
import type { UserEventType } from '@/types/admin';

export async function logUserEvent(
  eventType: UserEventType,
  metadata?: Record<string, unknown>,
  options?: { userId?: string; unique?: boolean }
): Promise<void> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('[userEventsService] Failed to read session:', sessionError);
      return;
    }

    const userId = options?.userId ?? session?.user?.id;

    if (!userId) {
      console.warn('[userEventsService] Skipping event log (no authenticated user)');
      return;
    }

    if (options?.unique) {
      const { data: existing, error: lookupError } = await supabase
        .from('user_events')
        .select('id')
        .eq('user_id', userId)
        .eq('event_type', eventType)
        .limit(1)
        .maybeSingle();
      if (lookupError) {
        console.error('[userEventsService] Event lookup failed', lookupError);
      }
      if (existing) {
        return;
      }
    }

    const { error } = await supabase
      .from('user_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        metadata: metadata ?? null,
      });

    if (error) {
      console.error('[userEventsService] Failed to log event', eventType, error);
    }
  } catch (err) {
    console.error('[userEventsService] Unexpected error logging user event', eventType, err);
  }
}
