function readEnvFlag(key: string): string | undefined {
  const fromImportMeta = (import.meta as any)?.env?.[key] as string | undefined;
  const fromProcess = typeof process !== 'undefined' ? ((process as any)?.env?.[key] as string | undefined) : undefined;
  return fromImportMeta ?? fromProcess;
}

function readHilV3EnvEnabled(): string | undefined {
  // Use direct `import.meta.env.VITE_*` access so Vite can statically replace in builds.
  const fromImportMeta = import.meta.env.VITE_ENABLE_HIL_V3 as string | undefined;
  const fromProcess =
    typeof process !== 'undefined' ? ((process as any)?.env?.VITE_ENABLE_HIL_V3 as string | undefined) : undefined;
  return fromImportMeta ?? fromProcess;
}

function readHilV3CoverLetterAlias(): string | undefined {
  const fromImportMeta = import.meta.env.VITE_HIL_COVER_LETTER_V3 as string | undefined;
  const fromProcess =
    typeof process !== 'undefined' ? ((process as any)?.env?.VITE_HIL_COVER_LETTER_V3 as string | undefined) : undefined;
  return fromImportMeta ?? fromProcess;
}

function readHilV3BaselineAlias(): string | undefined {
  const fromImportMeta = import.meta.env.VITE_ENABLE_HIL_V3_BASELINE as string | undefined;
  const fromProcess =
    typeof process !== 'undefined'
      ? ((process as any)?.env?.VITE_ENABLE_HIL_V3_BASELINE as string | undefined)
      : undefined;
  return fromImportMeta ?? fromProcess;
}

function readHilForceLegacyEnv(): string | undefined {
  const fromImportMeta = import.meta.env.VITE_FORCE_HIL_LEGACY as string | undefined;
  const fromProcess =
    typeof process !== 'undefined' ? ((process as any)?.env?.VITE_FORCE_HIL_LEGACY as string | undefined) : undefined;
  return fromImportMeta ?? fromProcess;
}

export function isTruthyFlag(value: unknown): boolean {
  const v = String(value ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export function readLocalStorageFlag(key: string): string | undefined {
  try {
    if (typeof window === 'undefined') return undefined;
    return window.localStorage.getItem(key) ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Feature flag: force legacy HIL everywhere (rollback switch).
 *
 * - Env: `VITE_FORCE_HIL_LEGACY=true`
 * - Local override: `localStorage.hil_force_legacy = "1"`
 */
export function isHilLegacyForced(): boolean {
  return isTruthyFlag(readHilForceLegacyEnv()) || isTruthyFlag(readLocalStorageFlag('hil_force_legacy'));
}

/**
 * Feature flag: enable HIL V3 everywhere (baseline).
 *
 * - Env: `VITE_ENABLE_HIL_V3=true`
 * - Local override: `localStorage.hil_v3 = "1"`
 *
 * Back-compat aliases (temporary):
 * - Env: `VITE_HIL_COVER_LETTER_V3=true`
 * - Env: `VITE_ENABLE_HIL_V3_BASELINE=true`
 * - Local: `localStorage.hil_cover_letter_v3 = "1"`
 * - Local: `localStorage.hil_v3_baseline = "1"`
 */
export function isHilV3Enabled(): boolean {
  if (isHilLegacyForced()) return false;

  const envEnabled =
    isTruthyFlag(readHilV3EnvEnabled()) || isTruthyFlag(readHilV3CoverLetterAlias()) || isTruthyFlag(readHilV3BaselineAlias());

  const lsEnabled =
    isTruthyFlag(readLocalStorageFlag('hil_v3')) ||
    isTruthyFlag(readLocalStorageFlag('hil_cover_letter_v3')) ||
    isTruthyFlag(readLocalStorageFlag('hil_v3_baseline'));

  return envEnabled || lsEnabled;
}

/** @deprecated Use `isHilV3Enabled()` */
export function isHilV3BaselineEnabled(): boolean {
  return isHilV3Enabled();
}
