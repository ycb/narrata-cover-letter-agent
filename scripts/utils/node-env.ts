import fs from 'fs';
import path from 'path';

/**
 * Load environment variables from .env and patch import.meta.env for Node scripts.
 * Also installs minimal browser globals required by frontend services (window, localStorage, Blob, File).
 */
export function setupNodeEnv() {
  loadDotEnv();
  patchImportMetaEnv();
  installBrowserMocks();
}

function loadDotEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) return;
    const key = match[1].trim();
    const value = match[2].trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function patchImportMetaEnv() {
  const envValues: Record<string, string | undefined> = {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
    VITE_OPENAI_API_KEY: process.env.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_KEY,
    VITE_OPENAI_KEY: process.env.VITE_OPENAI_KEY || process.env.VITE_OPENAI_API_KEY,
    VITE_OPENAI_MODEL: process.env.VITE_OPENAI_MODEL || 'gpt-4o-mini',
    VITE_APPIFY_API_KEY: process.env.VITE_APPIFY_API_KEY,
    VITE_SYNTHETIC_LOCAL_ONLY: process.env.VITE_SYNTHETIC_LOCAL_ONLY || 'true',
  };

  if (typeof import.meta !== 'undefined') {
    Object.defineProperty(import.meta, 'env', {
      get: () => envValues,
      configurable: true,
    });
  }
}

function installBrowserMocks() {
  if (typeof globalThis.window === 'undefined') {
    (globalThis as any).window = {
      dispatchEvent: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      localStorage: undefined,
    };
  }

  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    const memoryStorage = {
      get length() {
        return store.size;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
      removeItem(key: string) {
        store.delete(key);
      },
      clear() {
        store.clear();
      },
    };

    (globalThis as any).localStorage = memoryStorage;
    (globalThis as any).window.localStorage = memoryStorage;
  }

  if (typeof globalThis.Blob === 'undefined') {
    // @ts-ignore
    globalThis.Blob = class Blob {
      parts: any[];
      type: string;
      constructor(parts: any[], options?: any) {
        this.parts = parts;
        this.type = options?.type || '';
      }
    };
  }

  if (typeof globalThis.File === 'undefined') {
    // @ts-ignore
    globalThis.File = class File extends (globalThis as any).Blob {
      name: string;
      lastModified: number;
      webkitRelativePath: string;
      constructor(parts: any[], name: string, options?: any) {
        super(parts, options);
        this.name = name;
        this.lastModified = Date.now();
        this.webkitRelativePath = '';
      }
    };
  }
}

export function requireEnv(key: string, friendly?: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env: ${friendly || key}`);
  }
  return value;
}
