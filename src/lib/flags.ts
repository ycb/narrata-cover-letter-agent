export function isDraftReadinessEnabled(): boolean {
  const explicit = readBooleanEnv('ENABLE_DRAFT_READINESS') ?? readBooleanEnv('VITE_ENABLE_DRAFT_READINESS');
  return explicit ?? false;
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

/**
 * Feature flags helper for LinkedIn Scraping.
 * Canonical name: ENABLE_LI_SCRAPING
 * We also accept VITE_ENABLE_LI_SCRAPING for Vite builds, but canonical wins.
 */
export function isLinkedInScrapingEnabled(): boolean {
  // Canonical first
  const canonical =
    (typeof process !== 'undefined' && process.env && process.env.ENABLE_LI_SCRAPING === 'true') ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.ENABLE_LI_SCRAPING === 'true');

  if (canonical) return true;

  // Fallback to Vite-exposed name if canonical is not available
  const viteExposed =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_ENABLE_LI_SCRAPING === 'true') ||
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.VITE_ENABLE_LI_SCRAPING === 'true');

  return Boolean(viteExposed);
}

/**
 * Feature flags helper for Product Tour.
 * We also accept VITE_ENABLE_PRODUCT_TOUR for Vite builds, but canonical wins.
 *
 * Default: OFF (prevents onboarding confusion).
 */
export function isProductTourEnabled(): boolean {
  const viteExposed =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_ENABLE_PRODUCT_TOUR === 'true') ||
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.VITE_ENABLE_PRODUCT_TOUR === 'true');

  return Boolean(viteExposed);
}

/**
 * Feature flags helper for Background Generic Gap Judge.
 * Canonical name: ENABLE_BACKGROUND_GENERIC_GAP_JUDGE
 * We also accept VITE_ENABLE_BACKGROUND_GENERIC_GAP_JUDGE for Vite builds, but canonical wins.
 *
 * Default: OFF (prevents post-import gap totals changing unexpectedly).
 */
export function isBackgroundGenericGapJudgeEnabled(): boolean {
  // Canonical first
  const canonical =
    (typeof process !== 'undefined' && process.env && process.env.ENABLE_BACKGROUND_GENERIC_GAP_JUDGE === 'true') ||
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.ENABLE_BACKGROUND_GENERIC_GAP_JUDGE === 'true');

  if (canonical) return true;

  // Fallback to Vite-exposed name if canonical is not available
  const viteExposed =
    (typeof import.meta !== 'undefined' &&
      (import.meta as any).env &&
      (import.meta as any).env.VITE_ENABLE_BACKGROUND_GENERIC_GAP_JUDGE === 'true') ||
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.VITE_ENABLE_BACKGROUND_GENERIC_GAP_JUDGE === 'true');

  return Boolean(viteExposed);
}

const readEnv = (name: string): string | undefined => {
  const fromNode =
    typeof process !== 'undefined' && process.env ? (process.env as any)[name] : undefined;
  const fromVite =
    typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env[name] : undefined;
  return fromNode ?? fromVite;
};

const readBooleanEnv = (name: string): boolean | undefined => {
  const raw = readEnv(name);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
};

/**
 * Marketing flag: when signup is disabled, the site should route CTAs to waitlist.
 * Canonical name: ENABLE_SIGNUP
 * We also accept VITE_ENABLE_SIGNUP for Vite builds.
 *
 * Default: enabled in dev, disabled in prod.
 */
export function isSignupEnabled(): boolean {
  const explicit = readBooleanEnv('ENABLE_SIGNUP') ?? readBooleanEnv('VITE_ENABLE_SIGNUP');
  if (explicit !== undefined) return explicit;

  // Fallback default (matching legacy dev behavior)
  return true;
}

export function isWaitlistModeEnabled(): boolean {
  return !isSignupEnabled();
}
