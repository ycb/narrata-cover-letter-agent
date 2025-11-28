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


