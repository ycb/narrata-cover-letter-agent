export type PreferredDashboard = 'main' | 'onboarding';

const STORAGE_KEY = 'dashboard:preferred';

export const getPreferredDashboardCache = (): PreferredDashboard | null => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'main' || value === 'onboarding' ? value : null;
  } catch {
    return null;
  }
};

export const setPreferredDashboardCache = (value: PreferredDashboard | null) => {
  if (typeof window === 'undefined') return;
  try {
    if (!value) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Ignore storage errors (private mode, etc.)
  }
};
