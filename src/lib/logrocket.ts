import LogRocket from 'logrocket';

// Environment-based LogRocket initialization
const shouldInitializeLogRocket = (): boolean => {
  // Check explicit environment variable first
  if (import.meta.env.VITE_ENABLE_LOGROCKET === 'true') {
    return true;
  }
  
  // If explicitly disabled, don't initialize
  if (import.meta.env.VITE_ENABLE_LOGROCKET === 'false') {
    return false;
  }
  
  // Default: only initialize in production
  return import.meta.env.PROD;
};

if (shouldInitializeLogRocket()) {
  const appId = import.meta.env.VITE_LOGROCKET_APP_ID as string | undefined;
  if (!appId) {
    console.warn('LogRocket enabled but VITE_LOGROCKET_APP_ID is missing; skipping initialization.');
  } else {
    LogRocket.init(appId, {
      networkResponseSanitizer: (response) => {
        try {
          const url = response.url || '';
          // Skip static assets and large responses to avoid exceeding LogRocket limits.
          if (
            url.includes('/assets/') ||
            url.endsWith('.js') ||
            url.endsWith('.css') ||
            url.endsWith('.map')
          ) {
            return null;
          }

          const body = (response as any).body;
          const bodySize =
            typeof body === 'string'
              ? body.length
              : body instanceof ArrayBuffer
                ? body.byteLength
                : body && typeof body === 'object'
                  ? JSON.stringify(body).length
                  : 0;

          if (bodySize > 1_000_000) {
            return null;
          }
        } catch {
          // Fall through to LogRocket default behavior.
        }

        return response;
      },
    });
    console.log('LogRocket initialized');
  }
} else {
  console.log('LogRocket disabled in development');
}

export { LogRocket };
