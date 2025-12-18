/// <reference types="vite/client" />

// Analytics tool type declarations
interface Window {
  LogRocket?: {
    track: (eventName: string, properties?: Record<string, any>) => void;
  };
  pendo?: {
    track: (eventName: string, properties?: Record<string, any>) => void;
  };
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_SYNTHETIC_LOCAL_ONLY?: string;
  readonly VITE_HIL_COVER_LETTER_V2?: string;
  /** @deprecated Use `VITE_ENABLE_HIL_V3` */
  readonly VITE_HIL_COVER_LETTER_V3?: string;
  /** Optional override for HIL "generate content" model (default: `VITE_OPENAI_MODEL`). */
  readonly VITE_OPENAI_MODEL_HIL?: string;
  /** Enable HIL v3 everywhere (baseline). */
  readonly VITE_ENABLE_HIL_V3?: string;
  /** Force legacy HIL everywhere (rollback switch). */
  readonly VITE_FORCE_HIL_LEGACY?: string;
  /** @deprecated Use `VITE_ENABLE_HIL_V3` */
  readonly VITE_ENABLE_HIL_V3_BASELINE?: string;
  // add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
