type NavigationDebugEvent = {
  at: number;
  kind:
    | 'beforeunload'
    | 'location.reload'
    | 'location.assign'
    | 'location.replace'
    | 'vite:beforeFullReload'
    | 'vite:invalidate'
    | 'vite:error';
  href: string;
  stack?: string;
  detail?: any;
};

const STORAGE_KEY = 'debug:last-navigation-event';
const STORAGE_LIST_KEY = 'debug:navigation-events';
const MAX_EVENTS = 25;

function record(kind: NavigationDebugEvent['kind']) {
  try {
    const evt: NavigationDebugEvent = {
      at: Date.now(),
      kind,
      href: window.location.href,
      stack: new Error().stack,
    };
    try {
      // eslint-disable-next-line no-console
      console.warn('[nav-debug] record', evt);
    } catch {}
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(evt));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(evt));
    try {
      const existingRaw =
        window.sessionStorage.getItem(STORAGE_LIST_KEY) || window.localStorage.getItem(STORAGE_LIST_KEY);
      const existing = existingRaw ? (JSON.parse(existingRaw) as NavigationDebugEvent[]) : [];
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

function recordWithDetail(kind: NavigationDebugEvent['kind'], detail: any) {
  try {
    const evt: NavigationDebugEvent = {
      at: Date.now(),
      kind,
      href: window.location.href,
      stack: new Error().stack,
      detail,
    };
    try {
      // eslint-disable-next-line no-console
      console.warn('[nav-debug] record', evt);
    } catch {}
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(evt));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(evt));
    try {
      const existingRaw =
        window.sessionStorage.getItem(STORAGE_LIST_KEY) || window.localStorage.getItem(STORAGE_LIST_KEY);
      const existing = existingRaw ? (JSON.parse(existingRaw) as NavigationDebugEvent[]) : [];
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

function safePatchLocationMethod(methodName: 'reload' | 'assign' | 'replace', kind: NavigationDebugEvent['kind']) {
  try {
    const loc = window.location as any;
    const original = loc?.[methodName];
    if (typeof original !== 'function') return;
    loc[methodName] = (...args: any[]) => {
      record(kind);
      return original.apply(window.location, args);
    };
  } catch {
    // Some browsers treat Location methods as non-writable; ignore.
  }
}

export function installNavigationDebug() {
  if (typeof window === 'undefined') return;
  try {
    (window as any).__navDebugInstalled = true;
    document.documentElement.dataset.navDebug = '1';
    // eslint-disable-next-line no-console
    console.error('[nav-debug] installed');
  } catch {}

  window.addEventListener('beforeunload', () => record('beforeunload'));
  window.addEventListener('pagehide', (e) => recordWithDetail('vite:beforeFullReload', { reason: 'pagehide', persisted: (e as any).persisted }));
  window.addEventListener('pageshow', (e) => recordWithDetail('vite:invalidate', { reason: 'pageshow', persisted: (e as any).persisted }));
  document.addEventListener('visibilitychange', () => recordWithDetail('vite:error', { reason: 'visibilitychange', hidden: document.hidden }));
  safePatchLocationMethod('reload', 'location.reload');
  safePatchLocationMethod('assign', 'location.assign');
  safePatchLocationMethod('replace', 'location.replace');

  // Vite full-reload diagnostics (DEV only)
  try {
    // @ts-expect-error - Vite provides this in dev
    if (import.meta?.hot?.on) {
      // @ts-expect-error - Vite provides this in dev
      import.meta.hot.on('vite:beforeFullReload', (payload: any) => {
        recordWithDetail('vite:beforeFullReload', payload);
      });
      // @ts-expect-error - Vite provides this in dev
      import.meta.hot.on('vite:invalidate', (payload: any) => {
        recordWithDetail('vite:invalidate', payload);
      });
      // @ts-expect-error - Vite provides this in dev
      import.meta.hot.on('vite:error', (payload: any) => {
        recordWithDetail('vite:error', payload);
      });
    }
  } catch {
    // ignore
  }
}

export function readLastNavigationDebugEvent(): NavigationDebugEvent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NavigationDebugEvent;
  } catch {
    return null;
  }
}

export function readNavigationDebugEvents(): NavigationDebugEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_LIST_KEY) || window.localStorage.getItem(STORAGE_LIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NavigationDebugEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
