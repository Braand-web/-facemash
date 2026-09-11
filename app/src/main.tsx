import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import { MobileFrame } from './screens/MobileFrame';
import { AppProvider } from './store';
import { OverlayProvider } from './overlays';
import { ViewportProvider } from './viewport';
import './index.css';

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
          <MobileFrame />
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
