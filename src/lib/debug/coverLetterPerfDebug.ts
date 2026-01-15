type CoverLetterPerfEvent = {
  at: number;
  kind:
    | 'generate_click'
    | 'draft_ready'
    | 'phase_a_complete'
    | 'phase_b_gaps_ready'
    | 'retry_gaps'
    | 'refresh_insights_start'
    | 'refresh_insights_complete'
    | 'refresh_insights_failed';
  href: string;
  detail?: any;
  stack?: string;
};

const STORAGE_KEY = 'debug:last-cover-letter-perf-event';
const STORAGE_LIST_KEY = 'debug:cover-letter-perf-events';
const ENABLE_KEY = 'debug:cover-letter-perf';
const MAX_EVENTS = 50;

function isEnabled() {
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams;
    const viaQuery =
      qp.get('debugCoverLetterPerf') === '1' ||
      qp.get('debugPerf') === '1' ||
      qp.get('debug') === 'cover-letter-perf';
    const viaStorage = window.localStorage.getItem(ENABLE_KEY) === '1';
    return viaQuery || viaStorage || document.documentElement.dataset.coverLetterPerfDebug === '1';
  } catch {
    return false;
  }
}

export function enableCoverLetterPerfDebug() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ENABLE_KEY, '1');
    document.documentElement.dataset.coverLetterPerfDebug = '1';
  } catch {
    // ignore
  }
}

export function recordCoverLetterPerfEvent(kind: CoverLetterPerfEvent['kind'], detail?: any) {
  if (!isEnabled()) return;
  if (typeof window === 'undefined') return;

  try {
    const evt: CoverLetterPerfEvent = {
      at: Date.now(),
      kind,
      href: window.location.href,
      stack: new Error().stack,
      ...(detail !== undefined ? { detail } : {}),
    };

    try {
       
      console.warn('[cover-letter-perf]', evt);
    } catch {
      // ignore
    }

    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(evt));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(evt));

    try {
      const existingRaw =
        window.sessionStorage.getItem(STORAGE_LIST_KEY) || window.localStorage.getItem(STORAGE_LIST_KEY);
      const existing = existingRaw ? (JSON.parse(existingRaw) as CoverLetterPerfEvent[]) : [];
      const next = [...existing, evt].slice(-MAX_EVENTS);
      const nextRaw = JSON.stringify(next);
      window.sessionStorage.setItem(STORAGE_LIST_KEY, nextRaw);
      window.localStorage.setItem(STORAGE_LIST_KEY, nextRaw);
    } catch {
      // ignore
    }
  } catch {
    // ignore
  }
}

export function readLastCoverLetterPerfEvent(): CoverLetterPerfEvent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoverLetterPerfEvent;
  } catch {
    return null;
  }
}

export function readCoverLetterPerfEvents(): CoverLetterPerfEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_LIST_KEY) || window.localStorage.getItem(STORAGE_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CoverLetterPerfEvent[]) : [];
  } catch {
    return [];
  }
}
