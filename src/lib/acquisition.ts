type UtmParams = Record<string, string>;

export type AcquisitionContext = {
  utm: UtmParams | null;
  referrer: string | null;
  landing_url: string | null;
  captured_at: string | null;
};

const STORAGE_KEY = 'narrata:acquisition';
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

const isBrowser = typeof window !== 'undefined';

const parseUtmParams = (search: string): UtmParams | null => {
  const params = new URLSearchParams(search);
  const utm: UtmParams = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value && value.trim()) {
      utm[key] = value.trim();
    }
  }
  return Object.keys(utm).length ? utm : null;
};

const readStoredAcquisition = (): AcquisitionContext | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AcquisitionContext;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      utm: parsed.utm ?? null,
      referrer: parsed.referrer ?? null,
      landing_url: parsed.landing_url ?? null,
      captured_at: parsed.captured_at ?? null,
    };
  } catch (error) {
    console.warn('[acquisition] Failed to read stored context:', error);
    return null;
  }
};

const writeStoredAcquisition = (context: AcquisitionContext): void => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch (error) {
    console.warn('[acquisition] Failed to persist context:', error);
  }
};

export const captureAcquisition = (): AcquisitionContext | null => {
  if (!isBrowser) return null;

  const existing = readStoredAcquisition();
  const utm = parseUtmParams(window.location.search);
  const referrer = document.referrer || null;
  const landingUrl = window.location.href;

  const next: AcquisitionContext = existing ?? {
    utm: null,
    referrer: null,
    landing_url: null,
    captured_at: null,
  };

  let changed = false;

  if (!next.landing_url && landingUrl) {
    next.landing_url = landingUrl;
    changed = true;
  }

  if (!next.referrer && referrer) {
    next.referrer = referrer;
    changed = true;
  }

  if ((!next.utm || Object.keys(next.utm).length === 0) && utm) {
    next.utm = utm;
    changed = true;
  }

  if (!next.captured_at) {
    next.captured_at = new Date().toISOString();
    changed = true;
  }

  if (changed) {
    writeStoredAcquisition(next);
  }

  return next;
};

export const getAcquisitionContext = (): AcquisitionContext | null => readStoredAcquisition();
