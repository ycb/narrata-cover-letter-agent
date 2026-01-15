type PendoVisitor = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  paidOrTrialUser?: string | boolean;
  [key: string]: unknown;
};

type PendoAccount = {
  id: string;
  accountCreationDate?: string;
  location?: string;
  businessTier?: string;
  marketSegment?: string;
  [key: string]: unknown;
};

type PendoClient = {
  initialize: (options: { visitor: PendoVisitor; account?: PendoAccount }) => void;
  identify: (options: { visitor: PendoVisitor; account?: PendoAccount }) => void;
  updateOptions: (...args: unknown[]) => void;
  pageLoad: (...args: unknown[]) => void;
  track: (eventName: string, properties?: Record<string, unknown>) => void;
  trackAgent: (...args: unknown[]) => void;
  _q?: Array<unknown>;
  _initialized?: boolean;
};

const shouldInitializePendo = (): boolean => {
  if (import.meta.env.VITE_ENABLE_PENDO === 'true') {
    return true;
  }
  if (import.meta.env.VITE_ENABLE_PENDO === 'false') {
    return false;
  }
  return import.meta.env.PROD;
};

const setupQueue = (): PendoClient => {
  const existing = window.pendo as PendoClient | undefined;
  if (existing) return existing;

  const pendo = {} as PendoClient;
  pendo._q = [];
  const methods: Array<keyof PendoClient> = [
    'initialize',
    'identify',
    'updateOptions',
    'pageLoad',
    'track',
    'trackAgent',
  ];
  methods.forEach((method) => {
    (pendo as any)[method] = (...args: unknown[]) => {
      pendo._q?.push([method, ...args]);
    };
  });
  window.pendo = pendo;
  return pendo;
};

const loadScript = (apiKey: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.getElementById('pendo-agent')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'pendo-agent';
    script.async = true;
    script.src = `https://cdn.pendo.io/agent/static/${apiKey}/pendo.js`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Pendo agent.'));
    const target = document.getElementsByTagName('script')[0] || document.head;
    if (target.parentNode) {
      target.parentNode.insertBefore(script, target);
    } else {
      document.head.appendChild(script);
    }
  });

const stripEmpty = <T extends Record<string, unknown>>(value: T): T => {
  const cleaned = Object.entries(value).reduce((acc, [key, val]) => {
    if (val === null || val === undefined || val === '') return acc;
    acc[key] = val;
    return acc;
  }, {} as Record<string, unknown>);
  return cleaned as T;
};

export const initializePendo = async (options: {
  visitor: PendoVisitor;
  account?: PendoAccount;
}): Promise<void> => {
  if (!shouldInitializePendo()) return;

  const apiKey = import.meta.env.VITE_PENDO_API_KEY as string | undefined;
  if (!apiKey) {
    console.warn('Pendo enabled but VITE_PENDO_API_KEY is missing; skipping initialization.');
    return;
  }

  if (!options.visitor?.id) {
    console.warn('Pendo requires a visitor id; skipping initialization.');
    return;
  }

  setupQueue();
  await loadScript(apiKey);

  const visitor = stripEmpty(options.visitor);
  const account = options.account ? stripEmpty(options.account) : undefined;
  const pendo = window.pendo as PendoClient | undefined;

  if (!pendo) return;

  if (pendo._initialized) {
    pendo.identify({ visitor, account });
    return;
  }

  pendo.initialize({ visitor, account });
  pendo._initialized = true;
  console.log('Pendo initialized');
};

