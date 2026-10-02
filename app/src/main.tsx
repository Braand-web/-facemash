import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { AppProvider } from './store';
import { OverlayProvider } from './overlays';
import { ViewportProvider } from './viewport';
import { initPrefs } from './lib/prefs';
import './index.css';

const MobileFrame = lazy(() => import('./screens/MobileFrame').then(({ MobileFrame }) => ({ default: MobileFrame })));

initPrefs();

// The phone-frame page runs the app in its own memory router, so it replaces the
// browser router rather than nesting inside it.
const framed =
  window.location.pathname === '/mobile' || window.location.hash.startsWith('#/mobile');

// Static hosts without URL rewriting (a published preview, for instance) serve the
// app from one file, where hash routing is the only thing that survives a refresh.
const Router = import.meta.env.VITE_HASH_ROUTER ? HashRouter : BrowserRouter;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <OverlayProvider>
        {framed ? (
          <Suspense fallback={<div role="status" aria-label="Chargement" style={{ minHeight: '100dvh' }} />}>
            <MobileFrame />
          </Suspense>
        ) : (
          <Router>
            <ViewportProvider>
              <AppRoutes />
            </ViewportProvider>
          </Router>
        )}
      </OverlayProvider>
    </AppProvider>
  </StrictMode>,
);
