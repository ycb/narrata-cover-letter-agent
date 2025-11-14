/**
 * Simple localStorage helpers with built-in guards for non-browser environments.
 */

const SYNTHETIC_PROFILE_KEY = 'synthetic_active_profile_id';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const storageHelpers = {
  getItem(key: string): string | null {
    if (!isBrowser) return null;
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.warn('[storageHelpers] Unable to read localStorage key:', key, error);
      return null;
    }
  },
  setItem(key: string, value: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.warn('[storageHelpers] Unable to set localStorage key:', key, error);
    }
  },
  removeItem(key: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn('[storageHelpers] Unable to remove localStorage key:', key, error);
    }
  },
};

export const syntheticStorage = {
  getActiveProfileId(): string | null {
    return storageHelpers.getItem(SYNTHETIC_PROFILE_KEY);
  },
  setActiveProfileId(profileId: string): void {
    storageHelpers.setItem(SYNTHETIC_PROFILE_KEY, profileId);
  },
  clearActiveProfileId(): void {
    storageHelpers.removeItem(SYNTHETIC_PROFILE_KEY);
  },
  key: SYNTHETIC_PROFILE_KEY,
};

export const getSyntheticLocalOnlyFlag = (): boolean => {
  try {
    const envValue =
      (import.meta.env?.VITE_SYNTHETIC_LOCAL_ONLY as string | undefined) ??
      (typeof process !== 'undefined' ? process.env?.VITE_SYNTHETIC_LOCAL_ONLY : undefined);
    if (!envValue) {
      return false;
    }
    const normalized = envValue.trim().toLowerCase();
    return normalized === 'true' || normalized.startsWith('true');
  } catch {
    return false;
  }
};

