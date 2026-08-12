
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'

// Suppress console.log and console.warn in production
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  // console.error is preserved for real errors
}

// Auto-reload on stale dynamic import chunks (after deploy)
const handleChunkError = (event: Event | PromiseRejectionEvent) => {
  const error = (event as PromiseRejectionEvent).reason || (event as ErrorEvent).error;
  const message = String(error?.message || error || '');
  if (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Importing a module script failed') ||
    message.includes('error loading dynamically imported module')
  ) {
    const key = 'lovable:chunk-reload';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
    }
  }
};
window.addEventListener('error', handleChunkError);
window.addEventListener('unhandledrejection', handleChunkError);



createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
