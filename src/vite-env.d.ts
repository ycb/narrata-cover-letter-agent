/// <reference types="vite/client" />

// Analytics tool type declarations
interface Window {
  LogRocket?: {
    track: (eventName: string, properties?: Record<string, any>) => void;
  };
  mixpanel?: {
    init: (token: string, config?: Record<string, unknown>) => void;
    track: (eventName: string, properties?: Record<string, unknown>) => void;
    people?: {
      set: (props: Record<string, unknown>) => void;
    };
    _loaded?: boolean;
  };
  pendo?: {
    initialize: (options: { visitor: Record<string, any>; account?: Record<string, any> }) => void;
    identify: (options: { visitor: Record<string, any>; account?: Record<string, any> }) => void;
    updateOptions: (...args: unknown[]) => void;
    pageLoad: (...args: unknown[]) => void;
    track: (eventName: string, properties?: Record<string, any>) => void;
    trackAgent: (...args: unknown[]) => void;
    _initialized?: boolean;
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
  readonly VITE_ENABLE_PENDO?: string;
  readonly VITE_PENDO_API_KEY?: string;
  readonly VITE_ENABLE_MIXPANEL?: string;
  readonly VITE_MIXPANEL_TOKEN?: string;
  readonly VITE_MIXPANEL_RECORD_SESSIONS_PERCENT?: string;
  // add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
