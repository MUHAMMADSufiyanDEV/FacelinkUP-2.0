import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix for polyfills attempting to overwrite fetch in restricted iframe environments
try {
  if (window && 'fetch' in window) {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get() { return originalFetch; },
      set(newFetch) { 
        Object.defineProperty(window, 'fetch', {
          value: newFetch,
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
    });
  }
} catch (e) {
  console.warn('Could not patch window.fetch', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
