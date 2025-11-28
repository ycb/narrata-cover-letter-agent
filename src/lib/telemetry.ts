// Tiny A-phase telemetry wrapper
// - Dev only: logs to console
// - Prod: no-op
export type AStreamEventName =
  | 'stream_cover_letter_stage_completed'
  | 'stream_cover_letter_insights_rendered';

export function logAStreamEvent(
  eventName: AStreamEventName,
  payload: Record<string, unknown> = {}
): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }
  // Keep signal concise and consistent in dev
  // Intentionally using console.info to distinguish from regular debug logs
  // eslint-disable-next-line no-console
  console.info('[telemetry]', eventName, payload);
}

// W10: Draft Readiness telemetry wrapper (UI)
// - Dev only console signal
// - Respect ENABLE_DRAFT_READINESS flag (no-op when disabled)
import { isDraftReadinessEnabled } from '@/lib/flags';

export type ReadinessEventName =
  | 'ui_readiness_card_viewed'
  | 'ui_readiness_card_expanded'
  | 'ui_readiness_auto_refresh_tick'
  | 'ui_readiness_finalize_submit';

export function logReadinessEvent(
  eventName: ReadinessEventName,
  payload: Record<string, unknown> = {}
): void {
  if (!isDraftReadinessEnabled()) return;
  if (process.env.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.info('[telemetry]', eventName, payload);
}


