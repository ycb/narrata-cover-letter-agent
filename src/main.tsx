import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './lib/logrocket' // Environment-based initialization

if (import.meta.env.DEV) {
  const params = new URLSearchParams(window.location.search);
  const debugNavEnabled = import.meta.env.VITE_DEBUG_NAV_RELOAD === 'true' || params.get('debugNav') === '1';

  if (debugNavEnabled) {
  import('./lib/debug/navigationDebug')
    .then(({ installNavigationDebug, readLastNavigationDebugEvent, readNavigationDebugEvents }) => {
      installNavigationDebug();
      const evt = readLastNavigationDebugEvent();
      if (evt) {
         
        console.warn('[nav-debug] Last navigation event:', evt);
      }
      const all = readNavigationDebugEvents();
      if (all.length) {
         
        console.warn(`[nav-debug] Recent events (${all.length}):`, all);
      }
    })
    .catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(<App />);
