export type DraftEnvelope<T> = {
  version: 1;
  updatedAt: number;
  data: T;
};

function safeParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export function loadDraft<T>(key: string): DraftEnvelope<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = safeParseJson<DraftEnvelope<T>>(raw);
    if (!parsed || parsed.version !== 1 || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: DraftEnvelope<T> = { version: 1, updatedAt: Date.now(), data };
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function clearDraft(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

