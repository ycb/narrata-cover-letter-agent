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
  LogRocket.init('sqhkza/cover-letter-agent');
  console.log('LogRocket initialized for production');
} else {
  console.log('LogRocket disabled in development');
}

export { LogRocket };
