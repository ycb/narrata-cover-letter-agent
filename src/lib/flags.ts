/**
 * Feature flags helper.
 * Canonical name: ENABLE_DRAFT_READINESS
 * We also accept VITE_ENABLE_DRAFT_READINESS for Vite builds, but canonical wins.
 */
export function isDraftReadinessEnabled(): boolean {
  // Canonical first
  const canonical =
    (typeof process !== 'undefined' && process.env && process.env.ENABLE_DRAFT_READINESS === 'true') ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.ENABLE_DRAFT_READINESS === 'true');

  if (canonical) return true;

  // Fallback to Vite-exposed name if canonical is not available
  const viteExposed =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_ENABLE_DRAFT_READINESS === 'true') ||
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.VITE_ENABLE_DRAFT_READINESS === 'true');

  return Boolean(viteExposed);
}

/**
 * Feature flags helper for External Links.
 * Canonical name: ENABLE_EXTERNAL_LINKS
 * We also accept VITE_ENABLE_EXTERNAL_LINKS for Vite builds, but canonical wins.
 */
export function isExternalLinksEnabled(): boolean {
  // Canonical first
  const canonical =
    (typeof process !== 'undefined' && process.env && process.env.ENABLE_EXTERNAL_LINKS === 'true') ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.ENABLE_EXTERNAL_LINKS === 'true');

  if (canonical) return true;

  // Fallback to Vite-exposed name if canonical is not available
  const viteExposed =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_ENABLE_EXTERNAL_LINKS === 'true') ||
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.VITE_ENABLE_EXTERNAL_LINKS === 'true');

  return Boolean(viteExposed);
}


