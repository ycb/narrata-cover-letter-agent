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
  readonly VITE_HIL_COVER_LETTER_V3?: string;
  // add other env variables here if needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
