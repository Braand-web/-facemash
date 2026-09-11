import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The single-file preview build has no server to host a service worker from.
const standalone = !!process.env.VITE_HASH_ROUTER;

export default defineConfig({
  // Relative when the app is served from a subpath, as on GitHub Pages.
  base: process.env.VITE_BASE ?? '/',
  plugins: [
    react(),
    ...(standalone
      ? []
      : [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
            manifest: {
              name: 'Facemash',
              short_name: 'Facemash',
              description:
                'Flux vertical, abonnements et messagerie plein écran — la version installable de Facemash.',
              lang: 'fr',
              dir: 'ltr',
              start_url: '/',
              scope: '/',
              display: 'standalone',
              orientation: 'portrait',
              background_color: '#14161c',
              theme_color: '#14161c',
              categories: ['social', 'entertainment'],
              icons: [
                { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
                {
                  src: '/icon-maskable-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
              shortcuts: [
                { name: 'Messages', short_name: 'Messages', url: '/messages' },
                { name: 'Explorer', short_name: 'Explorer', url: '/explore' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
              navigateFallback: '/index.html',
              runtimeCaching: [
                {
                  // Fonts change rarely and must survive offline launches.
                  urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'facemash-fonts',
                    expiration: { maxEntries: 24, maxAgeSeconds: 60 * 60 * 24 * 365 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
                {
                  // Uploaded media: show what we have, refresh in the background.
                  urlPattern: /\/storage\/v1\/object\/public\/media\//i,
                  handler: 'StaleWhileRevalidate',
                  options: {
                    cacheName: 'facemash-media',
                    expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
              // Never serve a cached API response as if it were fresh data.
              navigateFallbackDenylist: [/^\/rest\//, /^\/auth\//, /^\/realtime\//],
            },
          }),
        ]),
  ],
});
